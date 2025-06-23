import { useState, useCallback, useEffect, useRef } from 'react';
import { useGame } from '@strix/gameContext';

// Safe localStorage wrapper
const safeLocalStorage = {
  get: (key, defaultValue = null) => {
    try {
      const value = localStorage.getItem(key);
      return value !== null && value !== 'null' ? value : defaultValue;
    } catch (error) {
      console.warn(`Failed to get ${key} from localStorage:`, error);
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set ${key} in localStorage:`, error);
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
      return false;
    }
  }
};

export const useNavbarSelection = (overviewData) => {
  const { game, setGame, isInitialized, hasCachedGame, restoreCachedGame } = useGame();
  const { publishers, studios, getStudioGames } = overviewData;

  // Local state for navbar selections (publisher and studio only)
  const [selectedPublisher, setSelectedPublisherState] = useState(null);
  const [selectedStudio, setSelectedStudioState] = useState(null);
  
  // Track initialization state
  const isFirstMount = useRef(true);
  const hasAutoSelectedGame = useRef(false);
  const lastGameCount = useRef(0);
  const lastPublisherCount = useRef(0);

  // Get studios filtered by selected publisher
  const getStudiosForPublisher = useCallback((publisherId) => {
    if (!publisherId || !studios.length) return [];
    return studios.filter(studio => studio.publisherID === publisherId);
  }, [studios]);

  // Validate cached publisher exists in current publishers list
  const validateAndRestoreCachedPublisher = useCallback((publishersList) => {
    const cachedPublisher = safeLocalStorage.get('selectedPublisher');
    if (!cachedPublisher || !publishersList.length) {
      return publishersList[0] || null;
    }

    try {
      const parsed = JSON.parse(cachedPublisher);
      const validPublisher = publishersList.find(p => p.publisherID === parsed.publisherID);
      
      if (validPublisher) {
        console.debug('Restored cached publisher:', validPublisher);
        return validPublisher;
      } else {
        console.debug('Cached publisher no longer exists, clearing cache');
        safeLocalStorage.remove('selectedPublisher');
        return publishersList[0] || null;
      }
    } catch (error) {
      console.warn('Error parsing cached publisher:', error);
      safeLocalStorage.remove('selectedPublisher');
      return publishersList[0] || null;
    }
  }, []);

  // Validate cached studio exists in current studios list for the selected publisher
  const validateAndRestoreCachedStudio = useCallback((publisherId) => {
    if (!publisherId) return null;
    
    const cachedStudio = safeLocalStorage.get('selectedStudio');
    const publisherStudios = getStudiosForPublisher(publisherId);
    
    if (!cachedStudio || !publisherStudios.length) {
      return publisherStudios[0] || null;
    }

    try {
      const parsed = JSON.parse(cachedStudio);
      // Check if the cached studio belongs to the current publisher
      const validStudio = publisherStudios.find(s => s.studioID === parsed.studioID);
      
      if (validStudio) {
        console.debug('Restored cached studio for publisher:', validStudio);
        return validStudio;
      } else {
        console.debug('Cached studio does not belong to current publisher, selecting first available');
        return publisherStudios[0] || null;
      }
    } catch (error) {
      console.warn('Error parsing cached studio:', error);
      return publisherStudios[0] || null;
    }
  }, [getStudiosForPublisher]);

  // Enhanced setters with localStorage persistence
  const setSelectedPublisher = useCallback((publisher) => {
    console.debug('Setting publisher:', publisher);
    setSelectedPublisherState(publisher);
    if (publisher) {
      safeLocalStorage.set('selectedPublisher', JSON.stringify(publisher));
    } else {
      safeLocalStorage.remove('selectedPublisher');
    }
  }, []);

  const setSelectedStudio = useCallback((studio) => {
    console.debug('Setting studio:', studio);
    setSelectedStudioState(studio);
    if (studio) {
      safeLocalStorage.set('selectedStudio', JSON.stringify(studio));
    } else {
      safeLocalStorage.remove('selectedStudio');
    }
  }, []);

  // Game selection - delegate entirely to GameContext
  const setSelectedGame = useCallback((selectedGame) => {
    console.debug('Setting game:', selectedGame);
    setGame(selectedGame);
    if (selectedGame) {
      hasAutoSelectedGame.current = true;
    }
  }, [setGame]);

  // Function to reset auto-selection (useful when games are added)
  const resetAutoSelection = useCallback(() => {
    console.debug('Resetting auto-selection');
    hasAutoSelectedGame.current = false;
  }, []);

  // Auto-restore publisher when publishers list changes
  useEffect(() => {
    if (publishers.length > 0 && !selectedPublisher) {
      console.debug('Auto-selecting publisher from:', publishers.length, 'publishers');
      const publisherToSelect = validateAndRestoreCachedPublisher(publishers);
      if (publisherToSelect) {
        setSelectedPublisher(publisherToSelect);
      }
    }
    lastPublisherCount.current = publishers.length;
  }, [publishers, selectedPublisher, , ]);

  // Auto-restore or select studio when publisher changes or studios list changes
  useEffect(() => {
    if (selectedPublisher && studios.length > 0) {
      const publisherStudios = getStudiosForPublisher(selectedPublisher.publisherID);
      
      // If we don't have a studio selected, or the current studio doesn't belong to the current publisher
      if (!selectedStudio || selectedStudio.publisherID !== selectedPublisher.publisherID) {
        console.debug('Auto-selecting studio for publisher:', selectedPublisher.publisherName, 'from', publisherStudios.length, 'studios');
        const studioToSelect = validateAndRestoreCachedStudio(selectedPublisher.publisherID);
        if (studioToSelect) {
          setSelectedStudio(studioToSelect);
        }
      }
    } else if (!selectedPublisher && selectedStudio) {
      // Clear studio if no publisher is selected
      console.debug('Clearing studio because no publisher selected');
      setSelectedStudio(null);
    }
  }, [selectedPublisher, studios, selectedStudio, getStudiosForPublisher, validateAndRestoreCachedStudio, setSelectedStudio]);

  // Debug effect to track publisher/studio changes
  useEffect(() => {
    console.debug('NavbarSelection state changed:', {
      publisher: selectedPublisher?.publisherName,
      studio: selectedStudio?.studioName,
      game: game?.gameName,
      studiosCount: studios.length,
      publishersCount: publishers.length
    });
  }, [selectedPublisher, selectedStudio, game, studios.length, publishers.length]);

  // Track game count changes to reset auto-selection when games are added
  useEffect(() => {
  if (!selectedStudio) return;
  
  const currentGames = getStudioGames ? getStudioGames(selectedStudio.studioID) : [];
  const currentGameCount = currentGames.length;
  
  // If game count increased, reset auto-selection to allow selecting new games
  if (lastGameCount.current > 0 && currentGameCount > lastGameCount.current) {
    console.debug('Game count increased from', lastGameCount.current, 'to', currentGameCount, '- resetting auto-selection');
    hasAutoSelectedGame.current = false;
    
    // If we have a game selected but it's new (not in the previous count),
    // make sure we mark it as auto-selected to prevent further auto-selection
    if (game) {
      setTimeout(() => {
        hasAutoSelectedGame.current = true;
      }, 100);
    }
  }
  
  lastGameCount.current = currentGameCount;
}, [selectedStudio, game]);

  // Handle game auto-selection or cache restoration
  useEffect(() => {
  // Wait for GameContext to be initialized
  if (!isInitialized) return;
  
  // Need a studio to select games
  if (!selectedStudio) return;
  
  const currentGames = getStudioGames ? getStudioGames(selectedStudio.studioID) : [];
  
  // If there's already a game, check if it belongs to current studio
  if (game) {
    const gameStillExists = currentGames.some(g => g.gameID === game.gameID);
    if (gameStillExists) {
      console.debug('Current game is valid for selected studio');
      hasAutoSelectedGame.current = true;
      return;
    } else {
      console.debug('Current game does not belong to selected studio, clearing');
      setGame(null);
      hasAutoSelectedGame.current = false;
    }
  }
  
  // Handle auto-selection only if we haven't already auto-selected
  if (!hasAutoSelectedGame.current) {
    if (!game && hasCachedGame()) {
      console.debug('Restoring cached game');
      restoreCachedGame();
      hasAutoSelectedGame.current = true;
      return;
    }
    
    // If we have games but no selection, select the first one
    if (currentGames.length > 0 && !game) {
      console.debug('Auto-selecting first game:', currentGames[0].gameName);
      setGame(currentGames[0]);
      hasAutoSelectedGame.current = true;
    }
  }
}, [selectedStudio, game, isInitialized]);

  // Clear downstream selections when parent changes - but NOT on first mount
  useEffect(() => {
    // Don't clear game on initial mount to preserve cache
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    
    if (!selectedStudio) {
      console.debug('Clearing game because no studio selected');
      setGame(null);
      hasAutoSelectedGame.current = false;
    }
  }, [selectedStudio, setGame]);

  // Clear studio and game when publisher changes (except on first mount)
  useEffect(() => {
    if (isFirstMount.current) return;
    
    // Reset auto-selection when publisher changes
    hasAutoSelectedGame.current = false;
  }, [selectedPublisher]);

  return {
    selectedPublisher,
    selectedStudio,
    selectedGame: game,
    setSelectedPublisher,
    setSelectedStudio,
    setSelectedGame,
    resetAutoSelection,
  };
};