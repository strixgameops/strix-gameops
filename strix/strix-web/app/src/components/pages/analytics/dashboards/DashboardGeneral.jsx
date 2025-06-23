import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import s from "./dashboard.module.css";
import sTable from "./charts/css/offersSalesAndProfileDataTable.module.css";

import LineChart from "./charts/LineChart";
import CloseIcon from "@mui/icons-material/Close";
import ElementItem from "./charts/profileAnalytics/ElementItem";
import { InputAdornment } from "@mui/material";
import UnfoldLess from "@mui/icons-material/UnfoldLess";
import UnfoldMore from "@mui/icons-material/UnfoldMore";
import { Button, Typography } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";
import IconButton from "@mui/material/IconButton";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import OutlinedInput from "@mui/material/OutlinedInput";
import Box from "@mui/material/Box";

import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import chroma from "chroma-js";
import shortid from "shortid";
import Checkbox from "@mui/material/Checkbox";

import useApi from "@strix/api";
import { useEffectOnce } from "react-use";

import { Helmet } from "react-helmet";
import titles from "titles";
import DataTable from "./charts/realMoney/DataTable";

import BlankOfferIcon from "./charts/realMoney/treasure-chest.svg?react";
import BlankEntityIcon from "./charts/realMoney/entityBasic.svg?react";
import { customAlphabet } from "nanoid";

import InstallsMapChart from "./charts/userAcquisition/InstallsMapChart";

const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);
const DashboardGeneral = ({
  defaultChartObj,
  filterDate,
  filterSegments,
  game,
  branch,
  environment,
  includeBranchInAnalytics,
  includeEnvironmentInAnalytics,
}) => {
  const {
    getDAU,
    getRevenue,
    getCumulativeARPU,
    getARPU,
    getARPPU,
    getRetention,
    getNewUsers,
    getCombinedMetricsByCountry,
  } = useApi();

  const isFetchingData = useRef(false);

  const [dashboardSettings, setDashboardSettings] = useState({
    charts: [
      // Active Users
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "DAU",
        metricName: "dau",
        data: {},
        chartSettings: {
          type: "line",
          showDelta: false,
          deltaFormat: "$",
          deltaFormatPosition: "start",
          showLegend: true,
          ticks: {
            y: {
              customTickFormatY: false,
              customTickFormatYType: "",
              tooltipText: " ",
              metricFormat: "",
              metricFormatPosition: "start",
            },
          },
          fullWidth: false,
          customWidth: "50%",
          customHeight: 350,
        },
        categoryField: "timestamp",
        datasetsConfigs: [
          {
            config: {
              type: "line",
              label: "Daily Active Users",
              yAxisID: "y",
              borderColor: "#CD6F00",
              backgroundColor: "#CD6F00",
              borderWidth: 3,
              pointRadius: 2,
              pointHoverRadius: 5,

              stack: "2",
            },
            valueField: "value",
          },
        ],
      },
      // Revenue
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "Revenue",
        metricName: "revenue",
        data: {},
        chartSettings: {
          type: "line",
          showDelta: false,
          deltaFormat: "$",
          deltaFormatPosition: "start",
          showLegend: true,
          ticks: {
            y: {
              customTickFormatY: true,
              customTickFormatYType: "money",
              tooltipText: " ",
              metricFormat: "$",
              metricFormatPosition: "start",
            },
          },
          fullWidth: false,
          customWidth: "50%",
          customHeight: 350,
        },
        categoryField: "timestamp",
        datasetsConfigs: [
          {
            config: {
              type: "line",
              label: "Money",
              yAxisID: "y",
              borderColor: "#CD6F00",
              backgroundColor: "#CD6F00",
              borderWidth: 2.5,
              pointRadius: 2,
              pointHoverRadius: 5,

              stack: "2",
            },
            valueField: "revenue",
          },
        ],
      },
      // ARPU
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "ARPU & ARPPU",
        metricName: "ARPUandARPPU",
        data: {},
        chartSettings: {
          type: "line",
          showDelta: false,
          deltaFormat: "$",
          deltaFormatPosition: "start",
          showLegend: true,
          ticks: {
            y: {
              customTickFormatY: true,
              customTickFormatYType: "money",
              tooltipText: " ",
              metricFormat: "$",
              metricFormatPosition: "start",
            },
            y1: {
              customTickFormatY: true,
              customTickFormatYType: "money",
              tooltipText: " ",
              metricFormat: "$",
              metricFormatPosition: "start",
            },
          },
          fullWidth: false,
          customWidth: "50%",
          customHeight: 350,
        },
        categoryField: "timestamp",
        datasetsConfigs: [
          {
            config: {
              type: "line",
              yAxisID: "y1",
              label: "ARPU",
              borderColor: "#CD6F00",
              backgroundColor: "#CD6F00",
            },
            valueField: "arpu",
          },
          {
            config: {
              type: "line",
              label: "ARPPU",
              yAxisID: "y",
              borderColor: "#64511F",
              backgroundColor: "#64511F",
            },
            valueField: "arppu",
          },
        ],
      },
      // Cumulative ARPU
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "Cumulative ARPU",
        metricName: "cumulativearpu",
        data: {},
        chartSettings: {
          type: "line",
          showDelta: false,
          deltaFormat: "$",
          deltaFormatPosition: "start",
          showLegend: true,
          ticks: {
            y: {
              customTickFormatY: true,
              customTickFormatYType: "money",
              tooltipText: " ",
              metricFormat: "$",
              metricFormatPosition: "start",
            },
          },
          fullWidth: false,
          customWidth: "50%",
          customHeight: 350,
        },
        categoryField: "timestamp",
        datasetsConfigs: [
          {
            config: {
              type: "line",
              label: "Cumulative ARPU",
              yAxisID: "y",
              borderColor: "#CD6F00",
              backgroundColor: "#CD6F00",
              borderWidth: 3,
              pointRadius: 2,
              pointHoverRadius: 5,

              stack: "2",
            },
            valueField: "cumulativeARPU",
          },
        ],
      },
      // Retention
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "Retention",
        metricName: "retention",
        data: {},
        chartSettings: {
          type: "line",
          showDelta: false,
          deltaFormat: "$",
          deltaFormatPosition: "start",
          showLegend: true,
          ticks: {
            y: {
              customTickFormatY: false,
              customTickFormatYType: "",
              tooltipText: " ",
              metricFormat: "",
              metricFormatPosition: "start",
            },
          },
          fullWidth: false,
          customWidth: "50%",
          customHeight: 350,
        },
        categoryField: "timestamp",
        datasetsConfigs: [
          {
            config: {
              type: "line",
              label: "Users",
              yAxisID: "y",
              borderColor: "#CD6F00",
              backgroundColor: "#CD6F00",
              borderWidth: 3,
              pointRadius: 2,
              pointHoverRadius: 5,

              stack: "2",
            },
            valueField: "retention",
          },
        ],
      },
      // New Users
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "New Users",
        metricName: "newusers",
        data: {},
        chartSettings: {
          type: "line",
          showDelta: false,
          deltaFormat: "$",
          deltaFormatPosition: "start",
          showLegend: true,
          ticks: {
            y: {
              customTickFormatY: false,
              customTickFormatYType: "",
              tooltipText: " ",
              metricFormat: "",
              metricFormatPosition: "start",
            },
          },
          fullWidth: false,
          customWidth: "50%",
          customHeight: 350,
        },
        categoryField: "timestamp",
        datasetsConfigs: [
          {
            config: {
              type: "line",
              label: "New Users",
              yAxisID: "y",
              borderColor: "#CD6F00",
              backgroundColor: "#CD6F00",
              borderWidth: 3,
              pointRadius: 2,
              pointHoverRadius: 5,

              stack: "2",
            },
            valueField: "value",
          },
        ],
      },

      // Installs map
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "Installs & Retention by Countries",
        metricName: "usersMap",

        data: {
          // data: [
          //   {
          //     countryName: "United States",
          //     installs: 12121,
          //     d1: 12,
          //     d3: 7,
          //     d7: 1
          //   },
          //   {
          //     countryName: "Canada",
          //     installs: 231
          //   },
          //   {
          //     countryName: "Germany",
          //     installs: 566,
          //   },
          // ],
        },

        categoryField: "timestamp",
        datasetsConfigs: [
          {
            config: {
              type: "line",
              label: "New Users",
              yAxisID: "y",
              borderColor: "#CD6F00",
              backgroundColor: "#CD6F00",
              borderWidth: 3,
              pointRadius: 2,
              pointHoverRadius: 5,

              stack: "2",
            },
            valueField: "value",
          },
        ],
      },
    ],
  });
  async function fetchDAU() {
    let newData;
    let response;
    let isError;
    setIsLoading_DAU(true);
    response = await getDAU({
      gameID: game.gameID,
      branch: branch,
      includeBranchInAnalytics: includeBranchInAnalytics,
      includeEnvironmentInAnalytics: includeEnvironmentInAnalytics,
      filterDate: [
        filterDate.startDate.toISOString(),
        filterDate.endDate.toISOString(),
      ],
      environment: environment,
      filterSegments: filterSegments.map((segment) => segment.segmentID),
    });
    isError = !response.success;
    if (isError) {
      newData = {};
    } else {
      newData = { data: response.message };
    }
    setDashboardSettings((prevDashboards) => {
      return {
        ...prevDashboards,
        charts: prevDashboards.charts.map((chart) => {
          if (chart.metricName === "dau") {
            return {
              ...chart,
              data: newData,
            };
          }
          return chart;
        }),
      };
    });
    setIsLoading_DAU(false);
  }

  async function fetchRevenue() {
    let newData;
    let response;
    let isError;
    setIsLoading_Revenue(true);
    response = await getRevenue({
      gameID: game.gameID,
      branch: branch,
      includeBranchInAnalytics: includeBranchInAnalytics,
      includeEnvironmentInAnalytics: includeEnvironmentInAnalytics,
      filterDate: [
        filterDate.startDate.toISOString(),
        filterDate.endDate.toISOString(),
      ],
      environment: environment,
      filterSegments: filterSegments.map((segment) => segment.segmentID),
    });
    isError = !response.success;
    if (isError) {
      newData = {};
    } else {
      newData = response.message;
    }
    setDashboardSettings((prevDashboards) => {
      return {
        ...prevDashboards,
        charts: prevDashboards.charts.map((chart) => {
          if (chart.metricName === "revenue") {
            return {
              ...chart,
              data: newData,
            };
          }
          return chart;
        }),
      };
    });
    setIsLoading_Revenue(false);
  }

  async function fetchARPU() {
    let newData;
    let response;
    let response1;
    let isError;
    setIsLoading_ARPU(true);
    response = await getARPU({
      gameID: game.gameID,
      branch: branch,
      includeBranchInAnalytics: includeBranchInAnalytics,
      includeEnvironmentInAnalytics: includeEnvironmentInAnalytics,
      filterDate: [
        filterDate.startDate.toISOString(),
        filterDate.endDate.toISOString(),
      ],
      environment: environment,
      filterSegments: filterSegments.map((segment) => segment.segmentID),
    });
    response1 = await getARPPU({
      gameID: game.gameID,
      branch: branch,
      includeBranchInAnalytics: includeBranchInAnalytics,
      includeEnvironmentInAnalytics: includeEnvironmentInAnalytics,
      filterDate: [
        filterDate.startDate.toISOString(),
        filterDate.endDate.toISOString(),
      ],
      environment: environment,
      filterSegments: filterSegments.map((segment) => segment.segmentID),
    });

    const mergedData = mergeDataArrays(response.message, response1.message);
    isError = !response.success && !response1.success;
    if (isError) {
      newData = {};
    } else {
      newData = { data: mergedData };
    }
    setDashboardSettings((prevDashboards) => {
      return {
        ...prevDashboards,
        charts: prevDashboards.charts.map((chart) => {
          if (chart.metricName === "ARPUandARPPU") {
            return {
              ...chart,
              data: newData,
            };
          }
          return chart;
        }),
      };
    });
    setIsLoading_ARPU(false);

    function mergeDataArrays(response, response1) {
      const map1 = new Map(
        response.map(({ timestamp, value }) => [timestamp, value])
      );
      const map2 = new Map(
        response1.map(({ timestamp, value }) => [timestamp, value])
      );

      const merged = [];
      const uniqueTimestamps = new Set([...map1.keys(), ...map2.keys()]);

      uniqueTimestamps.forEach((timestamp) => {
        merged.push({
          timestamp,
          arpu: map1.get(timestamp) || 0,
          arppu: map2.get(timestamp) || 0,
        });
      });

      merged.sort((a, b) => a[0] - b[0]);

      return merged;
    }
  }

  async function fetchCumulativeARPU() {
    let newData;
    let response;
    let isError;
    setIsLoading_CumulativeARPU(true);
    response = await getCumulativeARPU({
      gameID: game.gameID,
      branch: branch,
      includeBranchInAnalytics: includeBranchInAnalytics,
      includeEnvironmentInAnalytics: includeEnvironmentInAnalytics,
      filterDate: [
        filterDate.startDate.toISOString(),
        filterDate.endDate.toISOString(),
      ],
      environment: environment,
      filterSegments: filterSegments.map((segment) => segment.segmentID),
    });
    isError = !response.success;
    if (isError) {
      newData = {};
    } else {
      newData = { data: response.message };
    }
    setDashboardSettings((prevDashboards) => {
      return {
        ...prevDashboards,
        charts: prevDashboards.charts.map((chart) => {
          if (chart.metricName === "cumulativearpu") {
            return {
              ...chart,
              data: newData,
            };
          }
          return chart;
        }),
      };
    });
    setIsLoading_CumulativeARPU(false);
  }

  async function fetchRetention() {
    let newData;
    let response;
    let isError;
    setIsLoading_Retention(true);
    response = await getRetention({
      gameID: game.gameID,
      branch: branch,
      includeBranchInAnalytics: includeBranchInAnalytics,
      includeEnvironmentInAnalytics: includeEnvironmentInAnalytics,
      filterDate: [
        filterDate.startDate.toISOString(),
        filterDate.endDate.toISOString(),
      ],
      environment: environment,
      filterSegments: filterSegments.map((segment) => segment.segmentID),
    });
    isError = !response.success;
    if (isError) {
      newData = {};
    } else {
      newData = { data: response.message };
    }
    setDashboardSettings((prevDashboards) => {
      return {
        ...prevDashboards,
        charts: prevDashboards.charts.map((chart) => {
          if (chart.metricName === "retention") {
            return {
              ...chart,
              data: newData,
            };
          }
          return chart;
        }),
      };
    });
    setIsLoading_Retention(false);
  }

  async function fetchNewUsers() {
    let newData;
    let response;
    let isError;
    setIsLoading_NewUsers(true);
    response = await getNewUsers({
      gameID: game.gameID,
      branch: branch,
      includeBranchInAnalytics: includeBranchInAnalytics,
      includeEnvironmentInAnalytics: includeEnvironmentInAnalytics,
      filterDate: [
        filterDate.startDate.toISOString(),
        filterDate.endDate.toISOString(),
      ],
      environment: environment,
      filterSegments: filterSegments.map((segment) => segment.segmentID),
    });
    isError = !response.success;
    if (isError) {
      newData = {};
    } else {
      newData = { data: response.message };
    }
    setDashboardSettings((prevDashboards) => {
      return {
        ...prevDashboards,
        charts: prevDashboards.charts.map((chart) => {
          if (chart.metricName === "newusers") {
            return {
              ...chart,
              data: newData,
            };
          }
          return chart;
        }),
      };
    });
    setIsLoading_NewUsers(false);
  }

  async function fetchCombinedMetricsByCountry() {
    let newData;
    let response;
    let isError;
    setIsLoading_CombinedMetricsByCountry(true);
    response = await getCombinedMetricsByCountry({
      gameID: game.gameID,
      branch: branch,
      includeBranchInAnalytics: includeBranchInAnalytics,
      includeEnvironmentInAnalytics: includeEnvironmentInAnalytics,
      filterDate: [
        filterDate.startDate.toISOString(),
        filterDate.endDate.toISOString(),
      ],
      environment: environment,
      filterSegments: filterSegments.map((segment) => segment.segmentID),
    });
    isError = !response.success;
    if (isError) {
      newData = {};
    } else {
      newData = { data: response.message };
    }
    setDashboardSettings((prevDashboards) => {
      return {
        ...prevDashboards,
        charts: prevDashboards.charts.map((chart) => {
          if (chart.metricName === "usersMap") {
            return {
              ...chart,
              data: newData,
            };
          }
          return chart;
        }),
      };
    });
    setIsLoading_CombinedMetricsByCountry(false);
  }

  const [isLoading_DAU, setIsLoading_DAU] = useState(false);
  const [isLoading_Revenue, setIsLoading_Revenue] = useState(false);
  const [isLoading_ARPU, setIsLoading_ARPU] = useState(false);
  const [isLoading_CumulativeARPU, setIsLoading_CumulativeARPU] =
    useState(false);
  const [isLoading_Retention, setIsLoading_Retention] = useState(false);
  const [isLoading_NewUsers, setIsLoading_NewUsers] = useState(false);
  const [
    isLoading_CombinedMetricsByCountry,
    setIsLoading_CombinedMetricsByCountry,
  ] = useState(false);

  async function fetchAnalyticsData() {
    if (isFetchingData.current == true) return;
    isFetchingData.current = true;

    try {
      await Promise.all([
        fetchCombinedMetricsByCountry(),
        fetchDAU(),
        fetchRevenue(),
        fetchARPU(),
        fetchCumulativeARPU(),
        fetchRetention(),
        fetchNewUsers(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      isFetchingData.current = false;
    } finally {
      isFetchingData.current = false;
    }
  }

  const lastDateFilter = useRef(null);
  const lastSegmentsFilter = useRef(null);

  const isEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  };

  useEffect(() => {
    let hasChanged = false;
    if (!filterDate.startDate || !filterDate.endDate) return;
    if (!isEqual(lastDateFilter.current, filterDate)) {
      if (lastDateFilter.current !== null) {
        hasChanged = true;
      }
      lastDateFilter.current = filterDate;
    }

    if (!isEqual(lastSegmentsFilter.current, filterSegments)) {
      if (lastSegmentsFilter.current !== null) {
        hasChanged = true;
      }
      lastSegmentsFilter.current = filterSegments;
    }
    console.log(
      "Filters changed",
      filterDate,
      filterSegments,
      lastDateFilter.current
    );

    if (hasChanged) {
      console.log("Filters changed. Fetching new data...");
      async function doFetch() {
        isFetchingData.current = false;
        await fetchAnalyticsData();
      }
      doFetch();
    }
  }, [filterDate, filterSegments]);
  useEffect(() => {
    fetchAnalyticsData();
  }, []);
  useEffect(() => {
    fetchAnalyticsData();
  }, [includeBranchInAnalytics, includeEnvironmentInAnalytics]);

  return (
    <div className={s.dashboardContent}>
      <Helmet>
        <title>{titles.d_general}</title>
      </Helmet>

      <InstallsMapChart
        isLoading={isLoading_CombinedMetricsByCountry}
        chartObj={dashboardSettings.charts[6]}
        dateRange={filterDate}
        gameID={game.gameID}
        branch={branch}
      />

      <div className={s.userMetrics}>
        <LineChart
          isLoading={isLoading_DAU}
          chartObj={dashboardSettings.charts[0]}
          dateRange={filterDate}
          gameID={game.gameID}
          branch={branch}
        />

        <LineChart
          isLoading={isLoading_NewUsers}
          chartObj={dashboardSettings.charts[5]}
          dateRange={filterDate}
          gameID={game.gameID}
          branch={branch}
        />
      </div>

      <div className={s.userMetrics}>
        <LineChart
          isLoading={isLoading_ARPU}
          chartObj={dashboardSettings.charts[2]}
          dateRange={filterDate}
          gameID={game.gameID}
          branch={branch}
        />
        <LineChart
          isLoading={isLoading_CumulativeARPU}
          chartObj={dashboardSettings.charts[3]}
          dateRange={filterDate}
          gameID={game.gameID}
          branch={branch}
        />
      </div>

      <div className={s.userMetrics}>
        <LineChart
          isLoading={isLoading_Retention}
          chartObj={dashboardSettings.charts[4]}
          dateRange={filterDate}
          gameID={game.gameID}
          branch={branch}
        />

        <LineChart
          isLoading={isLoading_Revenue}
          chartObj={dashboardSettings.charts[1]}
          dateRange={filterDate}
          gameID={game.gameID}
          branch={branch}
        />
      </div>
    </div>
  );
};

export default DashboardGeneral;
