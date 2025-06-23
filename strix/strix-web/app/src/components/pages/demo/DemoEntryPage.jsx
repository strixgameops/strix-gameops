import React, { useEffect, useCallback, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Backdrop,
  CircularProgress,
  Typography,
  Alert,
  Box,
} from "@mui/material";
import { getAuthInstance, signInWithCustomToken, isUsingFirebase } from "../../firebase/firebase.jsx";
import { useUser } from "@strix/userContext";
import { useGame } from "@strix/gameContext";
import useApi from "@strix/hooks/useApi";

const DemoEntryPage = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuthInstance();
  const { signOut } = useUser();
  const { setBranch, setGame } = useGame();
  const { buildDemo, signout, loading } = useApi();

  const cleanupUserSession = useCallback(async () => {
    await signOut();
    setBranch(null);
    setGame(null);

    // Clean URL parameters
    const params = new URLSearchParams(location.search);
    params.delete("game");
    params.delete("branch");
    const newPath = `${window.location.pathname}?${params.toString()}`;
    navigate(newPath, { replace: true });
  }, [signOut, setBranch, setGame, location.search, navigate]);

  const signOutCurrentUser = useCallback(async () => {
    if (!auth.currentUser) {
      console.log("Already signed out");
      return;
    }

    try {
      const idToken = await auth.currentUser.getIdToken(true);
      await signout({ showErrorAlert: false }, { token: idToken });
      await auth.signOut();
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Error during sign out:", error);
      // Force sign out even if API call fails
      await auth.signOut();
    } finally {
      await signOut();
    }
  }, [auth, signout, signOut]);

  const initializeDemo = useCallback(async () => {
    try {
      await cleanupUserSession();
      await signOutCurrentUser();

      const response = await buildDemo({ showErrorAlert: false });

      if (!response?.success || !response?.token) {
        throw new Error(response?.message || "Failed to build demo");
      }

      await signInWithCustomToken(auth, response.token);
      navigate("/overview", { replace: true });
    } catch (error) {
      console.error("Demo initialization failed:", error);
      // Redirect to login or show error page
      navigate("/login", { replace: true });
    }
  }, [cleanupUserSession, signOutCurrentUser, buildDemo, auth, navigate]);

  useEffect(() => {
    initializeDemo();
  }, []);

  return (
    <Backdrop
      open
      sx={{
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
        bgcolor: "rgba(0, 0, 0, 0.8)",
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <Typography
          variant="h4"
          sx={(theme) => ({
            color: theme.palette.mode === "light" ? "#e7e7e7" : "#cbcbcb",
            mb: 2,
          })}
        >
          Preparing Demo...
        </Typography>

        <Typography
          variant="body1"
          sx={(theme) => ({
            color: theme.palette.mode === "light" ? "#e7e7e7" : "#cbcbcb",
            opacity: 0.8,
          })}
        >
          Setting up your demo environment
        </Typography>
      </Box>

      <CircularProgress
        size={60}
        thickness={4}
        sx={{
          color: "#e7e7e7",
        }}
      />
    </Backdrop>
  );
});

DemoEntryPage.displayName = "DemoEntryPage";

export default DemoEntryPage;
