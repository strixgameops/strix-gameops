import React, { useState, useEffect } from "react";
import s from "../css/funnelChart.module.css";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import RemoveIcon from "@mui/icons-material/Remove";
import Button from "@mui/material/Button";

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

import useApi from "@strix/api";

import { useGame, useBranch } from "@strix/gameContext";

const conditions_numeric = ["<", "<=", ">", ">=", "=", "!="];
const conditions_string = [
  "contains",
  "starts with",
  "ends with",
  "is",
  "is not",
];

function FunnelFilterItem({
  handleFilterChange_TargetField,
  handleFilterChange_Condition,
  handleFilterChange_Value,
  handleFilterRemove,
  clickedEvent,
  filterData,
  index,
}) {
  const { getAllAnalyticsEvents } = useApi();

  const { game } = useGame();
  const { branch } = useBranch();

  const [filters, setFilters] = useState();

  useEffect(() => {
    fetchAnalyticsEvents();
  }, []);

  const [designEvents, setDesignEvents] = useState([]);
  useEffect(() => {
    if (clickedEvent === undefined || designEvents.length === 0) return;

    if (reservedEvents.find((e) => e.id === clickedEvent.id) === undefined) {
      let tempFilters = designEvents
        .find((e) => e.id === clickedEvent.id)
        .values.map((value, i) => {
          console.log("value", value);
          return {
            type: value.valueFormat === "string" ? "string" : "numeric",
            name: value.valueName,
            targetField: value.valueID,
          };
        });
      setFilters(tempFilters);
    } else {
      setFilters(reservedEvents.find((e) => e.id === clickedEvent.id).filters);
    }
  }, [designEvents]);

  async function fetchAnalyticsEvents() {
    const resp = await getAllAnalyticsEvents({
      gameID: game.gameID,
      branch: branch,
      getRemoved: false,
    });
    let events = resp.events.map((event) => ({
      id: event.eventID,
      values: event.values,
    }));
    setDesignEvents(events);
  }

  if (filterData === undefined || !filters) return <div></div>;

  const conditions_numeric = ["<", "<=", ">", ">=", "=", "!="];
  const conditions_string = [
    "contains",
    "starts with",
    "ends with",
    "is",
    "is not",
  ];

  function handleFloatInput(value) {
    // Real-world value input
    let currentInputValue = value;

    if (currentInputValue === ".") {
      currentInputValue = "0.";
    }

    let sanitizedValue = currentInputValue.replace(/[^0-9.]/g, "");

    let dotCount = sanitizedValue.split(".").length - 1;

    if (dotCount > 1) {
      sanitizedValue =
        sanitizedValue.split(".").slice(0, 2).join(".") +
        sanitizedValue.split(".").slice(2).join("");
    }

    if (
      sanitizedValue.startsWith("0") &&
      sanitizedValue.length > 1 &&
      sanitizedValue[1] !== "."
    ) {
      sanitizedValue = "0." + sanitizedValue.slice(1);
    }

    dotCount = sanitizedValue.split(".").length - 1;

    return sanitizedValue;
  }

  function preProcessValue(value, index) {
    if (
      filters.find((f) => f.targetField === filterData.targetField).type ===
      "numeric"
    ) {
      value = handleFloatInput(value);
    }
    handleFilterChange_Value(value, index);
  }

  return (
    <div className={s.filterItemRow}>
      <FormControl fullWidth size="small" sx={{ width: "150px" }}>
        <InputLabel>Field</InputLabel>
        <Select
          size="small"
          value={filterData.targetField}
          label="Field"
          onChange={(e) =>
            handleFilterChange_TargetField(e.target.value, index)
          }
        >
          {filters.map((filter, index) => (
            <MenuItem key={index} value={filter.targetField}>
              {filter.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl
        fullWidth
        size="small"
        sx={{ width: "150px" }}
        disabled={filterData.targetField === ""}
      >
        <InputLabel>Condition</InputLabel>
        <Select
          size="small"
          value={filterData.condition}
          label="Condition"
          onChange={(e) => handleFilterChange_Condition(e.target.value, index)}
        >
          {filterData.targetField !== "" &&
            filters.find((f) => f.targetField === filterData.targetField)
              ?.type === "numeric" &&
            conditions_numeric.map((condition, index) => (
              <MenuItem key={index} value={condition}>
                {condition}
              </MenuItem>
            ))}
          {filterData.targetField !== "" &&
            filters.find((f) => f.targetField === filterData.targetField)
              ?.type === "string" &&
            conditions_string.map((condition, index) => (
              <MenuItem key={index} value={condition}>
                {condition}
              </MenuItem>
            ))}
        </Select>
      </FormControl>

      <TextField
        spellCheck={false}
        onChange={(e) => preProcessValue(e.target.value, index)}
        value={filterData.value}
        disabled={filterData.condition === ""}
        size="small"
        label="Value"
        variant="outlined"
      />

      <Button onClick={() => handleFilterRemove(index)} sx={{ ml: 0 }}>
        <RemoveIcon htmlColor="#cbcbcb" />
      </Button>
    </div>
  );
}

export default FunnelFilterItem;
