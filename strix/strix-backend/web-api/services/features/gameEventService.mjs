import { GameEvents } from "../../../models/gameEvents.js";
import { GameEventsNotes } from "../../../models/gameEventsNotes.js";

export class GameEventService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async getGameEvents(gameID, branch, getPaused = true) {
    try {
      const events = await GameEvents.find({
        gameID,
        branch: branch,
        removed: false,
        isPaused: !getPaused,
      });
      if (events) {
        return { success: true, events: events };
      } else {
        return { success: true, events: [] };
      }
    } catch (error) {
      console.log(error);
      throw new Error("Internal Server Error");
    }
  }

  async createGameEvent(gameID, branch, eventObj, clientUID) {
    try {
      const res = await GameEvents.insertMany([
        { gameID, branch: branch, ...eventObj },
      ]);

      if (res) {
        const loggingService = this.moduleContainer.get("logging");
        loggingService.logAction(
          gameID,
          "gameEvent",
          `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: created new game event  | SUBJECT: ${eventObj.id}`
        );
        return { success: true };
      } else {
        return {
          success: false,
          message: "Could not create game event. Please contact support",
        };
      }
    } catch (error) {
      console.log(error);
      throw new Error("Internal Server Error");
    }
  }

  async removeGameEvent(gameID, branch, gameEventID, clientUID) {
    try {
      const res = await GameEvents.findOneAndUpdate(
        { gameID, branch: branch, id: gameEventID },
        { $set: { removed: true } },
        { new: true }
      );

      if (res) {
        if (res.selectedEntities && res.selectedEntities.length > 0) {
          res.selectedEntities.forEach((e) => {
            this.removeEntityFromGameEvent(
              gameID,
              branch,
              gameEventID,
              e,
              clientUID
            );
          });
        }
        const loggingService = this.moduleContainer.get("logging");

        loggingService.logAction(
          gameID,
          "gameEvent",
          `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: removed game event  | SUBJECT: ${gameEventID}`
        );
        return { success: true };
      } else {
        return {
          success: false,
          message: "Could not remove game event. Please contact support",
        };
      }
    } catch (error) {
      console.log(error);
      throw new Error("Internal Server Error");
    }
  }

  async updateGameEvent(gameID, branch, newGameEventObj, clientUID) {
    try {
      let temp = newGameEventObj;
      if (temp.selectedOffers && temp.selectedOffers.length > 0) {
        const utilityService = this.moduleContainer.get("utility");

        temp.selectedOffers = await temp.selectedOffers.map(async (offer) => {
          offer.offerIcon = await utilityService.uploadFileToStudioCloud(
            gameID,
            offer.offerIcon
          );
          return offer;
        });
      }
      const res = await GameEvents.updateOne(
        { gameID, branch: branch, id: temp.id },
        { $set: { ...temp } }
      );
      if (res.modifiedCount > 0 || res.matchedCount > 0) {
        const loggingService = this.moduleContainer.get("logging");

        loggingService.logAction(
          gameID,
          "gameEvent",
          `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed game event  | SUBJECT: ${temp.id}`
        );
        return { success: true };
      } else {
        return {
          success: false,
          message: "Could not update game event. Please contact support",
        };
      }
    } catch (error) {
      console.log(error);
      throw new Error("Internal Server Error");
    }
  }

  async removeEntityFromGameEvent(gameID, branch, eventID, nodeID, clientUID) {
    try {
      const nodeService = this.moduleContainer.get("node");

      nodeService.clearSegmentValuesInEntityConfig(
        gameID,
        branch,
        nodeID,
        `gameevent_${eventID}`,
        clientUID
      );
      return { success: true };
    } catch (error) {
      console.log(error);
      throw new Error("Internal Server Error");
    }
  }

  async getGameEventsNotes(gameID, branch) {
    try {
      const notes = await GameEventsNotes.find({
        gameID,
        branch: branch,
      });
      if (notes) {
        return { success: true, notes: notes };
      } else {
        return { success: true, notes: [] };
      }
    } catch (error) {
      console.log(error);
      throw new Error("Internal Server Error");
    }
  }

  async updateGameEventsNotes(gameID, branch, newNotes) {
    try {
      for (const note of newNotes) {
        await GameEventsNotes.findOneAndUpdate(
          { id: note.id, gameID: gameID, branch: branch },
          { $set: { ...note } },
          { upsert: true }
        );
      }
      return { success: true };
    } catch (error) {
      console.log(error);
      throw new Error("Internal Server Error");
    }
  }
}
export default GameEventService;
