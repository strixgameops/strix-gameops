import React, { useRef, useEffect, useState } from "react";
import { useGame, useBranch } from "@strix/gameContext";
import useApi from "@strix/api";
import SearchEventField from "./SearchEventField";
import s from "./eventSearcher.module.css";

// MUI
import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import ClearIcon from "@mui/icons-material/Clear";
import { TextField } from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";

import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";
import RemoveIcon from "@mui/icons-material/Remove";
import LoadingButton from "@mui/lab/LoadingButton";

const ModalEventSearcher = ({
  onApply,
  allAnalyticsEvents,
  eventToEdit,
  changeEvent,
  chosenSecondaryDimension,
  allOffersNames,
  allCurrenciesNames,
  forbiddenCountingMethods = [],
}) => {
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 800,
    height: "fit-content",
    maxHeight: 800,
    bgcolor: "var(--bg-color3)",
    border: "1px solid #625FF440",
    boxShadow: `0px 0px 5px 2px rgba(98, 95, 244, 0.2)`,

    display: "flex",
    flexDirection: "column",

    borderRadius: "2rem",
    overflow: "hidden",
  };

  const { game } = useGame();
  const { branch, environment } = useBranch();

  const emptyQuery = {
    queryMethod: "",
    queryCategoryFilters: [],
    queryValueFilters: [],
    queryAnalyticEventID: [],
    axisID: "y",
  };
  const [analyticsQuery, setAnalyticsQuery] = useState(
    eventToEdit ? eventToEdit.target : emptyQuery
  );

  function getEventObj(eventIDToFind) {
    return allAnalyticsEvents.find((event) => event.eventID === eventIDToFind);
  }

  const [targetEvent, setTargetEvent] = useState({});
  const [selectedTargetValue, setSelectedTargetValue] = useState({});
  const [selectedCountMethod, setSelectedCountMethod] = useState("");
  const [countMethodSecondaryValue, setCountMethodSecondaryValue] =
    useState("");
  async function onTargetEventSelected(eventObj, hardSetValue) {
    setTargetEvent(eventObj);

    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryValueFilters: [],
      queryCategoryFilters: [],
      queryEventTargetValueId: "",
      queryMethod: "",
      queryAnalyticEventID: eventObj.eventID,
    }));

    if (hardSetValue) {
      onElementTargetValueChange(hardSetValue);
    } else {
      setSelectedTargetValue("");
    }
    setSelectedCountMethod("");
    setCountMethodSecondaryValue("");
  }

  useEffect(() => {
    if (eventToEdit) {
      setTargetEvent(getEventObj(eventToEdit.target.queryAnalyticEventID));
      setSelectedCountMethod(eventToEdit.target.queryMethod);
      setSelectedTargetValue(
        getEventObj(eventToEdit.target.queryAnalyticEventID).values.find(
          (v) => v.uniqueID === eventToEdit.target.queryEventTargetValueId
        )
      );
    }
  }, [eventToEdit]);

  useEffect(() => {
    if (!eventToEdit) {
      if (targetEvent) {
        setAnalyticsQuery((prevElement) => ({
          ...prevElement,
          queryValueFilters: [],
          queryCategoryFilters: [],

          queryAnalyticEventID: targetEvent.eventID,
        }));
      } else {
        setAnalyticsQuery(emptyQuery);
      }
    }
  }, [targetEvent]);

  const [offersNames, setOffersNames] = useState(allOffersNames || []);
  const [entityCurrencies, setEntityCurrencies] = useState(
    allCurrenciesNames || []
  );

  function addNewValueFilter() {
    let updatedArray = analyticsQuery.queryValueFilters;
    updatedArray = [
      ...updatedArray,
      {
        condition: "",
        conditionValue: "",
        conditionSecondaryValue: "",
        conditionValueID: "",
      },
    ];
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryValueFilters: updatedArray,
    }));
  }

  function addNewCategoryFilter() {
    let updatedArray = analyticsQuery.queryCategoryFilters;
    updatedArray = [
      ...updatedArray,
      {
        conditionField: "",
        condition: "",
        conditionValue: "",
        conditionSecondaryValue: "",
      },
    ];
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryCategoryFilters: updatedArray,
    }));
  }

  function onSelectElementConditionEventValue(chosenEvent, conditionIndex) {
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryValueFilters: prevElement.queryValueFilters.map((condition, i) =>
        i === conditionIndex
          ? {
              ...condition,
              conditionValueID: chosenEvent.target.value,
              conditionValue: "",
              conditionSecondaryValue: "",
            }
          : condition
      ),
    }));
  }
  function onChangeCategoryFilter_SetDimension(chosenEvent, conditionIndex) {
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryCategoryFilters: prevElement.queryCategoryFilters.map(
        (condition, i) =>
          i === conditionIndex
            ? {
                ...condition,
                conditionField: chosenEvent.target.value,
                conditionValue: "",
                conditionSecondaryValue: "",
              }
            : condition
      ),
    }));
  }
  function onSelectElementCondition(conditionString, valueIndex) {
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryValueFilters: prevElement.queryValueFilters.map((condition, i) =>
        i === valueIndex
          ? { ...condition, condition: conditionString.target.value }
          : condition
      ),
    }));
  }
  function onChangeCategoryFilter_SetCondition(conditionString, valueIndex) {
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryCategoryFilters: prevElement.queryCategoryFilters.map(
        (condition, i) =>
          i === valueIndex
            ? { ...condition, condition: conditionString.target.value }
            : condition
      ),
    }));
  }
  function onElementConditionValueChange(e, valueID, conditionIndex) {
    let inputValue = e.target.value;

    let targetEventValue = targetEvent.values.find(
      (value) => value.uniqueID === valueID
    );

    // Format values based on their type
    //
    // Format value as integer
    if (targetEventValue.valueFormat === "integer") {
      // Remove all non-numeric symbols
      inputValue = inputValue.replace(/[^0-9]/g, "");

      // Remove leading zeros
      inputValue = inputValue.replace(/^0+/, "");
    }
    // Format value as float if we're dealing with floats or money value type
    if (
      targetEventValue.valueFormat === "float" ||
      targetEventValue.valueFormat === "money"
    ) {
      // Remove all NaN symbols
      inputValue = inputValue.replace(/[^0-9.]/g, "");
      // Adding dot when needed
      if (
        inputValue.startsWith("0") &&
        inputValue.length > 1 &&
        inputValue[1] !== "."
      ) {
        inputValue = "0." + inputValue.slice(1);
      }
    }
    // Format value as percentile
    if (targetEventValue.valueFormat === "percentile") {
      // Remove all non-numeric symbols
      inputValue = inputValue.replace(/[^0-9]/g, "");

      // Remove leading zeros
      inputValue = inputValue.replace(/^0+/, "");

      // Ensure the value is a number
      const numericValue = parseInt(inputValue, 10);

      // Clamp the value between 0 and 100
      inputValue = Math.min(100, Math.max(0, numericValue));
    }

    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryValueFilters: prevElement.queryValueFilters.map((condition, i) =>
        i === conditionIndex
          ? { ...condition, conditionValue: inputValue }
          : condition
      ),
    }));
  }
  function onChangeCategoryFilter_SetValue(inputValue, conditionIndex) {
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryCategoryFilters: prevElement.queryCategoryFilters.map(
        (condition, i) =>
          i === conditionIndex
            ? { ...condition, conditionValue: inputValue }
            : condition
      ),
    }));
  }
  function onChangeCategoryFilter_SetSecondaryValue(
    inputValue,
    conditionIndex
  ) {
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryCategoryFilters: prevElement.queryCategoryFilters.map(
        (condition, i) =>
          i === conditionIndex
            ? { ...condition, conditionSecondaryValue: inputValue }
            : condition
      ),
    }));
  }
  function onElementConditionSecondaryValueChange(e, valueIndex) {
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryValueFilters: prevElement.queryValueFilters.map((condition, i) =>
        i === valueIndex
          ? { ...condition, conditionSecondaryValue: e.target.value }
          : condition
      ),
    }));
  }
  function onElementTargetValueChange(value) {
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryEventTargetValueId: value.uniqueID,
    }));
    setSelectedTargetValue(value);
    onElementCountMethodChange("");
  }
  function onElementCountMethodChange(value) {
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryMethod: value,
    }));
    setSelectedCountMethod(value);
    setCountMethodSecondaryValue("");
  }
  function onElementCountMethodTimeChange(e) {
    let currentInputValue = e.target.value;

    // Remove all non-numeric symbols
    let sanitizedValue = currentInputValue.replace(/[^0-9]/g, "");

    // Remove leading zeros
    sanitizedValue = sanitizedValue.replace(/^0+/, "");

    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryMethodSecondaryValue: sanitizedValue,
    }));
    setCountMethodSecondaryValue(sanitizedValue);
  }
  function removeValueCondition(index) {
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryValueFilters: prevElement.queryValueFilters.filter(
        (condition, i) => i !== index
      ),
    }));
  }
  function removeCategoryCondition(index) {
    setAnalyticsQuery((prevElement) => ({
      ...prevElement,
      queryCategoryFilters: prevElement.queryCategoryFilters.filter(
        (condition, i) => i !== index
      ),
    }));
  }
  function getValueFormatByConditionIndex(conditionIndex) {
    if (targetEvent.values === undefined) return "";
    if (
      analyticsQuery.queryValueFilters[conditionIndex]?.conditionValueID === ""
    )
      return "";

    let value = targetEvent.values.find(
      (value) =>
        value.uniqueID ===
        analyticsQuery.queryValueFilters[conditionIndex]?.conditionValueID
    )?.valueFormat;

    if (value === undefined) {
      return "";
    } else {
      return value;
    }
  }

  function cycleAxises() {
    if (analyticsQuery.axisID === "y") {
      setAnalyticsQuery((prevElement) => ({
        ...prevElement,
        axisID: "y1",
      }));
    } else if (analyticsQuery.axisID === "y1") {
      setAnalyticsQuery((prevElement) => ({
        ...prevElement,
        axisID: "x",
      }));
    } else {
      setAnalyticsQuery((prevElement) => ({
        ...prevElement,
        axisID: "y",
      }));
    }
  }

  function validateEvent() {
    if (analyticsQuery.queryMethod === "") return true;
    if (analyticsQuery.queryEventTargetValueId === "") return true;
    return false;
  }

  function pickConditionValueField(condition, valueFormat, index) {
    const regularEvents = [
      "economyEvent",
      "newSession",
      "endSession",
      "offerEvent",
      "offerShown",
      "adEvent",
      "reportEvent",
    ];
    const selectableValueIDs = ["offerID", "currencyID", "currency"];
    switch (valueFormat) {
      case "bool":
        return (
          <Select
            sx={{
              "& .MuiSelect-select": {
                paddingRight: "0px !important",
              },
            }}
            fullWidth
            value={
              analyticsQuery.queryValueFilters[index]?.conditionValue || ""
            }
            endAdornment={
              <InputAdornment position="end" sx={{ pr: 2 }}>
                {(() => {
                  switch (getValueFormatByConditionIndex(index)) {
                    case "money":
                      return "$";
                    case "string":
                      return "str";
                    case "integer":
                      return "123";
                    case "float":
                      return "1.23";
                    case "percentile":
                      return "%";
                    case "bool":
                      return "bool";
                    default:
                      return "";
                  }
                })()}
              </InputAdornment>
            }
            onChange={(e) =>
              onElementConditionValueChange(
                e,
                analyticsQuery.queryValueFilters[index]?.conditionValueID,
                index
              )
            }
          >
            <MenuItem value={"true"}>True</MenuItem>
            <MenuItem value={"false"}>False</MenuItem>
          </Select>
        );
      default:
        // if (condition.conditionValueID)
        if (
          regularEvents.includes(targetEvent.eventID) &&
          selectableValueIDs.includes(condition.conditionValueID)
        ) {
          switch (condition.conditionValueID) {
            case "offerID":
              return (
                <Select
                  sx={{
                    "& .MuiSelect-select": {
                      paddingRight: "0px !important",
                    },
                  }}
                  fullWidth
                  value={
                    analyticsQuery.queryValueFilters[index]?.conditionValue ||
                    ""
                  }
                  endAdornment={
                    <InputAdornment position="end" sx={{ pr: 2 }}>
                      {(() => {
                        switch (getValueFormatByConditionIndex(index)) {
                          case "money":
                            return "$";
                          case "string":
                            return "str";
                          case "integer":
                            return "123";
                          case "float":
                            return "1.23";
                          case "percentile":
                            return "%";
                          case "bool":
                            return "bool";
                          default:
                            return "";
                        }
                      })()}
                    </InputAdornment>
                  }
                  onChange={(e) =>
                    onElementConditionValueChange(
                      e,
                      analyticsQuery.queryValueFilters[index]?.conditionValueID,
                      index
                    )
                  }
                >
                  {offersNames.map((offer) => (
                    <MenuItem value={offer.offerID}>{offer.offerName}</MenuItem>
                  ))}
                </Select>
              );
            case "currency":
            case "currencyID":
              return (
                <Select
                  sx={{
                    "& .MuiSelect-select": {
                      paddingRight: "0px !important",
                    },
                  }}
                  fullWidth
                  value={
                    analyticsQuery.queryValueFilters[index]?.conditionValue ||
                    ""
                  }
                  endAdornment={
                    <InputAdornment position="end" sx={{ pr: 2 }}>
                      {(() => {
                        switch (getValueFormatByConditionIndex(index)) {
                          case "money":
                            return "$";
                          case "string":
                            return "str";
                          case "integer":
                            return "123";
                          case "float":
                            return "1.23";
                          case "percentile":
                            return "%";
                          case "bool":
                            return "bool";
                          default:
                            return "";
                        }
                      })()}
                    </InputAdornment>
                  }
                  onChange={(e) =>
                    onElementConditionValueChange(
                      e,
                      analyticsQuery.queryValueFilters[index]?.conditionValueID,
                      index
                    )
                  }
                >
                  {entityCurrencies.map((entity) => (
                    <MenuItem value={entity.nodeID}>
                      {entity.entityBasic.entityID}
                    </MenuItem>
                  ))}
                </Select>
              );
          }
        } else {
          return (
            <OutlinedInput
              spellCheck={false}
              id="outlined-adornment-weight"
              value={
                analyticsQuery.queryValueFilters[index]?.conditionValue || ""
              }
              onChange={(e) =>
                onElementConditionValueChange(
                  e,
                  analyticsQuery.queryValueFilters[index]?.conditionValueID,
                  index
                )
              }
              endAdornment={
                <InputAdornment position="end">
                  {(() => {
                    switch (getValueFormatByConditionIndex(index)) {
                      case "money":
                        return "$";
                      case "string":
                        return "str";
                      case "integer":
                        return "123";
                      case "float":
                        return "1.23";
                      case "percentile":
                        return "%";
                      case "bool":
                        return "bool";
                      default:
                        return "";
                    }
                  })()}
                </InputAdornment>
              }
              aria-describedby="outlined-weight-helper-text"
              inputProps={{
                "aria-label": "weight",
              }}
            />
          );
        }
    }
  }

  function getCountingMethods() {
    let methods = [];
    if (!forbiddenCountingMethods.includes("mostRecent")) {
      methods.push(
        <MenuItem className="dropdown-option" value={"mostRecent"}>
          Last Received Value
        </MenuItem>
      );
    }
    if (!forbiddenCountingMethods.includes("firstReceived")) {
      methods.push(
        <MenuItem className="dropdown-option" value={"firstReceived"}>
          First Received Value
        </MenuItem>
      );
    }
    if (!forbiddenCountingMethods.includes("mostCommon")) {
      methods.push(
        <MenuItem className="dropdown-option" value={"mostCommon"}>
          Most Common Value
        </MenuItem>
      );
    }
    if (!forbiddenCountingMethods.includes("leastCommon")) {
      methods.push(
        <MenuItem className="dropdown-option" value={"leastCommon"}>
          Least Common Value
        </MenuItem>
      );
    }
    if (!forbiddenCountingMethods.includes("meanForTime")) {
      methods.push(
        <MenuItem
          disabled={
            selectedTargetValue.valueFormat === "string" ||
            selectedTargetValue.valueFormat === "bool" ||
            !isAnyValueSelected()
          }
          className="dropdown-option"
          value={"meanForTime"}
        >
          Mean Value For The Last N Days
        </MenuItem>
      );
    }
    if (!forbiddenCountingMethods.includes("numberOfEventsForTime")) {
      methods.push(
        <MenuItem className="dropdown-option" value={"numberOfEventsForTime"}>
          Count For The Last N Days
        </MenuItem>
      );
    }
    if (!forbiddenCountingMethods.includes("mean")) {
      methods.push(
        <MenuItem
          disabled={
            selectedTargetValue?.valueFormat === "string" ||
            selectedTargetValue?.valueFormat === "bool"
          }
          className="dropdown-option"
          value={"mean"}
        >
          Avg. Value
        </MenuItem>
      );
    }
    if (!forbiddenCountingMethods.includes("numberOfEvents")) {
      methods.push(
        <MenuItem className="dropdown-option" value={"numberOfEvents"}>
          Count
        </MenuItem>
      );
    }
    if (!forbiddenCountingMethods.includes("summ")) {
      methods.push(
        <MenuItem
          disabled={
            selectedTargetValue?.valueFormat === "string" ||
            selectedTargetValue?.valueFormat === "percentile"
          }
          className="dropdown-option"
          value={"summ"}
        >
          Sum of Values
        </MenuItem>
      );
    }
    if (!forbiddenCountingMethods.includes("summForTime")) {
      methods.push(
        <MenuItem
          disabled={
            selectedTargetValue.valueFormat === "string" ||
            selectedTargetValue.valueFormat === "percentile"
          }
          className="dropdown-option"
          value={"summForTime"}
        >
          Sum of Values For The Last N Days
        </MenuItem>
      );
    }
    return methods;
  }
  function isAnyValueSelected() {
    return selectedTargetValue.uniqueID !== undefined &&
      selectedTargetValue.uniqueID !== ""
      ? true
      : false;
  }

  return (
    <Box sx={style}>
      <Box sx={{ p: 4, overflowY: "auto", scrollbarWidth: "thin" }}>
        <SearchEventField
          hardSelectEvent={
            eventToEdit && getEventObj(eventToEdit.target.queryAnalyticEventID)
          }
          onTargetEventSelected={onTargetEventSelected}
          allEvents={allAnalyticsEvents}
          chosenSecondaryDimension={chosenSecondaryDimension}
        />

        <div className={s.playerwarehouseModal}>
          {targetEvent !== undefined &&
            targetEvent.values &&
            targetEvent.values.length > 0 && (
              <div>
                <div className={s.targetValueInputsContainer}>
                  {/* <Tooltip title="Axis" placement="top">
                    <Button
                      onClick={() => cycleAxises()}
                      variant="outlined"
                      sx={{
                        m: 0,
                        p: 0,
                        width: "35px",
                        minWidth: "35px",
                        height: "40px",
                        minHeight: "40px",
                        textTransform: "none",
                        fontSize: "16px",
                        fontWeight: "semibold",
                      }}
                    >
                      {analyticsQuery.axisID}
                    </Button>
                  </Tooltip> */}

                  <FormControl size="small" sx={{ m: 1, minWidth: 300 }}>
                    <InputLabel>Event value</InputLabel>
                    <Select
                      onChange={(e) =>
                        onElementTargetValueChange(
                          targetEvent.values.find(
                            (v) => v.uniqueID === e.target.value
                          )
                        )
                      }
                      autoWidth
                      value={selectedTargetValue.uniqueID || ""}
                      label="Event value"
                      endAdornment={
                        <InputAdornment sx={{ pr: 2 }} position="end">
                          {(() => {
                            switch (selectedTargetValue?.valueFormat) {
                              case "money":
                                return "$";
                              case "string":
                                return "str";
                              case "integer":
                                return "123";
                              case "float":
                                return "1.23";
                              case "percentile":
                                return "%";
                              default:
                                return "";
                            }
                          })()}
                        </InputAdornment>
                      }
                    >
                      {targetEvent.values.map((valueObj, index) => (
                        <MenuItem key={index} value={valueObj.uniqueID}>
                          {valueObj.valueName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl
                    size="small"
                    sx={{ m: 1, minWidth: 200 }}
                    disabled={
                      selectedTargetValue?.uniqueID !== undefined &&
                      selectedTargetValue?.uniqueID !== ""
                        ? false
                        : true
                    }
                  >
                    <InputLabel id="demo-simple-select-small-label">
                      Counting method
                    </InputLabel>
                    <Select
                      labelId="demo-simple-select-autowidth-label"
                      id="demo-simple-select-autowidth"
                      onChange={(e) =>
                        onElementCountMethodChange(e.target.value)
                      }
                      value={selectedCountMethod}
                      autoWidth
                      label="Counting method"
                    >
                      {getCountingMethods()}
                    </Select>
                  </FormControl>
                  {(selectedCountMethod === "meanForTime" ||
                    selectedCountMethod === "summForTime" ||
                    selectedCountMethod === "numberOfEventsForTime") && (
                    <div className="methodTimeInput">
                      <TextField
                        spellCheck={false}
                        id="fullWidth"
                        value={countMethodSecondaryValue}
                        onChange={onElementCountMethodTimeChange}
                        size="small"
                        label="Days"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
        <div className={s.conditionsListBody}>
          {targetEvent !== undefined &&
            targetEvent.values &&
            targetEvent.values.length > 0 && (
              <div className={s.conditionsBody}>
                <div className={s.conditionsHeader}>
                  <Typography
                    variant="h5"
                    color={"text.secondary"}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "start",
                      fontSize: "16px",
                      fontWeight: "regular",
                      textAlign: "center",
                    }}
                  >
                    Value filters
                  </Typography>
                  <Tooltip
                    disableInteractive
                    title={`Value filters are used to filter events by their custom
                        values. For example, to view only events that have a
                        certain value in certain field. If you want to filter by
                        a specific category (e.g. "Country" or "Game Version"),
                        you should use "Category filters" instead.`}
                    placement="top"
                  >
                    <IconButton
                      sx={{ borderRadius: 5, cursor: "default !important" }}
                    >
                      <InfoSharpIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                </div>

                <Box
                  sx={{
                    p: 1,
                    border: "1px solid #40367D",
                    borderRadius: "2rem",
                  }}
                >
                  {analyticsQuery.queryValueFilters.map((condition, index) => (
                    <Box sx={{ p: 0 }}>
                      <div className={s.valueContainer} key={index}>
                        <FormControl size="small" sx={{ m: 1, width: "70%" }}>
                          <InputLabel id="demo-simple-select-small-label">
                            Event Value
                          </InputLabel>
                          <Select
                            labelId="demo-simple-select-autowidth-label"
                            id="demo-simple-select-autowidth"
                            value={
                              analyticsQuery.queryValueFilters[index]
                                ?.conditionValueID || ""
                            }
                            onChange={(e) =>
                              onSelectElementConditionEventValue(e, index)
                            }
                            autoWidth
                            label="Event Value"
                          >
                            {targetEvent.values.map((value) => [
                              <MenuItem
                                className="dropdown-option"
                                key={value.uniqueID}
                                value={value.uniqueID}
                              >
                                {value.valueName}
                              </MenuItem>,
                            ])}
                          </Select>
                        </FormControl>

                        <FormControl
                          size="small"
                          sx={{ m: 1, minWidth: 120 }}
                          disabled={
                            analyticsQuery.queryValueFilters[index]
                              ?.conditionValueID === "" || false
                          }
                        >
                          <InputLabel id="demo-simple-select-small-label">
                            Condition
                          </InputLabel>
                          <Select
                            labelId="demo-simple-select-autowidth-label"
                            id="demo-simple-select-autowidth"
                            value={
                              analyticsQuery.queryValueFilters[index]
                                ?.condition || ""
                            }
                            onChange={(e) => onSelectElementCondition(e, index)}
                            autoWidth
                            label="Condition"
                          >
                            {getValueFormatByConditionIndex(index) ===
                              "integer" && [
                              <MenuItem
                                className="dropdown-option"
                                key="equal"
                                value={"="}
                              >
                                Is Equal (=)
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="notEqual"
                                value={"!="}
                              >
                                Is Not Equal (!=)
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="moreThan"
                                value={">"}
                              >
                                More than ({">"})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="lessThan"
                                value={"<"}
                              >
                                Less than ({"<"})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="moreThanOrEqual"
                                value={">="}
                              >
                                More than or Equal to ({">="})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="lessThanOrEqual"
                                value={"<="}
                              >
                                Less than or Equal to ({"<="})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="inrange"
                                value={"range"}
                              >
                                In Range
                              </MenuItem>,
                            ]}
                            {getValueFormatByConditionIndex(index) ===
                              "string" && [
                              <MenuItem
                                className="dropdown-option"
                                key="is"
                                value={"is"}
                              >
                                Is
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="isNot"
                                value={"isNot"}
                              >
                                Is Not
                              </MenuItem>,
                            ]}
                            {getValueFormatByConditionIndex(index) ===
                              "bool" && [
                              <MenuItem
                                className="dropdown-option"
                                key="is"
                                value={"is"}
                              >
                                Is
                              </MenuItem>,
                            ]}
                            {getValueFormatByConditionIndex(index) ===
                              "float" && [
                              <MenuItem
                                className="dropdown-option"
                                key="equal"
                                value={"="}
                              >
                                Is Equal (=)
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="notEqual"
                                value={"!="}
                              >
                                Is Not Equal (!=)
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="moreThan"
                                value={">"}
                              >
                                More than ({">"})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="lessThan"
                                value={"<"}
                              >
                                Less than ({"<"})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="moreThanOrEqual"
                                value={">="}
                              >
                                More than or Equal to ({">="})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="lessThanOrEqual"
                                value={"<="}
                              >
                                Less than or Equal to ({"<="})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="inrange"
                                value={"range"}
                              >
                                In Range
                              </MenuItem>,
                            ]}
                            {getValueFormatByConditionIndex(index) ===
                              "percentile" && [
                              <MenuItem
                                className="dropdown-option"
                                key="equal"
                                value={"="}
                              >
                                Is Equal (=)
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="notEqual"
                                value={"!="}
                              >
                                Is Not Equal (!=)
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="moreThan"
                                value={">"}
                              >
                                More than ({">"})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="lessThan"
                                value={"<"}
                              >
                                Less than ({"<"})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="moreThanOrEqual"
                                value={">="}
                              >
                                More than or Equal to ({">="})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="lessThanOrEqual"
                                value={"<="}
                              >
                                Less than or Equal to ({"<="})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="inrange"
                                value={"range"}
                              >
                                In Range
                              </MenuItem>,
                            ]}
                            {getValueFormatByConditionIndex(index) ===
                              "money" && [
                              <MenuItem
                                className="dropdown-option"
                                key="equal"
                                value={"="}
                              >
                                Is Equal (=)
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="notEqual"
                                value={"!="}
                              >
                                Is Not Equal (!=)
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="moreThan"
                                value={">"}
                              >
                                More than ({">"})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="lessThan"
                                value={"<"}
                              >
                                Less than ({"<"})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="moreThanOrEqual"
                                value={">="}
                              >
                                More than or Equal to ({">="})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="lessThanOrEqual"
                                value={"<="}
                              >
                                Less than or Equal to ({"<="})
                              </MenuItem>,
                              <MenuItem
                                className="dropdown-option"
                                key="inrange"
                                value={"range"}
                              >
                                In Range
                              </MenuItem>,
                            ]}
                          </Select>
                        </FormControl>
                        <FormControl
                          size="small"
                          sx={{ m: 1, width: "25ch" }}
                          variant="outlined"
                          disabled={
                            analyticsQuery.queryValueFilters[index]
                              ?.condition === ""
                          }
                        >
                          {pickConditionValueField(
                            condition,
                            getValueFormatByConditionIndex(index),
                            index
                          )}
                        </FormControl>
                        {analyticsQuery.queryValueFilters[index]?.condition ===
                          "range" && <div>-</div>}
                        {analyticsQuery.queryValueFilters[index]?.condition ===
                          "range" && (
                          <FormControl
                            size="small"
                            sx={{ m: 1, width: "25ch" }}
                            variant="outlined"
                          >
                            <OutlinedInput
                              spellCheck={false}
                              id="outlined-adornment-weight"
                              value={
                                analyticsQuery.queryValueFilters[index]
                                  ?.conditionSecondaryValue || ""
                              }
                              onChange={(e) =>
                                onElementConditionSecondaryValueChange(e, index)
                              }
                              endAdornment={
                                <InputAdornment position="end">
                                  {(() => {
                                    switch (
                                      getValueFormatByConditionIndex(index)
                                    ) {
                                      case "money":
                                        return "$";
                                      case "string":
                                        return "str";
                                      case "integer":
                                        return "123";
                                      case "float":
                                        return "1.23";
                                      case "percentile":
                                        return "%";
                                      case "bool":
                                        return "bool";
                                      default:
                                        return "";
                                    }
                                  })()}
                                </InputAdornment>
                              }
                              aria-describedby="outlined-weight-helper-text"
                              inputProps={{
                                "aria-label": "weight",
                              }}
                            />
                          </FormControl>
                        )}

                        <IconButton onClick={() => removeValueCondition(index)}>
                          <RemoveIcon />
                        </IconButton>
                      </div>
                    </Box>
                  ))}

                  <Button
                    variant="outlined"
                    disabled={selectedTargetValue === ""}
                    onClick={addNewValueFilter}
                  >
                    Add condition
                  </Button>
                </Box>
              </div>
            )}
        </div>

        <div className={s.conditionsListBody}>
          {targetEvent !== undefined &&
            targetEvent.values &&
            targetEvent.values.length > 0 && (
              <div className={s.conditionsBody}>
                <div className={s.conditionsHeader}>
                  <Typography
                    variant="h5"
                    color={"text.secondary"}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "start",
                      fontSize: "16px",
                      fontWeight: "regular",
                      textAlign: "center",
                      pb: 1.2,
                    }}
                  >
                    Category filters
                  </Typography>
                </div>

                <Box
                  sx={{
                    p: 1,
                    border: "1px solid #40367D",
                    borderRadius: "2rem",
                  }}
                >
                  {analyticsQuery.queryCategoryFilters.map(
                    (condition, index) => (
                      <Box sx={{ p: 0 }}>
                        <div className={s.valueContainer} key={index}>
                          <FormControl size="small" sx={{ m: 1, width: "70%" }}>
                            <InputLabel id="demo-simple-select-small-label">
                              Dimension
                            </InputLabel>
                            <Select
                              labelId="demo-simple-select-autowidth-label"
                              id="demo-simple-select-autowidth"
                              value={
                                analyticsQuery.queryCategoryFilters[index]
                                  ?.conditionField || ""
                              }
                              onChange={(e) =>
                                onChangeCategoryFilter_SetDimension(e, index)
                              }
                              autoWidth
                              label="Dimension"
                            >
                              <MenuItem value={"engineVersion"}>
                                Engine version
                              </MenuItem>
                              <MenuItem value={"gameVersion"}>
                                Game version
                              </MenuItem>
                              <MenuItem value={"platform"}>Platform</MenuItem>
                              <MenuItem value={"language"}>Language</MenuItem>
                              <MenuItem value={"country"}>Country</MenuItem>
                            </Select>
                          </FormControl>

                          <FormControl
                            size="small"
                            sx={{ m: 1, minWidth: 120 }}
                            disabled={
                              analyticsQuery.queryCategoryFilters[index]
                                ?.conditionField === "" || false
                            }
                          >
                            <InputLabel id="demo-simple-select-small-label">
                              Condition
                            </InputLabel>
                            <Select
                              labelId="demo-simple-select-autowidth-label"
                              id="demo-simple-select-autowidth"
                              value={
                                analyticsQuery.queryCategoryFilters[index]
                                  ?.condition || ""
                              }
                              onChange={(e) =>
                                onChangeCategoryFilter_SetCondition(e, index)
                              }
                              autoWidth
                              label="Condition"
                            >
                              <MenuItem
                                className="dropdown-option"
                                key="is"
                                value={"is"}
                              >
                                Is
                              </MenuItem>
                              <MenuItem
                                className="dropdown-option"
                                key="isNot"
                                value={"isNot"}
                              >
                                Is Not
                              </MenuItem>
                            </Select>
                          </FormControl>

                          <FormControl
                            size="small"
                            sx={{ m: 1, width: "25ch" }}
                            variant="outlined"
                            disabled={
                              analyticsQuery.queryCategoryFilters[index]
                                ?.condition === ""
                            }
                          >
                            <OutlinedInput
                              spellCheck={false}
                              id="outlined-adornment-weight"
                              value={
                                analyticsQuery.queryCategoryFilters[index]
                                  ?.conditionValue || ""
                              }
                              onChange={(e) =>
                                onChangeCategoryFilter_SetValue(
                                  e.target.value,
                                  index
                                )
                              }
                              endAdornment={
                                <InputAdornment position="end">
                                  {(() => {
                                    return "str";
                                  })()}
                                </InputAdornment>
                              }
                              aria-describedby="outlined-weight-helper-text"
                              inputProps={{
                                "aria-label": "weight",
                              }}
                            />
                          </FormControl>
                          {analyticsQuery.queryCategoryFilters[index]
                            ?.condition === "range" && <div>-</div>}
                          {analyticsQuery.queryCategoryFilters[index]
                            ?.condition === "range" && (
                            <FormControl
                              size="small"
                              sx={{ m: 1, width: "25ch" }}
                              variant="outlined"
                            >
                              <OutlinedInput
                                spellCheck={false}
                                id="outlined-adornment-weight"
                                value={
                                  analyticsQuery.queryCategoryFilters[index]
                                    ?.conditionSecondaryValue || ""
                                }
                                onChange={(e) =>
                                  onChangeCategoryFilter_SetSecondaryValue(
                                    e,
                                    index
                                  )
                                }
                                endAdornment={
                                  <InputAdornment position="end">
                                    {(() => {
                                      return "str";
                                    })()}
                                  </InputAdornment>
                                }
                                aria-describedby="outlined-weight-helper-text"
                                inputProps={{
                                  "aria-label": "weight",
                                }}
                              />
                            </FormControl>
                          )}

                          <IconButton
                            onClick={() => removeCategoryCondition(index)}
                          >
                            <RemoveIcon />
                          </IconButton>
                        </div>
                      </Box>
                    )
                  )}

                  <Button
                    variant="outlined"
                    disabled={selectedTargetValue === ""}
                    onClick={addNewCategoryFilter}
                  >
                    Add condition
                  </Button>
                </Box>
              </div>
            )}
        </div>

        <Button
          sx={{ mt: 4 }}
          variant="contained"
          onClick={() => {
            if (eventToEdit && eventToEdit.target) {
              changeEvent(analyticsQuery, eventToEdit.index);
            } else {
              onApply(analyticsQuery);
            }
          }}
          disabled={validateEvent()}
        >
          {eventToEdit ? "Edit event" : "Add event"}
        </Button>
      </Box>
    </Box>
  );
};

export default ModalEventSearcher;
