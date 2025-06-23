export class GameEventController {
  constructor(gameEventService) {
    this.gameEventService = gameEventService;
  }

  async createGameEvent(req, res, next) {
    try {
      const { gameID, branch, eventObj } = req.body;
      const clientUID = req.clientUID;
      const result = await this.gameEventService.createGameEvent(
        gameID,
        branch,
        eventObj,
        clientUID
      );
      if (result.success) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  }

  async removeGameEvent(req, res, next) {
    try {
      const { gameID, branch, gameEventID } = req.body;
      const clientUID = req.clientUID;
      const result = await this.gameEventService.removeGameEvent(
        gameID,
        branch,
        gameEventID,
        clientUID
      );
      if (result.success) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  }

  async updateGameEvent(req, res, next) {
    try {
      const { gameID, branch, eventObj } = req.body;
      const clientUID = req.clientUID;
      const result = await this.gameEventService.updateGameEvent(
        gameID,
        branch,
        eventObj,
        clientUID
      );
      if (result.success) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  }

  async getGameEvents(req, res, next) {
    try {
      const { gameID, branch } = req.body;
      const result = await this.gameEventService.getGameEvents(gameID, branch, true);
      if (result.success) {
        res.status(200).json({ success: true, events: result.events });
      } else {
        res.status(500).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  }

  async removeEntityFromGameEvent(req, res, next) {
    try {
      const { gameID, branch, eventID, nodeID } = req.body;
      const clientUID = req.clientUID;

      const result = await this.gameEventService.removeEntityFromGameEvent(
        gameID,
        branch,
        eventID,
        nodeID,
        clientUID
      );
      if (result.success) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  }

  async getGameEventsNotes(req, res, next) {
    try {
      const { gameID, branch } = req.body;
      const result = await this.gameEventService.getGameEventsNotes(gameID, branch);
      if (result.success) {
        res.status(200).json({ success: true, notes: result.notes });
      } else {
        res.status(500).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  }

  async updateGameEventsNotes(req, res, next) {
    try {
      const { gameID, branch, newNotes } = req.body;
      await this.gameEventService.updateGameEventsNotes(gameID, branch, newNotes);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}