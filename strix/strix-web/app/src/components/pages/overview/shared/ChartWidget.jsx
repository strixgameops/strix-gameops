import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import { Box, Skeleton, Backdrop, CircularProgress, Typography } from "@mui/material";
import Chart from "chart.js/auto";
import dayjs from "dayjs";
import chroma from "chroma-js";

const ChartWidget = memo(
  ({ config, analyticsData, variant = "card", onRendered, isLoading = false, forceRecreate }) => {
    const chartRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const resizeObserverRef = useRef(null);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [chartRendered, setChartRendered] = useState(false);

    // Format values for display (NEW)
    const formatValue = useCallback((value, format, formatPosition) => {
      if (value === null || value === undefined || isNaN(value)) return "0";
      
      const numValue = parseFloat(value);
      
      // Format based on type
      let formattedValue;
      if (format === "$") {
        if (numValue < 10) {
          formattedValue = numValue.toFixed(2);
        } else {
          formattedValue = Math.round(numValue).toLocaleString();
        }
      } else if (format === "%") {
        formattedValue = numValue < 10 ? numValue.toFixed(1) : Math.round(numValue).toString();
      } else {
        formattedValue = Math.abs(numValue).toLocaleString();
      }

      // Add format symbol
      if (format && formatPosition === "start") {
        return `${format}${formattedValue}`;
      }
      if (format && formatPosition === "end") {
        return `${formattedValue}${format}`;
      }
      return formattedValue;
    }, []);

    // ORIGINAL LOGIC - Update skeleton state based on loading and data availability
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

    // BACK TO ORIGINAL LOGIC - but with enhanced tooltips
    const createChart = useCallback(() => {
      if (!canvasRef.current || !containerRef.current) {
        console.log("Canvas or container not ready");
        return;
      }

      // Check if canvas is visible and has dimensions
      const canvasRect = canvasRef.current.getBoundingClientRect();
      if (canvasRect.width === 0 || canvasRect.height === 0) {
        console.log("Canvas not visible or has no dimensions, retrying...");
        // Retry after a short delay
        setTimeout(() => createChart(), 100);
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
      const color = deltaValue >= 0 ? "rgba(98, 95, 244, 1)" : "rgba(244, 95, 98, 1)";

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
                callbacks: {
                  // Enhanced tooltip formatting (NEW)
                  label: (context) => {
                    const value = context.parsed.y;
                    const formattedValue = formatValue(value, config.format, config.formatPosition);
                    return `${config.name}: ${formattedValue}`;
                  },
                  title: (context) => {
                    return dayjs(context[0].label).format("MMM DD, YYYY");
                  }
                },
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
    }, [analyticsData, isLoading, config.metricName, destroyChart, onRendered, formatValue, config]);

    // Setup ResizeObserver
    useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      const handleResize = (entries) => {
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

    // ORIGINAL LOGIC - Create/update chart when data changes or loading stops
    useEffect(() => {
      if (!isLoading && analyticsData?.data?.length) {
        // Add small delay for multiple charts to avoid canvas conflicts
        const timer = setTimeout(() => {
          createChart();
        }, config.chartID ? parseInt(config.chartID) * 50 : 0); // Stagger chart creation
        
        return () => clearTimeout(timer);
      } else if (isLoading || !analyticsData?.data?.length) {
        // Destroy chart when loading starts or no data
        destroyChart();
      }
    }, [analyticsData, isLoading, createChart, destroyChart, config.chartID]);

    // Force recreate chart when forceRecreate prop changes (for view mode switching)
    useEffect(() => {
      if (forceRecreate && !isLoading && analyticsData?.data?.length) {
        const timer = setTimeout(() => {
          console.log(`Force recreating chart for ${config.metricName}`);
          createChart();
        }, config.chartID ? parseInt(config.chartID) * 50 : 0);
        
        return () => clearTimeout(timer);
      }
    }, [forceRecreate, isLoading, analyticsData, createChart, config.chartID, config.metricName]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        destroyChart();
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
      };
    }, [destroyChart]);

    // ORIGINAL SKELETON LOGIC
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