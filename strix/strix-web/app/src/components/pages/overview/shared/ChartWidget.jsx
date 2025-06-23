import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import { Box, Skeleton, Backdrop, CircularProgress } from "@mui/material";
import Chart from "chart.js/auto";
import dayjs from "dayjs";
import chroma from "chroma-js";

const ChartWidget = memo(
  ({ config, analyticsData, variant = "card", onRendered, isLoading = false }) => {
    const chartRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const resizeObserverRef = useRef(null);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [chartRendered, setChartRendered] = useState(false);

    // Update skeleton state based on loading and data availability
    useEffect(() => {
      if (isLoading) {
        setShowSkeleton(false); // Don't show skeleton when loading (show backdrop instead)
      } else if (!analyticsData?.data?.length) {
        setShowSkeleton(true); // Show skeleton when no data and not loading
      } else {
        setShowSkeleton(false); // Hide skeleton when we have data
      }
    }, [analyticsData, isLoading]);

    const destroyChart = useCallback(() => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
        setChartRendered(false);
      }
    }, []);

    const createChart = useCallback(() => {
      if (!canvasRef.current || !containerRef.current) {
        console.log("Canvas or container not ready");
        return;
      }

      // Only create chart if we have real data and not loading
      if (!analyticsData?.data?.length || isLoading) {
        console.log("No data available or still loading, skipping chart creation");
        return;
      }

      destroyChart(); // Clean up existing chart

      const data = analyticsData.data;
      const deltaValue = analyticsData?.deltaValue || 0;

      const ctx = canvasRef.current.getContext("2d");
      const color =
        deltaValue >= 0 ? "rgba(98, 95, 244, 1)" : "rgba(244, 95, 98, 1)";

      try {
        const chart = new Chart(ctx, {
          type: "line",
          data: {
            labels: data.map((item) => item.timestamp),
            datasets: [
              {
                data: data.map((item) => item.value),
                backgroundColor: chroma(color).alpha(0.6).hex(),
                borderColor: color,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0.4,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false },
            scales: {
              x: { display: false },
              y: { display: false, beginAtZero: false },
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: true,
                intersect: false,
              },
              datalabels: {
                display: false,
              },
            },
            animation: { duration: 300 },
            elements: { point: { radius: 0 } },
          },
        });

        chartRef.current = chart;
        setChartRendered(true);
        onRendered?.();
        console.log(`Chart created successfully for ${config.metricName}`);
      } catch (error) {
        console.error("Chart creation failed:", error);
        destroyChart();
      }
    }, [analyticsData, isLoading, config.metricName, destroyChart, onRendered]);

    // Setup ResizeObserver
    useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      const handleResize = (entries) => {
        const entry = entries[0];
        const { width, height } = entry.contentRect;
        // Could handle resize logic here if needed
      };

      resizeObserverRef.current = new ResizeObserver(handleResize);
      resizeObserverRef.current.observe(containerRef.current);

      return () => {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
      };
    }, []);

    // Create/update chart when data changes or loading stops
    useEffect(() => {
      if (!isLoading && analyticsData?.data?.length) {
        createChart();
      } else if (isLoading || !analyticsData?.data?.length) {
        // Destroy chart when loading starts or no data
        destroyChart();
      }
    }, [analyticsData, isLoading, createChart, destroyChart]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        destroyChart();
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
      };
    }, [destroyChart]);

    if (showSkeleton) {
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Skeleton variant="rectangular" width="100%" height="100%" />
        </Box>
      );
    }

    return (
      <Box
        ref={containerRef}
        sx={{
          width: "100%",
          height: "100%",
          position: "relative",
          minHeight: 60,
          "& canvas": {
            width: "100% !important",
            height: "100% !important",
            display: "block !important",
          },
        }}
      >
        <Backdrop
          sx={{
            color: "#fff",
            zIndex: 2,
            position: "absolute",
            borderRadius: "0.5rem",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
          }}
          open={isLoading}
        >
          <CircularProgress color="inherit" size={24} />
        </Backdrop>

        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            opacity: isLoading ? 0.3 : 1,
            transition: "opacity 0.2s ease-in-out",
          }}
        />
      </Box>
    );
  }
);

ChartWidget.displayName = "ChartWidget";

export default ChartWidget;