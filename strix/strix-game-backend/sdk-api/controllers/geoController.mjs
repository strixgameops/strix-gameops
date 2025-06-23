import net from "net";

export class GeoController {
  constructor(utilityService, geoliteService) {
    this.utilityService = utilityService;
    this.geoliteService = geoliteService;
  }

  async getGeoData(req, res) {
    const { secret, ip, type } = req.body;

    if (process.env.ENCRYPT_SECRET_KEY !== secret || !secret) {
      console.error(`Secret key mismatch in Geocoder! Got "${secret}"`);
      return res.status(404).json({ success: false, message: "" });
    }

    if (!ip) {
      return res
        .status(400)
        .json({ success: false, message: "Missing IP address" });
    }

    // Check if IP is strictly IPv4 format
    if (net.isIP(ip) !== 4) {
      return res.status(400).json({
        success: false,
        message: "Invalid IPv4 address format",
      });
    }

    this.utilityService.log("/api/getGeoData", ip);

    try {
      const { success, result } = await this.geoliteService.getGeoDataForIP(
        ip,
        type
      );

      res.json({
        success: success,
        data: result,
      });
    } catch (error) {
      console.error("Error in getGeoData:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }
}
