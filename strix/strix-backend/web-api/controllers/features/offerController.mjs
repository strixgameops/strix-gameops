export class OfferController {
  constructor(offerService) {
    this.offerService = offerService;
  }

  createNewOffer = async (req, res, next) => {
    try {
      const { gameID, branch, offerObj } = req.body;
      const clientUID = req.clientUID;
      const result = await this.offerService.createNewOffer(
        gameID,
        branch,
        offerObj,
        clientUID
      );
      res.status(200).json({
        success: true,
        message: "Offer created successfully",
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  };

  getPricing = async (req, res, next) => {
    try {
      const { gameID, branch } = req.body;
      const result = await this.offerService.getPricing(gameID, branch);
      res.status(200).json({ success: true, templates: result });
    } catch (error) {
      console.error(error);
      next(error);
    }
  };

  

  updateOffer = async (req, res, next) => {
    try {
      const { gameID, branch, offerObj } = req.body;
      const clientUID = req.clientUID;
      const result = await this.offerService.updateOffer(
        gameID,
        branch,
        offerObj,
        clientUID
      );
      res.status(200).json({
        success: true,
        message: "Offer updated successfully",
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  };

  getOffersNames = async (req, res, next) => {
    try {
      const { gameID, branch } = req.body;
      const offers = await this.offerService.getOffersNames(gameID, branch);
      res.status(200).json({ success: true, offers });
    } catch (error) {
      console.error(error);
      next(error);
    }
  };

  removeOffer = async (req, res, next) => {
    try {
      const { gameID, branch, offerID } = req.body;
      const clientUID = req.clientUID;
      await this.offerService.updateOfferAndPositions(
        gameID,
        branch,
        offerID,
        clientUID
      );
      await this.offerService.removeOfferLocalization(
        gameID,
        branch,
        offerID,
        clientUID
      );
      res.status(200).json({
        success: true,
        message: "Offer removed successfully",
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  };

  getOffersByContentNodeID = async (req, res, next) => {
    try {
      const { gameID, branch, nodeID } = req.body;
      const offers = await this.offerService.getOffersByContentNodeID(
        gameID,
        branch,
        nodeID
      );
      res.status(200).json({ success: true, offers });
    } catch (error) {
      console.error(error);
      next(error);
    }
  };

  getCurrencyEntities = async (req, res, next) => {
    try {
      const { gameID, branch } = req.body;
      const entities = await this.offerService.getCurrencyEntities(
        gameID,
        branch
      );
      res.status(200).json({ success: true, entities });
    } catch (error) {
      console.error(error);
      next(error);
    }
  };

  getPositionedOffers = async (req, res, next) => {
    try {
      const { gameID, branch } = req.body;
      const positions = await this.offerService.getPositionedOffers(
        gameID,
        branch
      );
      if (!positions) {
        return res
          .status(404)
          .json({ success: false, message: "Data not found" });
      }
      res.status(200).json({ success: true, positions });
    } catch (error) {
      console.error(error);
      next(error);
    }
  };

  updatePositionedOffers = async (req, res, next) => {
    try {
      const clientUID = req.clientUID;
      const { gameID, branch, positionID, position } = req.body;
      const result = await this.offerService.updatePositionedOffers(
        gameID,
        branch,
        positionID,
        position,
        clientUID
      );
      res.status(200).json({
        success: true,
        message: "Positions set successfully",
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  };

  removePositionedOffer = async (req, res, next) => {
    try {
      const clientUID = req.clientUID;
      const { gameID, branch, positionID } = req.body;
      const result = await this.offerService.removePositionedOffer(
        gameID,
        branch,
        positionID,
        clientUID
      );
      res.status(200).json({
        success: true,
        message: "Positions set successfully",
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  };

  getOffers = async (req, res, next) => {
    try {
      const { gameID, branch, getRemoved } = req.body;
      const offers = await this.offerService.getOffers(
        gameID,
        branch,
        getRemoved
      );
      res.status(200).json({ success: true, offers });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
}