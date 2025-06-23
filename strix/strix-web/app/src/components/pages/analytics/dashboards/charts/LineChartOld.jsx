import React, { useEffect, useState, useRef } from "react";
import data from "../sampleData.json";
import Skeleton from "@mui/material/Skeleton";
import s from "./css/lineChart.module.css";
import "./css/chartsDarkTheme.css";
import bb, { line } from "billboard.js";
import dayjs from "dayjs";

const LineChart = ({ chartObj, dateRange }) => {
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
    if (chartRef.current !== undefined) {
      chartRef.current.load({
        // Loading data for visualization
        json: newData,

        // Set corresponding field name to be a category field
        // Also specify which fields we want to visualize as values
        keys: {
          x: chartObj.categoryField,
          value: chartObj.valueFields,
        },
      });
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
        }
        if (
          chartRendered &&
          currentGranularityRef.current !== chartObj.data.granularity
        ) {
          // console.log('redraw')
          setCurrentGranularity(chartObj.data.granularity);
          chartRef.current.destroy();
          drawChart(true);
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

  // REQUIRED: Use this useEffect on mount since otherwise "bindto" won't find an element to bind chart to and it will just be put into the page's body.
  // This is because the DOM is not loaded yet if we call it outside of a hook, and no such element with id is yet present.
  function drawChart(forceRedraw) {
    if (document.getElementById(`lineChart${chartObj.chartID}`) !== null) {
      // Still check if any data is present, even if forceRedraw = true. And make sure
      // ...we dont draw chart when isError is true (that means there are no data by some reason, wrong date range or just absolutely no data)
      if (
        ((chartObj.data.data === undefined || chartRendered === true) &&
          !forceRedraw) ||
        chartObj.isError
      )
        return;
      const chart = bb.generate({
        data: {
          // Loading data for visualization
          json: chartObj.data.data,

          // Set corresponding field name to be a category field
          // Also specify which fields we want to visualize as values
          keys: {
            x: chartObj.categoryField,
            value: chartObj.valueFields,
          },
          xLocaltime: false,
          types: line(),
        },

        // Set padding so X values on the left or right won't get cropped by overflow
        padding: {
          left: 30,
          right: 20,
        },

        legend: {
          show: chartObj.chartSettings.showLegend,
          position: "bottom",
        },

        // Set X axis as category
        axis: {
          y: {
            // Set padding so value won't be cropped by overflow
            padding: {
              top: 20,
              bottom: 5,
            },
            tick: {
              // DONT SET STEPSIZE TO 1 OR SOME OTHER VALUE, OTHERWISE IT WILL BEHAVE THE WRONG WAY ON DIFFERENT SCALE
              // stepSize: chartObj.chartSettings.YTickStepSize,
              culling: {
                max: 4,
              },
            },
          },
          x: {
            tick: {
              format: function (x) {
                function getMonthName(date) {
                  const options = { month: "short" };
                  return new Intl.DateTimeFormat("en-US", options).format(date);
                }

                function getDayName(date) {
                  const options = { weekday: "short" };
                  return new Intl.DateTimeFormat("en-US", options).format(date);
                }

                function formatCustomDate(date) {
                  const hours = date.getHours().toString().padStart(2, "0");
                  const minutes = date.getMinutes().toString().padStart(2, "0");
                  const day = date.getDate();
                  const month = getMonthName(date);
                  const year = date.getFullYear();

                  if (chartObj.data.granularity === "minute") {
                    return `${hours}:${minutes}`;
                  } else if (chartObj.data.granularity === "hour") {
                    return `${hours}:${minutes}`;
                  } else if (chartObj.data.granularity === "day") {
                    return `${month} ${day}    ${year}`;
                  }
                }

                return formatCustomDate(x);
              },
              // Change it to "false" when dealing with hour or minutes. "True" when dealing with day granularity
              fit: getFitParam(),
              culling: {
                max: 15,
                lines: false,
              },
            },
            localtime: false,
            type: "timeseries",
          },
        },
        grid: {
          y: {
            front: false,
            show: true,
          },
        },

        // Rudimentary but leave it in case we need to handle chart rendering when the page is not visible by the user
        render: {
          lazy: true,
          observe: false,
        },
        bindto: document.getElementById(`lineChart${chartObj.chartID}`),

        // Custom tooltip. Must be provided with every chart
        tooltip: {
          format: {
            title: function (x) {
              function getMonthName(date) {
                const options = { month: "short" };
                return new Intl.DateTimeFormat("en-US", options).format(date);
              }

              function getDayName(date) {
                const options = { weekday: "short" };
                return new Intl.DateTimeFormat("en-US", options).format(date);
              }

              function formatCustomDate(date) {
                const hours = date.getHours().toString().padStart(2, "0");
                const minutes = date.getMinutes().toString().padStart(2, "0");
                const day = date.getDate();
                const month = getMonthName(date);
                const dayOfWeek = getDayName(date);
                const year = date.getFullYear();

                return `${hours}:${minutes} ${month} ${day} (${dayOfWeek}) ${year}`;
              }

              return formatCustomDate(x);
            },
          },
          contents: chartObj.chartSettings.tooltipContents,
        },
      });
      setChartRendered(true);
      chart.flush();
      chartRef.current = chart;
    }
  }
  useEffect(() => {
    drawChart();
  }, []);

  useEffect(() => {
    if (chartRef.current !== undefined && chartRef.current !== null) {
      // setChartRendered(false);
      chartRef.current.destroy();
      drawChart(true);
    }
  }, [dateRange]);

  function generateDateRange(start, end) {
    //   Day.js   Date JavaScript
    let startDate = dayjs.utc(start.$d);
    let endDate = dayjs.utc(end.$d);
    startDate = startDate.hour(0).minute(0).second(0).millisecond(0);
    endDate = endDate.hour(23).minute(59).second(59).millisecond(999);

    //   (  )
    let step = endDate.diff(startDate, "day") < 8 ? "hour" : "hour";
    step = endDate.diff(startDate, "day") < 15 ? step : "day";
    console.log(step);

    //
    let current = startDate;
    let dates = [];

    while (current.isBefore(endDate) || current.isSame(endDate)) {
      dates.push(current.toISOString());
      current = current.add(1, step);
    }

    return dates;
  }

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
                  {chartObj.metricFormat}
                  {Math.abs(currentDeltaValue)}
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
              <div
                className={`${s.chart} ${showNoDataError ? s.noDataChart : ""}`}
                id={`lineChart${chartObj.chartID}`}
              ></div>,

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
