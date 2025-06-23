import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import s from "./dashboard.module.css";
import sc from "./customDashboard.module.css";

import UniversalChart from "../charts/chartBuilder/UniversalChart";
import Typography from "@mui/material/Typography";
import { Helmet } from "react-helmet";
import titles from "titles";
import useApi from "@strix/api";
import { useNavigate, Link, useLocation } from "react-router-dom";
import dayjs from "dayjs";

import { Tooltip } from "@mui/material";
import MoreVertSharpIcon from "@mui/icons-material/MoreVertSharp";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";

import { Responsive, WidthProvider } from "react-grid-layout";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import PropTypes from "prop-types";
import _ from "lodash";
import { useEffectOnce } from "react-use";
import { useAlert } from "@strix/alertsContext";
import shortid from "shortid";

import "../../../../../node_modules/react-grid-layout/css/styles.css";
import "../../../../../node_modules/react-resizable/css/styles.css";
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);
const ResponsiveReactGridLayout = WidthProvider(Responsive);
function ChartSettingsMenu({ onClone, onRemove, onConfigure }) {
  // Settings
  const [settingsHovered, setSettingsHovered] = useState(false);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const settingsOpened = Boolean(settingsAnchorEl);
  const handleClickSettings = (e) => {
    setSettingsAnchorEl(e.currentTarget);
    setSettingsHovered(true);
  };
  const handleCloseSettings = () => {
    setSettingsHovered(false);
    setSettingsAnchorEl(null);
  };
  return (
    <>
      <Tooltip title="Settings">
        <IconButton
          sx={{ p: 0, zIndex: 5 }}
          onClick={(e) => handleClickSettings(e)}
        >
          <MoreVertSharpIcon
            sx={{ fontSize: 32 }}
            htmlColor={
              settingsHovered ? "#fff" : settingsOpened ? "#b8b8b8" : "#e7e7e7"
            }
          />
        </IconButton>
      </Tooltip>
      <Popover
        id={"simple-popover"}
        open={settingsOpened}
        anchorEl={settingsAnchorEl}
        onClose={handleCloseSettings}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              backgroundImage: "none",
              backgroundColor: "var(--bg-color3)",
              p: 2,
              overflow: "hidden",
            },
          },
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Button sx={{ textTransform: "none" }}>
            <Typography
              onClick={onConfigure}
              variant="subtitle1"
              color={"text.primary"}
            >
              Edit
            </Typography>
          </Button>
          <Button sx={{ textTransform: "none" }}>
            <Typography
              onClick={() => {
                onClone();
              }}
              variant="subtitle1"
              color={"text.primary"}
            >
              Clone
            </Typography>
          </Button>
          <Button onClick={onRemove} sx={{ textTransform: "none" }}>
            <Typography variant="subtitle1" color={"text.primary"}>
              Remove
            </Typography>
          </Button>
        </div>
      </Popover>
    </>
  );
}

const DashboardCustom = ({
  filterDate,
  filterSegments,
  game,
  branch,
  environment,
  isEditingLayout,
  layoutEditCommand,
  refreshCommand,
  onRefreshStateChange,
  includeBranchInAnalytics,
  includeEnvironmentInAnalytics,
}) => {
  const Navigate = useNavigate();
  const { triggerAlert } = useAlert();
  const {
    getAnalyticsEvents,
    getDashboardByLink,
    queryUniversalAnalytics,
    updateCustomDashboardCharts,
    removeChartFromCustomDashboard,
    addChartToCustomDashboard,
  } = useApi();
  const { link } = useParams();
  const location = useLocation();

  // const [isFetchingData, setIsFetchingData] = useState({});

  const isFetchingData = useRef({});
  const [loadingState, setLoadingState] = useState({});

  const [dashboardSettings, setDashboardSettings] = useState({});

  const [chartObjects, setChartObjects] = useState([]);
  const cachedChartObjects = useRef([]);

  const overrideChartSettings = {
    chartSettings: {
      fullWidth: false,
      customWidth: "100%",
      customHeight: "400px",
      canvasHeight: "100%",
      canvasWidth: "100%",
    },
  };

  useEffect(() => {
    if (loadingState) {
      onRefreshStateChange(
        Object.values(loadingState).every((i) => i === true)
      );
    }
  }, [loadingState]);

  useEffect(() => {
    async function fetchData() {
      const response = await getDashboardByLink({
        gameID: game.gameID,
        branch,
        linkName: link,
      });
      // console.log("Dashboard settings", response.dashboard);
      if (response.success) {
        setDashboardSettings(response.dashboard);

        if (response.dashboard.charts.length > 0) {
          let charts = response.dashboard.charts.map((chart, i) => {
            return {
              ...chart,
              chartSettings: Object.assign(
                {},
                chart.chartSettings,
                overrideChartSettings.chartSettings
              ),
              metrics: chart.metrics.map((m) => ({ ...m, data: [] })),
            };
          });
          fetchAnalyticsData(charts);
          setChartObjects(charts);
        }
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (refreshCommand && refreshCommand !== "" && refreshCommand === "fetch") {
      fetchAnalyticsData(chartObjects);
    }
  }, [refreshCommand]);

  const [layout, setLayout] = useState([]);
  function createLayoutFromCurrentObjects(objects) {
    setLayout(
      objects.map((c) => {
        if (c.layoutSettings) {
          return {
            i: c.chartID,
            ...c.layoutSettings,
          };
        } else {
          return {
            i: c.chartID,
            x: 0,
            y: 0,
            w: 4,
            h: 2,
            minW: 2,
            minH: 2,
          };
        }
      })
    );
  }
  function saveLayout() {
    let temp = chartObjects.map((c) => {
      c.layoutSettings = layout.find((i) => i.i === c.chartID);
      return c;
    });
    setChartObjects(temp);
    saveDashboard(temp);
  }
  async function saveDashboard(charts) {
    let objs = [...charts];
    objs = objs.map((c) => {
      delete c.metrics.data;
      return c;
    });
    const resp = await updateCustomDashboardCharts({
      gameID: game.gameID,
      branch: branch,
      dashboardID: dashboardSettings.id,
      newCharts: objs,
    });
    if (resp.success) {
      triggerAlert("Dashboard updated successfully", "success");
    }
  }

  const initializedLayoutOnce = useRef(false);
  useEffect(() => {
    if (
      !initializedLayoutOnce.current &&
      chartObjects &&
      chartObjects.length > 0
    ) {
      createLayoutFromCurrentObjects(chartObjects);
      initializedLayoutOnce.current = true;
    }
  }, [chartObjects]);

  useEffect(() => {
    switch (layoutEditCommand) {
      case "accept":
        saveLayout();
        break;
      case "cancel":
        if (cachedChartObjects.current) {
          setChartObjects(cachedChartObjects.current);
        }
        createLayoutFromCurrentObjects(chartObjects);
        break;
      case "":
      default:
        break;
    }
  }, [layoutEditCommand]);

  useEffect(() => {
    if (isEditingLayout) {
      cachedChartObjects.current = chartObjects;
    }
  }, [isEditingLayout]);

  let fetchTimer = null;
  async function fetchAnalyticsData_Internal(
    chartObj,
    calledFromMetricsUpdate
  ) {
    let newMetrics = chartObj.metrics;

    const metricsForQuery = newMetrics.map((m) => {
      const properMetric = {
        queryCategoryFilters: m.queryCategoryFilters,
        queryEventTargetValueId: m.queryEventTargetValueId,
        queryAnalyticEventID: m.queryAnalyticEventID,
        queryMethod: m.queryMethod,
        queryValueFilters: m.queryValueFilters,
        queryPercentile: m.queryMethodSecondaryValue,
        dimension: m.dimension,
        categoryField: m.categoryField,
      };
      return properMetric;
    });

    if (newMetrics.length === 0) {
      return;
    }

    let updatedMetrics = newMetrics;
    console.log(
      "FETCHING DATA, CHART:",
      JSON.parse(JSON.stringify(chartObj)),
      " Is fetching data:",
      isFetchingData.current
    );

    isFetchingData.current = {
      ...isFetchingData.current,
      [chartObj.chartID]: true,
    };
    setLoadingState(isFetchingData.current);

    try {
      const response = await queryUniversalAnalytics({
        gameID: game.gameID,
        branch: branch,
        environment: environment,
        includeBranchInAnalytics: includeBranchInAnalytics,
        includeEnvironmentInAnalytics: includeEnvironmentInAnalytics,
        filterDate: [filterDate.startDate, filterDate.endDate],
        filterSegments: filterSegments.map((segment) => segment.segmentID),
        metrics: metricsForQuery,
      });

      if (response.success) {
        updatedMetrics = newMetrics.map((metric, index) => {
          metric.data = response.message[index];
          return metric;
        });

        console.log("Metrics after data fetch:", newMetrics, updatedMetrics);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      isFetchingData.current = {
        ...isFetchingData.current,
        [chartObj.chartID]: false,
      };
      setLoadingState(isFetchingData.current);
    }

    let analyticsEvents = await getAnalyticsEvents({
      gameID: game.gameID,
      branch: branch,
      eventIDs: newMetrics.map((metric) => metric.queryAnalyticEventID),
    });

    if (analyticsEvents.success) {
      analyticsEvents = analyticsEvents.events
    }


    updatedMetrics = updatedMetrics.map((metric) => {
      let event = analyticsEvents.find(
        (event) => event.eventID === metric.queryAnalyticEventID
      );
      metric.eventName = event.eventName;
      metric.valueName = event.values.find(
        (v) => v.uniqueID === metric.queryEventTargetValueId
      ).valueName;

      switch (
        event.values.find((v) => v.uniqueID === metric.queryEventTargetValueId)
          .valueFormat
      ) {
        case "money":
          metric.datasetConfig.config.metricFormat = "$";
          metric.datasetConfig.config.metricFormatPosition = "start";
          metric.datasetConfig.config.tooltipText = "";
          break;
        case "percentile":
          metric.datasetConfig.config.metricFormat = "%";
          metric.datasetConfig.config.metricFormatPosition = "end";
          metric.datasetConfig.config.tooltipText = "";
          break;
        default:
          metric.datasetConfig.config.metricFormat = "";
          metric.datasetConfig.config.metricFormatPosition = "end";
          metric.datasetConfig.config.tooltipText = "";
          break;
      }
      return metric;
    });

    // Here we extracting all category data from all data we got
    let categoryData = [];

    if (updatedMetrics.some((m) => m.data.length > 0)) {
      if (
        chartObj.secondaryDimension &&
        chartObj.secondaryDimension.length > 0
      ) {
        // Case when selectedSecondaryCategory is not empty
        categoryData = updatedMetrics.map((metric) =>
          metric.data.map(
            (dataItem) =>
              `${chartObj.categoryField === "timestamp" ? dayjs.utc(dataItem.x).format("ddd, MMM DD ") : dataItem.x} | ${dataItem.x1}`
          )
        );
        if (chartObj.categoryField === "timestamp") {
          categoryData = categoryData.sort((a, b) => new Date(a) - new Date(b));
        }
      } else {
        // Case when selectedSecondaryCategory is empty
        categoryData = updatedMetrics.map((metric) =>
          metric.data.map((dataItem) => dataItem.x)
        );
      }

      // Flatten the array and create a Set to ensure unique values
      categoryData = new Set(
        categoryData.reduce((acc, curr) => {
          return acc.concat(curr);
        }, [])
      );

      // Convert the Set back to an array
      categoryData = Array.from(categoryData);

      if (chartObj.categoryField === "timestamp") {
        categoryData = categoryData.sort((a, b) => new Date(a) - new Date(b));

        updatedMetrics = updatedMetrics.map((metric) => {
          const existingDates = metric.data.map((dataItem) => dataItem.x);

          categoryData.forEach((date) => {
            if (!existingDates.includes(date)) {
              metric.data.push({
                x: date,
                y: 0,
                ...(metric.data.some(
                  (d) => d.label !== undefined && d.label !== null
                )
                  ? { label: 0 }
                  : {}),
              });
            }
          });
          metric.data = metric.data.sort(
            (a, b) => new Date(a.x) - new Date(b.x)
          );

          return metric;
        });
      }
    }

    if (calledFromMetricsUpdate) {
      setChartObj(
        {
          ...chartObj,
        },
        chartObj.chartID
      );
    } else {
      setChartObj(
        {
          ...chartObj,
          metrics: updatedMetrics,
        },
        chartObj.chartID
      );
    }
  }
  async function fetchAnalyticsData(charts) {
    if (charts.length === 0) {
      setTimeout(() => {
        onRefreshStateChange(false);
      }, 500);
      return;
    }
    clearTimeout(fetchTimer);
    fetchTimer = setTimeout(async () => {
      charts.forEach((chart, i) => {
        fetchAnalyticsData_Internal(
          JSON.parse(JSON.stringify(chart)),
          false,
          i
        );
      });
    }, 1000);
  }

  function setChartObj(chartObj, chartID) {
    setChartObjects((prevCharts) => {
      return prevCharts.map((chart, i) => {
        if (chart.chartID === chartID) {
          return chartObj;
        }
        return chart;
      });
    });
  }

  function onLayoutChange(layout) {
    setLayout(layout);
  }

  function trimStr(str, maxLength) {
    if (str === undefined || str === "") return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}` : str;
  }
  function onChartNameChanged(chartID, newName) {
    newName = trimStr(newName, 50);
    setChartObjects((prevCharts) => {
      return prevCharts.map((chart, i) => {
        if (chart.chartID === chartID) {
          chart.name = newName;
        }
        return chart;
      });
    });
  }

  function onRemoveChart(chartID) {
    let t = [...chartObjects];
    t = t.filter((chart) => chart.chartID !== chartID);
    setChartObjects(t);
    setLayout(layout.filter((chart) => chart.i !== chartID));
  }
  function onCloneChart(chartID) {
    let t = [...chartObjects];
    let clone = { ...chartObjects.find((c) => c.chartID === chartID) };
    clone.chartID = shortid.generate();
    clone.layoutSettings = {
      ...clone.layoutSettings,
      i: clone.chartID,
    };
    t.push(clone);
    setChartObjects(t);
    setLayout([...layout, clone.layoutSettings]);
  }
  function onConfigureChart(chartID) {
    const params = new URLSearchParams(window.location.search);
    params.set("editChart", chartID);
    const newPath = `/charts?${params.toString()}`;
    Navigate(newPath);
  }

  return (
    <div className={sc.dashboardContent}>
      <Helmet>
        <title>
          {dashboardSettings && dashboardSettings.name
            ? dashboardSettings.name
            : "Dashboard"}{" "}
          | Strix
        </title>
      </Helmet>

      {chartObjects.length == 0 && (
        <Typography
          color="text.grey"
          fontSize={32}
          sx={{
            width: "100%",
            pt: "20%",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          No charts here yet. <br /> You can create and save charts here from{" "}
          <Link to="/charts">Explore Data</Link>
        </Typography>
      )}

      <ResponsiveReactGridLayout
        layouts={{ md: layout }}
        onLayoutChange={onLayoutChange}
        measureBeforeMount={false}
        useCSSTransforms={true}
        // compactType={"horizontal"}
        preventCollision={true}
        draggableHandle={".draggableChartArea"}
        resizeHandles={["s", "w", "e", "n", "sw", "nw", "se", "ne"]}
        // Editing
        isDraggable={isEditingLayout}
        isResizable={isEditingLayout}
      >
        {chartObjects &&
          chartObjects.length > 0 &&
          chartObjects.map((chart, index) => (
            <div
              data-grid={layout[index]}
              className={sc.chartContainer}
              key={chart.chartID}
            >
              <UniversalChart
                chartObj={chart}
                dateRange={filterDate}
                onNameChanged={(newName) =>
                  onChartNameChanged(chart.chartID, newName)
                }
                hasSecondaryDimension={chart.secondaryDimension || false}
                isLoading={loadingState[chart.chartID]}
                customSettings={
                  <ChartSettingsMenu
                    onClone={() => onCloneChart(chart.chartID)}
                    onRemove={() => onRemoveChart(chart.chartID)}
                    onConfigure={() => onConfigureChart(chart.chartID)}
                  />
                }
                disableMargin={true}
                resizeable={true}
                layoutEditMode={isEditingLayout}
                isCustomDashboard={true}
              />
            </div>
          ))}
      </ResponsiveReactGridLayout>
    </div>
  );
};

export default DashboardCustom;
