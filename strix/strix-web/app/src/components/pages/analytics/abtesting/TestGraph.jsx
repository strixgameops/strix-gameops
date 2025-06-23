import React, { useEffect, useState, useRef, useCallback } from "react";
import s from "./lineChart.module.css";
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";
import { Tooltip } from "chart.js";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import chroma from "chroma-js";
import { Typography } from "@mui/material";
import jStat from "jstat";
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
dayjs.extend(utc);
Chart.register(ChartDataLabels, Tooltip);

const TestGraph = ({ chartObj, headerWidget, testStartDate }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const [hasError, setHasError] = useState(false);

  // Smoothly update the chart's data
  const updateData = useCallback(
    (newData) => {
      if (!chartRef.current) return;

      // Update labels and datasets without re-creating the chart instance
      chartRef.current.data.labels = newData.map(
        (item) => item[chartObj.categoryField]
      );
      chartRef.current.data.datasets = chartObj.datasetsConfigs.map(
        (config) => ({
          ...config.config,
          data: newData.map((item) => item[config.valueField]),
        })
      );

      // If using a time scale, update the unit (defaults to "day")
      if (
        chartObj.categoryField === "timestamp" &&
        chartRef.current.options.scales?.x?.time
      ) {
        chartRef.current.options.scales.x.time.unit =
          chartObj.data.granularity || "day";
      }
      // Update the chart with animation
      chartRef.current.update();
    },
    [chartObj]
  );

  // Create a new chart instance
  const drawChart = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");

    const labels =
      Array.isArray(chartObj.data) &&
      chartObj.data.map((item) => item[chartObj.categoryField]);
    const datasets = chartObj.datasetsConfigs.map((config) => ({
      ...config.config,
      data:
        Array.isArray(chartObj.data) &&
        chartObj.data.map((item) => item[config.valueField]),
    }));

    // Instantiate a new Chart.js chart
    chartRef.current = new Chart(ctx, {
      type: chartObj.chartSettings.type,
      data: { labels, datasets },
      options: {
        scales: {
          x:
            chartObj.categoryField === "timestamp"
              ? {
                  type: "time",
                  time: {
                    round: "day",
                    unit: chartObj.data.granularity || "day",
                    tooltipFormat: "MMMM D (dddd) YYYY | HH:mm",
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
                  grid: { color: "#303030", display: false },
                }
              : {
                  stacked:
                    chartObj.chartSettings.ticks.x &&
                    chartObj.chartSettings.ticks.x.stacked,
                },
          y: {
            stacked:
              chartObj.chartSettings.ticks.y &&
              chartObj.chartSettings.ticks.y.stacked,
            ticks: {
              callback: function (value) {
                if (chartObj.chartSettings.ticks.y.customTickFormatY) {
                  switch (
                    chartObj.chartSettings.ticks.y.customTickFormatYType
                  ) {
                    case "minutes": {
                      const minutes = Math.floor(value / 60);
                      const seconds = value % 60;
                      return `${minutes}m${seconds.toString().padStart(2, "0")}s`;
                    }
                    case "money":
                      return value < 10
                        ? "$" + value.toFixed(2)
                        : "$" + value.toFixed(0);
                    case "percentile":
                      return value < 10
                        ? value.toFixed(1) + "%"
                        : value.toFixed(0) + "%";
                    case "float":
                      return value.toFixed(2);
                    default:
                      return value.toFixed(0);
                  }
                }
                return value.toFixed(0);
              },
            },
          },
          y1: chartObj.chartSettings.ticks.y1
            ? {
                type: "linear",
                display: true,
                position: "right",
                ticks: {
                  callback: function (value) {
                    if (chartObj.chartSettings.ticks.y1.customTickFormatY) {
                      switch (
                        chartObj.chartSettings.ticks.y1.customTickFormatYType
                      ) {
                        case "minutes": {
                          const minutes = Math.floor(value / 60);
                          const seconds = value % 60;
                          return `${minutes}m${seconds.toString().padStart(2, "0")}s`;
                        }
                        case "money":
                          return "$" + value.toFixed(0);
                        case "percentile":
                          return value.toFixed(0) + "%";
                        default:
                          return value.toFixed(0);
                      }
                    }
                    return value.toFixed(2);
                  },
                },
              }
            : { display: false },
          y2: chartObj.chartSettings.ticks.y2
            ? {
                type: "linear",
                display: false,
                position: "right",
                ticks: {
                  callback: function (value) {
                    if (chartObj.chartSettings.ticks.y2.customTickFormatY) {
                      switch (
                        chartObj.chartSettings.ticks.y2.customTickFormatYType
                      ) {
                        case "minutes": {
                          const minutes = Math.floor(value / 60);
                          const seconds = value % 60;
                          return `${minutes}m${seconds.toString().padStart(2, "0")}s`;
                        }
                        case "money":
                          return "$" + value.toFixed(0);
                        case "percentile":
                          return value.toFixed(0) + "%";
                        default:
                          return value.toFixed(0);
                      }
                    }
                    return value.toFixed(2);
                  },
                },
              }
            : { display: false },
        },
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            display: chartObj.chartSettings.showLegend,
            position: chartObj.chartSettings.legendPosition,
          },
          tooltip: {
            enabled: true,
            intersect: false,
            callbacks: {
              label: function (context) {
                let label = (context.dataset.label || "") + ": ";
                if (context.parsed.y != null) {
                  if (
                    chartObj.chartSettings.ticks[context.dataset.yAxisID]
                      .metricFormatPosition === "start"
                  ) {
                    label +=
                      chartObj.chartSettings.ticks[context.dataset.yAxisID]
                        .metricFormat;
                  }
                  label += `${context.parsed.y}`;
                  if (
                    chartObj.chartSettings.ticks[context.dataset.yAxisID]
                      .metricFormatPosition === "end"
                  ) {
                    label +=
                      chartObj.chartSettings.ticks[context.dataset.yAxisID]
                        .metricFormat;
                  }
                  label +=
                    chartObj.chartSettings.ticks[context.dataset.yAxisID]
                      .tooltipText;
                }
                return label;
              },
            },
          },
          datalabels: {
            display: false,
            color: "#36A2EB",
            formatter: (value, context) => {
              const label = chartRef.current.data.labels[context.dataIndex];
              return `${label}\n${"".toLocaleString()}%`;
            },
          },
        },
      },
    });
  }, [chartObj]);

  // Single effect to handle chart creation and data updates
  useEffect(() => {
    // If an error flag is set or there's no data, clean up the chart
    if (chartObj.isError || !chartObj.data || chartObj.data.length === 0) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      setHasError(true);
      return;
    }
    setHasError(false);

    // If the chart hasn't been drawn, create it; otherwise update its data
    if (!chartRef.current) {
      drawChart();
    } else {
      updateData(chartObj.data);
    }
  }, [chartObj.data, chartObj.isError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <div
      className={
        chartObj.chartSettings.fullWidth
          ? `${s.LineChartBody} ${s.LineChartBodyFullWidth}`
          : s.LineChartBody
      }
      style={{
        width: chartObj.chartSettings.customWidth || undefined,
        height: chartObj.chartSettings.customHeight || undefined,
      }}
    >
      <div className={s.LineChart}>
        <div
          className={s.ChartContainerOnly}
          style={{
            height: chartObj.chartSettings.customHeight
              ? chartObj.chartSettings.customHeight - 80
              : undefined,
          }}
        >
          <canvas
            ref={canvasRef}
            className={`${s.chart} ${hasError ? s.noDataChart : ""}`}
            id={`lineChart${chartObj.chartID}`}
          />
        </div>
        {hasError && (
          <div className={s.noDataLabel}>
            {chartObj.chartSettings.customNoDataLabel || "No Data"}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestGraph;
