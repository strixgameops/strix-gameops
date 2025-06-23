import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import s from "./dashboard.module.css";

import Navbar from "../../navbar/Navbar";
import { useBranch, useGame } from "@strix/gameContext";
import { DashboardMon_RealMoney } from "../../../app/conditionalImports";
import DashboardMon_InGameCurr from "./DashboardMon_InGameCurr";
import DashboardCustom from "./DashboardCustom";
import DashboardGeneral from "./DashboardGeneral";
import DashboardRetention from "./DashboardRetention";

import dayjs from "dayjs";
import { addDays } from "date-fns";
import { Divider, Box } from "@mui/material";
import ListItem from "@mui/material/ListItem";
import List from "@mui/material/List";
import Chip from "@mui/material/Chip";
import Input from "@mui/material/Input";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import { DateRangePicker } from "react-date-range";
import StackedLineChartSharpIcon from "@mui/icons-material/StackedLineChartSharp";
import SensorOccupiedSharpIcon from "@mui/icons-material/SensorOccupiedSharp";
import GetBackIcon from "@mui/icons-material/KeyboardBackspaceSharp";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ForkRightIcon from "@mui/icons-material/ForkRight";
import AutorenewSharpIcon from "@mui/icons-material/AutorenewSharp";
import AppRegistrationSharpIcon from "@mui/icons-material/AppRegistrationSharp";
import CheckSharpIcon from "@mui/icons-material/CheckSharp";
import CloseSharpIcon from "@mui/icons-material/CloseSharp";
import LoadingButton from "@mui/lab/LoadingButton";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

// Filter by segments
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import { useTheme } from "@mui/material/styles";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import DatePicker from "shared/datePicker/DatePickerWidget.jsx";

import PortableSegmentBuilder from "shared/newSegmentModal/PortableSegmentBuilder";
import { useNavigate } from "react-router-dom";

import { useEffectOnce } from "react-use";
import { useLocation } from "react-router-dom";
import SegmentsPicker from "shared/segmentsWidget/SegmentsPickerWidget.jsx";

import useApi from "@strix/api";

const Dashboards = () => {
  const { link } = useParams();
  const { getAllSegmentsForAnalyticsFilter, getEntitiesIDs } = useApi();
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const location = useLocation();

  const theme = useTheme();
  const Navigate = useNavigate();

  const [filterSegments, setFilteredSegments] = useState([]);
  const [filterSegmentsSecondary, setFilteredSegmentsSecondary] = useState([]);

  const [segmentsList, setSegmentsList] = useState([]);

  const [filterCurrencies, setFilteredCurrencies] = useState([]);
  const [currenciesList, setCurrenciesList] = useState([]);

  const [actionItems, setActionItems] = useState([]);
  const [openSegmentBuilder, setOpenSegmentBuilder] = useState(false);

  const [includeBranchInAnalytics, setIncludeBranchInAnalytics] =
    useState(false);

  const [includeEnvironmentInAnalytics, setIncludeEnvironmentInAnalytics] =
    useState(false);

  const [comparisonMode, setComparisonMode] = useState(false);

  const [isCustomDashboard, setIsCustomDashboard] = useState(false);

  const [readyToRender, setReadyToRender] = useState(false);

  // Special state for retention dashboard - secondary date range
  const [filterDateSecondary, setFilteredDateSecondary] = useState([]);
  const [isSecondaryDateEnabled, setIsSecondaryDateEnabled] = useState(true);

  // The most default chart obj. Contains all default settings we need to customize.
  const defaultChartObj = {
    // Must be unique for every chart on page, because we seek for canvases with name that
    // created by appending chartID to 'lineChart' or 'funnelChart' or whatever chart
    chartID: "0",

    // Visual chart name
    name: "ChartName",

    // Metric
    metricName: "metricName",
    // Can be any symbol we need before or after the delta label (if its enabled)
    metricFormat: "",
    // Can be 'end' or 'start'
    metricFormatPosition: "start",

    // Leaving blank as it will be filled when we fetch data
    data: {},

    // Customization
    chartSettings: {
      // Define chart type. Use it later to draw various components
      type: "line",
      // Text on hovering any value on chart
      tooltipText: " default tooltip text",

      // Display delta (+100%, -$100) in the up-right corner
      showDelta: true,

      // Show legends. May be useful to disable it is we have only 1 dataset on chart
      showLegend: false,
      // Legend position relative to chart. By ChartJS defaults it is 'top', so we do the same
      legendPosition: "top",

      // Data labels (i.e. share percents on pie graph)
      showDataLabels: false,

      // Determine if we want to format Y axis on Line Chart
      customTickFormatY: false,
      // Can be "money" ($20), "percentile" (20%), "minutes" (2m 0s)
      customTickFormatYType: "",

      // Determine if we want to show full width chart (100% width when true, static width from lineChart.module.css when false)
      fullWidth: false,
    },

    // Fields we use as categories
    categoryField: "timestamp",

    // Fields we use as values
    valueFields: ["value"],
  };

  // Segment filter styling
  const ITEM_HEIGHT = 48;
  const ITEM_PADDING_TOP = 8;
  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
      },
    },
  };
  // Getting segment list
  async function fetchSegmentList() {
    const response = await getAllSegmentsForAnalyticsFilter({
      gameID: game.gameID,
      branch: branch,
    });
    if (response.success) {
      // Segments with "everyone" segment
      let segments = response.message;

      // Always remove "everyone" segment, regardless of dashboard type
      for (let i = 0; i < segments.length; i++) {
        if (segments[i].segmentID === "everyone") {
          segments.splice(i, 1);
          break;
        }
      }

      // Populate segments filter with segments
      setSegmentsList(segments);
    }
  }

  async function fetchCurrenciesList() {
    const response = await getEntitiesIDs({
      gameID: game.gameID,
      branch: branch,
    });
    if (response.success) {
      setCurrenciesList(
        response.entities.filter(
          (entity) => entity.entityBasic.isCurrency === true
        )
      );
    }
  }
  useEffect(() => {
    fetchData();
  }, []);
  const [filterDate, setFilteredDate] = useState([]);

  async function fetchData() {
    fetchSegmentList();
    fetchCurrenciesList();
  }

  useEffect(() => {
    if (segmentsList) {
      const params = new URLSearchParams(location.search);
      const isComparison = params.get(`compareSegments`);

      if (isComparison) {
        setComparisonMode(true);
        const segment1 = params.get(`segment1`);
        const segment2 = params.get(`segment2`);

        if (segment1 && segmentsList.find((s) => s.segmentID === segment1)) {
          setFilteredSegments([
            segmentsList.find((s) => s.segmentID === segment1),
          ]);
        }
        if (segment2 && segmentsList.find((s) => s.segmentID === segment2)) {
          setFilteredSegmentsSecondary([
            segmentsList.find((s) => s.segmentID === segment2),
          ]);
        }
      }
      setTimeout(() => {
        setReadyToRender(true);
      }, 1000);
    }
  }, [segmentsList]);

  function makeDateRangeForChart() {
    if (filterDate.length === 0)
      return {
        startDate: dayjs.utc().subtract(7, "day").startOf("day"),
        endDate: dayjs.utc().endOf("day"),
      };
    function getTimeseriesMin() {
      const result = dayjs.utc(filterDate[0]).startOf("day");
      return result;
    }
    function getTimeseriesMax() {
      const result = dayjs.utc(filterDate[1]).endOf("day");
      return result;
    }
    const dateFilter = {
      startDate: getTimeseriesMin(),
      endDate: getTimeseriesMax(),
    };
    return dateFilter;
  }

  function makeSecondaryDateRangeForChart() {
    if (filterDateSecondary.length === 0 || !isSecondaryDateEnabled)
      return null;
    function getTimeseriesMin() {
      const result = dayjs.utc(filterDateSecondary[0]).startOf("day");
      return result;
    }
    function getTimeseriesMax() {
      const result = dayjs.utc(filterDateSecondary[1]).endOf("day");
      return result;
    }
    const dateFilter = {
      startDate: getTimeseriesMin(),
      endDate: getTimeseriesMax(),
    };
    return dateFilter;
  }

  useEffect(() => {
    switch (link) {
      case "iap":
      case "generalanalytics":
      case "ingamecurrency":
      case "retention":
        setIsCustomDashboard(false);
        break;
      default:
        // reset all filters
        setFilteredSegments([]);
        setSegmentsList([]);
        setFilteredCurrencies([]);
        setCurrenciesList([]);
        setActionItems([]);

        setRefreshingCustomDashboard(false);
        setLayoutEditCommand("");
        setIsEditingCustomDashboardLayout(false);

        setIsCustomDashboard(true);
        break;
    }
  }, [link]);

  function renderDashboard(isSecondary) {
    const filteredSegments = isSecondary
      ? filterSegmentsSecondary
      : filterSegments;
    switch (link) {
      case "generalanalytics":
        return (
          <DashboardGeneral
            key="generalanalytics"
            defaultChartObj={defaultChartObj}
            filterDate={makeDateRangeForChart()}
            filterSegments={filteredSegments}
            game={game}
            branch={branch}
            environment={environment}
            includeBranchInAnalytics={includeBranchInAnalytics}
            includeEnvironmentInAnalytics={includeEnvironmentInAnalytics}
            onActionItemsChanged={(items) => setActionItems(items)}
          />
        );
      case "iap":
        return (
          <DashboardMon_RealMoney
            key="iap"
            defaultChartObj={defaultChartObj}
            filterDate={makeDateRangeForChart()}
            filterSegments={filteredSegments}
            game={game}
            branch={branch}
            environment={environment}
            includeBranchInAnalytics={includeBranchInAnalytics}
            includeEnvironmentInAnalytics={includeEnvironmentInAnalytics}
            onActionItemsChanged={(items) => setActionItems(items)}
          />
        );
      case "ingamecurrency":
        return (
          <DashboardMon_InGameCurr
            key="ingamecurrency"
            allCurrencyEntities={currenciesList}
            defaultChartObj={defaultChartObj}
            filterCurrencies={filterCurrencies.map((c) => c.nodeID)}
            filterDate={makeDateRangeForChart()}
            filterSegments={filteredSegments}
            game={game}
            branch={branch}
            environment={environment}
            includeBranchInAnalytics={includeBranchInAnalytics}
            includeEnvironmentInAnalytics={includeEnvironmentInAnalytics}
            onActionItemsChanged={(items) => setActionItems(items)}
          />
        );
      case "retention":
        return (
          <DashboardRetention
            key="retention"
            defaultChartObj={defaultChartObj}
            filterDate={makeDateRangeForChart()}
            filterDateSecondary={makeSecondaryDateRangeForChart()}
            filterSegments={filteredSegments}
            game={game}
            branch={branch}
            environment={environment}
            includeBranchInAnalytics={includeBranchInAnalytics}
            includeEnvironmentInAnalytics={includeEnvironmentInAnalytics}
          />
        );

      default:
        return (
          <DashboardCustom
            key={link}
            filterDate={makeDateRangeForChart()}
            filterSegments={filteredSegments}
            game={game}
            branch={branch}
            environment={environment}
            includeBranchInAnalytics={includeBranchInAnalytics}
            includeEnvironmentInAnalytics={includeEnvironmentInAnalytics}
            isEditingLayout={isEditingCustomDashboardLayout}
            layoutEditCommand={layoutEditCommand}
            onRefreshStateChange={(state) => {
              if (!state) {
                setRefreshCustomDashboardCommand("");
              }
              setRefreshingCustomDashboard(state);
            }}
            refreshCommand={refreshCustomDashboardCommand}
          />
        );
    }
  }

  function compareDataItems() {
    if (actionItems.length > 0) {
      localStorage.setItem(
        `comparison_${game.gameID}`,
        JSON.stringify(actionItems)
      );
      Navigate(`/charts?comparison=${game.gameID}`);
    }
  }

  function navigateToCustomDashboards() {
    Navigate(`/customdashboards`);
  }

  const [isEditingCustomDashboardLayout, setIsEditingCustomDashboardLayout] =
    useState(false);
  const [layoutEditCommand, setLayoutEditCommand] = useState("");
  useEffect(() => {
    if (!isEditingCustomDashboardLayout) {
      setLayoutEditCommand("");
    }
  }, [isEditingCustomDashboardLayout]);

  const [refreshCustomDashboardCommand, setRefreshCustomDashboardCommand] =
    useState("fetch");
  const [refreshingCustomDashboard, setRefreshingCustomDashboard] =
    useState(false);

  // Render the dashboard upperbar for retention
  const renderRetentionUpperbar = () => (
    <div className={s.dashboardUpperbar}>
      {/* Custom charts button to get back to list */}
      {isCustomDashboard && (
        <Tooltip title={`Back to dashboards list`} placement="bottom">
          <Button
            onClick={() => navigateToCustomDashboards()}
            sx={{
              p: 0,
              minWidth: "40px",
              mr: 2,
            }}
          >
            <GetBackIcon />
          </Button>
        </Tooltip>
      )}

      {/* Primary Date Range Picker */}
      <Tooltip
        title="Select date range for Rolling Retention chart (shows retention across all players active in this period)"
        placement="bottom"
        disableInteractive
      >
        <div style={{ marginRight: "20px" }}>
          <DatePicker
            skipInitialize={false}
            onInitialize={(newDates) => {
              setFilteredDate(newDates);
            }}
            onStateChange={(newDates) => {
              setFilteredDate(newDates);
            }}
          />
        </div>
      </Tooltip>

      {/* Toggle for secondary date */}
      <Tooltip
        title="Switch between Rolling Retention and New Players Retention"
        placement="bottom"
        disableInteractive
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={isSecondaryDateEnabled}
              onChange={(e) => {
                setIsSecondaryDateEnabled(e.target.checked);
                // If we're turning off the second date, clear its value
                if (!e.target.checked) {
                  setFilteredDateSecondary([]);
                }
              }}
            />
          }
          sx={{ transform: "translateY(4px)", mr: -1.1 }}
        />
      </Tooltip>

      {/* Secondary Date Range Picker - disabled when toggle is off */}
      {isSecondaryDateEnabled && (
        <Tooltip
          title="Select date range for New Players Retention chart (analyzes only new players who joined in this period)"
          placement="bottom"
          disableInteractive
        >
          <div style={{ marginLeft: "15px" }}>
            <DatePicker
              skipInitialize={false}
              onInitialize={(newDates) => {
                setFilteredDateSecondary(newDates);
              }}
              onStateChange={(newDates) => {
                setFilteredDateSecondary(newDates);
              }}
            />
          </div>
        </Tooltip>
      )}

      {/* Segments */}
      <SegmentsPicker
        segments={segmentsList}
        currentSegments={filterSegments}
        onStateChange={(s) => setFilteredSegments(s)}
        customSx={{ ml: 2, width: 200 }}
      />

      <Box sx={{ m: 0, ml: "auto", mr: 3 }}>
        <Tooltip
          title="Show analytics only for the selected game version"
          disableInteractive
        >
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Checkbox
                checked={includeBranchInAnalytics}
                onChange={(e) => {
                  setIncludeBranchInAnalytics(!includeBranchInAnalytics);
                }}
              />
            }
            label="By version"
          />
        </Tooltip>
        <Tooltip
          title="Show analytics only for the selected game environment"
          disableInteractive
        >
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Checkbox
                checked={includeEnvironmentInAnalytics}
                onChange={(e) => {
                  setIncludeEnvironmentInAnalytics(
                    !includeEnvironmentInAnalytics
                  );
                }}
              />
            }
            label="By environment"
          />
        </Tooltip>
      </Box>
    </div>
  );

  // Render the regular dashboard upperbar
  const renderRegularUpperbar = () => (
    <div className={s.dashboardUpperbar}>
      {/* Custom charts button to get back to list */}
      {isCustomDashboard && (
        <Tooltip title={`Back to dashboards list`} placement="bottom">
          <Button
            onClick={() => navigateToCustomDashboards()}
            sx={{
              p: 0,
              minWidth: "40px",
              mr: 2,
            }}
          >
            <GetBackIcon />
          </Button>
        </Tooltip>
      )}

      {/* Date range picker */}
      <DatePicker
        onStateChange={(newDates) => {
          setFilteredDate(newDates);
        }}
      />

      {/* Segments */}
      <SegmentsPicker
        segments={segmentsList}
        currentSegments={filterSegments}
        onStateChange={(s) => setFilteredSegments(s)}
        customSx={{ ml: 2, width: 200 }}
        customLabelEnding={comparisonMode ? " (Left)" : ""}
      />
      {comparisonMode && (
        <SegmentsPicker
          segments={segmentsList}
          currentSegments={filterSegmentsSecondary}
          onStateChange={(s) => setFilteredSegmentsSecondary(s)}
          customSx={{ ml: 2, width: 200 }}
          customLabelEnding={comparisonMode ? " (Right)" : ""}
        />
      )}

      <Button
        sx={(theme) => ({
          ml: 2,
          ...theme.applyStyles("dark", {
            color: theme.palette.text.primary,
          }),
          ...theme.applyStyles("light", {
            color: theme.palette.text.primary,
          }),
        })}
        onClick={() => setComparisonMode(!comparisonMode)}
      >
        <StackedLineChartSharpIcon sx={{ fontSize: 20, mr: 1 }} />
        Segments comparison
      </Button>

      {!isCustomDashboard && (
        <Button
          onClick={() => compareDataItems()}
          sx={(theme) => ({
            ml: 2,
            ...theme.applyStyles("dark", {
              color: theme.palette.text.primary,
            }),
            ...theme.applyStyles("light", {
              color: theme.palette.text.primary,
            }),
          })}
          disabled={
            actionItems.length === 0 ||
            actionItems.some((a) => a.type === "paymentsConversion")
          }
        >
          <StackedLineChartSharpIcon sx={{ fontSize: 20, mr: 1 }} /> Compare
          selected
        </Button>
      )}

      {!isCustomDashboard && (
        <Button
          sx={(theme) => ({
            ml: 2,
            ...theme.applyStyles("dark", {
              color: theme.palette.text.primary,
            }),
            ...theme.applyStyles("light", {
              color: theme.palette.text.primary,
            }),
          })}
          disabled={actionItems.length === 0}
          onClick={() => setOpenSegmentBuilder(true)}
        >
          <SensorOccupiedSharpIcon sx={{ fontSize: 20, mr: 1 }} /> Build segment
        </Button>
      )}
      <PortableSegmentBuilder
        profiles={actionItems
          .filter((item) => item.profile)
          .map((item) => item.profile)}
        open={openSegmentBuilder}
        close={() => setOpenSegmentBuilder(false)}
      />

      {isCustomDashboard && (
        <LoadingButton
          loading={refreshingCustomDashboard}
          sx={{ ml: 2, height: "35px" }}
          variant="contained"
          onClick={() => {
            setRefreshCustomDashboardCommand("fetch");
            setRefreshingCustomDashboard(true);
          }}
        >
          <AutorenewSharpIcon sx={{ fontSize: 20, mr: 1 }} /> update
        </LoadingButton>
      )}

      <Box sx={{ m: 0, ml: "auto", mr: 3 }}>
        <Tooltip
          title="Show analytics only for the selected game version"
          disableInteractive
        >
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Checkbox
                checked={includeBranchInAnalytics}
                onChange={(e) => {
                  setIncludeBranchInAnalytics(!includeBranchInAnalytics);
                }}
              />
            }
            label="By version"
          />
        </Tooltip>
        <Tooltip
          title="Show analytics only for the selected game environment"
          disableInteractive
        >
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Checkbox
                checked={includeEnvironmentInAnalytics}
                onChange={(e) => {
                  setIncludeEnvironmentInAnalytics(
                    !includeEnvironmentInAnalytics
                  );
                }}
              />
            }
            label="By environment"
          />
        </Tooltip>
      </Box>

      {isCustomDashboard &&
        (isEditingCustomDashboardLayout ? (
          <div style={{ marginLeft: "auto", marginRight: "36px" }}>
            <Button
              variant="contained"
              onClick={() => {
                setLayoutEditCommand("accept");
                setIsEditingCustomDashboardLayout(false);
              }}
            >
              <CheckSharpIcon sx={{ fontSize: 20, mr: 1 }} /> accept
            </Button>
            <Button
              sx={{ ml: 1 }}
              onClick={() => {
                setLayoutEditCommand("cancel");
                setIsEditingCustomDashboardLayout(false);
              }}
            >
              <CloseSharpIcon sx={{ fontSize: 20, mr: 1 }} /> reset
            </Button>
          </div>
        ) : (
          <Button
            sx={{ ml: "auto", mr: "36px" }}
            onClick={() => setIsEditingCustomDashboardLayout(true)}
          >
            <AppRegistrationSharpIcon sx={{ fontSize: 20, mr: 1 }} /> edit
          </Button>
        ))}
    </div>
  );

  return (
    <div className="overview-main">
      <div className={s.dashboard}>
        {/* Render different upperbar based on the dashboard type */}
        {link === "retention"
          ? renderRetentionUpperbar()
          : renderRegularUpperbar()}

        {readyToRender &&
          (comparisonMode && link !== "retention" ? (
            <div className={s.horizontalBody}>
              <main className={`${s.dashboardContainer} ${s.horizontal}`}>
                {renderDashboard()}
              </main>
              <main className={`${s.dashboardContainer} ${s.horizontal}`}>
                {renderDashboard(true)}
              </main>
            </div>
          ) : (
            <main className={s.dashboardContainer}>{renderDashboard()}</main>
          ))}
      </div>
    </div>
  );
};

export default Dashboards;
