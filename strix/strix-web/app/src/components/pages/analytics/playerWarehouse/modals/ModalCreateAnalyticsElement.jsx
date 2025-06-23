import React, { useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import {
  TextField,
  Checkbox,
  Box,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  OutlinedInput,
  InputAdornment,
  Button,
  Typography,
  IconButton,
  Modal,
  Fade,
  Slide,
  Chip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Remove as RemoveIcon,
  Add as AddIcon,
  Analytics as AnalyticsIcon,
} from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import SearchEventField from "./autocompleteSearch/SearchEventField";
import useApi from "@strix/api";
import { useBranch, useGame } from "@strix/gameContext";

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
  maxWidth: 1000,
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
  background: "#fafbfc",
  overflowY: "auto",
  flexGrow: 1,
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

const SectionHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "16px",
  padding: "0 8px",
}));

const TargetValueContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "24px",
}));

const ModalCreateAnalyticsElement = ({ onModalClose, onSubmit }) => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { getAnalyticsEvent, getAllAnalyticsEvents } = useApi();

  const [modalOpen, setModalOpen] = useState(true);
  const [currentElementName, setCurrentElementName] = useState("");
  const [targetEvent, setTargetEvent] = useState();
  const emptyElement = {
    templateID: "",
    templateName: "",
    templateMethod: "",
    templateConditions: [],
    templateAnalyticEventID: [],
  };
  const [analyticsElement, setAnalyticsElement] = useState(emptyElement);
  const [selectedTargetValue, setSelectedTargetValue] = useState({});
  const [selectedCountMethod, setSelectedCountMethod] = useState("");
  const [countMethodTime, setCountMethodTime] = useState("");
  const [dataValidated, setDataValidated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allAnalyticsEvents, setAllAnalyticsEvents] = useState([]);

  useEffect(() => {
    getAllAnalyticsEvents({ gameID: game.gameID, branch: branch }).then(
      (res) => {
        setAllAnalyticsEvents(res.events);
      }
    );
  }, []);

  function onElementNameChange(text) {
    setAnalyticsElement((prevElement) => ({
      ...prevElement,
      templateName: text,
    }));
    setCurrentElementName(text);
  }

  async function onTargetEventSelected(eventObj) {
    const response = await getAnalyticsEvent({
      gameID: game.gameID,
      branch: branch,
      eventID: eventObj.eventID,
    });
    setTargetEvent(response.events);
    setAnalyticsElement((prevElement) => ({
      ...prevElement,
      templateConditions: [],
    }));
    setSelectedTargetValue("");
    setSelectedCountMethod("");
    setCountMethodTime("");
  }

  useEffect(() => {
    if (targetEvent) {
      setAnalyticsElement((prevElement) => ({
        ...prevElement,
        templateConditions: [],
        templateAnalyticEventID: targetEvent.eventID,
      }));
    } else {
      setAnalyticsElement(emptyElement);
    }
  }, [targetEvent]);

  function addNewCondition() {
    let updatedArray = analyticsElement.templateConditions;
    updatedArray = [
      ...updatedArray,
      {
        conditionEnabled: false,
        condition: "",
        conditionValue: "",
        conditionSecondaryValue: "",
        conditionValueID: "",
      },
    ];
    setAnalyticsElement((prevElement) => ({
      ...prevElement,
      templateConditions: updatedArray,
    }));
  }

  function removeCondition(index) {
    setAnalyticsElement((prevElement) => ({
      ...prevElement,
      templateConditions: prevElement.templateConditions.filter(
        (condition, i) => i !== index
      ),
    }));
  }

  function onSelectElementConditionEventValue(chosenEvent, conditionIndex) {
    setAnalyticsElement((prevElement) => ({
      ...prevElement,
      templateConditions: prevElement.templateConditions.map((condition, i) =>
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

  function onSelectElementCondition(conditionString, valueIndex) {
    setAnalyticsElement((prevElement) => ({
      ...prevElement,
      templateConditions: prevElement.templateConditions.map((condition, i) =>
        i === valueIndex
          ? {
              ...condition,
              condition: conditionString.target.value,
            }
          : condition
      ),
    }));
  }

  function onElementConditionValueChange(e, valueID, conditionIndex) {
    let inputValue = e.target.value;
    let targetEventValue = targetEvent.values.find(
      (value) => value.uniqueID === valueID
    );

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

    setAnalyticsElement((prevElement) => ({
      ...prevElement,
      templateConditions: prevElement.templateConditions.map((condition, i) =>
        i === conditionIndex
          ? { ...condition, conditionValue: inputValue }
          : condition
      ),
    }));
  }

  function onElementConditionSecondaryValueChange(e, valueIndex) {
    setAnalyticsElement((prevElement) => ({
      ...prevElement,
      templateConditions: prevElement.templateConditions.map((condition, i) =>
        i === valueIndex
          ? { ...condition, conditionSecondaryValue: e.target.value }
          : condition
      ),
    }));
  }

  function onElementTargetValueChange(e) {
    setAnalyticsElement((prevElement) => ({
      ...prevElement,
      templateEventTargetValueId: e.target.value.uniqueID,
    }));
    setSelectedTargetValue(e.target.value);
    if (
      selectedCountMethod !== "numberOfEvents" &&
      selectedCountMethod !== "numberOfEventsForTime"
    ) {
      setSelectedCountMethod("");
      setCountMethodTime("");
    }
  }

  function onElementCountMethodChange(e) {
    setAnalyticsElement((prevElement) => ({
      ...prevElement,
      templateMethod: e.target.value,
    }));
    setSelectedCountMethod(e.target.value);
    setCountMethodTime("");
  }

  function onElementCountMethodTimeChange(e) {
    let currentInputValue = e.target.value;
    let sanitizedValue = currentInputValue.replace(/[^0-9]/g, "");
    sanitizedValue = sanitizedValue.replace(/^0+/, "");

    setAnalyticsElement((prevElement) => ({
      ...prevElement,
      templateMethodTime: sanitizedValue,
    }));
    setCountMethodTime(sanitizedValue);
  }

  useEffect(() => {
    if (
      analyticsElement.templateName !== "" &&
      analyticsElement.templateMethod !== ""
    ) {
      setDataValidated(true);
    } else {
      setDataValidated(false);
    }
  }, [analyticsElement]);

  async function onCreateElement() {
    setLoading(true);
    const waiting = await onSubmit({
      templateType: "analytics",
      templateObject: analyticsElement,
    });
    setLoading(false);
  }

  function getValueFormatByConditionIndex(conditionIndex) {
    if (targetEvent.values === undefined) return "";
    if (
      analyticsElement.templateConditions[conditionIndex]?.conditionValueID ===
      ""
    )
      return "";

    let value = targetEvent.values.find(
      (value) =>
        value.uniqueID ===
        analyticsElement.templateConditions[conditionIndex]?.conditionValueID
    ).valueFormat;

    if (value === undefined) {
      return "";
    } else {
      return value;
    }
  }

  function isAnyValueSelected() {
    return selectedTargetValue.uniqueID !== undefined &&
      selectedTargetValue.uniqueID !== ""
      ? true
      : false;
  }

  const handleClose = () => {
    setModalOpen(false);
    setTimeout(onModalClose, 300);
  };

  return (
    <StyledModal open={modalOpen} onClose={handleClose}>
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    background:
                      "linear-gradient(135deg, #6f63ff15 0%, #6f63ff25 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #6f63ff30",
                  }}
                >
                  <AnalyticsIcon sx={{ color: "#6f63ff", fontSize: 28 }} />
                </Box>
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
                  New Analytics Element
                </Typography>
              </Box>
              <IconButton
                onClick={handleClose}
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
              <GradientCard variant="primary">
                <Box sx={{ p: 3, height: "fit-content" }}>
                  <Typography
                    variant="h6"
                    sx={{ mb: 3, color: "#1f2937", fontWeight: 600 }}
                  >
                    Basic Configuration
                  </Typography>
                  <StyledTextField
                    spellCheck={false}
                    fullWidth
                    sx={{ mb: 3 }}
                    label="Element Name"
                    value={currentElementName}
                    onChange={(event) => onElementNameChange(event.target.value)}
                  />
                  <SearchEventField
                    onTargetEventSelected={onTargetEventSelected}
                    allEvents={allAnalyticsEvents}
                  />
                </Box>
              </GradientCard>
            </Slide>

            {targetEvent !== undefined &&
              targetEvent.values &&
              targetEvent.values.length > 0 && (
                <Slide in={true} direction="up" timeout={1000}>
                  <Box>
                    <GradientCard>
                      <Box sx={{ p: 3 }}>
                        <Typography
                          variant="h6"
                          sx={{ mb: 3, color: "#1f2937", fontWeight: 600 }}
                        >
                          Value Configuration
                        </Typography>

                        <TargetValueContainer>
                          {selectedCountMethod !== "numberOfEvents" &&
                            selectedCountMethod !== "numberOfEventsForTime" && (
                              <StyledFormControl
                                size="small"
                                sx={{ m: 1, minWidth: 300 }}
                              >
                                <InputLabel>Event value</InputLabel>
                                <Select
                                  onChange={(e) => onElementTargetValueChange(e)}
                                  autoWidth
                                  label="Event value"
                                  endAdornment={
                                    <InputAdornment
                                      sx={{ pr: 2 }}
                                      position="end"
                                    >
                                      {(() => {
                                        switch (
                                          selectedTargetValue.valueFormat
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
                                >
                                  {targetEvent.values.map((valueObj, index) => (
                                    <MenuItem key={index} value={valueObj}>
                                      {valueObj.valueName}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </StyledFormControl>
                            )}

                          <StyledFormControl
                            size="small"
                            sx={{ m: 1, minWidth: 200 }}
                          >
                            <InputLabel>Counting method</InputLabel>
                            <Select
                              onChange={(e) => onElementCountMethodChange(e)}
                              value={selectedCountMethod}
                              autoWidth
                              label="Counting method"
                            >
                              <MenuItem
                                disabled={!isAnyValueSelected()}
                                value={"mostRecent"}
                              >
                                Most Recent Value
                              </MenuItem>
                              <MenuItem
                                disabled={!isAnyValueSelected()}
                                value={"firstReceived"}
                              >
                                First Received Value
                              </MenuItem>
                              <MenuItem
                                disabled={!isAnyValueSelected()}
                                value={"mostCommon"}
                              >
                                Most Common Value
                              </MenuItem>
                              <MenuItem
                                disabled={!isAnyValueSelected()}
                                value={"leastCommon"}
                              >
                                Least Common Value
                              </MenuItem>
                              <MenuItem
                                disabled={
                                  selectedTargetValue.valueFormat === "string" ||
                                  selectedTargetValue.valueFormat === "bool" ||
                                  !isAnyValueSelected()
                                }
                                value={"mean"}
                              >
                                Mean Value
                              </MenuItem>
                              <MenuItem
                                disabled={
                                  selectedTargetValue.valueFormat === "string" ||
                                  selectedTargetValue.valueFormat === "bool" ||
                                  !isAnyValueSelected()
                                }
                                value={"meanForTime"}
                              >
                                Mean Value For The Last N Days
                              </MenuItem>
                              <MenuItem value={"numberOfEvents"}>
                                Count
                              </MenuItem>
                              <MenuItem value={"numberOfEventsForTime"}>
                                Count For The Last N Days
                              </MenuItem>
                              <MenuItem value={"dateOfFirst"}>
                                Date of First Event
                              </MenuItem>
                              <MenuItem value={"dateOfLast"}>
                                Date of Last Event
                              </MenuItem>
                              <MenuItem
                                disabled={
                                  selectedTargetValue.valueFormat === "string" ||
                                  selectedTargetValue.valueFormat ===
                                    "percentile" ||
                                  selectedTargetValue.valueFormat === "bool" ||
                                  !isAnyValueSelected()
                                }
                                value={"summ"}
                              >
                                Sum of Values
                              </MenuItem>
                              <MenuItem
                                disabled={
                                  selectedTargetValue.valueFormat === "string" ||
                                  selectedTargetValue.valueFormat ===
                                    "percentile" ||
                                  selectedTargetValue.valueFormat === "bool" ||
                                  !isAnyValueSelected()
                                }
                                value={"summForTime"}
                              >
                                Sum of Values For The Last N Days
                              </MenuItem>
                            </Select>
                          </StyledFormControl>

                          {(selectedCountMethod === "meanForTime" ||
                            selectedCountMethod === "summForTime" ||
                            selectedCountMethod === "numberOfEventsForTime") && (
                            <StyledTextField
                              spellCheck={false}
                              value={countMethodTime}
                              onChange={onElementCountMethodTimeChange}
                              size="small"
                              label="Days"
                              sx={{ maxWidth: 100 }}
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
                            sx={{ color: "#1f2937", fontWeight: 600 }}
                          >
                            Conditions
                          </Typography>
                        </SectionHeader>

                        <FilterContainer>
                          {analyticsElement.templateConditions.map(
                            (condition, index) => (
                              <FilterRow key={index}>
                                <StyledFormControl
                                  size="small"
                                  sx={{ minWidth: 200 }}
                                >
                                  <InputLabel>Event Value</InputLabel>
                                  <Select
                                    value={
                                      analyticsElement.templateConditions[index]
                                        ?.conditionValueID || ""
                                    }
                                    onChange={(e) =>
                                      onSelectElementConditionEventValue(
                                        e,
                                        index
                                      )
                                    }
                                    autoWidth
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
                                    analyticsElement.templateConditions[index]
                                      ?.conditionValueID === ""
                                  }
                                >
                                  <InputLabel>Condition</InputLabel>
                                  <Select
                                    value={
                                      analyticsElement.templateConditions[index]
                                        ?.condition || ""
                                    }
                                    onChange={(e) =>
                                      onSelectElementCondition(e, index)
                                    }
                                    autoWidth
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

                                <StyledTextField
                                  spellCheck={false}
                                  size="small"
                                  sx={{ minWidth: 200 }}
                                  disabled={
                                    analyticsElement.templateConditions[index]
                                      ?.condition === ""
                                  }
                                  value={
                                    analyticsElement.templateConditions[index]
                                      ?.conditionValue || ""
                                  }
                                  onChange={(e) =>
                                    onElementConditionValueChange(
                                      e,
                                      analyticsElement.templateConditions[index]
                                        ?.conditionValueID,
                                      index
                                    )
                                  }
                                  InputProps={{
                                    endAdornment: (
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
                                    ),
                                  }}
                                />

                                {analyticsElement.templateConditions[index]
                                  ?.condition === "range" && (
                                  <>
                                    <Typography
                                      sx={{ color: "#6b7280", fontWeight: 500 }}
                                    >
                                      -
                                    </Typography>
                                    <StyledTextField
                                      spellCheck={false}
                                      size="small"
                                      sx={{ minWidth: 200 }}
                                      value={
                                        analyticsElement.templateConditions[
                                          index
                                        ]?.conditionSecondaryValue || ""
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
                                  onClick={() => removeCondition(index)}
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
                            onClick={addNewCondition}
                            startIcon={<AddIcon />}
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
                      <LoadingButton
                        disabled={!dataValidated}
                        onClick={onCreateElement}
                        loading={loading}
                        loadingIndicator="Creating..."
                        sx={{
                          minWidth: 150,
                          px: 4,
                          background:
                            "linear-gradient(135deg, #6f63ff 0%, #5b52d4 100%)",
                          color: "#ffffff",
                          fontWeight: 600,
                          borderRadius: "12px",
                          textTransform: "none",
                          transition: "all 0.3s ease",
                          minHeight: "44px",
                          "&:hover": {
                            background:
                              "linear-gradient(135deg, #5b52d4 0%, #4c46b8 100%)",
                            boxShadow: "0 6px 20px rgba(111, 99, 255, 0.4)",
                            transform: "translateY(-2px)",
                          },
                          "&:disabled": {
                            opacity: 0.6,
                            transform: "none",
                          },
                        }}
                      >
                        Add element
                      </LoadingButton>
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

export default ModalCreateAnalyticsElement;