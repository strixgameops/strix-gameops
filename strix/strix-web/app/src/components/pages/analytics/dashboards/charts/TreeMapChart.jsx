import React, { useEffect, useState, useRef } from "react";
import Skeleton from "@mui/material/Skeleton";
import s from "./css/treeMapChart.module.css";

// Date modules
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";

// Funnel plugin
import { Tooltip } from "chart.js";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

// For coloring
import chroma from "chroma-js";
import { useTheme } from "@mui/material/styles";
import { Typography as T } from "@mui/material";

import * as helpers from "chart.js/helpers";

import { TreemapController, TreemapElement } from "chartjs-chart-treemap";

// Make dayjs work with utc, so we will treat all time as non-local
dayjs.extend(utc);

Chart.register(TreemapController, TreemapElement, ChartDataLabels, Tooltip);

const LineChart = ({ chartObj, dateRange }) => {
  const theme = useTheme();

  const [showSkeleton, setShowSkeleton] = useState(true);
  const [chartRendered, setChartRendered] = useState(false);

  const [currentGranularity, setCurrentGranularity] = useState();
  const currentGranularityRef = useRef(null);
  currentGranularityRef.current = currentGranularity;

  const chartRef = useRef(null);

  const [showNoDataError, setShowNoDataError] = useState();

  const [currentDeltaValue, setCurrentDeltaValue] = useState(0);

  // Function for loading new data to chart (or updating). Initial data is set in drawChart()
  function updateData(newData) {
    if (
      chartRef.current !== undefined &&
      chartRef.current !== null &&
      !showNoDataError
    ) {
      // function addData(chart) {
      //   chart.data.labels = newData.map(dataItem => dataItem.timestamp)
      //   chart.data.datasets[0].data = newData.map(dataItem => dataItem.value)
      //   chart.options.scales.x.time.unit = chartObj.data.granularity
      //   chart.update();
      // }
      // addData(chartRef.current)
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
          console.log(chartObj.data.data);
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
  function colorFromRaw(ctx) {
    if (ctx.type !== "data") {
      return "transparent";
    }
    const value = ctx.raw.v;
    let alpha = (1 + Math.log(value)) / 15;
    const color = "green";
    return helpers.color(color).alpha(alpha).rgbString();
  }

  // REQUIRED: Use this useEffect on mount since otherwise "bindto" won't find an element to bind chart to and it will just be put into the page's body.
  // This is because the DOM is not loaded yet if we call it outside of a hook, and no such element with id is yet present.
  function drawChart(forceRedraw) {
    if (document.getElementById(`treeMap${chartObj.chartID}`) !== null) {
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

      const data = [
        { category: "cantlose", value: 75 },
        { category: "atrisk", value: 1007 },
        { category: "hibernate", value: 3261 },
        { category: "loyal", value: 246 },
        { category: "champions", value: 38 },
        { category: "attention", value: 418 },
        { category: "abouttosleep", value: 1345 },
        { category: "potentialloyal", value: 681 },
        { category: "promising", value: 374 },
        { category: "newplayers", value: 127 },
      ];
      // console.log(chartObj)
      // console.log('Date range in X axis [0]:', dateRange[0].hour(0).minute(0).second(0).millisecond(0).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'))
      // console.log('Date range in X axis [1]:', dateRange[1].hour(23).minute(59).second(59).millisecond(999).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'))
      const canvasObj = document
        .getElementById(`treeMap${chartObj.chartID}`)
        .getContext("2d");
      const chart = new Chart(canvasObj, {
        type: "treemap",
        data: {
          labels: [15, 6, 6, 5, 4, 3, 2, 2],
          // chartObj.data.data.map(dataItem => dataItem.timestamp),
          datasets: [
            {
              label: "My treemap dataset",
              tree: data,
              key: "value",
              groups: ["category"],
              borderColor: "green",
              borderWidth: 1,
              spacing: 0,
              backgroundColor: (ctx) => colorFromRaw(ctx),
            },

            //   {
            //   tree:
            //   // chartObj.data.data.map(dataItem => dataItem.value)
            // }
          ],
        },
        options: {
          // Resize funnel to be the width and height of it's container
          // Requires dedicated <div> around <canvas>
          maintainAspectRatio: false,

          plugins: {
            legend: {
              display: chartObj.chartSettings.showLegend,
              position: chartObj.chartSettings.legendPosition,
            },
            // Tooltip on hovering
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
              display: true,
              color: "#e7e7e7",
              formatter: (value, context) => {
                const label = context.chart.data.labels[context.dataIndex];
                return `${label}\n${"s".toLocaleString()}%`;
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
            chartObj.name
          )}
        </div>

        <div className={s.LineChartDeltaLabel}>
          {showSkeleton ? (
            <div className={s.LineChartSkeletonContainer}>
              <Skeleton
                animation="wave"
                variant="text"
                sx={{ fontSize: "2rem", width: "50px" }}
              />
            </div>
          ) : (
            // Set delta value and it's classes. Green if positive, red if negative, grey if 0
            <div
              className={`${currentDeltaValue > 0 ? s.positiveDelta : currentDeltaValue < 0 ? s.negativeDelta : s.neutralDelta}`}
            >
              {chartObj.chartSettings.showDelta ? (
                <span>
                  {currentDeltaValue >= 0 ? "+" : "-"}

                  {chartObj.metricFormatPosition === "start" &&
                    chartObj.metricFormat}
                  {Math.abs(currentDeltaValue)}
                  {chartObj.metricFormatPosition === "end" &&
                    chartObj.metricFormat}
                </span>
              ) : (
                <div></div>
              )}
            </div>
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
              // <div className={s.ChartContainerOnly}>
              //   <canvas className={`${s.chart} ${showNoDataError ? s.noDataChart : ''}`} id={`treeMap${chartObj.chartID}`}></canvas>
              // </div>,
              <div className={s.rfmGrid}>
                <div className={s.axisY}>
                  <div className={s.label}>
                    <T
                      variant="body1"
                      fontSize={12}
                      color={theme.palette.error.main}
                    >{`<-- Bad`}</T>
                    <T
                      variant="body1"
                      fontSize={12}
                    >{`Purchase Frequency and Sum`}</T>
                    <T
                      variant="body1"
                      fontSize={12}
                      color={theme.palette.success.main}
                    >{`Good -->`}</T>
                  </div>
                  <div className={s.ticks}>
                    <div className={s.tick}>
                      <T>0</T>
                    </div>
                    <div className={s.tick}>
                      <T>1</T>
                    </div>
                    <div className={s.tick}>
                      <T>2</T>
                    </div>
                    <div className={s.tick}>
                      <T>3</T>
                    </div>
                    <div className={s.tick}>
                      <T>4</T>
                    </div>
                    <div className={s.tick}>
                      <T>5</T>
                    </div>
                  </div>
                </div>

                <div className={s.axisX}>
                  <div className={s.label}>
                    <T
                      variant="body1"
                      fontSize={12}
                      color={theme.palette.error.main}
                    >{`<-- Bad`}</T>
                    <T variant="body1" fontSize={12}>{`Purchase Recency`}</T>
                    <T
                      variant="body1"
                      fontSize={12}
                      color={theme.palette.success.main}
                    >{`Good -->`}</T>
                  </div>
                  <div className={s.ticks}>
                    <div className={s.tick}>
                      <T>0</T>
                    </div>
                    <div className={s.tick}>
                      <T>1</T>
                    </div>
                    <div className={s.tick}>
                      <T>2</T>
                    </div>
                    <div className={s.tick}>
                      <T>3</T>
                    </div>
                    <div className={s.tick}>
                      <T>4</T>
                    </div>
                    <div className={s.tick}>
                      <T>5</T>
                    </div>
                  </div>
                </div>

                <div className={s.chart}>
                  <div className={s.item}>
                    <div className={s.labelTitle}>
                      <T variant="h6" fontSize={14}>
                        Most valuable players lost / at risk
                      </T>
                    </div>
                    <div className={s.label}>
                      <T variant="h6" fontSize={12}>
                        75 users (1.00%)
                      </T>
                    </div>
                  </div>

                  <div className={s.item}>
                    <div className={s.labelTitle}>
                      <T variant="h6" fontSize={14}>
                        Loyal players
                      </T>
                    </div>
                    <div className={s.label}>
                      <T variant="h6" fontSize={12}>
                        244 users (3.31%)
                      </T>
                    </div>
                  </div>

                  <div className={s.item}>
                    <div className={s.labelTitle}>
                      <T variant="h6" fontSize={14} color={"#000000"}>
                        Most valuable
                      </T>
                    </div>
                    <div className={s.label}>
                      <T variant="h6" fontSize={12} color={"#000000"}>
                        23 users (0.31%)
                      </T>
                    </div>
                  </div>

                  <div className={s.item}>
                    <div className={s.labelTitle}>
                      <T variant="h6" fontSize={14}>
                        Loyal players lost / at risk
                      </T>
                    </div>
                    <div className={s.label}>
                      <T variant="h6" fontSize={12}>
                        1 011 users (13.70%)
                      </T>
                    </div>
                  </div>

                  <div className={s.item}>
                    <div className={s.labelTitle}>
                      <T variant="h6" fontSize={14} color={"#000000"}>
                        Attention
                      </T>
                    </div>
                    <div className={s.label}>
                      <T variant="h6" fontSize={12} color={"#000000"}>
                        416 users (5.64%)
                      </T>
                    </div>
                  </div>

                  <div className={s.item}>
                    <div className={s.labelTitle}>
                      <T variant="h6" fontSize={14} color={"#000000"}>
                        Potential loyal players
                      </T>
                    </div>
                    <div className={s.label}>
                      <T variant="h6" fontSize={12} color={"#000000"}>
                        1 296 users (17.56%)
                      </T>
                    </div>
                  </div>

                  <div className={s.item}>
                    <div className={s.labelTitle}>
                      <T variant="h6" fontSize={14} color={"#000000"}>
                        Common players lost / at risk
                      </T>
                    </div>
                    <div className={s.label}>
                      <T variant="h6" fontSize={12} color={"#000000"}>
                        3 281 users (44.46%)
                      </T>
                    </div>
                  </div>

                  <div className={s.item}>
                    <div className={s.labelTitle}>
                      <T variant="h6" fontSize={14}>
                        Common players at risk
                      </T>
                    </div>
                    <div className={s.label}>
                      <T variant="h6" fontSize={12}>
                        1 296 users (17.56%)
                      </T>
                    </div>
                  </div>

                  <div className={s.item}>
                    <div className={s.labelTitle}>
                      <T variant="h6" fontSize={14}>
                        Promising
                      </T>
                    </div>
                    <div className={s.label}>
                      <T variant="h6" fontSize={12}>
                        326 users (4.42%)
                      </T>
                    </div>
                  </div>

                  <div className={s.item}>
                    <div className={s.labelTitle}>
                      <T variant="h6" fontSize={14} color={"#000000"}>
                        New players
                      </T>
                    </div>
                    <div className={s.label}>
                      <T variant="h6" fontSize={12} color={"#000000"}>
                        90 users (1.22%)
                      </T>
                    </div>
                  </div>
                </div>
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

export default LineChart;
