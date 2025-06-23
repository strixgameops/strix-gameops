import React, { useState } from "react";
import s from "./chartBuilder.module.css";
import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";

import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useTheme } from "@mui/material/styles";

const EventSelectorChild = ({
  event,
  openEventEditor,
  onEventRemoved,
  index,
  allAnalyticsEvents,
  provided,
  innerRef,

  onEventSelected,
  selectedEvent,
}) => {

  function getEventName(eventIDToFind, valueIDToFind) {
    if (allAnalyticsEvents.length > 0) {
      let temp = allAnalyticsEvents.find(
        (event) => event.eventID === eventIDToFind
      );
      if (temp === undefined) return "";
      temp = temp.values.find((v) => v.uniqueID === valueIDToFind);
      if (temp === undefined) return "";
      temp = temp.valueName;
      return temp;
    }
    return "";
  }
  function trimStr(string, maxLength = 19) {
    return string.length > maxLength
      ? `${string.slice(0, maxLength)}..`
      : string;
  }

  function getCountMethodName(method) {
    switch (method) {
      case "mostCommon":
        return "Most Common";
      case "leastCommon":
        return "Least Common";
      case "mean":
        return "Average";
      case "numberOfEvents":
        return "Count";
      case "summ":
        return "Sum";
      case "meanForTime":
        return "Avg. for Days";
      case "summForTime":
        return "Sum for Days";
      case "numberOfEventsForTime":
        return "Count for Days";
      case "percentile":
        return "Percentile";
      case "dateOfFirst":
        return "Date of First Event";
      case "dateOfLast":
        return "Date of Last Event";
      default:
        return "";
    }
  }

  const selected = index === selectedEvent

  function onSelect() {
    onEventSelected(index)
  }

  return (
    <Box
      {...provided.draggableProps}
      className={s.eventItem}
      ref={innerRef}
      sx={(theme) => ({
        backgroundColor: selected ? "#5750d2" : "none",
      })}
    >
      {/* Drag handle - no onClick here to preserve drag functionality */}
      <Box {...provided.dragHandleProps} sx={{ height: "24px" }}>
        <DragIndicatorIcon
          sx={{
            color: selected ? "#e7e7e7" : "#454545",
            cursor: "grab",
          }}
        />
      </Box>

      {/* Text area - click to select/deselect */}
      <div
        className={s.eventName}
        onClick={onSelect}
        style={{ cursor: "pointer" }}
      >
        <Typography
          variant={"body1"}
          sx={{
            color: selected
              ? "#e7e7e7"
              : (theme) => theme.palette.text.secondary,
          }}
        >
          {trimStr(
            `${getEventName(event.queryAnalyticEventID, event.queryEventTargetValueId)} - ${getCountMethodName(event.queryMethod)}`
          )}
        </Typography>
      </div>

      <Box sx={{ ml: "auto" }}>
        <Tooltip title="Edit event" placement="top" disableInteractive>
          <Button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the select handler
              openEventEditor(event, index);
            }}
            variant="outlined"
            sx={{
              mr: 2,
              p: 2,
              width: "25px",
              minWidth: "25px",
              height: "25px",
              minHeight: "25px",
              textTransform: "none",
              fontSize: "16px",
              fontWeight: "semibold",
              color: selected ? "#e7e7e7" : "inherit",
              borderColor: selected ? "#e7e7e7" : "inherit",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.3)",
              },
            }}
          >
            <EditIcon fontSize="small" />
          </Button>
        </Tooltip>

        <Tooltip title="Remove event" placement="top" disableInteractive>
          <Button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the select handler
              onEventRemoved(event, index);
            }}
            variant="outlined"
            sx={{
              m: 0,
              p: 2,
              width: "25px",
              minWidth: "25px",
              height: "25px",
              minHeight: "25px",
              textTransform: "none",
              fontSize: "16px",
              fontWeight: "semibold",
              ml: "auto",
              color: selected ? "#e7e7e7" : "inherit",
              borderColor: selected ? "#e7e7e7" : "inherit",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.3)",
              },
            }}
          >
            <ClearIcon fontSize="small" />
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default EventSelectorChild;
