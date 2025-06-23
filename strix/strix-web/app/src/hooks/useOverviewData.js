import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@strix/userContext';
import useApi from '@strix/api';

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

export const useOverviewData = () => {
  const { userState } = useUser();
  const {
    getPublishers,
    getPublisherStudios,
    getStudioGames,
    getOverviewStatistics,
    getOverviewStatisticsForPublisher,
  } = useApi();

  // Core state - for overview page specific selections (separate from navbar)
  const [viewMode, setViewMode] = useState(window.__env.edition !== "community" ? "publisher" : "studio");
  const [selectedPublisher, setSelectedPublisherState] = useState(null);
  const [selectedStudio, setSelectedStudioState] = useState(null);

  // Data state - shared data that other components can use
  const [publishers, setPublishers] = useState([]);
  const [studios, setStudios] = useState([]);
  const [games, setGames] = useState([]);

  // Loading states
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [isFetchingAnalytics, setIsFetchingAnalytics] = useState(false);

  // Analytics data
  const [publisherStatsData, setPublisherStatsData] = useState([]);
  const [studioStatsData, setStudioStatsData] = useState([]);
  const [fullStatsData, setFullStatsData] = useState(null);
  const [fullStatsDataPublisher, setFullStatsDataPublisher] = useState([]);

  // Error state
  const [error, setError] = useState(null);

  // Prevent duplicate API calls using Set for better performance
  const activeRequestsRef = useRef(new Set());
  const mountedRef = useRef(true);
  const initializationRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeRequestsRef.current.clear();
    };
  }, []);

  const safeSetState = useCallback((setter, value) => {
    if (mountedRef.current) {
      setter(value);
    }
  }, []);

  const handleError = useCallback((error, context) => {
    console.error(`Error in ${context}:`, error);
    safeSetState(setError, { message: error.message, context });
  }, [safeSetState]);

  const clearError = useCallback(() => {
    safeSetState(setError, null);
  }, [safeSetState]);

  const getStudioGamesList = useCallback((studioID) => {
    return games.find(game => game.studioID === studioID)?.games || [];
  }, [games]);

  // Overview-specific setters with localStorage persistence (using overview_ prefix)
  // These are separate from navbar selections
  const setSelectedPublisher = useCallback((publisher) => {
    setSelectedPublisherState(publisher);
    if (publisher) {
      safeLocalStorage.set('overview_selectedPublisher', JSON.stringify(publisher));
    } else {
      safeLocalStorage.remove('overview_selectedPublisher');
    }
  }, []);

  const setSelectedStudio = useCallback((studio) => {
    setSelectedStudioState(studio);
    if (studio) {
      safeLocalStorage.set('overview_selectedStudio', JSON.stringify(studio));
    } else {
      safeLocalStorage.remove('overview_selectedStudio');
    }
  }, []);

  // Validate cached publisher exists in current publishers list
  const validateAndRestoreCachedPublisher = useCallback((publishersList) => {
    const cachedPublisher = safeLocalStorage.get('overview_selectedPublisher');

    if (!cachedPublisher || !publishersList.length) {
      return publishersList[0] || null;
    }

    try {
      const parsed = JSON.parse(cachedPublisher);
      const validPublisher = publishersList.find(p => p.publisherID === parsed.publisherID);
      
      if (validPublisher) {
        return validPublisher;
      } else {
        // Cached publisher no longer exists, remove from cache
        safeLocalStorage.remove('overview_selectedPublisher');
        return publishersList[0] || null;
      }
    } catch (error) {
      console.warn('Error parsing cached publisher:', error);
      safeLocalStorage.remove('overview_selectedPublisher');
      return publishersList[0] || null;
    }
  }, []);

  // Validate cached studio exists in current studios list  
  const validateAndRestoreCachedStudio = useCallback((studiosList) => {
    const cachedStudio = safeLocalStorage.get('overview_selectedStudio');
    if (!cachedStudio || !studiosList.length) {
      return studiosList[0] || null;
    }

    try {
      const parsed = JSON.parse(cachedStudio);
      const validStudio = studiosList.find(s => s.studioID === parsed.studioID);
      
      if (validStudio) {
        return validStudio;
      } else {
        // Cached studio no longer exists, remove from cache
        safeLocalStorage.remove('overview_selectedStudio');
        return studiosList[0] || null;
      }
    } catch (error) {
      console.warn('Error parsing cached studio:', error);
      safeLocalStorage.remove('overview_selectedStudio');
      return studiosList[0] || null;
    }
  }, []);

  // Fetch publishers
  const fetchPublishers = useCallback(async () => {
    const requestKey = 'publishers';
    if (activeRequestsRef.current.has(requestKey) || !userState?.uid) return;
    
    activeRequestsRef.current.add(requestKey);
    safeSetState(setIsLoadingOrganizations, true);
    safeSetState(setError, null);

    try {
      const response = await getPublishers({ email: userState.uid });
      
      if (!mountedRef.current) return;

      if (response.success && response.publishers && response.publishers.length > 0) {
        console.debug('Fetched publishers:', response.publishers.length);
        safeSetState(setPublishers, response.publishers);
      } else {
        // No publishers found - this will be handled by the onboarding hook
        console.debug('No publishers found');
        safeSetState(setPublishers, []);
      }
    } catch (error) {
      handleError(error, 'fetchPublishers');
      safeSetState(setPublishers, []);
    } finally {
      activeRequestsRef.current.delete(requestKey);
      safeSetState(setIsLoadingOrganizations, false);
    }
  }, [getPublishers, userState?.uid, handleError, safeSetState]);

  // Fetch studios for all publishers
  const fetchStudios = useCallback(async () => {
    const requestKey = 'studios';
    if (activeRequestsRef.current.has(requestKey) || publishers.length === 0) {
      safeSetState(setStudios, []);
      return;
    }

    activeRequestsRef.current.add(requestKey);
    safeSetState(setIsLoadingOrganizations, true);
    safeSetState(setError, null);

    try {
      // Fetch studios for all publishers to support navbar selection
      const allStudiosPromises = publishers.map(publisher =>
        getPublisherStudios({ publisherID: publisher.publisherID })
      );
      
      const allStudiosResponses = await Promise.all(allStudiosPromises);
      
      if (!mountedRef.current) return;

      // Combine all studios from all publishers
      const allStudios = allStudiosResponses.reduce((acc, response) => {
        if (response.success && response.result) {
          return [...acc, ...response.result];
        }
        return acc;
      }, []);

      console.debug('Fetched studios:', allStudios.length);
      safeSetState(setStudios, allStudios);
      
      // Auto-select for overview page only if we have a cached selection
      const cachedPublisher = safeLocalStorage.get('overview_selectedPublisher');

      if (cachedPublisher && !selectedPublisher) {
        const publisherToSelect = validateAndRestoreCachedPublisher(publishers);
        if (publisherToSelect) {
          setSelectedPublisher(publisherToSelect);
          
          // Auto-select studio for overview
          const publisherStudios = allStudios.filter(studio => studio.publisherID === publisherToSelect.publisherID);
          if (publisherStudios.length > 0) {
            const studioToSelect = validateAndRestoreCachedStudio(publisherStudios);
            if (studioToSelect) {
              setSelectedStudio(studioToSelect);
              if (publisherStudios.length === 1) {
                safeSetState(setViewMode, 'studio');
              }
            }
          }
        }
      } else {
        setSelectedPublisher(publishers[0])
      }
    } catch (error) {
      handleError(error, 'fetchStudios');
      safeSetState(setStudios, []);
    } finally {
      activeRequestsRef.current.delete(requestKey);
      safeSetState(setIsLoadingOrganizations, false);
    }
  }, [getPublisherStudios, publishers, handleError, safeSetState, selectedPublisher, validateAndRestoreCachedPublisher, setSelectedPublisher, validateAndRestoreCachedStudio, setSelectedStudio]);

  // Fetch games for all studios
  const fetchGames = useCallback(async () => {
  const requestKey = 'games';
  if (activeRequestsRef.current.has(requestKey) || !studios.length) {
    safeSetState(setGames, []);
    return Promise.resolve(); // Return resolved promise even when not fetching
  }

  activeRequestsRef.current.add(requestKey);
  safeSetState(setIsLoadingGames, true);
  safeSetState(setError, null);

  try {
    const studioIDs = studios.map(studio => studio.studioID);
    console.debug('Fetching games for studios:', studioIDs.length);
    const response = await getStudioGames({ studioIDs });
    
    if (mountedRef.current) {
      console.debug('Fetched games:', response.length);
      safeSetState(setGames, response);
    }
    
    return Promise.resolve(); // Ensure we return a resolved promise
  } catch (error) {
    handleError(error, 'fetchGames');
    safeSetState(setGames, []);
    return Promise.reject(error); // Return rejected promise on error
  } finally {
    activeRequestsRef.current.delete(requestKey);
    safeSetState(setIsLoadingGames, false);
  }
}, [getStudioGames, studios, handleError, safeSetState]);

  // Fetch analytics for studio (overview page only)
  const fetchStudioAnalytics = useCallback(async () => {
    const requestKey = 'studioAnalytics';
    if (activeRequestsRef.current.has(requestKey) || !selectedStudio?.studioID) {
      return;
    }

    const studioGames = getStudioGamesList(selectedStudio.studioID);
    const gameIDs = studioGames.map(game => game.gameID);

    if (!gameIDs.length) return;

    activeRequestsRef.current.add(requestKey);
    safeSetState(setIsFetchingAnalytics, true);
    safeSetState(setError, null);

    try {
      const statsData = await getOverviewStatistics({
        gameIDs,
        studioID: selectedStudio.studioID,
      });

      if (mountedRef.current && statsData.success) {
        safeSetState(setStudioStatsData, statsData.message.games);
        safeSetState(setFullStatsData, statsData);
      }
    } catch (error) {
      handleError(error, 'fetchStudioAnalytics');
    } finally {
      activeRequestsRef.current.delete(requestKey);
      safeSetState(setIsFetchingAnalytics, false);
    }
  }, [getOverviewStatistics, selectedStudio?.studioID, getStudioGamesList, handleError, safeSetState]);

  // Fetch analytics for publisher (overview page only)
  const fetchPublisherAnalytics = useCallback(async () => {
    const requestKey = 'publisherAnalytics';
    if (activeRequestsRef.current.has(requestKey) || !selectedPublisher?.publisherID) {
      return;
    }

    // Get studios for the selected publisher
    const publisherStudios = studios.filter(studio => studio.publisherID === selectedPublisher.publisherID);
    if (!publisherStudios.length) return;

    activeRequestsRef.current.add(requestKey);
    safeSetState(setIsFetchingAnalytics, true);
    safeSetState(setError, null);

    try {
      const studioIDs = publisherStudios.map(studio => studio.studioID);
      const statsData = await getOverviewStatisticsForPublisher({ studioIDs });

      if (mountedRef.current && statsData.success) {
        safeSetState(setPublisherStatsData, statsData.data.studios);
        safeSetState(setFullStatsDataPublisher, statsData);
      }
    } catch (error) {
      handleError(error, 'fetchPublisherAnalytics');
    } finally {
      activeRequestsRef.current.delete(requestKey);
      safeSetState(setIsFetchingAnalytics, false);
    }
  }, [getOverviewStatisticsForPublisher, selectedPublisher?.publisherID, studios, handleError, safeSetState]);

  // Navigation helpers (for overview page)
  const openStudio = useCallback((studioID) => {
    const studio = studios.find(s => s.studioID === studioID);
    if (studio) {
      setSelectedStudio(studio);
      safeSetState(setViewMode, 'studio');
    }
  }, [studios, safeSetState, setSelectedStudio]);

  const openPublisher = useCallback(() => {
    safeSetState(setViewMode, 'publisher');
  }, [safeSetState]);

  // Initialize only once
  useEffect(() => {
    if (initializationRef.current || !userState?.uid) return;
    
    initializationRef.current = true;
    console.debug('Initializing useOverviewData');
    fetchPublishers();
  }, [userState?.uid]);

  // Fetch studios when publishers are loaded
  useEffect(() => {
    if (publishers.length > 0 && initializationRef.current) {
      fetchStudios();
    }
  }, [publishers.length]);

  // Fetch games when studios change
  useEffect(() => {
    if (studios.length > 0) {
      fetchGames();
    }
  }, [studios.length]);

  // Analytics effects (for overview page only)
  useEffect(() => {
    if (viewMode === 'studio' && selectedStudio?.studioID && games.length > 0) {
      fetchStudioAnalytics();
    }
  }, [viewMode, selectedStudio?.studioID, games.length,]);

  useEffect(() => {
    if (viewMode === 'publisher' && selectedPublisher?.publisherID && studios.length > 0) {
      fetchPublisherAnalytics();
    }
  }, [viewMode, selectedPublisher?.publisherID, studios.length]);

  return {
    // State (overview page specific)
    viewMode,
    selectedPublisher,
    selectedStudio,
    
    // Shared data (for navbar and other components)
    publishers,
    studios,
    games,
    
    // Loading states
    isLoadingOrganizations,
    isLoadingGames,
    isFetchingAnalytics,
    
    // Analytics data (overview specific)
    publisherStatsData,
    studioStatsData,
    fullStatsData,
    fullStatsDataPublisher,
    
    // Error handling
    error,
    clearError,
    
    // Actions - for overview page only
    setSelectedPublisher,
    setSelectedStudio,
    openStudio,
    openPublisher,
    getStudioGames: getStudioGamesList,
    
    // Refresh functions
    refetchGames: fetchGames,
    refetchStudios: fetchStudios,
  };
};