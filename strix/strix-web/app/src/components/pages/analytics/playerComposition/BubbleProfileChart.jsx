import React, { useEffect, useState, useRef } from "react";
import Skeleton from "@mui/material/Skeleton";
import s from "./css/BubbleProfileChart.module.css";
import MuiTooltip from "@mui/material/Tooltip";

// Date modules
import dayjs, { diff } from "dayjs";

// Funnel plugin
import { Tooltip } from "chart.js";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import BoxselectPlugin from "chartjs-plugin-boxselect";
import "chartjs-adapter-moment";
import utc from "dayjs-plugin-utc";

// For coloring
import chroma from "chroma-js";
import { Typography } from "@mui/material";
import TextField from "@mui/material/TextField";
import zoomPlugin from "chartjs-plugin-zoom";
import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/Refresh";
import CenterFocusWeakIcon from "@mui/icons-material/CenterFocusWeak";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
Chart.register(ChartDataLabels, Tooltip, BoxselectPlugin, zoomPlugin);
dayjs.extend(utc);
import { useTheme } from "@mui/material/styles";

const BubbleProfileChart = ({
  chartObj,

  // Elements
  elementsNames,

  // Provided elements types
  elementsTypes,
  selectedData,
  invertedAxises,

  setSelectedData,
}) => {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [chartRendered, setChartRendered] = useState(false);
  const theme = useTheme();

  const [currentGranularity, setCurrentGranularity] = useState();
  const currentGranularityRef = useRef(null);
  currentGranularityRef.current = currentGranularity;

  const [zoomOnSelect, setZoomOnSelect] = useState(() => {
    if (localStorage.getItem("profileComposition_zoomOnSelect") !== null) {
      return localStorage.getItem("profileComposition_zoomOnSelect") === "true";
    }
    return true;
  });
  const chartRef = useRef(null);

  const elementTypesRef = useRef(elementsTypes);
  useEffect(() => {
    elementTypesRef.current = elementsTypes;
  }, [elementsTypes]);

  function pickElementAccordingToType(
    player,
    targetElementID,
    axisID,
    pickingRawRadiusOrDate = false,
    toFixed = 2
  ) {
    switch (elementTypesRef.current[axisID]) {
      case "date":
        if (pickingRawRadiusOrDate) {
          return dayjs
            .utc(pickElement(player, targetElementID))
            .format("DD.MM.YYYY HH:mm");
        } else {
          return Math.abs(
            dayjs
              .utc(pickElement(player, targetElementID))
              .diff(dayjs.utc().format(), "minute")
          );
        }
      case "bool":
        if (pickingRawRadiusOrDate) {
          return pickElement(player, targetElementID);
        } else {
          return pickElement(player, targetElementID) === "True" ? 5 : 1;
        }
      default:
        if (Number.isNaN(pickElement(player, targetElementID))) {
          return pickElement(player, targetElementID);
        } else {
          return parseFloat(pickElement(player, targetElementID)).toFixed(
            toFixed
          );
        }
    }
  }
  const defaultAxisConfig = {
    grid: {
      display: true,
    },
  };
  const [showNoDataError, setShowNoDataError] = useState();
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  function getRadius(player) {
    if (chartObj.radius === "") return 5;
    let value = pickElementAccordingToType(
      player,
      chartObj.radius,
      "r",
      false,
      2
    );

    let radius =
      normalizeToRange(value, minRadiusRef.current, maxRadiusRef.current) * 10;

    return clamp(radius.toFixed(2), 1, 20);
  }
  function normalizeToRange(value, min, max) {
    return (value - min) / (max - min);
  }

  const maxRadiusRef = useRef(-Infinity);
  const minRadiusRef = useRef(Infinity);
  function recalcRadiuses(data) {
    maxRadiusRef.current = -Infinity;
    minRadiusRef.current = Infinity;

    data.forEach((player) => {
      if (player !== null) {
        let r = parseFloat(
          pickElementAccordingToType(player, chartObj.radius, "r")
        );
        if (r > maxRadiusRef.current) {
          maxRadiusRef.current = r;
        }
        if (r < minRadiusRef.current || minRadiusRef.current === Infinity) {
          minRadiusRef.current = r;
        }
      }
    });
  }

  const chartObjRef = useRef(chartObj);
  const elementsNamesRef = useRef(elementsNames);
  useEffect(() => {
    chartObjRef.current = chartObj;
    elementsNamesRef.current = elementsNames;
  }, [chartObj, elementsNames]);

  useEffect(() => {
    updateAxisInversions(invertedAxises);
  }, [invertedAxises]);

  function updateAxisInversions(invertedAxises) {
    if (chartRef.current !== undefined && chartRef.current !== null) {
      chartRef.current.options.scales.x.reverse = invertedAxises.inverted_x;
      chartRef.current.options.scales.y.reverse = invertedAxises.inverted_y;
      chartRef.current.update();
    }
  }

  // Function for loading new data to chart (or updating). Initial data is set in drawChart()
  // const prevDataRef = useRef(null)
  function updateData() {
    if (chartRef.current !== undefined && chartRef.current !== null) {
      function addData(chart) {
        if (chartObj.metrics[0].data.data) {
          recalcRadiuses(chartObj.metrics[0].data.data);
        }

        // const readyBorderColors = new Array(readyData.length).fill(chartObj.borderColorDefault)
        // const readyBackgroundColors = new Array(readyData.length).fill(chartObj.backgroundColorDefault)
        (chart.data.labels = chartObj.categoryData.map((dataItem) => dataItem)),
          (chart.data.datasets = chartObj.metrics.map((metric) => ({
            ...metric.datasetConfig.config,
            data: metric.data
              ? metric.data.data.map((player) => {
                  resetColors(chart, metric.data.data.length);
                  let tempData = {
                    id: player.clientID,

                    x: pickElementAccordingToType(player, chartObj.axisX, "x"),

                    y: pickElementAccordingToType(
                      player,
                      chartObj.axisY,
                      "y",
                      false,
                      2
                    ),

                    r: getRadius(player),

                    rawR: pickElementAccordingToType(
                      player,
                      chartObj.radius,
                      "r",
                      true,
                      2
                    ),
                  };
                  return tempData;
                })
              : [],
          })));

        chart.options.scales.y = {
          ...chart.options.scales.y,
          ticks: {
            ...chart.options.scales.y.ticks,
            callback: function (value, index, ticks) {
              if (elementTypesRef.current["y"] === "date") {
                return value + " min";
              } else {
                return value;
              }
            },
          },
        };
        chart.options.scales.x = {
          ...chart.options.scales.x,
          ticks: {
            ...chart.options.scales.x.ticks,
            callback: function (value, index, ticks) {
              if (elementTypesRef.current["x"] === "date") {
                return value + " min";
              } else {
                return value;
              }
            },
          },
        };
        // chart.options.scales.x = {...defaultAxisConfig, ...getAxisConfigType('x')}
        // console.log('Axis X', {...defaultAxisConfig, ...getAxisConfigType('x')}, chart.options.scales.x)
        // console.log('Axis Y', {...getAxisConfigType('y')}, chart.options.scales.y)

        chart.update();
      }
      addData(chartRef.current);
    }
  }

  function checkAnyDataExist() {
    return chartObj.metrics.some(
      (metric) => metric.data && metric.data.data.length > 0
    );
  }
  function checkAnyMetricsExist() {
    return chartObj.metrics.length > 0;
  }

  // If data changes, toggle update
  useEffect(() => {
    if (checkAnyMetricsExist()) {
      // Stop showing skeleton if any metric exists
      setShowSkeleton(false);

      if (checkAnyDataExist()) {
        // setShowNoDataError(false)

        if (chartRendered) {
          updateData();
        } else {
          // If we didnt draw the chart yet, do it now
          drawChart();
        }

        return;
      } else {
        drawChart();
        setShowSkeleton(false);
        // setShowNoDataError(true)
      }
    }

    setShowSkeleton(false);
  }, [chartObj]);

  useEffect(() => {
    if (!showSkeleton) {
      drawChart();
    }
  }, [showSkeleton]);

  useEffect(() => {
    if (showNoDataError && chartRef.current !== null) {
      chartRef.current.destroy();
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

  function pickElement(player, targetElementID) {
    let foundElementValue = player.elements.find(
      (element) => element.elementID === targetElementID
    );
    if (!foundElementValue) {
      return 0;
    } else {
      return foundElementValue.elementValue;
    }
  }

  function getPlayerByID(id) {
    return chartObjRef.current.metrics[0].data.data.find(
      (player) => player.clientID === id
    );
  }

  function resetColors(chart, length) {
    chartRef.current.data.datasets[0].backgroundColor = new Array(length).fill(
      chartObj.backgroundColorDefault
    );
    chartRef.current.data.datasets[0].borderColor = new Array(length).fill(
      chartObj.borderColorDefault
    );
  }
  useEffect(() => {
    if (selectedData !== undefined) {
      updateIndexColors(selectedData);
    }
  }, [selectedData]);
  function updateIndexColors(data) {
    if (chartRef.current !== undefined && chartRef.current !== null) {
      resetColors(
        chartRef.current,
        chartRef.current.data.datasets[0].data.length
      );
      data.forEach((player) => {
        let index = chartRef.current.data.datasets[0].data.findIndex(
          (p) => p.id === player.id
        );
        if (index !== -1) {
          chartRef.current.data.datasets[0].backgroundColor[index] =
            chartObj.backgroundColorSelected;
          chartRef.current.data.datasets[0].borderColor[index] =
            chartObj.borderColorSelected;
        }
      });

      // chartRef.current.data.datasets[0].backgroundColor = chartRef.current.data.datasets[0].backgroundColor.fill(chartObj.backgroundColorDefault);
      // chartRef.current.data.datasets[0].borderColor = chartRef.current.data.datasets[0].borderColor.fill(chartObj.borderColorDefault);

      // indexes.forEach(index => {
      //   chartRef.current.data.datasets[0].pointBackgroundColor[index] = chartObj.backgroundColorSelected;
      //   chartRef.current.data.datasets[0].borderColor[index] = chartObj.borderColorSelected;
      // })

      chartRef.current.update();
    }
  }

  // REQUIRED: Use this useEffect on mount since otherwise "bindto" won't find an element to bind chart to and it will just be put into the page's body.
  // This is because the DOM is not loaded yet if we call it outside of a hook, and no such element with id is yet present.
  function drawChart(forceRedraw) {
    if (document.getElementById(`universalChart${chartObj.chartID}`) !== null) {
      // Still check if any data is present, even if forceRedraw = true. And make sure
      // ...we dont draw chart when isError is true (that means there are no data by some reason, wrong date range or just absolutely no data)
      // if (!forceRedraw || chartObj.isError) return;

      if (chartRef.current !== null) {
        chartRef.current.destroy();
      }

      if (chartObj.categoryData === undefined) return;
      if (
        chartObj.metrics[0].data.data.some((dataItem) => dataItem === undefined)
      )
        return;

      // console.log('chartObj', chartObj)

      recalcRadiuses(chartObj.metrics[0].data.data);
      let readyData = chartObj.metrics[0].data.data
        ? chartObj.metrics[0].data.data.map((player) => ({
            id: player.clientID,

            x: pickElementAccordingToType(player, chartObj.axisX, "x"),

            y: pickElementAccordingToType(
              player,
              chartObj.axisY,
              "y",
              false,
              2
            ),

            r: getRadius(player),

            rawR: pickElementAccordingToType(
              player,
              chartObj.radius,
              "r",
              true,
              2
            ),
          }))
        : [];

      const canvasObj = document
        .getElementById(`universalChart${chartObj.chartID}`)
        .getContext("2d");
      const chart = new Chart(canvasObj, {
        // type: chartObj.chartSettings.type,
        type: "scatter",
        data: {
          // labels: chartObj.categoryData ? chartObj.categoryData.map(categoryData => categoryData) : [],
          datasets: chartObj.metrics.map((metric) => ({
            ...metric.datasetConfig.config,
            data: readyData,
          })),
        },
        options: {
          scales: {
            x: {
              ticks: {
                reverse: invertedAxises.inverted_x,
              },
              ...defaultAxisConfig,
            },
            y: {
              ticks: {
                reverse: invertedAxises.inverted_y,
              },
              ...defaultAxisConfig,
            },
          },
          // Resize funnel to be the width and height of it's container
          // Requires dedicated <div> around <canvas>
          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            boxselect: {
              select: {
                enabled: true,
                direction: "xy",
              },
              callbacks: {
                beforeSelect: function (startX, endX, startY, endY) {
                  return true;
                },
                afterSelect: function (startX, endX, startY, endY, datasets) {
                  if (chartRef?.current && datasets[0].data.length > 0) {
                    chartRef.current.zoomScale(
                      "x",
                      { min: startX, max: endX },
                      "default"
                    );
                    chartRef.current.zoomScale(
                      "y",
                      { min: startY, max: endY },
                      "default"
                    );
                  }
                  updateIndexColors(datasets[0].data);
                  setSelectedData(datasets[0].data);
                },
              },
            },

            zoom: {
              pan: {
                enabled: false,
              },
              limits: {},
              zoom: {
                wheel: {
                  enabled: false,
                },
              },
            },

            legend: {
              display: chartObj.chartSettings.showLegend,
              position: chartObj.chartSettings.legendPosition,
            },
            // Tooltip on hovering exact day
            tooltip: {
              enabled: true,
              intersect: false,
              mode: "nearest",
              callbacks: {
                title: (tooltipItems) => {
                  if (tooltipItems.length === 1) {
                    return `Client ${tooltipItems[0].raw.id}`;
                  }
                  return (
                    tooltipItems
                      .map((item) => item.raw.id)
                      .splice(0, 5)
                      .join("\n") +
                    "\n..." +
                    (tooltipItems.length - 5) +
                    " more"
                  );
                },
                label: function (context) {
                  let labels = ["Elements: "];

                  if (chartObjRef.current.axisX !== "") {
                    labels.push(
                      "  " +
                        elementsNamesRef.current.find(
                          (e) => e.id === chartObjRef.current.axisX
                        ).name +
                        ": " +
                        pickElementAccordingToType(
                          getPlayerByID(context.raw.id),
                          chartObjRef.current.axisX,
                          "x",
                          true
                        )
                    );
                  }
                  if (chartObjRef.current.axisY !== "") {
                    labels.push(
                      "  " +
                        elementsNamesRef.current.find(
                          (e) => e.id === chartObjRef.current.axisY
                        ).name +
                        ": " +
                        pickElementAccordingToType(
                          getPlayerByID(context.raw.id),
                          chartObjRef.current.axisY,
                          "y",
                          true
                        )
                    );
                  }
                  if (chartObjRef.current.radius !== "") {
                    labels.push(
                      "  " +
                        elementsNamesRef.current.find(
                          (e) => e.id === chartObjRef.current.radius
                        ).name +
                        ": " +
                        context.raw.rawR
                    );
                  }

                  return labels;
                },
              },
            },
            // Labels
            datalabels: {
              display: false,
              color: "#e7e7e7",
              formatter: (value, context) => {
                const label = context.chart.data.labels[context.dataIndex];
                return `${label}\n${formatPlayerCount(value)}`;
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

  function formatPlayerCount(value, fixedAmount = 0) {
    // Format 1000 to 1 000

    const parsedValue = parseFloat(value).toFixed(fixedAmount).toString();

    const formattedDollars = parsedValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    const formattedValue = `${formattedDollars}`;

    return formattedValue;
  }

  return (
    <div
      className={
        chartObj.chartSettings.fullWidth
          ? `${s.UniversalChartBody} ${s.UniversalChartBodyFullWidth}`
          : s.UniversalChartBody
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
      <div
        id={`universalChart${chartObj.chartID}-body`}
        className={s.UniversalChart}
      >
        <MuiTooltip title="Reset zoom" disableInteractive placement="top">
          <Button
            onClick={() => {
              if (chartRef?.current) {
                chartRef.current.resetZoom();
              }
            }}
            sx={{
              position: "absolute",
              top: "10%",
              right: "-6%",
              minWidth: 20,
            }}
          >
            <RefreshIcon />
          </Button>
        </MuiTooltip>

        <MuiTooltip
          title="Toggle zoom on select"
          disableInteractive
          placement="top"
        >
          <Button
            onClick={() => {
              setZoomOnSelect(!zoomOnSelect);
              localStorage.setItem(
                "profileComposition_zoomOnSelect",
                !zoomOnSelect
              );
            }}
            sx={{
              position: "absolute",
              top: "10%",
              right: "-12%",
              minWidth: 20,
            }}
          >
            {zoomOnSelect ? (
              <CenterFocusStrongIcon
                htmlColor={
                  zoomOnSelect
                    ? theme.palette.text.primary
                    : theme.palette.text.disabled
                }
              />
            ) : (
              <CenterFocusWeakIcon
                htmlColor={
                  zoomOnSelect
                    ? theme.palette.text.primary
                    : theme.palette.text.disabled
                }
              />
            )}
          </Button>
        </MuiTooltip>
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
              <div
                className={s.ChartContainerOnly}
                // style={{
                //   width: chartObj.chartSettings.canvasWidth ? chartObj.chartSettings.canvasWidth : '',
                //   height: chartObj.chartSettings.canvasHeight ? chartObj.chartSettings.canvasHeight-80 : '',
                // }}
              >
                <canvas
                  className={`${s.chart} ${showNoDataError ? s.noDataChart : ""}`}
                  id={`universalChart${chartObj.chartID}`}
                ></canvas>
              </div>,

              showNoDataError &&
                (chartObj.chartSettings.customNoDataLabel !== undefined ? (
                  <div className={s.noDataLabel}>
                    {chartObj.chartSettings.customNoDataLabel}
                  </div>
                ) : (
                  <div className={s.noDataLabel}>No Data</div>
                )),
            ]}
      </div>
    </div>
  );
};

export default BubbleProfileChart;
