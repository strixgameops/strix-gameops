import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  Fade,
  Slide,
  Zoom,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  NotificationsActive as NotificationsActiveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";

// Styled Components
const AlertDialog = styled(Modal)(({ theme }) => ({
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
  maxWidth: "700px",
  background: "#ffffff",
  borderRadius: "20px",
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
  border: "1px solid #e1e5e9",
  overflow: "hidden",
  position: "relative",
  maxHeight: "90vh",
  overflowY: "auto",
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-2px",
    left: "-2px",
    right: "-2px",
    bottom: "-2px",
    background: "linear-gradient(45deg, #6f63ff20, #f59e0b20, #ef444420)",
    borderRadius: "22px",
    zIndex: -1,
    animation: "gradient-shift 4s ease-in-out infinite",
    "@keyframes gradient-shift": {
      "0%, 100%": { opacity: 0.3 },
      "50%": { opacity: 0.8 },
    },
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
}));

const IconContainer = styled(Box)(({
  theme,
  color = "primary",
  size = "medium",
}) => {
  const colors = {
    primary: "#6f63ff",
    warning: "#f59e0b",
    error: "#ef4444",
    success: "#22c55e",
  };

  const sizes = {
    small: { width: "36px", height: "36px", fontSize: "18px" },
    medium: { width: "44px", height: "44px", fontSize: "22px" },
    large: { width: "52px", height: "52px", fontSize: "26px" },
  };

  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...sizes[size],
    borderRadius: "12px",
    background: `${colors[color]}15`,
    color: colors[color],
    border: `2px solid ${colors[color]}30`,
    transition: "all 0.3s ease",
    cursor: "pointer",
    "&:hover": {
      background: colors[color],
      color: "#ffffff",
      transform: "scale(1.1)",
      boxShadow: `0 8px 25px ${colors[color]}40`,
    },
  };
});

const GradientText = styled(Typography)(({ theme, type = "primary" }) => {
  const variants = {
    primary: "linear-gradient(135deg, #6f63ff 0%, #6f63ffdd 100%)",
    warning: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    error: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    success: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  };

  return {
    background: variants[type],
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: 700,
  };
});

const StyledButton = styled(Button)(({
  theme,
  variant: buttonVariant = "primary",
}) => {
  const variants = {
    primary: {
      background: "linear-gradient(135deg, #6f63ff 0%, #5b52d4 100%)",
      "&:hover": {
        background: "linear-gradient(135deg, #5b52d4 0%, #4c46b8 100%)",
        boxShadow: "0 6px 20px rgba(111, 99, 255, 0.4)",
      },
    },
    warning: {
      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      "&:hover": {
        background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
        boxShadow: "0 6px 20px rgba(245, 158, 11, 0.4)",
      },
    },
    error: {
      background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      "&:hover": {
        background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
        boxShadow: "0 6px 20px rgba(239, 68, 68, 0.4)",
      },
    },
  };

  return {
    ...variants[buttonVariant],
    color: "#ffffff",
    fontWeight: 600,
    borderRadius: "8px",
    textTransform: "none",
    transition: "all 0.3s ease",
    "&:hover": {
      ...variants[buttonVariant]["&:hover"],
      transform: "translateY(-2px)",
    },
    "&:disabled": {
      opacity: 0.6,
      transform: "none",
    },
  };
});

const FormCard = styled(Box)(({ theme }) => ({
  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  borderRadius: "16px",
  padding: "24px",
  border: "2px solid #e5e7eb",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
  transition: "all 0.3s ease",
  "&:hover": {
    border: "2px solid #6f63ff40",
    boxShadow: "0 8px 30px 6f63ff15",
  },
}));

const AlertListCard = styled(Box)(({ theme }) => ({
  background: "#ffffff",
  borderRadius: "12px",
  border: "2px solid #e5e7eb",
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
  overflow: "hidden",
  "&:hover": {
    border: "2px solid #6f63ff30",
    boxShadow: "0 4px 20px 6f63ff15",
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    background: "#ffffff",
    borderRadius: "12px",
    "& fieldset": {
      borderColor: "#d1d5db",
      borderWidth: "2px",
    },
    "&:hover fieldset": {
      borderColor: "#f59e0b60",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#f59e0b",
      borderWidth: "2px",
      boxShadow: "0 0 0 3px #6f63ff20",
    },
  },
  "& .MuiInputBase-input": {
    color: "#1f2937",
  },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    background: "#ffffff",
    borderRadius: "12px",
    "& fieldset": {
      borderColor: "#d1d5db",
      borderWidth: "2px",
    },
    "&:hover fieldset": {
      borderColor: "#f59e0b60",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#f59e0b",
      borderWidth: "2px",
      boxShadow: "0 0 0 3px #6f63ff20",
    },
  },
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    right: "75%",
    top: 5,
    border: `2px solid ${theme.palette.background.paper}`,
    padding: "0 4px",
    background: "linear-gradient(135deg, #6f63ff 0%, #6f63ff 100%)",
  },
}));

const AlertModal = ({
  alertThresholds = [],
  onCreateAlert,
  onUpdateAlert,
  onDeleteAlert,
  availableMetrics = [],
  isOpen,
  onClose,
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [isEditingAlert, setIsEditingAlert] = useState(false);
  const [currentAlertConfig, setCurrentAlertConfig] = useState({
    alertID: "",
    chartID: "",
    thresholdValue: "",
    observedMetricFieldName: "any",
    timeWindow: 5,
    alertName: "",
    thresholdCondition: "shouldBeBelow",
    alertDescription: "",
    thresholdColor: "red",
  });

  const handleCreateNew = () => {
    setIsEditingAlert(false);
    setCurrentAlertConfig({
      alertID: Date.now().toString(),
      chartID: "",
      thresholdValue: "",
      observedMetricFieldName: availableMetrics[0] || "any",
      timeWindow: 5,
      alertName: "",
      thresholdCondition: "shouldBeBelow",
      alertDescription: "",
      thresholdColor: "red",
    });
    setCreateDialogOpen(true);
  };

  const handleEdit = (alert) => {
    setIsEditingAlert(true);
    setCurrentAlertConfig({ ...alert });
    setCreateDialogOpen(true);
  };

  const handleSave = async () => {
    const alertData = {
      ...currentAlertConfig,
      thresholdValue: parseFloat(currentAlertConfig.thresholdValue),
    };

    if (isEditingAlert) {
      await onUpdateAlert?.(alertData);
    } else {
      await onCreateAlert?.(alertData);
    }

    setCreateDialogOpen(false);
  };

  const handleConfigChange = (field) => (event) => {
    setCurrentAlertConfig({
      ...currentAlertConfig,
      [field]: event.target.value,
    });
  };

  const handleManageOpen = () => {
    setManageDialogOpen(true);
  };

  return (
    <>
      {/* Alert Button */}
      <StyledBadge
        badgeContent={alertThresholds.length}
        color="primary"
        sx={{
          position: "absolute",
          top: 10,
          right: 70,
        }}
      >
        <IconContainer
          color="primary"
          size="medium"
          onClick={handleManageOpen}
          sx={(theme) => ({
            animation:
              alertThresholds.length > 0 ? "pulse 2s infinite" : "none",
            "@keyframes pulse": {
              "0%": {
                transform: "scale(1)",
                boxShadow: `0 0 0 0 ${theme.palette.primary}`,
              },
              "70%": {
                transform: "scale(1.05)",
                boxShadow: "0 0 0 10px rgba(245, 158, 11, 0)",
              },
              "100%": {
                transform: "scale(1)",
                boxShadow: "0 0 0 0 rgba(245, 158, 11, 0)",
              },
            },
          })}
        >
          <NotificationsActiveIcon />
        </IconContainer>
      </StyledBadge>

      {/* Create/Edit Alert Dialog */}
      <AlertDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      >
        <Fade in={createDialogOpen} timeout={600}>
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
                  <IconContainer color="primary" size="large">
                    <WarningIcon />
                  </IconContainer>
                  <GradientText variant="h4" type="primary">
                    {isEditingAlert ? "Edit Alert" : "Create New Alert"}
                  </GradientText>
                </Box>

                <IconButton
                  onClick={() => setCreateDialogOpen(false)}
                  sx={{
                    transition: "all 0.3s ease",
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
              <Slide in={true} direction="up" timeout={800}>
                <FormCard sx={{ mb: 3 }}>
                  <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {/* Left Column */}
                    <Box sx={{ flex: 1, minWidth: "280px" }}>
                      <StyledTextField
                        fullWidth
                        margin="normal"
                        label="Alert Name"
                        value={currentAlertConfig.alertName}
                        onChange={handleConfigChange("alertName")}
                        placeholder="e.g., High CPU Usage Alert"
                      />

                      <StyledTextField
                        fullWidth
                        margin="normal"
                        label={
                          currentAlertConfig.thresholdCondition ===
                          "percentChange"
                            ? "Threshold Percentage (%)"
                            : "Threshold Value"
                        }
                        type="number"
                        value={currentAlertConfig.thresholdValue}
                        onChange={handleConfigChange("thresholdValue")}
                        placeholder="e.g., 85"
                      />

                      <StyledFormControl fullWidth margin="normal">
                        <InputLabel>Threshold Condition</InputLabel>
                        <Select
                          value={currentAlertConfig.thresholdCondition}
                          onChange={handleConfigChange("thresholdCondition")}
                          label="Threshold Condition"
                        >
                          <MenuItem value="shouldBeBelow">
                            Should be below threshold
                          </MenuItem>
                          <MenuItem value="shouldBeAbove">
                            Should be above threshold
                          </MenuItem>
                          <MenuItem value="percentChange">
                            Percentage change
                          </MenuItem>
                        </Select>
                      </StyledFormControl>
                    </Box>

                    {/* Right Column */}
                    <Box sx={{ flex: 1, minWidth: "280px" }}>
                      <StyledFormControl fullWidth margin="normal">
                        <InputLabel>Observed Metric</InputLabel>
                        <Select
                          value={currentAlertConfig.observedMetricFieldName}
                          onChange={handleConfigChange(
                            "observedMetricFieldName"
                          )}
                          label="Observed Metric"
                        >
                          <MenuItem value="any">Any metric</MenuItem>
                          {availableMetrics.map((metric, index) => (
                            <MenuItem key={index} value={metric}>
                              {metric}
                            </MenuItem>
                          ))}
                        </Select>
                      </StyledFormControl>

                      <StyledTextField
                        fullWidth
                        margin="normal"
                        label="Time Window (minutes)"
                        type="number"
                        value={currentAlertConfig.timeWindow}
                        onChange={handleConfigChange("timeWindow")}
                        placeholder="5"
                      />

                      <StyledFormControl fullWidth margin="normal">
                        <InputLabel>Threshold Color</InputLabel>
                        <Select
                          value={currentAlertConfig.thresholdColor}
                          onChange={handleConfigChange("thresholdColor")}
                          label="Threshold Color"
                        >
                          <MenuItem value="red">🔴 Red</MenuItem>
                          <MenuItem value="orange">🟠 Orange</MenuItem>
                          <MenuItem value="yellow">🟡 Yellow</MenuItem>
                          <MenuItem value="green">🟢 Green</MenuItem>
                          <MenuItem value="blue">🔵 Blue</MenuItem>
                          <MenuItem value="purple">🟣 Purple</MenuItem>
                        </Select>
                      </StyledFormControl>
                    </Box>
                  </Box>

                  <StyledTextField
                    fullWidth
                    margin="normal"
                    label="Alert Description"
                    multiline
                    rows={3}
                    value={currentAlertConfig.alertDescription}
                    onChange={handleConfigChange("alertDescription")}
                    placeholder="Describe when this alert should trigger and what action to take..."
                    sx={{ mt: 2 }}
                  />
                </FormCard>
              </Slide>

              <Slide in={true} direction="up" timeout={1000}>
                <Box
                  sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}
                >
                  <Button
                    onClick={() => setCreateDialogOpen(false)}
                    sx={{
                      "&:hover": {
                        bgcolor: "#f1f5f9",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    Cancel
                  </Button>

                  <StyledButton
                    variant="primary"
                    onClick={handleSave}
                    startIcon={<SaveIcon />}
                    disabled={
                      !currentAlertConfig.alertName ||
                      !currentAlertConfig.thresholdValue
                    }
                  >
                    {isEditingAlert ? "Update Alert" : "Create Alert"}
                  </StyledButton>
                </Box>
              </Slide>
            </ModalContent>
          </ModalContainer>
        </Fade>
      </AlertDialog>

      {/* Manage Alerts Dialog */}
      <AlertDialog
        open={manageDialogOpen}
        onClose={() => setManageDialogOpen(false)}
      >
        <Fade in={manageDialogOpen} timeout={600}>
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
                  <IconContainer color="primary" size="large">
                    <TrendingUpIcon />
                  </IconContainer>
                  <GradientText variant="h4" type="primary">
                    Manage Alert Thresholds
                  </GradientText>
                </Box>

                <IconButton
                  onClick={() => setManageDialogOpen(false)}
                  sx={{
                    transition: "all 0.3s ease",
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
              {alertThresholds.length === 0 ? (
                <Zoom in={true} timeout={800}>
                  <FormCard sx={{ textAlign: "center", py: 4 }}>
                    <IconContainer
                      color="primary"
                      size="large"
                      sx={{ margin: "0 auto 16px", cursor: "default" }}
                    >
                      <NotificationsActiveIcon />
                    </IconContainer>
                    <Typography variant="h6" sx={{ mb: 2, color: "#6b7280" }}>
                      No alerts configured
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ mb: 3, color: "#9ca3af" }}
                    >
                      Create your first alert to monitor important metrics and
                      get notified when thresholds are exceeded.
                    </Typography>
                    <StyledButton
                      variant="primary"
                      onClick={handleCreateNew}
                      startIcon={<AddIcon />}
                    >
                      Create First Alert
                    </StyledButton>
                  </FormCard>
                </Zoom>
              ) : (
                <Slide in={true} direction="up" timeout={800}>
                  <AlertListCard>
                    <List sx={{ p: 0 }}>
                      {alertThresholds.map((alert, index) => (
                        <Zoom
                          in={true}
                          timeout={600 + index * 100}
                          key={alert.alertID}
                        >
                          <ListItem
                            divider={index < alertThresholds.length - 1}
                            sx={{
                              transition: "all 0.3s ease",
                              "&:hover": {
                                bgcolor: "#f8fafc",
                                transform: "translateX(8px)",
                              },
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: "50%",
                                      bgcolor: alert.thresholdColor,
                                      boxShadow: `0 0 8px ${alert.thresholdColor}40`,
                                    }}
                                  />
                                  <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {alert.alertName || "Unnamed Alert"}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 1 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{ color: "#374151", mb: 0.5 }}
                                  >
                                    <strong>Threshold:</strong>{" "}
                                    {alert.thresholdValue}
                                    {alert.thresholdCondition ===
                                    "percentChange"
                                      ? "%"
                                      : ""}{" "}
                                    •<strong> Metric:</strong>{" "}
                                    {alert.observedMetricFieldName} •
                                    <strong> Window:</strong> {alert.timeWindow}{" "}
                                    min
                                  </Typography>
                                  {alert.alertDescription && (
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: "#6b7280",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      {alert.alertDescription}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                onClick={() => handleEdit(alert)}
                                sx={{
                                  mr: 1,
                                  "&:hover": {
                                    bgcolor: "#6f63ff20",
                                    color: "#6f63ff",
                                  },
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                onClick={() => onDeleteAlert?.(alert.alertID)}
                                sx={{
                                  "&:hover": {
                                    bgcolor: "#ef444420",
                                    color: "#ef4444",
                                  },
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        </Zoom>
                      ))}
                    </List>
                  </AlertListCard>
                </Slide>
              )}

              <Slide in={true} direction="up" timeout={1000}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    justifyContent: "space-between",
                    mt: 3,
                  }}
                >
                  <StyledButton
                    variant="primary"
                    onClick={handleCreateNew}
                    startIcon={<AddIcon />}
                  >
                    Add New Alert
                  </StyledButton>

                  <Button
                    onClick={() => setManageDialogOpen(false)}
                    sx={{
                      "&:hover": {
                        bgcolor: "#f1f5f9",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    Close
                  </Button>
                </Box>
              </Slide>
            </ModalContent>
          </ModalContainer>
        </Fade>
      </AlertDialog>
    </>
  );
};

export default AlertModal;
