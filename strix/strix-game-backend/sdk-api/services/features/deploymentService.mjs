import { DeploymentCatalog } from "../../../models/deploymentCatalog.js";
import { Game } from "../../../models/gameModel.js";
import { PWplayers } from "../../../models/PWplayers.js";

export class DeploymentService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async initialize() {
    if (this.initialized) return;

    this.utilityService = this.moduleContainer.get("utility");
    this.metricsService = this.moduleContainer.get("metrics");
    this.cacherService = this.moduleContainer.get("cacher");
    this.segmentService = this.moduleContainer.get("segment");
    this.fcmService = this.moduleContainer.getOptionalService("fcm");
    
    this.initialized = true;
    console.log("DeploymentService initialized");
  }
  async processDeploymentUpdate(gameID, environment) {
    const deployOptions = await DeploymentCatalog.findOne({ gameID }).lean();

    const targetEnv = deployOptions.environments.find(
      (env) => env.name === environment
    );
    let versions = [];
    if (targetEnv.versions && targetEnv.versions.length > 0) {
      versions = targetEnv.versions.map((v) => v.version);
    }

    // Cache contents of all versions
    for (let version of versions) {
      const segments = await this.segmentService.getAllSegments(gameID, branch);
      for (let segment of segments) {
        for (let table of this.utilityService.tablesNamespaces) {
          await this.cacherService.getCachedContent(
            gameID,
            table,
            version,
            segment.segmentID
          );
        }
      }
    }

    const gameOptions = await Game.findOne(
      { gameID: gameID },
      { realtimeDeploy: 1 }
    ).lean();

    if (
      gameOptions.realtimeDeploy === true &&
      deployOptions.deployRealtime === true
    ) {
      this.fcmService?.notifyContentUpdated(gameID, environment);
    }
  }
  async getOrAssignConfigForPlayer(
    gameID,
    environment,
    clientID,
    tableName,
    clientItemHashes
  ) {
    try {
      const { version, segmentID } = await this.getIntendedConfigVersionForPlayer(
        gameID,
        environment,
        clientID
      );

      // Get all current content
      const allContent = await this.cacherService.getCachedContent(
        gameID,
        tableName,
        version,
        segmentID
      );
      // Calculate server-side hashes
      const serverItemHashes = {};
      let totalChecksum = 0;

      // Identify items to send (changed or new)
      const updatedItems = [];

      // Track items that exist on server
      const serverItemIds = new Set();
      // Process each item
      for (const item of allContent) {
        const itemId = item.id.toString();
        serverItemIds.add(itemId);
        totalChecksum += item.checksum;

        serverItemHashes[itemId] = item.hash;

        // If item is new or changed, add to updatedItems
        if (
          !clientItemHashes[itemId] ||
          clientItemHashes[itemId] !== item.hash
        ) {
          updatedItems.push(item);
        }
      }

      // Find deleted items (in client but not on server)
      const deletedItemIds = Object.keys(clientItemHashes).filter(
        (id) => !serverItemIds.has(id)
      );

      return {
        updatedItems,
        deletedItemIds,
        totalChecksum,
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async getConfigChecksumForPlayer(gameID, environment, clientID, tableNames) {
    const { version, segmentID } = await this.getIntendedConfigVersionForPlayer(
      gameID,
      environment,
      clientID
    );
    let result = {};

    const getContentChecksumAndHashes = async (
      gameID,
      version,
      tableName,
      segmentID
    ) => {
      // Get all content for this table
      const content = await this.cacherService.getCachedContent(
        gameID,
        tableName,
        version,
        segmentID
      );

      let totalChecksum = 0;
      const itemHashes = {};

      // Calculate total checksum and collect item hashes
      for (const item of content) {
        totalChecksum += item.checksum;
        itemHashes[item.id] = item.hash;
      }

      return {
        totalChecksum,
        itemHashes,
      };
    }

    await Promise.all(
      tableNames.map(async (name) => {
        const { totalChecksum, itemHashes } = await getContentChecksumAndHashes(
          gameID,
          version,
          name,
          segmentID
        );

        result[name] = {
          checksum: totalChecksum,
          itemHashes: itemHashes,
        };
      })
    );

    return result;
  }
  async getIntendedConfigVersionForPlayer(gameID, environment, clientID) {
    const versions = await this.cacherService.getCurrentDeploymentVersions(gameID, environment);
    if (!versions || versions.length === 0) {
      return "";
    }

    const player = await PWplayers.findOne(
      { gameID, clientID, environment },
      { branch: 1, segments: 1 }
    ).lean();
    let targetVersion = "";
    let targetConfigSegmentID = "";
    let alreadyInSomeVersion = false;
    if (player) {
      targetVersion = player.branch;
      // If player is already in some version of a given environment, do not try to
      // assign another version to him
      alreadyInSomeVersion = versions.some((v) => v.version === player.branch);
    }

    let changed = false;

    if (!alreadyInSomeVersion) {
      changed = true;

      // Generate a random number between 0 and 100
      const randomValue = Math.random() * 100;
      let cumulativeShare = 0;
      let assignedVersion = null;

      // Iterate over versions to find the appropriate version based on audienceShare
      for (const v of versions) {
        cumulativeShare += v.audienceShare;
        if (randomValue < cumulativeShare) {
          assignedVersion = v.version;
          break;
        }
      }

      // Fallback in case of an error (should not occur if shares sum to 100)
      if (!assignedVersion) {
        assignedVersion = versions[versions.length - 1].version;
      }

      targetVersion = assignedVersion;

      // Update player's branch with the new assigned version
      if (player) {
        await PWplayers.updateOne(
          { gameID, clientID, environment },
          { $set: { branch: assignedVersion } }
        );
      }
    }

    // Get all segments we have configured our model for
    let segments = await this.cacherService.getCachedBalanceModelSegments(gameID, targetVersion);
    // Reverse the array so "everyone" segment is at the bottom and it's the last we check against
    segments = segments.reverse();
    for (const s of segments) {
      // Check until player has a segment from model segments. If so, set and break;
      // The config for this exact segment will be given after that.
      if (player.segments.some(id === s.segmentID)) {
        targetConfigSegmentID = s.segmentID;
        break;
      }
    }
    if (!targetConfigSegmentID) {
      // Should not happen but just in case
      targetConfigSegmentID = "everyone";
    }
    return {
      version: targetVersion,
      segmentID: targetConfigSegmentID,
      changed: changed,
      playerExists: Boolean(player),
    };
  }
}
