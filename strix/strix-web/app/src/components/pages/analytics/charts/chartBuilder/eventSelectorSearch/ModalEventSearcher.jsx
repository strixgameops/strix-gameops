import React, { useRef, useEffect, useState } from "react";
import { useGame, useBranch } from "@strix/gameContext";
import useApi from "@strix/api";
import SearchEventField from "./SearchEventField";
import { styled } from "@mui/material/styles";

// MUI
import {
  Typography,
  Button,
  Modal,
  Box,
  Tooltip,
  TextField,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Fade,
  Slide,
} from "@mui/material";
import {
  Close as CloseIcon,
  Info as InfoIcon,
  Remove as RemoveIcon,
} from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";

// Styled Components
const StyledModal = styled(Modal)(({ theme }) => ({
  "& .MuiBackdrop-root": {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(8px)",
  },
}));

const ModalContainer = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 900,
  maxHeight: "90vh",
  background: "#ffffff",
  borderRadius: "20px",
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
  border: "1px solid #e1e5e9",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-2px",
    left: "-2px",
    right: "-2px",
    bottom: "-2px",
    background: "linear-gradient(45deg, #6f63ff20, #22c55e20, #f59e0b20)",
    borderRadius: "22px",
    zIndex: -1,
  },
}));

const ModalHeader = styled(Box)(({ theme }) => ({
  background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
  borderBottom: "2px solid #e1e5e9",
  padding: "24px 32px",
  position: "relative",
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    width: "4px",
    height: "100%",
    background: "linear-gradient(180deg, #6f63ff 0%, #6f63ffdd 100%)",
  },
}));

const ModalContent = styled(Box)(({ theme }) => ({
  padding: "32px",
  minHeight: "500px",
  background: "#fafbfc",
  overflowY: "auto",
  scrollbarWidth: "thin",
  "&::-webkit-scrollbar": {
    width: "6px",
  },
  "&::-webkit-scrollbar-track": {
    background: "#f1f1f1",
    borderRadius: "10px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "#6f63ff40",
    borderRadius: "10px",
    "&:hover": {
      background: "#6f63ff60",
    },
  },
}));

const GradientCard = styled(Box)(({ theme, variant = "default" }) => {
  const variants = {
    default: {
      background: "#ffffff",
      border: "2px solid #6f63ff30",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    },
    primary: {
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      border: "2px solid #6f63ff40",
      boxShadow: "0 4px 20px rgba(111, 99, 255, 0.15)",
    },
  };

  return {
    ...variants[variant],
    borderRadius: "16px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    overflow: "hidden",
    marginBottom: "24px",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 12px 30px rgba(0, 0, 0, 0.12)",
      border: "2px solid #6f63ff60",
    },
  };
});

const SectionHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "16px",
  padding: "0 8px",
}));

const FilterContainer = styled(Box)(({ theme }) => ({
  padding: "20px",
  border: "2px solid #6f63ff30",
  borderRadius: "16px",
  background: "#ffffff",
  marginBottom: "8px",
  transition: "all 0.3s ease",
  "&:hover": {
    border: "2px solid #6f63ff50",
    boxShadow: "0 4px 15px rgba(111, 99, 255, 0.15)",
  },
}));

const FilterRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap",
  "&:last-child": {
    marginBottom: 0,
  },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    background: "#ffffff",
    "& fieldset": {
      borderColor: "#d1d5db",
      borderWidth: "2px",
    },
    "&:hover fieldset": {
      borderColor: "#6f63ff60",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#6f63ff",
      borderWidth: "2px",
      boxShadow: "0 0 0 3px rgba(111, 99, 255, 0.2)",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#6b7280",
    "&.Mui-focused": {
      color: "#6f63ff",
    },
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    background: "#ffffff",
    "& fieldset": {
      borderColor: "#d1d5db",
      borderWidth: "2px",
    },
    "&:hover fieldset": {
      borderColor: "#6f63ff60",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#6f63ff",
      borderWidth: "2px",
      boxShadow: "0 0 0 3px rgba(111, 99, 255, 0.2)",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#6b7280",
    "&.Mui-focused": {
      color: "#6f63ff",
    },
  },
}));

const StyledButton = styled(Button)(({ theme, buttonVariant = "primary" }) => {
  const variants = {
    primary: {
      background: "linear-gradient(135deg, #6f63ff 0%, #5b52d4 100%)",
      color: "#ffffff",
      "&:hover": {
        background: "linear-gradient(135deg, #5b52d4 0%, #4c46b8 100%)",
        boxShadow: "0 6px 20px rgba(111, 99, 255, 0.4)",
        transform: "translateY(-2px)",
      },
    },
    secondary: {
      background: "#ffffff",
      color: "#6f63ff",
      border: "2px solid #6f63ff40",
      "&:hover": {
        background: "#6f63ff10",
        border: "2px solid #6f63ff",
        transform: "translateY(-2px)",
        boxShadow: "0 4px 15px rgba(111, 99, 255, 0.25)",
      },
    },
  };

  return {
    ...variants[buttonVariant],
    fontWeight: 600,
    borderRadius: "12px",
    textTransform: "none",
    transition: "all 0.3s ease",
    minHeight: "44px",
    "&:disabled": {
      opacity: 0.6,
      transform: "none",
    },
  };
});

const IconContainer = styled(Box)(({ theme, color = "primary" }) => {
  const colors = {
    primary: "#6f63ff",
    info: "#22c55e",
  };

  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: `${colors[color]}15`,
    color: colors[color],
    border: `2px solid ${colors[color]}30`,
    transition: "all 0.3s ease",
    cursor: "pointer",
    "&:hover": {
      background: colors[color],
      color: "#ffffff",
      transform: "scale(1.05)",
      boxShadow: `0 4px 15px ${colors[color]}40`,
    },
  };
});

const TargetValueContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "24px",
}));

const ModalEventSearcher = ({
  onApply,
  close,
  open,
  allAnalyticsEvents,
  eventToEdit,
  changeEvent,
  allOffersNames,
  allCurrenciesNames,
}) => {
  const { game } = useGame();
  const { branch, environment } = useBranch();

  const emptyQuery = {
    queryMethod: "",
    queryCategoryFilters: [],
    queryValueFilters: [],
    queryAnalyticEventID: [],
    dimension: "absolute",
    categoryField: "timestamp",
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
      dimension: "absolute",
      categoryField: "timestamp",
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
      setCountMethodSecondaryValue(
        eventToEdit.target.queryMethodSecondaryValue
      );
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

  const [modalOpen, setModalOpen] = useState(false);
  useEffect(() => {
    setModalOpen(open);
  }, [open]);

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
    if (targetEventValue.valueFormat === "integer") {
      inputValue = inputValue.replace(/[^0-9]/g, "");
      inputValue = inputValue.replace(/^0+/, "");
    }
    if (
      targetEventValue.valueFormat === "float" ||
      targetEventValue.valueFormat === "money"
    ) {
      inputValue = inputValue.replace(/[^0-9.]/g, "");
      if (
        inputValue.startsWith("0") &&
        inputValue.length > 1 &&
        inputValue[1] !== "."
      ) {
        inputValue = "0." + inputValue.slice(1);
      }
    }
    if (targetEventValue.valueFormat === "percentile") {
      inputValue = inputValue.replace(/[^0-9]/g, "");
      inputValue = inputValue.replace(/^0+/, "");
      const numericValue = parseInt(inputValue, 10);
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
    let sanitizedValue = currentInputValue.replace(/[^0-9]/g, "");
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
          <StyledFormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              fullWidth
              value={
                analyticsQuery.queryValueFilters[index]?.conditionValue || ""
              }
              endAdornment={
                <InputAdornment position="end" sx={{ pr: 2 }}>
                  bool
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
          </StyledFormControl>
        );
      default:
        if (
          regularEvents.includes(targetEvent.eventID) &&
          selectableValueIDs.includes(condition.conditionValueID)
        ) {
          switch (condition.conditionValueID) {
            case "offerID":
              return (
                <StyledFormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    fullWidth
                    value={
                      analyticsQuery.queryValueFilters[index]?.conditionValue ||
                      ""
                    }
                    onChange={(e) =>
                      onElementConditionValueChange(
                        e,
                        analyticsQuery.queryValueFilters[index]
                          ?.conditionValueID,
                        index
                      )
                    }
                  >
                    {offersNames.map((offer) => (
                      <MenuItem key={offer.offerID} value={offer.offerID}>
                        {offer.offerName}
                      </MenuItem>
                    ))}
                  </Select>
                </StyledFormControl>
              );
            case "currency":
            case "currencyID":
              return (
                <StyledFormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    fullWidth
                    value={
                      analyticsQuery.queryValueFilters[index]?.conditionValue ||
                      ""
                    }
                    onChange={(e) =>
                      onElementConditionValueChange(
                        e,
                        analyticsQuery.queryValueFilters[index]
                          ?.conditionValueID,
                        index
                      )
                    }
                  >
                    {entityCurrencies.map((entity) => (
                      <MenuItem key={entity.nodeID} value={entity.nodeID}>
                        {entity.entityBasic.entityID}
                      </MenuItem>
                    ))}
                  </Select>
                </StyledFormControl>
              );
          }
        } else {
          return (
            <StyledTextField
              size="small"
              sx={{ minWidth: 200 }}
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
              InputProps={{
                endAdornment: (
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
                ),
              }}
            />
          );
        }
    }
  }

  return (
    <StyledModal
      open={modalOpen}
      onClose={() => {
        close();
      }}
    >
      <Fade in={modalOpen} timeout={600}>
        <ModalContainer>
          <ModalHeader>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  background:
                    "linear-gradient(135deg, #6f63ff 0%, #6f63ffdd 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 700,
                }}
              >
                Event Configuration
              </Typography>
              <IconButton
                onClick={() => {
                  close();
                }}
                sx={{
                  "&:hover": {
                    transform: "scale(1.1)",
                    bgcolor: "#ef444420",
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </ModalHeader>

          <ModalContent>
            <Slide in={true} direction="down" timeout={800}>
              <Box>
                <SearchEventField
                  hardSelectEvent={
                    eventToEdit &&
                    getEventObj(eventToEdit.target.queryAnalyticEventID)
                  }
                  onTargetEventSelected={onTargetEventSelected}
                  allEvents={allAnalyticsEvents}
                />
              </Box>
            </Slide>

            {targetEvent !== undefined &&
              targetEvent.values &&
              targetEvent.values.length > 0 && (
                <Slide in={true} direction="up" timeout={1000}>
                  <Box>
                    <GradientCard variant="primary">
                      <Box sx={{ p: 3 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 3,
                            color: "#1f2937",
                            fontWeight: 600,
                          }}
                        >
                          Event Configuration
                        </Typography>

                        <TargetValueContainer>
                          <StyledFormControl
                            size="small"
                            sx={{ minWidth: 300 }}
                          >
                            <InputLabel>Event value</InputLabel>
                            <Select
                              onChange={(e) =>
                                onElementTargetValueChange(
                                  targetEvent.values.find(
                                    (v) => v.uniqueID === e.target.value
                                  )
                                )
                              }
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
                          </StyledFormControl>

                          <StyledFormControl
                            size="small"
                            sx={{ minWidth: 200 }}
                            disabled={
                              selectedTargetValue?.uniqueID !== undefined &&
                              selectedTargetValue?.uniqueID !== ""
                                ? false
                                : true
                            }
                          >
                            <InputLabel>Counting method</InputLabel>
                            <Select
                              onChange={(e) =>
                                onElementCountMethodChange(e.target.value)
                              }
                              value={selectedCountMethod}
                              label="Counting method"
                            >
                              <MenuItem value={"mostCommon"}>
                                Most Common Value
                              </MenuItem>
                              <MenuItem value={"leastCommon"}>
                                Least Common Value
                              </MenuItem>
                              <MenuItem
                                value={"percentile"}
                                disabled={
                                  selectedTargetValue?.valueFormat ===
                                    "string" ||
                                  selectedTargetValue?.valueFormat === "bool"
                                }
                              >
                                Percentile
                              </MenuItem>
                              <MenuItem
                                disabled={
                                  selectedTargetValue?.valueFormat ===
                                    "string" ||
                                  selectedTargetValue?.valueFormat === "bool"
                                }
                                value={"mean"}
                              >
                                Avg. Value
                              </MenuItem>
                              <MenuItem value={"numberOfEvents"}>
                                Count
                              </MenuItem>
                              <MenuItem
                                disabled={
                                  selectedTargetValue?.valueFormat ===
                                    "string" ||
                                  selectedTargetValue?.valueFormat ===
                                    "percentile"
                                }
                                value={"summ"}
                              >
                                Sum of Values
                              </MenuItem>
                            </Select>
                          </StyledFormControl>

                          {(selectedCountMethod === "percentile" ||
                            selectedCountMethod === "meanForTime" ||
                            selectedCountMethod === "summForTime" ||
                            selectedCountMethod ===
                              "numberOfEventsForTime") && (
                            <StyledTextField
                              size="small"
                              sx={{ maxWidth: 100 }}
                              value={countMethodSecondaryValue}
                              onChange={onElementCountMethodTimeChange}
                              label={
                                selectedCountMethod === "percentile"
                                  ? "%"
                                  : "Days"
                              }
                            />
                          )}
                        </TargetValueContainer>
                      </Box>
                    </GradientCard>

                    <GradientCard>
                      <Box sx={{ p: 3 }}>
                        <SectionHeader>
                          <Typography
                            variant="h6"
                            sx={{
                              color: "#1f2937",
                              fontWeight: 600,
                            }}
                          >
                            Value filters
                          </Typography>
                          <Tooltip
                            title="Value filters are used to filter events by their custom values. For example, to view only events that have a certain value in certain field."
                            placement="top"
                          >
                            <IconContainer color="info">
                              <InfoIcon />
                            </IconContainer>
                          </Tooltip>
                        </SectionHeader>

                        <FilterContainer>
                          {analyticsQuery.queryValueFilters.map(
                            (condition, index) => (
                              <FilterRow key={index}>
                                <StyledFormControl
                                  size="small"
                                  sx={{ minWidth: 200 }}
                                >
                                  <InputLabel>Event Value</InputLabel>
                                  <Select
                                    value={
                                      analyticsQuery.queryValueFilters[index]
                                        ?.conditionValueID || ""
                                    }
                                    onChange={(e) =>
                                      onSelectElementConditionEventValue(
                                        e,
                                        index
                                      )
                                    }
                                    label="Event Value"
                                  >
                                    {targetEvent.values.map((value) => (
                                      <MenuItem
                                        key={value.uniqueID}
                                        value={value.uniqueID}
                                      >
                                        {value.valueName}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </StyledFormControl>

                                <StyledFormControl
                                  size="small"
                                  sx={{ minWidth: 150 }}
                                  disabled={
                                    analyticsQuery.queryValueFilters[index]
                                      ?.conditionValueID === "" || false
                                  }
                                >
                                  <InputLabel>Condition</InputLabel>
                                  <Select
                                    value={
                                      analyticsQuery.queryValueFilters[index]
                                        ?.condition || ""
                                    }
                                    onChange={(e) =>
                                      onSelectElementCondition(e, index)
                                    }
                                    label="Condition"
                                  >
                                    {getValueFormatByConditionIndex(index) ===
                                      "integer" && [
                                      <MenuItem key="equal" value={"="}>
                                        Is Equal (=)
                                      </MenuItem>,
                                      <MenuItem key="notEqual" value={"!="}>
                                        Is Not Equal (!=)
                                      </MenuItem>,
                                      <MenuItem key="moreThan" value={">"}>
                                        More than ({">"}){" "}
                                      </MenuItem>,
                                      <MenuItem key="lessThan" value={"<"}>
                                        Less than ({"<"})
                                      </MenuItem>,
                                      <MenuItem
                                        key="moreThanOrEqual"
                                        value={">="}
                                      >
                                        More than or Equal to ({">="}){" "}
                                      </MenuItem>,
                                      <MenuItem
                                        key="lessThanOrEqual"
                                        value={"<="}
                                      >
                                        Less than or Equal to ({"<="}){" "}
                                      </MenuItem>,
                                      <MenuItem key="inrange" value={"range"}>
                                        In Range
                                      </MenuItem>,
                                    ]}
                                    {getValueFormatByConditionIndex(index) ===
                                      "string" && [
                                      <MenuItem key="is" value={"is"}>
                                        Is
                                      </MenuItem>,
                                      <MenuItem key="isNot" value={"isNot"}>
                                        Is Not
                                      </MenuItem>,
                                    ]}
                                    {getValueFormatByConditionIndex(index) ===
                                      "bool" && [
                                      <MenuItem key="is" value={"is"}>
                                        Is
                                      </MenuItem>,
                                    ]}
                                    {getValueFormatByConditionIndex(index) ===
                                      "float" && [
                                      <MenuItem key="equal" value={"="}>
                                        Is Equal (=)
                                      </MenuItem>,
                                      <MenuItem key="notEqual" value={"!="}>
                                        Is Not Equal (!=)
                                      </MenuItem>,
                                      <MenuItem key="moreThan" value={">"}>
                                        More than ({">"}){" "}
                                      </MenuItem>,
                                      <MenuItem key="lessThan" value={"<"}>
                                        Less than ({"<"})
                                      </MenuItem>,
                                      <MenuItem
                                        key="moreThanOrEqual"
                                        value={">="}
                                      >
                                        More than or Equal to ({">="}){" "}
                                      </MenuItem>,
                                      <MenuItem
                                        key="lessThanOrEqual"
                                        value={"<="}
                                      >
                                        Less than or Equal to ({"<="}){" "}
                                      </MenuItem>,
                                      <MenuItem key="inrange" value={"range"}>
                                        In Range
                                      </MenuItem>,
                                    ]}
                                    {getValueFormatByConditionIndex(index) ===
                                      "percentile" && [
                                      <MenuItem key="equal" value={"="}>
                                        Is Equal (=)
                                      </MenuItem>,
                                      <MenuItem key="notEqual" value={"!="}>
                                        Is Not Equal (!=)
                                      </MenuItem>,
                                      <MenuItem key="moreThan" value={">"}>
                                        More than ({">"}){" "}
                                      </MenuItem>,
                                      <MenuItem key="lessThan" value={"<"}>
                                        Less than ({"<"})
                                      </MenuItem>,
                                      <MenuItem
                                        key="moreThanOrEqual"
                                        value={">="}
                                      >
                                        More than or Equal to ({">="}){" "}
                                      </MenuItem>,
                                      <MenuItem
                                        key="lessThanOrEqual"
                                        value={"<="}
                                      >
                                        Less than or Equal to ({"<="}){" "}
                                      </MenuItem>,
                                      <MenuItem key="inrange" value={"range"}>
                                        In Range
                                      </MenuItem>,
                                    ]}
                                    {getValueFormatByConditionIndex(index) ===
                                      "money" && [
                                      <MenuItem key="equal" value={"="}>
                                        Is Equal (=)
                                      </MenuItem>,
                                      <MenuItem key="notEqual" value={"!="}>
                                        Is Not Equal (!=)
                                      </MenuItem>,
                                      <MenuItem key="moreThan" value={">"}>
                                        More than ({">"}){" "}
                                      </MenuItem>,
                                      <MenuItem key="lessThan" value={"<"}>
                                        Less than ({"<"})
                                      </MenuItem>,
                                      <MenuItem
                                        key="moreThanOrEqual"
                                        value={">="}
                                      >
                                        More than or Equal to ({">="}){" "}
                                      </MenuItem>,
                                      <MenuItem
                                        key="lessThanOrEqual"
                                        value={"<="}
                                      >
                                        Less than or Equal to ({"<="}){" "}
                                      </MenuItem>,
                                      <MenuItem key="inrange" value={"range"}>
                                        In Range
                                      </MenuItem>,
                                    ]}
                                  </Select>
                                </StyledFormControl>

                                {pickConditionValueField(
                                  condition,
                                  getValueFormatByConditionIndex(index),
                                  index
                                )}

                                {analyticsQuery.queryValueFilters[index]
                                  ?.condition === "range" && (
                                  <>
                                    <Typography
                                      sx={{ color: "#6b7280", fontWeight: 500 }}
                                    >
                                      -
                                    </Typography>
                                    <StyledTextField
                                      size="small"
                                      sx={{ minWidth: 200 }}
                                      value={
                                        analyticsQuery.queryValueFilters[index]
                                          ?.conditionSecondaryValue || ""
                                      }
                                      onChange={(e) =>
                                        onElementConditionSecondaryValueChange(
                                          e,
                                          index
                                        )
                                      }
                                      InputProps={{
                                        endAdornment: (
                                          <InputAdornment position="end">
                                            {(() => {
                                              switch (
                                                getValueFormatByConditionIndex(
                                                  index
                                                )
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
                                        ),
                                      }}
                                    />
                                  </>
                                )}

                                <IconButton
                                  onClick={() => removeValueCondition(index)}
                                  sx={{
                                    color: "#ef4444",
                                    "&:hover": {
                                      bgcolor: "#ef444420",
                                      transform: "scale(1.1)",
                                    },
                                  }}
                                >
                                  <RemoveIcon />
                                </IconButton>
                              </FilterRow>
                            )
                          )}

                          <StyledButton
                            buttonVariant="secondary"
                            disabled={selectedTargetValue === ""}
                            onClick={addNewValueFilter}
                            sx={{ mt: 2 }}
                          >
                            Add condition
                          </StyledButton>
                        </FilterContainer>
                      </Box>
                    </GradientCard>

                    <GradientCard>
                      <Box sx={{ p: 3 }}>
                        <SectionHeader>
                          <Typography
                            variant="h6"
                            sx={{
                              color: "#1f2937",
                              fontWeight: 600,
                            }}
                          >
                            Category filters
                          </Typography>
                        </SectionHeader>

                        <FilterContainer>
                          {analyticsQuery.queryCategoryFilters.map(
                            (condition, index) => (
                              <FilterRow key={index}>
                                <StyledFormControl
                                  size="small"
                                  sx={{ minWidth: 200 }}
                                >
                                  <InputLabel>Dimension</InputLabel>
                                  <Select
                                    value={
                                      analyticsQuery.queryCategoryFilters[index]
                                        ?.conditionField || ""
                                    }
                                    onChange={(e) =>
                                      onChangeCategoryFilter_SetDimension(
                                        e,
                                        index
                                      )
                                    }
                                    label="Dimension"
                                  >
                                    <MenuItem value={"engineVersion"}>
                                      Engine version
                                    </MenuItem>
                                    <MenuItem value={"gameVersion"}>
                                      Game version
                                    </MenuItem>
                                    <MenuItem value={"platform"}>
                                      Platform
                                    </MenuItem>
                                    <MenuItem value={"language"}>
                                      Language
                                    </MenuItem>
                                    <MenuItem value={"country"}>
                                      Country
                                    </MenuItem>
                                  </Select>
                                </StyledFormControl>

                                <StyledFormControl
                                  size="small"
                                  sx={{ minWidth: 150 }}
                                  disabled={
                                    analyticsQuery.queryCategoryFilters[index]
                                      ?.conditionField === "" || false
                                  }
                                >
                                  <InputLabel>Condition</InputLabel>
                                  <Select
                                    value={
                                      analyticsQuery.queryCategoryFilters[index]
                                        ?.condition || ""
                                    }
                                    onChange={(e) =>
                                      onChangeCategoryFilter_SetCondition(
                                        e,
                                        index
                                      )
                                    }
                                    label="Condition"
                                  >
                                    <MenuItem value={"is"}>Is</MenuItem>
                                    <MenuItem value={"isNot"}>Is Not</MenuItem>
                                  </Select>
                                </StyledFormControl>

                                <StyledTextField
                                  size="small"
                                  sx={{ minWidth: 200 }}
                                  disabled={
                                    analyticsQuery.queryCategoryFilters[index]
                                      ?.condition === ""
                                  }
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
                                  InputProps={{
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        str
                                      </InputAdornment>
                                    ),
                                  }}
                                />

                                <IconButton
                                  onClick={() => removeCategoryCondition(index)}
                                  sx={{
                                    color: "#ef4444",
                                    "&:hover": {
                                      bgcolor: "#ef444420",
                                      transform: "scale(1.1)",
                                    },
                                  }}
                                >
                                  <RemoveIcon />
                                </IconButton>
                              </FilterRow>
                            )
                          )}

                          <StyledButton
                            buttonVariant="secondary"
                            disabled={selectedTargetValue === ""}
                            onClick={addNewCategoryFilter}
                            sx={{ mt: 2 }}
                          >
                            Add condition
                          </StyledButton>
                        </FilterContainer>
                      </Box>
                    </GradientCard>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        mt: 4,
                      }}
                    >
                      <StyledButton
                        buttonVariant="primary"
                        onClick={() => {
                          if (eventToEdit && eventToEdit.target) {
                            changeEvent(analyticsQuery, eventToEdit.index);
                          } else {
                            onApply(analyticsQuery);
                          }
                        }}
                        disabled={validateEvent()}
                        sx={{ minWidth: 150, px: 4 }}
                      >
                        {eventToEdit ? "Edit event" : "Add event"}
                      </StyledButton>
                    </Box>
                  </Box>
                </Slide>
              )}
          </ModalContent>
        </ModalContainer>
      </Fade>
    </StyledModal>
  );
};

export default ModalEventSearcher;
