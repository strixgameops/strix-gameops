import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createUtilityRoutes(container, authMiddleware) {
  const router = express.Router();
  const utility = container.get("utility");
  const businessUtilities = container.getOptionalService("businessUtility");
  const logging = container.get("logging");

  const auth = container.getController("auth");
  const { validateAccessToken } = authMiddleware;

  router.post(
    "/api/buildDemo",
    asyncHandler(async (req, res) => {
      const customToken = await businessUtilities?.buildDemo();
      res.status(201).json({ success: true, token: customToken });
    })
  );

  router.post(
    "/api/sendContactUs",
    asyncHandler(async (req, res) => {
      const { email, name, message } = req.body;
      await businessUtilities?.sendEmailToStrix(email, name, message);
      res.status(200).json({ success: true });
    })
  );

  router.post(
    "/api/sendBugReport",
    asyncHandler(async (req, res) => {
      const { error } = req.body;
      const token = req.headers["authtoken"];

      const validatedToken = await auth.checkAccessTokenValidity(token);
      const uid = validatedToken.uid;

      await businessUtilities?.saveBugReport(error, uid);
      res.status(200).json({ success: true });
    })
  );

  router.post(
    "/api/sendAppointmentReminder",
    asyncHandler(async (req, res) => {
      const {
        customerName,
        customerEmail,
        providerName,
        providerEmail,
        appointmentHash,
        secret,
      } = req.body;

      if (secret !== process.env.ENCRYPT_SECRET_KEY) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid secret" });
      }

      await businessUtilities?.remindMeeting(
        customerName,
        customerEmail,
        providerName,
        providerEmail,
        appointmentHash
      );
      res.status(200).json({ success: true });
    })
  );

  router.post(
    "/api/uploadFileToStudioCloud",
    asyncHandler(async (req, res) => {
      const { gameID, base64, withExtension = false } = req.body;
      const link = await utility.uploadFileToStudioCloud(
        gameID,
        base64,
        withExtension
      );
      res.status(200).json({ success: true, result: link });
    })
  );

  router.post(
    "/api/fetchFileFromStudioCloud",
    asyncHandler(async (req, res) => {
      const { gameID, link } = req.body;
      const file = await utility.fetchFileFromStudioCloud(gameID, link);
      res.status(200).json({ success: true, result: file });
    })
  );

  router.post(
    "/api/getAllActionLogs",
    validateAccessToken,
    asyncHandler(async (req, res) => {
      const { gameID } = req.body;
      const result = await logging.getAllActionLogs(gameID);
      res.status(200).json({ success: true, logs: result });
    })
  );

  router.post(
    "/api/getActionLogsByType",
    validateAccessToken,
    asyncHandler(async (req, res) => {
      const { gameID, type } = req.body;
      const result = await logging.getActionLogsByType(gameID, type);
      res.status(200).json({ success: true, logs: result });
    })
  );

  return router;
}
