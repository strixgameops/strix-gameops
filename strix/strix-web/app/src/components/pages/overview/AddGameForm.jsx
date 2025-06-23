import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Collapse,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Divider,
  Alert,
  Paper,
  Stack,
  Chip,
  InputAdornment,
  Fade,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Security as SecurityIcon,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  ContentCopy as ContentCopyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  GamepadRounded as GameIcon,
  CloudUpload as UploadIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";

import useApi from "@strix/api";
import { useUser } from "@strix/userContext";
import { useAlert } from "@strix/alertsContext";
import ConfirmationModal from "./shared/inputs/ConfirmationModal";
import { currencies } from "shared/currencies.js";

const AddGameModal = ({
  isModalOpened,
  onModalOpen,
  onModalClose,
  uuid,
  currentStudio,
  onCreateGame,
  onDeleteGame,
  isSettingsModal,
  settingsModalGameID,
  onGameCreated,
}) => {
  // Form states
  const [formData, setFormData] = useState({
    gameName: "",
    gameEngine: "Unity",
    gameKey: uuid,
    gameIcon: "",
    realtimeDeployEnabled: false,
    serviceApiKeys: [],
  });

  const [formState, setFormState] = useState({
    showSkeleton: true,
    showLoading: false,
    showError: false,
    errorMessage: "",
    isNameError: false,
    isEngineError: false,
    isAuthority: false,
    showingApiKeys: false,
  });

  const [deletionDate, setDeletionDate] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const confirmFunction = useRef(null);
  const modalInfo = useRef(null);

  // API & Hooks
  const {
    createGame,
    getGameDetails,
    updateGameDetails,
    revokeGameKey,
    removeGame,
    cancelRemoveGame,
    checkOrganizationAuthority,
  } = useApi();
  const { currentToken, getAccessToken } = useUser();
  const { triggerAlert } = useAlert();

  const availableServices = [
    { service: "googleplayservices", name: "Google Play" },
  ];

  const ENGINE_OPTIONS = ["Unity", "Unreal Engine"];

  // Form data updates
  const updateFormData = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (field === "gameName" && formState.isNameError) {
        setFormState((prev) => ({ ...prev, isNameError: false }));
      }
      if (field === "gameEngine" && formState.isEngineError) {
        setFormState((prev) => ({ ...prev, isEngineError: false }));
      }
    },
    [formState.isNameError, formState.isEngineError]
  );

  const updateFormState = useCallback((updates) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Service API key management
  const updateServiceApiKey = useCallback((service, field, value) => {
    setFormData((prev) => ({
      ...prev,
      serviceApiKeys: prev.serviceApiKeys.some((s) => s.service === service)
        ? prev.serviceApiKeys.map((key) =>
            key.service === service ? { ...key, [field]: value } : key
          )
        : [...prev.serviceApiKeys, { service, [field]: value }],
    }));
  }, []);

  const getServiceApiKey = useCallback(
    (service, field = "key") => {
      const serviceKey = formData.serviceApiKeys.find(
        (s) => s.service === service
      );
      return serviceKey?.[field] || "";
    },
    [formData.serviceApiKeys]
  );

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      if (isSettingsModal) {
        await fetchGameDetails();
        await checkAuthority();
      } else {
        onModalOpen?.();
        updateFormState({ showSkeleton: false, isAuthority: true });
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    updateFormData("gameKey", uuid);
  }, [uuid]);

  const fetchGameDetails = async () => {
    try {
      const response = await getGameDetails({ gameID: settingsModalGameID });
      if (response.success) {
        setFormData({
          gameName: response.gameName || "",
          gameEngine: response.gameEngine || "",
          gameKey: response.gameSecretKey || "",
          gameIcon: response.gameIcon || "",
          realtimeDeployEnabled: response.realtimeDeploy || false,
          serviceApiKeys: response.apiKeys || [],
        });
        setDeletionDate(response.gameScheduledDeletionDate);
      }
    } catch (error) {
      console.error("Error fetching game details:", error);
    } finally {
      updateFormState({ showSkeleton: false });
    }
  };

  const checkAuthority = async () => {
    try {
      const token = await getAccessToken();
      const res = await checkOrganizationAuthority({
        orgID: currentStudio.studioID,
        token,
      });
      updateFormState({ isAuthority: res.success });
    } catch (error) {
      console.error("Error checking authority:", error);
      updateFormState({ isAuthority: false });
    }
  };

  const handleSubmit = async () => {
    const errors = {};
    if (!formData.gameName.trim()) errors.isNameError = true;
    if (!formData.gameEngine.trim()) errors.isEngineError = true;

    if (Object.keys(errors).length > 0) {
      updateFormState(errors);
      return;
    }

    updateFormState({ showLoading: true, showError: false });

    try {
      let response;
      if (isSettingsModal) {
        response = await updateGameDetails({
          gameID: settingsModalGameID,
          gameName: formData.gameName,
          gameEngine: formData.gameEngine,
          gameIcon: formData.gameIcon,
          apiKeys: formData.serviceApiKeys,
          gameSecretKey: formData.gameKey,
          token: currentToken,
          realtimeDeploy: formData.realtimeDeployEnabled,
        });
      } else {
        response = await createGame({
          studioID: currentStudio.studioID,
          gameName: formData.gameName,
          gameEngine: formData.gameEngine,
          gameKey: formData.gameKey,
          gameIcon: formData.gameIcon,
          token: currentToken,
        });
      }

      if (response.success) {
        // Call onCreateGame first to refresh the games list
        onCreateGame?.();

        // If this is a new game creation and we have the game data,
        // pass it to the callback so it can be auto-selected
        if (!isSettingsModal && response.gameID && onGameCreated) {
          // Construct the game object with the data we have
          const newGameData = {
            gameID: response.gameID || response.gameID,
            gameName: formData.gameName,
            gameEngine: formData.gameEngine,
            gameIcon: formData.gameIcon,
            gameSecretKey: formData.gameKey,
            studioID: currentStudio.studioID,
            ...response.gameData,
          };
          onGameCreated(newGameData);
        }

        onModalClose?.();
      } else {
        updateFormState({
          showError: true,
          errorMessage: response.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      updateFormState({
        showError: true,
        errorMessage: "Network error occurred",
      });
    } finally {
      updateFormState({ showLoading: false });
    }
  };

  const handleRevokeKey = async () => {
    updateFormState({ showLoading: true });
    try {
      const response = await revokeGameKey({
        gameID: settingsModalGameID,
        token: currentToken,
      });
      if (response.success) {
        updateFormData("gameKey", response.apiKey);
      }
    } catch (error) {
      console.error("Error revoking key:", error);
    } finally {
      updateFormState({ showLoading: false });
    }
  };

  const handleGameDeletion = async () => {
    updateFormState({ showLoading: true });
    try {
      const response = deletionDate
        ? await cancelRemoveGame({ gameID: settingsModalGameID })
        : await removeGame({
            gameID: settingsModalGameID,
            token: currentToken,
          });

      if (response.success) {
        onDeleteGame?.();
        onModalClose?.();
      }
    } catch (error) {
      console.error("Error processing deletion:", error);
    } finally {
      updateFormState({ showLoading: false });
    }
  };

  const handleOpenConfirmModal = ({ func, modalInfoLocal }) => {
    confirmFunction.current = func;
    modalInfo.current = modalInfoLocal;
    setOpenConfirmModal(true);
  };

  const confirmAction = () => {
    triggerAlert(modalInfo.current.alertMessage);
    setOpenConfirmModal(false);
    confirmFunction.current();
  };

  const IconUploader = ({ icon, onIconChange, disabled = false }) => (
    <Paper
      sx={{
        width: 120,
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        border: 2,
        borderStyle: "dashed",
        borderColor: icon ? "primary.main" : "grey.300",
        bgcolor: icon ? "transparent" : "grey.50",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.2s ease",
        "&:hover": disabled
          ? {}
          : {
              borderColor: "primary.main",
              bgcolor: "action.hover",
              transform: "scale(1.02)",
            },
      }}
      onClick={() =>
        !disabled && document.getElementById("icon-upload").click()
      }
    >
      <input
        id="icon-upload"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => onIconChange(e.target.result);
            reader.readAsDataURL(file);
          }
        }}
      />

      {icon ? (
        <img
          src={icon}
          alt="Game icon"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <Stack alignItems="center" spacing={1}>
          <ImageIcon sx={{ fontSize: 32, color: "text.secondary" }} />
          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
          >
            Add Icon
          </Typography>
        </Stack>
      )}

      {!disabled && (
        <Fade in={!!icon}>
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              transition: "opacity 0.2s",
              "&:hover": { opacity: 1 },
            }}
          >
            <EditIcon sx={{ color: "white", fontSize: 24 }} />
          </Box>
        </Fade>
      )}
    </Paper>
  );

  const modalTitle = isSettingsModal ? "Game Settings" : "Add New Game";
  const submitButtonText = isSettingsModal
    ? formState.isAuthority
      ? "Save Changes"
      : "Close"
    : "Create Game";

  return (
    <>
      {modalInfo.current && (
        <ConfirmationModal
          open={openConfirmModal}
          onConfirm={confirmAction}
          onCancel={() => setOpenConfirmModal(false)}
          bodyText={modalInfo.current.bodyText}
          title={modalInfo.current.title}
          confirmString={modalInfo.current.confirmString}
        />
      )}

      <Dialog
        open={isModalOpened}
        onClose={onModalClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            minHeight: "60vh",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <GameIcon color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h5" component="h2" fontWeight={600}>
                {modalTitle}
              </Typography>
            </Box>
            <IconButton onClick={onModalClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ px: 3, py: 3 }}>
          {formState.showSkeleton ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <Typography variant="body1" color="text.secondary">
                Loading...
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={4}>
              {/* Left Column - Form Fields */}
              <Grid item xs={12} md={8}>
                <Stack spacing={3}>
                  {/* Basic Information Card */}
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          mb: 3,
                          fontWeight: 600,
                        }}
                      >
                        <SettingsIcon color="primary" />
                        Basic Information
                      </Typography>

                      <Stack spacing={3}>
                        <TextField
                          fullWidth
                          label="Game Name"
                          value={formData.gameName}
                          onChange={(e) =>
                            updateFormData("gameName", e.target.value)
                          }
                          error={formState.isNameError}
                          helperText={
                            formState.isNameError ? "Game name is required" : ""
                          }
                          disabled={!formState.isAuthority}
                          // required
                        />
                        {/* 
                        <FormControl fullWidth error={formState.isEngineError}>
                          <InputLabel>Game Engine</InputLabel>
                          <Select
                            value={formData.gameEngine}
                            label="Game Engine"
                            disabled={!formState.isAuthority}
                            onChange={(e) =>
                              updateFormData("gameEngine", e.target.value)
                            }
                          >
                            {ENGINE_OPTIONS.map((engine) => (
                              <MenuItem key={engine} value={engine}>
                                {engine}
                              </MenuItem>
                            ))}
                          </Select>
                          {formState.isEngineError && (
                            <Typography
                              variant="caption"
                              color="error"
                              sx={{ mt: 0.5, ml: 2 }}
                            >
                              Game engine is required
                            </Typography>
                          )}
                        </FormControl> */}

                        <TextField
                          fullWidth
                          label="API Secret Key"
                          value={"*".repeat(48)}
                          disabled
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SecurityIcon color="action" />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title="Copy to clipboard">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      navigator.clipboard.writeText(
                                        formData.gameKey
                                      )
                                    }
                                  >
                                    <ContentCopyIcon />
                                  </IconButton>
                                </Tooltip>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* App Details Card */}
                  {isSettingsModal &&
                    !settingsModalGameID.startsWith("brawlDemo") && (
                      <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent
                          sx={{ p: 3, pb: formState.showingApiKeys ? 3 : 2 }}
                        >
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            onClick={() =>
                              updateFormState({
                                showingApiKeys: !formState.showingApiKeys,
                              })
                            }
                            sx={{
                              cursor: "pointer",
                              "&:hover": {
                                bgcolor: "action.hover",
                                borderRadius: 2,
                                mx: -1,
                                px: 1,
                                py: 0.5,
                              },
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                fontWeight: 600,
                              }}
                            >
                              <SettingsIcon color="primary" />
                              App Integration
                            </Typography>
                            {formState.showingApiKeys ? (
                              <ExpandLessIcon />
                            ) : (
                              <ExpandMoreIcon />
                            )}
                          </Box>

                          <Collapse in={formState.showingApiKeys}>
                            <Box sx={{ mt: 3 }}>
                              <Box
                                sx={{
                                  mb: 3,
                                  p: 2,
                                  bgcolor: "info.light",
                                  borderRadius: 2,
                                }}
                              >
                                <Typography variant="subtitle2" gutterBottom>
                                  Google Play Services Integration
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Configure your app's connection to Google Play
                                  Services for in-app purchases and licensing.
                                </Typography>
                              </Box>

                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Package Name"
                                    placeholder="com.yourcompany.yourgame"
                                    value={getServiceApiKey(
                                      "googleplayservices",
                                      "packageName"
                                    )}
                                    onChange={(e) =>
                                      updateServiceApiKey(
                                        "googleplayservices",
                                        "packageName",
                                        e.target.value
                                      )
                                    }
                                    disabled={!formState.isAuthority}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="License Key"
                                    value={getServiceApiKey(
                                      "googleplayservices",
                                      "licenseKey"
                                    )}
                                    onChange={(e) =>
                                      updateServiceApiKey(
                                        "googleplayservices",
                                        "licenseKey",
                                        e.target.value
                                      )
                                    }
                                    disabled={!formState.isAuthority}
                                  />
                                </Grid>
                                {window.__env.edition !== "community" && (
                                <Grid item xs={12} sm={6}>
                                  <FormControl fullWidth size="small">
                                    <InputLabel>Profile Currency</InputLabel>
                                    <Select
                                      value={getServiceApiKey(
                                        "googleplayservices",
                                        "secondary"
                                      )}
                                      label="Profile Currency"
                                      onChange={(e) =>
                                        updateServiceApiKey(
                                          "googleplayservices",
                                          "secondary",
                                          e.target.value
                                        )
                                      }
                                      disabled={!formState.isAuthority}
                                    >
                                      {currencies.map((currency) => (
                                        <MenuItem
                                          key={currency.code}
                                          value={currency.code}
                                        >
                                          {currency.name} ({currency.code})
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
)}
                                {window.__env.edition !== "community" && (
                                  <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={
                                            formData.realtimeDeployEnabled
                                          }
                                          onChange={(e) =>
                                            updateFormData(
                                              "realtimeDeployEnabled",
                                              e.target.checked
                                            )
                                          }
                                          disabled={!formState.isAuthority}
                                        />
                                      }
                                      label="Enable Realtime Deploy"
                                    />
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          </Collapse>
                        </CardContent>
                      </Card>
                    )}
                </Stack>
              </Grid>

              {/* Right Column - Icon Upload */}
              <Grid item xs={12} md={4}>
                <Stack spacing={2} alignItems="center">
                  <Typography variant="subtitle1" fontWeight={600}>
                    Game Icon
                  </Typography>
                  <IconUploader
                    icon={formData.gameIcon}
                    onIconChange={(value) => updateFormData("gameIcon", value)}
                    disabled={!formState.isAuthority}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    textAlign="center"
                  >
                    Upload a square image (PNG, JPG)
                    <br />
                    Recommended: 512×512px
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          )}

          {/* Error Display */}
          {formState.showError && (
            <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
              {formState.errorMessage}
            </Alert>
          )}

          {/* Danger Zone */}
          {isSettingsModal && formState.isAuthority && (
            <Card
              variant="outlined"
              sx={{
                mt: 4,
                borderColor: "error.main",
                bgcolor: "error.lighter",
                borderWidth: 2,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  color="error.main"
                  gutterBottom
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    fontWeight: 600,
                    mb: 2,
                  }}
                >
                  <WarningIcon />
                  Danger Zone
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                  These actions are permanent and cannot be undone. Please
                  proceed with caution.
                </Typography>

                <Stack spacing={3}>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={500}
                      gutterBottom
                    >
                      Revoke Secret Key
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      This will immediately invalidate the current API key and
                      generate a new one. All SDK connections will be lost until
                      updated.
                    </Typography>
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<SecurityIcon />}
                      disabled={formState.showLoading}
                      onClick={() =>
                        handleOpenConfirmModal({
                          func: handleRevokeKey,
                          modalInfoLocal: {
                            bodyText: `Type "${formData.gameName}" to confirm secret key revocation`,
                            title: "Revoke Secret Key",
                            confirmString: formData.gameName,
                            alertMessage: "Secret key revoked successfully",
                          },
                        })
                      }
                    >
                      Revoke Secret Key
                    </Button>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={500}
                      gutterBottom
                    >
                      Delete Game
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {deletionDate
                        ? `Game deletion is scheduled. Will be permanently deleted on ${dayjs.utc(deletionDate).format("MMM DD, YYYY")}.`
                        : "This will permanently delete the game and all associated data after 72 hours."}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={deletionDate ? <CancelIcon /> : <DeleteIcon />}
                      disabled={formState.showLoading}
                      onClick={() =>
                        handleOpenConfirmModal(
                          deletionDate
                            ? {
                                func: handleGameDeletion,
                                modalInfoLocal: {
                                  bodyText: `Type "${formData.gameName}" to cancel deletion`,
                                  title: "Cancel Game Deletion",
                                  confirmString: formData.gameName,
                                  alertMessage:
                                    "Game deletion cancelled successfully",
                                },
                              }
                            : {
                                func: handleGameDeletion,
                                modalInfoLocal: {
                                  bodyText: `Type "${formData.gameName}" to confirm deletion`,
                                  title: "Delete Game",
                                  confirmString: formData.gameName,
                                  alertMessage:
                                    "Game deletion scheduled successfully",
                                },
                              }
                        )
                      }
                    >
                      {deletionDate ? "Cancel Deletion" : "Delete Game"}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2.5 }}>
          <Box
            display="flex"
            width="100%"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              {isSettingsModal && (
                <Chip
                  label={formState.isAuthority ? "Admin Access" : "Read Only"}
                  color={formState.isAuthority ? "success" : "default"}
                  size="small"
                  sx={{ fontWeight: 500 }}
                />
              )}
            </Box>
            <Stack direction="row" spacing={2}>
              <Button onClick={onModalClose} variant="outlined" size="large">
                Cancel
              </Button>
              <LoadingButton
                onClick={handleSubmit}
                loading={formState.showLoading}
                variant="contained"
                size="large"
                disabled={isSettingsModal && !formState.isAuthority}
              >
                {submitButtonText}
              </LoadingButton>
            </Stack>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddGameModal;
