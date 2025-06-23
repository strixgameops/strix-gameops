import React, { useState, useEffect, useRef } from "react";
import s from "./chartBuilder.module.css";
import { Typography, IconButton, Tooltip } from "@mui/material";
import Button from "@mui/material/Button";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";

import Modal from "@mui/material/Modal";
import { FormControl, InputLabel } from "@mui/material";
import Collapse from "@mui/material/Collapse";
import GroupIcon from "@mui/icons-material/Group";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
const DimensionSelector = ({
  onCategorySelected,
  selectedCategory,
  onSecondaryCategorySelected,
  selectedSecondaryCategory,
  secondaryCategoryOptions,
  events,
}) => {
  function checkAllEventsSameID() {
    if (events.length === 0) return false;
    const firstEvent = events[0];
    return events.every(
      (event) => event.queryAnalyticEventID === firstEvent.queryAnalyticEventID
    );
  }

  const [eventsState, setEventsState] = React.useState();
  useEffect(() => {
    setEventsState(events);
  }, [events]);

  function allEventsAreTheSameIDs() {
    let ids = new Set();
    if (eventsState) {
      eventsState.forEach((eventsState) =>
        ids.add(eventsState.queryAnalyticEventID)
      );
      return Array.from(ids).length === 1;
    } else {
      return false;
    }
  }

  return (
    <div className={s.categoriesList}>
      <div className={s.categoryItem}>
        <GroupIcon fontSize="small" />
        <Select
          value={selectedCategory}
          size="small"
          fullWidth
          onChange={(e) => onCategorySelected(e.target.value)}
        >
          <MenuItem value={"timestamp"}>Time</MenuItem>
          <MenuItem value={"engineVersion"}>Engine version</MenuItem>
          <MenuItem value={"gameVersion"}>Game version</MenuItem>
          <MenuItem value={"platform"}>Platform</MenuItem>
          <MenuItem value={"language"}>Language</MenuItem>
          <MenuItem value={"country"}>Country</MenuItem>

          {allEventsAreTheSameIDs()
            ? secondaryCategoryOptions.map((o) => (
                <MenuItem value={o.id}>{o.name}</MenuItem>
              ))
            : null}
        </Select>
        <Tooltip
          disableInteractive
          title={`You can group event values by categories. 
                When only one type of event is selected in "Events", you can group it's values by it's fields.`}
          placement="top"
        >
          <IconButton sx={{ borderRadius: 5, cursor: "default !important" }}>
            <InfoSharpIcon color="primary" />
          </IconButton>
        </Tooltip>
      </div>
      {/* <div className={s.categoryItem}>
            <GroupAddIcon
              fontSize="small"
              sx={
                {
                  // color: "#e7e7e7",
                }
              }
            />
            <FormControl
              size="small"
              fullWidth
              sx={{ display: "flex", flexDirection: "row" }}
            >
              <InputLabel
                sx={{
                  color: "#979797",
                  fontSize: 14,
                }}
              >
                {!secondaryCategoryOptions ||
                secondaryCategoryOptions.length === 0
                  ? "Add event to see possible groups"
                  : !checkAllEventsSameID()
                    ? "Events must be of the same kind"
                    : ""}
              </InputLabel>
              <Select
                value={selectedSecondaryCategory}
                sx={{
                  width: "90%",
                }}
                disabled={
                  !secondaryCategoryOptions ||
                  secondaryCategoryOptions.length === 0 ||
                  !checkAllEventsSameID()
                }
                onChange={(e) => onSecondaryCategorySelected(e.target.value)}
              >
                <MenuItem value={""}>None</MenuItem>
                {secondaryCategoryOptions.map((o) => (
                  <MenuItem value={o.id}>{o.name}</MenuItem>
                ))}
              </Select>
              <Tooltip
                disableInteractive
                title={`You aren't able to add more events (not values!) into the dataset while having any secondary dimension selected in the field`}
                placement="top"
              >
                <IconButton
                  sx={{ borderRadius: 5, cursor: "default !important" }}
                >
                  <InfoSharpIcon color="primary" />
                </IconButton>
              </Tooltip>
            </FormControl>
          </div> */}
    </div>
  );
};

export default DimensionSelector;
