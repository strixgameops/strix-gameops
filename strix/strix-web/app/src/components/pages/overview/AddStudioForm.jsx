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
  Button,
  TextField,
  Tooltip,
  Divider,
  Alert,
  Paper,
  Stack,
  Chip,
  Fade,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import {
  Close as CloseIcon,
  Business as StudioIcon,
  Image as ImageIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  AccountBalance as BuildingIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";

import useApi from "@strix/api";
import { useUser } from "@strix/userContext";
import { useAlert } from "@strix/alertsContext";
import ConfirmationModal from "./shared/inputs/ConfirmationModal";
import AlertingConfiguration from "./shared/inputs/AlertingConfiguration";

const AddStudioModal = ({
  isModalOpened,
  onDeleteStudio,
  currentPublisher,
  onModalOpen,
  onModalClose,
  uuid,
  currentStudio,
  onCreateStudio,
  isSettingsModal,
  settingsModalGameID,
}) => {
  // Form states
  const [formData, setFormData] = useState({
    studioName: "",
    studioIcon: "",
    alertEmail: "",
    alertSlackWebhook: "",
    alertDiscordWebhook: "",
  });

  const [formState, setFormState] = useState({
    showSkeleton: true,
    showLoading: false,
    showError: false,
    errorMessage: "",
    isNameError: false,
    isAuthority: false,
  });

  const [deletionDate, setDeletionDate] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const confirmFunction = useRef(null);
  const modalInfo = useRef(null);

  // API & Hooks
  const {
    addStudio,
    getStudioDetails,
    updateStudioDetails,
    removeStudio,
    cancelRemoveStudio,
    checkOrganizationAuthority,
  } = useApi();
  const { currentToken, getAccessToken } = useUser();
  const { triggerAlert } = useAlert();

  // Form data updates
  const updateFormData = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (field === "studioName" && formState.isNameError) {
        setFormState((prev) => ({ ...prev, isNameError: false }));
      }
    },
    [formState.isNameError]
  );

  const updateFormState = useCallback((updates) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      if (isSettingsModal) {
        await fetchStudioDetails();
        await checkAuthority();
      } else {
        onModalOpen?.();
        updateFormState({ showSkeleton: false, isAuthority: true });
      }
    };
    initialize();
  }, []);

  const fetchStudioDetails = async () => {
    try {
      const response = await getStudioDetails({
        studioID: settingsModalGameID,
      });
      if (response.success) {
        setFormData({
          studioName: response.studioName || "",
          studioIcon: response.studioIcon || "",
          alertEmail: response.alertEmail || "",
          alertSlackWebhook: response.alertSlackWebhook || "",
          alertDiscordWebhook: response.alertDiscordWebhook || "",
        });
        setDeletionDate(response.scheduledDeletionDate);
      }
    } catch (error) {
      console.error("Error fetching studio details:", error);
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
    if (!formData.studioName.trim()) {
      updateFormState({ isNameError: true });
      return;
    }

    updateFormState({ showLoading: true, showError: false });

    try {
      let response;
      if (isSettingsModal) {
        response = await updateStudioDetails({
          studioID: currentStudio.studioID,
          ...formData,
        });
      } else {
        response = await addStudio({
          publisherID: currentPublisher.publisherID,
          ...formData,
        });
      }

      if (response.success) {
        onCreateStudio?.();
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

  const handleStudioDeletion = async () => {
    updateFormState({ showLoading: true });
    try {
      const response = deletionDate
        ? await cancelRemoveStudio({
            studioID: currentStudio.studioID,
            token: currentToken,
          })
        : await removeStudio({
            studioID: currentStudio.studioID,
            token: currentToken,
          });

      if (response.success) {
        onDeleteStudio?.();
        if (deletionDate) onModalClose?.();
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

  const IconUploader = ({
    icon,
    onIconChange,
    disabled = false,
    label = "Add studio icon",
  }) => (
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
        !disabled && document.getElementById("studio-icon-upload").click()
      }
    >
      <input
        id="studio-icon-upload"
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
          alt="Studio icon"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <Stack alignItems="center" spacing={1}>
          <BuildingIcon sx={{ fontSize: 32, color: "text.secondary" }} />
          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
          >
            {label}
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

  const modalTitle = isSettingsModal ? "Studio Settings" : "Add New Studio";
  const submitButtonText = isSettingsModal
    ? formState.isAuthority
      ? "Save Changes"
      : "Close"
    : "Create Studio";

  const shouldShowSubmit = isSettingsModal ? true : formState.isAuthority;

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
              <StudioIcon color="primary" sx={{ fontSize: 28 }} />
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
                        <BuildingIcon color="primary" />
                        Studio Information
                      </Typography>

                      <TextField
                        fullWidth
                        label="Studio Name"
                        value={formData.studioName}
                        onChange={(e) =>
                          updateFormData("studioName", e.target.value)
                        }
                        error={formState.isNameError}
                        helperText={
                          formState.isNameError ? "Studio name is required" : ""
                        }
                        disabled={!formState.isAuthority}
                        required
                        placeholder="Enter your studio name"
                      />
                    </CardContent>
                  </Card>

                  {/* Alerting Configuration */}
                  <AlertingConfiguration
                    alertEmail={formData.alertEmail}
                    alertSlackWebhook={formData.alertSlackWebhook}
                    alertDiscordWebhook={formData.alertDiscordWebhook}
                    onEmailChange={(value) =>
                      updateFormData("alertEmail", value)
                    }
                    onSlackChange={(value) =>
                      updateFormData("alertSlackWebhook", value)
                    }
                    onDiscordChange={(value) =>
                      updateFormData("alertDiscordWebhook", value)
                    }
                    disabled={!formState.isAuthority}
                  />
                </Stack>
              </Grid>

              {/* Right Column - Icon Upload */}
              <Grid item xs={12} md={4}>
                <Stack spacing={2} alignItems="center">
                  <Typography variant="subtitle1" fontWeight={600}>
                    Studio Icon
                  </Typography>
                  <IconUploader
                    icon={formData.studioIcon}
                    onIconChange={(value) =>
                      updateFormData("studioIcon", value)
                    }
                    disabled={!formState.isAuthority}
                    label="Add studio icon"
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
          {isSettingsModal && formState.isAuthority && window.__env.edition !== "community" && (
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

                  <Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={500}
                      gutterBottom
                    >
                      Delete Studio
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {deletionDate
                        ? `Studio deletion is scheduled. Will be permanently deleted on ${dayjs.utc(deletionDate).format("MMM DD, YYYY")}. All games within this studio will also be deleted.`
                        : "This will permanently delete the studio and all games within it after 72 hours. This action affects all associated games and data."}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={deletionDate ? <CancelIcon /> : <DeleteIcon />}
                      disabled={formState.showLoading}
                      onClick={() =>
                        handleOpenConfirmModal({
                          func: handleStudioDeletion,
                          modalInfoLocal: {
                            bodyText: deletionDate
                              ? `Type "${formData.studioName}" to cancel deletion`
                              : `Type "${formData.studioName}" to confirm studio deletion`,
                            title: deletionDate
                              ? "Cancel Studio Deletion"
                              : "Delete Studio",
                            confirmString: formData.studioName,
                            alertMessage: deletionDate
                              ? "Studio deletion cancelled successfully"
                              : "Studio deletion scheduled successfully",
                          },
                        })
                      }
                    >
                      {deletionDate ? "Cancel Deletion" : "Delete Studio"}
                    </Button>
                  </Box>
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
              {shouldShowSubmit && (
                <LoadingButton
                  onClick={
                    isSettingsModal && !formState.isAuthority
                      ? onModalClose
                      : handleSubmit
                  }
                  loading={formState.showLoading}
                  variant="contained"
                  size="large"
                  disabled={isSettingsModal && !formState.isAuthority}
                >
                  {submitButtonText}
                </LoadingButton>
              )}
            </Stack>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddStudioModal;
