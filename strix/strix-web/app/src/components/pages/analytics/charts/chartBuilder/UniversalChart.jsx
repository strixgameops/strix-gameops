import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Skeleton from "@mui/material/Skeleton";
import s from "./universalChart.module.css";
import MuiTooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";

// Date modules
import dayjs from "dayjs";
import utcPlugin from "dayjs-plugin-utc";

// Chart plugins
import { Tooltip } from "chart.js";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "chartjs-adapter-moment";
import zoomPlugin from "chartjs-plugin-zoom";
// For coloring
import chroma from "chroma-js";
import { Typography } from "@mui/material";
import TextField from "@mui/material/TextField";
import shortid from "shortid";
import Box from "@mui/material/Box";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import OpenWithSharpIcon from "@mui/icons-material/OpenWithSharp";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";

import Modal from "@mui/material/Modal";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import Badge from "@mui/material/Badge";
import { styled } from "@mui/material/styles";
import { useGame, useBranch } from "@strix/gameContext";
import { useAlert } from "@strix/alertsContext";
import AlertModal from "./AlertingModal";

import useApi from "@strix/api";

const IconContainer = styled(Box)(({
  theme,
  color = "primary",
  size = "medium",
}) => {
  const colors = {
    primary: "#6f63ff",
    warning: "#f59e0b",
    error: "#ef4444",
    success: "#22c55e",
  };

  const sizes = {
    small: { width: "36px", height: "36px", fontSize: "18px" },
    medium: { width: "44px", height: "44px", fontSize: "22px" },
    large: { width: "52px", height: "52px", fontSize: "26px" },
  };

  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...sizes[size],
    borderRadius: "12px",
    background: `${colors[color]}15`,
    color: colors[color],
    border: `2px solid ${colors[color]}30`,
    transition: "all 0.3s ease",
    cursor: "pointer",
    "&:hover": {
      background: colors[color],
      color: "#ffffff",
      transform: "scale(1.1)",
      boxShadow: `0 8px 25px ${colors[color]}40`,
    },
  };
});

// Register chart plugins
Chart.register(ChartDataLabels, Tooltip, zoomPlugin);

const UniversalChart = ({
  chartObj,
  dateRange,
  isLoading = false,
  onPreparedDatasetsChange,
  headerWidget,
  customSettings,
  disableMargin = false,
  isCustomDashboard,
  onNameChanged,
  layoutEditMode,
}) => {
  const chartUID = useMemo(() => {
    return shortid.generate() || chartObj.chartID;
  }, [chartObj.chartID]);
  const { createAlert, updateAlert, removeAlert, getAlertsByChartID } =
    useApi();

  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { triggerAlert } = useAlert();

  const [showSkeleton, setShowSkeleton] = useState(true);
  const [chartRendered, setChartRendered] = useState(false);
  const [currentGranularity, setCurrentGranularity] = useState();
  const [showNoDataError, setShowNoDataError] = useState(false);
  const [currentDeltaValue, setCurrentDeltaValue] = useState(0);

  const [alertThresholds, setAlertThresholds] = useState([]);
  const [isEditingAlert, setIsEditingAlert] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertManageDialogOpen, setAlertManageDialogOpen] = useState(false);
  const [currentAlertConfig, setCurrentAlertConfig] = useState({
    alertID: shortid.generate(),
    chartID: chartObj.chartID,
    thresholdValue: "",
    observedMetricFieldName: 0,
    timeWindow: 5,
    alertName: "",
    thresholdCondition: "shouldBeBelow",
    alertDescription: "",
    thresholdColor: "red", // Default thresholdColor
  });

  const currentPossibleCategoryLabels = useRef([]);

  // Refs
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const prevDateFilterRef = useRef(null);
  const originalDrawRef = useRef(null);

  useEffect(() => {
    fetchChartAlerts();
  }, []);

  async function fetchChartAlerts() {
    const resp = await getAlertsByChartID({
      gameID: game.gameID,
      branch: branch,
      chartID: chartObj.chartID,
    });
    if (resp.success) {
      setAlertThresholds(resp.alerts);
    }
  }

  const handleCreateAlert = async (alertData) => {
    const newAlert = {
      ...alertData,
      chartID: chartObj.chartID,
    };

    setAlertThresholds((prev) => [...prev, newAlert]);
    const resp = await createAlert({
      gameID: game.gameID,
      branch: branch,
      alertObj: newAlert,
    });

    if (resp.success) {
      triggerAlert("Alert created successfully!", "success");
    } else {
      triggerAlert("Could not create alert!", "error");
    }
  };

  const handleUpdateAlert = async (alertData) => {
    setAlertThresholds((prev) =>
      prev.map((alert) =>
        alert.alertID === alertData.alertID ? alertData : alert
      )
    );

    const resp = await updateAlert({
      gameID: game.gameID,
      branch: branch,
      alertID: alertData.alertID,
      alertObj: alertData,
    });

    if (resp.success) {
      triggerAlert("Alert updated successfully!", "success");
    } else {
      triggerAlert("Could not update alert!", "error");
    }
  };
  const handleManageAlerts = () => {
    setAlertManageDialogOpen(true);
  };

  const handleAlertDialogClose = () => {
    setAlertDialogOpen(false);
  };

  const handleAlertConfigChange = (field) => (event) => {
    setCurrentAlertConfig({
      ...currentAlertConfig,
      [field]: event.target.value,
    });
  };
  const saveAlertThreshold = async () => {
    const newAlert = {
      ...currentAlertConfig,
      thresholdValue: parseFloat(currentAlertConfig.thresholdValue),
    };

    if (isEditingAlert) {
      setAlertThresholds((prev) =>
        prev.map((alert) =>
          alert.alertID === newAlert.alertID ? newAlert : alert
        )
      );
      const resp = await updateAlert({
        gameID: game.gameID,
        branch: branch,
        alertID: newAlert.alertID,
        alertObj: newAlert,
      });
      if (resp.success) {
        triggerAlert("Alert updated successfully!", "success");
      } else {
        triggerAlert("Could not update alert!", "error");
      }
    } else {
      setAlertThresholds((prev) => [...prev, newAlert]);
      const resp = await createAlert({
        gameID: game.gameID,
        branch: branch,
        alertObj: newAlert,
      });
      if (resp.success) {
        triggerAlert(
          "New alert notification is created successfully!",
          "success"
        );
      } else {
        triggerAlert("Could not add new alert!", "error");
      }
    }
    setAlertDialogOpen(false);
  };
  const removeAlertThreshold = async (alertID) => {
    setAlertThresholds((prev) =>
      prev.filter((alert) => alert.alertID !== alertID)
    );

    const resp = await removeAlert({
      gameID: game.gameID,
      branch: branch,
      alertID: alertID,
    });
    if (resp.success) {
      triggerAlert("Alert removed successfully", "success");
    } else {
      triggerAlert("Could not remove alert!", "error");
    }
  };

  useEffect(() => {
    if (chartRef.current) {
      // Save original draw method for this chart
      if (!originalDrawRef.current) {
        originalDrawRef.current = chartRef.current.draw;
      }

      if (alertThresholds.length > 0) {
        chartRef.current.draw = function () {
          originalDrawRef.current.apply(this, arguments);

          const ctx = this.ctx;
          const chartArea = this.chartArea;

          // Draw lines for each alert
          alertThresholds.forEach((alert) => {
            const yAxisId = "y";
            const yAxis = this.scales[yAxisId];

            if (!yAxis) return;

            const y = yAxis.getPixelForValue(alert.thresholdValue);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(chartArea.left, y);
            ctx.lineTo(chartArea.right, y);
            ctx.lineWidth = 2;
            ctx.strokeStyle = alert.thresholdColor;
            ctx.setLineDash([5, 5]);
            ctx.stroke();

            // Add label
            ctx.fillStyle = alert.thresholdColor;
            ctx.font = "12px Inter";
            ctx.fillText(
              `${alert.alertName || "Unnamed"}: ${alert.thresholdValue}`,
              chartArea.right - 150,
              y - 15
            );
            ctx.restore();
          });
        };
      } else {
        // If no alerts, fallback to default draw
        chartRef.current.draw = originalDrawRef.current;
      }
      chartRef.current.update();
    }
  }, [chartRef.current, alertThresholds, chartObj.metrics]);

  // Helpers
  const determineType = useCallback((value) => {
    if (
      new Date(value) !== "Invalid Date" &&
      value.toString().includes("-") &&
      value.toString().includes("Z") &&
      value.toString().includes("T")
    ) {
      return "date";
    } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
      return "number";
    }
    return "string";
  }, []);

  const formatAsDate = useCallback((item) => {
    return dayjs.utc(item).format("ddd, MMM DD HH:MM");
  }, []);

  const generateColorMap = useCallback((arr) => {
    const uniqueStrings = [...new Set(arr)];
    function makeRandomColor(number) {
      const hue = number * 137.508; // use golden angle approximation
      return chroma.hsl(hue % 360, 1, 0.6).hex();
    }
    const colors = uniqueStrings.map((_, index) => makeRandomColor(index));
    return uniqueStrings.reduce((acc, str, index) => {
      acc[str] = colors[index];
      return acc;
    }, {});
  }, []);

  const prepareData = useCallback(() => {
    let preparedDatasets = [];
    let preparedCategories = {};
    let axisGroups = {
      date: { datasets: [], axisId: "x-date" },
      other: [], // Will hold arrays of datasets with non-date axes
    };

    // First, group datasets by their axis type - only include visible (non-hidden) metrics
    chartObj.metrics
      .filter((metric) => (isCustomDashboard ? true : !metric.hidden)) // Filter out hidden datasets
      .forEach((metric, index) => {
        // Check if data has labels
        const hasLabels = metric.data?.some((item) => item.label !== undefined);

        if (hasLabels) {
          // Group data by label
          const dataByLabel = {};
          metric.data.forEach((item) => {
            const label = item.label || "default";
            if (!dataByLabel[label]) {
              dataByLabel[label] = [];
            }
            dataByLabel[label].push(item);
          });

          // Create a separate dataset for each label
          Object.entries(dataByLabel).forEach(([label, labelData]) => {
            const dataset = {
              ...metric.datasetConfig.config,
              data: labelData,
              dataLabel: labelData.map((dataItem) => dataItem.x),
              label: label, // Add label to dataset for identification
            };

            // Apply the existing axis grouping logic
            processDataset(dataset, axisGroups);
          });
        } else {
          // No labels, process normally
          const dataset = {
            ...metric.datasetConfig.config,
            data: metric.data,
            dataLabel: metric.data
              ? metric.data.map((dataItem) => dataItem.x)
              : [],
          };

          processDataset(dataset, axisGroups);
        }
      });

    // Helper function to process each dataset
    function processDataset(dataset, axisGroups) {
      // Check if all items are dates
      const allDates = dataset.dataLabel.every(
        (cat) => determineType(cat) === "date"
      );

      if (allDates) {
        // Add to date group
        axisGroups.date.datasets.push(dataset);
      } else {
        // For non-date axes, check if this axis matches any existing non-date axis group
        const axisSignature = JSON.stringify(dataset.dataLabel.sort());
        let foundMatch = false;

        for (let i = 0; i < axisGroups.other.length; i++) {
          const group = axisGroups.other[i];
          // Compare this dataset's labels with the first dataset in this group
          if (
            JSON.stringify(group.datasets[0].dataLabel.sort()) === axisSignature
          ) {
            group.datasets.push(dataset);
            foundMatch = true;
            break;
          }
        }

        if (!foundMatch) {
          // Create a new group for this unique axis
          axisGroups.other.push({
            datasets: [dataset],
            axisId: `x-other-${axisGroups.other.length}`,
          });
        }
      }
    }

    // Now assign the correct xAxisID to each dataset and build the final arrays
    const { timeAxisConfig, categoryAxisConfig } = getAxisConfig();

    // Process date datasets
    axisGroups.date.datasets.forEach((dataset) => {
      dataset.xAxisID = axisGroups.date.axisId;
      preparedDatasets.push(dataset);
      // Set up the date axis config if not already done
      if (!preparedCategories[axisGroups.date.axisId]) {
        preparedCategories[axisGroups.date.axisId] = { ...timeAxisConfig };
      }
    });

    currentPossibleCategoryLabels.current = [];
    let possibleLabels = new Set();

    // Process other (non-date) datasets
    axisGroups.other.forEach((group) => {
      group.datasets.forEach((dataset) => {
        dataset.xAxisID = group.axisId;
        preparedDatasets.push(dataset);

        dataset.dataLabel.map((l) => possibleLabels.add(l));
        // Set up the category axis config if not already done
        if (!preparedCategories[group.axisId]) {
          preparedCategories[group.axisId] = {
            ...categoryAxisConfig,
            labels: dataset.dataLabel,
          };
        }
      });
    });

    currentPossibleCategoryLabels.current = Array.from(possibleLabels);
    return { preparedDatasets, preparedCategories };
  }, [
    chartObj,
    isCustomDashboard,
    onPreparedDatasetsChange,
    formatAsDate,
    generateColorMap,
  ]);

  const formatDelta = useCallback(
    (value) => {
      if (chartObj.chartSettings.customTickFormatYType === "money") {
        return Math.abs(value).toFixed(2);
      }
      return Math.abs(value);
    },
    [chartObj?.chartSettings?.customTickFormatYType]
  );

  const getAxisConfig = useCallback(() => {
    const timeAxisConfig = {
      type: "time",
      grid: { display: true },
      time: {
        unit:
          dateRange.endDate.diff(dateRange.startDate, "day") >= 7
            ? "day"
            : "hour",
        tooltipFormat: "MMMM D (dddd) yyyy | HH:mm",
        displayFormats: {
          minute: "HH:mm",
          hour: "HH:mm",
          day: `D MMM`,
        },
      },
      ticks: {
        autoSkip: false,
        maxRotation: 90,
        font: { size: 11 },
      },
      min: dateRange.startDate.toDate(),
      max: dateRange.endDate.endOf("day").toDate(),
    };
    const categoryAxisConfig = {
      type: "category",
      grid: { display: true },
      ticks: {
        autoSkip: false,
        maxRotation: 90,
        font: { size: 16 },
      },
    };
    return { timeAxisConfig, categoryAxisConfig };
  }, [dateRange]);

  const checkAnyDataExist = useCallback(() => {
    return chartObj.metrics.some(
      (metric) => metric.data && metric.data.length > 0
    );
  }, [chartObj?.metrics]);

  const checkAnyMetricsExist = useCallback(() => {
    return chartObj.metrics && chartObj.metrics.length > 0;
  }, [chartObj?.metrics]);

  // Instead of destroying/recreating the chart, we update its data and options.
  const prevDataRef = useRef({ datasets: null, labels: null });
  const updateData = useCallback(() => {
    if (!chartRef.current) return;

    const { preparedDatasets, preparedCategories } = prepareData();

    // Compare new data with previous data using JSON stringification
    const prevData = prevDataRef.current;
    const datasetsEqual =
      JSON.stringify(prevData.datasets) === JSON.stringify(preparedDatasets);

    // If data hasn't changed, do not update the chart
    if (datasetsEqual) {
      return;
    }
    console.log("UPDATE");

    // Update ref with new data
    prevDataRef.current = {
      datasets: JSON.parse(JSON.stringify(preparedDatasets)),
    };

    // Update chart datasets and labels
    chartRef.current.data.datasets = preparedDatasets;
    console.log(chartRef.current.data.datasets);

    // Update axis display settings
    if (!chartRef.current.options.scales.y) {
      chartRef.current.options.scales.y = {};
    }
    chartRef.current.options.scales.y.display = chartObj.metrics.some(
      (metric) => metric.datasetConfig.config.yAxisID === "y"
    );

    if (!chartRef.current.options.scales.y1) {
      chartRef.current.options.scales.y1 = {};
    }
    chartRef.current.options.scales.y1.display = chartObj.metrics.some(
      (metric) => metric.datasetConfig.config.yAxisID === "y1"
    );

    chartRef.current.options.scales = {
      ...preparedCategories,
      ...chartRef.current.options.scales,
    };
    // chartRef.current.options.scales.x = allDates
    //   ? { ...timeAxisConfig }
    //   : { ...categoryAxisConfig };

    chartRef.current.options.plugins.legend.display = false;
    chartRef.current.update();
    chartRef.current.resetZoom("active");
  }, [prepareData, chartObj.metrics, determineType, getAxisConfig]);

  // Create the chart instance only if it does not exist; otherwise update it.
  const drawOrUpdateChart = useCallback(() => {
    const chartCanvas = document.getElementById(`universalChart${chartUID}`);
    if (!chartCanvas) return;
    if (!chartRef.current) {
      const ctx = chartCanvas.getContext("2d");
      const { preparedDatasets, preparedCategories } = prepareData();
      chartRef.current = new Chart(ctx, {
        type: chartObj.chartSettings.type,
        data: {
          datasets: preparedDatasets,
        },
        options: {
          scales: {
            ...preparedCategories,
            y: { grid: { display: true } },
            y1: chartObj.chartSettings.ticks?.y1
              ? {
                  type: "linear",
                  display: chartObj.metrics.some(
                    (metric) => metric.datasetConfig.config.yAxisID === "y1"
                  ),
                  position: "right",
                  grid: { drawOnChartArea: false },
                }
              : { display: false },
          },
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: !chartObj.metrics.every(
                (m) => m.categoryField === "timestamp"
              ),
              position: chartObj.chartSettings.legendPosition,
            },
            tooltip: {
              enabled: true,
              intersect: false,
              callbacks: {
                label: function (context) {
                  const hasDataLabel =
                    context.dataset.data?.[context.dataIndex].label !==
                      undefined &&
                    context.dataset.data?.[context.dataIndex].label !== null &&
                    context.dataset.data?.[context.dataIndex].label !== "";
                  let label = "";
                  label = hasDataLabel
                    ? ` ${context.dataset.label}: ${context.dataset.data[context.dataIndex].x}`
                    : ` ${context.dataset.label}`;

                  if (context.parsed.y !== null) {
                    if (hasDataLabel) {
                      label = [label, " Occurences: "];
                    } else {
                      label += ": ";
                    }
                    if (context.dataset.metricFormatPosition === "start") {
                      if (hasDataLabel) {
                        label[1] += context.dataset.metricFormat;
                      } else {
                        label += context.dataset.metricFormat;
                      }
                    }
                    if (hasDataLabel) {
                      label[1] += `${context.parsed.y}`;
                    } else {
                      label += `${context.parsed.y}`;
                    }
                    if (context.dataset.metricFormatPosition === "end") {
                      if (hasDataLabel) {
                        label[1] += context.dataset.metricFormat;
                      } else {
                        label += context.dataset.metricFormat;
                      }
                    }
                    if (hasDataLabel) {
                      label[1] += `${context.dataset.tooltipText || ""}`;
                    } else {
                      label += `${context.dataset.tooltipText || ""}`;
                    }
                  }
                  return label;
                },
              },
            },
            datalabels: {
              display: false,
              color: "#36A2EB",
              formatter: (value, context) => {
                const label = context.chart.data.labels[context.dataIndex];
                return `${label}\n${"".toLocaleString()}%`;
              },
            },
            zoom: {
              pan: { enabled: true },
              limits: {},
              zoom: { wheel: { enabled: true } },
            },
          },
        },
      });
      setChartRendered(true);
    } else {
      updateData();
    }
  }, [chartObj, prepareData, getAxisConfig, determineType, updateData]);

  // Clear chart data (for cases with no available data)
  const clearChartData = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.data.datasets = chartObj.metrics.map((metric) => ({
        ...metric.datasetConfig.config,
        data: [],
      }));
      chartRef.current.update();
    }
  }, [chartObj?.metrics]);

  // Resize the chart when container dimensions change
  const resizeChart = useCallback(() => {
    if (!chartRef.current) return;
    const bodyDiv = document.getElementById(`universalChart${chartUID}-body`);
    if (!bodyDiv) return;
    const calcHeight = () => {
      if (
        /^(\d+|(\.\d+))(\.\d+)?%$/.test(chartObj.chartSettings.canvasHeight)
      ) {
        let clientHeight = bodyDiv.clientHeight;
        if (
          /^(\d+|(\.\d+))(\.\d+)?%$/.test(chartObj.chartSettings.customHeight)
        ) {
          clientHeight =
            (bodyDiv.clientHeight *
              chartObj.chartSettings.customHeight.replace("%", "")) /
            100;
        }
        let heightPerc =
          parseFloat(chartObj.chartSettings.canvasHeight.replace("%", "")) /
          100;
        return clientHeight * heightPerc - (isCustomDashboard ? 20 : 10);
      }
      return chartObj.chartSettings.canvasHeight - 15;
    };
    const calcWidth = () => {
      if (/^(\d+|(\.\d+))(\.\d+)?%$/.test(chartObj.chartSettings.canvasWidth)) {
        let clientWidth = chartObj.chartSettings.customWidth
          ? chartObj.chartSettings.customWidth.replace(/\D/g, "")
          : bodyDiv.clientWidth;
        if (
          /^(\d+|(\.\d+))(\.\d+)?%$/.test(chartObj.chartSettings.customWidth)
        ) {
          clientWidth = bodyDiv.clientWidth;
        }
        let widthPerc =
          parseFloat(chartObj.chartSettings.canvasWidth.replace("%", "")) / 100;
        return clientWidth * widthPerc;
      }
      return chartObj.chartSettings.canvasWidth;
    };
    let height = chartObj.chartSettings.canvasHeight ? calcHeight() : 400;
    let width = chartObj.chartSettings.canvasWidth ? calcWidth() : 800;
    chartRef.current.resize(width, height);
  }, [chartObj, isCustomDashboard]);

  // Handle data changes by either updating the existing chart or creating one if needed
  useEffect(() => {
    console.log("New chartobj", chartObj);
    if (checkAnyMetricsExist()) {
      setShowSkeleton(false);
      if (checkAnyDataExist()) {
        drawOrUpdateChart();
      } else {
        clearChartData();
      }
    } else if (chartRendered && chartRef.current) {
      chartRef.current.data.datasets = [];
      chartRef.current.update();
    }
    setShowSkeleton(false);
  }, [
    chartObj,
    chartRendered,
    checkAnyMetricsExist,
    checkAnyDataExist,
    drawOrUpdateChart,
    clearChartData,
  ]);

  // On mount: create the chart and clean up on unmount
  useEffect(() => {
    drawOrUpdateChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  // Update chart on container resize
  useEffect(() => {
    resizeChart();
  }, [chartObj, resizeChart]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      resizeChart();
      setTimeout(() => {
        resizeChart();
      }, 100);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [containerRef.current, resizeChart, chartUID]);

  // Handle date range changes without full redraw
  useEffect(() => {
    if (!dateRange.startDate || !dateRange.endDate || !chartRef.current) return;
    if (
      JSON.stringify(prevDateFilterRef.current) !== JSON.stringify(dateRange)
    ) {
      prevDateFilterRef.current = dateRange;

      const { preparedDatasets } = prepareData();
      preparedDatasets.forEach((dataset, index) => {
        const allDates = dataset.dataLabel.every(
          (cat) => determineType(cat) === "date"
        );
        if (allDates) {
          chartRef.current.options.scales[dataset.xAxisID] = {
            ...chartRef.current.options.scales[dataset.xAxisID],
            min: dateRange.startDate.toDate(),
            max: dateRange.endDate.endOf("day").toDate(),
          };
          chartRef.current.update();
        }
      });
    }
  }, [dateRange, chartObj?.metrics]);
  const StyledBadge = styled(Badge)(({ theme }) => ({
    "& .MuiBadge-badge": {
      right: "75%",
      top: 5,
      border: `2px solid ${theme.palette.background.paper}`,
      padding: "0 4px",
    },
  }));
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    bgcolor: "var(--bg-color3)",
    width: "40%",
    border: "1px solid #625FF440",
    boxShadow: `0px 0px 5px 2px rgba(98, 95, 244, 0.2)`,
    overflowY: "auto",
    scrollbarWidth: "thin",
    borderRadius: "2rem",
    display: "flex",
    flexDirection: "column",
    p: 4,
  };
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  return (
    <div
      ref={containerRef}
      className={
        chartObj.chartSettings.fullWidth
          ? `${s.UniversalChartBody} ${s.UniversalChartBodyFullWidth}`
          : s.UniversalChartBody
      }
      style={{
        ...(disableMargin ? { margin: 0 } : {}),
        ...(isCustomDashboard
          ? { width: "100%", height: "100%" }
          : { height: "100%", paddingBottom: "1rem" }),
      }}
    >
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: 2,
          position: "absolute",
          borderRadius: "2rem",
        }}
        open={isLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>


      <MuiTooltip title="Reset zoom & pan" disableInteractive>
        <IconContainer
          onClick={() => chartRef?.current?.resetZoom()}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            minWidth: 20,
          }}
        >
          <RefreshIcon />
        </IconContainer>
      </MuiTooltip>

      {layoutEditMode && (
        <div className={`${s.moveOverlayContainer}`}>
          <div className={`${s.moveOverlay} draggableChartArea`}>
            <OpenWithSharpIcon htmlColor="#e7e7e7" sx={{ fontSize: 56 }} />
          </div>
        </div>
      )}

      <div className={s.UniversalChartUpper}>
        <div
          className={s.UniversalChartName}
          style={{ ...(isCustomDashboard ? { width: "90%" } : {}) }}
        >
          {showSkeleton ? (
            <div className={s.UniversalChartSkeletonContainer}>
              <Skeleton
                animation="wave"
                variant="text"
                sx={{ fontSize: "2rem", width: "200px" }}
              />
            </div>
          ) : isCustomDashboard && !layoutEditMode ? (
            <Typography sx={{ p: 0.2, pb: 0.3, width: "100%" }}>
              {chartObj.name}
            </Typography>
          ) : (
            <TextField
              spellCheck={false}
              value={chartObj.name}
              sx={{
                width: "100%",
                zIndex: 5,
                "& .MuiInputBase-input": {
                  p: 1,
                  ...(isCustomDashboard ? { color: "#e7e7e7" } : {}),
                },
                "& fieldset": {
                  ...(isCustomDashboard
                    ? {}
                    : { borderColor: "rgba(0, 0, 0, 0)" }),
                  transition: "all 0.1s ease-in-out",
                },
              }}
              onChange={(e) => onNameChanged?.(e.target.value)}
              variant="outlined"
            />
          )}
        </div>

        {headerWidget}

        <div className={s.UniversalChartDeltaLabel}>
          {showSkeleton ? (
            <div className={s.UniversalChartSkeletonContainer}>
              <Skeleton
                animation="wave"
                variant="text"
                sx={{ fontSize: "2rem", width: "50px" }}
              />
            </div>
          ) : (
            <MuiTooltip
              title="Compared to the same period in the past"
              disableInteractive
            >
              <div
                className={`${
                  currentDeltaValue > 0
                    ? s.positiveDelta
                    : currentDeltaValue < 0
                      ? s.negativeDelta
                      : s.neutralDelta
                }`}
              >
                {chartObj.chartSettings.showDelta ? (
                  <span>
                    {currentDeltaValue >= 0 ? "+" : "-"}
                    {chartObj.chartSettings.deltaFormatPosition === "start" &&
                      chartObj.chartSettings.deltaFormat}
                    {formatDelta(currentDeltaValue)}
                    {chartObj.chartSettings.deltaFormatPosition === "end" &&
                      chartObj.chartSettings.deltaFormat}
                  </span>
                ) : (
                  <div></div>
                )}
              </div>
            </MuiTooltip>
          )}
        </div>

        {layoutEditMode && customSettings}
      </div>

      <div id={`universalChart${chartUID}-body`} className={s.UniversalChart}>
        {showSkeleton ? (
          <>
            <Skeleton
              animation="wave"
              variant="rectangle"
              sx={{ width: "100%", height: "90%", marginBottom: 1 }}
            />
            <Skeleton
              animation="wave"
              variant="text"
              sx={{ fontSize: "1rem", width: "20%" }}
            />
          </>
        ) : (
          <>
            <div className={s.ChartContainerOnly}>
              <canvas
                className={`${s.chart} ${showNoDataError ? s.noDataChart : ""}`}
                id={`universalChart${chartUID}`}
              ></canvas>
            </div>
            {showNoDataError && (
              <div className={s.noDataLabel}>
                {chartObj.chartSettings.customNoDataLabel || "No Data"}
              </div>
            )}
          </>
        )}
      </div>

      {isCustomDashboard && (
        <>
          {/* Alert Management Dialog */}
          <AlertModal
            alertThresholds={alertThresholds}
            onCreateAlert={handleCreateAlert}
            onUpdateAlert={handleUpdateAlert}
            onDeleteAlert={removeAlertThreshold}
            availableMetrics={currentPossibleCategoryLabels.current}
          />
        </>
      )}
    </div>
  );
};

export default UniversalChart;
