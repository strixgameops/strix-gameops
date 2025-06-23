import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Skeleton, Backdrop, CircularProgress, Typography } from "@mui/material";
import MuiTooltip from "@mui/material/Tooltip";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Tooltip } from "chart.js";
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";
import chroma from "chroma-js";
import _ from "lodash";
import { useThemeContext } from "../../../../../contexts/ThemeContext";
import s from "./css/lineChart.module.css";

dayjs.extend(utc);
Chart.register(ChartDataLabels, Tooltip);

const LineChart = ({ chartObj, dateRange, headerWidget, isLoading }) => {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [chartRendered, setChartRendered] = useState(false);
  const [showNoDataError, setShowNoDataError] = useState(false);
  const [currentDeltaValue, setCurrentDeltaValue] = useState(0);
  
  const chartRef = useRef(null);
  const prevDateFilterRef = useRef(null);
  const { theme } = useThemeContext();

  const canvasId = `lineChart${chartObj.chartID}`;

  const brightenColor = useCallback((color) => {
    return color; // Removed brightening logic as commented out in original
  }, []);

  const formatTickValue = useCallback((value, tickConfig) => {
    if (!tickConfig?.customTickFormatY) return value.toFixed(0);
    
    switch (tickConfig.customTickFormatYType) {
      case "minutes": {
        const minutes = Math.floor(value / 60);
        const remainingSeconds = value % 60;
        return `${minutes}m${remainingSeconds.toString().padStart(2, "0")}s`;
      }
      case "money":
        return value < 10 ? "$" + value.toFixed(2) : "$" + value.toFixed(0);
      case "percentile":
        return value < 10 ? value.toFixed(1) + "%" : value.toFixed(0) + "%";
      case "float":
        return value.toFixed(2);
      default:
        return value.toFixed(0);
    }
  }, []);

  const getTooltipLabel = useCallback((context) => {
    let label = context.dataset.label || "";
    if (context.parsed.y === null) return label;
    
    label += " ";
    const tickSettings = chartObj.chartSettings.ticks[context.dataset.yAxisID];
    
    if (tickSettings.metricFormatPosition === "start") {
      label += tickSettings.metricFormat;
    }
    
    if (!isNaN(parseFloat(context.parsed.y))) {
      const value = parseFloat(context.parsed.y);
      label += Number.isInteger(value) ? value.toFixed(2) : value.toString();
    } else {
      label += context.parsed.y;
    }
    
    if (tickSettings.metricFormatPosition === "end") {
      label += tickSettings.metricFormat;
    }
    
    label += tickSettings.tooltipText;
    return label;
  }, [chartObj.chartSettings.ticks]);

  const getTimeUnit = useCallback(() => {
    const diffDays = Math.abs(dateRange.endDate.diff(dateRange.startDate, "day"));
    return diffDays >= 7 ? "day" : "hour";
  }, [dateRange]);

  const updateXAxisTimeScale = useCallback((chart) => {
    if (chartObj.categoryField === "timestamp") {
      const timeUnit = getTimeUnit();
      chart.options.scales.x.time.unit = timeUnit;
      chart.options.scales.x.time.round = timeUnit === "day" ? "day" : false;
    }
  }, [chartObj.categoryField, getTimeUnit]);

  const chartData = useMemo(() => {
    if (!chartObj.data.data) return { labels: [], datasets: [] };
    
    const labels = chartObj.data.data.map(item => item[chartObj.categoryField]);
    const datasets = chartObj.datasetsConfigs.map(config => ({
      ...config.config,
      data: chartObj.data.data.map(item => item[config.valueField]),
      borderColor: brightenColor(config.config.borderColor),
      backgroundColor: brightenColor(config.config.backgroundColor),
    }));
    
    return { labels, datasets };
  }, [chartObj.data.data, chartObj.categoryField, chartObj.datasetsConfigs, brightenColor]);

  const chartOptions = useMemo(() => {
    const timeUnit = getTimeUnit();
    
    return {
      scales: {
        x: chartObj.categoryField === "timestamp" ? {
          type: "time",
          time: {
            round: timeUnit,
            unit: timeUnit,
            tooltipFormat: "MMMM D (dddd) yyyy | HH:mm",
            displayFormats: {
              minute: "HH:mm",
              hour: "HH:mm",
              day: "D MMM",
            },
          },
          ticks: {
            autoSkip: true,
            maxRotation: 90,
            font: { size: 11 },
          },
        } : {
          stacked: chartObj.chartSettings.ticks.x?.stacked,
        },
        y: {
          stacked: chartObj.chartSettings.ticks.y?.stacked,
          grid: { display: true },
          ticks: {
            callback: (value) => formatTickValue(value, chartObj.chartSettings.ticks.y),
          },
        },
        y1: chartObj.chartSettings.ticks.y1 ? {
          type: "linear",
          display: true,
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: {
            callback: (value) => formatTickValue(value, chartObj.chartSettings.ticks.y),
          },
        } : { display: false },
      },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: chartObj.chartSettings.showLegend,
          position: chartObj.chartSettings.legendPosition,
        },
        tooltip: {
          enabled: true,
          intersect: false,
          callbacks: {
            label: getTooltipLabel,
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
      },
    };
  }, [
    chartObj.categoryField,
    chartObj.chartSettings,
    getTimeUnit,
    formatTickValue,
    getTooltipLabel
  ]);

  const updateData = useCallback((newData) => {
    if (!chartRef.current?.canvas || !document.contains(chartRef.current.canvas)) {
      return;
    }

    const newLabels = newData?.map(item => item[chartObj.categoryField]) || [];
    const newDatasets = chartObj.datasetsConfigs.map(config => ({
      ...config.config,
      data: newData?.map(item => item[config.valueField]) || [],
    }));

    if (_.isEqual(newLabels, chartRef.current.data.labels) && 
        _.isEqual(newDatasets, chartRef.current.data.datasets)) {
      return;
    }

    Object.assign(chartRef.current.data, {
      labels: newLabels,
      datasets: newDatasets,
    });

    updateXAxisTimeScale(chartRef.current);
    chartRef.current.update();
  }, [chartObj.categoryField, chartObj.datasetsConfigs, updateXAxisTimeScale]);

  const createChart = useCallback(() => {
    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const canvasCtx = canvasEl.getContext("2d");
    const newChart = new Chart(canvasCtx, {
      type: chartObj.chartSettings.type,
      data: chartData,
      options: chartOptions,
    });

    chartRef.current = newChart;
    setChartRendered(true);
  }, [canvasId, chartObj.chartSettings.type, chartData, chartOptions]);

  const formatCurrency = useCallback((value) => {
    const parts = parseFloat(value).toFixed(2).toString().split(".");
    const dollars = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${dollars}.${parts[1]}`;
  }, []);

  const formatDelta = useCallback((value) => {
    if (chartObj.chartSettings.deltaFormat === "$") {
      return formatCurrency(Math.abs(value).toFixed(2));
    }
    return Math.abs(value);
  }, [chartObj.chartSettings.deltaFormat, formatCurrency]);

  // Handle chart data changes
  useEffect(() => {
    if (chartObj.data.data !== undefined && !chartObj.isError) {
      setCurrentDeltaValue(chartObj.data.deltaValue);

      if (chartObj.data.data.length > 0) {
        setShowNoDataError(false);
        setShowSkeleton(false);
        if (chartRendered) {
          updateData(chartObj.data.data);
        } else {
          createChart();
        }
      } else {
        setShowSkeleton(false);
        setShowNoDataError(true);
      }
    } else if (chartObj.isError) {
      setShowSkeleton(false);
      setShowNoDataError(true);
    } else {
      setShowSkeleton(true);
    }
  }, [chartObj, chartRendered, updateData, createChart]);

  // Handle date range changes
  useEffect(() => {
    if (!dateRange.startDate || !dateRange.endDate || !chartRef.current) return;

    const currentDateFilter = JSON.stringify(dateRange);
    if (prevDateFilterRef.current !== currentDateFilter) {
      prevDateFilterRef.current = currentDateFilter;
      try {
        if (chartObj.categoryField === "timestamp" && chartRendered) {
          chartRef.current.update();
        }
      } catch (err) {
        console.error("Error updating chart on date range change:", err);
      }
    }
  }, [dateRange, chartObj.categoryField, chartRendered]);

  // Handle no data error state
  useEffect(() => {
    if (showNoDataError && chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
      setChartRendered(false);
    } else if (!showNoDataError && !showSkeleton) {
      createChart();
    }
  }, [showNoDataError, showSkeleton, createChart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const containerStyle = useMemo(() => ({
    width: chartObj.chartSettings.customWidth || "",
    height: chartObj.chartSettings.customHeight || "",
  }), [chartObj.chartSettings.customWidth, chartObj.chartSettings.customHeight]);

  const chartContainerStyle = useMemo(() => ({
    height: chartObj.chartSettings.customHeight 
      ? chartObj.chartSettings.customHeight - 80 
      : "",
    opacity: showSkeleton ? 0 : 1,
  }), [chartObj.chartSettings.customHeight, showSkeleton]);

  return (
    <div
      className={
        chartObj.chartSettings.fullWidth
          ? `${s.LineChartBody} ${s.LineChartBodyFullWidth}`
          : s.LineChartBody
      }
      style={containerStyle}
    >
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: 2,
          position: "absolute",
          borderRadius: "1rem",
        }}
        open={isLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <div className={s.LineChartUpper}>
        <div className={s.LineChartName}>
          {showSkeleton ? (
            <div className={s.LineChartSkeletonContainer}>
              <Skeleton
                animation="wave"
                variant="text"
                sx={{ fontSize: "2rem", width: "200px" }}
              />
            </div>
          ) : (
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                fontSize: "18px",
                fontWeight: "regular",
                textAlign: "left",
              }}
            >
              {chartObj.name}
            </Typography>
          )}
        </div>

        {headerWidget}

        <div className={s.LineChartDeltaLabel}>
          {showSkeleton ? (
            <div className={s.LineChartSkeletonContainer}>
              <Skeleton
                animation="wave"
                variant="text"
                sx={{ fontSize: "2rem", width: "50px" }}
              />
            </div>
          ) : chartObj.chartSettings.showDelta ? (
            <MuiTooltip title="Compared to the same period in the past">
              <div
                className={`${s.delta} ${
                  currentDeltaValue > 0
                    ? s.positiveDelta
                    : currentDeltaValue < 0
                    ? s.negativeDelta
                    : s.neutralDelta
                }`}
              >
                {chartObj.data.absoluteSumm && (
                  <Typography>
                    {chartObj.chartSettings.deltaFormatPosition === "start" &&
                      chartObj.chartSettings.deltaFormat}
                    {formatDelta(chartObj.data.absoluteSumm)}
                    {chartObj.chartSettings.deltaFormatPosition === "end" &&
                      chartObj.chartSettings.deltaFormat}
                  </Typography>
                )}

                <Typography
                  variant="subtitle1"
                  sx={{
                    color:
                      currentDeltaValue > 0
                        ? "rgb(0, 170, 0)"
                        : currentDeltaValue < 0
                        ? "rgb(197, 30, 0)"
                        : "",
                  }}
                >
                  {chartObj.data.absoluteSumm ? "(" : ""}
                  {currentDeltaValue >= 0 ? "+" : "-"}
                  {chartObj.chartSettings.deltaFormatPosition === "start" &&
                    chartObj.chartSettings.deltaFormat}
                  {formatDelta(currentDeltaValue)}
                  {chartObj.chartSettings.deltaFormatPosition === "end" &&
                    chartObj.chartSettings.deltaFormat}
                  {chartObj.data.absoluteSumm ? ")" : ""}
                </Typography>
              </div>
            </MuiTooltip>
          ) : (
            <div />
          )}
        </div>
      </div>

      <div className={s.LineChart}>
        <div
          key={`${canvasId}-container`}
          className={s.ChartContainerOnly}
          style={chartContainerStyle}
        >
          <canvas
            className={`${s.chart} ${showNoDataError ? s.noDataChart : ""}`}
            id={canvasId}
          />
        </div>

        {showNoDataError && (
          <div className={s.noDataLabel} key={`${canvasId}-nodatalabel`}>
            {chartObj.chartSettings.customNoDataLabel ?? "No Data"}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(LineChart);