import React, { useEffect, useState, useRef } from "react";
import Skeleton from "@mui/material/Skeleton";
import s from "./css/salesChart.module.css";
import { Typography } from "@mui/material";

// Date modules
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";

import { Tooltip } from "chart.js";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import shortid from "shortid";
// For coloring
import chroma from "chroma-js";
import { useThemeContext } from "@strix/themeContext";

// Make dayjs work with utc, so we will treat all time as non-local
dayjs.extend(utc);

Chart.register(ChartDataLabels, Tooltip);

const SalesChart = ({ chartObj, dateRange, isLoading }) => {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [chartRendered, setChartRendered] = useState(false);

  const uid = shortid.generate();

  const [currentGranularity, setCurrentGranularity] = useState();
  const currentGranularityRef = useRef(null);
  currentGranularityRef.current = currentGranularity;

  const chartRef = useRef(null);

  const [showNoDataError, setShowNoDataError] = useState();

  const [currentDeltaValue, setCurrentDeltaValue] = useState(0);
  const { theme } = useThemeContext();

function brightenColor(color) {
    if (!color) return color;
    return theme === "light" ? chroma(color).brighten(1.3).hex() : color;
  }
  // Function for loading new data to chart (or updating). Initial data is set in drawChart()
  function updateData(newData) {
    if (
      chartRef.current !== undefined &&
      chartRef.current !== null &&
      !showNoDataError
    ) {
      function addData(chart) {
        chart.data.labels = newData.map((dataItem) => dataItem.timestamp);
        chart.data.datasets[0].data = newData.map(
          (dataItem) => dataItem.revenue
        );
        chart.data.datasets[1].data = newData.map((dataItem) => dataItem.sales);
        chart.options.scales.x.time.unit = "day";//chartObj.data.granularity;
        chart.update();
      }
      addData(chartRef.current);
    }
  }
  function clearData() {
    if (chartRef.current !== undefined && chartRef.current !== null) {
      chartRef.current.data.labels = [];
      chartRef.current.data.datasets[0].data = [];
      chartRef.current.data.datasets[1].data = [];
      chartRef.current.update();
    }
  }

  // If data changes, toggle update
  useEffect(() => {
    if (chartObj.data.data !== undefined && !chartObj.isError) {
      setCurrentDeltaValue(chartObj.data.deltaValue);

      if (chartObj.data.data.length > 0) {
        // Check if any data is present before updating chart. Chart with no data is ugly so we dont want to show it
        setShowNoDataError(false);
        setShowSkeleton(false);

        if (chartRendered) {
          updateData(chartObj.data.data);
        } else {
          // If we didnt draw the chart yet, do it now
          drawChart();
        }
      } else {
        // If no data returned, show "No Data"
        setShowSkeleton(false);
        setShowNoDataError(true);
      }
    } else {
      // If data is undefined, we check again if delta or granularity undefined too.
      // If they are NOT undefined, it means we just had no data for the given date range
      if (!chartObj.isError) {
        setShowSkeleton(true);
      } else {
        setShowSkeleton(false);
        setShowNoDataError(true);
      }
    }
  }, [chartObj]);

  useEffect(() => {
    if (!showSkeleton) {
      drawChart();
    }
  }, [showSkeleton]);

  useEffect(() => {
    if (showNoDataError && chartRef.current !== null) {
      // chartRef.current.destroy();
      clearData();
    } else {
      // We want to invalidate and redraw the chart by force after we change showing No Data error. Otherwise rect elements will turn black for some reason
      // Reminder: all this behavior is caused by appending noDataChart class to .chart div.
      drawChart(true);
    }
  }, [showNoDataError]);

  function getFitParam() {
    if (chartObj.data.granularity === "day") return true;
    return false;
  }

  // REQUIRED: Use this useEffect on mount since otherwise "bindto" won't find an element to bind chart to and it will just be put into the page's body.
  // This is because the DOM is not loaded yet if we call it outside of a hook, and no such element with id is yet present.
  function drawChart(forceRedraw) {
    console.log(chartObj, document.getElementById(`lineChart${uid}`));
    if (document.getElementById(`lineChart${uid}`) !== null) {
      // Still check if any data is present, even if forceRedraw = true. And make sure
      // ...we dont draw chart when isError is true (that means there are no data by some reason, wrong date range or just absolutely no data)
      if (
        ((chartObj.data.data === undefined || chartRendered === true) &&
          !forceRedraw) ||
        chartObj.isError
      )
        return;

      if (chartRef.current !== null) {
        chartRef.current.destroy();
      }
      // console.log(chartObj.data.data.map(dataItem => dataItem.timestamp))
      const canvasObj = document
        .getElementById(`lineChart${uid}`)
        .getContext("2d");

      const labels = chartObj?.data?.data
        ? chartObj.data.data.map((dataItem) => dataItem.timestamp)
        : [];
      const dataRevenue = chartObj?.data?.data
        ? chartObj.data.data.map((dataItem) => dataItem.revenue)
        : [];
      const dataSales = chartObj?.data?.data
        ? chartObj.data.data.map((dataItem) => dataItem.sales)
        : [];
      const chart = new Chart(canvasObj, {
        data: {
          labels: labels,
          datasets: [
            {
              type: "line",
              label: "Revenue:",
              data: dataRevenue,
              yAxisID: "y1",
              borderColor: brightenColor("#CD6F00"),
              backgroundColor: brightenColor("#CD6F00"),
              borderWidth: 2,
              pointRadius: 3,
              pointHoverRadius: 5,
            },
            {
              type: "bar",
              label: "Sales:",
              data: dataSales,
              yAxisID: "y",
              backgroundColor: brightenColor("#64511F"),
              // data: chartObj.data.data.map(dataItem => dataItem.value)
            },
          ],
        },
        options: {
          responsive: true,
          stacked: false,
          scales: {
            x: {
              grid: {
                // color: "#3F3F3F",
                display: true,
              },
              type: "time",
              time: {
                unit: "day",
                tooltipFormat: "MMMM D (dddd) YYYY | HH:mm",
                displayFormats: {
                  minute: "HH:mm",
                  hour: "HH:mm",
                  day: `D MMM`,
                },
              },
              ticks: {
                autoSkip: false,
                maxRotation: 90,
                font: {
                  size: 11,
                },
              },
              // min: dayjs.utc(dateRange[0]).toDate(),
              // max: dayjs.utc(dateRange[1]).startOf("day").toDate(),
            },
            y: {
              grid: {
                // color: "#3F3F3F",
                display: true,
              },
              beginAtZero: true,
              // ticks: {
              //   callback: function(value, index, ticks) {
              //     if (chartObj.chartSettings.customTickFormatY) {

              //       switch (chartObj.chartSettings.customTickFormatYType) {

              //         case 'minutes':
              //           const minutes = Math.floor(value / 60);
              //           const remainingSeconds = value % 60;
              //           return `${minutes}m${remainingSeconds.toString().padStart(2, '0')}s`

              //         case 'money':
              //           return '$' + value.toFixed(0)

              //         case 'percentile':
              //           return value.toFixed(0) + '%'

              //         default:
              //           return value.toFixed(0);
              //       }

              //     } else {
              //       return value.toFixed(0);
              //     }
              //   }
              // }
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              grid: {
                drawOnChartArea: false,
              },
              ticks: {
                callback: function (value, index, ticks) {
                  return "$" + value.toFixed(0);
                },
              },
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
                label: function (context) {
                  let label = context.dataset.label || "";
                  if (context.parsed.y !== null) {
                    // Making space between the label and text
                    label += " ";

                    // Put format at start if needed
                    if (chartObj.metricFormatPosition === "start") {
                      label += chartObj.metricFormat;
                    }

                    label += `${context.parsed.y}`;

                    // Put format at start if needed
                    if (chartObj.metricFormatPosition === "end") {
                      label += chartObj.metricFormat;
                    }

                    label += `${chartObj.chartSettings.tooltipText}`;
                  }
                  return label;
                },
              },
            },
            // Labels
            datalabels: {
              display: false,
              color: "#36A2EB",
              formatter: (value, context) => {
                const label = context.chart.data.labels[context.dataIndex];
                return `${label}\n${"".toLocaleString()}%`;
              },
            },
          },
        },
      });

      setChartRendered(true);
      chartRef.current = chart;
    }
  }
  useEffect(() => {
    drawChart();
  }, []);

  useEffect(() => {
    if (dateRange[0] === null || dateRange[1] === null) return;

    if (chartRef.current !== undefined && chartRef.current !== null) {
      // setChartRendered(false);
      chartRef.current.destroy();
      drawChart(true);
    }
  }, [dateRange]);

  return (
    <div className={s.LineChartBody}>
      <div className={s.LineChartUpper}>
        {/* Chart Name */}
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
              variant="subtitle1"
              color={"#929292"}
              sx={{
                fontSize: "13px",
                fontWeight: "regular",
                textAlign: "center",
                pl: 4,
                lineHeight: "16px",
              }}
            >
              {chartObj.name}
            </Typography>
          )}
        </div>
      </div>

      <div className={s.LineChart}>
        {showSkeleton
          ? [
              <Skeleton
                key="1"
                animation="wave"
                variant="rectangle"
                sx={{ width: "100%", height: "90%", marginBottom: 1 }}
              />,
              <Skeleton
                key="2"
                animation="wave"
                variant="text"
                sx={{ fontSize: "1rem", width: "20%" }}
              />,
            ]
          : [
              <div className={s.ChartContainerOnly}>
                <canvas
                  className={`${s.chart} ${showNoDataError || isLoading ? s.noDataChart : ""}`}
                  id={`lineChart${uid}`}
                ></canvas>
              </div>,
            ]}
      </div>
    </div>
  );
};

export default SalesChart;
