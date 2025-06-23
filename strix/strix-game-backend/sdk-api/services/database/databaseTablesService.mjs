import { DataTypes } from "sequelize";

export class DatabaseTablesService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    
    // Cache for tables
    this.cachedPlayersTables = {};
    this.cachedInventoryTables = {};
    this.cachedLeaderboardsTables = {};
    this.cachedSnapshotsTables = {};
  }

  async initialize() {
    if (this.initialized) return;

    this.utilityService = this.moduleContainer.get("utility");
    this.databaseService = this.moduleContainer.get("database");
    
    this.initialized = true;
    console.log("DatabaseTablesService initialized");
  }

  async acquireIngestTable_Events(studioID, resync = false) {
    try {
      const sequelize = this.databaseService.getSequelize();
      const tableName = `events-${studioID}`;

      const TableModel = sequelize.define(
        tableName,
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            primaryKey: true,
          },
          gameID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          clientID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          sessionID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          type: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          field1: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          field2: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          field3: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          field4: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          field5: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          field6: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          customData: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
        },
        {
          tableName,
          indexes: [
            { fields: ["gameID"] },
            { fields: ["sessionID"] },
            { fields: ["clientID"] },
            { fields: ["type"] },
            { fields: ["customData"] },
            { fields: ["gameID", "sessionID"] },
            { fields: ["clientID", "sessionID"] },
            { fields: ["timestamp", "type"] },
          ],
        }
      );

      const tableExistsQuery = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE  table_schema = 'public'
              AND    table_name   = '${tableName}'
            );
          `;

      const results = await this.databaseService.PGquery(tableExistsQuery);
      const tableExists = results[0].exists;

      if (!tableExists) {
        await TableModel.sync({ alter: true });
        console.log(`Table ${tableName} created.`);

        const createHypertableQuery = `
              SELECT create_hypertable('${tableName}', by_range('timestamp'), if_not_exists => TRUE);
            `;

        await this.databaseService.PGquery(createHypertableQuery);
        console.log(`Table ${tableName} converted to hypertable.`);

        await this.createContinuousAggregates(studioID, tableName);
      } else {
        if (resync) {
          await TableModel.sync({ alter: true });
        }
        this.utilityService.log(`Table ${tableName} already exists.`);
      }

      return TableModel;
    } catch (error) {
      console.error("Error creating events table:", error);
    }
  }

  async createContinuousAggregates(studioID, tableName) {
    const createContinuousAggregate = async (
      viewName,
      query,
      refreshInterval = "4 hours"
    ) => {
      await this.databaseService.PGquery(query);
      const refreshPolicyQuery = `
          SELECT add_continuous_aggregate_policy(
              '${viewName}',
              start_offset => INTERVAL '1 days',
              end_offset => INTERVAL '1 hour',
              schedule_interval => INTERVAL '${refreshInterval}'
          );
      `;
      await this.databaseService.PGquery(refreshPolicyQuery);
    };

    const ContAgr_DAU = `
      CREATE MATERIALIZED VIEW "mv-dau-${studioID}"
      WITH (timescaledb.continuous) AS
      SELECT
          time_bucket('1 hour', "timestamp") AS "time",
          "gameID",
          COUNT(DISTINCT "clientID") AS DAU,
          COUNT(DISTINCT "clientID") FILTER (WHERE "type" = 'newSession' AND "field1" = 'true') AS NEWUSERS
      FROM
          "${tableName}"
      GROUP BY "time", "gameID";
    `;

    await createContinuousAggregate(`mv-dau-${studioID}`, ContAgr_DAU, "4 hours");

    const ContAgr_Retention = `
      CREATE MATERIALIZED VIEW "mv-retention-${studioID}"
      WITH (timescaledb.continuous) AS
      SELECT
          time_bucket('1 hour', "timestamp") AS "event_day",
          "gameID",
          "clientID"
      FROM "${tableName}"
      WHERE "type" = 'newSession'
      GROUP BY "event_day", "clientID", "gameID";
    `;

    await createContinuousAggregate(`mv-retention-${studioID}`, ContAgr_Retention, "4 hours");
  }

  async acquireIngestTable_Segments(studioID, resync = false) {
    try {
      const sequelize = this.databaseService.getSequelize();
      const tableName = `segments-${studioID}`;

      const TableModel = sequelize.define(
        tableName,
        {
          clientID: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
          },
          segments: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            allowNull: true,
          },
        },
        {
          tableName,
          indexes: [{ fields: ["clientID"], unique: true }],
        }
      );

      const tableExistsQuery = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE  table_schema = 'public'
              AND    table_name   = '${tableName}'
            );
          `;

      const results = await this.databaseService.PGquery(tableExistsQuery);
      const tableExists = results[0].exists;

      if (!tableExists) {
        await TableModel.sync({ alter: true });
        console.log(`Table ${tableName} created.`);

        const indexArray = `
              CREATE INDEX idx_segments_array ON "${tableName}" USING gin(segments);
            `;

        await this.databaseService.PGquery(indexArray);
      } else {
        if (resync) {
          await TableModel.sync({ alter: true });
        }
        this.utilityService.log(`Table ${tableName} already exists.`);
      }

      return TableModel;
    } catch (error) {
      console.error("Error creating segments table:", error);
    }
  }

  async acquireIngestTable_Payments(studioID, resync = false) {
    try {
      const sequelize = this.databaseService.getSequelize();
      const tableName = `payments-${studioID}`;

      const TableModel = sequelize.define(
        tableName,
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          timestampz: {
            type: DataTypes.DATE,
            allowNull: false,
            primaryKey: true,
            defaultValue: DataTypes.NOW,
          },
          purchaseTime: {
            type: DataTypes.DATE,
            allowNull: false,
            primaryKey: true,
          },
          strixGameID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          strixSessionID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          strixBranch: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          strixClientID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          strixOfferID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          service: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          status: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          orderID: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          packageName: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          productID: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          purchaseToken: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          kind: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          regionCode: {
            type: DataTypes.STRING,
            allowNull: true,
          },
        },
        {
          tableName,
          indexes: [
            { fields: ["purchaseTime"] },
            { fields: ["strixGameID"] },
            { fields: ["strixSessionID"] },
            { fields: ["strixClientID"] },
            { fields: ["strixOfferID"] },
            { fields: ["orderID"] },
          ],
        }
      );

      const tableExistsQuery = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE  table_schema = 'public'
              AND    table_name   = '${tableName}'
            );
          `;

      const results = await this.databaseService.PGquery(tableExistsQuery);
      const tableExists = results[0].exists;

      if (!tableExists) {
        await TableModel.sync({ alter: true });
        console.log(`Table ${tableName} created.`);

        const createHypertableQuery = `
              SELECT create_hypertable('${tableName}', by_range('timestampz'), if_not_exists => TRUE);
            `;

        await this.databaseService.PGquery(createHypertableQuery);
        console.log(`Table ${tableName} converted to hypertable.`);
      } else {
        if (resync) {
          await TableModel.sync({ alter: true });
        }
        this.utilityService.log(`Table ${tableName} already exists.`);
      }

      return TableModel;
    } catch (error) {
      console.error("Error creating payments table:", error);
    }
  }

  async acquireIngestTable_Sessions(studioID, resync = false) {
    try {
      const sequelize = this.databaseService.getSequelize();
      const tableName = `sessions-${studioID}`;

      const TableModel = sequelize.define(
        tableName,
        {
          timestampz: {
            type: DataTypes.DATE,
            allowNull: false,
            primaryKey: true,
            defaultValue: DataTypes.NOW,
          },
          timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            primaryKey: true,
          },
          gameID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          clientID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          sessionID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          language: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          platform: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          gameVersion: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          engineVersion: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          branch: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          country: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          environment: {
            type: DataTypes.STRING,
            allowNull: true,
          },
        },
        {
          tableName,
          indexes: [
            { fields: ["timestamp"] },
            { fields: ["gameID"] },
            { fields: ["sessionID"] },
            { fields: ["clientID"] },
            { fields: ["branch"] },
            { fields: ["gameID", "sessionID"] },
            { fields: ["clientID", "sessionID"] },
            { fields: ["timestamp", "gameID", "branch"] },
            { fields: ["gameID", "branch"] },
            { fields: ["gameID", "branch", "clientID"] },
          ],
        }
      );

      const tableExistsQuery = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE  table_schema = 'public'
              AND    table_name   = '${tableName}'
            );
          `;

      const results = await this.databaseService.PGquery(tableExistsQuery);
      const tableExists = results[0].exists;

      if (!tableExists) {
        await TableModel.sync({ alter: true });
        console.log(`Table ${tableName} created.`);

        const createHypertableQuery = `
              SELECT create_hypertable('${tableName}', by_range('timestampz'), if_not_exists => TRUE);
            `;

        await this.databaseService.PGquery(createHypertableQuery);
        console.log(`Table ${tableName} converted to hypertable.`);
      } else {
        if (resync) {
          await TableModel.sync({ alter: true });
        }
        this.utilityService.log(`Table ${tableName} already exists.`);
      }

      return TableModel;
    } catch (error) {
      console.error("Error creating sessions table:", error);
    }
  }

  async acquireIngestTable_Snapshots(studioID, resync = false) {
    try {
      const sequelize = this.databaseService.getSequelize();
      const tableName = `snapshots-${studioID}`;

      const TableModel = sequelize.define(
        tableName,
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            primaryKey: true,
          },
          gameID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          clientID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          branch: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          environment: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          snapshot: {
            type: DataTypes.ARRAY(DataTypes.JSONB),
            allowNull: false,
          },
          snapshotNumber: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          realMoneyPaymentNumber: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          realMoneyPurchaseOrderID: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          subject: {
            type: DataTypes.STRING,
            allowNull: true,
          },
        },
        {
          tableName,
          indexes: [
            { fields: ["timestamp"] },
            { fields: ["clientID"] },
            { fields: ["gameID", "subject"] },
            { fields: ["gameID", "branch"] },
            { fields: ["gameID", "branch", "clientID"] },
            { fields: ["gameID", "branch", "snapshotNumber"] },
            { fields: ["gameID", "branch", "realMoneyPaymentNumber"] },
          ],
        }
      );

      const tableExistsQuery = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE  table_schema = 'public'
              AND    table_name   = '${tableName}'
            );
          `;

      const results = await this.databaseService.PGquery(tableExistsQuery);
      const tableExists = results[0].exists;

      if (!tableExists) {
        await TableModel.sync({ alter: true });
        console.log(`Table ${tableName} created.`);

        const createHypertableQuery = `
              SELECT create_hypertable('${tableName}', by_range('timestamp'), if_not_exists => TRUE);
            `;

        await this.databaseService.PGquery(createHypertableQuery);
        console.log(`Table ${tableName} converted to hypertable.`);
      } else {
        if (resync) {
          await TableModel.sync({ alter: true });
        }
        this.utilityService.log(`Table ${tableName} already exists.`);
      }

      return TableModel;
    } catch (error) {
      console.error("Error creating snapshots table:", error);
    }
  }

  async acquireTable_Inventory(studioID, resync = false) {
    try {
      const sequelize = this.databaseService.getSequelize();
      const tableName = `inventory-${studioID}`;

      const TableModel = sequelize.define(
        tableName,
        {
          gameID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          branch: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          environment: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          clientID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          items: {
            type: DataTypes.ARRAY(DataTypes.JSONB),
            allowNull: false,
            defaultValue: [],
          },
        },
        {
          tableName,
          indexes: [
            { fields: ["clientID"] },
            { fields: ["gameID", "branch", "clientID"] },
          ],
        }
      );

      const tableExistsQuery = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE  table_schema = 'public'
              AND    table_name   = '${tableName}'
            );
          `;

      const results = await this.databaseService.PGquery(tableExistsQuery);
      const tableExists = results[0].exists;

      if (!tableExists) {
        await TableModel.sync({ alter: true });
        console.log(`Table ${tableName} created.`);
      } else {
        if (resync) {
          await TableModel.sync({ alter: true });
        }
        this.utilityService.log(`Table ${tableName} already exists.`);
      }

      return TableModel;
    } catch (error) {
      console.error("Error creating inventory table:", error);
    }
  }

  async acquireTable_Leaderboards(studioID, resync = false) {
    try {
      const sequelize = this.databaseService.getSequelize();
      const tableName = `leaderboards-${studioID}`;

      const TableModel = sequelize.define(
        tableName,
        {
          gameID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          branch: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          environment: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          timeframeKey: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          clientID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          targetValue: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          additionalValues: {
            type: DataTypes.ARRAY(DataTypes.JSONB),
            allowNull: true,
            defaultValue: [],
          },
        },
        {
          tableName,
          indexes: [
            { fields: ["gameID", "branch", "timeframeKey"] },
            { fields: ["gameID", "branch", "clientID", "timeframeKey"] },
            { fields: ["timeframeKey"] },
          ],
        }
      );

      const tableExistsQuery = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE  table_schema = 'public'
              AND    table_name   = '${tableName}'
            );
          `;

      const results = await this.databaseService.PGquery(tableExistsQuery);
      const tableExists = results[0].exists;

      if (!tableExists) {
        await TableModel.sync({ alter: true });
        console.log(`Table ${tableName} created.`);
      } else {
        if (resync) {
          await TableModel.sync({ alter: true });
        }
        this.utilityService.log(`Table ${tableName} already exists.`);
      }

      return TableModel;
    } catch (error) {
      console.error("Error creating leaderboards table:", error);
    }
  }

  async acquireTable_Players(studioID) {
    try {
      const sequelize = this.databaseService.getSequelize();
      const tableName = `players-${studioID}`;
      const tableName_Aelements = `players-analytics-elements-${studioID}`;
      const tableName_Selements = `players-statistics-elements-${studioID}`;
      const tableName_Offers = `players-offers-${studioID}`;

      const AnalyticsElement = sequelize.define(
        tableName_Aelements,
        {
          clientKey: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
              model: tableName,
              key: "clientKey",
            },
          },
          elementID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          elementValue: {
            type: DataTypes.JSONB,
            defaultValue: {},
          },
          elementValues: {
            type: DataTypes.JSONB,
            defaultValue: {},
          },
        },
        {
          tableName: tableName_Aelements,
          indexes: [
            { fields: ["clientKey", "elementID"] },
            { fields: ["clientKey"], unique: true },
          ],
        }
      );

      const StatisticsElement = sequelize.define(
        tableName_Selements,
        {
          clientKey: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
              model: tableName,
              key: "clientKey",
            },
          },
          elementID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          elementValue: {
            type: DataTypes.JSONB,
            allowNull: false,
          },
        },
        {
          tableName: tableName_Selements,
          indexes: [
            { fields: ["clientKey", "elementID"] },
            { fields: ["clientKey"], unique: true },
          ],
        }
      );

      const Offer = sequelize.define(
        tableName_Offers,
        {
          clientKey: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
              model: tableName,
              key: "clientKey",
            },
          },
          offerID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          purchasedTimes: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
          },
          currentAmount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
          },
          expiration: {
            type: DataTypes.DATE,
          },
        },
        {
          tableName: tableName_Offers,
          indexes: [
            { fields: ["clientKey"], unique: true },
            { fields: ["clientKey", "offerID"] },
          ],
        }
      );

      const TableModel = sequelize.define(
        tableName,
        {
          clientKey: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
          },
          gameID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          clientID: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          branch: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          inventory: {
            type: DataTypes.JSONB,
            defaultValue: [],
          },
          abtests: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: [],
          },
          segments: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: [],
          },
          firstJoinDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
          lastJoinDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
        },
        {
          tableName,
          indexes: [
            { fields: ["gameID", "branch", "clientID"], unique: true },
            { fields: ["gameID", "branch"] },
            { fields: ["clientKey"] },
            { fields: ["clientID"] },
            { fields: ["firstJoinDate"] },
          ],
        }
      );

      TableModel.hasMany(AnalyticsElement, { foreignKey: "clientKey" });
      TableModel.hasMany(StatisticsElement, { foreignKey: "clientKey" });
      TableModel.hasMany(Offer, { foreignKey: "clientKey" });
      AnalyticsElement.belongsTo(TableModel, { foreignKey: "clientKey" });
      StatisticsElement.belongsTo(TableModel, { foreignKey: "clientKey" });
      Offer.belongsTo(TableModel, { foreignKey: "clientKey" });

      const models = [TableModel, AnalyticsElement, StatisticsElement, Offer];
      for (let i = 0; i < models.length; i++) {
        const tableExistsQuery = `
                  SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE  table_schema = 'public'
                    AND    table_name   = '${models[i].tableName}'
                  );
                `;

        const results = await this.databaseService.PGquery(tableExistsQuery);
        const tableExists = results[0].exists;

        if (!tableExists) {
          await models[i].sync();
          console.log(`Table ${models[i].tableName} created.`);
        }
      }

      return {
        playersModel: TableModel,
        a_elementsModel: AnalyticsElement,
        s_elementsModel: StatisticsElement,
        offersModel: Offer,
      };
    } catch (error) {
      console.error("Error creating players tables:", error);
    }
  }

  async ingestDocument_Snapshot(table, snapshot) {
    try {
      const event = { ...snapshot, timestampz: snapshot.timestamp };
      await this.utilityService.insertEventWithRetry(event, async () => {
        await table.create(event);
      });
    } catch (error) {
      console.error("Error ingesting snapshot:", error);
    }
  }

  // Cached table getters
  async getPWTable(gameID) {
    const studioID = await this.utilityService.getStudioIDByGameID(gameID);

    if (this.cachedPlayersTables[studioID]) {
      return this.cachedPlayersTables[studioID];
    } else {
      const tables = await this.acquireTable_Players(studioID);
      this.cachedPlayersTables[studioID] = tables;
      return tables;
    }
  }

  async getInventoryTable(gameID) {
    const studioID = await this.utilityService.getStudioIDByGameID(gameID);

    if (this.cachedInventoryTables[studioID]) {
      return this.cachedInventoryTables[studioID];
    } else {
      const inventoryTable = await this.acquireTable_Inventory(studioID);
      this.cachedInventoryTables[studioID] = inventoryTable;
      return inventoryTable;
    }
  }

  async getLeaderboardTable(gameID) {
    const studioID = await this.utilityService.getStudioIDByGameID(gameID);

    if (this.cachedLeaderboardsTables[studioID]) {
      return this.cachedLeaderboardsTables[studioID];
    } else {
      const lbTable = await this.acquireTable_Leaderboards(studioID);
      this.cachedLeaderboardsTables[studioID] = lbTable;
      return lbTable;
    }
  }

  async getSnapshotsTable(gameID) {
    const studioID = await this.utilityService.getStudioIDByGameID(gameID);

    if (this.cachedSnapshotsTables[studioID]) {
      return this.cachedSnapshotsTables[studioID];
    } else {
      const snapshotsTable = await this.acquireIngestTable_Snapshots(studioID);
      this.cachedSnapshotsTables[studioID] = snapshotsTable;
      return snapshotsTable;
    }
  }
}