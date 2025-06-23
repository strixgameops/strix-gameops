import React, { useState } from "react";
import { styled } from "@mui/material/styles";
import {
  TextField,
  Button,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  Typography,
  Modal,
  Box,
  IconButton,
  Fade,
  Slide,
  ButtonGroup,
} from "@mui/material";
import {
  Close as CloseIcon,
  Analytics as AnalyticsIcon,
  Code as CodeIcon,
} from "@mui/icons-material";
import shortid from "shortid";

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
  maxWidth: 600,
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
    outlined: {
      background: "transparent",
      color: "#6f63ff",
      border: "2px solid #6f63ff60",
      "&:hover": {
        background: "#6f63ff10",
        border: "2px solid #6f63ff",
        transform: "translateY(-1px)",
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

const TypeButtonGroup = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "24px",
}));

const TypeButton = styled(Button)(({ theme, isSelected }) => ({
  padding: "12px 20px",
  borderRadius: "12px",
  textTransform: "none",
  fontWeight: 600,
  transition: "all 0.3s ease",
  border: "2px solid",
  minWidth: "100px",
  ...(isSelected
    ? {
        background: "linear-gradient(135deg, #6f63ff 0%, #5b52d4 100%)",
        color: "#ffffff",
        borderColor: "#6f63ff",
        boxShadow: "0 4px 15px rgba(111, 99, 255, 0.3)",
        transform: "translateY(-1px)",
      }
    : {
        background: "#ffffff",
        color: "#6b7280",
        borderColor: "#d1d5db",
        "&:hover": {
          borderColor: "#6f63ff60",
          color: "#6f63ff",
          background: "#6f63ff05",
          transform: "translateY(-1px)",
        },
      }),
}));

const RangeContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginTop: "16px",
}));

const ModalCreateStatisticsElement = ({ onModalClose, onSubmit }) => {
  const [modalOpen, setModalOpen] = useState(true);
  const [statName, setStatName] = useState("");
  const [statCodeName, setStatCodeName] = useState("");
  const [statType, setStatType] = useState("");
  const [statDefaultValue, setStatDefaultValue] = useState("");
  const [statRangeMin, setStatRangeMin] = useState("");
  const [statRangeMax, setStatRangeMax] = useState("");

  function onSendSubmit() {
    let tempRangeMin = statRangeMin;
    let tempRangeMax = statRangeMax;

    function checkIfRangeSwapped() {
      if (statRangeMin !== "" && statRangeMax !== "") {
        if (statRangeMin > statRangeMax) {
          tempRangeMin = statRangeMax;
          tempRangeMax = statRangeMin;
        }
      }
    }
    checkIfRangeSwapped();

    onSubmit({
      templateType: "statistics",
      templateObject: {
        templateName: statName,
        templateCodeName: statCodeName,
        templateType: statType,
        templateDefaultValue: statDefaultValue,
        templateValueRangeMin: tempRangeMin,
        templateValueRangeMax: tempRangeMax,
      },
    });
  }

  function onStatNameChange(e) {
    setStatName(e.target.value);
  }

  function onStatCodeNameChange(e) {
    setStatCodeName(e.target.value);
  }

  function onStatTypeChange(newType) {
    switch (newType) {
      case "integer":
        setStatType("integer");
        break;
      case "string":
        setStatType("string");
        break;
      case "float":
        setStatType("float");
        break;
      case "bool":
        setStatType("bool");
        break;
      default:
        break;
    }
    setStatDefaultValue("");
    setStatRangeMin("");
    setStatRangeMax("");
  }

  function onStatDefaultValueChange(e) {
    let value = e.target.value;
    switch (statType) {
      case "integer":
        value = handleIntegerInput(value);
        break;
      case "float":
        value = handleFloatInput(value);
        break;
      default:
        break;
    }
    setStatDefaultValue(value);
  }

  function onStatRangeMinChange(e) {
    let value = e.target.value;
    switch (statType) {
      case "integer":
        value = handleIntegerInput(value);
        break;
      case "float":
        value = handleFloatInput(value);
        break;
      default:
        break;
    }
    setStatRangeMin(value);
  }

  function onStatRangeMaxChange(e) {
    let value = e.target.value;
    switch (statType) {
      case "integer":
        value = handleIntegerInput(value);
        break;
      case "float":
        value = handleFloatInput(value);
        break;
      default:
        break;
    }
    setStatRangeMax(value);
  }

  function handleFloatInput(value) {
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

    return sanitizedValue;
  }

  function handleIntegerInput(value) {
    if (value === undefined) return;
    let currentInputValue = value;
    let sanitizedValue = currentInputValue.replace(/[^0-9]/g, "");
    return sanitizedValue;
  }

  const handleClose = () => {
    setModalOpen(false);
    setTimeout(onModalClose, 300);
  };

  const typeOptions = [
    { value: "integer", label: "Integer", icon: "123" },
    { value: "float", label: "Float", icon: "1.23" },
    { value: "bool", label: "Boolean", icon: "T/F" },
    { value: "string", label: "String", icon: "ABC" },
  ];

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
                      "linear-gradient(135deg, #22c55e15 0%, #22c55e25 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #22c55e30",
                  }}
                >
                  <CodeIcon sx={{ color: "#22c55e", fontSize: 28 }} />
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    background:
                      "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 700,
                  }}
                >
                  New Statistics Element
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
                <Box sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{ mb: 3, color: "#1f2937", fontWeight: 600 }}
                  >
                    Basic Information
                  </Typography>

                  <StyledTextField
                    spellCheck={false}
                    fullWidth
                    sx={{ mb: 3 }}
                    name={shortid.generate()}
                    label="Name"
                    variant="outlined"
                    value={statName}
                    onChange={onStatNameChange}
                  />

                  <StyledTextField
                    spellCheck={false}
                    fullWidth
                    sx={{ mb: 3 }}
                    name={shortid.generate()}
                    label="ID"
                    variant="outlined"
                    value={statCodeName}
                    onChange={onStatCodeNameChange}
                  />
                </Box>
              </GradientCard>
            </Slide>

            <Slide in={true} direction="up" timeout={1000}>
              <GradientCard>
                <Box sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{ mb: 3, color: "#1f2937", fontWeight: 600 }}
                  >
                    Value Type
                  </Typography>

                  <TypeButtonGroup>
                    {typeOptions.map((option) => (
                      <TypeButton
                        key={option.value}
                        isSelected={statType === option.value}
                        onClick={() => onStatTypeChange(option.value)}
                        startIcon={
                          <Box
                            sx={{
                              fontSize: "14px",
                              fontFamily: "monospace",
                              fontWeight: "bold",
                            }}
                          >
                            {option.icon}
                          </Box>
                        }
                      >
                        {option.label}
                      </TypeButton>
                    ))}
                  </TypeButtonGroup>

                  {statType === "bool" ? (
                    <StyledFormControl fullWidth sx={{ maxWidth: 300 }}>
                      <InputLabel>Default value</InputLabel>
                      <Select
                        value={statDefaultValue}
                        label="Default value"
                        onChange={onStatDefaultValueChange}
                      >
                        <MenuItem value={"True"}>True</MenuItem>
                        <MenuItem value={"False"}>False</MenuItem>
                      </Select>
                    </StyledFormControl>
                  ) : (
                    <StyledTextField
                      spellCheck={false}
                      fullWidth
                      sx={{ maxWidth: 300 }}
                      disabled={statType === ""}
                      name={shortid.generate()}
                      label="Default value"
                      variant="outlined"
                      value={statDefaultValue}
                      onChange={onStatDefaultValueChange}
                    />
                  )}

                  {(statType === "float" || statType === "integer") && (
                    <Box sx={{ mt: 3 }}>
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, color: "#1f2937", fontWeight: 600 }}
                      >
                        Available Range (Optional)
                      </Typography>
                      <RangeContainer>
                        <StyledTextField
                          name={shortid.generate()}
                          spellCheck={false}
                          label="Range Min"
                          variant="outlined"
                          value={statRangeMin}
                          onChange={onStatRangeMinChange}
                          sx={{ flex: 1 }}
                        />
                        <Typography
                          sx={{
                            color: "#6b7280",
                            fontWeight: 500,
                            fontSize: "18px",
                          }}
                        >
                          –
                        </Typography>
                        <StyledTextField
                          name={shortid.generate()}
                          spellCheck={false}
                          label="Range Max"
                          variant="outlined"
                          value={statRangeMax}
                          onChange={onStatRangeMaxChange}
                          sx={{ flex: 1 }}
                        />
                      </RangeContainer>
                    </Box>
                  )}
                </Box>
              </GradientCard>
            </Slide>

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                mt: 4,
              }}
            >
              <StyledButton
                buttonVariant="primary"
                disabled={statType === "" || statName === "" || statCodeName === ""}
                onClick={onSendSubmit}
                sx={{ minWidth: 150, px: 4 }}
              >
                Create Element
              </StyledButton>
            </Box>
          </ModalContent>
        </ModalContainer>
      </Fade>
    </StyledModal>
  );
};

export default ModalCreateStatisticsElement;