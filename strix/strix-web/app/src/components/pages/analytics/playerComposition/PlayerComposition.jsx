// React and utilities
import React, { useState, useEffect, useRef, useMemo } from "react";
import Helmet from "react-helmet";
import titles from "titles";
import s from "./css/playerComposition.module.css";

// Dayjs and related plugins
import dayjs, { diff } from "dayjs";
import utc from "dayjs-plugin-utc";
import isBetween from "dayjs/plugin/isBetween";
import chroma from "chroma-js";

// Lodash and shortid
import shortid from "shortid";
import debounce from "lodash/debounce";
import { uniq } from "lodash";

// MUI core components (grouping many common ones)
import {
  Box,
  Button,
  Card,
  CardHeader,
  CardContent,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  Paper,
  List,
  ListItem,
  Tooltip,
  alpha,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  InputAdornment,
  Backdrop,
  CircularProgress,
  ListSubheader,
} from "@mui/material";
import Typography from "@mui/material/Typography";
import Input from "@mui/material/Input";
import TextField from "@mui/material/OutlinedInput";
import OutlinedInput from "@mui/material/OutlinedInput";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";
import { tooltipClasses } from "@mui/material/Tooltip";

// MUI icons
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import TimelineIcon from "@mui/icons-material/Timeline";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import CloseSharpIcon from "@mui/icons-material/CloseSharp";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HighlightAltSharpIcon from "@mui/icons-material/HighlightAltSharp";
import SensorOccupiedSharpIcon from "@mui/icons-material/SensorOccupiedSharp";
import ManageSearchSharpIcon from "@mui/icons-material/ManageSearchSharp";
import LeaderboardSharpIcon from "@mui/icons-material/LeaderboardSharp";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CheckIcon from "@mui/icons-material/Check";

// Shared components and local modules
import DraggableComponent from "shared/draggableWrapper.jsx";
import DatePicker from "shared/datePicker/DatePickerWidget.jsx";
import PortableSegmentBuilder from "shared/newSegmentModal/PortableSegmentBuilder";
import SearchWrapper from "shared/searchFramework/SearchWrapper.jsx";

import SegmentChart from "./SegmentChart";
import BubbleProfileChart from "./BubbleProfileChart";
import Tooltip_SingleDefaultDistributionChart from "./Tooltip_SingleDefaultDistributionChart";
import { CustomDragLayer } from "./CustomDragLayer";
import TemplateItemDraggable from "./TemplateItemDraggable";
import BackpackIcon from "./backpack.svg?react";
import { useAlert } from "@strix/alertsContext";

import ProfileCompositionStaticSegmentBuilder from "./ProfileCompositionStaticSegmentBuilder";

// React DnD
import { DndProvider, useDrop } from "react-dnd";

// Global contexts and API
import { useBranch, useGame } from "@strix/gameContext";
import useApi from "@strix/api";
import { useThemeContext } from "@strix/themeContext";
dayjs.extend(utc);
dayjs.extend(isBetween);

function PlayerComposition() {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { triggerAlert } = useAlert();

  const {
    getAllSegments,
    getTemplatesForSegments,
    getAllAnalyticsEvents,
    getProfileComposition,
    setProfileCompositionPreset,
    getProfileCompositionPreset,
    getABTestsShort,
    getFlowsShort,
    buildStaticSegmentFromComposition,
  } = useApi();
  const [loadingData, setLoadingData] = useState(false);
  const [collapseFilters, setCollapseFilters] = useState(false);

  function makeRandomColor(number) {
    const hue = number * 137.508; // use golden angle approximation
    return `hsl(${hue},100%,30%)`;
  }
  const [openSegmentBuilder, setOpenSegmentBuilder] = useState(false);

  const { theme } = useThemeContext();
  const [currentMode, setCurrentMode] = useState(() => {
    if (localStorage.getItem("profileComposition_layoutMode") !== null) {
      return localStorage.getItem("profileComposition_layoutMode");
    }
    return "both"; // pie / both
  });
  function darkenColor(color) {
    if (!color) return color;
    return theme === "light" ? chroma(color).darken(1).hex() : color;
  }
  const defaultPieChartTheme = {
    borderColor: [
      darkenColor(chroma(makeRandomColor(6)).hex()),
      darkenColor(chroma(makeRandomColor(4)).hex()),
    ],
    borderWidth: 2,
    backgroundColor: [
      darkenColor(chroma(makeRandomColor(6)).alpha(0.3).hex()),
      darkenColor(chroma(makeRandomColor(4)).alpha(0.3).hex()),
    ],
  };
  const [segmentsChartObj, setSegmentsChartObj] = useState({
    chartID: shortid.generate(),
    name: "Segments",
    metrics: [
      {
        data: {
          data: [0, 0],
        },
        datasetConfig: {
          config: {
            label: "Player count",
            type: "pie",
            ...defaultPieChartTheme,
          },
        },
      },
    ],
    chartSettings: {
      type: "pie",
      showDelta: false,
      deltaFormat: "$",
      deltaFormatPosition: "start",
      showLegend: false,
      fullWidth: true,
      customWidth: "400px",
      customHeight: "360px",

      ticks: [],

      canvasHeight: "100%",
      canvasWidth: "100%",
    },
    categories: [
      {
        name: "Selected Segments",
        filters: [],
        isHidden: false,
        isCustom: false,
        changed: true,
      },
      {
        name: "Filtered",
        filters: [],
        isHidden: false,
        isCustom: false,
        changed: true,
      },
    ],
  });

  const [bubbleChartObj, setBubbleChartObj] = useState({
    chartID: shortid.generate(),
    name: "Bubble chart",
    metrics: [
      {
        data: {
          data: [
            { x: 5, y: 5, r: 5 },
            { x: 5, y: 30, r: 30 },
          ],
        },
        datasetConfig: {
          config: {
            label: "Player count",
            type: "bubble",
            borderWidth: 2,
            borderColor: [darkenColor(chroma(makeRandomColor(4)).hex())],
            backgroundColor: [
              darkenColor(chroma(makeRandomColor(4)).alpha(0.3).hex()),
            ],
          },
        },
      },
    ],

    borderColorSelected: darkenColor(chroma("#ac2036").hex()),
    backgroundColorSelected: darkenColor(chroma("#ac2036").alpha(0.3).hex()),

    borderColorDefault: darkenColor(chroma(makeRandomColor(4)).hex()),
    backgroundColorDefault: darkenColor(
      chroma(makeRandomColor(4)).alpha(0.3).hex()
    ),

    chartSettings: {
      type: "bubble",
      showDelta: false,
      deltaFormat: "$",
      deltaFormatPosition: "start",
      showLegend: false,
      fullWidth: true,
      customWidth: "55%",
      customHeight: "400px",

      ticks: [],

      canvasHeight: "100%",
      canvasWidth: "100%",
    },
    categoryData: ["Filtered"],
    axisY: "",
    axisX: "",
    radius: "",
  });
  const [elementsTypes, setElementsTypes] = useState({
    x: "",
    y: "",
    r: "",
  });

  const [elements, setElements] = useState({
    analytics: [],
    statistics: [],
    inventory: [],
  });
  const [segments, setSegments] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState("analytics");
  const [filteredTemplateList_stat, setFilteredTemplateList_stat] = useState(
    []
  );
  const [filteredTemplateList_an, setFilteredTemplateList_an] = useState([]);
  const [filteredTemplateList_inv, setFilteredTemplateList_inv] = useState([]);

  const [selectedSegment, setSelectedSegment] = useState([]);
  const [filters, setFilters] = useState([]);
  const [bubbleSettings, setBubbleSettings] = useState({
    element1: "",
    element2: "",
    element3: "",
  });
  const [bubbleChartAxisesInversions, setBubbleChartAxisesInversions] =
    useState({
      inverted_x: false,
      inverted_y: false,
    });

  // Save analytics events so we can retrieve their values' types for filtering
  const [analyticsEvents, setAnalyticsEvents] = useState();
  const [abTests, setAbTests] = useState([]);
  const [flows, setFlows] = useState([]);
  const [fetchingAllData, setFetchingAllData] = useState(false);
  const segmentsFetchedOnce = useRef(false);
  async function refetchSegments() {
    const resp = await getAllSegments({
      gameID: game.gameID,
      branch: branch,
    });
    if (resp.success) {
      if (segmentsFetchedOnce.current === false) {
        segmentsFetchedOnce.current = true;
        setSegments(resp.segments);
        setSelectedSegment([resp.segments[0]]);
      } else {
        setSegments(resp.segments);
      }
      return { segments: resp.segments };
    }
  }
  async function fetchData() {
    setFetchingAllData(true);

    await refetchSegments();

    const [resp2, eventsResp, resp3] = await Promise.all([
      getTemplatesForSegments({ gameID: game.gameID, branch: branch }),
      getAllAnalyticsEvents({
        gameID: game.gameID,
        branch: branch,
        getRemoved: false,
      }),
      getProfileCompositionPreset({ gameID: game.gameID, branch: branch }),
    ]);

    if (resp2.success) {
      setElements(resp2.templates);
    }

    setAnalyticsEvents(eventsResp.events);

    if (resp3?.success && resp3.presets.length > 0) {
      setPresets(resp3.presets);
    }

    async function getAllABTests() {
      const res = await getABTestsShort({
        gameID: game.gameID,
        branch: branch,
      });
      if (res.success) {
        setAbTests(res.abTests);
      }
    }
    getAllABTests();

    async function getAllFlows() {
      if (window.__env.edition !== "community") {
        const res = await getFlowsShort({
          gameID: game.gameID,
          branch: branch,
        });
        if (res.success) {
          setFlows(res.result);
        }
      } else {
        setFlows([]);
      }
    }
    getAllFlows();

    setFetchingAllData(false);
  }

  const [selectedSegmentChartCategory, setSelectedSegmentChartCategory] =
    useState(0);
  const [compositionData, setCompositionData] = useState();
  const [bubbleChartData, setBubbleChartData] = useState();
  const [baseSegmentsCount, setBaseSegmentsCount] = useState(0);
  const compositionTimer = useRef(null);
  function fetchComposition() {
    // if (loadingData) {
    //   return;
    // }

    setLoadingData(true);
    clearTimeout(compositionTimer.current);

    compositionTimer.current = setTimeout(async () => {
      let arr = filters;
      if (currentMode === "pie") {
        arr = segmentsChartObj.categories.map((c, i) => ({ ...c, index: i }));
        if (arr.length === 0) {
          setLoadingData(false);
          return;
        }
      }
      const resp = await getProfileComposition({
        gameID: game.gameID,
        branch: branch,
        environment: environment,
        baseSegment: selectedSegment.map((s) => s.segmentID),
        filters: arr,
        element1: currentMode !== "pie" ? bubbleSettings.element1 : "",
        element2: currentMode !== "pie" ? bubbleSettings.element2 : "",
        element3: currentMode !== "pie" ? bubbleSettings.element3 : "",
      });
      // if (currentMode === "pie") {
      //   setSegmentsChartObj((prev) => ({
      //     ...prev,
      //     categories: prev.categories.map((category, i) =>
      //       arr.some((f) => f.index === i)
      //         ? { ...category, changed: false }
      //         : category
      //     ),
      //   }));
      // }
      console.log("resp", resp);
      const s = await refetchSegments();
      if (resp.baseSegmentsCount) {
        setBaseSegmentsCount(resp.baseSegmentsCount);
      }
      setCompositionData(
        currentMode === "pie"
          ? resp.results
          : validateComposition(s, resp.results[0].composition)
      );
      setBubbleChartData(resp.results[0].sample);

      setLoadingData(false);
    }, 1000);

    function validateComposition(s, compositionNumber) {
      // If we get more player than we currently have in "everyone" segment (may happen), we must clamp this value
      // to prevent visual bug on segment pie
      const everyoneSegmentNumber = s.segments.find(
        (s) => s.segmentID === "everyone"
      )?.segmentPlayerCount;
      if (!everyoneSegmentNumber) return compositionNumber; // happens if we didn't get "everyone" segment yet
      return clamp(compositionNumber, 0, everyoneSegmentNumber);
    }
  }

  const [isLoading_staticSegment, setIsLoading_staticSegment] = useState(false);
  async function createStaticSegment(segmentName, segmentComment) {
    setIsLoading_staticSegment(true);
    const resp = await buildStaticSegmentFromComposition({
      gameID: game.gameID,
      branch: branch,
      environment: environment,
      newSegmentName: segmentName,
      newSegmentComment: segmentComment,
      baseSegment: selectedSegment.map((s) => s.segmentID),
      filters: filters,
    });
    if (resp.success) {
      triggerAlert("Successfully created static segment", "success");
    } else {
      triggerAlert(
        "Could not create static segment, please contact support",
        "error"
      );
    }
    setIsLoading_staticSegment(false);
  }

  const [compositionAvgProfile, setCompositionAvgProfile] = useState([]);
  async function makeAvgProfile(players) {
    if (!players) return;
    const templateNames = []
      .concat(
        elements.analytics.map((template) => ({
          name: template.templateName,
          id: template.templateID,
        }))
      )
      .concat(
        elements.statistics.map((template) => ({
          name: template.templateName,
          id: template.templateID,
        }))
      )
      .concat(
        elements.inventory.map((template) => ({
          name: template.templateName,
          id: template.templateID,
        }))
      );

    let elementData = {};

    for (let player of players) {
      let elements = player.elements;

      for (let element of elements) {
        let { elementID, elementValue } = element;

        if (!elementData[elementID]) {
          elementData[elementID] = {
            name:
              templateNames.find((t) => t.id === elementID)?.name || elementID,
            templateID: elementID,
            totalPlayers: 0,
            subProfiles: {},
          };
        }

        elementData[elementID].totalPlayers++;

        if (!elementData[elementID].subProfiles[elementValue]) {
          elementData[elementID].subProfiles[elementValue] = {
            value: elementValue,
            players: 0,
          };
        }

        elementData[elementID].subProfiles[elementValue].players++;
      }
    }

    let avgProfile = Object.values(elementData).map((element) => {
      let maxSubProfile = Object.values(element.subProfiles).reduce((a, b) =>
        a.players > b.players ? a : b
      );
      let subProfiles = Object.values(element.subProfiles).filter(
        (subProfile) => subProfile.value !== maxSubProfile.value
      );
      return {
        name: element.name,
        value: maxSubProfile.value,
        templateID: element.templateID,
        players: maxSubProfile.players,
        subProfiles: subProfiles,
      };
    });
    setCompositionAvgProfile(avgProfile);
  }

  useEffect(() => {
    makeAvgProfile(bubbleChartData);
    setBubbleChartObj((prevSegmentsChartObj) => ({
      ...prevSegmentsChartObj,
      metrics: prevSegmentsChartObj.metrics.map((metric, i) => ({
        ...metric,
        data: {
          data: bubbleChartData
            ? bubbleChartData.map((dataItem) => dataItem)
            : [],
        },
      })),
      axisY: bubbleSettings.element1,
      axisX: bubbleSettings.element2,
      radius: bubbleSettings.element3,
    }));
    setElementsTypes({
      y: getElementType(bubbleSettings.element1),
      x: getElementType(bubbleSettings.element2),
      r: getElementType(bubbleSettings.element3),
    });
    calculateCorrelation(bubbleChartData);
  }, [bubbleChartData]);

  const fetchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [errorFilters, setErrorFilters] = useState([]);

  const lastSelectedSegment = useRef();
  function checkLastSegment() {
    const prevSegments = lastSelectedSegment.current;
    const currentSegments = selectedSegment;
    if (!prevSegments) {
      lastSelectedSegment.current = currentSegments;
      return true;
    }
    if (
      prevSegments.length === currentSegments.length &&
      prevSegments.every((s, i) => s.segmentID === currentSegments[i].segmentID)
    ) {
      return false;
    }

    lastSelectedSegment.current = currentSegments;
    return true;
  }
  async function tryRefetchComposition() {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      if (currentMode === "pie") {
        const allFilters = segmentsChartObj.categories.flatMap(
          (category) => category.filters
        );

        if (allFilters.length > 0) {
          const emptyFilters = allFilters.filter((f) => f.filterValue === "");

          if (emptyFilters.length === 0) {
            setErrorFilters([]);
            fetchComposition(abortControllerRef.current.signal);
          } else {
            setErrorFilters(emptyFilters.map((f) => f.uid));
          }
        } else {
          fetchComposition(abortControllerRef.current.signal);
        }
      } else {
        if (filters.length > 0) {
          if (!filters.some((f) => f.filterValue === "")) {
            setErrorFilters([]);
            fetchComposition(abortControllerRef.current.signal);
          } else {
            setErrorFilters(
              filters.filter((f) => f.filterValue === "").map((f) => f.uid)
            );
          }
        } else {
          fetchComposition(abortControllerRef.current.signal);
        }
      }
    }, 500); // 500ms debounce
  }
  useEffect(() => {
    tryRefetchComposition();
  }, [filters, selectedSegment, bubbleSettings, currentMode]);

  useEffect(() => {
    if (currentMode === "pie") {
      tryRefetchComposition();
    }
    if (segmentsChartObj.categories.length - 1 < selectedSegmentChartCategory) {
      setSelectedSegmentChartCategory(segmentsChartObj.categories.length - 1);
    }
  }, [segmentsChartObj.categories]);

  useEffect(() => {
    setSegmentsChartObj((prev) => ({
      ...prev,
      chartSettings: {
        ...prev.chartSettings,
        fullWidth: currentMode === "pie" ? true : false,
      },
      metrics: prev.metrics.map((metric, i) => ({
        ...metric,
        datasetConfig: {
          ...metric.datasetConfig,
          config: {
            ...metric.datasetConfig.config,
            ...defaultPieChartTheme,
          },
        },
      })),
    }));
  }, [currentMode]);

  useEffect(() => {
    if (!checkLastSegment()) {
      // In case a segments werent changed for real
      return;
    }
    setCompositionData();
  }, [selectedSegment]);
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  useEffect(() => {
    if (currentMode !== "both") return;
    if (
      selectedSegment.length === 0 ||
      selectedSegment.some((s) => s.segmentPlayerCount === undefined)
    )
      return;

    // let categories = "Selected Segments"
    // [selectedSegment.map((s) => s.segmentName).join(",\n")];
    // if (compositionData !== undefined) {
    //   categories.push("Filtered");
    // }
    let data = [];
    let totalSegmentsPlayerCount = 0;
    totalSegmentsPlayerCount = baseSegmentsCount;
    // if (selectedSegment.some((s) => s.segmentID === "everyone")) {
    //   // If 'everyone' is in array of selected segment, simply count the number of it's players
    //   totalSegmentsPlayerCount += segments.find(
    //     (s) => s.segmentID === "everyone"
    //   ).segmentPlayerCount;
    // } else {
    //   // If we have other segment and it's only one segment, use it's count. Otherwise we should wait for backend to tell us
    //   // how many players in the selected cohorts
    // }
    if (compositionData !== undefined) {
      data = [totalSegmentsPlayerCount - compositionData, compositionData];
    } else {
      data = [totalSegmentsPlayerCount];
    }

    setSegmentsChartObj((prevSegmentsChartObj) => ({
      ...prevSegmentsChartObj,
      // categories: categories,
      metrics: prevSegmentsChartObj.metrics.map((metric, i) => ({
        ...metric,
        data: {
          data: data,
        },
      })),
    }));
  }, [selectedSegment, compositionData, currentMode]);

  useEffect(() => {
    if (currentMode !== "pie") return;
    if (
      selectedSegment.length === 0 ||
      selectedSegment.some((s) => s.segmentPlayerCount === undefined)
    )
      return;

    let data = [];
    let totalSegmentsPlayerCount = 0;
    totalSegmentsPlayerCount = baseSegmentsCount;
    // if (selectedSegment.some((s) => s.segmentID === "everyone")) {
    //   // If 'everyone' is in array of selected segment, simply count the number of it's players
    //   totalSegmentsPlayerCount += segments.find(
    //     (s) => s.segmentID === "everyone"
    //   ).segmentPlayerCount;
    // } else {
    //   // If we have other segment and it's only one segment, use it's count. Otherwise we should wait for backend to tell us
    //   // how many players in the selected cohorts
    // }

    function transformResults(data) {
      if (!Array.isArray(data)) return [];

      const maxIndex = segmentsChartObj.categories.length - 1;
      const compositions = new Array(maxIndex + 1).fill(0);

      data.forEach(({ composition, categoryIndex }) => {
        compositions[categoryIndex] = composition;
      });

      return compositions;
    }

    function adjustCompositionData(data) {
      if (data.length === 0) return [];

      const firstValue = data[0];
      const sumOfOthers = data.slice(1).reduce((sum, num) => sum + num, 0);

      if (firstValue === 0) {
        return [0, ...data.slice(1)];
      }

      return [firstValue - sumOfOthers, ...data.slice(1)];
    }

    if (compositionData !== undefined && compositionData.length > 1) {
      data = transformResults(compositionData);

      const firstValue = data[0];
      data = data.map((val, idx) =>
        idx !== 0 && val === firstValue ? 0 : val
      );

      data = adjustCompositionData(data);
    } else {
      data = [totalSegmentsPlayerCount];
    }

    setSegmentsChartObj((prevSegmentsChartObj) => ({
      ...prevSegmentsChartObj,
      metrics: prevSegmentsChartObj.metrics.map((metric, i) => ({
        ...metric,
        data: {
          data: data,
        },
        datasetConfig: {
          ...metric.datasetConfig,
          config: {
            ...metric.datasetConfig.config,
            borderColor: data.map((d, i) =>
              darkenColor(chroma(makeRandomColor(i)).hex())
            ),
            borderWidth: 2,
            backgroundColor: data.map((d, i) =>
              darkenColor(chroma(makeRandomColor(i)).alpha(0.3).hex())
            ),
          },
        },
      })),
    }));
  }, [selectedSegment, compositionData, currentMode]);

  function addSegmentChartCategory() {
    setSegmentsChartObj((prevSegmentsChartObj) => ({
      ...prevSegmentsChartObj,
      categories: [
        ...prevSegmentsChartObj.categories,
        {
          name: "New Category",
          filters: [],
          isHidden: false,
          isCustom: true,
          changed: true,
        },
      ],
      metrics: prevSegmentsChartObj.metrics.map((metric, i) => ({
        ...metric,
        data: {
          data: [...metric.data.data, 0],
        },
      })),
    }));
  }
  function changeSegmentChartCategory(index, newName) {
    setSegmentsChartObj((prevSegmentsChartObj) => {
      prevSegmentsChartObj.categories[index].name = newName;
      return {
        ...prevSegmentsChartObj,
        categories: prevSegmentsChartObj.categories,
      };
    });
  }
  function selectSegmentChartCategory(index) {
    setSelectedSegmentChartCategory(index);
  }
  function toggleSegmentChartCategoryHidden(index) {
    setSegmentsChartObj((prevSegmentsChartObj) => ({
      ...prevSegmentsChartObj,
      categories: prevSegmentsChartObj.categories.map((category, i) =>
        i === index
          ? { ...category, isHidden: !category.isHidden, changed: true }
          : category
      ),
    }));
  }
  function removeSegmentChartCategory(index) {
    setSegmentsChartObj((prevSegmentsChartObj) => ({
      ...prevSegmentsChartObj,
      categories: prevSegmentsChartObj.categories.filter((_, i) => i !== index),
    }));
  }

  useEffect(() => {
    fetchData();
  }, []);

  function formatPlayerCount(value, fixedAmount = 0) {
    // Format 1000 to 1 000
    if (value === undefined) return 0;

    const parsedValue = parseFloat(value).toFixed(fixedAmount).toString();

    const formattedDollars = parsedValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    const formattedValue = `${formattedDollars}`;

    return formattedValue;
  }

  function getFilterName(filter) {
    if (elements.analytics.some((e) => e.templateID === filter.templateID)) {
      return elements.analytics.find((e) => e.templateID === filter.templateID)
        .templateName;
    } else if (
      elements.statistics.some((e) => e.templateID === filter.templateID)
    ) {
      return elements.statistics.find((e) => e.templateID === filter.templateID)
        .templateName;
    } else if (
      elements.inventory.some((e) => e.templateID === filter.templateID)
    ) {
      return elements.inventory.find((e) => e.templateID === filter.templateID)
        .templateName;
    }
    return "Unknown";
  }

  function setFilterCondition(categoryIndex, index, condition) {
    setSelectedPreset(null);

    if (currentMode === "pie") {
      setSegmentsChartObj((prevSegmentsChartObj) => ({
        ...prevSegmentsChartObj,
        categories: prevSegmentsChartObj.categories.map((category, i) =>
          i === categoryIndex
            ? {
                ...category,
                filters: category.filters.map((f, fi) =>
                  fi === index ? { ...f, filterCondition: condition } : f
                ),
                changed: true,
              }
            : category
        ),
      }));
    } else {
      setFilters((prevFilters) =>
        prevFilters.map((f, i) =>
          i === index ? { ...f, filterCondition: condition } : f
        )
      );
    }
  }

  function setFilterValue(categoryIndex, index, value) {
    setSelectedPreset(null);

    if (currentMode === "pie") {
      setSegmentsChartObj((prevSegmentsChartObj) => ({
        ...prevSegmentsChartObj,
        categories: prevSegmentsChartObj.categories.map((category, i) =>
          i === categoryIndex
            ? {
                ...category,
                filters: category.filters.map((f, fi) =>
                  fi === index ? { ...f, filterValue: value } : f
                ),
                changed: false,
              }
            : category
        ),
      }));
    } else {
      setFilters((prevFilters) =>
        prevFilters.map((f, i) =>
          i === index ? { ...f, filterValue: value } : f
        )
      );
    }
  }

  function removeFilter(index) {
    setSelectedPreset(null);

    if (currentMode === "pie") {
      setSegmentsChartObj((prev) => {
        let filters = [
          ...prev.categories[selectedSegmentChartCategory].filters,
        ];

        // Remove the filter
        filters = filters.filter((_, i) => i !== index);

        // Remove the "and" if it exists
        if (
          filters.length > 0 &&
          index > 0 &&
          filters[index - 1]?.condition === "and"
        ) {
          filters = filters.filter((_, i) => i !== index - 1);
        }
        prev.categories[selectedSegmentChartCategory].filters = filters;

        return {
          ...prev,
          categories: [...prev.categories],
        };
      });
    } else {
      setFilters((prevFilters) => {
        let temp = prevFilters.filter((_, i) => i !== index);

        // Remove excess "and"
        if (
          temp.length > 0 &&
          index > 0 &&
          temp[index - 1]?.condition === "and"
        ) {
          temp = temp.filter((_, i) => i !== index - 1);
        }

        return temp;
      });
    }
  }

  function getElementType(elementID) {
    if (elementID === "" || !elementID) return "";

    let temp;
    let template =
      elements.analytics.find((t) => t.templateID === elementID) ||
      elements.statistics.find((t) => t.templateID === elementID) ||
      elements.inventory.find((t) => t.templateID === elementID);

    if (analyticsEvents !== undefined) {
      temp = getAnalyticsTemplateValueType(template);
    }
    if (temp) {
      return temp;
    }

    if (template.templateDefaultVariantType) {
      return template.templateDefaultVariantType;
    }
    if (template.templateType) {
      return template.templateType;
    }
  }

  function filterForbiddenTypes(template, isAnalytics) {
    if (!analyticsEvents) return false;
    if (isAnalytics) {
      if (getAnalyticsTemplateValueType(template) === "string") {
        return false;
      }
    } else {
      if (
        template.templateType === "string" ||
        template.templateDefaultVariantType === "date" ||
        template.templateDefaultVariantType === "string"
      ) {
        return false;
      }
    }
    return true;
  }

  function addFilterToList(filter) {
    if (currentMode === "pie") {
      setSegmentsChartObj((prev) => {
        let filters = [
          ...prev.categories[selectedSegmentChartCategory].filters,
        ];
        if (filters.length === 0) {
          filters = [...filters, filter];
        } else {
          filters = [
            ...filters,
            {
              condition: "and",
            },
            filter,
          ];
        }

        prev.categories[selectedSegmentChartCategory].filters = filters;
        prev.categories[selectedSegmentChartCategory].changed = true;
        return {
          ...prev,
        };
      });
      return;
    } else {
      if (filters.length === 0) {
        setFilters([...filters, filter]);
      } else {
        setFilters([
          ...filters,
          {
            condition: "and",
          },
          filter,
        ]);
      }
    }
  }

  function getElementsNames() {
    return elements.analytics
      .map((template) => ({
        id: template.templateID,
        name: template.templateName,
      }))
      .concat(
        elements.statistics.map((template) => ({
          id: template.templateID,
          name: template.templateName,
        }))
      )
      .concat(
        elements.inventory.map((template) => ({
          id: template.templateID,
          name: template.templateName,
        }))
      );
  }

  const [selectedData, setSelectedData] = useState([]);
  const [selectedDataVisual, setSelectedDataVisual] = useState([]);
  const [selectedClientIDs, setSelectedClientIDs] = useState([]);
  useEffect(() => {
    if (bubbleChartData === undefined) return;
    let targetData = bubbleChartData.filter((dataItem) =>
      selectedData.some((selectedItem) => selectedItem.id === dataItem.clientID)
    );
    if (targetData.length > 0) {
      makeAvgProfile(targetData);
      setSelectedClientIDs(targetData.map((d) => d.clientID));
    } else {
      makeAvgProfile(bubbleChartData);
      setSelectedClientIDs(bubbleChartData.map((d) => d.clientID));
    }

    const elementNames = getElementsNames();
    const frequencyMap = {};
    targetData.forEach((player) => {
      player.elements.forEach((element) => {
        const { elementID, elementValue } = element;

        if (!frequencyMap[elementID]) {
          frequencyMap[elementID] = {};
        }

        if (!frequencyMap[elementID][elementValue]) {
          frequencyMap[elementID][elementValue] = 1;
        } else {
          frequencyMap[elementID][elementValue]++;
        }
      });
    });

    const elementIDFrequencyList = [];

    for (const elementID in frequencyMap) {
      if (Object.hasOwnProperty.call(frequencyMap, elementID)) {
        const values = [];
        for (const elementValue in frequencyMap[elementID]) {
          if (
            Object.hasOwnProperty.call(frequencyMap[elementID], elementValue)
          ) {
            const frequency = frequencyMap[elementID][elementValue];
            values.push({ [elementValue]: frequency });
          }
        }
        elementIDFrequencyList.push({
          id: elementID,
          name: elementNames.find((e) => e.id === elementID)?.name,
          values: values,
        });
      }
    }
    setSelectedDataVisual(elementIDFrequencyList);
  }, [selectedData]);
  function toggleInversion(axisID) {
    setBubbleChartAxisesInversions((prevInversions) => ({
      ...prevInversions,
      [`inverted_${axisID}`]: !prevInversions[`inverted_${axisID}`],
    }));
  }

  function getMostFrequentValue(element) {
    let mostFrequentValue = null;
    let maxFrequency = -Infinity;

    element.values.forEach((valueObj) => {
      const value = Object.keys(valueObj)[0];
      const frequency = valueObj[value];

      if (frequency > maxFrequency) {
        mostFrequentValue = value;
        maxFrequency = frequency;
      }
    });

    return mostFrequentValue;
  }

  function getFrequencyPercentage(element, value) {
    let totalFrequency = 0;
    let targetFrequency = 0;

    element.values.forEach((valueObj) => {
      const val = Object.keys(valueObj)[0];
      const frequency = valueObj[val];

      const type = getElementType(element.id);
      totalFrequency += frequency;
      if (type === "date") {
        if (value.includes(" - ")) {
          //   "date",
          const [minDate, maxDate] = value
            .split(" - ")
            .map((date) => dayjs.utc(date));

          const checkDate = dayjs.utc(val);

          // ,
          if (
            checkDate.isBetween(
              minDate.toISOString(),
              maxDate.toISOString(),
              "second",
              []
            )
          ) {
            targetFrequency += frequency;
          }
        } else {
          //  value —
          if (val === value) {
            targetFrequency = frequency;
          }
        }
      } else {
        if (value.includes("-")) {
          //    ,
          const [min, max] = value.split("-").map(Number);
          if (val >= min && val <= max) {
            targetFrequency += frequency;
          }
        } else {
          //  value —
          if (val === value) {
            targetFrequency = frequency;
          }
        }
      }
    });

    const percentage = (targetFrequency / totalFrequency) * 100;
    return percentage.toFixed(2);
  }

  const [selectedPreset, setSelectedPreset] = useState(null);
  const [presets, setPresets] = useState([]);
  function createPreset() {
    let temp = {
      uid: currentMode + "_" + shortid.generate(),
      name: "New preset " + (presets.length + 1),
      selectedSegment: selectedSegment.map((s) => s.segmentID),
    };
    if (currentMode === "pie") {
      temp.categories = segmentsChartObj.categories;
    } else {
      temp.filters = filters;
      temp.bubbleSettings = bubbleSettings;
      temp.bubbleChartAxisesInversions = bubbleChartAxisesInversions;
    }
    setPresets([...presets, temp]);
  }
  function loadPreset(preset) {
    setFilters(preset.filters);
    setBubbleSettings(preset.bubbleSettings);
    setSelectedSegment(
      segments.filter((s) =>
        preset.selectedSegment.some((seg) => seg === s.segmentID)
      )
    );
    setBubbleChartAxisesInversions(preset.bubbleChartAxisesInversions);
    if (preset.categories) {
      setSegmentsChartObj((prev) => ({
        ...prev,
        categories: preset.categories,
      }));
    }
    setSelectedPreset(preset);
    setSelectedData([]);
  }
  function setPresetName(uid, newName) {
    const tempPresets = [...presets];
    tempPresets[tempPresets.findIndex((p) => p.uid === uid)].name = newName;
    setPresets(tempPresets);

    setProfileCompositionPreset({
      gameID: game.gameID,
      branch: branch,
      presets: tempPresets,
    });
  }
  function removePreset(uid) {
    const tempPresets = [...presets];
    tempPresets.splice(
      tempPresets.findIndex((p) => p.uid === uid),
      1
    );
    setPresets(tempPresets);

    setProfileCompositionPreset({
      gameID: game.gameID,
      branch: branch,
      presets: tempPresets,
    });
  }
  function savePreset(uid) {
    const tempPresets = [...presets];
    const i = tempPresets.findIndex((p) => p.uid === uid);

    if (currentMode === "pie") {
      tempPresets[i].categories = segmentsChartObj.categories;
      tempPresets[i].selectedSegment = selectedSegment.map((s) => s.segmentID);
    } else {
      tempPresets[i].filters = filters;
      tempPresets[i].bubbleSettings = bubbleSettings;
      tempPresets[i].selectedSegment = selectedSegment.map((s) => s.segmentID);
      tempPresets[i].bubbleChartAxisesInversions = bubbleChartAxisesInversions;
    }
    setPresets(tempPresets);

    setProfileCompositionPreset({
      gameID: game.gameID,
      branch: branch,
      presets: tempPresets,
    });
  }

  function PresetItem({ preset, index }) {
    const [isHovered, setIsHovered] = useState(false);

    const [showNameInput, setShowNameInput] = React.useState(false);
    const [nameInputValue, setNameInputValue] = React.useState("");
    const inputRef = React.useRef();
    function startRenameConfig(e) {
      setShowNameInput(true);
      setNameInputValue(preset.name);
    }
    function endRenameConfig(e, blur) {
      if ((e.keyCode !== 13) & !blur) return;
      setShowNameInput(false);
      setPresetName(preset.uid, nameInputValue);
    }

    // Using useEffect to set focus on input when renaming config.
    // Using other methods will result in a bug with the input not being focused.
    useEffect(() => {
      if (showNameInput) {
        inputRef.current.focus();
      }
    }, [showNameInput]);

    return (
      <div
        key={index}
        className={s.presetItem}
        // style={{ backgroundColor: showNameInput ? "#2d2c51" : "" }}
      >
        {showNameInput && (
          <Tooltip placement="top" title="Press Enter to apply">
            <Input
              spellCheck={false}
              inputRef={inputRef}
              sx={{
                pl: "16px",
                whiteSpace: "pre-wrap",
                textTransform: "none",
                fontSize: "14px",
                fontWeight: "regular",
                textAlign: "start",
              }}
              value={nameInputValue}
              onChange={(e) => setNameInputValue(e.target.value)}
              onKeyDown={(e) => endRenameConfig(e)}
              onBlur={(e) => endRenameConfig(e, true)}
            ></Input>
          </Tooltip>
        )}
        {!showNameInput && (
          <Button
            onClick={() => loadPreset(preset)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            sx={{
              height: "30px",
              textTransform: "none",
              display: "flex",
              alignItems: "center",
            }}
            fullWidth
            variant={
              selectedPreset && selectedPreset.uid === preset.uid
                ? "contained"
                : "outlined"
            }
          >
            {trimStr(preset.name, 35)}

            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                marginRight: "10px",
              }}
            >
              <Tooltip title={"Save current settings in this preset"}>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    savePreset(preset.uid);
                  }}
                  sx={{
                    p: "2px",
                    mr: 2,
                    display: isHovered ? "block" : "none",
                  }}
                >
                  <SaveSharpIcon
                    sx={{ fontSize: "18px" }}
                    htmlColor={
                      selectedPreset && selectedPreset.uid === preset.uid
                        ? "#e7e7e7"
                        : "#121212"
                    }
                  />
                </IconButton>
              </Tooltip>

              <Tooltip title={"Edit name"}>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    startRenameConfig(e);
                  }}
                  sx={{
                    p: "2px",
                    mr: 2,
                    display: isHovered ? "block" : "none",
                  }}
                >
                  <EditIcon
                    sx={{ fontSize: "18px" }}
                    htmlColor={
                      selectedPreset && selectedPreset.uid === preset.uid
                        ? "#e7e7e7"
                        : "#121212"
                    }
                  />
                </IconButton>
              </Tooltip>

              <Tooltip title={"Remove preset"}>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    removePreset(preset.uid);
                  }}
                  sx={{ p: "2px", display: isHovered ? "block" : "none" }}
                >
                  <DeleteIcon
                    sx={{ fontSize: "18px" }}
                    htmlColor={
                      selectedPreset && selectedPreset.uid === preset.uid
                        ? "#e7e7e7"
                        : "#121212"
                    }
                  />
                </IconButton>
              </Tooltip>
            </div>
          </Button>
        )}
      </div>
    );
  }

  const CustomWidthTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
  ))({
    [`& .${tooltipClasses.tooltip}`]: {
      maxWidth: 700,
    },
  });
  function AnchorElTooltips(props) {
    const positionRef = React.useRef({
      x: 0,
      y: 0,
    });
    const popperRef = React.useRef(null);
    const areaRef = React.useRef(null);

    const handleMouseMove = (event) => {
      positionRef.current = { x: event.clientX, y: event.clientY };

      if (popperRef.current != null) {
        popperRef.current.update();
      }
    };

    return (
      <CustomWidthTooltip
        open={props.open}
        title={props.title}
        placement={props.placement}
        componentsProps={props.componentsProps}
        PopperProps={{
          popperRef,
          anchorEl: {
            getBoundingClientRect: () => {
              return new DOMRect(0, 0, 0, 0);
            },
          },
        }}
      >
        <Box ref={areaRef} sx={props.sx}>
          {props.children}
        </Box>
      </CustomWidthTooltip>
    );
  }

  function pickElement(player, targetElementID, asNumber = true) {
    if (targetElementID === "") return 0;
    let foundElementValue = player.elements.find(
      (element) => element.elementID === targetElementID
    );
    if (!foundElementValue) {
      return 0;
    } else {
      let formattedValue = foundElementValue.elementValue;
      let valueFormat = getElementType(foundElementValue.elementID);
      if (valueFormat === "date") {
        if (asNumber) {
          formattedValue = dayjs
            .utc(foundElementValue.elementValue)
            .diff(dayjs.utc().format(), "minute");
        } else {
          formattedValue = dayjs
            .utc(foundElementValue.elementValue)
            .format("DD.MM.YYYY HH:mm");
        }
      } else if (valueFormat === "float") {
        formattedValue = parseFloat(foundElementValue.elementValue);
      } else if (valueFormat === "integer") {
        formattedValue = parseInt(foundElementValue.elementValue);
      } else if (valueFormat === "bool") {
        if (asNumber) {
          formattedValue = foundElementValue.elementValue === "True" ? 1 : 0;
        } else {
          formattedValue = foundElementValue.elementValue;
        }
      }
      return formattedValue;
    }
  }

  const [correlationData, setCorrelationData] = useState();
  function calculateCorrelation(data) {
    // If there is no data, return
    if (data == undefined || data.length === 0) {
      if (bubbleSettings.element1 === "" && bubbleSettings.element2 === "") {
        setCorrelationData({});
      }
      setCorrelationData({});
      return;
    }
    const sums = { x: 0, y: 0, r: 0 };
    const products = { xy: 0, xr: 0, yr: 0 };
    const n = data.length;

    data.forEach((point) => {
      sums.x += pickElement(point, bubbleSettings.element1);
      sums.y += pickElement(point, bubbleSettings.element2);
      sums.r += pickElement(point, bubbleSettings.element3);
      products.xy +=
        pickElement(point, bubbleSettings.element1) *
        pickElement(point, bubbleSettings.element2);
      products.xr +=
        pickElement(point, bubbleSettings.element1) *
        pickElement(point, bubbleSettings.element3);
      products.yr +=
        pickElement(point, bubbleSettings.element2) *
        pickElement(point, bubbleSettings.element3);
    });

    const means = {
      x: sums.x / n,
      y: sums.y / n,
      r: sums.r / n,
    };

    const squares = {
      x: 0,
      y: 0,
      r: 0,
    };
    data.forEach((point) => {
      squares.x += Math.pow(
        pickElement(point, bubbleSettings.element1) - means.x,
        2
      );
      squares.y += Math.pow(
        pickElement(point, bubbleSettings.element2) - means.y,
        2
      );
      squares.r += Math.pow(
        pickElement(point, bubbleSettings.element3) - means.r,
        2
      );
    });

    const covariances = {
      xy: products.xy / n - means.x * means.y,
      xr: products.xr / n - means.x * means.r,
      yr: products.yr / n - means.y * means.r,
    };

    const stdDeviations = {
      x: Math.sqrt(squares.x / n),
      y: Math.sqrt(squares.y / n),
      r: Math.sqrt(squares.r / n),
    };

    const correlations = {
      xy: (covariances.xy / (stdDeviations.x * stdDeviations.y)).toFixed(4),
      xr: (covariances.xr / (stdDeviations.x * stdDeviations.r)).toFixed(4),
      yr: (covariances.yr / (stdDeviations.y * stdDeviations.r)).toFixed(4),
    };
    setCorrelationData(correlations);
  }

  function getCorrelationData(target) {
    if (correlationData === undefined) return "No data";
    switch (target) {
      case "xy":
        if (correlationData.xy === undefined || correlationData.xy === "NaN")
          return "No data";
        return correlationData.xy;
      case "xr":
        if (correlationData.xr === undefined || correlationData.xr === "NaN")
          return "No data";
        return correlationData.xr;
      case "yr":
        if (correlationData.yr === undefined || correlationData.yr === "NaN")
          return "No data";
        return correlationData.yr;
    }
  }

  // Below we manage the popover for the selected data.
  // We want it to be above the overall container so it doesnt obstruct the list of elements,
  // and here we manage it's appearance and disappearance, and also handle popover hovering because it is interactive.
  const [hoveredElement, setHoveredElement] = useState(null);
  const [elementSelectedByForce, setElementSelectedByForce] = useState(null);
  const unhoverTimer = useRef(null);
  function forceClose() {
    setElementSelectedByForce(null);
    setHoveredElement(null);
  }
  function forceSelectElement(element) {
    if (
      elementSelectedByForce !== null &&
      elementSelectedByForce.id === element.id
    ) {
      setElementSelectedByForce(null);
    } else {
      setElementSelectedByForce(element);
      setHoveredElement(element);
      clearUnhoverTimer();
    }
  }
  function onHoverElement(element) {
    if (!elementSelectedByForce) {
      clearUnhoverTimer();
      setHoveredElement(element);
    }
  }
  function clearUnhoverTimer() {
    if (unhoverTimer.current !== null) {
      clearTimeout(unhoverTimer.current);
    }
  }
  function unhoverElement() {
    if (unhoverTimer.current !== null) {
      clearTimeout(unhoverTimer.current);
    }
    unhoverTimer.current = setTimeout(() => {
      if (!elementSelectedByForce) {
        setHoveredElement(null);
      }
    }, 500);
  }

  function CorrelationIndicator({ correlation }) {
    if (
      correlation === undefined ||
      correlation === null ||
      correlation === "No data"
    ) {
      return <div></div>;
    } else {
      let type;
      let color;
      let direction;
      if (Math.abs(correlation) >= 0 && Math.abs(correlation) <= 0.3) {
        type = "weakpositive";
        color = "#977400";
        direction = correlation > 0 ? "180deg" : "0deg";
      } else if (Math.abs(correlation) > 0.3 && Math.abs(correlation) <= 0.7) {
        type = "mediumpositive";
        color = correlation > 0 ? "#00c50a" : "#970000";
        direction = correlation > 0 ? "180deg" : "0deg";
      } else if (Math.abs(correlation) > 0.7 && Math.abs(correlation) <= 1) {
        type = "strongpositive";
        color = correlation > 0 ? "#199700" : "#970000";
        direction = correlation > 0 ? "180deg" : "0deg";
      }
      return (
        <div className={s.correlationIndicator}>
          <div className={s.correlationIndicatorValue}>
            {type === "weakpositive" ? (
              <KeyboardArrowDownIcon sx={{ color: color, rotate: direction }} />
            ) : type === "mediumpositive" ? (
              <KeyboardArrowDownIcon sx={{ color: color, rotate: direction }} />
            ) : (
              <KeyboardDoubleArrowDownIcon
                sx={{ color: color, rotate: direction }}
              />
            )}
          </div>
        </div>
      );
    }
  }

  function toggleSelectedSegment(newSegment) {
    setSelectedSegment((prevSegments) => {
      const isSelected = prevSegments.some(
        (segment) => segment.segmentID === newSegment.segmentID
      );

      const newArray = isSelected
        ? prevSegments.filter(
            (segment) => segment.segmentID !== newSegment.segmentID
          )
        : [...prevSegments, newSegment];

      return newArray.length === 0 ? [segments[0]] : newArray;
    });
  }

  function getIsAbTestSegment(segment) {
    if (segment.segmentID.startsWith("abtest_")) {
      const testId = segment.segmentID.slice(7);
      return abTests.some((t) => t.id === testId);
    }
    return false;
  }
  function getAbTestSegmentName(segment) {
    if (segment.segmentID.startsWith("abtest_")) {
      const testId = segment.segmentID.slice(7);
      return abTests.find((t) => t.id === testId).name;
    }
    return false;
  }
  function getIsFlowSegment(segment) {
    if (segment.segmentID.startsWith("flow_")) {
      const flowSid = segment.segmentID.split("_")[1];
      return flows.some((flow) => flow.sid === flowSid);
    }
    return false;
  }
  function getIsFlowCaseSegment(segment) {
    if (
      segment.segmentID.startsWith("flow_") &&
      segment.segmentID.includes("_splitTest_")
    ) {
      const flowSid = segment.segmentID.split("_")[1];
      return flows.some((flow) => flow.sid === flowSid);
    }
    return false;
  }
  function getFlowSegmentName(segment) {
    if (segment.segmentID.startsWith("flow_")) {
      const flowSid = segment.segmentID.slice(5);
      let flowName = "";
      flows.map((flow) => {
        if (flow.sid === flowSid) {
          flowName = flow.sid === flowSid ? flow.name : null;
        }
      });
      return flowName;
    }
    return false;
  }

  function getAnalyticsTemplateValueType(template) {
    switch (template.templateMethod) {
      case "numberOfEvents":
      case "numberOfEventsForTime":
      case "meanForTime":
      case "summ":
      case "summForTime":
        return "float";
      case "date":
        return "date";
      default:
        return (
          analyticsEvents
            .find((e) => e.eventID === template.templateAnalyticEventID)
            ?.values.find(
              (v) => v.uniqueID === template.templateEventTargetValueId
            )?.valueFormat || template.templateDefaultVariantType
        );
    }
  }

  return (
    <div className={s.mainContainer}>
      <CustomDragLayer />
      <Backdrop
        sx={{
          position: "absolute",
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
        open={fetchingAllData}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <Helmet>
        <title>{titles.playerComposition}</title>
      </Helmet>

      {/* The list of elements and segments */}
      <div className={s.upperBody}>
        <div className={s.segmentsList}>
          <div className={s.header}>
            <Typography
              variant="h6"
              color={"text.secondary"}
              sx={{
                lineHeight: "14px",
                mb: 0,
                p: "0.5rem",
                fontSize: "14px",
                fontWeight: "400",
                textAlign: "start",
              }}
            >
              Target segments
            </Typography>
          </div>
          <div className={s.list}>
            <div className={s.innerList}>
              {segments
                .sort((a, b) => b.segmentPlayerCount - a.segmentPlayerCount)
                .map((segment, index) => (
                  <Button
                    key={index}
                    variant={
                      selectedSegment.some(
                        (s) => s.segmentID === segment.segmentID
                      )
                        ? "contained"
                        : ""
                    }
                    onClick={() => {
                      setSelectedPreset(null);
                      toggleSelectedSegment(segment);
                    }}
                    sx={{
                      pr: 4,
                      pl: 3,
                      textTransform: "none",
                      width: "100%",
                      height: "45px",
                      fontSize: "16px",
                      fontWeight: "regular",
                      textAlign: "start",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div className={s.segmentName}>
                      {getIsAbTestSegment(segment)
                        ? getAbTestSegmentName(segment)
                        : getIsFlowSegment(segment) &&
                            !getIsFlowCaseSegment(segment)
                          ? getFlowSegmentName(segment)
                          : segment.segmentName}
                    </div>
                    <div className={s.segmentCount}>
                      {formatPlayerCount(segment.segmentPlayerCount)} players
                    </div>
                  </Button>
                ))}
            </div>
          </div>
        </div>

        <div className={s.elementsList}>
          <div className={s.header}>
            {/* <Typography
              variant="h6"
              color={"text.secondary"}
              sx={{
                lineHeight: "14px",
                mb: 0,
                p: "0.5rem",
                fontSize: "14px",
                fontWeight: "400",
                textAlign: "start",
              }}
            >
              Conditions
            </Typography> */}
            <Tooltip title="Analytics" disableInteractive>
              <Button
                sx={{
                  borderLeft: "none",
                  "&:hover": {
                    borderLeft: "none",
                  },
                  width: selectedCategory === "analytics" ? "15%" : "0%",
                  minWidth: "35px",
                  p: "0.3rem 0px",
                  transition: "all 0.3s",
                }}
                variant={
                  selectedCategory === "analytics" ? "contained" : "outlined"
                }
                onClick={() => setSelectedCategory("analytics")}
              >
                {selectedCategory === "analytics" ? (
                  "Analytics"
                ) : (
                  <ManageSearchSharpIcon />
                )}
              </Button>
            </Tooltip>

            <Tooltip title="Statistics" disableInteractive>
              <Button
                sx={{
                  minWidth: "35px",
                  width: selectedCategory === "liveops" ? "15%" : "0%",
                  p: "0.3rem 0px",
                  transition: "all 0.3s",
                }}
                variant={
                  selectedCategory === "liveops" ? "contained" : "outlined"
                }
                onClick={() => setSelectedCategory("liveops")}
              >
                {selectedCategory === "liveops" ? (
                  "Statistics"
                ) : (
                  <LeaderboardSharpIcon />
                )}
              </Button>
            </Tooltip>

            <Tooltip title="Inventory" disableInteractive>
              <Button
                sx={{
                  minWidth: "35px",
                  width: selectedCategory === "inventory" ? "15%" : "0%",
                  p: "0.3rem 0px",
                  transition: "all 0.3s",
                  mr: 2,
                }}
                variant={
                  selectedCategory === "inventory" ? "contained" : "outlined"
                }
                onClick={() => setSelectedCategory("inventory")}
              >
                {selectedCategory === "inventory" ? (
                  "Inventory"
                ) : (
                  <BackpackIcon />
                )}
              </Button>
            </Tooltip>

            {selectedCategory === "analytics" && (
              <SearchWrapper
                itemsToFilter={elements?.analytics || []}
                segmentsEnabled={false}
                tagsEnabled={false}
                nameEnabled={true}
                possibleTags={[]}
                possibleSegments={[]}
                nameMatcher={(item, name) => {
                  return item.templateName.toLowerCase().indexOf(name) !== -1;
                }}
                onItemsFiltered={(filtered) => {
                  setFilteredTemplateList_an(filtered);
                }}
              />
            )}
            {selectedCategory === "liveops" && (
              <SearchWrapper
                itemsToFilter={elements?.statistics || []}
                segmentsEnabled={false}
                tagsEnabled={false}
                nameEnabled={true}
                possibleTags={[]}
                possibleSegments={[]}
                nameMatcher={(item, name) => {
                  return item.templateName.toLowerCase().indexOf(name) !== -1;
                }}
                onItemsFiltered={(filtered) => {
                  setFilteredTemplateList_stat(filtered);
                }}
              />
            )}
            {selectedCategory === "inventory" && (
              <SearchWrapper
                itemsToFilter={elements?.inventory || []}
                segmentsEnabled={false}
                tagsEnabled={false}
                groupsEnabled={true}
                nameEnabled={true}
                possibleGroups={uniq(
                  elements?.inventory.map((i) => i.groupName) || []
                ).filter(Boolean)}
                nameMatcher={(item, name) => {
                  return item.templateName.toLowerCase().indexOf(name) !== -1;
                }}
                groupMatcher={(item, groups) => {
                  if (!item.groupName) return false;
                  return groups.includes(item.groupName);
                }}
                onItemsFiltered={(filtered) => {
                  console.log(filtered);
                  setFilteredTemplateList_inv(filtered);
                }}
              />
            )}
          </div>

          <div className={s.innerBodyRow}>
            <div className={s.subElements}>
              <div className={s.list}>
                <div className={s.innerList}>
                  {filteredTemplateList_an &&
                    selectedCategory === "analytics" &&
                    filteredTemplateList_an &&
                    filteredTemplateList_an.length > 0 &&
                    filteredTemplateList_an.map((template, index) => (
                      <Tooltip
                        key={index}
                        title={
                          template.templateDefaultVariantType ? (
                            <div>
                              <div>
                                <strong>Default element </strong>
                              </div>
                              <strong>Type: </strong>
                              {template.templateDefaultVariantType}
                            </div>
                          ) : (
                            <div>
                              <div>
                                <strong>Method:</strong>{" "}
                                {template.templateMethod}
                              </div>
                              {/* <div>
                                <strong>Event:</strong>{" "}
                                {template.templateVisualEventName}
                              </div>
                              <div>
                                <strong>Target value:</strong>{" "}
                                {template.templateVisualValueName}
                              </div>
                              <div>
                                <strong>Type: </strong>
                                {analyticsEvents !== undefined &&
                                  getAnalyticsTemplateValueType(template)}
                              </div> */}
                            </div>
                          )
                        }
                        disableInteractive
                      >
                        {/* <TemplateItemDraggable
                        type="analytics"
                        onDragStateChange={onDragStateChange}
                        key={index}
                        template={template}
                      /> */}
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setSelectedPreset(null);
                            addFilterToList({
                              templateID: template.templateID,
                              filterCondition:
                                template.templateDefaultVariantType === "date"
                                  ? "dateRange"
                                  : "",
                              filterValue: "",
                              filterType:
                                getAnalyticsTemplateValueType(template),
                              uid: shortid.generate(),
                            });
                          }}
                          sx={{
                            pr: 1,
                            pl: 1,
                            textTransform: "none",
                            width: "fit-content",
                            height: "35px",
                            fontSize: "16px",
                            fontWeight: "regular",
                            textAlign: "start",
                            backgroundColor: "var(--bg-color-3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div className={s.elementName}>
                            {template.templateName}
                          </div>
                        </Button>
                      </Tooltip>
                    ))}
                  {filteredTemplateList_stat &&
                    selectedCategory === "liveops" &&
                    filteredTemplateList_stat &&
                    filteredTemplateList_stat.length > 0 &&
                    filteredTemplateList_stat.map((template, index) => (
                      <Tooltip
                        key={index}
                        title={
                          <div>
                            <div>
                              <strong>ID:</strong> {template.templateCodeName}
                            </div>
                            <div>
                              <strong>Type:</strong> {template.templateType}
                            </div>
                            <div>
                              <strong>Default value:</strong>{" "}
                              {template.templateDefaultValue}
                            </div>
                            {template.templateValueRangeMax !== "" && (
                              <div>
                                <strong>Possible range:</strong>{" "}
                                {template.templateValueRangeMin} -{" "}
                                {template.templateValueRangeMax}
                              </div>
                            )}
                          </div>
                        }
                        disableInteractive
                      >
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setSelectedPreset(null);
                            addFilterToList({
                              templateID: template.templateID,
                              filterCondition: "",
                              filterValue: "",
                              filterType: template.templateType,
                              uid: shortid.generate(),
                            });
                          }}
                          sx={{
                            pr: 1,
                            pl: 1,
                            textTransform: "none",
                            width: "fit-content",
                            height: "35px",
                            fontSize: "16px",
                            fontWeight: "regular",
                            textAlign: "start",
                            backgroundColor: "var(--bg-color-3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div className={s.elementName}>
                            {template.templateName}
                          </div>
                          <div className={s.elementCodeName}></div>
                        </Button>
                      </Tooltip>
                    ))}
                  {filteredTemplateList_inv &&
                    selectedCategory === "inventory" &&
                    filteredTemplateList_inv &&
                    filteredTemplateList_inv.length > 0 &&
                    filteredTemplateList_inv.map((template, index) => (
                      <Tooltip key={index} title={""} disableInteractive>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setSelectedPreset(null);
                            addFilterToList({
                              templateID: template.templateID,
                              filterCondition: "",
                              filterValue: "",
                              filterType: template.templateType,
                              isEntity: true,
                              uid: shortid.generate(),
                            });
                          }}
                          sx={{
                            pr: 1,
                            pl: 1,
                            textTransform: "none",
                            width: "fit-content",
                            height: "35px",
                            fontSize: "16px",
                            fontWeight: "regular",
                            textAlign: "start",
                            backgroundColor: "var(--bg-color-3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div className={s.elementName}>
                            {template.templateName}
                          </div>
                          <div className={s.elementCodeName}></div>
                        </Button>
                      </Tooltip>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${s.middleBody} ${currentMode === "pie" ? s.expanded : ""}`}
      >
        <Backdrop
          sx={{
            position: "absolute",
            color: "#fff",
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loadingData}
        >
          Loading player data. This may take a while...{" "}
          <CircularProgress color="inherit" />
        </Backdrop>

        <Box sx={{ position: "absolute", top: "5%", right: "1%" }}>
          <Button
            variant="contained"
            sx={{ fontSize: 12 }}
            onClick={() => {
              setCurrentMode((prevMode) => {
                localStorage.setItem(
                  "profileComposition_layoutMode",
                  prevMode === "both" ? "pie" : "both"
                );
                return prevMode === "both" ? "pie" : "both";
              });
            }}
          >
            {currentMode === "both" ? (
              <Tooltip title="Pie chart mode" disableInteractive>
                <Box sx={{ display: "flex" }}>
                  <PieChartIcon />
                </Box>
              </Tooltip>
            ) : (
              <Tooltip title="Show both charts" disableInteractive>
                <Box sx={{ display: "flex" }}>
                  <BubbleChartIcon />
                  <PieChartIcon />
                </Box>
              </Tooltip>
            )}
          </Button>
        </Box>

        <Box sx={{ width: "30%", height: "100%", position: "relative" }}>
          <SegmentChart chartObj={segmentsChartObj} />
          {currentMode !== "pie" && (
            <ProfileCompositionStaticSegmentBuilder
              count={compositionData}
              isLoading={isLoading_staticSegment}
              onCommit={createStaticSegment}
            />
          )}
        </Box>

        {currentMode !== "pie" && (
          <BubbleProfileChart
            setSelectedData={(data) => setSelectedData(data)}
            invertedAxises={bubbleChartAxisesInversions}
            selectedData={selectedData}
            chartObj={bubbleChartObj}
            elementsNames={getElementsNames()}
            elementsTypes={elementsTypes}
          />
        )}
        {currentMode !== "pie" && (
          <div className={s.sideTable}>
            <div className={s.correlationTable}>
              <div className={s.subHeader}>
                <Typography
                  variant="h6"
                  color={"text.secondary"}
                  sx={{
                    p: 1,
                    pt: 1.1,
                    pb: 1.2,
                    lineHeight: "14px",
                    mb: 0,
                    fontSize: "18px",
                    fontWeight: "400",
                    textAlign: "start",
                  }}
                >
                  Correlation
                </Typography>
              </div>

              <div className={s.correlationItem}>
                <Typography
                  variant="h6"
                  color={"text.secondary"}
                  sx={{
                    p: 2,
                    pl: 2.1,
                    pr: 0,
                    lineHeight: "14px",
                    mb: 0,
                    fontSize: "14px",
                    fontWeight: "400",
                    textAlign: "start",
                  }}
                >
                  Axis X on Y:
                </Typography>
                <Typography
                  variant="h6"
                  color={"text.secondary"}
                  sx={{
                    p: 2,
                    pl: 2.1,
                    pr: 0,
                    lineHeight: "14px",
                    mb: 0,
                    fontSize: "14px",
                    fontWeight: "400",
                    textAlign: "start",
                  }}
                >
                  {getCorrelationData("xy")}
                </Typography>
                <CorrelationIndicator correlation={getCorrelationData("xy")} />
              </div>
              <div className={s.correlationItem}>
                <Typography
                  variant="h6"
                  color={"text.secondary"}
                  sx={{
                    p: 2,
                    pl: 2.1,
                    pr: 0,
                    lineHeight: "14px",
                    mb: 0,
                    fontSize: "14px",
                    fontWeight: "400",
                    textAlign: "start",
                  }}
                >
                  Axis X on Size:
                </Typography>
                <Typography
                  variant="h6"
                  color={"text.secondary"}
                  sx={{
                    p: 2,
                    pl: 2.1,
                    pr: 0,
                    lineHeight: "14px",
                    mb: 0,
                    fontSize: "14px",
                    fontWeight: "400",
                    textAlign: "start",
                  }}
                >
                  {getCorrelationData("xr")}
                </Typography>
                <CorrelationIndicator correlation={getCorrelationData("xr")} />
              </div>
              <div className={s.correlationItem}>
                <Typography
                  variant="h6"
                  color={"text.secondary"}
                  sx={{
                    p: 2,
                    pl: 2.1,
                    pr: 0,
                    lineHeight: "14px",
                    mb: 0,
                    fontSize: "14px",
                    fontWeight: "400",
                    textAlign: "start",
                  }}
                >
                  Axis Y on Size:
                </Typography>
                <Typography
                  variant="h6"
                  color={"text.secondary"}
                  sx={{
                    p: 2,
                    pl: 2.1,
                    pr: 0,
                    lineHeight: "14px",
                    mb: 0,
                    fontSize: "14px",
                    fontWeight: "400",
                    textAlign: "start",
                  }}
                >
                  {getCorrelationData("yr")}
                </Typography>
                <CorrelationIndicator correlation={getCorrelationData("yr")} />
              </div>
            </div>
            <Button
              sx={{ ml: 2 }}
              disabled={
                [compositionAvgProfile].length === 0 ||
                !bubbleChartData ||
                bubbleChartData.length === 0
              }
              onClick={() => setOpenSegmentBuilder(true)}
            >
              <SensorOccupiedSharpIcon sx={{ fontSize: 20, mr: 1 }} /> Build
              segment
            </Button>
            <PortableSegmentBuilder
              profiles={[compositionAvgProfile]}
              open={openSegmentBuilder}
              close={() => setOpenSegmentBuilder(false)}
              selectedClientIDs={selectedClientIDs}
            />
          </div>
        )}

        {currentMode === "pie" && (
          <div className={s.pieChartMiddleBodyLayout}>
            <div className={s.pieChartCategoriesAndFilters}>
              <div className={s.pieChartCategories}>
                <div className={s.list}>
                  {segmentsChartObj.categories &&
                    segmentsChartObj.categories.map((cat, index) => (
                      <PieCategoryItem
                        cat={cat}
                        index={index}
                        isSelected={index === selectedSegmentChartCategory}
                        selectSegmentChartCategory={selectSegmentChartCategory}
                        changeSegmentChartCategory={changeSegmentChartCategory}
                        toggleSegmentChartCategoryHidden={
                          toggleSegmentChartCategoryHidden
                        }
                        removeSegmentChartCategory={removeSegmentChartCategory}
                      />
                    ))}
                  <Button
                    variant="contained"
                    onClick={() => addSegmentChartCategory()}
                  >
                    Add category
                  </Button>
                </div>
              </div>
              <div className={`${s.filtersList}`}>
                <div className={`${s.list}`}>
                  {!collapseFilters && (
                    <div className={s.innerList}>
                      {segmentsChartObj.categories.length > 0 &&
                        segmentsChartObj.categories.every((c) => c.filters) &&
                        segmentsChartObj.categories[
                          selectedSegmentChartCategory
                        ] &&
                        segmentsChartObj.categories[
                          selectedSegmentChartCategory
                        ].filters.map((filter, index) =>
                          filter.condition ? (
                            <div></div>
                          ) : (
                            <FilterItem
                              key={filter.uid}
                              index={index}
                              filter={filter}
                              errorFilters={errorFilters}
                              filterName={getFilterName(filter)}
                              onRemove={(i) => removeFilter(i)}
                              onSetCondition={(i, cond) => {
                                setFilterCondition(
                                  selectedSegmentChartCategory,
                                  i,
                                  cond
                                );
                              }}
                              onSetValue={(i, val) => {
                                setFilterValue(
                                  selectedSegmentChartCategory,
                                  i,
                                  val
                                );
                              }}
                            />
                          )
                        )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={s.bubbleChartPresets}>
              <div className={s.subHeader}>
                <Typography
                  variant="h6"
                  color={"text.secondary"}
                  sx={{
                    p: 1,
                    pt: 1.1,
                    pb: 1.2,
                    lineHeight: "14px",
                    mb: 0,
                    fontSize: "14px",
                    fontWeight: "400",
                    textAlign: "start",
                  }}
                >
                  Presets{" "}
                  {currentMode === "both"
                    ? ""
                    : currentMode === "pie"
                      ? "(pie chart)"
                      : "(bubble chart)"}
                </Typography>
              </div>
              <div className={s.list}>
                <div className={s.innerList}>
                  {presets &&
                    presets.length > 0 &&
                    presets
                      .filter((p) => p.uid.startsWith(currentMode))
                      .map((preset, index) => (
                        <PresetItem key={index} preset={preset} index={index} />
                      ))}
                  <Button
                    sx={{
                      p: 0,
                      ml: 1.5,
                      height: "30px",
                      width: "150px",
                      textTransform: "none",
                    }}
                    disabled={
                      !segmentsChartObj.categories.some(
                        (c) => c.filters.length > 0
                      )
                    }
                    variant="outlined"
                    onClick={() => createPreset()}
                  >
                    Save preset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {currentMode !== "pie" && (
        <div className={s.bottomBody}>
          <div
            className={`${s.filtersList} ${collapseFilters ? s.collapsed : ""}`}
          >
            <div className={s.subHeader}>
              <Typography
                variant="h6"
                color={"text.secondary"}
                sx={{
                  lineHeight: "14px",
                  mb: 0,
                  fontSize: "14px",
                  fontWeight: "400",
                  textAlign: "start",
                }}
              >
                {!collapseFilters && "Filters"}
              </Typography>

              {!collapseFilters && (
                <Button
                  sx={{
                    p: 0,
                    ml: 1.5,
                    height: "20px",
                    width: "50px",
                    minWidth: "50px",
                    textTransform: "none",
                  }}
                  disabled={filters && filters.length === 0}
                  variant="outlined"
                  onClick={() => setFilters([])}
                >
                  Clear
                </Button>
              )}

              <Tooltip
                title={collapseFilters ? "Show filters" : ""}
                placement="top"
              >
                <Button
                  sx={{
                    p: 0,
                    ml: collapseFilters ? 0 : 1.5,
                    height: "20px",
                    width: collapseFilters ? "20px" : "75px",
                    minWidth: "0px",
                    textTransform: "none",
                  }}
                  variant="outlined"
                  onClick={() => setCollapseFilters(!collapseFilters)}
                >
                  {collapseFilters ? (
                    <ArrowForwardIosSharpIcon fontSize="20px" />
                  ) : (
                    "Collapse"
                  )}
                </Button>
              </Tooltip>
            </div>
            <div className={`${s.list}`}>
              {!collapseFilters && (
                <div className={s.innerList}>
                  {filters &&
                    filters.length > 0 &&
                    filters.map((filter, index) =>
                      filter.condition ? (
                        <div></div>
                      ) : (
                        <FilterItem
                          key={filter.uid}
                          index={index}
                          filter={filter}
                          errorFilters={errorFilters}
                          filterName={getFilterName(filter)}
                          onRemove={(i) => removeFilter(i)}
                          onSetCondition={(i, cond) =>
                            setFilterCondition(1, i, cond)
                          }
                          onSetValue={(i, val) => setFilterValue(1, i, val)}
                        />
                      )
                    )}
                </div>
              )}
            </div>
          </div>

          <div
            className={`${s.selectedData} ${collapseFilters ? s.overExpanded : ""}`}
          >
            <div className={s.subHeader}>
              <Typography
                variant="h6"
                color={"text.secondary"}
                sx={{
                  p: 1,
                  pt: 1.1,
                  pb: 1.2,
                  lineHeight: "14px",
                  mb: 0,
                  fontSize: "14px",
                  fontWeight: "400",
                  textAlign: "start",
                }}
              >
                Selected data
              </Typography>

              <Button
                sx={{
                  p: 0,
                  ml: 1.5,
                  height: "20px",
                  width: "70px",
                  minWidth: "70px",
                  textTransform: "none",
                }}
                disabled={selectedData.length === 0}
                variant="outlined"
                onClick={() => setSelectedData([])}
              >
                Deselect
              </Button>
            </div>

            <div className={s.list}>
              <div className={s.innerList}>
                {selectedDataVisual
                  .sort(
                    (a, b) =>
                      getFrequencyPercentage(b, getMostFrequentValue(b)) -
                      getFrequencyPercentage(a, getMostFrequentValue(a))
                  )
                  .map((element, index) => (
                    <AnchorElTooltips
                      sx={{ height: "100%" }}
                      placement="top"
                      open={
                        hoveredElement !== null &&
                        element.id === hoveredElement.id
                      }
                      componentsProps={{
                        tooltip: {
                          sx: {
                            width: "700px",
                            backgroundColor: "transparent",
                          },
                        },
                      }}
                      title={
                        hoveredElement === null ? (
                          ""
                        ) : (
                          <ValueList
                            elementType={getElementType(hoveredElement.id)}
                            forceClose={forceClose}
                            onHover={() => clearUnhoverTimer()}
                            onUnhover={() => unhoverElement()}
                            element={hoveredElement}
                          />
                        )
                      }
                    >
                      <div
                        key={index}
                        className={`${s.element} ${elementSelectedByForce && element.id === hoveredElement.id ? s.elementSelected : ""}`}
                        onClick={() => forceSelectElement(element)}
                        onMouseEnter={() => onHoverElement(element)}
                        onMouseLeave={() => unhoverElement(null)}
                      >
                        <Typography
                          variant="h6"
                          color={"text.secondary"}
                          sx={{
                            p: 1,
                            width: "30%",
                            lineHeight: "14px",
                            fontSize: "14px",
                            fontWeight: "500",
                            textAlign: "start",
                          }}
                        >
                          {element.name}:
                        </Typography>
                        <Typography
                          variant="h6"
                          color={"text.secondary"}
                          sx={{
                            p: 1,
                            width: "30%",
                            lineHeight: "14px",
                            fontSize: "14px",
                            fontWeight: "500",
                            textAlign: "end",
                          }}
                        >
                          {formatElementValue(
                            getMostFrequentValue(element),
                            getElementType(element.id)
                          )}
                        </Typography>
                        <Typography
                          variant="h6"
                          color={"text.secondary"}
                          sx={{
                            p: 1,
                            width: "30%",
                            lineHeight: "14px",
                            fontSize: "14px",
                            fontWeight: "800",
                            textAlign: "end",
                          }}
                        >
                          {getFrequencyPercentage(
                            element,
                            getMostFrequentValue(element)
                          )}
                          %
                        </Typography>
                      </div>
                    </AnchorElTooltips>
                  ))}
              </div>
            </div>
          </div>

          <div
            className={`${s.bubbleChartSettings} ${compositionData == undefined ? s.disabled : ""}`}
          >
            <div className={s.subHeader}>
              <Typography
                variant="h6"
                color={"text.secondary"}
                sx={{
                  p: 1,
                  pt: 1.1,
                  pb: 1.2,
                  lineHeight: "14px",
                  mb: 0,
                  fontSize: "14px",
                  fontWeight: "400",
                  textAlign: "start",
                }}
              >
                Bubble chart settings
              </Typography>
            </div>

            {compositionData == undefined ? (
              <Typography
                variant="h6"
                color={"text.secondary"}
                sx={{
                  p: 1,
                  lineHeight: "14px",
                  mb: 1,
                  fontSize: "12px",
                  fontWeight: "400",
                  textAlign: "start",
                  userSelect: "none",
                }}
              >
                Valid players segment is required.
              </Typography>
            ) : (
              <Typography
                variant="h6"
                color={"text.secondary"}
                sx={{
                  p: 1,
                  lineHeight: "14px",
                  mb: 1,
                  fontSize: "12px",
                  fontWeight: "400",
                  textAlign: "start",
                  userSelect: "none",
                }}
              >
                Select <HighlightAltSharpIcon sx={{ fontSize: "22px" }} />{" "}
                elements to view users' full profile
              </Typography>
            )}

            <div className={s.axis}>
              <Typography
                variant="h6"
                color={"text.secondary"}
                sx={{
                  p: 1,
                  pt: 1.1,
                  pb: 1.2,
                  lineHeight: "14px",
                  mb: 0,
                  fontSize: "14px",
                  fontWeight: "400",
                  textAlign: "start",
                }}
              >
                Axis Y
              </Typography>

              <Tooltip title={"Invert axis"} placement="top" disableInteractive>
                <Button
                  sx={{
                    ml: "auto",
                    minWidth: "40px",
                    width: "40px",
                    height: "25px",
                  }}
                  variant={
                    bubbleChartAxisesInversions.inverted_y
                      ? "contained"
                      : "text"
                  }
                  onClick={() => toggleInversion("y")}
                >
                  <ArrowRightAltIcon
                    sx={{
                      fontSize: "26px",
                      rotate: bubbleChartAxisesInversions.inverted_y
                        ? "90deg"
                        : "-90deg",
                    }}
                  />
                </Button>
              </Tooltip>
              <Select
                disabled={compositionData == undefined}
                value={bubbleSettings.element1}
                size="small"
                sx={{ ml: 1.5, height: "30px", width: "240px" }}
                onChange={(event) => {
                  setSelectedPreset(null);
                  setBubbleSettings((prevSettings) => ({
                    ...prevSettings,
                    element1: event.target.value,
                  }));
                }}
              >
                <ListSubheader>Analytics Elements</ListSubheader>
                {elements.analytics
                  .filter((template) => filterForbiddenTypes(template, true))
                  .map((template, index) => (
                    <MenuItem key={index} value={template.templateID}>
                      {template.templateName}
                    </MenuItem>
                  ))}
                <ListSubheader>Statistics Elements</ListSubheader>
                {elements.statistics
                  .filter((template) => filterForbiddenTypes(template, false))
                  .map((template, index) => (
                    <MenuItem key={index} value={template.templateID}>
                      {template.templateName}
                    </MenuItem>
                  ))}{" "}
                <ListSubheader>Inventory</ListSubheader>
                {elements.inventory
                  .filter((template) => filterForbiddenTypes(template, false))
                  .map((template, index) => (
                    <MenuItem key={index} value={template.templateID}>
                      {template.templateName}
                    </MenuItem>
                  ))}
              </Select>
            </div>

            <div className={s.axis}>
              <Typography
                variant="h6"
                color={"text.secondary"}
                sx={{
                  p: 1,
                  pt: 1.1,
                  pb: 1.2,
                  lineHeight: "14px",
                  mb: 0,
                  fontSize: "14px",
                  fontWeight: "400",
                  textAlign: "start",
                }}
              >
                Axis X
              </Typography>

              <Tooltip title={"Invert axis"} placement="top" disableInteractive>
                <Button
                  sx={{
                    ml: "auto",
                    minWidth: "40px",
                    width: "40px",
                    height: "25px",
                  }}
                  variant={
                    bubbleChartAxisesInversions.inverted_x
                      ? "contained"
                      : "text"
                  }
                  onClick={() => toggleInversion("x")}
                >
                  <ArrowRightAltIcon
                    sx={{
                      fontSize: "26px",
                      rotate: bubbleChartAxisesInversions.inverted_x
                        ? "180deg"
                        : "0deg",
                    }}
                  />
                </Button>
              </Tooltip>
              <Select
                disabled={compositionData == undefined}
                value={bubbleSettings.element2}
                size="small"
                sx={{ ml: 1.5, height: "30px", width: "240px" }}
                onChange={(event) => {
                  setSelectedPreset(null);
                  setBubbleSettings((prevSettings) => ({
                    ...prevSettings,
                    element2: event.target.value,
                  }));
                }}
              >
                <ListSubheader>Analytics Elements</ListSubheader>
                {elements.analytics
                  .filter((template) => filterForbiddenTypes(template, true))
                  .map((template, index) => (
                    <MenuItem key={index} value={template.templateID}>
                      {template.templateName}
                    </MenuItem>
                  ))}
                <ListSubheader>Statistics Elements</ListSubheader>
                {elements.statistics
                  .filter((template) => filterForbiddenTypes(template, false))
                  .map((template, index) => (
                    <MenuItem key={index} value={template.templateID}>
                      {template.templateName}
                    </MenuItem>
                  ))}
                <ListSubheader>Inventory</ListSubheader>
                {elements.inventory
                  .filter((template) => filterForbiddenTypes(template, false))
                  .map((template, index) => (
                    <MenuItem key={index} value={template.templateID}>
                      {template.templateName}
                    </MenuItem>
                  ))}
              </Select>
            </div>

            <div className={s.axis}>
              <Typography
                variant="h6"
                color={"text.secondary"}
                sx={{
                  p: 1,
                  pt: 1.1,
                  pb: 1.2,
                  lineHeight: "14px",
                  mb: 0,
                  fontSize: "14px",
                  fontWeight: "400",
                  textAlign: "start",
                }}
              >
                Size
              </Typography>
              <Select
                disabled={compositionData == undefined}
                value={bubbleSettings.element3}
                size="small"
                sx={{ ml: 1.5, height: "30px", width: "240px" }}
                onChange={(event) => {
                  setSelectedPreset(null);
                  setBubbleSettings((prevSettings) => ({
                    ...prevSettings,
                    element3: event.target.value,
                  }));
                }}
              >
                <ListSubheader>Analytics Elements</ListSubheader>
                {elements.analytics
                  .filter((template) => filterForbiddenTypes(template, true))
                  .map((template, index) => (
                    <MenuItem key={index} value={template.templateID}>
                      {template.templateName}
                    </MenuItem>
                  ))}
                <ListSubheader>Statistics Elements</ListSubheader>
                {elements.statistics
                  .filter((template) => filterForbiddenTypes(template, false))
                  .map((template, index) => (
                    <MenuItem key={index} value={template.templateID}>
                      {template.templateName}
                    </MenuItem>
                  ))}{" "}
                <ListSubheader>Inventory</ListSubheader>
                {elements.inventory
                  .filter((template) => filterForbiddenTypes(template, false))
                  .map((template, index) => (
                    <MenuItem key={index} value={template.templateID}>
                      {template.templateName}
                    </MenuItem>
                  ))}
              </Select>
            </div>
          </div>

          <div className={s.bubbleChartPresets}>
            <div className={s.subHeader}>
              <Typography
                variant="h6"
                color={"text.secondary"}
                sx={{
                  p: 1,
                  pt: 1.1,
                  pb: 1.2,
                  lineHeight: "14px",
                  mb: 0,
                  fontSize: "14px",
                  fontWeight: "400",
                  textAlign: "start",
                }}
              >
                Presets{" "}
                {currentMode === "both"
                  ? ""
                  : currentMode === "pie"
                    ? "(pie chart)"
                    : "(bubble chart)"}
              </Typography>
            </div>
            <div className={s.list}>
              <div className={s.innerList}>
                {presets &&
                  presets.length > 0 &&
                  presets
                    .filter((p) => p.uid.startsWith(currentMode))
                    .map((preset, index) => (
                      <PresetItem key={index} preset={preset} index={index} />
                    ))}
                <Button
                  sx={{
                    p: 0,
                    ml: 1.5,
                    height: "30px",
                    width: "150px",
                    textTransform: "none",
                  }}
                  disabled={filters.length === 0}
                  variant="outlined"
                  onClick={() => createPreset()}
                >
                  Save preset
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function PieCategoryItem({
  cat,
  index,
  changeSegmentChartCategory,
  toggleSegmentChartCategoryHidden,
  selectSegmentChartCategory,
  removeSegmentChartCategory,
  isSelected,
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      setEditing(false);
    }
  };
  useEffect(() => {
    if (!editing && name !== cat.name) {
      changeSegmentChartCategory(index, name);
    }
  }, [editing]);
  return (
    <Box sx={{ display: "flex" }}>
      {editing ? (
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          onKeyDown={handleInputKeyDown}
          autoFocus
        />
      ) : (
        <Button
          variant={isSelected ? "contained" : "text"}
          onClick={() => selectSegmentChartCategory(index)}
          sx={{ width: "100%", justifyContent: "start", textTransform: "none" }}
        >
          {name}
        </Button>
      )}

      {isSelected && (
        <Tooltip title={editing ? "Apply" : "Edit name"} disableInteractive>
          <IconButton onClick={() => setEditing(!editing)}>
            {editing ? <CheckIcon /> : <EditIcon />}
          </IconButton>
        </Tooltip>
      )}

      {cat.isCustom && isSelected && (
        <Tooltip title={"Remove"} disableInteractive>
          <IconButton onClick={() => removeSegmentChartCategory(index)}>
            <CloseSharpIcon />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={cat.isHidden ? "Show" : "Hide"} disableInteractive>
        <IconButton onClick={() => toggleSegmentChartCategoryHidden(index)}>
          {cat.isHidden ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function FilterItem({
  filter,
  index,
  filterName,
  errorFilters,
  onSetCondition,
  onSetValue,
  onRemove,
}) {
  function getFilterTypeEndAdornment(filter) {
    switch (filter.filterType) {
      case "string":
        return "str";
      case "bool":
        return "bool";
      case "float":
        return "12.3";
      case "integer":
        return "123";
      case "date":
        return "date";
      default:
        return "123";
    }
  }

  function handleFloatInput(value) {
    let currentInputValue = value;
    if (currentInputValue === "") {
      return "";
    }

    if (currentInputValue === ".") {
      currentInputValue = "0.";
    }

    let sanitizedValue = currentInputValue.replace(/[^0-9.]/g, "");

    let dotCount = sanitizedValue.split(".").length - 1;

    if (dotCount > 1) {
      sanitizedValue =
        sanitizedValue.split(".").slice(0, 2).join(".") +
        sanitizedValue.split(".").slice(2).join("");
    }

    if (
      sanitizedValue.startsWith("0") &&
      sanitizedValue.length > 1 &&
      sanitizedValue[1] !== "."
    ) {
      sanitizedValue = "0." + sanitizedValue.slice(1);
    }

    dotCount = sanitizedValue.split(".").length - 1;

    return sanitizedValue;
  }
  function handleIntegerInput(value) {
    if (value === "") {
      return "";
    }

    let sanitizedValue = value.replace(/[^0-9]/g, "");

    if (sanitizedValue === "") {
      return "";
    }

    return sanitizedValue;
  }
  const conditions_numeric = ["<", "<=", ">", ">=", "=", "!="];
  const conditions_string = [
    "contains",
    "starts with",
    "ends with",
    "is",
    "is not",
  ];
  const conditions_bool = ["is", "is not"];
  function getFilterConditions(filter) {
    switch (filter.filterType) {
      case "bool":
        return conditions_bool;
      case "integer":
        return conditions_numeric;
      case "float":
        return conditions_numeric;
      case "integer":
        return conditions_numeric;
      case "date":
        return [];
      default:
        return conditions_string;
    }
  }
  function GetFilterValueInput(filter, index) {
    const max_width = 220;
    if (filter.filterType === "bool") {
      return (
        <Select
          disabled={filter.filterCondition === ""}
          value={filter.filterValue}
          size="small"
          sx={{ ml: 1.5, height: "30px", width: "70%", maxWidth: max_width }}
          onChange={(event) => onSetValue(index, event.target.value)}
        >
          <MenuItem value={"True"}>True</MenuItem>
          <MenuItem value={"False"}>False</MenuItem>
        </Select>
      );
    }
    if (filter.filterType === "date") {
      return (
        <Box sx={{ pl: 1.2, maxWidth: max_width }}>
          <DatePicker
            index={index}
            onStateChange={(value) => onSetValue(index, value)}
          />
        </Box>
      );
    }

    const [localValue, setLocalValue] = useState(filter.filterValue);

    useEffect(() => {
      setLocalValue(filter.filterValue);
    }, [filter.filterValue]);

    const debouncedSendValue = useMemo(
      () => debounce((value) => onSetValue(index, value), 100),
      [index, onSetValue]
    );
    const isInitialRender = useRef(true);

    useEffect(() => {
      if (isInitialRender.current) {
        isInitialRender.current = false;
        return;
      }
      debouncedSendValue(localValue);
      return () => {
        debouncedSendValue.cancel();
      };
    }, [localValue]);

    return (
      <FormControl
        disabled={filter.filterCondition === ""}
        sx={{
          ml: 1.5,
          height: "30px",
          // width: "70%",
          flex: 1,
          mr: 1,
          maxWidth: max_width,
        }}
        variant="outlined"
      >
        <OutlinedInput
          spellCheck={false}
          disabled={filter.filterCondition === ""}
          sx={{ height: "30px" }}
          id="outlined-adornment-weight"
          value={localValue}
          onChange={(event) => {
            let newValue = event.target.value;
            switch (filter.filterType) {
              case "string":
                break;
              case "float":
                newValue = handleFloatInput(newValue);
                break;
              case "integer":
                newValue = handleIntegerInput(newValue);
                break;
              default:
                break;
            }
            setLocalValue(newValue);
          }}
          endAdornment={
            <InputAdornment position="end">
              {getFilterTypeEndAdornment(filter)}
            </InputAdornment>
          }
          aria-describedby="outlined-weight-helper-text"
          inputProps={{
            "aria-label": "weight",
          }}
        />
      </FormControl>
    );
  }
  return (
    <div
      className={`${s.filterItem} ${errorFilters.includes(filter.uid) ? s.error : ""}`}
    >
      <div className={s.filterName}>
        <Tooltip placement="top" title={filterName} disableInteractive>
          <Typography sx={{ fontSize: "14px", fontWeight: "500" }}>
            {trimStr(filterName, 15)}
          </Typography>
        </Tooltip>
      </div>

      {filter.filterType !== "date" && (
        <Select
          value={filter.filterCondition}
          size="small"
          sx={{
            ml: 1.5,
            height: "30px",
            width: filter.filterType === "string" ? "35%" : "fit-content",
            maxWidth: 120,
          }}
          onChange={(event) => onSetCondition(index, event.target.value)}
        >
          {getFilterConditions(filter).map((condition, index) => (
            <MenuItem key={index} value={condition}>
              {condition}
            </MenuItem>
          ))}
        </Select>
      )}

      {GetFilterValueInput(filter, index)}

      <Button
        sx={{
          p: 0,
          ml: "auto",
          height: "20px",
          width: "20px",
          minWidth: "20px",
        }}
        variant="outlined"
        onClick={() => onRemove(index)}
      >
        <CloseSharpIcon sx={{ fontSize: 14 }} />
      </Button>
    </div>
  );
}
function formatElementValue(value, type, isCollapsed) {
  if (type === "date") {
    if (isCollapsed) {
      let tempDates = value.split(" - ");
      return `${dayjs.utc(tempDates[0]).format("DD.MM.YYYY HH:mm")} - ${dayjs.utc(tempDates[1]).format("DD.MM.YYYY HH:mm")}`;
    }
    return dayjs.utc(value).format("DD.MM.YYYY HH:mm");
  } else if (type === "float") {
    if (isCollapsed) {
      return value;
    } else {
      return parseFloat(value).toFixed(2);
    }
  } else if (type === "integer") {
    if (isCollapsed) {
      return value;
    } else {
      return parseInt(value);
    }
  } else {
    return value;
  }
}
const StyledTooltipCard = styled(Card)(({ theme }) => ({
  width: 900,
  maxHeight: 700,
  borderRadius: 12,
  boxShadow: theme.shadows[10],
  overflow: "hidden",
  position: "relative",
  backgroundColor: "var(--bg-color3)",
  backdropFilter: "blur(8px)",
  transition: "all 0.3s ease",
  "&:hover": {
    boxShadow: theme.shadows[14],
  },
}));

const StyledCardHeader = styled(CardHeader)(({ theme }) => ({
  padding: theme.spacing(2),
  paddingBottom: theme.spacing(1),
  "& .MuiCardHeader-title": {
    fontSize: 16,
    fontWeight: 600,
  },
  "& .MuiCardHeader-subheader": {
    fontSize: 13,
  },
}));

const StyledListContainer = styled(Box)(({ theme }) => ({
  maxHeight: 280,
  overflowY: "auto",
  paddingRight: theme.spacing(1),
  scrollbarWidth: "thin",
  "&::-webkit-scrollbar": {
    width: 6,
  },
  "&::-webkit-scrollbar-track": {
    background: alpha(theme.palette.divider, 0.1),
    borderRadius: 3,
  },
  "&::-webkit-scrollbar-thumb": {
    background: alpha(theme.palette.primary.main, 0.3),
    borderRadius: 3,
    "&:hover": {
      background: alpha(theme.palette.primary.main, 0.5),
    },
  },
}));

const ValueRow = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(0.75, 1),
  borderRadius: 6,
  transition: "background-color 0.2s ease",
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.light, 0.08),
  },
}));
function ValueList({ element, elementType, onHover, onUnhover, forceClose }) {
  function normalizeArray(arr) {
    return arr.reduce((acc, obj) => {
      const key = Object.keys(obj)[0];
      const value = obj[key];
      acc[key] = value;
      return acc;
    }, {});
  }

  const type = elementType;
  let defaultSortedValues = [];

  if (type === "date") {
    defaultSortedValues = element.values.reduce((acc, curr) => {
      const key = Object.keys(curr)[0];
      const value = Object.values(curr)[0];
      const date = dayjs
        .utc(key)
        .minute(0)
        .second(0)
        .millisecond(0)
        .toISOString();
      if (acc[date]) {
        acc[date] += value;
      } else {
        acc[date] = value;
      }
      return acc;
    }, {});

    defaultSortedValues = Object.keys(defaultSortedValues)
      .map((date) => ({
        [date]: defaultSortedValues[date],
      }))
      .sort(
        (a, b) => new Date(Object.keys(a)[0]) - new Date(Object.keys(b)[0])
      );
  } else {
    defaultSortedValues = element.values.sort((a, b) => {
      const freqA = Object.values(a)[0];
      const freqB = Object.values(b)[0];
      return freqB - freqA;
    });
  }

  defaultSortedValues = normalizeArray(defaultSortedValues);

  const [sortedValues, setSortedValues] = useState(defaultSortedValues);
  const [isCollapsingNumbers, setIsCollapsingNumbers] = useState(false);
  const [collapseNumbersFactor, setCollapseNumbersFactor] = useState(5);
  const [tooltipInitialPos, setTooltipInitialPos] = useState({
    left: "300",
    top: "570",
  });

  function compressKeys(obj, rangeSize = 5) {
    const result = {};

    let keys = {};
    if (type === "date") {
      keys = Object.keys(obj)
        .map((key) => new Date(key))
        .sort((a, b) => a - b);
    } else {
      keys = Object.keys(obj)
        .map(Number)
        .sort((a, b) => a - b);
    }

    if (type === "date") {
      if (rangeSize === 0 || rangeSize > 99999999) {
        return obj;
      }
      const intervalMs = rangeSize * 60 * 60 * 1000;

      keys.forEach((date) => {
        const startRange = new Date(
          Math.floor(date.getTime() / intervalMs) * intervalMs
        );
        const endRange = new Date(startRange.getTime() + intervalMs - 1);

        const rangeKey = `${startRange.toISOString().slice(0, 19).replace("T", " ")} - ${endRange.toISOString().slice(0, 19).replace("T", " ")}`;

        if (result[rangeKey]) {
          result[rangeKey] += obj[date.toISOString()];
        } else {
          result[rangeKey] = obj[date.toISOString()];
        }
      });
    } else {
      for (let i = 0; i < keys.length; i++) {
        const startRange =
          Math.floor(keys[i] / parseFloat(rangeSize)) * parseFloat(rangeSize);
        const endRange = startRange + parseFloat(rangeSize) - 1;
        const rangeKey = `${startRange}-${endRange}`;

        if (result[rangeKey]) {
          result[rangeKey] += obj[keys[i]];
        } else {
          result[rangeKey] = obj[keys[i]];
        }
      }
    }

    return result;
  }

  useEffect(() => {
    if (isCollapsingNumbers) {
      setSortedValues(compressKeys(defaultSortedValues, collapseNumbersFactor));
    } else {
      setSortedValues(defaultSortedValues);
    }
  }, [isCollapsingNumbers]);

  useEffect(() => {
    if (isCollapsingNumbers) {
      setSortedValues(compressKeys(defaultSortedValues, collapseNumbersFactor));
    }
  }, [collapseNumbersFactor]);

  // Get total count for percentage calculation
  const totalCount = Object.values(sortedValues).reduce(
    (sum, val) => sum + val,
    0
  );

  return (
    <DraggableComponent initialPos={tooltipInitialPos}>
      <StyledTooltipCard
        elevation={8}
        onMouseEnter={onHover}
        onMouseLeave={onUnhover}
      >
        <StyledCardHeader
          title={element.name}
          subheader={`${Object.keys(sortedValues).length} unique values`}
          action={
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <IconButton size="small" onClick={forceClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        />

        <CardContent sx={{ pt: 0, pb: 2 }}>
          <Tooltip_SingleDefaultDistributionChart
            data={element.values}
            valueName={""}
            valueFormat={type}
            onCollapseEnabled={(enabled) => setIsCollapsingNumbers(enabled)}
            onCollapseValueChange={(v) => setCollapseNumbersFactor(v)}
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              px: 2,
              py: 0.5,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight="medium"
            >
              Value
            </Typography>
            <Box sx={{ display: "flex" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight="medium"
                sx={{ width: 60, textAlign: "right" }}
              >
                Count
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight="medium"
                sx={{ width: 60, textAlign: "right" }}
              >
                %
              </Typography>
            </Box>
          </Box>

          <StyledListContainer>
            <List disablePadding>
              {Object.entries(sortedValues).map(([key, value]) => {
                const percentage = ((value / totalCount) * 100).toFixed(1);

                return (
                  <ValueRow key={key} disablePadding>
                    <Box
                      sx={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        position: "relative",
                        p: 0.8,
                      }}
                    >
                      {/* Progress bar background */}
                      <Box
                        sx={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${percentage}%`,
                          bgcolor: (theme) =>
                            alpha(theme.palette.primary.main, 0.2),
                          borderRadius: 1,
                          maxWidth: "100%",
                        }}
                      />

                      <Typography
                        variant="body2"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          pr: 1,
                          flex: 1,
                          zIndex: 1,
                        }}
                      >
                        {formatElementValue(key, type, isCollapsingNumbers)}
                      </Typography>

                      <Box sx={{ display: "flex", zIndex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{ width: 60, textAlign: "right", pr: 1 }}
                        >
                          {value.toLocaleString()}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          sx={{ width: 60, textAlign: "right" }}
                        >
                          {percentage}%
                        </Typography>
                      </Box>
                    </Box>
                  </ValueRow>
                );
              })}
            </List>
          </StyledListContainer>
        </CardContent>
      </StyledTooltipCard>
    </DraggableComponent>
  );
}
function trimStr(str, maxLength) {
  if (str === undefined || str === "") return "";
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
}
export default PlayerComposition;
