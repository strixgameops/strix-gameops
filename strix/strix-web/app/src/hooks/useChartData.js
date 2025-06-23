import { useState, useCallback, useMemo, useRef } from "react";
import { useGame } from "../contexts/GameContext";

const DEFAULT_CHART_CONFIG = {
  chartID: "0",
  name: "ChartName",
  metricName: "metricName",
  metricFormat: "",
  metricFormatPosition: "start",
  data: {},
  chartSettings: {
    type: "line",
    tooltipText: " default tooltip text",
    showDelta: true,
    showLegend: false,
    legendPosition: "top",
    showDataLabels: false,
    customTickFormatY: false,
    customTickFormatYType: "",
  },
  categoryField: "timestamp",
  valueFields: ["value"],
};

export const useChartData = () => {
  const { game } = useGame();
  const lastUpdateRef = useRef({});

  const createChartConfig = useCallback(
    (overrides) => ({
      ...DEFAULT_CHART_CONFIG,
      ...overrides,
      chartSettings: {
        ...DEFAULT_CHART_CONFIG.chartSettings,
        ...overrides.chartSettings,
      },
    }),
    []
  );

  const initialDashboardConfig = useMemo(
    () => ({
      charts: [
        createChartConfig({
          chartID: "revenue",
          name: "Gross Revenue",
          metricName: "revenue",
          metricFormat: "$",
          metricFormatPosition: "start",
          chartSettings: {
            type: "sparkline",
            tooltipText: " ",
            showDelta: true,
            showLegend: false,
            customTickFormatY: true,
            customTickFormatYType: "money",
          },
        }),
        createChartConfig({
          chartID: "retention",
          name: "Retention",
          metricName: "retention",
          chartSettings: {
            type: "sparkline",
            tooltipText: " players",
            showDelta: false,
            showLegend: false,
          },
        }),
        createChartConfig({
          chartID: "newusers",
          name: "New Users",
          metricName: "newusers",
          chartSettings: {
            type: "sparkline",
            tooltipText: " players",
            showDelta: true,
            showLegend: false,
          },
        }),
        createChartConfig({
          chartID: "dau",
          name: "Active Users",
          metricName: "dau",
          chartSettings: {
            type: "sparkline",
            tooltipText: " players",
            showDelta: true,
            showLegend: false,
          },
        }),
      ],
    }),
    [createChartConfig]
  );

  const [dashboardSettings, setDashboardSettings] = useState(
    initialDashboardConfig
  );

  const extractAnalyticsData = useCallback(
    (statsData, viewMode, selectedItem) => {
      if (!statsData?.data) return null;

      let targetData = statsData.data.overall;
      let deltas = statsData.data.overallDelta || {};

      // Extract specific game or studio data
      if (viewMode === "studio" && game?.gameID && statsData.data.games?.length > 0) {
        const gameData = statsData.data.games.find(
          (item) => item.gameID === game.gameID
        );

        if (gameData) {
          targetData = gameData.data.map((dataItem) => ({
            timestamp: dataItem.dau?.timestamp || dataItem.timestamp,
            dau: dataItem.dau?.value || dataItem.dau,
            retention: dataItem.retention?.value || dataItem.retention,
            newUsers: dataItem.newUsers?.value || dataItem.newUsers,
            revenue: dataItem.revenue?.value || dataItem.revenue,
          }));

          deltas = {
            deltaDau: gameData.deltaDau,
            deltaRevenue: gameData.deltaRevenue,
            deltaNewUsers: gameData.deltaNewUsers,
            deltaRetention: gameData.deltaRetention,
          };
        }
      } else if (viewMode === "publisher" && selectedItem?.studioID && statsData.data.studios?.length > 0) {
        const studioData = statsData.data.studios.find(
          (item) => item.studioID === selectedItem.studioID
        );

        if (studioData) {
          targetData = studioData.data.map((dataItem) => ({
            timestamp: dataItem.dau?.timestamp || dataItem.timestamp,
            dau: dataItem.dau?.value || dataItem.dau,
            retention: dataItem.retention?.value || dataItem.retention,
            newUsers: dataItem.newUsers?.value || dataItem.newUsers,
            revenue: dataItem.revenue?.value || dataItem.revenue,
          }));

          deltas = {
            deltaDau: studioData.deltaDau,
            deltaRevenue: studioData.deltaRevenue,
            deltaNewUsers: studioData.deltaNewUsers,
            deltaRetention: studioData.deltaRetention,
          };
        }
      }

      return { targetData, deltas };
    },
    [game]
  );

  const transformDataForChart = useCallback((targetData, metricName, deltaKey, deltas) => {
    if (!Array.isArray(targetData)) return { data: [], deltaValue: 0 };

    return {
      data: targetData.map((dataItem) => ({
        timestamp: dataItem.timestamp,
        value: parseInt(dataItem[metricName] || 0, 10),
      })),
      deltaValue: deltas[deltaKey] || 0,
    };
  }, []);

  const updateChartsData = useCallback(
    (statsData, viewMode, selectedItem) => {
      const extractedData = extractAnalyticsData(statsData, viewMode, selectedItem);
      if (!extractedData) return;

      const { targetData, deltas } = extractedData;
      
      // Prevent unnecessary updates
      const updateKey = `${viewMode}_${selectedItem?.studioID || 'all'}_${game?.gameID || 'all'}`;
      const dataSignature = JSON.stringify({ targetData: targetData?.slice(0, 3), deltas });
      
      if (lastUpdateRef.current[updateKey] === dataSignature) return;
      lastUpdateRef.current[updateKey] = dataSignature;

      setDashboardSettings((prevSettings) => ({
        ...prevSettings,
        charts: prevSettings.charts.map((chart) => {
          const getChartData = (metricName, deltaKey) =>
            transformDataForChart(targetData, metricName, deltaKey, deltas);

          const updateMap = {
            newusers: () => getChartData("newUsers", "deltaNewUsers"),
            dau: () => getChartData("dau", "deltaDau"),
            revenue: () => getChartData("revenue", "deltaRevenue"),
            retention: () => getChartData("retention", "deltaRetention"),
          };

          const updateFn = updateMap[chart.metricName];
          return updateFn ? { ...chart, data: updateFn() } : chart;
        }),
      }));
    },
    [extractAnalyticsData, transformDataForChart, game]
  );

  const getSideChartsTitle = useCallback((viewMode, selectedStudio, game) => {
    if (viewMode === "publisher") {
      return selectedStudio ? selectedStudio.studioName : "All studios";
    }
    return game ? game.gameName : "All games";
  }, []);

  const getSideChartsBackground = useCallback(
    (viewMode, selectedStudio, game) => {
      if (viewMode === "publisher") {
        return selectedStudio?.studioIcon;
      }
      return game?.gameIcon;
    },
    []
  );

  return {
    dashboardSettings,
    updateChartsData,
    getSideChartsTitle,
    getSideChartsBackground,
    createChartConfig,
  };
};