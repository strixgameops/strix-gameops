import React, { useEffect, useState, useRef } from "react";
import FunnelChart from "./FunnelChart";
import s from "../css/engagement.module.css";

import { Button } from "@mui/material";
import AddSharpIcon from "@mui/icons-material/AddSharp";
import Tooltip from "@mui/material/Tooltip";
import SelectEvent from "./SelectEvent";

const FunnelBuilder = ({ data, onFunnelChanged, expanded, designEvents }) => {
  const [funnelEvents, setFunnelEvents] = React.useState([]);

  const [eventList, setEventList] = React.useState([]);
  function filterSession(session, filterEvents) {
    // Filter sessions by the funnel events
    let lastIndex = -1;
    for (const idObj of filterEvents) {
      let index = -1;
      let found = false;
      for (let i = lastIndex + 1; i < session.length; i++) {
        if (session[i].id === idObj.id) {
          index = i; 
          found = true;
          break;
        }
      }

      if (!found) {
        return false;
      }

      if (idObj.filters.length > 0) {
        for (const filter of idObj.filters) {
          switch (filter.condition) {
            case "is":
              if (session[index][filter.targetField] !== filter.value) {
                return false;
              }
              break;
            case "is not":
              if (session[index][filter.targetField] === filter.value) {
                return false;
              }
              break;
            case "contains":
              if (
                session[index][filter.targetField].indexOf(filter.value) === -1
              ) {
                return false;
              }
              break;
            case "starts with":
              if (
                session[index][filter.targetField].indexOf(filter.value) !== 0
              ) {
                return false;
              }
              break;
            case "ends with":
              if (
                session[index][filter.targetField].indexOf(filter.value) !==
                session[index][filter.targetField].length - filter.value.length
              ) {
                return false;
              }
              break;
            case "=":
              if (session[index][filter.targetField] !== filter.value) {
                return false;
              }
              break;
            case "!=":
              if (session[index][filter.targetField] === filter.value) {
                return false;
              }
              break;
            case "<":
              if (session[index][filter.targetField] >= filter.value) {
                return false;
              }
              break;
            case "<=":
              if (session[index][filter.targetField] > filter.value) {
                return false;
              }
              break;
            case ">":
              if (session[index][filter.targetField] <= filter.value) {
                return false;
              }
              break;
            case ">=":
              if (session[index][filter.targetField] < filter.value) {
                return false;
              }
              break;
          }
        }
      }

      lastIndex = index;
    }
    // If all IDs are found and in the correct order, return true
    return true;
  }

  useEffect(() => {
    // Making a flat list of all events, like a funnel:
    // [{id: 'event1', occurences: 10}, {id: 'event2', occurences: 5}, {id: 'event3', occurences: 3}, {id: 'event4', occurences: 10}]
    setEventList((prevList) => {
      const updatedList = [...prevList];

      let result = new Set();
      data.forEach((session) => {
        session.forEach((event) => {
          result.add(event.id);
        });
      });
      return Array.from(result);
    });
  }, [data]);

  useEffect(() => {
    let result = [];
    funnelEvents.forEach((event, index) => {
      let tempFilter = funnelEvents.slice(0, index + 1);
      result.push({
        id: event.id,
        occurency: data.filter((session) => filterSession(session, tempFilter))
          .length,
        filters: event.filters,
      });
    });
    setChartObj((prevChartObj) => {
      return {
        ...prevChartObj,
        data: {
          ...prevChartObj.data,
          data: result ? result : [],
        },
      };
    });
  }, [funnelEvents, eventList]);

  useEffect(() => {
    let events = funnelEvents.map((event) => event).filter(Boolean);
    onFunnelChanged(events);
  }, [funnelEvents]);

  useEffect(() => {
    setFunnelEvents([
      {
        id: "newSession",
        filters: [],
      },
    ]);
  }, []);

  function onFunnelEventAdded(event) {
    setFunnelEvents([
      ...funnelEvents,
      {
        id: event,
        filters: [],
      },
    ]);
  }
  function onFunnelEventRemoved(index) {
    setFunnelEvents((prevEvents) => {
      return prevEvents.filter((e, i) => i !== index);
    });
  }

  // Filtering
  function onFunnelEventFiltersSet(eventIndex, filters) {
    setFunnelEvents((prevEvents) => {
      return prevEvents.map((e, i) => {
        if (i === eventIndex) {
          return {
            ...e,
            filters: filters,
          };
        } else {
          return e;
        }
      });
    });
  }

  function onFunnelEventChanged(event, index) {
    setFunnelEvents((prevEvents) => {
      return prevEvents.map((e, i) => {
        if (i === index) {
          return event;
        } else {
          return e;
        }
      });
    });
  }

  const [chartObj, setChartObj] = useState({
    chartID: "selection",
    name: "",
    metricName: "",
    data: {
      data: [],
    },
    chartSettings: {
      type: "funnel",
      funnelColor: ["#5055cc", "#656bff"],
      showDelta: false,
      deltaFormat: "",
      deltaFormatPosition: "start",
      showLegend: false,
      ticks: {
        y: {
          customTickFormatY: false,
          customTickFormatYType: "",
          tooltipText: "",
          excludeValueFromTooltip: true,
          metricFormat: "",
          metricFormatPosition: "start",
        },
      },
      fullWidth: false,
    },
    categoryField: "id",
    datasetsConfigs: [
      {
        config: {
          type: "funnel",
          yAxisID: "y",
          label: "",
          borderColor: "#CD6F00",
          backgroundColor: "#CD6F00",
        },
        valueField: "occurency",
        secondaryValueField: "players",
      },
    ],
  });

  const [anchorPos, setAnchorPos] = React.useState(null);
  const [clickedEvent, setClickedEvent] = React.useState(null);
  const [open, setOpen] = useState(false);
  const openContextMenu = (event, label) => {
    setAnchorPos({
      top: event.clientY,
      left: event.clientX,
    });
    setClickedEvent(label);
    setOpen(true);
  };
  const closeContextMenu = () => {
    setAnchorPos(null);
    setClickedEvent(null);
    setOpen(false);
  };

  return (
    <div
      className={`${s.funnelBuilderRow} ${expanded ? s.funnelBuilderRowOpened : ""}`}
    >
      <div className={s.chartWrapper}>
        {/* The chart itself */}
        <FunnelChart
          chartObj={chartObj}
          eventList={eventList}
          onEventReplaced={onFunnelEventChanged}
          onEventRemoved={onFunnelEventRemoved}
          designEvents={designEvents}
          onFilterSet={onFunnelEventFiltersSet}
        />
      </div>

      {funnelEvents.length < 8 && (
        <Tooltip title={"Add event"} disableInteractive placement="bottom">
          <Button
            onClick={(e) => openContextMenu(e)}
            sx={{
              width: "100px",
              height: "100px",
            }}
          >
            <AddSharpIcon />
          </Button>
        </Tooltip>
      )}
      <SelectEvent
        open={open}
        anchorPos={anchorPos}
        onEventAdded={onFunnelEventAdded}
        onClose={closeContextMenu}
        events={eventList}
        designEvents={designEvents}
      />
    </div>
  );
};

export default FunnelBuilder;
