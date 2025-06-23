import React, { useState, useEffect, useRef } from "react";
import s from "./chartBuilder.module.css";
import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Collapse from "@mui/material/Collapse";
import OutlinedInput from "@mui/material/OutlinedInput";

import InputAdornment from "@mui/material/InputAdornment";

import { useGame, useBranch } from "@strix/gameContext";

import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import FormatColorFillIcon from "@mui/icons-material/FormatColorFill";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import TimelineIcon from "@mui/icons-material/Timeline";
import AbcIcon from "@mui/icons-material/Abc";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import { ExpandMore, ExpandLess } from "@mui/icons-material";

import { MuiColorInput } from "mui-color-input";
import chroma from "chroma-js";

const DatasetConfigurator = ({
  events,
  onEventConfigChange,
  allAnalyticsEvents,
}) => {
  const { game } = useGame();
  const { branch, environment } = useBranch();

  const [localEvents, setLocalEvents] = useState([]);

  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  function getEventName(eventIDToFind, valueIDToFind) {
    if (allAnalyticsEvents.length > 0) {
      let temp = allAnalyticsEvents.find(
        (event) => event.eventID === eventIDToFind
      );
      if (temp == undefined) return "";
      temp = temp.values.find((v) => v.uniqueID === valueIDToFind).valueName;
      return temp;
    }
    return "";
  }

  function trimStr(string) {
    return string.length > 16 ? `${string.slice(0, 16)}..` : string;
  }

  function cycleAxises(eventIndex, axisID) {
    if (axisID === "y") {
      let tempEvent = events[eventIndex];
      tempEvent.datasetConfig.config.yAxisID = "y1";
      onEventConfigChange(tempEvent, eventIndex);
      return;
    } else {
      let tempEvent = events[eventIndex];
      tempEvent.datasetConfig.config.yAxisID = "y";
      onEventConfigChange(tempEvent, eventIndex);
      return;
    }
  }

  function toggleEventVisibility(eventIndex) {
    let tempEvent = { ...events[eventIndex] };
    tempEvent.hidden = !tempEvent.hidden;
    onEventConfigChange(tempEvent, eventIndex);
    
    // Update local state for immediate UI feedback
    setLocalEvents((prevEvents) => {
      return prevEvents.map((e, i) => {
        if (i === eventIndex) {
          return { ...e, hidden: !e.hidden };
        } else {
          return e;
        }
      });
    });
  }

  const timeoutRef_Color = useRef(null);
  function setEventColor(eventIndex, color) {
    clearTimeout(timeoutRef_Color.current);
    timeoutRef_Color.current = setTimeout(() => {
      let tempEvent = events[eventIndex];
      tempEvent.datasetConfig.config.borderColor = chroma(color).hex();
      tempEvent.datasetConfig.config.backgroundColor = chroma(color)
        .alpha(0.3)
        .hex();
      tempEvent.datasetConfig.config.borderWidth = 2;
      onEventConfigChange(tempEvent, eventIndex);
    }, 300);
  }

  function setEventDatasetType(eventIndex, type) {
    let tempEvent = events[eventIndex];
    tempEvent.datasetConfig.config.type = type;
    onEventConfigChange(tempEvent, eventIndex);
  }

  const timeoutRef_Label = useRef(null);
  function setEventLabel(eventIndex, label) {
    clearTimeout(timeoutRef_Label.current);
    setLocalEvents((prevEvents) => {
      return prevEvents.map((e, i) => {
        if (i === eventIndex) {
          return {
            ...e,
            datasetConfig: {
              ...e.datasetConfig,
              config: { ...e.datasetConfig.config, label: label },
            },
          };
        } else {
          return e;
        }
      });
    });
    timeoutRef_Label.current = setTimeout(() => {
      let tempEvent = events[eventIndex];
      tempEvent.datasetConfig.config.label = label;
      onEventConfigChange(tempEvent, eventIndex);
    }, 300);
  }
  const timeoutRef_Stack = useRef(null);
  function setEventStack(eventIndex, stackID) {
    clearTimeout(timeoutRef_Stack.current);
    setLocalEvents((prevEvents) => {
      return prevEvents.map((e, i) => {
        if (i === eventIndex) {
          return {
            ...e,
            datasetConfig: {
              ...e.datasetConfig,
              config: {
                ...e.datasetConfig.config,
                stacked: stackID !== "",
                stack: stackID,
              },
            },
          };
        } else {
          return e;
        }
      });
    });
    timeoutRef_Stack.current = setTimeout(() => {
      let tempEvent = events[eventIndex];
      tempEvent.datasetConfig.config.stacked = stackID !== "";
      tempEvent.datasetConfig.config.stack = stackID;
      onEventConfigChange(tempEvent, eventIndex);
    }, 100);
  }

  function setEventLineFill(eventIndex, fill) {
    let tempEvent = events[eventIndex];
    tempEvent.datasetConfig.config.fill = fill === "false" ? false : fill;
    onEventConfigChange(tempEvent, eventIndex);
  }

  function formatInteger(value) {
    // Remove all non-numeric symbols
    let sanitizedValue = value.replace(/[^0-9]/g, "");

    // Remove leading zeros
    sanitizedValue = sanitizedValue.replace(/^/, "");

    return sanitizedValue;
  }

  return (
    <div className={s.eventsList_Configurator}>
      {localEvents.length > 0
        ? localEvents.map((event, index) => (
            <div
              key={event.queryAnalyticsEventID + event.queryEventTargetValueId}
              className={s.eventItem_Configurator}
              style={{
                opacity: event.hidden ? 0.5 : 1,
                backgroundColor: event.hidden ? 'rgba(0,0,0,0.1)' : 'transparent'
              }}
            >
              <div className={s.eventUpper}>
                <Tooltip title="Axis" placement="top" disableInteractive>
                  <Button
                    onClick={() =>
                      cycleAxises(index, event.datasetConfig.config.yAxisID)
                    }
                    variant="outlined"
                    sx={{
                      m: 0,
                      p: 2,

                      width: "25px",
                      minWidth: "25px",
                      height: "30px",
                      minHeight: "30px",
                      textTransform: "none",
                      fontSize: "16px",
                      fontWeight: "semibold",
                    }}
                  >
                    {event.datasetConfig.config.yAxisID}
                  </Button>
                </Tooltip>

                <div className={s.eventName}>
                  <Typography variant={"body1"} color={"text.secondary"}>
                    {`Primary axis of 
                  ${trimStr(
                    getEventName(
                      event.queryAnalyticEventID,
                      event.queryEventTargetValueId
                    )
                  )}`}
                  </Typography>
                </div>

                <Tooltip 
                  title={event.hidden ? "Show dataset" : "Hide dataset"} 
                  placement="top" 
                  disableInteractive
                >
                  <Button
                    onClick={() => toggleEventVisibility(index)}
                    variant="outlined"
                    sx={{
                      ml: "auto",
                      p: 2,
                      width: "35px",
                      minWidth: "35px",
                      height: "30px",
                      minHeight: "30px",
                      textTransform: "none",
                      fontSize: "16px",
                      fontWeight: "semibold",
                      borderColor: event.hidden ? '#ff9800' : 'inherit',
                      color: event.hidden ? '#ff9800' : 'inherit',
                    }}
                  >
                    {event.hidden ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </Button>
                </Tooltip>
              </div>

              <div className={s.eventConfig}>
                <Tooltip
                  title="Set data color"
                  placement="top"
                  disableInteractive
                >
                  <div className={s.configItem}>
                    <FormatColorFillIcon
                      fontSize="small"
                      sx={
                        {
                          //   color: "#e7e7e7",
                        }
                      }
                    />
                    <MuiColorInput
                      sx={{
                        width: "100%",
                        ml: "auto",
                      }}
                      size="small"
                      format="hex"
                      isAlphaHidden
                      value={event.datasetConfig.config.borderColor}
                      onChange={(e) => {
                        setEventColor(index, e);
                      }}
                    />
                  </div>
                </Tooltip>

                <Tooltip
                  title="Set chart type"
                  placement="top"
                  disableInteractive
                >
                  <div className={s.configItem}>
                    <TimelineIcon fontSize="small" sx={{}} />

                    <Select
                      value={event.datasetConfig.config.type}
                      size="small"
                      fullWidth
                      onChange={(e) =>
                        setEventDatasetType(index, e.target.value)
                      }
                    >
                      <MenuItem value={"line"}>Line</MenuItem>
                      <MenuItem value={"bar"}>Bar</MenuItem>
                    </Select>
                  </div>
                </Tooltip>

                <Tooltip
                  title="Configure stacked data (none if empty)"
                  placement="top"
                  disableInteractive
                >
                  <div className={s.configItem}>
                    <Typography
                      variant={"subtitle1"}
                      color={"text.secondary"}
                      sx={{
                        width: "100px",
                        fontSize: "14px",
                        fontWeight: "regular",
                        textAlign: "start",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Stack #
                    </Typography>

                    <TextField
                      spellCheck={false}
                      fullWidth
                      size="small"
                      value={event.datasetConfig.config.stack}
                      onChange={(e) =>
                        setEventStack(index, formatInteger(e.target.value))
                      }
                    />
                  </div>
                </Tooltip>

                {event.datasetConfig.config.type === "line" && (
                  <Tooltip
                    title="Area chart formatting"
                    placement="top"
                    disableInteractive
                  >
                    <div className={s.configItem}>
                      <Typography
                        variant={"subtitle1"}
                        color={"text.secondary"}
                        sx={{
                          width: "100px",
                          fontSize: "14px",
                          fontWeight: "regular",
                          textAlign: "start",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Area
                      </Typography>

                      <Select
                        value={event.datasetConfig.config.fill}
                        size="small"
                        fullWidth
                        onChange={(e) =>
                          setEventLineFill(index, e.target.value)
                        }
                      >
                        <MenuItem value={"false"}>None</MenuItem>
                        <MenuItem value={"origin"}>Fill non-zeroes</MenuItem>
                        <MenuItem value={"start"}>Fill bottom</MenuItem>
                        <MenuItem value={"end"}>Fill top</MenuItem>
                      </Select>
                    </div>
                  </Tooltip>
                )}

                <Tooltip
                  title="Set data legend"
                  placement="top"
                  disableInteractive
                >
                  <div className={s.configItem}>
                    <TextFieldsIcon fontSize="small" sx={{}} />

                    <TextField
                      spellCheck={false}
                      fullWidth
                      size="small"
                      value={event.datasetConfig.config.label.split(":")[0]}
                      onChange={(e) => setEventLabel(index, e.target.value)}
                    />
                  </div>
                </Tooltip>
              </div>
            </div>
          ))
        : null}
    </div>
  );
};

export default DatasetConfigurator;