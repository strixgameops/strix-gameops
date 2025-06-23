import React, { useEffect, useState, useRef } from "react";
import Skeleton from "@mui/material/Skeleton";
import s from "../css/funnelChart.module.css";
import "../../dashboards/charts/css/chartsDarkTheme.css";
import Typography from "@mui/material/Typography";

// Funnel plugin
import { Tooltip } from "chart.js";
import { FunnelChart as Chart } from "chartjs-chart-funnel";
import ChartDataLabels from "chartjs-plugin-datalabels";

// For coloring
import chroma from "chroma-js";

import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";

import { Button, Popover } from "@mui/material";
import MuiTooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import SelectEvent from "./SelectEvent";
import reservedEvents, {
  sessionEndEvent,
  sessionStartEvent,
  offerShownEvent,
  offerEvent,
  adEvent,
  designEvent,
  economyEvent,
  reportEvent,
  crashEvent,
  uiEvent,
} from "../tree/ReservedEventsList";
import TextField from "@mui/material/TextField";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";

import FunnelFilterItem from "./FunnelFilterItem";
import { useTheme } from "@mui/material/styles";

Chart.register(ChartDataLabels, Tooltip);

const FunnelChart = ({
  chartObj,
  dateRange,
  eventList,
  onEventReplaced,
  onEventRemoved,

  designEvents,

  onFilterSet,
}) => {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [chartRendered, setChartRendered] = useState(false);

  const [currentGranularity, setCurrentGranularity] = useState();
  const currentGranularityRef = useRef(null);
  currentGranularityRef.current = currentGranularity;
  const theme = useTheme();

  const chartRef = useRef(null);

  const [showNoDataError, setShowNoDataError] = useState();

  const [currentDeltaValue, setCurrentDeltaValue] = useState(0);

  const designEventsDataRef = useRef(designEvents);
  useEffect(() => {
    designEventsDataRef.current = designEvents;
  }, [designEvents]);
  function brightenColor(color) {
    if (!color) return color;
    return theme.palette.mode === "light"
      ? [chroma(color[0]).brighten(1).hex()]
      : color;
  }
  // Function for loading new data to chart (or updating). Initial data is set in drawChart()
  const chartObjDataRef = React.useRef(chartObj.data);
  function updateData(newData) {
    if (
      chartRef.current !== undefined &&
      chartRef.current !== null &&
      !showNoDataError
    ) {
      function addData(chart) {
        chart.data.labels = newData.map((item) => item[chartObj.categoryField]);

        chart.data.datasets = chartObj.datasetsConfigs.map((config) => ({
          ...config.config,
          data: newData
            ? newData.map((dataItem) => dataItem[config.valueField])
            : [],
          backgroundColor: brightenColor(makeColor(0)),
          borderColor: brightenColor(makeColor(0)),
        }));

        chartObjDataRef.current = newData;
        chart.update();
      }
      addData(chartRef.current);
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

  function makeColor(datasetIndex, isBackground) {
    if (chartObj.data.data.length === 0) return;
    const dataZero =
      chartObj.data.data[0][chartObj.datasetsConfigs[datasetIndex].valueField];

    const chromaGrad = chroma.scale(chartObj.chartSettings.funnelColor);

    const normalize = (value, max) => {
      if (max === 0) return 0;
      return value / max;
    };
    const gradientColors = chartObj.data.data.map((value) => {
      const normalizedValue = normalize(
        value[chartObj.datasetsConfigs[datasetIndex].valueField],
        dataZero
      );
      if (isBackground) {
        return chromaGrad(normalizedValue).alpha(0.3).hex();
      } else {
        return chromaGrad(normalizedValue).hex();
      }
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
    if (document.getElementById(`funnelChart${chartObj.chartID}`) !== null) {
      if (
        ((chartObj.data.data === undefined || chartRendered === true) &&
          !forceRedraw) ||
        chartObj.isError
      )
        return;

      // Refresh retention data to maintain fresh data all the time, otherwise if we set it once, it wont be rewritten on chart update,
      // and labels will show some kind of comparison upon new data arrive, so 100% becomes 2100% or whatever.

      if (chartRef.current !== null) {
        chartRef.current.destroy();
      }
      // console.log(chartObj)
      const canvasObj = document
        .getElementById(`funnelChart${chartObj.chartID}`)
        .getContext("2d");
      const chart = new Chart(canvasObj, {
        type: "funnel",
        data: {
          labels: chartObj.data.data.map(
            (item) => item[chartObj.categoryField]
          ),
          datasets: chartObj.datasetsConfigs.map((config, index) => ({
            ...config.config,

            data: chartObj.data.data
              ? chartObj.data.data.map(
                  (dataItem) => dataItem[config.valueField]
                )
              : [],
            backgroundColor: brightenColor(makeColor(0)),
            borderColor: brightenColor(makeColor(0)),
          })),
          shrinkAnchor: "top",
        },
        options: {
          // Resize funnel to be the width and height of it's container
          maintainAspectRatio: false,
          responsive: true,
          // Horizontal funnel alignment = x. Vertical funnel alignment = y
          indexAxis: "x",
          plugins: {
            // Tooltip on hovering exact day
            tooltip: {
              enabled: false,
              callbacks: {
                title: (tooltipItems) => {
                  let dataToGrab =
                    chartObj.data.data[tooltipItems[0].dataIndex];
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
                      label += `${chartObj.data.data} ${chartObj.chartSettings.ticks[context.dataset.yAxisID].tooltipText}`;
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
              color: theme.palette.text.primary,
              font: {
                size: 15,
                weight: "bold",
              },
              listeners: {
                click: function (context, event) {
                  if (chartObjDataRef.current[context.dataIndex]) {
                    openContextMenu(
                      event.native,
                      chartObjDataRef.current[context.dataIndex][
                        chartObj.categoryField
                      ],
                      context.dataIndex
                    );
                  }
                },
              },
              formatter: (value, context) => {
                let dataZero = chartObjDataRef.current[0];
                dataZero = dataZero
                  ? dataZero[chartObj.datasetsConfigs[0].valueField]
                  : 0;
                let id =
                  context.chart.config._config.data.labels[context.dataIndex];
                let name =
                  reservedEvents.find((e) => e.id === id) &&
                  reservedEvents.find((e) => e.id === id).name;
                if (name === undefined) {
                  name =
                    designEventsDataRef.current.find((e) => e.id === id) &&
                    designEventsDataRef.current.find((e) => e.id === id).name;
                }
                let str = `${name}\n${value} (${((value / dataZero) * 100).toFixed(2)}%)`;
                if (
                  chartObjDataRef.current &&
                  chartObjDataRef.current[context.dataIndex] &&
                  chartObjDataRef.current[context.dataIndex].filters &&
                  chartObjDataRef.current[context.dataIndex].filters.length > 0
                ) {
                  str += `\n +${chartObjDataRef.current[context.dataIndex].filters.length} filters`;
                }
                return str;
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

  function handleClick(evt) {
    // Function to handle click on the chart data itself (polygons)
    // It won't work if we click on the label, but that's not a problem as we process label clicks separately in chart's plugins>datalabels
    if (chartRef.current === null) return;
    const points = chartRef.current.getElementsAtEventForMode(
      evt,
      "nearest",
      { intersect: true },
      true
    );

    if (points.length) {
      const firstPoint = points[0];
      const label = chartRef.current.data.labels[firstPoint.index];
      const value =
        chartRef.current.data.datasets[firstPoint.datasetIndex].data[
          firstPoint.index
        ];
      openContextMenu(evt, label, firstPoint.index);
    }
  }

  const [anchorPos, setAnchorPos] = React.useState(null);
  const [clickedEvent, setClickedEvent] = React.useState(null);
  const [open, setOpen] = useState(false);
  const [replacingEvent, setReplacingEvent] = React.useState(false);

  const openContextMenu = (event, label, index) => {
    setAnchorPos({
      top: event.clientY,
      left: event.clientX,
    });
    setClickedEvent({ id: label, index: index });
    setOpen(true);
  };
  const closeContextMenu = () => {
    setOpen(false);
    setFilterWindow(null);
  };

  function callReplace() {
    setReplacingEvent(true);
    closeContextMenu();
  }
  function onReplace(event) {
    setReplacingEvent(false);
    onEventReplaced(event, clickedEvent.index);
  }

  function onRemove() {
    onEventRemoved(clickedEvent.index);
    closeContextMenu();
  }

  function trim(str, maxLength) {
    if (str.length > maxLength) {
      return `${str.substring(0, maxLength)}..`;
    }
    return str;
  }

  const [filterWindow, setFilterWindow] = React.useState(null);
  function callFilterWindow(e) {
    setFilterWindow(e.currentTarget);
  }

  function isFilterEnabled(event) {
    // Disable filtering for session start and end events
    if (event === null) return false;
    return event.id === sessionEndEvent.id || event.id === sessionStartEvent.id;
  }
  function isRemoveEnabled(event) {
    // Disable filtering for session start and end events
    if (event === null) return false;
    return event.id === sessionStartEvent.id;
  }
  function isReplaceEnabled(event) {
    // Disable filtering for session start and end events
    if (event === null) return false;
    return event.id === sessionStartEvent.id;
  }

  const [tempFilters, setTempFilters] = React.useState([]);

  function handleFilterChange_TargetField(newTargetField, filterIndex) {
    setTempFilters((prevFilters) => {
      return prevFilters.map((f, i) => {
        if (i === filterIndex) {
          return {
            ...f,
            targetField: newTargetField,
          };
        } else {
          return f;
        }
      });
    });
    handleFilterChange_Condition("", filterIndex);
    handleFilterChange_Value("", filterIndex);
  }
  function handleFilterChange_Condition(newCondition, filterIndex) {
    setTempFilters((prevFilters) => {
      return prevFilters.map((f, i) => {
        if (i === filterIndex) {
          return {
            ...f,
            condition: newCondition,
          };
        } else {
          return f;
        }
      });
    });
  }
  function handleFilterChange_Value(newValue, filterIndex) {
    setTempFilters((prevFilters) => {
      return prevFilters.map((f, i) => {
        if (i === filterIndex) {
          return {
            ...f,
            value: newValue,
          };
        } else {
          return f;
        }
      });
    });
  }
  function onClear() {
    setTempFilters([]);
    onFilterSet(clickedEvent.index, []);
    closeContextMenu();
  }
  function onApply() {
    onFilterSet(clickedEvent.index, tempFilters);
    closeContextMenu();
  }
  function handleFilterAdd() {
    setTempFilters((prevFilters) => {
      return [
        ...prevFilters,
        {
          targetField: "",
          condition: "",
          value: "",
        },
      ];
    });
  }
  function handleFilterRemove(filterIndex) {
    setTempFilters((prevFilters) => {
      return prevFilters.filter((f, i) => i !== filterIndex);
    });
    // onFilterRemove(event.index, filterIndex)
  }

  return (
    <div className={s.LineChartBody}>
      <Menu
        open={open}
        anchorReference="anchorPosition"
        onClose={closeContextMenu}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
        anchorPosition={anchorPos}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        {/* Bugged, fix. */}
        {/* <MenuItem 
          disabled={isReplaceEnabled(clickedEvent)}
          onClick={callReplace}>Replace</MenuItem> */}
        <MenuItem disabled={isRemoveEnabled(clickedEvent)} onClick={onRemove}>
          Remove
        </MenuItem>
        <MenuItem
          disabled={isFilterEnabled(clickedEvent)}
          onClick={callFilterWindow}
        >
          Filter
        </MenuItem>
      </Menu>

      {filterWindow && (
        <Popover
          open={Boolean(filterWindow)}
          anchorEl={filterWindow}
          onClose={() => setFilterWindow(null)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          <div className={s.filterWindow}>
            <Typography
              variant="subtitle1"
              color={"text.secondary"}
              sx={{
                p: 2,
                pt: 1,
                fontSize: "18px",
                fontWeight: "regular",
                textAlign: "center",
              }}
            >
              Filter by value
            </Typography>

            <div className={s.filterWindowContent}>
              <div className={s.filterItem}>
                {clickedEvent !== undefined &&
                  tempFilters.map(
                    (filter, index) =>
                      filter &&
                      clickedEvent.id && (
                        <FunnelFilterItem
                          key={`${index}`}
                          handleFilterChange_TargetField={
                            handleFilterChange_TargetField
                          }
                          handleFilterChange_Condition={
                            handleFilterChange_Condition
                          }
                          handleFilterChange_Value={handleFilterChange_Value}
                          handleFilterRemove={handleFilterRemove}
                          clickedEvent={clickedEvent}
                          filterData={filter}
                          index={index}
                        />
                      )
                  )}

                <Button onClick={handleFilterAdd} sx={{ mt: 2 }}>
                  <AddIcon /> add filter
                </Button>

                <div
                  style={{ display: "flex", gap: "10px", marginLeft: "auto" }}
                >
                  <Button variant="text" onClick={onClear} sx={{ mt: 2 }}>
                    Clear
                  </Button>
                  <Button variant="contained" onClick={onApply} sx={{ mt: 2 }}>
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Popover>
      )}

      <SelectEvent
        open={replacingEvent}
        anchorPos={anchorPos}
        onEventAdded={onReplace}
        onClose={closeContextMenu}
        events={eventList}
        designEvents={designEvents}
      />

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
              {trim(chartObj.name, 24)}
            </Typography>
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
              {currentDeltaValue === 0 && <span></span>}
              {currentDeltaValue > 0 && <span>+</span>}
              {currentDeltaValue < 0 && (
                // We don't show minus here because the value comes with it already if its negative
                <span></span>
              )}
              <span>{chartObj.metricFormat}</span>
              <span>{currentDeltaValue}</span>
            </div>
          )}
        </div>
      </div>

      <MuiTooltip
        title={!showNoDataError ? "Click to open menu" : ""}
        placement="bottom"
      >
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
                  className={s.FunnelChartContainerOnly}
                  onClick={(e) => handleClick(e)}
                  style={{ width: chartObj.data.data.length * 200 }}
                >
                  <canvas
                    className={`${s.chart} ${showNoDataError ? s.noDataChart : ""}`}
                    id={`funnelChart${chartObj.chartID}`}
                  ></canvas>
                </div>,
                showNoDataError && <div className={s.noDataLabel}></div>,
              ]}
        </div>
      </MuiTooltip>
    </div>
  );
};

export default FunnelChart;
