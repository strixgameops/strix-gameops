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

const LineChart = ({ data, valueName }) => {
  if (data === undefined || data === null || data.length === 0)
    return <div></div>;

  const [chartObj, setChartObj] = useState({
    chartID: shortid.generate(),
    name: valueName,
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
        arr.forEach((obj) => {
          occurrences[obj.value] = obj.players;
        });
        return occurrences;
      }
      function determineType(value) {
        if (
          new Date(value) != "Invalid Date" &&
          value.toString().includes("-") &&
          value.toString().includes("Z") &&
          value.toString().includes("T")
        ) {
          return "date";
        } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
          return "number";
        } else {
          return "string";
        }
      }

      let sortedData = chartObj.data ? chartObj.data.slice() : [];

      if (sortedData.length > 0) {
        const valueType = determineType(sortedData[0].value);

        if (valueType === "number") {
          sortedData.sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
        } else if (valueType === "string") {
          sortedData.sort((a, b) => b.players - a.players);
        } else if (valueType === "date") {
          sortedData = chartObj.data
            ? chartObj.data.reduce((acc, curr) => {
                const key = curr.value;
                const value = curr.players;
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
              }, {})
            : {};
          sortedData = Object.keys(sortedData)
            .map((date) => ({
              value: date,
              players: sortedData[date],
            }))
            .sort(
              (a, b) =>
                new Date(Object.keys(a)[0]) - new Date(Object.keys(b)[0])
            );
        }
      }

      let readyData = sortedData ? countOccurrences(sortedData) : {};
      if (isCollapsingNumbers) {
        function compressKeys(obj, rangeSize = 5) {
          const valueType = determineType(sortedData[0].value);
          const result = {};
          //
          let keys = {};
          if (valueType === "date") {
            keys = Object.keys(obj)
              .map((key) => new Date(key))
              .sort((a, b) => a - b);
          } else {
            keys = Object.keys(obj)
              .map(Number)
              .sort((a, b) => a - b);
          }

          if (valueType === "date") {
            if (rangeSize === 0 || rangeSize > 99999999) {
              return obj;
            }
            const intervalMs = rangeSize * 60 * 60 * 1000;

            keys.forEach((date) => {
              //
              const startRange = new Date(
                Math.floor(date.getTime() / intervalMs) * intervalMs
              );
              //
              const endRange = new Date(startRange.getTime() + intervalMs - 1);

              const rangeKey = `${startRange.toISOString().slice(0, 19).replace("T", " ")} - ${endRange.toISOString().slice(0, 19).replace("T", " ")}`;

              //       ,
              if (result[rangeKey]) {
                result[rangeKey] += obj[date.toISOString()];
              } else {
                result[rangeKey] = obj[date.toISOString()];
              }
            });
          } else {
            //
            for (let i = 0; i < keys.length; i++) {
              const startRange =
                Math.floor(keys[i] / parseFloat(rangeSize)) *
                parseFloat(rangeSize);
              const endRange = startRange + parseFloat(rangeSize) - 1;
              const rangeKey = `${startRange}-${endRange}`;

              //       ,
              if (result[rangeKey]) {
                result[rangeKey] += obj[keys[i]];
              } else {
                result[rangeKey] = obj[keys[i]];
              }
            }
          }

          return result;
        }
        readyData = compressKeys(readyData, collapseNumbersFactor);
      }

      let labels = Object.keys(readyData);

      const canvasObj = document
        .getElementById(`lineChart${chartObj.chartID}`)
        .getContext("2d");
      const chart = new Chart(canvasObj, {
        type: chartObj.chartSettings.type,
        data: {
          labels: readyData ? labels : [],
          datasets: [
            {
              ...chartObj.datasetsConfigs[0].config,
              data: readyData ? labels.map((d, i) => readyData[d]) : [],
            },
          ],
        },
        options: {
          scales: {
            x: {
              title: {
                display: true,
                text: "Distribution",
              },
              font: {
                size: 9,
              },
              ticks: {
                callback: function (value, index, ticks) {
                  if (determineType(labels[value]) == "date") {
                    if (isCollapsingNumbers) {
                      let tempDates = labels[value].split(" - ");
                      return `${dayjs.utc(tempDates[0]).format("DD.MM.YYYY HH:mm")} - ${dayjs.utc(tempDates[1]).format("DD.MM.YYYY HH:mm")}`;
                    } else {
                      return dayjs
                        .utc(labels[value])
                        .format("DD.MM.YYYY HH:mm");
                    }
                  }
                  return labels[value];
                },
              },
            },
            y: {
              title: {
                display: true,
                text: "Occurrences",
              },
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
                    if (determineType(context.label) == "date") {
                      label += `: ${dayjs.utc(context.label).format("DD.MM.YYYY HH:mm")}`;
                    } else {
                      label += `: ${context.label}`;
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

        {chartObj.data.every((item) => {
          return isNaN(parseFloat(item.value)) === false;
        }) && (
          <Box
            sx={{
              mt: "auto",
              ml: "auto",
              mr: 5,
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
