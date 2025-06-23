export class PopulatorService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async initialize() {
    if (this.initialized) return;

    this.databaseTablesService = this.moduleContainer.get("databaseTables");
    
    this.initialized = true;
    console.log("PopulatorService initialized");
  }

  async populateStudioTables(studioID) {
    try {
      await this.databaseTablesService.acquireIngestTable_Events(studioID);
      await this.databaseTablesService.acquireIngestTable_Segments(studioID);
      await this.databaseTablesService.acquireIngestTable_Payments(studioID);
      await this.databaseTablesService.acquireIngestTable_Sessions(studioID);
      await this.databaseTablesService.acquireTable_Inventory(studioID);
      await this.databaseTablesService.acquireIngestTable_Snapshots(studioID);
      await this.databaseTablesService.acquireTable_Leaderboards(studioID);
      // await this.databaseTablesService.acquireTable_Players(studioID);
    } catch (error) {
      console.error("Error populating studio tables:", error);
      throw error;
    }
  }
}