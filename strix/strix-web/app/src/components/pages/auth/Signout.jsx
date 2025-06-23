import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Backdrop,
  CircularProgress,
  Typography,
  Button,
  Box,
} from "@mui/material";
import useApi from "@strix/hooks/useApi";
import { useUser } from "@strix/userContext";
import { isUsingFirebase } from "../../firebase/firebase.jsx";
import { localAuthService } from "../../firebase/localAuthService.js";

const Signout = () => {
  const navigate = useNavigate();
  const { signOut, isAuthenticated, currentToken } = useUser();
  const { signout: apiSignout } = useApi();
  const [isSigningOut, setIsSigningOut] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const performSignout = async () => {
      try {
        // Clear selected game
        localStorage.removeItem("selectedGame");

        // Call API signout if we have a token
        if (currentToken) {
          try {
            await apiSignout(
              { showErrorAlert: false },
              { token: currentToken }
            );
          } catch (apiError) {
            console.warn("API signout failed:", apiError);
            // Continue with client-side signout even if API call fails
          }
        }

        // Client-side signout based on auth type
        if (isUsingFirebase()) {
          // Firebase signout via UserContext
          await signOut();
        } else {
          // Local auth signout
          await localAuthService.signOut();
          
          // Also clear any cached tokens
          localStorage.removeItem("accessToken");
          localStorage.removeItem("localAuthToken");
          localStorage.removeItem("localAuthUser");
          
          // Clear any context state through UserContext
          if (signOut) {
            await signOut();
          }
        }

        console.log(`Successfully signed out from ${isUsingFirebase() ? 'Firebase' : 'local'} auth`);

        // Navigate to login
        navigate("/login", { replace: true });
      } catch (error) {
        console.error("Signout error:", error);
        setError("Failed to sign out completely");
        setIsSigningOut(false);
      }
    };

    performSignout();
  }, [currentToken, signOut, apiSignout, navigate]);

  // Redirect if already signed out
  useEffect(() => {
    if (!isAuthenticated && !isSigningOut) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, isSigningOut, navigate]);

  if (error) {
    return (
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
          gap: 2,
        }}
        open
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Sign Out Error
        </Typography>
        <Typography sx={{ mb: 3, textAlign: "center", maxWidth: 400 }}>
          {error}. You may continue to the login page.
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => navigate("/login", { replace: true })}
          >
            Go to Login
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setError(null);
              setIsSigningOut(true);
              // Retry signout
              window.location.reload();
            }}
          >
            Try Again
          </Button>
        </Box>
      </Backdrop>
    );
  }

  return (
    <Backdrop
      sx={{
        color: "#fff",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: "column",
        gap: 2,
      }}
      open
    >
      <CircularProgress color="inherit" />
      <Typography>
        Signing out from {isUsingFirebase() ? 'Firebase' : 'local'} auth...
      </Typography>
    </Backdrop>
  );
};

export default Signout;