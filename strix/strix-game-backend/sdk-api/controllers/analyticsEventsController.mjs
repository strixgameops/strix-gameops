export class AnalyticsController {
  constructor(
    utilityService,
    metricsService,
    analyticsService,
  ) {
    this.utilityService = utilityService;
    this.metricsService = metricsService;
    this.analyticsService = analyticsService;
  }

  async sendEvent(req, res) {
    const {
      device,
      secret,
      session,
      language,
      platform,
      gameVersion,
      engineVersion,
      build,
      time,
      environment = "production",
      payload,
      country, // Test field not intended for production
    } = req.body;

    try {
      if (!secret) {
        this.metricsService.recordEventFailed("no_secret", req.body);
        return res
          .status(400)
          .json({ success: false, message: "API key is required" });
      }
      if (!device) {
        this.metricsService.recordEventFailed("no_device_id", req.body);
        return res
          .status(400)
          .json({ success: false, message: "Device ID is required" });
      }
      if (!session) {
        this.metricsService.recordEventFailed("no_session_id", req.body);
        return res
          .status(400)
          .json({ success: false, message: "Session ID is required" });
      }
      if (!payload) {
        this.metricsService.recordEventFailed("no_payload", req.body);
        return res
          .status(400)
          .json({ success: false, message: "Payload is required" });
      }
      if (!language) {
        this.metricsService.recordEventFailed("no_language", req.body);
        return res
          .status(400)
          .json({ success: false, message: "Language is required" });
      }
      if (!platform) {
        this.metricsService.recordEventFailed("no_platform", req.body);
        return res
          .status(400)
          .json({ success: false, message: "Platform is required" });
      }
      if (!gameVersion) {
        this.metricsService.recordEventFailed("no_game_version", req.body);
        return res
          .status(400)
          .json({ success: false, message: "Game version is required" });
      }
      if (!engineVersion) {
        this.metricsService.recordEventFailed("no_engine_version", req.body);
        return res
          .status(400)
          .json({ success: false, message: "Engine version is required" });
      }
      if (!build) {
        this.metricsService.recordEventFailed("no_build_type", req.body);
        return res
          .status(400)
          .json({ success: false, message: "Build type is required" });
      }
      if (payload.length === 0) {
        this.metricsService.recordEventFailed("no_payload_empty", req.body);
        return res
          .status(400)
          .json({ success: false, message: "Payload cannot be 0 length" });
      }

      const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
      if (!gameObj) {
        res.status(400).json({ success: false, message: "Invalid secret" });
        return;
      }

      const serverTime = new Date();
      let correctedPayload = payload;
      let timeOffset = 0;

      if (time) {
        try {
          const clientTime = new Date(time);
          
          // Calculate offset in milliseconds (server time - client time)
          timeOffset = serverTime.getTime() - clientTime.getTime();
          
          // Log suspicious time differences (more than 3 minutes)
          const offsetMinutes = Math.abs(timeOffset) / (1000 * 60);
          if (offsetMinutes > 3) {
            this.metricsService.recordEventFailed("suspicious_time_offset", {
              clientID: device,
              gameID: gameObj.gameID,
              offsetMinutes: offsetMinutes,
              clientTime: time,
              serverTime: serverTime.toISOString()
            });
          }

          // Apply time correction to each event in payload
          correctedPayload = payload.map(event => {
            if (event.time) {
              try {
                const eventTime = new Date(event.time);
                const correctedTime = new Date(eventTime.getTime() + timeOffset);
                
                return {
                  ...event,
                  time: correctedTime.toISOString(),
                };
              } catch (timeParseError) {
                console.error(`Failed to parse event time: ${event.time}`, timeParseError);
                return event; // Return original event if time parsing fails
              }
            }
            return event;
          });

        } catch (timeParseError) {
          console.warn(`Failed to parse client time: ${time}`, timeParseError);
          // Continue with original payload if time parsing fails
        }
      }

      const eventHeaders = {
        clientID: device,
        gameID: gameObj.gameID,
        sessionID: session,
        language: language,
        platform: platform,
        gameVersion: gameVersion,
        engineVersion: engineVersion,
        branch: build,
        environment: environment,
        country: country,
        clientIP: req.clientIp,
        timeOffset: timeOffset, // Include offset in headers, just in case
      };

      const result = await this.analyticsService.processEvent(
        eventHeaders,
        gameObj.gameID,
        correctedPayload,
      );
      
      if (result.success) {
        res.json({ success: true });
      } else {
        res
          .status(result.code)
          .json({ success: false, message: result.message });
      }

    } catch (error) {
      console.error("Fatal error getting analytics event:", error);
      this.metricsService.recordEventFailed("fatal_error", req.body);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}
