import React, { useState, useEffect, useRef } from "react";
import shortid from "shortid";
import dayjs from "dayjs";
import useApi from "@strix/api";

export const useTestData = (
  test,
  selectedMetricIndex,
  game,
  branch,
  environment
) => {
  const { queryABTestData } = useApi();
  const [isLoadingData, setIsLoadingData] = useState(false);
  const dataCache = useRef({});

  const [testGraph, setTestGraph] = useState(() => ({
    chartID: shortid.generate(),
    name: "",
    metricName: "",
    data: [],
    chartSettings: {
      type: "line",
      showDelta: true,
      deltaFormat: "$",
      deltaFormatPosition: "start",
      showLegend: true,
      legendPosition: "bottom",
      ticks: {
        y: {
          customTickFormatY: true,
          customTickFormatYType: "float",
          tooltipText: " ",
          metricFormat: "",
          metricFormatPosition: "start",
        },
      },
      fullWidth: true,
    },
    categoryField: "timestamp",
    datasetsConfigs: [
      {
        config: {
          type: "line",
          yAxisID: "y",
          label: "Control group",
        },
        valueField: "control",
      },
      {
        config: {
          type: "line",
          label: "Test group",
          yAxisID: "y",
        },
        valueField: "test",
      },
    ],
    sampleSize: test.sampleSize,
    expectedResult: test.observedMetric?.expectation,
  }));

  const fetchData = async (forceRefetch = false) => {
    if (test.archived) {
      if (test.observedMetric?.[selectedMetricIndex]?.archivedData) {
        const data = JSON.parse(
          test.observedMetric[selectedMetricIndex].archivedData
        );
        setTestGraph((prev) => ({ ...prev, data }));
      }
      return;
    }

    const currentMetric = test.observedMetric?.[selectedMetricIndex];
    if (!currentMetric?.metric?.queryAnalyticEventID) return;

    const filterDate =
      currentMetric.cupedDateStart && currentMetric.cupedDateEnd
        ? [currentMetric.cupedDateStart, currentMetric.cupedDateEnd]
        : [
            dayjs.utc().subtract(30, "day").toISOString(),
            dayjs.utc().toISOString(),
          ];

    const cupedEnabled = currentMetric.cupedState;
    const cacheKey = `${selectedMetricIndex}_${filterDate[0]}_${filterDate[1]}_${cupedEnabled ? "cuped" : "regular"}`;

    if (dataCache.current[cacheKey] && !forceRefetch) {
      setTestGraph((prev) => ({ ...prev, data: dataCache.current[cacheKey] }));
      return;
    }

    setIsLoadingData(true);

    try {
      const cupedMetricObj =
        cupedEnabled && currentMetric.cupedMetric?.queryAnalyticEventID
          ? currentMetric.cupedMetric
          : null;

      const response = await queryABTestData({
        gameID: game.gameID,
        branch: branch,
        environment,
        testID: test.id,
        metricObj: currentMetric.metric,
        cupedMetricObj,
        startDate: dayjs.utc(filterDate[0]).toISOString(),
        endDate: dayjs.utc(filterDate[1]).toISOString(),
      });

      if (response.success) {
        dataCache.current[cacheKey] = response.message;
        setTestGraph((prev) => ({ ...prev, data: response.message }));
      }
    } catch (error) {
      console.error("Failed to fetch test data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMetricIndex, test.observedMetric]);

  const refetchData = () => fetchData(true);

  return { testGraph, isLoadingData, refetchData };
};
