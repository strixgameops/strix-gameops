import React, { useState, useRef, useEffect } from "react";
import s from "./chartBuilder.module.css";
import UniversalChart from "./UniversalChart";
import { useBranch, useGame } from "@strix/gameContext";

// MUI
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";

import { Divider, Box } from "@mui/material";
import ListItem from "@mui/material/ListItem";
import List from "@mui/material/List";
import Chip from "@mui/material/Chip";
import Input from "@mui/material/Input";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { DateRangePicker } from "react-date-range";
import { addDays } from "date-fns";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";

// Filter by segments
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import { useTheme } from "@mui/material/styles";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";

import LoadingButton from "@mui/lab/LoadingButton";

import useApi from "@strix/api";

import shortid from "shortid";

import dayjs from "dayjs";

import { useLocation } from "react-router-dom";

import EventSelector from "./EventSelector";

import DataTable from "../../dashboards/charts/realMoney/DataTable";
import chroma from "chroma-js";

import SegmentsPicker from "shared/segmentsWidget/SegmentsPickerWidget.jsx";
import DatePicker from "shared/datePicker/DatePickerWidget.jsx";

import { useEffectOnce } from "react-use";
import EventConfig from "./EventConfig";

const ChartBuilder = ({
  closeBuilder,
  onChartSaved,
  dashboards,
  addNewDashboard,
}) => {
  const {
    getAllSegmentsForAnalyticsFilter,
    getEntitiesIDs,
    getAnalyticsEvents,
    getAllAnalyticsEvents,
    queryUniversalAnalytics,
    getOffersNames,
    getCurrencyEntities,
    getCustomDashboardChart,
  } = useApi();
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const theme = useTheme();

  const location = useLocation();

  const [isFetchingData, setIsFetchingData] = useState(false);

  const [chartWasSaved, setChartWasSaved] = useState(false);
  const [chartIsSaving, setChartIsSaving] = useState(false);

  const [chartObj, setChartObj] = useState({
    chartID: shortid.generate(),
    name: "New untitled chart",
    metrics: [],
    chartSettings: {
      showDelta: false,
      deltaFormat: "",
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
        y1: {
          customTickFormatY: true,
          customTickFormatYType: "",
          tooltipText: " ",
          metricFormat: "",
          metricFormatPosition: "start",
        },
      },
      fullWidth: true,
      customWidth: "100%",
      customHeight: "400px",

      canvasHeight: "100%",
      canvasWidth: "100%",
    },
    // categoryField: "timestamp",
    // categoryData: [],

    // Can be absolute, session, user
    // Absolute is just an aggregated value for a given date range
    // Session is a mean per session, user is a mean per user. Both are for a given date range
    // dimension: "absolute",
  });
  const [events, setEvents] = useState([]);

  const [selectedEvent, setSelectedEvent] = useState(-1);
  function onEventSelected(i) {
    setSelectedEvent(i);
  }

  function onChartNameChanged(newName) {
    setChartObj((prevChartObj) => ({
      ...prevChartObj,
      name: newName,
    }));
  }

  function onCategorySelected(index, newCategory) {
    // setChartObj((prevChartObj) => ({
    //   ...prevChartObj,
    //   categoryField: newCategory,
    // }));
    setEvents((prevEvents) => {
      return prevEvents.map((e, i) => {
        if (i === index) {
          return { ...e, categoryField: newCategory };
        } else {
          return e;
        }
      });
    });
  }
  function onDimensionSelected(index, newDimension) {
    // setChartObj((prevChartObj) => ({
    //   ...prevChartObj,
    //   dimension: newDimension,
    // }));
    setEvents((prevEvents) => {
      return prevEvents.map((e, i) => {
        if (i === index) {
          return { ...e, dimension: newDimension };
        } else {
          return e;
        }
      });
    });
  }

  function setNewEvents(newEvents) {
    setEvents(newEvents);

    if (selectedEvent === -1 && newEvents.length !== 0) {
      setSelectedEvent(0);
    }
  }

  function onEventChange(index, event) {
    setEvents((prevEvents) => {
      return prevEvents.map((e, i) => {
        if (i === index) {
          return event;
        } else {
          return e;
        }
      });
    });
  }

  useEffect(() => {
    setChartObj((prevChartObj) => ({
      ...prevChartObj,
      metrics: events,
    }));
    fetchAnalyticsData(events, true);
    console.log("Events:", events);
  }, [events]);

  const prevChartObjMetricsRef = useRef(null);

  useEffect(() => {
    let shouldFetch = false;

    // Check if top-level fields changed - this automatically happens with the dependency array

    // Check if metrics array fields changed
    if (chartObj.metrics && chartObj.metrics.length > 0) {
      // First render or length changed
      if (
        !prevChartObjMetricsRef.current ||
        prevChartObjMetricsRef.current.length !== chartObj.metrics.length
      ) {
        shouldFetch = true;
      } else {
        // Check each metric object for changes in categoryField or dimension
        for (let i = 0; i < chartObj.metrics.length; i++) {
          const currentMetric = chartObj.metrics[i];
          const prevMetric = prevChartObjMetricsRef.current[i];

          if (
            currentMetric.categoryField !== prevMetric.categoryField ||
            currentMetric.dimension !== prevMetric.dimension
          ) {
            shouldFetch = true;
            break;
          }
        }
      }

      // Update ref for next comparison
      prevChartObjMetricsRef.current = JSON.parse(
        JSON.stringify(chartObj.metrics)
      );
    }

    // Only fetch if something changed (either top-level fields or metrics)
    if (shouldFetch) {
      fetchAnalyticsData(events);
    }
  }, [chartObj.metrics]);

  const [wasChanged, setWasChanged] = useState(true);
  useEffect(() => {
    getChartDataForTable();
    getChartColumnsForTable();

    console.log("CHART CHANGED");
    setWasChanged(true);

    // if (chartWasSaved) {
    //   setChartIsSaving(true);
    //   setTimeout(() => {
    //     setChartIsSaving(false);
    //   }, 1200);
    // }
  }, [chartObj]);

  const prevMetricsRef = useRef([]);
  let fetchTimer = null;
  async function fetchAnalyticsData_Internal(
    newMetrics,
    calledFromMetricsUpdate
  ) {
    const metricsForQuery = newMetrics.map((m) => {
      const properMetric = {
        queryCategoryFilters: m.queryCategoryFilters,
        queryEventTargetValueId: m.queryEventTargetValueId,
        queryAnalyticEventID: m.queryAnalyticEventID,
        queryMethod: m.queryMethod,
        queryValueFilters: m.queryValueFilters,
        queryPercentile: m.queryMethodSecondaryValue,
        dimension: m.dimension,
        categoryField: m.categoryField,
      };
      return properMetric;
    });

    if (newMetrics.length === 0) {
      // setChartObj((prevChartObj) => ({
      //   ...prevChartObj,
      //   categoryData: [],
      //   metrics: [],
      // }));
      return;
    }

    let updatedMetrics = newMetrics;
    console.log("FETCHING DATA, CHART:", JSON.parse(JSON.stringify(chartObj)));
    if (calledFromMetricsUpdate) {
      // Get diff between current and previous metrics and only update changed metrics
      console.log("metricsForQuery", metricsForQuery)
      const indexesToUpdate = metricsForQuery
        .map((metric, index) => {
          const prevMetric = prevMetricsRef.current[index];
          if (JSON.stringify(metric) !== JSON.stringify(prevMetric)) {
            return index;
          }
          return null;
        })
        .filter((metric) => metric !== null);

      if (indexesToUpdate.length === 0) {
        return;
      }

      // Save new current state
      prevMetricsRef.current = metricsForQuery;

      if (isFetchingData) return;

      setIsFetchingData(true);

      try {
        // Only request data for changed metrics
        const response = await queryUniversalAnalytics({
          gameID: game.gameID,
          branch: branch,
          environment: environment,
          filterDate,
          filterSegments: filterSegments.map((segment) => segment.segmentID),
          metrics: metricsForQuery.filter((m, i) =>
            indexesToUpdate.includes(i)
          ),
        });

        if (response.success) {
          const updatedMetricsWithData = indexesToUpdate.map((i, index) => {
            return {
              index: i,
              data: response.message[index],
            };
          });

          console.log(
            "Metrics after data fetch:",
            chartObj,
            newMetrics,
            updatedMetricsWithData
          );

          setChartObj((prevChartObj) => ({
            ...prevChartObj,
            metrics: prevChartObj.metrics.map((metric, index) => {
              // metric = {...newMetrics[index]},
              metric.data = indexesToUpdate.includes(index)
                ? updatedMetricsWithData.find((d) => d.index === index).data
                : metric.data;
              return metric;
            }),
          }));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsFetchingData(false);
      } finally {
        setIsFetchingData(false);
      }
    } else {
      setIsFetchingData(true);

      try {
        const response = await queryUniversalAnalytics({
          gameID: game.gameID,
          branch: branch,
          environment: environment,
          filterDate,
          filterSegments: filterSegments.map((segment) => segment.segmentID),
          metrics: metricsForQuery,
        });

        if (response.success) {
          updatedMetrics = newMetrics.map((metric, index) => {
            metric.data = response.message[index];
            return metric;
          });

          console.log("Metrics after data fetch:", newMetrics, updatedMetrics);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsFetchingData(false);
      }
    }
    let analyticsEvents = await getAnalyticsEvents({
      gameID: game.gameID,
      branch: branch,
      eventIDs: newMetrics.map((metric) => metric.queryAnalyticEventID),
    });
    if (analyticsEvents.success) {
      analyticsEvents = analyticsEvents.events;
    }
    updatedMetrics = updatedMetrics.map((metric) => {
      let event = analyticsEvents.find(
        (event) => event.eventID === metric.queryAnalyticEventID
      );
      metric.eventName = event.eventName;
      metric.valueName = event.values.find(
        (v) => v.uniqueID === metric.queryEventTargetValueId
      ).valueName;

      switch (
        event.values.find((v) => v.uniqueID === metric.queryEventTargetValueId)
          .valueFormat
      ) {
        case "money":
          metric.datasetConfig.config.metricFormat = "$";
          metric.datasetConfig.config.metricFormatPosition = "start";
          metric.datasetConfig.config.tooltipText = "";
          break;
        case "percentile":
          metric.datasetConfig.config.metricFormat = "%";
          metric.datasetConfig.config.metricFormatPosition = "end";
          metric.datasetConfig.config.tooltipText = "";
          break;
        default:
          metric.datasetConfig.config.metricFormat = "";
          metric.datasetConfig.config.metricFormatPosition = "end";
          metric.datasetConfig.config.tooltipText = "";
          break;
      }
      return metric;
    });

    // Here we extracting all category data from all data we got
    // updatedMetrics = updatedMetrics.map((metric) => {
    //   if (metric.data.length > 0) {
    //     let categoryData = [];
    //     categoryData = updatedMetrics.map((metric) =>
    //       metric.data.map((dataItem) => dataItem.x)
    //     );

    //     // Flatten the array and create a Set to ensure unique values
    //     categoryData = new Set(
    //       categoryData.reduce((acc, curr) => {
    //         return acc.concat(curr);
    //       }, [])
    //     );

    //     // Convert the Set back to an array
    //     categoryData = Array.from(categoryData);

    //     if (metric.categoryField === "timestamp") {
    //       categoryData = categoryData.sort((a, b) => new Date(a) - new Date(b));

    //       updatedMetrics = updatedMetrics.map((metric) => {
    //         const existingDates = metric.data.map((dataItem) => dataItem.x);

    //         categoryData.forEach((date) => {
    //           if (!existingDates.includes(date)) {
    //             metric.data.push({
    //               x: date,
    //               y: 0,
    //               ...(metric.data.some(
    //                 (d) => d.label !== undefined && d.label !== null
    //               )
    //                 ? { label: 0 }
    //                 : {}),
    //             });
    //           }
    //         });
    //         metric.data = metric.data.sort(
    //           (a, b) => new Date(a.x) - new Date(b.x)
    //         );

    //         return metric;
    //       });
    //     }

    //     metric.categoryData = categoryData;
    //   }
    //   return metric;
    // });

    console.log("updatedMetrics", updatedMetrics);

    if (calledFromMetricsUpdate) {
      setChartObj((prevChartObj) => ({
        ...prevChartObj,
      }));
    } else {
      setChartObj((prevChartObj) => ({
        ...prevChartObj,
        metrics: updatedMetrics,
      }));
    }
  }
  async function fetchAnalyticsData(
    newMetrics,
    calledFromMetricsUpdate,
    withoutDelay
  ) {
    clearTimeout(fetchTimer);
    fetchTimer = setTimeout(
      async () => {
        fetchAnalyticsData_Internal(newMetrics, calledFromMetricsUpdate);
      },
      withoutDelay ? 0 : 1000
    );
  }

  const [filterSegments, setFilteredSegments] = useState([]);
  const [segmentsList, setSegmentsList] = useState([]);

  const [allAnalyticsEvents, setAllAnalyticsEvents] = useState([]);

  useEffect(() => {
    fetchAnalyticsData(events);
  }, [filterSegments]);

  const [offersNames, setOffersNames] = useState([]);
  const [entityCurrencies, setEntityCurrencies] = useState([]);
  async function fetchOffers() {
    const offers = await getOffersNames({
      gameID: game.gameID,
      branch: branch,
    });
    setOffersNames(offers.offers);
    return offers.offers;
  }

  async function fetchCurrencies() {
    const response = await getCurrencyEntities({
      gameID: game.gameID,
      branch: branch,
    });
    setEntityCurrencies(response.entities);
    return response.entities;
  }

  useEffect(() => {
    // Getting segment list
    async function fetchSegmentList() {
      const response = await getAllSegmentsForAnalyticsFilter({
        gameID: game.gameID,
        branch: branch,
      });
      if (response.success) {
        // Segments with "everyone" segment
        let segments = response.message;

        for (let i = 0; i < segments.length; i++) {
          if (segments[i].segmentID === "everyone") {
            segments.splice(i, 1);
            break;
          }
        }

        // Populate segments filter with all segments, except "everyone"
        setSegmentsList(segments);
      }
    }
    fetchSegmentList();

    let tempAllEvents;
    async function fetchEvents() {
      const resp = await getAllAnalyticsEvents({
        gameID: game.gameID,
        branch: branch,
      });
      if (resp) {
        setAllAnalyticsEvents(resp.events);
        tempAllEvents = resp.events;
      }
    }

    async function startup() {
      const params = new URLSearchParams(location.search);
      const comparison = params.get(`comparison`);
      let comparisonItems = localStorage.getItem(`comparison_${comparison}`);
      if (comparisonItems && comparisonItems != "") {
        // If we're doing a comparison of different stuff on a dashboard, setup it if everything is valid
        comparisonItems = JSON.parse(comparisonItems);
        if (comparisonItems && comparisonItems.length > 0) {
          await fetchEvents();
          makeComparison(comparisonItems, tempAllEvents);
        } else {
          fetchEvents();
          fetchOffers();
          fetchCurrencies();
        }
      } else if (params.get(`editChart`)) {
        // If we're editing a chart, setup a chart
        await setupChartToEdit();
        fetchEvents();
        fetchOffers();
        fetchCurrencies();
      } else {
        // Just fetch data
        fetchEvents();
        fetchOffers();
        fetchCurrencies();
      }
    }
    startup();
  }, []);
  function getDefaultChartConfig(datasetIndex = 0) {
    const defaultChartConfig = {
      queryCategoryFilters: [],
      queryValueFilters: [],
      data: [],
      axisID: "y",
      hidden: false,
      datasetConfig: {
        config: {
          type: "line",
          yAxisID: "y",
          stack: datasetIndex,
          label: "",
          fill: false,
          borderColor: chroma(makeRandomColor(datasetIndex)).hex(),
          backgroundColor: chroma(makeRandomColor(datasetIndex))
            .alpha(0.3)
            .hex(),
        },
        valueField: "value",
      },
    };
    function makeRandomColor(number) {
      const hue = number * 137.508; // use golden angle approximation
      return `hsl(${hue},100%,30%)`;
    }
    return defaultChartConfig;
  }
  async function setupChartToEdit() {
    const params = new URLSearchParams(location.search);
    const chartID = params.get(`editChart`);
    const resp = await getCustomDashboardChart({
      gameID: game.gameID,
      branch: branch,
      chartID: chartID,
    });
    if (resp.success) {
      setEvents(resp.chart.metrics);
      setChartObj((prevChartObj) => ({
        ...prevChartObj,
        chartID: resp.chart.chartID,
        id: resp.chart.id,
        name: resp.chart.name,
        isEditing: true,
        chartSettings: {
          ...resp.chart.chartSettings,
          fullWidth: true,
        },
        layoutSettings: resp.chart.layoutSettings,
      }));
    }
  }

  async function makeComparison(comparisonArray, tempAllEvents) {
    const offers = await fetchOffers();
    let tempEvents = [];
    comparisonArray.forEach((item) => {
      switch (item.type) {
        case "offer":
          tempEvents.push({
            ...getDefaultChartConfig(tempEvents.length + 1),
            hidden: false, 
            datasetConfig: {
              ...getDefaultChartConfig(tempEvents.length + 1).datasetConfig,
              config: {
                ...getDefaultChartConfig(tempEvents.length + 1).datasetConfig
                  .config,
                label: offers.find((o) => o.offerID === item.id).offerName,
              },
            },
            queryAnalyticEventID: "offerEvent",
            queryEventTargetValueId: tempAllEvents
              .find((e) => e.eventID === "offerEvent")
              .values.find((v) => v.valueID === "price").uniqueID,
            queryMethod: "summ",
            queryValueFilters: [
              {
                condition: "is",
                conditionValue: item.id,
                conditionSecondaryValue: "",
                conditionValueID: tempAllEvents
                  .find((e) => e.eventID === "offerEvent")
                  .values.find((v) => v.valueID === "offerID").uniqueID,
              },
            ],
            dimension: "absolute",
            categoryField: "timestamp",
            valueName: "Price",
            eventName: "Offer Event",
          });
          break;
        case "economy_source":
          tempEvents.push({
            ...getDefaultChartConfig(tempEvents.length + 1),
            hidden: false, 
            datasetConfig: {
              ...getDefaultChartConfig(tempEvents.length + 1).datasetConfig,
              config: {
                ...getDefaultChartConfig(tempEvents.length + 1).datasetConfig
                  .config,
                label: item.id,
              },
            },
            queryValueFilters: [
              {
                condition: "is",
                conditionValue: item.id,
                conditionSecondaryValue: "",
                conditionValueID: tempAllEvents
                  .find((e) => e.values.some((v) => v.valueID === "origin"))
                  .values.find((v) => v.valueID === "origin").uniqueID,
              },
              {
                condition: "is",
                conditionValue: "source",
                conditionSecondaryValue: "",
                conditionValueID: tempAllEvents
                  .find((e) => e.values.some((v) => v.valueID === "type"))
                  .values.find((v) => v.valueID === "type").uniqueID,
              },
            ],
            queryAnalyticEventID: "economyEvent",
            queryEventTargetValueId: tempAllEvents
              .find((e) => e.eventID === "economyEvent")
              .values.find((v) => v.valueID === "amount").uniqueID,
            queryMethod: "summ",
            dimension: "absolute",
            categoryField: "timestamp",
          });
          break;
        case "economy_sink":
          tempEvents.push({
            ...getDefaultChartConfig(tempEvents.length + 1),
            hidden: false, 
            datasetConfig: {
              ...getDefaultChartConfig(tempEvents.length + 1).datasetConfig,
              config: {
                ...getDefaultChartConfig(tempEvents.length + 1).datasetConfig
                  .config,
                label: item.id,
              },
            },
            queryValueFilters: [
              {
                condition: "is",
                conditionValue: item.id,
                conditionSecondaryValue: "",
                conditionValueID: tempAllEvents
                  .find((e) => e.values.some((v) => v.valueID === "origin"))
                  .values.find((v) => v.valueID === "origin").uniqueID,
              },
              {
                condition: "is",
                conditionValue: "sink",
                conditionSecondaryValue: "",
                conditionValueID: tempAllEvents
                  .find((e) => e.values.some((v) => v.valueID === "type"))
                  .values.find((v) => v.valueID === "type").uniqueID,
              },
            ],
            queryAnalyticEventID: "economyEvent",
            queryEventTargetValueId: tempAllEvents
              .find((e) => e.eventID === "economyEvent")
              .values.find((v) => v.valueID === "amount").uniqueID,
            queryMethod: "summ",
            dimension: "absolute",
            categoryField: "timestamp",
          });
          break;
      }
    });

    setEvents(tempEvents);
    localStorage.removeItem(`comparison_${game.gameID}`);
  }

  const [filterDate, setFilteredDate] = useState([]);

  useEffect(() => {
    fetchAnalyticsData(events);
  }, [filterSegments, filterDate]);

  const baseColumns = [
    {
      field: "metricName",
      headerName: "Name",
      width: 300,
      maxWidth: 600,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "start",
          }}
        >
          <Typography
            variant={"body1"}
            color={"text.secondary"}
            sx={{
              whiteSpace: "wrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {params.value}
          </Typography>
        </div>
      ),
    },
  ];
  const [columns, setColumns] = useState(baseColumns);
  const [tableData, setTableData] = useState([]);
  function onColumnsChange(event, index) {
    // Saving columns widths to state so we dont lose it on any state change
    setColumns((prevColumns) => {
      return prevColumns.map((column, i) => {
        if (i === index) {
          if (column.field === event.colDef.field) {
            return {
              ...column,
              width: event.colDef.width,
            };
          } else {
            return column;
          }
        }
        return column;
      });
    });
  }
  const tablesSettings = [
    {
      sx: { pl: "15px", pr: "15px", height: 200, width: "100%", mb: 7 },
      title: "Data table",
      rowHeight: "35px",
      initialState: {
        pagination: {
          paginationModel: {
            pageSize: 50,
          },
        },
      },
      mainProps: {
        autosizeOptions: {
          includeHeaders: true,
          includeOutliers: true,
        },
      },
      pageSizeOptions: [5],
    },
  ];

  function getChartDataForTable() {
    let tempData = [];

    chartObj.metrics.forEach((metric, metricIndex) => {
      let metricRows = [];
      function fixFloat(value) {
        // If integer, don't do anything. If string etc, dont do anything. If float, fix it to 2 digits after dot.
        // This way we prevent values like "4.2391284158245192" and making "4.23" from them.
        if (!isNaN(parseFloat(value)) && String(value).includes(".")) {
          return parseFloat(value).toFixed(2);
        } else {
          return value;
        }
      }

      function formatValue(value, format) {
        switch (format) {
          case "$":
            return `$${value}`;
          case "%":
            return `${value}%`;
          default:
            return `${fixFloat(value)}`;
        }
      }

      if (metric.data && metric.data.length > 0) {
        // Check if data has labels
        const hasLabels = metric.data.some((item) => item.label !== undefined);

        if (hasLabels) {
          // Group data by label
          const dataByLabel = {};
          metric.data.forEach((item) => {
            const label = item.label || "default";
            if (!dataByLabel[label]) {
              dataByLabel[label] = [];
            }
            dataByLabel[label].push(item);
          });

          // Create a row for each label
          Object.entries(dataByLabel).forEach(([label, labelData]) => {
            let dataObj = {};

            labelData.forEach((dataItem, i) => {
              dataObj[`${metricIndex}value${i}`] = formatValue(
                dataItem.y,
                metric.datasetConfig.config.metricFormat
              );
            });

            metricRows.push({
              id: shortid.generate(),
              metricName: label,
              ...dataObj,
            });
          });
        } else {
          // No labels, create one row as before
          let dataObj = {};

          metric.data.forEach((dataItem, i) => {
            dataObj[`${metricIndex}value${i}`] = formatValue(
              dataItem.y,
              metric.datasetConfig.config.metricFormat
            );
          });

          metricRows.push({
            id: shortid.generate(),
            metricName: metric.datasetConfig.config.label,
            ...dataObj,
          });
        }
      } else {
        // No data, still create empty row
        metricRows.push({
          id: shortid.generate(),
          metricName: metric.datasetConfig.config.label,
        });
      }

      tempData.push(metricRows);
    });

    console.log("result table data", tempData);
    setTableData(tempData);
  }

  function determineType(value) {
    if (
      new Date(value) != "Invalid Date" &&
      value.toString().includes("-") &&
      value.toString().includes("Z") &&
      value.toString().includes("T")
    ) {
      return "date";
    } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
      return "number";
    } else {
      return "string";
    }
  }
  function getChartColumnsForTable() {
    let totalColumns = chartObj.metrics.map((m, metricIndex) => {
      let tempColumns = JSON.parse(JSON.stringify(baseColumns));
      if (!m.data) {
        return tempColumns;
      }
      let categoryData = new Set(m.data.map((dataItem) => dataItem.x));
      categoryData = Array.from(categoryData);

      if (categoryData.every((label) => determineType(label) === "date")) {
        categoryData.forEach((category, index) => {
          tempColumns.push({
            field: metricIndex + "value" + index,
            headerName: dayjs.utc(category).format("ddd, MMM DD | HH:mm"),
            minWidth: 150,
            renderCell: (params) => (
              <div
                style={{
                  display: "flex",
                  height: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "start",
                }}
              >
                <Typography
                  variant={"body1"}
                  color={"text.secondary"}
                  sx={{
                    whiteSpace: "wrap",
                    fontSize: "14px",
                    fontWeight: "regular",
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  {params.value}
                </Typography>
              </div>
            ),
          });
        });
      } else {
        categoryData.forEach((category, index) => {
          tempColumns.push({
            field: metricIndex + "value" + index,
            headerName: category,
            flex: 1,
            minWidth: 150,
            renderCell: (params) => (
              <div
                style={{
                  display: "flex",
                  height: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "start",
                }}
              >
                <Typography
                  variant={"body1"}
                  color={"text.secondary"}
                  sx={{
                    whiteSpace: "wrap",
                    fontSize: "14px",
                    fontWeight: "regular",
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  {params.value}
                </Typography>
              </div>
            ),
          });
        });
      }
      return tempColumns;
    });
    console.log("totalColumns", totalColumns);

    setColumns(totalColumns);
  }

  const [anchorEl, setAnchorEl] = React.useState(null);
  const [selectedDashboardForSave, setSelectedDashboardForSave] =
    React.useState(null);
  const handleClickSave = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const openSavePopover = Boolean(anchorEl);

  function removeDataFromChartObj(chartObj) {
    let tempChartObj = JSON.parse(JSON.stringify(chartObj));

    tempChartObj.metrics = tempChartObj.metrics.map((metric, index) => {
      delete metric.data;
      return metric;
    });

    return tempChartObj;
  }

  function makeDateRangeForChart() {
    if (filterDate.length === 0)
      return { startDate: dayjs.utc(), endDate: dayjs.utc() };
    function getTimeseriesMin() {
      const result = dayjs.utc(filterDate[0]).startOf("day");
      return result;
    }
    function getTimeseriesMax() {
      const result = dayjs.utc(filterDate[1]).endOf("day");
      return result;
    }
    const dateFilter = {
      startDate: getTimeseriesMin(),
      endDate: getTimeseriesMax(),
    };
    return dateFilter;
  }

  return (
    <div className={s.mainBody}>
      <Popover
        open={openSavePopover}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            p: 2,
          }}
        >
          <Typography sx={{ p: 1.2 }}>
            Save this chart to a dashboard
          </Typography>

          <Box
            sx={{
              display: !dashboards || dashboards.length === 0 ? "flex" : "none",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              p: 2,
            }}
          >
            <Typography sx={{ p: 0 }}>No dashboards found</Typography>
            <Button variant="contained" onClick={addNewDashboard}>
              Create new dashboard
            </Button>
          </Box>

          <FormControl
            disabled={!dashboards || dashboards.length === 0}
            size="small"
            fullWidth
          >
            <InputLabel>Select dashboard</InputLabel>
            <Select
              value={selectedDashboardForSave}
              label="Select dashboard"
              onChange={(e) => setSelectedDashboardForSave(e.target.value)}
            >
              {dashboards &&
                dashboards.length > 0 &&
                dashboards.map((dashboard, index) => (
                  <MenuItem key={index} value={dashboard.id}>
                    {dashboard.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={() => {
              if (chartObj.metrics.length == 0) return;
              console.log("chartObj to save:", chartObj);
              onChartSaved(
                {
                  ...removeDataFromChartObj(chartObj),
                },
                selectedDashboardForSave
              );
              setChartWasSaved(true);
              setWasChanged(false);
              handleClose();
            }}
            disabled={!dashboards || dashboards.length === 0}
          >
            Save
          </Button>
        </Box>
      </Popover>

      <div className={s.workspace}>
        <div className={s.workspaceSpacer}></div>

        <div className={s.innerWorkspace}>
          <div className={s.filters}>
            <div className={s.innerFilters}>
              {/* Date range picker */}
              <DatePicker
                skipInitialize={false}
                onInitialize={(newDates) => {
                  setFilteredDate(newDates);
                }}
                onStateChange={(newDates) => {
                  setFilteredDate(newDates);
                }}
              />

              {/* Segments */}
              <Box sx={{ ml: 2 }}>
                <SegmentsPicker
                  segments={segmentsList}
                  currentSegments={filterSegments}
                  onStateChange={(s) => setFilteredSegments(s)}
                />
              </Box>

              {/* Data update */}
              <FormControl
                size="small"
                sx={{ ml: "auto", width: 150, minHeight: 35 }}
              >
                <LoadingButton
                  loading={isFetchingData}
                  disabled={events.length === 0}
                  variant={isFetchingData ? "outlined" : "contained"}
                  sx={{ maxHeight: 35 }}
                  onClick={(e) => {
                    fetchAnalyticsData(events, false, true);
                  }}
                >
                  Update
                </LoadingButton>
              </FormControl>
            </div>
          </div>

          <div className={s.chartWrapper}>
            <UniversalChart
              chartObj={chartObj}
              dateRange={makeDateRangeForChart()}
              onNameChanged={onChartNameChanged}
              onPreparedDatasetsChange={(datasets, categories) =>
                getChartDataForTable(datasets, categories)
              }
            />
          </div>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {chartObj.metrics.map((m, i) => (
              <Box sx={{ flex: 1, position: "relative", width: "100%" }}>
                <Box sx={{}}>
                  <DataTable
                    tableSettings={{
                      ...tablesSettings[0],
                      title: `Dataset #${i + 1} table`,
                      sx: {
                        ...tablesSettings[0].sx,
                        height:
                          tableData && tableData[i]
                            ? tablesSettings[0].sx.height +
                              50 * tableData[i].length
                            : tablesSettings[0].sx.height,
                      },
                    }}
                    columns={columns[i] ?? []}
                    rows={tableData && tableData[i] ? tableData[i] : []}
                    onColumnsChange={(e) => onColumnsChange(e, i)}
                    rowLength={200}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </div>
      </div>

      <div className={s.settings}>
        <div className={s.settingsList}>
          <EventSelector
            allAnalyticsEvents={allAnalyticsEvents}
            onEventsArrayChange={setNewEvents}
            events={events}
            allOffersNames={offersNames}
            allCurrenciesNames={entityCurrencies}
            onEventSelected={onEventSelected}
            selectedEvent={selectedEvent}
          />

          <EventConfig
            chartObj={chartObj}
            selectedEvent={selectedEvent}
            events={events}
            allAnalyticsEvents={allAnalyticsEvents}
            onCategorySelected={onCategorySelected}
            onDimensionSelected={onDimensionSelected}
            onEventChange={onEventChange}
          />

          <div className={s.actionsFooter}>
            {chartObj.isEditing ? (
              <LoadingButton
                loading={chartIsSaving}
                // disabled={chartObj.metrics.length === 0 || !wasChanged}
                fullWidth
                variant="contained"
                onClick={async (e) => {
                  setChartIsSaving(true);
                  await onChartSaved(
                    {
                      ...removeDataFromChartObj(chartObj),
                    },
                    selectedDashboardForSave
                  );
                  setChartWasSaved(true);
                  setWasChanged(false);
                  setChartIsSaving(false);
                }}
              >
                {chartWasSaved && !wasChanged ? "Saved" : "Apply new settings"}
              </LoadingButton>
            ) : (
              <LoadingButton
                loading={chartIsSaving}
                disabled={chartObj.metrics.length === 0 || !wasChanged}
                fullWidth
                variant="contained"
                onClick={(e) => {
                  handleClickSave(e);
                }}
              >
                {chartWasSaved && !wasChanged ? "Saved" : "Save"}
              </LoadingButton>
            )}

            {/* <Button
            fullWidth
            sx={{ width: 200 }}
            variant="outlined"
            onClick={() => {
              closeBuilder();
            }}
          >
            Close
          </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartBuilder;
