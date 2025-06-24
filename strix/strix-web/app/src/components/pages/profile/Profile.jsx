import React, { useEffect, useState } from "react";
import { useUser } from "@strix/userContext";
import titles from "titles";
import { Helmet } from "react-helmet";
import PropTypes from "prop-types";
import {
  Tabs,
  Tab,
  Box,
  Typography,
  Button,
  Tooltip,
  TextField,
  Container,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
  Paper,
  Grid,
  Divider,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import imageCompression from "browser-image-compression";
import {
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { useAlert } from "@strix/alertsContext";
import { getAuthInstance } from "../../firebase/firebase.jsx";
import { useNavigate } from "react-router-dom";
import OrganizationsWidget from "./OrganizationsWidget";
import useApi from "@strix/api";
import LoadingButton from "@mui/lab/LoadingButton";
import HardConfirmModal from "shared/HardConfirmModal/HardConfirmModal";

// Styled Components
const StyledContainer = styled(Container)(({ theme }) => ({
  background: "#fafbfc",
  minHeight: "100vh",
  paddingTop: "32px",
  paddingBottom: "15rem",
  overflowY: "scroll",
}));

const GradientCard = styled(Card)(({ theme, variant = "default" }) => {
  const variants = {
    default: {
      background: "#ffffff",
      border: `2px solid ${theme.palette.primary.main}30`,
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    },
    elevated: {
      background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      border: `2px solid ${theme.palette.primary.main}40`,
      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
    },
    danger: {
      background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
      border: "2px solid #ef444440",
      boxShadow: "0 4px 20px rgba(239, 68, 68, 0.15)",
    },
  };

  return {
    ...variants[variant],
    borderRadius: "16px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: variants[variant].boxShadow
        .replace("0.08)", "0.15)")
        .replace("0.12)", "0.20)")
        .replace("0.15)", "0.25)"),
    },
  };
});

const StyledTabs = styled(Tabs)(({ theme }) => ({
  background: "#ffffff",
  borderRadius: "12px",
  border: `2px solid ${theme.palette.primary.main}20`,
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
  marginBottom: "32px",
  "& .MuiTabs-indicator": {
    display: "none",
  },
  "& .MuiTabs-flexContainer": {
    padding: "6px",
  },
  "& .MuiTab-root": {
    borderRadius: "8px",
    margin: "0 4px",
    textTransform: "none",
    fontWeight: 600,
    minHeight: "44px",
    color: "#475569",
    transition: "all 0.2s ease",
    "&:hover": {
      background: `${theme.palette.primary.main}10`,
      color: theme.palette.primary.main,
    },
    "&.Mui-selected": {
      background: theme.palette.primary.main,
      color: "#ffffff",
      boxShadow: `0 4px 12px ${theme.palette.primary.main}30`,
    },
  },
}));

const IconContainer = styled(Box)(({
  theme,
  color = "primary",
  size = "medium",
}) => {
  const colors = {
    primary: theme.palette.primary.main,
    success: "#22c55e",
    error: "#ef4444",
    warning: "#f59e0b",
  };

  const sizes = {
    small: { width: "36px", height: "36px" },
    medium: { width: "44px", height: "44px" },
    large: { width: "52px", height: "52px" },
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
  };
});

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: "180px",
  height: "180px",
  border: `4px solid ${theme.palette.primary.main}30`,
  boxShadow: `0 8px 25px ${theme.palette.primary.main}20`,
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "scale(1.05)",
    border: `4px solid ${theme.palette.primary.main}60`,
    boxShadow: `0 12px 35px ${theme.palette.primary.main}30`,
  },
}));

const EditableField = styled(Box)(({ theme }) => ({
  position: "relative",
  "& .MuiTextField-root, & .MuiFormControl-root": {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      "& fieldset": {
        borderColor: "#d1d5db",
        borderWidth: "2px",
      },
      "&:hover fieldset": {
        borderColor: `${theme.palette.primary.main}60`,
      },
      "&.Mui-focused fieldset": {
        borderColor: theme.palette.primary.main,
        borderWidth: "2px",
        boxShadow: `0 0 0 3px ${theme.palette.primary.main}20`,
      },
    },
  },
}));

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function Profile() {
  const {
    initiateChangeUserProfile,
    confirmUserChangeProfileCode,
    getOrganizationsInfo,
    removeUser,
    cancelRemoveUser,
  } = useApi();
  const navigate = useNavigate();
  const auth = getAuthInstance();
  const { triggerAlert } = useAlert();
  const { userProfile, updateUserProfile } = useUser();
  const { currentToken, getAccessToken } = useUser();

  // State management
  const [localUserName, setLocalUserName] = useState("");
  const [changingLocalUserName, setChangingLocalUserName] = useState(false);
  const [localRole, setLocalRole] = useState("");
  const [changingLocalRole, setChangingLocalRole] = useState(false);
  const [localEmail, setLocalEmail] = useState("");
  const [changingLocalEmail, setChangingLocalEmail] = useState(false);
  const [confirmingChangeEmail, setConfirmingChangeEmail] = useState(false);
  const [confirmCodeEmail, setConfirmCodeEmail] = useState("");
  const [localPassword, setLocalPassword] = useState("*********************");
  const [changingLocalPassword, setChangingLocalPassword] = useState(false);
  const [confirmingChangePassword, setConfirmingChangePassword] =
    useState(false);
  const [confirmCodePassword, setConfirmCodePassword] = useState("");
  const [publishers, setPublishers] = useState([]);
  const [tabs, setTabs] = React.useState(0);
  const [showLoading, setShowLoading] = useState(false);
  const [confirmModalInfo, setConfirmModalInfo] = useState();

  const initialSetupDone = React.useRef(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (userProfile && userProfile.username && userProfile.email) {
      if (!initialSetupDone.current) {
        setLocalUserName(userProfile.username);
        setLocalRole(userProfile.role);
        setLocalEmail(userProfile.email);
        fetchPublishers();
        initialSetupDone.current = true;
      }
    }
  }, [userProfile]);

  async function fetchPublishers() {
    const resp = await getOrganizationsInfo({ email: userProfile.email });
    if (resp.success) {
      setPublishers(resp.publishers);
    }
  }

  // Reset functions
  const resetChangingLocalUserName = () => {
    setChangingLocalUserName(false);
    setLocalUserName(userProfile.username);
  };

  const resetChangingLocalRole = () => {
    setChangingLocalRole(false);
    setLocalRole(userProfile.role);
  };

  const resetChangingLocalEmail = () => {
    setChangingLocalEmail(false);
    setLocalEmail(userProfile.email);
    setConfirmingChangeEmail(false);
    setConfirmCodeEmail("");
  };

  const resetChangingLocalPassword = () => {
    setChangingLocalPassword(false);
    setLocalPassword("*********************");
    setConfirmingChangePassword(false);
    setConfirmCodePassword("");
  };

  // Change functions
  async function changeUserAvatar(newData) {
    const resp = await initiateChangeUserProfile({
      type: "avatar",
      email: userProfile.email,
      newData: newData,
    });
    if (resp.success) {
      triggerAlert("Avatar changed successfully!", "success");
      updateUserProfile({ ...userProfile, avatar: newData });
    } else {
      triggerAlert("Error changing avatar: " + resp.message, "error");
    }
  }

  async function changeUserName(newData) {
    setChangingLocalUserName(false);
    const resp = await initiateChangeUserProfile({
      type: "username",
      email: userProfile.email,
      newData: newData,
    });
    if (resp.success) {
      triggerAlert("Username changed successfully!", "success");
      updateUserProfile({ ...userProfile, username: newData });
    } else {
      triggerAlert("Error changing username: " + resp.message, "error");
    }
  }

  async function changeUserRole(newData) {
    setChangingLocalRole(false);
    const resp = await initiateChangeUserProfile({
      type: "role",
      email: userProfile.email,
      newData: newData,
    });
    if (resp.success) {
      triggerAlert("Job title changed successfully!", "success");
      updateUserProfile({ ...userProfile, role: newData });
    } else {
      triggerAlert("Error changing job title: " + resp.message, "error");
    }
  }

  async function startConfirmingEmail() {
    if (localEmail !== userProfile.email) {
      setConfirmingChangeEmail(true);
      const resp = await initiateChangeUserProfile({
        type: "email",
        email: userProfile.email,
      });
      if (resp.success) {
        triggerAlert(
          "An email verification code has been sent to " + userProfile.email,
          "success"
        );
      } else {
        triggerAlert("Error sending message: " + resp.message, "error");
      }
    } else {
      resetChangingLocalEmail();
    }
  }

  async function confirmChangeEmail() {
    const resp = await confirmUserChangeProfileCode({
      type: "email",
      email: userProfile.email,
      code: confirmCodeEmail,
      newData: localEmail,
    });
    if (resp.success === true) {
      resetChangingLocalEmail();
      triggerAlert("Email changed successfully", "success");
      updateUserProfile({ ...userProfile, email: localEmail });
      navigate("/signout");
    } else {
      triggerAlert("Error changing email: " + resp.message, "error");
    }
  }

  async function startConfirmingPassword() {
    setConfirmingChangePassword(true);
    const resp = await initiateChangeUserProfile({
      type: "password",
      email: userProfile.email,
    });
    if (resp.success) {
      triggerAlert(
        "An email verification code has been sent to " + userProfile.email,
        "success"
      );
    } else {
      triggerAlert("Error sending message: " + resp.message, "error");
    }
  }

  async function confirmChangePassword() {
    const resp = await confirmUserChangeProfileCode({
      type: "password",
      email: userProfile.email,
      code: confirmCodePassword,
      newData: localPassword,
    });
    if (resp.success === true) {
      resetChangingLocalPassword();
      triggerAlert("Password changed successfully", "success");
      navigate("/signout");
    } else {
      triggerAlert("Error changing password: " + resp.message, "error");
    }
  }

  // File handling
  const handleFileUpload = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64File = e.target.result;
          const compressedImage = await compressImage(base64File);
          changeUserAvatar(compressedImage);
        };
        reader.readAsDataURL(selectedFile);
      } catch (error) {}
    }
  };

  const clearImage = () => {
    changeUserAvatar("");
    fileInputRef.current.value = null;
  };

  const compressImage = async (base64Image) => {
    const byteCharacters = atob(base64Image.split(",")[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    const blob = new Blob(byteArrays, { type: "image/png" });

    const compressedImage = await imageCompression(blob, {
      maxWidthOrHeight: 250,
    });

    return await blobToBase64(compressedImage);
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result;
        resolve(base64data);
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  };

  const openRemoveConfirmModal = (modalInfo) => {
    setConfirmModalInfo(modalInfo);
  };

  async function confirmUserDeletion() {
    setShowLoading(true);

    if (!auth.currentUser) return;
    const token = await getAccessToken();
    if (userProfile.scheduledDeletionDate) {
      const resp = await cancelRemoveUser({
        email: userProfile.email,
        token: token,
      });
      if (resp.success) {
        updateUserProfile({ ...userProfile, scheduledDeletionDate: null });
        triggerAlert("Deletion canceled successfully!", "success");
      } else {
        triggerAlert("Deletion cancel error: " + resp.message, "error");
      }
    } else {
      const resp = await removeUser({
        email: userProfile.email,
        token: token,
      });
      if (resp.success) {
        updateUserProfile({
          ...userProfile,
          scheduledDeletionDate: resp.date,
        });
      }
    }

    setShowLoading(false);
  }

  const handleTabChange = (event, newValue) => {
    setTabs(newValue);
  };

  if (userProfile == null) return <div></div>;

  return (
    <StyledContainer maxWidth="xl">
      <Helmet>
        <title>{titles.profile}</title>
      </Helmet>

      <HardConfirmModal
        modalInfo={confirmModalInfo}
        onConfirm={confirmUserDeletion}
      />

      {window.__env.edition !== "community" && (
        <Box sx={{ mb: 4 }}>
          <StyledTabs
            value={tabs}
            onChange={handleTabChange}
            aria-label="profile navbar tabs"
          >
            <Tab
              label="User Settings"
              icon={<SettingsIcon />}
              iconPosition="start"
            />
            <Tab
              label="Organizations"
              icon={<BusinessIcon />}
              iconPosition="start"
            />
          </StyledTabs>
        </Box>
      )}

      <CustomTabPanel value={tabs} index={0}>
        <Stack spacing={4}>
          {/* Avatar and Basic Info */}
          <GradientCard variant="elevated">
            <CardContent sx={{ p: 4 }}>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
              >
                <IconContainer color="primary">
                  <PersonIcon />
                </IconContainer>
                Profile Information
              </Typography>

              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ position: "relative" }}>
                      <StyledAvatar
                        src={userProfile.avatar}
                        sx={{
                          cursor: "pointer",
                          "&:hover": {
                            "&::after": {
                              content: '"Click to change"',
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: "rgba(0,0,0,0.7)",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "50%",
                              fontSize: "14px",
                            },
                          },
                        }}
                        onClick={handleFileUpload}
                      >
                        {!userProfile.avatar && (
                          <CloudUploadIcon sx={{ fontSize: 40 }} />
                        )}
                      </StyledAvatar>

                      {userProfile.avatar && (
                        <Tooltip title="Remove avatar">
                          <IconButton
                            onClick={clearImage}
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              background: "rgba(255,255,255,0.9)",
                              "&:hover": { background: "rgba(255,255,255,1)" },
                            }}
                            size="small"
                          >
                            <CloseIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".png,.jpg,.svg,.jpeg"
                      style={{ display: "none" }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Stack spacing={3}>
                    {/* Username Field */}
                    <EditableField>
                      <TextField
                        label="Name"
                        value={localUserName}
                        onChange={(e) => setLocalUserName(e.target.value)}
                        fullWidth
                        disabled={!changingLocalUserName}
                        InputProps={{
                          endAdornment: (
                            <Stack direction="row" spacing={1}>
                              {!changingLocalUserName ? (
                                <Tooltip title="Edit name">
                                  <IconButton
                                    onClick={() =>
                                      setChangingLocalUserName(true)
                                    }
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <>
                                  <Tooltip title="Save">
                                    <IconButton
                                      onClick={() =>
                                        changeUserName(localUserName)
                                      }
                                      color="primary"
                                    >
                                      <CheckIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Cancel">
                                    <IconButton
                                      onClick={resetChangingLocalUserName}
                                    >
                                      <CloseIcon />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Stack>
                          ),
                        }}
                      />
                    </EditableField>

                    {/* Role Field */}
                    <EditableField>
                      <FormControl fullWidth disabled={!changingLocalRole}>
                        <InputLabel>Job Title</InputLabel>
                        <Select
                          value={localRole}
                          label="Job Title"
                          onChange={(e) => setLocalRole(e.target.value)}
                        >
                          <MenuItem value="Data Scientist">
                            Data Scientist
                          </MenuItem>
                          <MenuItem value="Live-Ops Manager">
                            Live-Ops Manager
                          </MenuItem>
                          <MenuItem value="Game Designer">
                            Game Designer
                          </MenuItem>
                          <MenuItem value="Software / Game Developer">
                            Software / Game Developer
                          </MenuItem>
                          <MenuItem value="Sales & Marketing">
                            Sales & Marketing
                          </MenuItem>
                          <MenuItem value="Producer">
                            Game Producer / Senior Executive
                          </MenuItem>
                          <MenuItem value="CEO / Founder / Investor">
                            CEO / Founder
                          </MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>
                      <Box sx={{ position: "absolute", right: 12, top: 12 }}>
                        {!changingLocalRole ? (
                          <Tooltip title="Edit role">
                            <IconButton
                              onClick={() => setChangingLocalRole(true)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Save">
                              <IconButton
                                onClick={() => changeUserRole(localRole)}
                                color="primary"
                              >
                                <CheckIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel">
                              <IconButton onClick={resetChangingLocalRole}>
                                <CloseIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                      </Box>
                    </EditableField>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </GradientCard>

          {/* Security Settings */}
          <GradientCard>
            <CardContent sx={{ p: 4 }}>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
              >
                <IconContainer color="warning">
                  <SecurityIcon />
                </IconContainer>
                Security Settings
              </Typography>

              <Stack spacing={3}>
                {/* Email Field */}
                <Box>
                  <EditableField>
                    <TextField
                      label="Email"
                      value={localEmail}
                      onChange={(e) => setLocalEmail(e.target.value)}
                      fullWidth
                      disabled={!changingLocalEmail || confirmingChangeEmail}
                      InputProps={{
                        startAdornment: (
                          <EmailIcon sx={{ mr: 1, color: "text.secondary" }} />
                        ),
                        endAdornment: (
                          <Stack direction="row" spacing={1}>
                            {!changingLocalEmail ? (
                              <Tooltip title="Change email">
                                <IconButton
                                  onClick={() => setChangingLocalEmail(true)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            ) : !confirmingChangeEmail ? (
                              <>
                                <Tooltip title="Send verification">
                                  <IconButton
                                    onClick={startConfirmingEmail}
                                    color="primary"
                                  >
                                    <CheckIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancel">
                                  <IconButton onClick={resetChangingLocalEmail}>
                                    <CloseIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : null}
                          </Stack>
                        ),
                      }}
                    />
                  </EditableField>

                  {confirmingChangeEmail && (
                    <EditableField sx={{ mt: 2 }}>
                      <TextField
                        label="Verification Code"
                        value={confirmCodeEmail}
                        onChange={(e) => setConfirmCodeEmail(e.target.value)}
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <Stack direction="row" spacing={1}>
                              <Tooltip title="Confirm">
                                <IconButton
                                  onClick={confirmChangeEmail}
                                  color="primary"
                                >
                                  <CheckIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancel">
                                <IconButton onClick={resetChangingLocalEmail}>
                                  <CloseIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ),
                        }}
                      />
                    </EditableField>
                  )}
                </Box>

                {/* Password Field */}
                <Box>
                  <EditableField>
                    <TextField
                      label="Password"
                      value={localPassword}
                      onChange={(e) => setLocalPassword(e.target.value)}
                      type="password"
                      fullWidth
                      disabled={!changingLocalPassword}
                      autoComplete="current-password"
                      InputProps={{
                        endAdornment: (
                          <Stack direction="row" spacing={1}>
                            {!changingLocalPassword ? (
                              <Tooltip title="Change password">
                                <IconButton
                                  onClick={() => setChangingLocalPassword(true)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <>
                                <Tooltip title="Send verification">
                                  <IconButton
                                    onClick={startConfirmingPassword}
                                    color="primary"
                                  >
                                    <CheckIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancel">
                                  <IconButton
                                    onClick={resetChangingLocalPassword}
                                  >
                                    <CloseIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                        ),
                      }}
                    />
                  </EditableField>

                  {confirmingChangePassword && (
                    <EditableField sx={{ mt: 2 }}>
                      <TextField
                        label="Verification Code"
                        value={confirmCodePassword}
                        onChange={(e) => setConfirmCodePassword(e.target.value)}
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <Stack direction="row" spacing={1}>
                              <Tooltip title="Confirm">
                                <IconButton
                                  onClick={confirmChangePassword}
                                  color="primary"
                                >
                                  <CheckIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancel">
                                <IconButton
                                  onClick={resetChangingLocalPassword}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ),
                        }}
                      />
                    </EditableField>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </GradientCard>

          {/* Danger Zone */}
          {window.__env.edition !== "community" && (
            <GradientCard variant="danger">
              <CardContent sx={{ p: 4 }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
                >
                  <IconContainer color="error">
                    <WarningIcon />
                  </IconContainer>
                  Danger Zone
                </Typography>

                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    1. You can remove all your account data, including all
                    organizations you are owner of. Organizations will be
                    deleted as well, even if there are other people in it.
                  </Typography>
                  <Typography variant="body2">
                    2. This action will be performed after 72 hours. You can
                    cancel it at any time before that.
                  </Typography>
                </Alert>

                <LoadingButton
                  loading={showLoading}
                  loadingPosition="start"
                  onClick={() => {
                    if (userProfile.scheduledDeletionDate) {
                      confirmUserDeletion();
                    } else {
                      openRemoveConfirmModal({
                        title: "Confirm user deletion",
                        bodyText:
                          "Are you sure you want to delete user " +
                          userProfile.username +
                          " (" +
                          userProfile.email +
                          ")" +
                          "? Enter " +
                          userProfile.email +
                          " to confirm.",
                        confirmString: userProfile.email,
                        alertMessage: "User deletion is scheduled successfully",
                      });
                    }
                  }}
                  variant="outlined"
                  color="error"
                  sx={{
                    borderWidth: "2px",
                    "&:hover": {
                      borderWidth: "2px",
                    },
                  }}
                >
                  {userProfile.scheduledDeletionDate
                    ? "Cancel deletion"
                    : "Delete my account"}
                </LoadingButton>
              </CardContent>
            </GradientCard>
          )}
        </Stack>
      </CustomTabPanel>

      <CustomTabPanel value={tabs} index={1}>
        {userProfile && (
          <OrganizationsWidget
            publishers={publishers}
            userProfile={userProfile}
            askRefresh={fetchPublishers}
          />
        )}
      </CustomTabPanel>
    </StyledContainer>
  );
}

export default Profile;
