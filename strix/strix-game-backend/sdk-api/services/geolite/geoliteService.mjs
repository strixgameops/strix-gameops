import fs from "fs";
import path from "path";
import GeoDB from "@maxmind/geoip2-node";
import axios from "axios";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GeoliteService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.geoIP_country = null;
    this.geoIP_city = null;
    this.updateInterval = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    this.cacheService = this.moduleContainer.get("cacher");

    try {
      if (process.env.SERVER_ROLE === "geocoder") {
        await this.loadDatabases();
        await this.startUpdateScheduler();
      }
      this.initialized = true;
      console.log("GeoliteService initialized");
    } catch (error) {
      console.error("Failed to initialize GeoliteService:", error);
      throw error;
    }
  }

  /**
   * Validate if a file is a valid MaxMind database
   */
  validateDatabaseFile(filePath, type = "country") {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, reason: "File does not exist" };
      }

      const stats = fs.statSync(filePath);
      if (stats.size < 10000) {
        // Valid database should be larger than 10KB
        return { valid: false, reason: `File too small (${stats.size} bytes)` };
      }

      // The most reliable validation is to try opening it with the MaxMind library
      const testBuffer = fs.readFileSync(filePath);
      const testReader = GeoDB.Reader.openBuffer(testBuffer);

      // Try a test query to ensure the database is functional
      try {
        switch (type) {
          case "country":
            testReader.country("8.8.8.8"); // Test with Google's DNS
            break;
          case "city":
            testReader.city("8.8.8.8"); // Test with Google's DNS
            break;
        }
      } catch (queryError) {
        testReader.close?.();
        return {
          valid: false,
          reason: `Database query test failed: ${queryError.message}`,
        };
      }

      testReader.close?.(); // Close if method exists
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  /**
   * Calculate MD5 hash of a file
   */
  calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash("md5");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
  }

  async loadDatabases() {
    const geoDataPath = path.resolve(__dirname + "/files");
    const countryDbPath = path.join(geoDataPath, "GeoLite2-Country.mmdb");
    const cityDbPath = path.join(geoDataPath, "GeoLite2-City.mmdb");

    try {
      // Validate existing databases
      const countryValidation = this.validateDatabaseFile(
        countryDbPath,
        "country"
      );
      const cityValidation = this.validateDatabaseFile(cityDbPath, "city");

      if (!countryValidation.valid || !cityValidation.valid) {
        console.log("Invalid or missing GeoLite databases detected:");
        if (!countryValidation.valid) {
          console.log(`Country DB: ${countryValidation.reason}`);
        }
        if (!cityValidation.valid) {
          console.log(`City DB: ${cityValidation.reason}`);
        }

        // Remove invalid files
        if (fs.existsSync(countryDbPath)) {
          fs.unlinkSync(countryDbPath);
          console.log("Removed invalid country database");
        }
        if (fs.existsSync(cityDbPath)) {
          fs.unlinkSync(cityDbPath);
          console.log("Removed invalid city database");
        }

        console.log("Downloading fresh databases...");
        await this.updateGeoLite();
      }

      // Load the databases
      const dbBuffer_country = fs.readFileSync(countryDbPath);
      this.geoIP_country = GeoDB.Reader.openBuffer(dbBuffer_country);

      const dbBuffer_city = fs.readFileSync(cityDbPath);
      this.geoIP_city = GeoDB.Reader.openBuffer(dbBuffer_city);

      console.log("GeoLite databases loaded successfully");
    } catch (error) {
      console.error("Error loading GeoLite databases:", error);

      // If loading fails, try to download fresh databases
      console.log("Attempting to download fresh databases...");
      try {
        await this.forceUpdateGeoLite();

        // Try loading again
        const dbBuffer_country = fs.readFileSync(countryDbPath);
        this.geoIP_country = GeoDB.Reader.openBuffer(dbBuffer_country);

        const dbBuffer_city = fs.readFileSync(cityDbPath);
        this.geoIP_city = GeoDB.Reader.openBuffer(dbBuffer_city);

        console.log("GeoLite databases loaded successfully after re-download");
      } catch (retryError) {
        console.error(
          "Failed to load databases even after re-download:",
          retryError
        );
        throw retryError;
      }
    }
  }

  async startUpdateScheduler() {
    // Initial update check
    await this.updateGeoLite();

    // Schedule updates every hour
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateGeoLite();
      } catch (error) {
        console.error("Scheduled GeoLite update failed:", error);
      }
    }, 1 * 1000 * 60 * 60); // 1 hour
  }

  async getGeoDataForIP(ip, type) {
    if (!this.initialized) {
      throw new Error("GeoliteService not initialized");
    }

    let result;
    const cacheKey = `geoCache:${type}:${ip}`;

    try {
      switch (type) {
        case "country":
          result = this.geoIP_country.country(ip);
          if (result) {
            const response = { success: true, result: result };
            this.cacheService.trySetCache(cacheKey, response);
            return response;
          } else {
            const response = { success: false, result: null };
            this.cacheService.trySetCache(cacheKey, response);
            return response;
          }
        case "city":
          result = this.geoIP_city.city(ip);
          if (result.location) {
            const { latitude, longitude } = result.location;
            const response = { success: true, result: { latitude, longitude } };
            this.cacheService.trySetCache(cacheKey, response);
            return response;
          } else {
            const response = {
              success: false,
              result: { latitude: 0, longitude: 0 },
            };
            this.cacheService.trySetCache(cacheKey, response);
            return response;
          }
        default:
          console.error(`Unknown type ${type}`);
          return { success: false, result: null };
      }
    } catch (error) {
      console.warn("Error fetching geo data by IP:", error);
      const response = { success: false, result: null };
      this.cacheService.trySetCache(cacheKey, response);
      return response;
    }
  }

  async downloadGeoLite(url, outputPath, skipValidation = false, type) {
    const tempPath = outputPath + ".tmp";

    try {
      console.log(`Downloading from: ${url}`);
      const response = await axios.get(url, {
        responseType: "stream",
        timeout: 30000, // 30 second timeout
        maxRedirects: 5,
      });

      const writer = fs.createWriteStream(tempPath);

      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);

        // Add timeout for the download
        setTimeout(() => {
          writer.destroy();
          reject(new Error("Download timeout"));
        }, 60000); // 60 second timeout for download
      });

      // Validate the downloaded file (unless explicitly skipped)
      if (!skipValidation) {
        const validation = this.validateDatabaseFile(tempPath, type);
        if (!validation.valid) {
          fs.unlinkSync(tempPath);
          throw new Error(`Downloaded file is invalid: ${validation.reason}`);
        }
      }

      // Move temp file to final location
      fs.renameSync(tempPath, outputPath);
      console.log(`Successfully downloaded: ${path.basename(outputPath)}`);
    } catch (error) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }

  /**
   * Try multiple download sources for GeoLite databases
   */
  async downloadWithFallback(fileName, outputPath, type) {
    const sources = [
      // Primary source
      async () => {
        const release = await this.getLatestRelease();
        const url = `https://github.com/P3TERX/GeoLite.mmdb/releases/download/${release.tag_name}/${fileName}`;
        await this.downloadGeoLite(url, outputPath, type);
        return release.tag_name;
      },
      // Fallback: download without validation
      async () => {
        const release = await this.getLatestRelease();
        const url = `https://github.com/P3TERX/GeoLite.mmdb/releases/download/${release.tag_name}/${fileName}`;
        console.log(`Trying download without validation for ${fileName}...`);
        await this.downloadGeoLite(url, outputPath, true, type); // Skip validation
        return release.tag_name;
      },
    ];

    let lastError;
    for (let i = 0; i < sources.length; i++) {
      try {
        console.log(`Attempting download method ${i + 1} for ${fileName}...`);
        const version = await sources[i]();
        console.log(
          `Successfully downloaded ${fileName} using method ${i + 1}`
        );
        return version;
      } catch (error) {
        console.warn(
          `Download method ${i + 1} failed for ${fileName}:`,
          error.message
        );
        lastError = error;

        // Clean up any partial file
        if (fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(outputPath);
          } catch (cleanupError) {
            console.warn(
              `Failed to clean up ${outputPath}:`,
              cleanupError.message
            );
          }
        }
      }
    }

    throw lastError || new Error(`All download methods failed for ${fileName}`);
  }

  async getLatestRelease() {
    const response = await axios.get(
      "https://api.github.com/repos/P3TERX/GeoLite.mmdb/releases/latest",
      {
        headers: { "User-Agent": "Node.js" },
        timeout: 10000, // 10 second timeout
      }
    );
    return response.data;
  }

  /**
   * Check if a version string (YYYY.MM.DD format) is older than 2 weeks
   */
  isVersionOlderThan2Weeks(versionString) {
    try {
      // Parse version string like "2025.06.07" to date
      const [year, month, day] = versionString.split(".").map(Number);
      const versionDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date

      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      return versionDate < twoWeeksAgo;
    } catch (error) {
      console.warn(`Failed to parse version string "${versionString}":`, error);
      // If we can't parse the version, assume it's old to be safe
      return true;
    }
  }

  /**
   * Force update GeoLite databases regardless of version
   */
  async forceUpdateGeoLite() {
    const geoDataPath = path.resolve(__dirname + "/files");

    // Ensure directory exists
    if (!fs.existsSync(geoDataPath)) {
      fs.mkdirSync(geoDataPath, { recursive: true });
    }

    try {
      console.log(`Force downloading GeoLite databases...`);
      const files = ["GeoLite2-City.mmdb", "GeoLite2-Country.mmdb"];
      let version = null;

      for (const fileName of files) {
        const outputPath = path.join(geoDataPath, fileName);
        console.log(`Force downloading ${fileName}...`);
        const downloadedVersion = await this.downloadWithFallback(
          fileName,
          outputPath
        );
        if (!version) version = downloadedVersion;
      }

      // Update version file
      if (version) {
        const versionFile = path.join(geoDataPath, "latest_version.txt");
        fs.writeFileSync(versionFile, version, "utf8");
      }

      console.log("GeoLite force update completed successfully.");
    } catch (error) {
      console.error("Force update failed:", error);
      throw error;
    }
  }

  async updateGeoLite() {
    try {
      const release = await this.getLatestRelease();
      const releaseTag = release.tag_name;
      console.log(`Latest GeoLite release: ${releaseTag}`);

      const geoDataPath = path.resolve(__dirname + "/files");
      const versionFile = path.join(geoDataPath, "latest_version.txt");
      let localVersion = null;

      try {
        localVersion = fs.readFileSync(versionFile, "utf8").trim();
      } catch {
        // Version file doesn't exist
      }

      if (localVersion === releaseTag) {
        console.log(`Local GeoLite version is current (${localVersion}).`);
        return;
      }

      console.log(`Found new GeoLite version (${releaseTag}), downloading...`);

      // Ensure directory exists
      if (!fs.existsSync(geoDataPath)) {
        fs.mkdirSync(geoDataPath, { recursive: true });
      }

      try {
        const files = [
          { name: "GeoLite2-City.mmdb", type: "city" },
          { name: "GeoLite2-Country.mmdb", type: "country" },
        ];

        for (const file of files) {
          const outputPath = path.join(geoDataPath, file.name);
          console.log(`Downloading ${file.name}...`);
          await this.downloadWithFallback(file.name, outputPath, file.type);
        }

        // Update version file only after successful download
        fs.writeFileSync(versionFile, releaseTag, "utf8");

        // Reload databases if this is an update during runtime
        if (this.initialized) {
          await this.loadDatabases();
        }

        console.log("GeoLite updated successfully.");
      } catch (downloadError) {
        // Check if the latest version is older than 2 weeks
        const isOld = this.isVersionOlderThan2Weeks(releaseTag);

        if (isOld) {
          // Version is older than 2 weeks, treat as error
          console.error(
            `Error downloading GeoLite (version ${releaseTag} is older than 2 weeks):`,
            downloadError.message
          );
          throw downloadError;
        } else {
          // Version is recent (within 2 weeks), treat as warning
          console.warn(
            `Warning: Failed to download GeoLite version ${releaseTag} (recent version, will retry later):`,
            downloadError.message
          );
          // Don't throw, just log the warning and continue
        }
      }
    } catch (error) {
      // Only rethrow if it's not a download error that we've already handled
      if (
        error.message &&
        !error.message.includes("getaddrinfo") &&
        !error.message.includes("Request failed")
      ) {
        console.warn("Error updating GeoLite:", error.message);
        // throw error;
      }
      // If it was a network/download error, it's already been handled above
    }
  }

  async shutdown() {
    console.log("Shutting down GeoliteService...");

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Close database readers
    if (this.geoIP_country) {
      this.geoIP_country.close?.();
      this.geoIP_country = null;
    }

    if (this.geoIP_city) {
      this.geoIP_city.close?.();
      this.geoIP_city = null;
    }

    this.initialized = false;
  }
}
