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

import Input from "@mui/material/Input";
import { Button } from "@mui/material";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";

// For coloring
import chroma from "chroma-js";
import { Typography } from "@mui/material";

// Make dayjs work with utc, so we will treat all time as non-local
dayjs.extend(utc);

Chart.register(ChartDataLabels, Tooltip);

const LineChart = ({ data }) => {
  const [chartObj, setChartObj] = useState(
    // Revenue
    {
      chartID: shortid.generate(),
      name: "Time to arrive distribution",
      metricName: "",
      data: data,
      chartSettings: {
        type: "line",
        showDelta: true,
        deltaFormat: "$",
        deltaFormatPosition: "start",
        showLegend: false,
        ticks: {
          y: {
            customTickFormatY: false,
            customTickFormatYType: "minutes",
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
            label: "Time to arrive",
            yAxisID: "y",
          },
        },
      ],
    }
  );

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

  function makeTimeString(time) {
    let hours = Math.floor(time / 3600);
    let minutes = Math.floor((time - hours * 3600) / 60);
    let seconds = time - hours * 3600 - minutes * 60;

    time = `${seconds}s`;
    if (minutes !== 0) {
      time = `${minutes}m ` + time;
    }
    if (hours !== 0) {
      time = `${hours}h ` + time;
    }
    return time;
  }

  const [isCollapsingNumbers, setIsCollapsingNumbers] = useState(false);
  const [collapseNumbersFactor, setCollapseNumbersFactor] = useState(5);

  useEffect(() => {
    drawChart(true);
  }, [isCollapsingNumbers]);
  useEffect(() => {
    if (isCollapsingNumbers && !isNaN(parseFloat(collapseNumbersFactor))) {
      drawChart(true);
    }
  }, [collapseNumbersFactor]);

  function drawChart(forceRedraw) {
    if (document.getElementById(`lineChart${chartObj.chartID}`) !== null) {
      // Still check if any data is present, even if forceRedraw = true. And make sure
      // ...we dont draw chart when isError is true (that means there are no data by some reason, wrong date range or just absolutely no data)

      if (chartRef.current !== null) {
        chartRef.current.destroy();
      }
      // console.log(chartObj)

      function countOccurrences(arr) {
        const occurrences = {};
        arr.forEach((num) => {
          occurrences[num] = (occurrences[num] || 0) + 1;
        });
        return occurrences;
      }
      let sortedData = chartObj.data ? chartObj.data.sort((a, b) => a - b) : [];
      let readyData = sortedData ? countOccurrences(sortedData) : {};
      if (isCollapsingNumbers) {
        function compressKeys(obj, rangeSize = 5) {
          const result = {};

          const keys = Object.keys(obj)
            .map(Number)
            .sort((a, b) => a - b);

          for (let i = 0; i < keys.length; i++) {
            const startRange =
              Math.floor(keys[i] / parseFloat(rangeSize)) *
              parseFloat(rangeSize);
            const endRange = startRange + parseFloat(rangeSize) - 1;
            const rangeKey = `${startRange}-${endRange}`;

            if (result[rangeKey]) {
              result[rangeKey] += obj[keys[i]];
            } else {
              result[rangeKey] = obj[keys[i]];
            }
          }

          return result;
        }
        readyData = compressKeys(readyData, collapseNumbersFactor);
      }
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
                  if (isCollapsingNumbers) {
                    const str = labels[value].split("-");
                    return `${makeTimeString(str[0])}-${makeTimeString(str[1])}`;
                  } else {
                    return makeTimeString(labels[value]);
                  }
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
                      if (chartObj.chartSettings.ticks.y1.customTickFormatY) {
                        switch (
                          chartObj.chartSettings.ticks.y1.customTickFormatYType
                        ) {
                          case "minutes":
                            if (isCollapsingNumbers) {
                              const str = value.split("-");

                              const minutes1 = Math.floor(str[0] / 60);
                              const remainingSeconds1 = str[0] % 60;
                              const minutes2 = Math.floor(str[1] / 60);
                              const remainingSeconds2 = str[1] % 60;
                              return `${minutes1}m${remainingSeconds1.toString().padStart(2, "0")}s - ${minutes2}m${remainingSeconds2.toString().padStart(2, "0")}s`;
                            } else {
                              const minutes = Math.floor(value / 60);
                              const remainingSeconds = value % 60;
                              return `${minutes}m${remainingSeconds.toString().padStart(2, "0")}s`;
                            }

                          case "money":
                            return "$" + value.toFixed(0);

                          case "percentile":
                            return value.toFixed(0) + "%";

                          default:
                            return value.toFixed(0);
                        }
                      } else {
                        return value.toFixed(0);
                      }
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
                    if (isCollapsingNumbers) {
                      const str = context.label.split("-");
                      label += `: ${makeTimeString(str[0])}-${makeTimeString(str[1])}`;
                    } else {
                      label += `: ${makeTimeString(context.label)}`;
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

        {chartObj.data.every((item) => isNaN(parseFloat(item)) === false) && (
          <Box
            sx={{
              mt: "auto",
              ml: "auto",
            }}
          >
            <Button
              onClick={() => setIsCollapsingNumbers(!isCollapsingNumbers)}
              variant={isCollapsingNumbers ? "contained" : "outlined"}
              sx={{
                fontSize: "12px",
                textTransform: "none",
                height: "30px",
              }}
            >
              Collapse numbers
            </Button>
            <Input
              endAdornment={<InputAdornment position="start">±</InputAdornment>}
              sx={{ width: "60px", textAlign: "center", ml: 1 }}
              value={collapseNumbersFactor}
              onChange={(e) => setCollapseNumbersFactor(e.target.value)}
            />
          </Box>
        )}
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
