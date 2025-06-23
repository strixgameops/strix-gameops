import React, { useEffect, useState, useRef, useCallback } from "react";
import Skeleton from "@mui/material/Skeleton";
import MuiTooltip from "@mui/material/Tooltip";
import s from "./css/segmentChart.module.css";

// Date modules
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";

// Chart.js and plugins
import { Tooltip as ChartTooltip } from "chart.js";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

// For styling and theming
import chroma from "chroma-js";
import { Typography } from "@mui/material";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import isEqual from "lodash/isEqual";
import ProfileCompositionStaticSegmentBuilder from "./ProfileCompositionStaticSegmentBuilder";

// Extend dayjs with utc support
dayjs.extend(utc);

// Register Chart plugins
Chart.register(ChartDataLabels, ChartTooltip);

const SegmentChart = ({ chartObj }) => {
  const theme = useTheme();
  const [chartRendered, setChartRendered] = useState(false);
  const [currentGranularity, setCurrentGranularity] = useState(null);
  const currentGranularityRef = useRef(currentGranularity);
  currentGranularityRef.current = currentGranularity;
  const chartRef = useRef(null);

  // Formats a number with spaces for thousands
  const formatPlayerCount = useCallback((value, fixedAmount = 0) => {
    const parsedValue = parseFloat(value).toFixed(fixedAmount).toString();
    return parsedValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }, []);

  // Prepare chart data from chartObj
  const getChartData = useCallback(() => {
    let categories = chartObj.categories
      ? [...chartObj.categories.map((c) => c.name)]
      : [];
    let hiddenIndices = new Set(
      chartObj.categories.filter((c) => c.isHidden).map((c, i) => i) || []
    );

    let filteredLabels = [];
    let keptIndices = [];

    categories.forEach((category, index) => {
      if (!hiddenIndices.has(index)) {
        filteredLabels.push(category);
        keptIndices.push(index);
      }
    });

    const datasets = chartObj.metrics.map((metric) => ({
      ...metric.datasetConfig.config,
      data: metric.data
        ? metric.data.data.filter((_, index) => keptIndices.includes(index))
        : [],
    }));

    return { labels: filteredLabels, datasets };
  }, [chartObj]);

  // Update an already rendered chart with new data

  const prevDataRef = useRef(null);

  const updateData = useCallback(() => {
    if (chartRef.current) {
      const newData = getChartData();

      if (prevDataRef.current && isEqual(prevDataRef.current, newData)) {
        return;
      }

      prevDataRef.current = newData;

      chartRef.current.data.labels = newData.labels;
      chartRef.current.data.datasets = newData.datasets;
      chartRef.current.update();
    }
  }, [getChartData]);

  const checkAnyDataExist = useCallback(() => {
    return chartObj.metrics.some(
      (metric) => metric.data && metric.data.data.length > 0
    );
  }, [chartObj]);

  const checkAnyMetricsExist = useCallback(() => {
    return chartObj.metrics.length > 0;
  }, [chartObj]);

  // Draw or redraw the chart
  const drawChart = useCallback(
    (forceRedraw = false) => {
      const canvasElement = document.getElementById(
        `universalChart${chartObj.chartID}`
      );
      if (!canvasElement) return;

      if (chartRef.current) {
        chartRef.current.destroy();
      }
      if (
        chartObj.metrics[0]?.data?.data.some(
          (dataItem) => dataItem === undefined
        )
      )
        return;

      const ctx = canvasElement.getContext("2d");
      const chartInstance = new Chart(ctx, {
        type: chartObj.chartSettings.type,
        data: getChartData(),
        options: {
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
            },
            datalabels: {
              display: true,
              font: { size: 18 },
              ...(theme.palette.mode === "light"
                ? { color: theme.palette.text.primary }
                : {
                    color: theme.palette.text.primary,
                    textStrokeColor: "#000000",
                    textStrokeWidth: 1,
                    textShadowBlur: 25,
                    textShadowColor: "#000000",
                  }),
              formatter: (value, context) => {
                const dataArr = context.chart.data.datasets[0].data;
                const sum = dataArr.reduce((acc, curr) => acc + curr, 0);
                const percentage = ((value * 100) / sum).toFixed(2) + "%";
                const label = context.chart.data.labels[context.dataIndex];
                return `${label}\n${formatPlayerCount(value)}\n${percentage}`;
              },
            },
          },
        },
      });
      setChartRendered(true);
      chartRef.current = chartInstance;
    },
    [chartObj, getChartData, theme, formatPlayerCount]
  );

  // Update chart on chartObj changes
  useEffect(() => {
    if (checkAnyMetricsExist()) {
      if (checkAnyDataExist()) {
        if (chartRendered) {
          updateData();
        } else {
          drawChart();
        }
        return;
      }
    }
  }, [chartObj, checkAnyMetricsExist, checkAnyDataExist, chartRendered]);

  return (
    <div
      className={
        chartObj.chartSettings.fullWidth
          ? `${s.UniversalChartBody} ${s.UniversalChartBodyFullWidth}`
          : s.UniversalChartBody
      }
      style={
        {
          // width: chartObj.chartSettings.customWidth || "",
          // height: chartObj.chartSettings.customHeight || "",
        }
      }
    >
      <div
        id={`universalChart${chartObj.chartID}-body`}
        className={s.UniversalChart}
      >
      
        <div
          className={s.ChartContainerOnly}
          style={{
            opacity:
              chartObj.metrics[0]?.data === undefined ||
              (chartObj.metrics[0]?.data?.data[0] === 0 &&
                chartObj.metrics[0]?.data?.data[1] === 0)
                ? 0
                : 1,
          }}
        >
          <canvas
            className={`${s.chart}`}
            id={`universalChart${chartObj.chartID}`}
          />
        </div>
      </div>
    </div>
  );
};

export default SegmentChart;
