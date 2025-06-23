import React, { useEffect, useState, useRef } from "react";
import s from "./ttaStyle.module.css";

import shortid from "shortid";

// Date modules
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";

// Funnel plugin
import { Tooltip } from "chart.js";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

// For coloring
import chroma from "chroma-js";
import { Typography } from "@mui/material";

// Make dayjs work with utc, so we will treat all time as non-local
dayjs.extend(utc);

Chart.register(ChartDataLabels, Tooltip);

const LineChart = ({ data, valueObj }) => {
  if (data === undefined || data === null || data.length === 0)
    return <div></div>;

  const [chartObj, setChartObj] = useState({
    chartID: shortid.generate(),
    name: valueObj.valueName,
    metricName: "",
    data: data,
    chartSettings: {
      type: "bar",
      showDelta: true,
      deltaFormat: "$",
      deltaFormatPosition: "start",
      showLegend: false,
      ticks: {
        y: {
          customTickFormatY: false,
          customTickFormatYType: "",
          tooltipText: "s",
          metricFormat: "",
          metricFormatPosition: "end",
        },
      },
    },
    datasetsConfigs: [
      {
        config: {
          type: "bar",
          label: "Value",
          yAxisID: "y",
        },
      },
    ],
  });

  useEffect(() => {
    setChartObj((prevChartObj) => ({
      ...prevChartObj,
      data: data,
    }));
  }, [data]);

  useEffect(() => {
    drawChart();
  }, [chartObj]);

  const [chartRendered, setChartRendered] = useState(false);
  const chartRef = useRef(null);
  const [showNoDataError, setShowNoDataError] = useState();

  function drawChart(forceRedraw) {
    if (document.getElementById(`lineChart${chartObj.chartID}`) !== null) {
      // Still check if any data is present, even if forceRedraw = true. And make sure
      // ...we dont draw chart when isError is true (that means there are no data by some reason, wrong date range or just absolutely no data)

      if (chartRef.current !== null) {
        chartRef.current.destroy();
      }

      function countOccurrences(arr) {
        const occurrences = {};
        arr.forEach((num) => {
          occurrences[num] = (occurrences[num] || 0) + 1;
        });
        return occurrences;
      }
      let sortedData = chartObj.data ? chartObj.data.sort((a, b) => a - b) : [];
      let readyData = sortedData ? countOccurrences(sortedData) : {};
      let labels = Object.keys(readyData).map((d, i) => d);

      const canvasObj = document
        .getElementById(`lineChart${chartObj.chartID}`)
        .getContext("2d");
      const chart = new Chart(canvasObj, {
        type: chartObj.chartSettings.type,
        data: {
          labels: readyData ? Object.keys(readyData).map((d, i) => d) : [],
          datasets: [
            {
              ...chartObj.datasetsConfigs[0].config,
              data: readyData
                ? Object.keys(readyData).map((d, i) => readyData[d])
                : [],
            },
          ],
        },
        options: {
          scales: {
            x: {
              font: {
                size: 9,
              },
              ticks: {
                callback: function (value, index, ticks) {
                  return labels[value];
                },
              },
            },
            y: {
              grid: {
                color: "#3B3B3B",
                display: true,
              },
              ticks: {
                stepSize: 10,
              },
            },
            y1: chartObj.chartSettings.ticks.y1
              ? {
                  type: "linear",
                  display: true,
                  position: "right",
                  grid: {
                    drawOnChartArea: false,
                  },
                  ticks: {
                    callback: function (value, index, ticks) {
                      return value.toFixed(1);
                    },
                  },
                }
              : {
                  display: false,
                },
          },
          // customTickFormatY
          // Resize funnel to be the width and height of it's container
          // Requires dedicated <div> around <canvas>
          maintainAspectRatio: false,

          plugins: {
            legend: {
              display: chartObj.chartSettings.showLegend,
              position: chartObj.chartSettings.legendPosition,
            },
            // Tooltip on hovering exact day
            tooltip: {
              enabled: true,
              intersect: false,
              callbacks: {
                title: (tooltipItems) => {
                  return `${tooltipItems[0].formattedValue} occurences`;
                },
                label: function (context) {
                  let label = context.dataset.label || "";
                  if (context.label !== null) {
                    switch (valueObj.valueFormat) {
                      case "percentile": {
                        label += `: ${context.label}%`;
                        break;
                      }
                      case "money": {
                        label += `: $${context.label}`;
                        break;
                      }
                      default: {
                        label += `: ${context.label}`;
                      }
                    }
                  }
                  return label;
                },
              },
            },
            // Labels
            datalabels: {
              display: false,
            },
          },
        },
      });

      setChartRendered(true);
      chartRef.current = chart;
    }
  }

  return (
    <div
      className={
        chartObj.chartSettings.fullWidth
          ? `${s.LineChartBody} ${s.LineChartBodyFullWidth}`
          : s.LineChartBody
      }
      style={{
        width: chartObj.chartSettings.customWidth
          ? chartObj.chartSettings.customWidth
          : "",
        height: chartObj.chartSettings.customHeight
          ? chartObj.chartSettings.customHeight
          : "",
      }}
    >
      <div className={s.LineChartUpper}>
        {/* Chart Name */}
        <div className={s.LineChartName}>
          <Typography
            variant={"h6"}
            color={"text.secondary"}
            sx={{ fontSize: "18px", fontWeight: "regular", textAlign: "left" }}
          >
            {chartObj.name}
          </Typography>
        </div>
      </div>

      <div className={s.LineChart}>
        <div
          className={s.ChartContainerOnly}
          style={{
            height: chartObj.chartSettings.customHeight
              ? chartObj.chartSettings.customHeight - 80
              : "",
          }}
        >
          <canvas
            className={`${s.chart} ${showNoDataError ? s.noDataChart : ""}`}
            id={`lineChart${chartObj.chartID}`}
          ></canvas>
        </div>
      </div>
    </div>
  );
};

export default LineChart;
