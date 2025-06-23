import React, { useRef, useEffect, useCallback, memo } from "react";
import s from "./strixUpperbar.module.css";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import { useUser } from "@strix/userContext";
import useApi from "@strix/api";
import { useGame } from "@strix/gameContext";
import { useLocation } from "react-router-dom";
import TutorialModal from "../tutorial/TutorialModal.jsx";
import DocumentationButton from "../tutorial/DocumentationButton.jsx";

const COLLAB_UPDATE_INTERVAL = 10000;

const CollabUsers = memo(({ users = [] }) => {
  if (!users.length) return null;

  return (
    <>
      {users.map((lock) => (
        <Tooltip
          key={lock.id || lock.username}
          title={lock.username}
          disableInteractive
        >
          <Button
            sx={{
              minWidth: "30px",
              width: "30px",
              height: "30px",
              textTransform: "none",
            }}
          >
            <Avatar
              sx={(theme) => ({
                width: 30,
                height: 30,
                color: theme.palette.text.primary,
              })}
              src={lock?.avatar || "/broken-image.jpg"}
            />
          </Button>
        </Tooltip>
      ))}
    </>
  );
});

CollabUsers.displayName = "CollabUsers";

const StrixUpperbar = () => {
  const { userState, userProfile } = useUser();
  const { updateCollabUserState, getCurrentCollabUsers } = useApi();
  const { game, branch, setActivePageCollabLocks, activePageLocks } = useGame();
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);
  const intervalsRef = useRef({ status: null, users: null });
  const isUpdatingRef = useRef({ status: false, users: false });

  const updateUserStatus = useCallback(async () => {
    if (!game?.gameID || !branch || isUpdatingRef.current.status) return;

    isUpdatingRef.current.status = true;
    try {
      await updateCollabUserState({
        gameID: game.gameID,
        branch: branch,
        pageLink: window.location.pathname,
        state: "active",
      });
    } catch (error) {
      console.error("Failed to update user status:", error);
    } finally {
      isUpdatingRef.current.status = false;
    }
  }, [game?.gameID, branch, updateCollabUserState]);

  const fetchCollabUsers = useCallback(async () => {
    if (!game?.gameID || !branch || isUpdatingRef.current.users) return;

    isUpdatingRef.current.users = true;
    try {
      const resp = await getCurrentCollabUsers({
        gameID: game.gameID,
        branch: branch,
        pageLink: window.location.pathname,
      });

      if (resp.success && resp.users.length > 1) {
        setActivePageCollabLocks((prevLocks) => {
          const prevJSON = JSON.stringify(prevLocks);
          const nextJSON = JSON.stringify(resp.users);
          return prevJSON === nextJSON ? prevLocks : resp.users;
        });
      }
    } catch (error) {
      console.error("Failed to fetch collab users:", error);
    } finally {
      isUpdatingRef.current.users = false;
    }
  }, [game?.gameID, branch, getCurrentCollabUsers, setActivePageCollabLocks]);

  const handlePathChange = useCallback(async () => {
    if (!game?.gameID || !branch) return;

    const prevPathname = prevPathnameRef.current;
    if (prevPathname !== location.pathname) {
      try {
        await updateCollabUserState({
          gameID: game.gameID,
          branch: branch,
          pageLink: prevPathname,
          state: "dead",
        });
      } catch (error) {
        console.error("Failed to update dead state:", error);
      }
    }
    prevPathnameRef.current = location.pathname;
  }, [game?.gameID, branch, location.pathname, updateCollabUserState]);

  useEffect(() => {
    if (!game?.gameID || !branch) {
      // Clear intervals if no game/branch
      if (intervalsRef.current.status) {
        clearInterval(intervalsRef.current.status);
        intervalsRef.current.status = null;
      }
      if (intervalsRef.current.users) {
        clearInterval(intervalsRef.current.users);
        intervalsRef.current.users = null;
      }
      return;
    }

    // Handle path change
    handlePathChange();

    if (window.__env.edition !== "community") {
      // Set up intervals
      intervalsRef.current.status = setInterval(
        updateUserStatus,
        COLLAB_UPDATE_INTERVAL
      );
      intervalsRef.current.users = setInterval(
        fetchCollabUsers,
        COLLAB_UPDATE_INTERVAL
      );

      // Initial calls
      updateUserStatus();
      fetchCollabUsers();
    }

    return () => {
      if (intervalsRef?.current?.status) {
        clearInterval(intervalsRef.current.status);
        intervalsRef.current.status = null;
      }
      if (intervalsRef?.current?.users) {
        clearInterval(intervalsRef.current.users);
        intervalsRef.current.users = null;
      }
    };
  }, [game?.gameID, branch]);

  return (
    <div className={s.upperbar}>
      <div className={s.collabUsers}>
        <CollabUsers users={activePageLocks} />
      </div>
      <DocumentationButton />
      <TutorialModal />
    </div>
  );
};

export default StrixUpperbar;
