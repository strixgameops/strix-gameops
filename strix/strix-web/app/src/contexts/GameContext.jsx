import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import useApi from "../hooks/useApi";

const GameContext = createContext();

const DEMO_GAME_ID = "brawlDemo";
const BRANCH_SUFFIX = "_working";
const DEFAULT_BRANCH = `1.0.0.0${BRANCH_SUFFIX}`;
const DEFAULT_ENVIRONMENT = "development";

const getStorageKey = (gameId, type) => `${type}_${gameId}`;

const safeLocalStorage = {
  get: (key, defaultValue = null) => {
    try {
      const value = localStorage.getItem(key);
      return value !== null && value !== "null" ? value : defaultValue;
    } catch (error) {
      console.warn(`Failed to get ${key} from localStorage:`, error);
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
      console.debug(`Saved to localStorage: ${key}`, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set ${key} in localStorage:`, error);
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      console.debug(`Removed from localStorage: ${key}`);
      return true;
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
      return false;
    }
  },
};

export const GameProvider = ({ children }) => {
  const { getLatestDeployedBranches, getGameDetails } = useApi();
  const isInitializedRef = useRef(false);
  const isLoadingCachedGameRef = useRef(false);

  // Initialize with no game selected
  const [game, setGameState] = useState(null);
  const [branch, setBranchState] = useState(DEFAULT_BRANCH);
  const [environment, setEnvironmentState] = useState(DEFAULT_ENVIRONMENT);
  const [isInitialized, setIsInitialized] = useState(false);

  // Other state
  const [activePageLocks, setActivePageLocks] = useState([]);
  const [entitiesCache, setEntitiesCache] = useState({});
  const [entityIconCache, setEntityIconCache] = useState({});

  // Get first available branch for a game
  const getFirstAvailableBranch = useCallback(
    async (gameId) => {
      if (!gameId) return DEFAULT_BRANCH;

      try {
        const result = await getLatestDeployedBranches(
          { showErrorAlert: false },
          { gameID: gameId, limit: 1 }
        );

        if (result.success && result.result?.length > 0) {
          const firstBranch = result.result[0].branch + BRANCH_SUFFIX;
          return firstBranch;
        }
      } catch (error) {
        console.warn("Failed to fetch first available branch:", error);
      }

      return DEFAULT_BRANCH;
    },
    [getLatestDeployedBranches]
  );

  // Load game-specific settings from cache or defaults
  const loadGameSettings = useCallback(
    async (gameToLoad) => {
      if (!gameToLoad?.gameID) return;

      const storedBranch = safeLocalStorage.get(
        getStorageKey(gameToLoad.gameID, "branch")
      );
      const storedEnv = safeLocalStorage.get(
        getStorageKey(gameToLoad.gameID, "env")
      );

      // Set branch: use cached value or fetch first available
      if (storedBranch) {
        setBranchState(storedBranch);
      } else {
        const firstBranch = await getFirstAvailableBranch(gameToLoad.gameID);
        setBranchState(firstBranch);
      }

      // Set environment: use cached value or default
      if (storedEnv) {
        setEnvironmentState(storedEnv);
      } else {
        if (gameToLoad.gameID.startsWith(DEMO_GAME_ID)) {
          setEnvironmentState("production");
        } else {
          setEnvironmentState(DEFAULT_ENVIRONMENT);
        }
      }
    },
    [getFirstAvailableBranch]
  );

  // Initialize and load cached game on mount
  useEffect(() => {
    if (isInitializedRef.current) return;

    const initializeGame = async () => {
      console.debug("Initializing GameContext...");
      isLoadingCachedGameRef.current = true;

      const stored = JSON.parse(safeLocalStorage.get("selectedGame"));
      console.debug("Cached game from localStorage:", stored);

      if (stored) {
        try {
          const cachedGame = JSON.parse(stored);
          if (cachedGame?.gameID) {
            console.debug("Validating cached game:", cachedGame);

            // Validate game exists via API
            const result = await getGameDetails(
              { showErrorAlert: false },
              { gameID: cachedGame.gameID }
            );

            if (result.success) {
              console.debug("Cached game validated, restoring:", cachedGame);
              setGameState(cachedGame);
              await loadGameSettings(cachedGame);
            } else {
              console.warn("Cached game no longer exists, clearing cache");
              // safeLocalStorage.remove("selectedGame");
              // safeLocalStorage.remove(
              //   getStorageKey(cachedGame.gameID, "branch")
              // );
              // safeLocalStorage.remove(getStorageKey(cachedGame.gameID, "env"));
            }
          }
        } catch (error) {
          console.warn("Error parsing cached game:", error);
          // safeLocalStorage.remove("selectedGame");
        }
      }

      isLoadingCachedGameRef.current = false;
      isInitializedRef.current = true;
      setIsInitialized(true);
      console.debug("GameContext initialization complete");
    };

    initializeGame();
  }, []);

  // Persist branch when it changes
  useEffect(() => {
    if (
      !isInitializedRef.current ||
      !game?.gameID ||
      isLoadingCachedGameRef.current
    )
      return;
    safeLocalStorage.set(getStorageKey(game.gameID, "branch"), branch);
  }, [game?.gameID, branch]);

  // Persist environment when it changes
  useEffect(() => {
    if (
      !isInitializedRef.current ||
      !game?.gameID ||
      isLoadingCachedGameRef.current
    )
      return;
    safeLocalStorage.set(getStorageKey(game.gameID, "env"), environment);
  }, [game?.gameID, environment]);

  // Clear caches when game changes
  useEffect(() => {
    if (game?.gameID) {
      setEntitiesCache({});
      setEntityIconCache({});
    }
  }, [game?.gameID]);

  const setGame = useCallback(
  async (newGame) => {
    console.debug("Setting new game:", newGame);
    
    // If it's the same game, don't do anything
    if (game?.gameID === newGame?.gameID) {
      console.debug("Same game, skipping update");
      return;
    }
    
    setGameState(newGame);
    
    if (newGame?.gameID) {
      await loadGameSettings(newGame);
      safeLocalStorage.set("selectedGame", JSON.stringify(newGame));
      console.debug("Game set and cached:", newGame.gameName);
    } else {
      // Clear cache when setting null
      safeLocalStorage.remove("selectedGame");
      console.debug("Game cleared");
    }
  },
  [loadGameSettings, game?.gameID] // Add game?.gameID as dependency to detect changes
);

const forceSetGame = useCallback(
  async (newGame) => {
    console.debug("Force setting game:", newGame);
    setGameState(newGame);
    
    if (newGame?.gameID) {
      await loadGameSettings(newGame);
      safeLocalStorage.set("selectedGame", JSON.stringify(newGame));
      console.debug("Game force set and cached:", newGame.gameName);
    }
  },
  [loadGameSettings]
);

  const hasCachedGame = useCallback(() => {
    return JSON.parse(safeLocalStorage.get("selectedGame"))
  }, [safeLocalStorage]);
  const restoreCachedGame = useCallback(() => {
    return setGame(JSON.parse(safeLocalStorage.get("selectedGame")))
  }, [safeLocalStorage]);

  const setBranch = useCallback((newBranch) => {
    if (!newBranch) return;

    const correctedBranch = newBranch.endsWith(BRANCH_SUFFIX)
      ? newBranch
      : newBranch + BRANCH_SUFFIX;

    setBranchState(correctedBranch);
  }, []);

  const setEnvironment = useCallback((newEnv) => {
    if (!newEnv) return;
    setEnvironmentState(newEnv);
  }, []);

  const setActivePageCollabLocks = useCallback((newLocksArray) => {
    setActivePageLocks(Array.isArray(newLocksArray) ? newLocksArray : []);
  }, []);

  // Cache management
  const updateEntitiesCache = useCallback((key, data) => {
    setEntitiesCache((prev) => ({ ...prev, [key]: data }));
  }, []);

  const updateEntityIconCache = useCallback((key, data) => {
    setEntityIconCache((prev) => ({ ...prev, [key]: data }));
  }, []);

  const clearCaches = useCallback(() => {
    setEntitiesCache({});
    setEntityIconCache({});
  }, []);

  const value = {
    // Core state
    game,
    branch,
    environment,
    isInitialized,

    // Actions
    setGame,
    forceSetGame,
    setBranch,
    setEnvironment,
    fetchBranch: getFirstAvailableBranch,

    // Collaboration
    activePageLocks,
    setActivePageCollabLocks,

    // Cache management
    entitiesCache,
    entityIconCache,
    updateEntitiesCache,
    updateEntityIconCache,
    clearCaches,
    hasCachedGame,
    restoreCachedGame,

    // Backward compatibility
    getEntitiesByNodeIDs_cache: entitiesCache,
    setGetEntitiesByNodeIDs_cache: setEntitiesCache,
    getEntityIcon_cache: entityIconCache,
    setGetEntityIcon_cache: setEntityIconCache,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }

  return context;
};

// Aliases for backward compatibility
export const useBranch = useGame;
export const useRelationContent = useGame;
export const useNodeContentDescription = useGame;
export const useNodeContentTechDescription = useGame;
