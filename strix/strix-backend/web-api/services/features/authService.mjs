import { User } from "../../../models/userModel.js";
import { Studio } from "../../../models/studioModel.js";
import { Publisher } from "../../../models/publisherModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import firebase from "firebase-admin";

export class AuthService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.useFirebase = process.env.USE_FIREBASE_AUTH === "true";
    this.jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    this.jwtExpiry = process.env.JWT_EXPIRY || "72h";
  }

  // Local JWT token creation
  createLocalToken(email) {
    return jwt.sign(
      { 
        uid: email, // Using email as uid for consistency with Firebase
        email: email,
        iat: Math.floor(Date.now() / 1000)
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry }
    );
  }

  // Local JWT token verification
  verifyLocalToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }
  
  // Function to register a new user
  async registerUser(email, password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.updateOne(
        { email },
        { password: hashedPassword },
        { upsert: true }
      );

      let customToken;
      if (this.useFirebase) {
        customToken = await firebase.auth().createCustomToken(email);
      } else {
        customToken = this.createLocalToken(email);
      }

      return { success: true, token: customToken };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal Server Error" };
    }
  }

  async createCustomToken(email) {
    if (this.useFirebase) {
      return await firebase.auth().createCustomToken(email);
    } else {
      return this.createLocalToken(email);
    }
  }

  async decodeAndVerifyIdToken(token) {
    if (this.useFirebase) {
      return await firebase.auth().verifyIdToken(token);
    } else {
      return this.verifyLocalToken(token);
    }
  }

  async checkOrganizationAuthority(token, orgID) {
    if (!token || !orgID) {
      throw new Error("Token and organization ID are required");
    }

    try {
      const decodedToken = await this.decodeAndVerifyIdToken(token);
      if (!decodedToken.uid) {
        throw new Error("Invalid or expired token");
      }
      const organizationService = this.moduleContainer.get("organization");

      return await organizationService.checkUserOrganizationAuthority(
        orgID,
        decodedToken.uid
      );
    } catch (error) {
      throw new Error(`Authorization failed: ${error.message}`);
    }
  }

  // Function to authenticate a user
  async authenticateUser(email, password) {
    try {
      const user = await User.findOne({ email });

      if (user) {
        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (isPasswordMatch) {
          let customToken;
          if (this.useFirebase) {
            customToken = await firebase.auth().createCustomToken(email);
          } else {
            customToken = this.createLocalToken(email);
          }
          return { success: true, token: customToken };
        } else {
          return { success: false, message: "Wrong username or password" };
        }
      } else {
        return { success: false, message: "Wrong username or password" };
      }
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal auth error" };
    }
  }

  // Function to logout/signout/revoke token
  async logoutUser(token) {
    try {
      if (this.useFirebase) {
        const decodedToken = await firebase.auth().verifyIdToken(token);
        const uid = decodedToken.uid;
        await firebase.auth().revokeRefreshTokens(uid);
        return "User logged out successfully";
      } else {
        // For local tokens, we can't really "revoke" them since they're stateless
        const decodedToken = this.verifyLocalToken(token);
        return "User logged out successfully";
      }
    } catch (error) {
      console.error(error);
      return "Invalid or expired token";
    }
  }

  async checkAccessTokenValidity(accessToken) {
    try {
      if (this.useFirebase) {
        return await firebase.auth().verifyIdToken(accessToken);
      } else {
        return this.verifyLocalToken(accessToken);
      }
    } catch (error) {
      return false;
    }
  }

  async checkUserHasAccessToType(uid, subjectID, type) {
    // Checks if the user with the given uid has the permission to access the given entity (studio, publisher, game)
    switch (type) {
      case "studio":
        return await Studio.exists({
          studioID: subjectID,
          users: {
            $elemMatch: {
              userID: uid,
              userPermissions: {
                $elemMatch: {
                  $or: [{ permission: "default" }, { permission: "admin" }],
                },
              },
            },
          },
        });
      case "publisher":
        return await Publisher.exists({
          publisherID: subjectID,
          users: {
            $elemMatch: {
              userID: uid,
              userPermissions: {
                $elemMatch: {
                  $or: [{ permission: "default" }, { permission: "admin" }],
                },
              },
            },
          },
        });
      case "game":
        return await Studio.exists({
          games: { $elemMatch: { gameID: subjectID } },
          users: {
            $elemMatch: {
              userID: uid,
              userPermissions: {
                $elemMatch: {
                  $or: [{ permission: "default" }, { permission: "admin" }],
                },
              },
            },
          },
        });
      default:
        return false;
    }
  }

  async checkUserOrganizationAuthority(studioID, uid) {
    try {
      const studio = await Studio.findOne({ studioID });
      const user = studio.users.find((user) => user.userID === uid);
      return user.userPermissions.some((p) => p.permission === "admin");
    } catch (err) {
      console.error("Error checking user authority:", err);
      return false;
    }
  }
}

export default AuthService;