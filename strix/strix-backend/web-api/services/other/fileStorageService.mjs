import { google } from "googleapis";
import firebase from "firebase-admin";
import { Storage } from "@google-cloud/storage";
import fs from "fs/promises";
import { Buffer } from "buffer";
import axios from "axios";
import { fileTypeFromBuffer } from "file-type";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

export class FileStorageService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;

    this.storage = null;
    this.projectId = null;
    this.auth = null;
    this.cachedFiles = {};

    if (process.env.SERVER_ROLE === "webBackend") {
      this.initializeFirebase();
      if (process.env.USE_FIREBASE_AUTH == "true") {
        this.initializeAuth();
      }
    }
  }

  initializeFirebase() {
    const firebaseCredentials = {
      type: process.env.FB_ASDK_TYPE,
      project_id: process.env.FB_ASDK_PROJECT_ID,
      private_key_id: process.env.FB_ASDK_PROJECT_KEY_ID,
      private_key: this.formatPrivateKey(process.env.FB_ASDK_PRIVATE_KEY),
      client_email: process.env.FB_ASDK_CLIENT_EMAIL,
      client_id: process.env.FB_ASDK_CLIENT_ID,
      auth_uri: process.env.FB_ASDK_AUTH_URI,
      token_uri: process.env.FB_ASDK_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FB_ASDK_AUTH_PROVIDER,
      client_x509_cert_url: process.env.FB_ASDK_CLIENT_CERT,
      universe_domain: process.env.FB_ASDK_UNIVERSE_DOMAIN,
    };
    if (
      Object.entries(firebaseCredentials).length > 0 &&
      Object.entries(firebaseCredentials).some(e => !e[1]) // some is undefined
    ) {
      throw new Error(
        "Some of your Firebase params are invalid or missing. Consider filling them in .env variables"
      );
    }

    this.projectId = process.env.FB_ASDK_PROJECT_ID;

    firebase.initializeApp({
      credential: firebase.credential.cert(firebaseCredentials),
      projectId: this.projectId,
    });

    this.storage = new Storage({
      projectId: this.projectId,
      credentials: firebaseCredentials,
    });
  }

  initializeAuth() {
    const firebaseCredentials = {
      type: process.env.FB_ASDK_TYPE,
      project_id: process.env.FB_ASDK_PROJECT_ID,
      private_key_id: process.env.FB_ASDK_PROJECT_KEY_ID,
      private_key: this.formatPrivateKey(process.env.FB_ASDK_PRIVATE_KEY),
      client_email: process.env.FB_ASDK_CLIENT_EMAIL,
      client_id: process.env.FB_ASDK_CLIENT_ID,
      auth_uri: process.env.FB_ASDK_AUTH_URI,
      token_uri: process.env.FB_ASDK_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FB_ASDK_AUTH_PROVIDER,
      client_x509_cert_url: process.env.FB_ASDK_CLIENT_CERT,
      universe_domain: process.env.FB_ASDK_UNIVERSE_DOMAIN,
    };

    if (
      Object.entries(firebaseCredentials).length > 0 &&
      Object.entries(firebaseCredentials).some(e => !e[1]) // some is undefined
    ) {
      throw new Error(
        "Some of your Firebase params for Auth are invalid or missing. Consider filling them in .env variables"
      );
    }

    this.auth = new google.auth.GoogleAuth({
      credentials: firebaseCredentials,
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/firebase",
        "https://www.googleapis.com/auth/firebase.messaging",
      ],
    });
  }

  formatPrivateKey(key) {
    if (!key) return undefined;
    return key.replace(/\\n/g, "\n");
  }

  async createStorageBucketsForGame(gameID) {
    try {
      let bucketName = gameID.toLowerCase();
      const [exists] = await this.storage.bucket(bucketName).exists();

      if (!exists) {
        await this.createBucket(bucketName);
      }
    } catch (err) {
      console.error("Error creating storage bucket:", err, err?.response?.data);
      throw err;
    }
  }

  async createBucketIfDoesntExists(bucketName) {
    try {
      bucketName = bucketName.toLowerCase();
      let [exists] = await this.storage.bucket(bucketName).exists();
      console.log(
        "Trying to create storage bucket:",
        bucketName,
        "exists:",
        exists
      );

      if (!exists) {
        await this.createBucket(bucketName);
      }
    } catch (err) {
      console.error("Error creating storage bucket:", err, err?.response?.data);
      throw err;
    }
  }

  async createBucket(bucketName) {
    const options = {
      location: "US",
      storageClass: "NEARLINE",
    };

    const result_bucket = await this.storage.createBucket(bucketName, options);
    console.log("Bucket creation response:", result_bucket);

    // Link the bucket to Firebase
    const url = `https://firebasestorage.googleapis.com/v1alpha/projects/${this.projectId}/buckets/${bucketName}:addFirebase`;
    const headers = await this.auth.getRequestHeaders();
    const result_link = await axios.post(url, {}, { headers: headers });

    console.log(
      "Bucket linking response:",
      result_link.status,
      result_link.data
    );
    console.log(`Bucket ${bucketName} created.`);

    await this.applySecurityRules(bucketName);
  }

  async applySecurityRules(bucketName) {
    const ruleset = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow read access to all users
      allow read: if true;
      // Deny write access to all users
      allow write: if false;
    }
  }
}`;

    const rules = await firebase
      .securityRules()
      .releaseStorageRulesetFromSource(ruleset, bucketName);

    console.log("Applied security rules to bucket", bucketName);
  }

  async uploadBase64FileToBucket(base64String, bucketName, extension = false) {
    try {
      bucketName = bucketName.toLowerCase();
      await this.createBucketIfDoesntExists(bucketName);

      // Extract MIME type and actual base64 content when extension is true
      let contentType = "text/plain";
      let fileData = base64String;
      let fileExtension = "";

      if (extension === true && base64String.includes(";base64,")) {
        // Parse the data URL to get content type and raw base64 data
        const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          contentType = matches[1];
          fileData = matches[2];

          // Get file extension from MIME type
          const mimeToExt = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/gif": "gif",
            "image/svg+xml": "svg",
            "application/pdf": "pdf",
            "text/plain": "txt",
            "text/html": "html",
            "application/json": "json",
            // Add more mappings as needed
          };

          fileExtension = mimeToExt[contentType] || "";
        }
      }

      // Create filename with extension if provided
      const utilityService = this.moduleContainer.get("utility");
      const baseFileName = utilityService.computeHash(base64String);
      const fileName = fileExtension
        ? `${baseFileName}.${fileExtension}`
        : baseFileName;

      console.log(
        "Uploading base64 file:",
        fileName,
        " | To bucket:",
        bucketName,
        " | Content type:",
        contentType
      );

      if (!this.cachedFiles[bucketName]) {
        this.cachedFiles[bucketName] = [fileName];
      } else {
        this.cachedFiles[bucketName].push(fileName);
      }
      const file = this.storage.bucket(bucketName).file(fileName);

      // Check if this file exists
      const [exists] = await file.exists();

      if (exists) {
        const [metadata] = await file.getMetadata();

        // Get checksum of the existing file
        const currentChecksum = metadata.md5Hash;

        // Get checksum of the new file
        const newChecksum = this.calculateChecksum(base64String);

        console.log(
          "Existing checksum:",
          currentChecksum,
          "\n",
          "New file checksum:",
          newChecksum
        );

        // If checksums differ, delete the existing file and upload the new
        if (currentChecksum !== newChecksum) {
          await file.delete();
          // Use the correct buffer based on whether we extracted the base64 content
          const buffer =
            extension === true && fileData !== base64String
              ? Buffer.from(fileData, "base64")
              : Buffer.from(base64String);

          const saveResult = await file.save(buffer, {
            metadata: { contentType: contentType },
            public: true,
          });
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
          console.log(
            "File uploaded successfully (replaced):",
            saveResult,
            "\n",
            "Public URL:",
            publicUrl
          );
          return publicUrl;
        } else {
          // Checksums are the same, skip uploading
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
          console.log(
            "File already exists and checksums match, no need to upload.",
            "\n",
            "Public URL:",
            publicUrl
          );
          return publicUrl;
        }
      } else {
        // No existing file. Upload
        // Use the correct buffer based on whether we extracted the base64 content
        const buffer =
          extension === true && fileData !== base64String
            ? Buffer.from(fileData, "base64")
            : Buffer.from(base64String);

        const saveResult = await file.save(buffer, {
          metadata: { contentType: contentType },
          public: true,
        });
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        console.log(
          "File uploaded successfully (new):",
          saveResult,
          "\n",
          "Public URL:",
          publicUrl
        );
        return publicUrl;
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      throw err;
    }
  }

  async downloadFileFromBucketAsBase64(bucketName, fileName) {
    try {
      bucketName = bucketName.toLowerCase();
      const file = this.storage.bucket(bucketName).file(fileName);

      // Check if the file exists
      const [exists] = await file.exists();

      if (!exists) {
        throw new Error(
          `File ${fileName} does not exist in bucket ${bucketName}`
        );
      }

      // Download the file as a buffer
      const [fileBuffer] = await file.download();
      // Convert the buffer to a base64 string
      const base64String = fileBuffer.toString("utf-8");

      const utilityService = this.moduleContainer.get("utility");
      utilityService.log("File downloaded successfully:", fileName);
      return base64String;
    } catch (err) {
      console.error("Error downloading file:", err);
      throw err;
    }
  }

  async deleteFileFromBucket(bucketName, fileName) {
    try {
      bucketName = bucketName.toLowerCase();
      const file = this.storage.bucket(bucketName).file(fileName);
      const [exists] = await file.exists();

      if (exists) {
        await file.delete();
        console.log(`File ${fileName} deleted from bucket ${bucketName}`);
      }
    } catch (error) {
      console.log("Error deleting file:", error);
    }
  }

  async clearUnnecessaryFiles() {
    try {
      for (const bucketName in this.cachedFiles) {
        if (this.cachedFiles.hasOwnProperty(bucketName)) {
          const filesToKeep = this.cachedFiles[bucketName];
          const [files] = await this.storage.bucket(bucketName).getFiles();

          for (const file of files) {
            const fileName = file.name;
            if (!filesToKeep.includes(fileName)) {
              await file.delete();
              console.log(`File ${fileName} deleted from bucket ${bucketName}`);
            }
          }

          this.cachedFiles[bucketName] = [];
        }
      }
    } catch (err) {
      console.error("Error clearing unnecessary files:", err);
      throw err;
    }
  }

  calculateChecksum(buffer) {
    // get the same base64 md5 hash as google outputs for it's storage files' metadata
    const hash = crypto.createHash("md5");
    hash.update(buffer);
    return hash.digest("base64");
  }
  async initApp(gameID) {
    await this.createStorageBucketsForGame(gameID);
  }
}
