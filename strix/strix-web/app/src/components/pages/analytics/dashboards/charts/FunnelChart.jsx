import React, { useEffect, useState, useRef } from "react";
import Skeleton from "@mui/material/Skeleton";
import s from "./css/funnelChart.module.css";
import "./css/chartsDarkTheme.css";
import dayjs from "dayjs";
import Typography from "@mui/material/Typography";

// Funnel plugin
import { Tooltip } from "chart.js";
import { FunnelChart as Chart } from "chartjs-chart-funnel";
import ChartDataLabels from "chartjs-plugin-datalabels";

import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);
import { useThemeContext } from "../../../../../contexts/ThemeContext";

// For coloring
import chroma from "chroma-js";

Chart.register(ChartDataLabels, Tooltip);

const FunnelChart = ({ chartObj, dateRange, isLoading }) => {
  const chartID = nanoid();

  const [showSkeleton, setShowSkeleton] = useState(true);
  const [chartRendered, setChartRendered] = useState(false);

  const [currentGranularity, setCurrentGranularity] = useState();
  const currentGranularityRef = useRef(null);
  currentGranularityRef.current = currentGranularity;

  const chartRef = useRef(null);

  const [showNoDataError, setShowNoDataError] = useState();
  const { theme } = useThemeContext();

  const [currentDeltaValue, setCurrentDeltaValue] = useState(0);

  const [retentionData, setRetentionData] = useState();

  const [retentionDay0Value, setRetentionDay0Value] = useState();
  const retentionDay0ValueRef = useRef(null);
  retentionDay0ValueRef.current = retentionDay0Value;
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
      // const newRetentionData = getRetentionData(newData)

      // if (newRetentionData.counts[0] === 0) {
      //   setShowNoDataError(true)
      // }

      function addData(chart) {
        // chart.data.labels = newRetentionData.days
        // If we are inverted funnel, invert counts
        // if (chartObj.chartSettings.isInverseFunnel) {
        //   chart.data.datasets[0].data = newRetentionData.counts.map(item => Math.abs((item - newRetentionData.counts[0]).toFixed(2)))
        // } else {
        //   chart.data.datasets[0].data = newRetentionData.counts
        // }
        // chart.update();
      }
      addData(chartRef.current);
    }
  }

  // If data changes, toggle update
  useEffect(() => {
    if (chartObj.data !== undefined && !chartObj.isError) {
      if (chartObj.data.length > 0) {
        // Check if any data is present before updating chart. Chart with no data is ugly so we dont want to show it
        setShowNoDataError(false);
        setShowSkeleton(false);
        if (chartRendered) {
          updateData(chartObj.data);
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
    // We want to invalidate and redraw the chart by force after we change showing No Data error. Otherwise rect elements will turn black for some reason
    // For future: all this behavior is caused by appending noDataChart class to .chart div.
    drawChart(true);
  }, [showNoDataError]);

  function makeColor(datasetIndex) {
    // const dataZero =
    //   chartObj.data[0][chartObj.datasetsConfigs[datasetIndex].valueField];

    const chromaGrad = chroma.scale(chartObj.chartSettings.funnelColor);

    const normalize = (value, max) => {
      if (max === 0) return 0;
      return value / max;
    };
    const gradientColors = chartObj.data.map((value) => {
      const normalizedValue = normalize(
        value[chartObj.datasetsConfigs[datasetIndex].valueField],
        80
      );
      return chromaGrad(normalizedValue).hex();
    });

    return gradientColors;
  }
  function formatValue(value, fixedAmount = 0) {
    // Format 1000 to 1 000

    const parsedValue = parseFloat(value).toFixed(fixedAmount).toString();

    const formattedDollars = parsedValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    const formattedValue = `${formattedDollars}`;

    return formattedValue;
  }
  // REQUIRED: Use this useEffect on mount since otherwise "bindto" won't find an element to bind chart to and it will just be put into the page's body.
  // This is because the DOM is not loaded yet if we call it outside of a hook, and no such element with id is yet present.
  function drawChart(forceRedraw) {
    if (document.getElementById(`funnelChart${chartID}`) !== null) {
      if (
        ((chartObj.data === undefined || chartRendered === true) &&
          !forceRedraw) ||
        chartObj.isError
      )
        return;

      // Refresh retention data to maintain fresh data all the time, otherwise if we set it once, it wont be rewritten on chart update,
      // and labels will show some kind of comparison upon new data arrive, so 100% becomes 2100% or whatever.

      if (chartRef.current !== null) {
        chartRef.current.destroy();
      }
      console.log(chartObj);
      const canvasObj = document
        .getElementById(`funnelChart${chartID}`)
        .getContext("2d");
      const chart = new Chart(canvasObj, {
        type: "funnel",
        data: {
          labels: chartObj.data.map((item) => item[chartObj.categoryField]),
          datasets: chartObj.datasetsConfigs.map((config) => ({
            ...config.config,
            data: chartObj.data
              ? chartObj.data.map((dataItem) => dataItem[config.valueField])
              : [],
            backgroundColor: brightenColor(makeColor(0)[0]),
          })),
        },
        options: {
          // Resize funnel to be the width and height of it's container
          maintainAspectRatio: false,
          // Horizontal funnel alignment = x. Vertical funnel alignment = y
          indexAxis: "y",
          plugins: {
            // Tooltip on hovering exact day
            tooltip: {
              enabled: true,
              callbacks: {
                title: (tooltipItems) => {
                  let dataToGrab = chartObj.data[tooltipItems[0].dataIndex];
                  dataToGrab =
                    dataToGrab[
                      chartObj.datasetsConfigs[tooltipItems[0].datasetIndex]
                        .secondaryValueField
                    ];
                  return `${formatValue(dataToGrab)} -  (${tooltipItems[0].label}%)`;
                },
                label: function (context) {
                  let label = context.dataset.label || "";
                  label += " ";
                  if (context.parsed.y !== null) {
                    if (
                      chartObj.chartSettings.ticks[context.dataset.yAxisID]
                        .excludeValueFromTooltip
                    ) {
                      label += `${chartObj.chartSettings.ticks[context.dataset.yAxisID].tooltipText}`;
                      return label;
                    }

                    if (chartObj.chartSettings.isInverseFunnel) {
                      label += `${chartObj.data} ${chartObj.chartSettings.ticks[context.dataset.yAxisID].tooltipText}`;
                    } else {
                      label += `${context.raw} ${chartObj.chartSettings.ticks[context.dataset.yAxisID].tooltipText}`;
                    }
                  }
                  return label;
                },
              },
            },
            datalabels: {
              display: true,
              color: "#000",
              formatter: (value, context) => {
                let preLabel = "";
                switch (context.dataIndex + 1) {
                  case 1:
                    preLabel = "1st";
                    break;
                  case 2:
                    preLabel = "2nd";
                    break;
                  case 3:
                    preLabel = "3rd";
                    break;
                  case 4:
                    preLabel = "4th";
                    break;
                  case 5:
                    preLabel = "5th";
                    break;
                  default:
                    break;
                }

                return `${preLabel} - ${chartObj.data[context.dataIndex][chartObj.categoryField]}%`;
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
    if (chartRef.current !== undefined && chartRef.current !== null) {
      // Force redraw if chart already exists
      drawChart(true);
    }
  }, [dateRange]);

  useEffect(() => {
    // Soft redraw in case it is not drawn yet since this one particular may be called because of initial retentionData setup.
    // If we remove this part of code, the graph wont render until first data refetch
    drawChart();
  }, [retentionData]);
  useEffect(() => {
    // Soft redraw in case it is not drawn yet since this one particular may be called because of initial retentionData setup.
    // If we remove this part of code, the graph wont render until first data refetch
    drawChart(true);
  }, [retentionDay0Value]);

  return (
    <div className={s.LineChartBody}>
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
              variant={"h6"}
              color={"text.secondary"}
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
              <div className={s.FunnelChartContainerOnly}>
                <canvas
                  className={`${s.chart} ${showNoDataError ? s.noDataChart : ""}`}
                  id={`funnelChart${chartID}`}
                ></canvas>
              </div>,
              showNoDataError && <div className={s.noDataLabel}>No Data</div>,
            ]}
      </div>
    </div>
  );
};

export default FunnelChart;
