import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Typography,
  Button,
  Tooltip,
  Modal,
  FormControl,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Paper,
  Box,
  Collapse,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  KeyboardBackspace as GetBackIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Analytics as AnalyticsIcon,
  AttachMoney as RevenueIcon,
  People as UsersIcon,
  TrendingUp as RetentionIcon,
  Timeline as ChartIcon,
  TableChart as TableIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { Helmet } from "react-helmet";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import uuid from "react-uuid";

// Components
import Navbar from "../navbar/Navbar";
import WorldMap from "./analytics/WorldMap";
import CountryPopover from "./analytics/CountryPopover";
import GameStudioSelector from "./analytics/GameStudioSelector";
import ChartWidget from "./shared/ChartWidget";
import AddGameModal from "./AddGameForm";
import AddStudioModal from "./AddStudioForm";
import InitialSetup from "../onboarding/InitialSetup";

// Hooks and Context
import { useGame } from "@strix/gameContext";
import { useOverviewData } from "@strix/hooks/useOverviewData";
import { useOnboardingStatus } from "@strix/hooks/useOnboardingStatus";
import useApi from "@strix/api";

// Styles and Utils
import "./css/overview.css";
import analyticsStyles from "./css/analyticsPanel.module.css";
import titles from "titles";

dayjs.extend(utc);

// Chart configurations for different metrics
const getChartConfigsForMetric = (metric) => {
  const baseConfigs = {
    installs: [
      {
        chartID: "1",
        name: "New Installs",
        metricName: "newInstalls",
        format: "",
        formatPosition: "start",
        showDelta: true,
        icon: UsersIcon,
      },
      {
        chartID: "2",
        name: "Active Users",
        metricName: "dau",
        format: "",
        formatPosition: "start",
        showDelta: true,
        icon: UsersIcon,
      },
    ],
    revenue: [
      {
        chartID: "1",
        name: "Gross Revenue",
        metricName: "revenue",
        format: "$",
        formatPosition: "start",
        showDelta: true,
        icon: RevenueIcon,
      },
      {
        chartID: "2",
        name: "ARPPU",
        metricName: "arppu",
        format: "$",
        formatPosition: "start",
        showDelta: true,
        icon: RevenueIcon,
      },
      {
        chartID: "3",
        name: "Revenue/DAU (ARPU)",
        metricName: "revenueDau",
        format: "$",
        formatPosition: "start",
        showDelta: false,
        icon: AnalyticsIcon,
      },
    ],
    retention: [
      {
        chartID: "1",
        name: "Retention (Last 30 Days)",
        metricName: "retention",
        format: "",
        formatPosition: "start",
        showDelta: true,
        icon: RetentionIcon,
      },
      {
        chartID: "2",
        name: "Retention (Previous 30 Days)",
        metricName: "retentionPrevious",
        format: "",
        formatPosition: "start",
        showDelta: true,
        icon: RetentionIcon,
      },
    ],
  };

  return baseConfigs[metric] || baseConfigs.revenue;
};

// Memoized WorldMap component wrapper
const MemoizedWorldMap = React.memo(WorldMap);

const Overview = () => {
  const { game, setGame } = useGame();
  const overviewData = useOverviewData();
  const { isOnboarding, isCheckingOnboarding, markOnboardingComplete } = useOnboardingStatus();
  const { 
    getOverviewStatistics, 
    getOverviewStatisticsForPublisher,
    getDAU,
    getRevenue,
    getARPU,
    getARPPU,
    getNewUsers,
    getCombinedMetricsByCountry,
    getCumulativeARPU,
    getRetention // Add retention API method
  } = useApi();

  const {
    selectedPublisher,
    selectedStudio,
    publishers,
    studios,
    games,
    isLoadingOrganizations,
    isLoadingGames,
    error,
    clearError,
    setSelectedPublisher,
    setSelectedStudio,
    getStudioGames,
    refetchGames,
    refetchStudios,
  } = overviewData;

  // Navigation and view state
  const [navigationMode, setNavigationMode] = useState(window.__env.edition !== "community" ? "publisher" : "studio");
  const [selectedGamesForAnalytics, setSelectedGamesForAnalytics] = useState([]);
  const [selectedStudiosForAnalytics, setSelectedStudiosForAnalytics] = useState([]);
  const [currentMetric, setCurrentMetric] = useState("revenue");
  const [dashboardSettings, setDashboardSettings] = useState({
    charts: getChartConfigsForMetric("revenue"),
  });
  const [fullStatsData, setFullStatsData] = useState(null);
  const [fullStatsDataPublisher, setFullStatsDataPublisher] = useState(null);
  const [viewMode, setViewMode] = useState("charts");
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Add state for retention table switching
  const [selectedRetentionPeriod, setSelectedRetentionPeriod] = useState("retention");

  // PERSISTENT DATA STORAGE - Store API data separately from charts
  const [persistentAnalyticsData, setPersistentAnalyticsData] = useState({
    dau: [],
    revenue: [],
    arppu: [],
    newInstalls: [],
    revenueDau: [],
    installs: [],
    installRate: [],
    retention: [], // Add retention data
    retentionPrevious: [] // Add previous retention data
  });

  // Loading states for each metric
  const [isLoading_DAU, setIsLoading_DAU] = useState(false);
  const [isLoading_Revenue, setIsLoading_Revenue] = useState(false);
  const [isLoading_ARPPU, setIsLoading_ARPPU] = useState(false);
  const [isLoading_NewUsers, setIsLoading_NewUsers] = useState(false);
  const [isLoading_CombinedMetricsByCountry, setIsLoading_CombinedMetricsByCountry] = useState(false);
  const [isLoading_Retention, setIsLoading_Retention] = useState(false); // Add retention loading state
  const [isLoading_RetentionPrevious, setIsLoading_RetentionPrevious] = useState(false); // Add previous retention loading state

  // Country data state - only real API data
  const [countryData, setCountryData] = useState({
  installs: {},
  revenue: {},
  retention: {
    d1: {},
    d3: {},
    d7: {},
    d30: {}
  }
  });

  // Modal states
  const [gameModalOpen, setGameModalOpen] = useState(false);
  const [studioModalOpen, setStudioModalOpen] = useState(false);
  const [isSettingsModal, setIsSettingsModal] = useState(false);
  const [settingsModalId, setSettingsModalId] = useState("");
  const [modalSecretKey, setModalSecretKey] = useState("");

  // Map states
  const [countryPopover, setCountryPopover] = useState({
    open: false,
    countryName: "",
    anchorPosition: null,
  });

  const defaultDate = useMemo(() => [dayjs.utc(), dayjs.utc()], []);
  const isFetchingData = useRef(false);

  // Helper function to determine if we should use gameIDs array
  const shouldUseGameIDs = useCallback(() => {
    return selectedGamesForAnalytics.length > 1;
  }, [selectedGamesForAnalytics]);

  // Helper function to get gameIDs array
  const getGameIDs = useCallback(() => {
    if (shouldUseGameIDs()) {
      return selectedGamesForAnalytics.map(game => game.gameID);
    }
    return null; // Return null for single game to maintain backward compatibility
  }, [selectedGamesForAnalytics, shouldUseGameIDs]);

  // Function to get data from persistent storage only (no fallbacks)
  const getDataForMetric = useCallback((metricName) => {
    const storedData = persistentAnalyticsData[metricName];
    if (storedData && storedData.length > 0) {
      return { data: storedData };
    }
    
    // Return empty data if no API data available
    return { data: [] };
  }, [persistentAnalyticsData]);

  // Get loading state for metric
  const getLoadingStateForMetric = useCallback((metricName) => {
    switch (metricName) {
      case "dau":
        return isLoading_DAU;
      case "revenue":
        return isLoading_Revenue;
      case "arppu":
        return isLoading_ARPPU;
      case "newInstalls":
        return isLoading_NewUsers;
      case "revenueDau":
        return isLoading_DAU || isLoading_Revenue; // Both needed for calculation
      case "retention": // Add retention loading state
        return isLoading_Retention;
      case "retentionPrevious": // Add previous retention loading state
        return isLoading_RetentionPrevious;
      default:
        return false;
    }
  }, [isLoading_DAU, isLoading_Revenue, isLoading_ARPPU, isLoading_NewUsers, isLoading_Retention, isLoading_RetentionPrevious]);

  // Updated API fetch functions with multiple games support
  async function fetchDAU() {
    if (!selectedGamesForAnalytics.length) return;
    
    let response;
    let isError;
    setIsLoading_DAU(true);
    
    const gameID = selectedGamesForAnalytics[0]?.gameID;
    const branch = selectedGamesForAnalytics[0]?.branch || 'main';
    const gameIDs = getGameIDs(); // Get gameIDs array if multiple games selected
    
    try {
      response = await getDAU({
        gameID: gameID,
        branch: branch,
        includeBranchInAnalytics: false,
        includeEnvironmentInAnalytics: false,
        filterDate: [
          dayjs.utc().subtract(30, 'days').toISOString(),
          dayjs.utc().toISOString(),
        ],
        environment: 'production',
        filterSegments: [],
        gameIDs: gameIDs, // Pass gameIDs array for multiple games
      });
      
      isError = !response.success;
      if (!isError && response.message) {
        const processedData = response.message.map(item => ({
          timestamp: item.timestamp,
          value: parseFloat(item.value) || 0
        }));
        
        setPersistentAnalyticsData(prev => ({
          ...prev,
          dau: processedData
        }));
        
        console.log('DAU data processed:', processedData.length, 'items');
      }
    } catch (error) {
      console.error('Error fetching DAU:', error);
    }
    
    setIsLoading_DAU(false);
  }

  async function fetchRevenue() {
    if (!selectedGamesForAnalytics.length) return;
    
    let response;
    let isError;
    setIsLoading_Revenue(true);
    
    const gameID = selectedGamesForAnalytics[0]?.gameID;
    const branch = selectedGamesForAnalytics[0]?.branch || 'main';
    const gameIDs = getGameIDs(); // Get gameIDs array if multiple games selected
    
    try {
      response = await getRevenue({
        gameID: gameID,
        branch: branch,
        includeBranchInAnalytics: false,
        includeEnvironmentInAnalytics: false,
        filterDate: [
          dayjs.utc().subtract(30, 'days').toISOString(),
          dayjs.utc().toISOString(),
        ],
        environment: 'production',
        filterSegments: [],
        gameIDs: gameIDs, // Pass gameIDs array for multiple games
      });
      
      isError = !response.success;
      if (!isError && response.message) {
        const revenueArray = response.message.data || [];
        const processedData = revenueArray.map(item => ({
          timestamp: item.timestamp,
          value: parseFloat(item.revenue) || 0,
          revenue: parseFloat(item.revenue) || 0,
          sales: parseInt(item.sales) || 0
        }));
        
        setPersistentAnalyticsData(prev => ({
          ...prev,
          revenue: processedData
        }));
        
        console.log('Revenue data processed:', processedData.length, 'items');
      }
    } catch (error) {
      console.error('Error fetching Revenue:', error);
    }
    
    setIsLoading_Revenue(false);
  }

  async function fetchARPPU() {
    if (!selectedGamesForAnalytics.length) return;
    
    let response;
    let isError;
    setIsLoading_ARPPU(true);
    
    const gameID = selectedGamesForAnalytics[0]?.gameID;
    const branch = selectedGamesForAnalytics[0]?.branch || 'main';
    const gameIDs = getGameIDs(); // Get gameIDs array if multiple games selected
    
    try {
      response = await getARPPU({
        gameID: gameID,
        branch: branch,
        includeBranchInAnalytics: false,
        includeEnvironmentInAnalytics: false,
        filterDate: [
          dayjs.utc().subtract(30, 'days').toISOString(),
          dayjs.utc().toISOString(),
        ],
        environment: 'production',
        filterSegments: [],
        gameIDs: gameIDs, // Pass gameIDs array for multiple games
      });
      
      isError = !response.success;
      if (!isError && response.message) {
        const processedData = response.message.map(item => ({
          timestamp: item.timestamp,
          value: parseFloat(item.value) || 0
        }));
        
        setPersistentAnalyticsData(prev => ({
          ...prev,
          arppu: processedData
        }));
        
        console.log('ARPPU data processed:', processedData.length, 'items');
      }
    } catch (error) {
      console.error('Error fetching ARPPU:', error);
    }
    
    setIsLoading_ARPPU(false);
  }

  async function fetchNewUsers() {
    if (!selectedGamesForAnalytics.length) return;
    
    let response;
    let isError;
    setIsLoading_NewUsers(true);
    
    const gameID = selectedGamesForAnalytics[0]?.gameID;
    const branch = selectedGamesForAnalytics[0]?.branch || 'main';
    const gameIDs = getGameIDs(); // Get gameIDs array if multiple games selected
    
    try {
      response = await getNewUsers({
        gameID: gameID,
        branch: branch,
        includeBranchInAnalytics: false,
        includeEnvironmentInAnalytics: false,
        filterDate: [
          dayjs.utc().subtract(30, 'days').toISOString(),
          dayjs.utc().toISOString(),
        ],
        environment: 'production',
        filterSegments: [],
        gameIDs: gameIDs, // Pass gameIDs array for multiple games
      });
      
      isError = !response.success;
      if (!isError && response.message) {
        const processedData = response.message.map(item => ({
          timestamp: item.timestamp,
          value: parseFloat(item.value) || 0
        }));
        
        setPersistentAnalyticsData(prev => ({
          ...prev,
          newInstalls: processedData
        }));
        
        console.log('New Users data processed:', processedData.length, 'items');
      }
    } catch (error) {
      console.error('Error fetching New Users:', error);
    }
    
    setIsLoading_NewUsers(false);
  }

  // Add retention fetch function for last 30 days
  async function fetchRetention() {
    if (!selectedGamesForAnalytics.length) return;
    
    let response;
    let isError;
    setIsLoading_Retention(true);
    
    const gameID = selectedGamesForAnalytics[0]?.gameID;
    const branch = selectedGamesForAnalytics[0]?.branch || 'main';
    const gameIDs = getGameIDs(); // Get gameIDs array if multiple games selected
    
    try {
      response = await getRetention({
        gameID: gameID,
        branch: branch,
        includeBranchInAnalytics: false,
        includeEnvironmentInAnalytics: false,
        filterDate: [
          dayjs.utc().subtract(30, 'days').toISOString(),
          dayjs.utc().toISOString(),
        ],
        filterDateSecondary: null,
        environment: 'production',
        filterSegments: [],
        gameIDs: gameIDs, // Pass gameIDs array for multiple games
      });
      
      isError = !response.success;
      if (!isError && response.message) {
        const processedData = response.message.map(item => ({
          timestamp: item.timestamp,
          value: parseFloat(item.retention) || 0
        }));
        
        setPersistentAnalyticsData(prev => ({
          ...prev,
          retention: processedData
        }));
        
        console.log('Retention data processed:', processedData.length, 'items');
      }
    } catch (error) {
      console.error('Error fetching Retention:', error);
    }
    
    setIsLoading_Retention(false);
  }

  // Add retention fetch function for previous 30 days (30-60 days ago)
  async function fetchRetentionPrevious() {
    if (!selectedGamesForAnalytics.length) return;
    
    let response;
    let isError;
    setIsLoading_RetentionPrevious(true);
    
    const gameID = selectedGamesForAnalytics[0]?.gameID;
    const branch = selectedGamesForAnalytics[0]?.branch || 'main';
    const gameIDs = getGameIDs(); // Get gameIDs array if multiple games selected
    
    try {
      response = await getRetention({
        gameID: gameID,
        branch: branch,
        includeBranchInAnalytics: false,
        includeEnvironmentInAnalytics: false,
        filterDate: [
          dayjs.utc().subtract(60, 'days').toISOString(),
          dayjs.utc().subtract(30, 'days').toISOString(),
        ],
        environment: 'production',
        filterSegments: [],
        gameIDs: gameIDs, // Pass gameIDs array for multiple games
      });
      
      isError = !response.success;
      if (!isError && response.message) {
        const processedData = response.message.map(item => ({
          timestamp: item.timestamp,
          value: parseFloat(item.retention) || 0
        }));
        
        setPersistentAnalyticsData(prev => ({
          ...prev,
          retentionPrevious: processedData
        }));
        
        console.log('Retention Previous data processed:', processedData.length, 'items');
      }
    } catch (error) {
      console.error('Error fetching Retention Previous:', error);
    }
    
    setIsLoading_RetentionPrevious(false);
  }

  async function fetchCombinedMetricsByCountry() {
    console.log('🚀 fetchCombinedMetricsByCountry called');
    console.log('selectedGamesForAnalytics:', selectedGamesForAnalytics);
    
    if (!selectedGamesForAnalytics.length) {
      console.log('❌ No games selected, skipping API call');
      return;
    }
    
    let response;
    let isError;
    setIsLoading_CombinedMetricsByCountry(true);
    
    const gameID = selectedGamesForAnalytics[0]?.gameID;
    const branch = selectedGamesForAnalytics[0]?.branch || 'main';
    const gameIDs = getGameIDs(); // Get gameIDs array if multiple games selected
    
    console.log('📤 Making API call with:', { gameID, branch, gameIDs });
    
    try {
      response = await getCombinedMetricsByCountry({
        gameID: gameID,
        branch: branch,
        includeBranchInAnalytics: false,
        includeEnvironmentInAnalytics: false,
        filterDate: [
          dayjs.utc().subtract(30, 'days').toISOString(),
          dayjs.utc().toISOString(),
        ],
        environment: 'production',
        filterSegments: [],
        gameIDs: gameIDs, // Pass gameIDs array for multiple games
      });
      
      console.log('📥 API Response:', response);
      
      isError = !response.success;
      if (!isError && response.message && Array.isArray(response.message)) {
        console.log('✅ Processing country data, items count:', response.message.length);
        
        const newCountryData = {
          installs: {},
          revenue: {},
          retention: {
            d1: {},
            d3: {},
            d7: {},
            d30: {}
          }
        };

        response.message.forEach(country => {
          console.log('Processing country:', country);
          
          // Installs and Revenue data
          newCountryData.installs[country.countryName] = country.installs || 0;
          newCountryData.revenue[country.countryName] = country.revenue || 0;
          
          // Retention data for all periods
          if (country.retention) {
            // Process each retention period if available in data
            ['d1', 'd3', 'd7', 'd30'].forEach(period => {
              if (country.retention[period]) {
                const retentionValue = typeof country.retention[period] === 'string' 
                  ? parseFloat(country.retention[period].replace('%', ''))
                  : country.retention[period];
                newCountryData.retention[period][country.countryName] = retentionValue || 0;
              }
            });
          }
        });

        console.log('🎯 Setting new country data:', newCountryData);
        setCountryData(newCountryData);
        
        console.log('Country data processed:', response.message.length, 'countries');
      } else {
        console.log('❌ API call failed or returned invalid data:', { isError, message: response.message });
      }
    } catch (error) {
      console.error('💥 Error fetching Country data:', error);
    }
    
    setIsLoading_CombinedMetricsByCountry(false);
  }

  // Process Revenue/DAU calculation when both datasets are available
  const processRevenueDau = useCallback(() => {
    const revenueData = persistentAnalyticsData.revenue;
    const dauData = persistentAnalyticsData.dau;
    
    if (revenueData.length > 0 && dauData.length > 0) {
      const revMap = new Map();
      revenueData.forEach(item => {
        revMap.set(item.timestamp, item.value || 0);
      });
      
      const revenueDauData = dauData.map(dauItem => ({
        timestamp: dauItem.timestamp,
        value: dauItem.value > 0 ? (revMap.get(dauItem.timestamp) || 0) / dauItem.value : 0
      }));

      setPersistentAnalyticsData(prev => ({
        ...prev,
        revenueDau: revenueDauData
      }));
      
      console.log('Revenue/DAU calculated:', revenueDauData.length, 'items');
    }
  }, [persistentAnalyticsData.revenue, persistentAnalyticsData.dau]);

  // Main fetch function - Updated to include retention and multiple games support
  async function fetchAnalyticsData() {
    if (isFetchingData.current === true) return;
    isFetchingData.current = true;

    try {
      // Log information about current selection
      const gameIDs = getGameIDs();
      console.log('🔄 Starting analytics data fetch for:', {
        gamesCount: selectedGamesForAnalytics.length,
        gameIDs: gameIDs,
        usingMultipleGames: shouldUseGameIDs()
      });

      await Promise.all([
        fetchCombinedMetricsByCountry(),
        fetchDAU(),
        fetchRevenue(),
        fetchARPPU(),
        fetchNewUsers(),
        fetchRetention(), // Add retention fetch
        fetchRetentionPrevious(), // Add previous retention fetch
      ]);
      
      console.log('✅ All analytics data fetched successfully');
      
    } catch (error) {
      console.error("❌ Error fetching data:", error);
    } finally {
      isFetchingData.current = false;
    }
  }

  // Add memoized callbacks to prevent unnecessary re-renders
  const memoizedShouldUseGameIDs = useMemo(() => shouldUseGameIDs(), [shouldUseGameIDs]);
  const memoizedGameIDs = useMemo(() => getGameIDs(), [getGameIDs]);

  // Process Revenue/DAU when revenue and DAU data changes
  useEffect(() => {
    if (persistentAnalyticsData.revenue.length > 0 && persistentAnalyticsData.dau.length > 0) {
      processRevenueDau();
    }
  }, [persistentAnalyticsData.revenue, persistentAnalyticsData.dau]);

  // Update dashboard settings when metric changes OR when persistent data changes
  useEffect(() => {
    const newChartConfigs = getChartConfigsForMetric(currentMetric);
    
    const updatedCharts = newChartConfigs.map((config) => ({
      ...config,
      data: getDataForMetric(config.metricName),
    }));

    setDashboardSettings({ charts: updatedCharts });
  }, [currentMetric, persistentAnalyticsData]);

  // Handle metric change from WorldMap
  const handleMetricChange = useCallback((newMetric) => {
    setCurrentMetric(newMetric);
  }, []);

  // Analytics data fetching (keeping existing logic)
  const fetchAnalyticsDataForStudio = useCallback(async () => {
    if (!selectedStudio?.studioID || !selectedGamesForAnalytics.length) return;

    try {
      const gameIDs = selectedGamesForAnalytics.map((game) => game.gameID);
      const statsData = await getOverviewStatistics({
        gameIDs,
        studioID: selectedStudio.studioID,
      });

      if (statsData.success) {
        setFullStatsData(statsData);
      }
    } catch (error) {
      console.error("Error fetching studio analytics:", error);
    }
  }, [getOverviewStatistics, selectedStudio, selectedGamesForAnalytics]);

  const fetchAnalyticsDataForPublisher = useCallback(async () => {
    if (!selectedStudiosForAnalytics.length) return;

    try {
      const studioIDs = selectedStudiosForAnalytics.map(
        (studio) => studio.studioID
      );
      const statsData = await getOverviewStatisticsForPublisher({
        studioIDs,
      });

      if (statsData.success) {
        setFullStatsDataPublisher(statsData);
      }
    } catch (error) {
      console.error("Error fetching publisher analytics:", error);
    }
  }, [getOverviewStatisticsForPublisher, selectedStudiosForAnalytics]);

  const handleGameCreated = useCallback(
  async (newGameData) => {
    console.log('New game created:', newGameData);
    
    // First, refresh the games list and wait for it to complete
    await refetchGames();
    
    // Small delay to ensure the data has propagated through all hooks
    setTimeout(() => {
      // Ensure the correct studio is selected
      const gameStudio = studios.find(
        (studio) => studio.studioID === newGameData.studioID
      );
      
      if (gameStudio) {
        // Set the studio if it's not already selected
        if (!selectedStudio || selectedStudio.studioID !== gameStudio.studioID) {
          setSelectedStudio(gameStudio);
        }
      }

      // Force set the new game in GameContext
      // This will trigger the navbar to update
      setGame?.(newGameData);
      console.log('Game created and selected:', newGameData.gameName);
    }, 200); // Increased timeout to ensure data propagation
  },
  [refetchGames, studios, selectedStudio, setSelectedStudio, setGame]
);

  // Handle onboarding completion
  const handleOnboardingFinish = useCallback(() => {
    markOnboardingComplete();
    // Refresh data after onboarding completion
    setTimeout(() => {
      window.location.reload(); // Simple way to refresh all data
    }, 500);
  }, [markOnboardingComplete]);

  // Initialize analytics selections when data loads
  useEffect(() => {
    if (navigationMode === "publisher") {
      if (studios.length > 0 && selectedStudiosForAnalytics.length === 0) {
        setSelectedStudiosForAnalytics(studios);
      }
      const allGamesFromStudios = selectedStudiosForAnalytics.flatMap(
        (studio) => getStudioGames(studio.studioID)
      );
      setSelectedGamesForAnalytics(allGamesFromStudios);
    } else if (navigationMode === "studio" && selectedStudio) {
      const studioGames = getStudioGames(selectedStudio.studioID);
      setSelectedGamesForAnalytics(studioGames);
    }
  }, [navigationMode, selectedStudio, studios, selectedStudiosForAnalytics]);

  // Enhanced debug logging with multiple games support
  useEffect(() => {
    console.log('=== MULTIPLE GAMES DEBUG ===');
    console.log('Selected games count:', selectedGamesForAnalytics.length);
    console.log('Should use gameIDs:', memoizedShouldUseGameIDs);
    console.log('GameIDs array:', memoizedGameIDs);
    console.log('Games list:', selectedGamesForAnalytics.map(g => ({ 
      gameID: g.gameID, 
      gameName: g.gameName || 'Unknown' 
    })));
  }, [selectedGamesForAnalytics, memoizedShouldUseGameIDs, memoizedGameIDs]);

  // Update the effect that triggers data fetching
  useEffect(() => {
    console.log('🎮 Games selection changed:', {
      gamesCount: selectedGamesForAnalytics.length,
      gamesList: selectedGamesForAnalytics.map(g => g.gameID),
      shouldUseMultiple: memoizedShouldUseGameIDs
    });
    
    if (selectedGamesForAnalytics.length > 0) {
      console.log('📊 Calling fetchAnalyticsData for', 
        memoizedShouldUseGameIDs ? 'multiple games' : 'single game');
      fetchAnalyticsData();
    } else {
      console.log('⚠️ No games selected, skipping analytics fetch');
    }
  }, [selectedGamesForAnalytics, memoizedShouldUseGameIDs]);

  // Handle navigation between publisher and studio views
  const handleNavigateToStudio = useCallback(
    (studio) => {
      setNavigationMode("studio");
      setSelectedStudio(studio);
      setSelectedStudiosForAnalytics([studio]);
      const studioGames = getStudioGames(studio.studioID);
      setSelectedGamesForAnalytics(studioGames);
    },
    [setSelectedStudio, getStudioGames]
  );

  const handleNavigateToPublisher = useCallback(() => {
    setNavigationMode("publisher");
    setSelectedStudio(null);
    setSelectedStudiosForAnalytics(studios);
    const allGames = studios.flatMap((studio) =>
      getStudioGames(studio.studioID)
    );
    setSelectedGamesForAnalytics(allGames);
  }, [studios, getStudioGames, setSelectedStudio]);

  // Handle publisher selection
  const handlePublisherSelect = useCallback(
    (publisher) => {
      setSelectedPublisher(publisher);
      handleNavigateToPublisher();
    },
    [setSelectedPublisher, handleNavigateToPublisher]
  );

  // Handle game/studio selection for analytics
  const handleStudioAnalyticsChange = useCallback(
    (selectedStudios) => {
      setSelectedStudiosForAnalytics(selectedStudios);
      const gamesFromStudios = selectedStudios.flatMap((studio) =>
        getStudioGames(studio.studioID)
      );
      setSelectedGamesForAnalytics(gamesFromStudios);
    },
    [getStudioGames]
  );

  const handleGameAnalyticsChange = useCallback((selectedGames) => {
    setSelectedGamesForAnalytics(selectedGames);
  }, []);

  // Modal handlers
  const modalHandlers = useMemo(
    () => ({
      openGameModal: () => {
        setGameModalOpen(true);
        setIsSettingsModal(false);
        setModalSecretKey(uuid());
      },
      openStudioModal: () => {
        setStudioModalOpen(true);
        setIsSettingsModal(false);
        setModalSecretKey(uuid());
      },
      openGameSettings: (gameID) => {
        setSettingsModalId(gameID);
        setIsSettingsModal(true);
        setGameModalOpen(true);
      },
      openStudioSettings: (studioID) => {
        setSettingsModalId(studioID);
        setIsSettingsModal(true);
        setStudioModalOpen(true);
      },
      closeGameModal: () => {
        setGameModalOpen(false);
        setIsSettingsModal(false);
        setSettingsModalId("");
      },
      closeStudioModal: () => {
        setStudioModalOpen(false);
        setIsSettingsModal(false);
        setSettingsModalId("");
      },
    }),
    []
  );

  // Map event handlers
  const handleCountryClick = useCallback((countryName, position, event) => {
    setCountryPopover({
      open: true,
      countryName,
      anchorPosition: position,
    });
  }, []);

  const handlePopoverClose = useCallback(() => {
    setCountryPopover({ open: false, countryName: "", anchorPosition: null });
  }, []);

  // Update analytics title to reflect multiple games
  const getAnalyticsTitle = useMemo(() => {
    if (navigationMode === "publisher") {
      return selectedStudio ? selectedStudio.studioName : "All Studios";
    } else {
      if (selectedGamesForAnalytics.length > 1) {
        return `${selectedGamesForAnalytics.length} Games Selected`;
      }
      return game ? game.gameName : "All Games";
    }
  }, [navigationMode, selectedStudio, game, selectedGamesForAnalytics]);

  // Get available games and studios for selector based on current mode
  const selectorData = useMemo(() => {
    if (navigationMode === "studio" && selectedStudio) {
      return {
        games: getStudioGames(selectedStudio.studioID),
        studios: [],
      };
    } else {
      return {
        games: selectedStudiosForAnalytics.flatMap((studio) =>
          getStudioGames(studio.studioID)
        ),
        studios: studios,
      };
    }
  }, [
    navigationMode,
    selectedStudio,
    selectedStudiosForAnalytics,
    studios,
    getStudioGames,
  ]);

  // Format value for display
  const formatValue = useCallback((value, format, formatPosition) => {
    const formattedValue = Math.abs(value).toLocaleString();
    if (format === "$" && formatPosition === "start") {
      return `$${formattedValue}`;
    }
    if (format === "%" && formatPosition === "end") {
      return `${formattedValue}%`;
    }
    return formattedValue;
  }, []);

  // Export functionality
  const exportToCSV = useCallback(() => {
    const headers = ["Date", ...dashboardSettings.charts.map((c) => c.name)];
    const maxLength = Math.max(
      ...dashboardSettings.charts.map((chart) => chart.data?.data?.length || 0)
    );

    const rows = [];
    for (let i = 0; i < maxLength; i++) {
      const row = [
        dashboardSettings.charts[0]?.data?.data?.[i]?.timestamp || "",
        ...dashboardSettings.charts.map(
          (chart) => chart.data?.data?.[i]?.value || 0
        ),
      ];
      rows.push(row);
    }

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${currentMetric}-${dayjs.utc().format("YYYY-MM-DD")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [dashboardSettings.charts, currentMetric]);

  const exportToJSON = useCallback(() => {
    const data = {
      exportDate: dayjs.utc().toISOString(),
      metric: currentMetric,
      title: getAnalyticsTitle,
      metrics: dashboardSettings.charts.map((chart) => ({
        name: chart.name,
        metricName: chart.metricName,
        deltaValue: chart.data?.deltaValue || 0,
        data: chart.data?.data || [],
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${currentMetric}-${dayjs.utc().format("YYYY-MM-DD")}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [dashboardSettings.charts, getAnalyticsTitle, currentMetric]);

  // Updated Get table data with special handling for retention
  const getTableData = useMemo(() => {
    // Special handling for retention metric in table mode
    if (currentMetric === "retention") {
      const retentionData = persistentAnalyticsData[selectedRetentionPeriod];
      
      if (!retentionData || retentionData.length === 0) {
        return [];
      }

      const tableData = retentionData.map(item => ({
        date: item.timestamp,
        [selectedRetentionPeriod]: item.value || 0
      }));

      return tableData;
    }

    // Original logic for other metrics
    const chartWithData = dashboardSettings.charts.find(
      chart => chart.data?.data?.length > 0
    );
    
    if (!chartWithData) {
      return [];
    }

    const maxLength = Math.max(
      ...dashboardSettings.charts.map((chart) => chart.data?.data?.length || 0)
    );
    const tableData = [];

    for (let i = 0; i < maxLength; i++) {
      const row = {
        date: chartWithData.data.data[i]?.timestamp || "",
        ...dashboardSettings.charts.reduce((acc, chart) => {
          acc[chart.metricName] = chart.data?.data?.[i]?.value || 0;
          return acc;
        }, {}),
      };
      tableData.push(row);
    }

    return tableData;
  }, [currentMetric, selectedRetentionPeriod, persistentAnalyticsData, dashboardSettings.charts]);

  // Get table headers based on current metric
  const getTableHeaders = useMemo(() => {
    if (currentMetric === "retention") {
      return [
        "Date",
        selectedRetentionPeriod === "retention" ? "Retention (Last 30 Days)" : "Retention (Previous 30 Days)"
      ];
    }
    
    return ["Date", ...dashboardSettings.charts.map((chart) => chart.name)];
  }, [currentMetric, selectedRetentionPeriod, dashboardSettings.charts]);

  // Debug logging
  useEffect(() => {
    console.log('=== PERSISTENT DATA DEBUG ===');
    Object.keys(persistentAnalyticsData).forEach(key => {
      const data = persistentAnalyticsData[key];
      if (data.length > 0) {
        console.log(`${key}:`, {
          dataLength: data.length,
          firstItem: data[0],
          lastItem: data[data.length - 1]
        });
      } else {
        console.log(`${key}: NO DATA`);
      }
    });
  }, [persistentAnalyticsData]);

  useEffect(() => {
    console.log('=== DASHBOARD CHARTS DEBUG ===');
    dashboardSettings.charts.forEach(chart => {
      if (chart.data?.data?.length > 0) {
        console.log(`${chart.name} (${chart.metricName}):`, {
          dataLength: chart.data.data.length,
          firstItem: chart.data.data[0],
          lastItem: chart.data.data[chart.data.data.length - 1],
          sampleValues: chart.data.data.slice(0, 3).map(item => item.value)
        });
      } else {
        console.log(`${chart.name} (${chart.metricName}): NO DATA`);
      }
    });
  }, [dashboardSettings]);

  useEffect(() => {
    console.log('=== COUNTRY DATA DEBUG ===');
    console.log('Current metric:', currentMetric);
    console.log('Country data:', countryData);
    console.log('Country data for current metric:', countryData[currentMetric]);
  }, [countryData, currentMetric]);

  // Analytics panels component - Memoized to prevent WorldMap re-renders
  const AnalyticsPanels = useMemo(
    () => (
      <Box className={analyticsStyles.analyticsContainer}>
        <Paper className={analyticsStyles.panel}>
          <Box className={analyticsStyles.panelHeader}>
            <Box
              className={analyticsStyles.headerLeft}
              onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            >
              <AnalyticsIcon className={analyticsStyles.headerIcon} />
              <Typography className={analyticsStyles.headerTitle}>
                Analytics Dashboard
              </Typography>
              <Typography className={analyticsStyles.headerSubtitle}>
                {currentMetric.charAt(0).toUpperCase() + currentMetric.slice(1)}{" "}
                • {getAnalyticsTitle}
              </Typography>
            </Box>
            <Box className={analyticsStyles.headerActions}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, value) => {
                  e.stopPropagation();
                  if (value) setViewMode(value);
                }}
                size="small"
                className={analyticsStyles.viewToggleGroup}
              >
                <ToggleButton
                  value="charts"
                  className={analyticsStyles.viewToggleButton}
                >
                  <ChartIcon fontSize="small" style={{ marginRight: 6 }} />
                  Charts
                </ToggleButton>
                <ToggleButton
                  value="table"
                  className={analyticsStyles.viewToggleButton}
                >
                  <TableIcon fontSize="small" style={{ marginRight: 6 }} />
                  Table
                </ToggleButton>
              </ToggleButtonGroup>
              <IconButton
                size="small"
                className={analyticsStyles.expandButton}
                style={{
                  transform: analyticsExpanded
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Box>
          </Box>

          <Collapse in={analyticsExpanded}>
            <Box className={analyticsStyles.panelContent}>
              {viewMode === "charts" ? (
                <Box 
                  sx={{
                    display: 'grid',
                    gap: 2,
                    mt: 2,
                    // Adaptive grid based on number of charts
                    gridTemplateColumns: (() => {
                      const chartCount = dashboardSettings.charts.length;
                      
                      if (chartCount === 1) {
                        return { xs: '1fr', md: 'minmax(300px, 600px)' };
                      } else if (chartCount === 2) {
                        return { xs: '1fr', md: 'repeat(2, 1fr)' };
                      } else if (chartCount === 3) {
                        return { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, minmax(250px, 1fr))' };
                      } else {
                        return { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(auto-fit, minmax(240px, 1fr))' };
                      }
                    })(),
                    justifyContent: dashboardSettings.charts.length === 1 ? 'center' : 'flex-start',
                    maxWidth: '100%',
                    // Add maximum height for the grid container
                    maxHeight: '70vh', // Maximum 70% of viewport height
                    overflow: 'visible', // Allow overflow if needed
                  }}
                >
                  {dashboardSettings.charts.map((chartConfig) => {
                    const IconComponent = chartConfig.icon;
                    const currentValue =
                      chartConfig.data?.data?.[chartConfig.data.data.length - 1]
                        ?.value || 0;
                    const deltaValue = chartConfig.data?.deltaValue || 0;
                    const deltaClass =
                      deltaValue > 0
                        ? "positive"
                        : deltaValue < 0
                          ? "negative"
                          : "neutral";

                    // Colors for delta values
                    const deltaColor = 
                      deltaValue > 0 ? '#22c55e' : 
                      deltaValue < 0 ? '#ef4444' : '#6b7280';

                    return (
                      <Paper
                        key={chartConfig.chartID}
                        sx={{
                          background: 'white',
                          borderRadius: '12px',
                          p: 2.5,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          border: '1px solid #e0e0e0',
                          transition: 'box-shadow 0.2s ease',
                          minHeight: { xs: 150, md: 200 },
                          maxHeight: { xs: 200, md: 300 }, // Add maximum height constraint
                          display: 'flex',
                          flexDirection: 'column',
                          '&:hover': {
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                          }
                        }}
                      >
                        {/* Header with icon and title */}
                        <Box 
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 1.5,
                            gap: 1,
                          }}
                        >
                          <IconComponent
                            sx={{
                              fontSize: 20,
                              color: '#666',
                            }}
                          />
                          <Typography 
                            sx={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: '#333',
                              lineHeight: 1.2,
                            }}
                          >
                            {chartConfig.name}
                          </Typography>
                        </Box>

                        {/* Current value */}
                        <Typography 
                          sx={{
                            fontSize: { xs: 24, md: 28 },
                            fontWeight: 700,
                            color: '#1a1a1a',
                            my: 1,
                            lineHeight: 1.1,
                          }}
                        >
                          {formatValue(
                            currentValue,
                            chartConfig.format,
                            chartConfig.formatPosition
                          )}
                        </Typography>

                        {/* Delta value */}
                        {chartConfig.showDelta && (
                          <Box
                            sx={{
                              fontSize: 14,
                              fontWeight: 500,
                              mb: 2,
                              color: deltaColor,
                            }}
                          >
                            <span>
                              {deltaValue >= 0 ? "+" : ""}
                              {formatValue(
                                deltaValue,
                                chartConfig.format,
                                chartConfig.formatPosition
                              )}
                            </span>
                          </Box>
                        )}

                        {/* Chart */}
                        <Box 
                          sx={{
                            flex: 1,
                            minHeight: 120,
                            mt: 'auto',
                          }}
                        >
                          <ChartWidget
                            key={`${chartConfig.chartID}-${viewMode}-${currentMetric}`}
                            config={{
                              chartID: chartConfig.chartID,
                              name: chartConfig.name,
                              metricName: chartConfig.metricName,
                              format: chartConfig.format,
                              formatPosition: chartConfig.formatPosition,
                              showDelta: false,
                            }}
                            analyticsData={chartConfig.data}
                            dateRange={defaultDate}
                            variant="card"
                            isLoading={getLoadingStateForMetric(chartConfig.metricName)}
                            forceRecreate={viewMode}
                          />
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              ) : (
                <Box>
                  <Box 
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontSize: 18,
                          fontWeight: 600,
                          color: '#333',
                        }}
                      >
                        {currentMetric.charAt(0).toUpperCase() +
                          currentMetric.slice(1)}{" "}
                        Data - {getAnalyticsTitle}
                      </Typography>
                      
                      {/* Add retention period selector for table view */}
                      {currentMetric === "retention" && (
                        <ToggleButtonGroup
                          value={selectedRetentionPeriod}
                          exclusive
                          onChange={(e, value) => {
                            if (value) setSelectedRetentionPeriod(value);
                          }}
                          size="small"
                          sx={{
                            '& .MuiToggleButton-root': {
                              textTransform: 'none',
                              fontSize: 12,
                              px: 2,
                              py: 0.5,
                              borderColor: '#e0e0e0',
                              color: '#666',
                              backgroundColor: 'white',
                              '&.Mui-selected': {
                                backgroundColor: '#f0f0f0',
                                color: '#333',
                                borderColor: '#d0d0d0',
                                '&:hover': {
                                  backgroundColor: '#e8e8e8',
                                }
                              },
                              '&:hover': {
                                borderColor: '#d0d0d0',
                                backgroundColor: '#f5f5f5',
                              }
                            }
                          }}
                        >
                          <ToggleButton value="retention">
                            Last 30 Days
                          </ToggleButton>
                          <ToggleButton value="retentionPrevious">
                            Previous 30 Days
                          </ToggleButton>
                        </ToggleButtonGroup>
                      )}
                    </Box>
                    
                    <Box 
                      sx={{
                        display: 'flex',
                        gap: 1,
                      }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={exportToCSV}
                        size="small"
                        sx={{
                          textTransform: 'none',
                          borderColor: '#e0e0e0',
                          color: '#666',
                          '&:hover': {
                            borderColor: '#d0d0d0',
                            backgroundColor: '#f5f5f5',
                          }
                        }}
                      >
                        CSV
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={exportToJSON}
                        size="small"
                        sx={{
                          textTransform: 'none',
                          borderColor: '#e0e0e0',
                          color: '#666',
                          '&:hover': {
                            borderColor: '#d0d0d0',
                            backgroundColor: '#f5f5f5',
                          }
                        }}
                      >
                        JSON
                      </Button>
                    </Box>
                  </Box>

                  <TableContainer 
                    sx={{
                      maxHeight: 400,
                      border: '1px solid #e0e0e0',
                      borderRadius: 2,
                    }}
                  >
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          {getTableHeaders.map((header, index) => (
                            <TableCell 
                              key={index}
                              align={index === 0 ? "left" : "right"}
                              sx={{ 
                                fontWeight: 600,
                                backgroundColor: '#f8f9fa',
                              }}
                            >
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getTableData.slice(0, 15).map((row, index) => (
                          <TableRow 
                            key={index}
                            sx={{
                              '&:nth-of-type(odd)': {
                                backgroundColor: '#f9f9f9',
                              },
                              '&:hover': {
                                backgroundColor: '#f0f0f0',
                              }
                            }}
                          >
                            <TableCell>
                              {dayjs.utc(row.date).format("MMM DD, YYYY")}
                            </TableCell>
                            {currentMetric === "retention" ? (
                              <TableCell align="right">
                                {formatValue(
                                  row[selectedRetentionPeriod] || 0,
                                  "",
                                  "start"
                                )}
                              </TableCell>
                            ) : (
                              dashboardSettings.charts.map((chart) => (
                                <TableCell key={chart.chartID} align="right">
                                  {formatValue(
                                    row[chart.metricName] || 0,
                                    chart.format,
                                    chart.formatPosition
                                  )}
                                </TableCell>
                              ))
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          </Collapse>
        </Paper>
      </Box>
    ),
    [
      analyticsExpanded,
      viewMode,
      currentMetric,
      getAnalyticsTitle,
      dashboardSettings.charts,
      defaultDate,
      formatValue,
      exportToCSV,
      exportToJSON,
      getTableData,
      getTableHeaders,
      getLoadingStateForMetric,
      selectedRetentionPeriod,
    ]
  );

  // Stable WorldMap props to prevent re-renders
  const stableWorldMapProps = useMemo(
    () => {
      const currentCountryData = countryData[currentMetric] || {};
      const currentRetentionData = countryData.retention || {};
      
      console.log('🗺️ WorldMap data for', currentMetric, ':', currentCountryData);
      console.log('🗺️ WorldMap retention data:', currentRetentionData);
      
      return {
        selectedGames: selectedGamesForAnalytics,
        onCountryClick: handleCountryClick,
        countryData: currentCountryData,
        retentionData: currentRetentionData,
        onMetricChange: handleMetricChange,
        currentMetric: currentMetric,
      };
    },
    [
      selectedGamesForAnalytics,
      handleCountryClick,
      currentMetric,
      handleMetricChange,
      countryData,
    ]
  );

  // Show loading while checking onboarding status
  if (isCheckingOnboarding) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <Typography variant="h6">Loading...</Typography>
        <Typography variant="body2" color="text.secondary">
          Checking your account status
        </Typography>
      </div>
    );
  }

  // Show onboarding if needed
  if (isOnboarding) {
    return <InitialSetup onFinish={handleOnboardingFinish} />;
  }

  return (
    <div className="overview-page">
      <Helmet>
        <title>{titles.overview}</title>
      </Helmet>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={clearError} severity="error" sx={{ width: "100%" }}>
          {error?.message || "An error occurred"}
        </Alert>
      </Snackbar>

      <div className="overview-page-content">
        <div className="overview-main">
          <main className="overview-content-containers">
            <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
              <MemoizedWorldMap {...stableWorldMapProps} />

              <GameStudioSelector
                games={selectorData.games}
                studios={selectorData.studios}
                publishers={publishers}
                selectedGames={selectedGamesForAnalytics}
                selectedStudios={selectedStudiosForAnalytics}
                selectedPublisher={selectedPublisher}
                onGameSelect={handleGameAnalyticsChange}
                onStudioSelect={handleStudioAnalyticsChange}
                onPublisherSelect={handlePublisherSelect}
                navigationMode={navigationMode}
                onNavigateToStudio={handleNavigateToStudio}
                onNavigateToPublisher={handleNavigateToPublisher}
                currentStudio={selectedStudio}
                onGameSettings={modalHandlers.openGameSettings}
                onStudioSettings={modalHandlers.openStudioSettings}
                onCreateGame={modalHandlers.openGameModal}
                onCreateStudio={modalHandlers.openStudioModal}
              />

              {AnalyticsPanels}

              <CountryPopover
                open={countryPopover.open}
                anchorPosition={countryPopover.anchorPosition}
                onClose={handlePopoverClose}
                countryName={countryPopover.countryName}
                countryData={{
                  [currentMetric]: countryData[currentMetric]?.[countryPopover.countryName],
                }}
              />
            </div>
            
            <Modal open={gameModalOpen} onClose={modalHandlers.closeGameModal}>
              <AddGameModal
                isModalOpened={gameModalOpen}
                isSettingsModal={isSettingsModal}
                settingsModalGameID={settingsModalId}
                onModalOpen={() => setModalSecretKey(uuid())}
                onModalClose={modalHandlers.closeGameModal}
                onCreateGame={refetchGames}
                onDeleteGame={refetchGames}
                onGameCreated={handleGameCreated}
                uuid={modalSecretKey}
                currentStudio={selectedStudio}
              />
            </Modal>

            <Modal
              open={studioModalOpen}
              onClose={modalHandlers.closeStudioModal}
            >
              <AddStudioModal
                isModalOpened={studioModalOpen}
                isSettingsModal={isSettingsModal}
                settingsModalGameID={settingsModalId}
                onModalOpen={() => setModalSecretKey(uuid())}
                onModalClose={modalHandlers.closeStudioModal}
                onCreateStudio={refetchStudios}
                onDeleteStudio={() => {
                  modalHandlers.closeStudioModal();
                  setSelectedStudio(null);
                  refetchStudios();
                }}
                currentPublisher={selectedPublisher}
                uuid={modalSecretKey}
                currentStudio={studios.find(
                  (s) => s.studioID === settingsModalId
                )}
              />
            </Modal>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Overview;