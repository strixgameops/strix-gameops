import React, { useEffect, useState, useRef } from "react";
import {
  Collapse,
  Button,
  Typography,
  Tooltip,
  TextField,
  Card,
  CardContent,
  Box,
  Stack,
  Chip,
  IconButton,
  Badge,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Paper
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useUser } from "@strix/userContext";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PersonRemove as PersonRemoveIcon,
  ExitToApp as ExitToAppIcon,
  PersonAddAlt1 as PersonAddAlt1Icon,
  Business as BusinessIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon
} from "@mui/icons-material";
import { useAlert } from "@strix/alertsContext";
import { getAuthInstance } from "../../firebase/firebase.jsx";
import useApi from "@strix/api";
import { checkEmail } from "shared/sharedFunctions";
import CheckIcon from "@mui/icons-material/Check";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

// Styled Components
const OrganizationsContainer = styled(Card)(({ theme }) => ({
  background: '#ffffff',
  borderRadius: '16px',
  border: `2px solid ${theme.palette.primary.main}30`,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  height: '100%',
  minHeight: '600px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
    border: `2px solid ${theme.palette.primary.main}40`,
  },
}));

const PublisherCard = styled(Card)(({ theme, expanded }) => ({
  background: expanded 
    ? `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.primary.main}15 100%)`
    : '#ffffff',
  border: expanded 
    ? `2px solid ${theme.palette.primary.main}40`
    : '2px solid #e5e7eb',
  borderRadius: '12px',
  marginBottom: '16px',
  transition: 'all 0.3s ease',
  '&:hover': {
    border: `2px solid ${theme.palette.primary.main}50`,
    boxShadow: `0 4px 15px ${theme.palette.primary.main}20`,
  },
}));

const StudioCard = styled(Card)(({ theme, expanded }) => ({
  background: expanded 
    ? `linear-gradient(135deg, ${theme.palette.secondary.main}08 0%, ${theme.palette.secondary.main}15 100%)`
    : '#fafbfc',
  border: expanded 
    ? `2px solid ${theme.palette.secondary.main}40`
    : '2px solid #e5e7eb',
  borderRadius: '8px',
  marginBottom: '8px',
  marginLeft: '16px',
  transition: 'all 0.3s ease',
  '&:hover': {
    border: `2px solid ${theme.palette.secondary.main}50`,
    boxShadow: `0 2px 10px ${theme.palette.secondary.main}15`,
  },
}));

const UserListItem = styled(ListItem)(({ theme }) => ({
  borderRadius: '8px',
  marginBottom: '4px',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: `${theme.palette.primary.main}08`,
    transform: 'translateX(8px)',
  },
}));

const ActionButton = styled(IconButton)(({ theme, variant = 'default' }) => {
  const variants = {
    default: {
      color: theme.palette.text.secondary,
      '&:hover': {
        background: `${theme.palette.primary.main}15`,
        color: theme.palette.primary.main,
      },
    },
    add: {
      color: theme.palette.success.main,
      background: `${theme.palette.success.main}10`,
      border: `1px solid ${theme.palette.success.main}30`,
      '&:hover': {
        background: theme.palette.success.main,
        color: '#ffffff',
        transform: 'scale(1.1)',
      },
    },
    remove: {
      color: theme.palette.error.main,
      '&:hover': {
        background: `${theme.palette.error.main}15`,
        color: theme.palette.error.main,
        transform: 'scale(1.1)',
      },
    },
    confirm: {
      color: theme.palette.success.main,
      background: `${theme.palette.success.main}20`,
      '&:hover': {
        background: theme.palette.success.main,
        color: '#ffffff',
      },
    }
  };

  return {
    ...variants[variant],
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  };
});

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    border: `2px solid ${theme.palette.primary.main}30`,
  },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.primary.main}15 100%)`,
  borderBottom: `2px solid ${theme.palette.primary.main}20`,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '4px',
    height: '100%',
    background: theme.palette.primary.main,
  }
}));

const IconContainer = styled(Box)(({ theme, color = 'primary', size = 'medium' }) => {
  const colors = {
    primary: theme.palette.primary.main,
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  };

  const sizes = {
    small: { width: '32px', height: '32px' },
    medium: { width: '40px', height: '40px' },
    large: { width: '48px', height: '48px' },
  };

  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...sizes[size],
    borderRadius: '10px',
    background: `${colors[color]}15`,
    color: colors[color],
    border: `2px solid ${colors[color]}30`,
  };
});

function OrganizationsWidget({ publishers, userProfile, askRefresh }) {
  const { triggerAlert } = useAlert();
  const auth = getAuthInstance();
  const { currentToken, getAccessToken } = useUser();

  const [inviteeEmail, setInviteeEmail] = useState("");
  const { removeUserFromOrganization, addUserToOrganization } = useApi();

  const [expandedPublishers, setExpandedPublishers] = useState([]);
  const [expandedStudios, setExpandedStudios] = useState([]);
  const [pendingRemoveUserID, setPendingRemoveUserID] = useState(null);
  const [pendingRemoveUserStudioID, setPendingRemoveUserStudioID] = useState(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [currentClickedStudioID, setCurrentClickedStudioID] = useState(null);

  function togglePublisher(publisherID) {
    setExpandedPublishers((prev) => 
      prev.includes(publisherID)
        ? prev.filter((id) => id !== publisherID)
        : [...prev, publisherID]
    );
  }

  function toggleStudio(studioID) {
    setExpandedStudios((prev) =>
      prev.includes(studioID)
        ? prev.filter((id) => id !== studioID)
        : [...prev, studioID]
    );
  }

  function checkAuthority(organization, userEmail) {
    let result = organization.users;
    if (!result) return false;
    result = result.find((u) => u.userID === userEmail);
    if (!result) return false;
    result = result.userPermissions.find((p) => p.permission === "admin")
      ? true
      : false;
    if (!result) return false;
    return result;
  }

  function trimStr(string, len) {
    return string.length > len ? `${string.slice(0, len)}..` : string;
  }

  const handleInviteClick = (studioID) => {
    setCurrentClickedStudioID(studioID);
    setInviteDialogOpen(true);
  };

  const handleInviteClose = () => {
    setInviteDialogOpen(false);
    setInviteeEmail("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!auth.currentUser || !currentClickedStudioID) return;
    const token = await getAccessToken();
    const resp = await addUserToOrganization({
      studioID: currentClickedStudioID,
      targetUserEmail: inviteeEmail,
      token: token,
    });
    if (resp.success) {
      triggerAlert("Successfully added user to the studio!", "success");
      askRefresh();
    } else {
      triggerAlert(
        "Could not add user to the studio: " + resp.message,
        "error"
      );
    }
    
    setInviteeEmail("");
    handleInviteClose();
  };

  function startRemovingUser(userID, studioID) {
    if (!pendingRemoveUserID) {
      setPendingRemoveUserID(userID);
      setPendingRemoveUserStudioID(studioID);
    } else {
      if (userID === pendingRemoveUserID) {
        setPendingRemoveUserID(null);
        setPendingRemoveUserStudioID(null);
        callKickUser(userID);
      } else {
        setPendingRemoveUserID(userID);
        setPendingRemoveUserStudioID(studioID);
      }
    }
  }

  function resetPendingRemove() {
    setPendingRemoveUserID(null);
    setPendingRemoveUserStudioID(null);
  }

  async function callKickUser(userID) {
    if (!auth.currentUser || !pendingRemoveUserStudioID) return;
    const token = await getAccessToken();
    const resp = await removeUserFromOrganization({
      studioID: pendingRemoveUserStudioID,
      targetUserEmail: userID,
      token: token,
    });
    if (resp.success) {
      triggerAlert("Successfully removed user from the studio!", "success");
      askRefresh();
    } else {
      triggerAlert(
        "Could not remove user from the studio: " + resp.message,
        "error"
      );
    }
  }

  return (
    <Box>
      <StyledDialog
        open={inviteDialogOpen}
        onClose={handleInviteClose}
        maxWidth="sm"
        fullWidth
      >
        <StyledDialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconContainer color="success">
              <PersonAddAlt1Icon />
            </IconContainer>
            <Typography variant="h6">
              Invite User to Studio
            </Typography>
          </Box>
        </StyledDialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            label="Email Address"
            value={inviteeEmail}
            onChange={(event) => setInviteeEmail(event.target.value)}
            fullWidth
            margin="normal"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                '& fieldset': {
                  borderColor: '#d1d5db',
                  borderWidth: '2px',
                },
                '&:hover fieldset': {
                  borderColor: (theme) => `${theme.palette.primary.main}60`,
                },
                '&.Mui-focused fieldset': {
                  borderColor: (theme) => theme.palette.primary.main,
                  borderWidth: '2px',
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleInviteClose} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Send Invitation
          </Button>
        </DialogActions>
      </StyledDialog>

      <OrganizationsContainer>
        <CardContent sx={{ p: 0, height: '100%' }}>
          <Box sx={{ p: 3, borderBottom: '2px solid #e5e7eb' }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconContainer color="primary" size="large">
                <BusinessIcon />
              </IconContainer>
              Organizations & Studios
            </Typography>
          </Box>
          
          <Box sx={{ p: 3, height: 'calc(100% - 100px)', overflowY: 'auto' }}>
            <Stack spacing={2}>
              {publishers.map((publisher) => (
                <PublisherCard 
                  key={publisher.publisherID} 
                  expanded={expandedPublishers.includes(publisher.publisherID)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Button
                      variant={
                        expandedPublishers.includes(publisher.publisherID)
                          ? "contained"
                          : "outlined"
                      }
                      onClick={() => togglePublisher(publisher.publisherID)}
                      fullWidth
                      sx={{
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                        borderRadius: '10px',
                        p: 2,
                        height: '56px',
                      }}
                    >
                      <IconContainer color="primary" size="small" sx={{ mr: 2 }}>
                        <BusinessIcon fontSize="small" />
                      </IconContainer>
                      
                      <Box sx={{ flex: 1, textAlign: 'left' }}>
                        <Tooltip title={publisher.publisherName} placement="top">
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {trimStr(publisher.publisherName, 50)}
                          </Typography>
                        </Tooltip>
                      </Box>

                      {checkAuthority(publisher, userProfile.email) && (
                        <Chip 
                          label="Owner" 
                          size="small" 
                          color="primary" 
                          variant="filled"
                          sx={{ mr: 2 }}
                        />
                      )}

                      {expandedPublishers.includes(publisher.publisherID) ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </Button>

                    <Collapse in={expandedPublishers.includes(publisher.publisherID)}>
                      <Box sx={{ mt: 2 }}>
                        {publisher.studios.map((studio) => (
                          <StudioCard 
                            key={studio.studioID}
                            expanded={expandedStudios.includes(studio.studioID)}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Button
                                  variant={
                                    expandedStudios.includes(studio.studioID)
                                      ? "contained"
                                      : "outlined"
                                  }
                                  onClick={() => toggleStudio(studio.studioID)}
                                  sx={{
                                    flex: 1,
                                    justifyContent: 'flex-start',
                                    textTransform: 'none',
                                    borderRadius: '8px',
                                    height: '48px',
                                  }}
                                >
                                  <IconContainer color="secondary" size="small" sx={{ mr: 2 }}>
                                    <GroupIcon fontSize="small" />
                                  </IconContainer>
                                  
                                  <Box sx={{ flex: 1, textAlign: 'left', display: "flex", alignItems: "center", gap: 3 }}>
                                    <Tooltip title={studio.studioName} placement="top">
                                      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                        {trimStr(studio.studioName, 40)}
                                      </Typography>
                                    </Tooltip>
                                    <Typography variant="caption">
                                      {studio.users.length} member(s)
                                    </Typography>
                                  </Box>
                                </Button>

                                <Tooltip title="Add user to studio" placement="top">
                                  <ActionButton 
                                    variant="add"
                                    onClick={() => handleInviteClick(studio.studioID)}
                                  >
                                    <PersonAddAlt1Icon />
                                  </ActionButton>
                                </Tooltip>
                              </Box>

                              {studio.expirationDate && (
                                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <ScheduleIcon fontSize="small" color="action" />
                                  <Typography variant="caption" color="text.secondary">
                                    Expires: {dayjs.utc(studio.expirationDate).format("LLL")}
                                  </Typography>
                                </Box>
                              )}

                              <Collapse in={expandedStudios.includes(studio.studioID)}>
                                <Divider sx={{ my: 2 }} />
                                <List dense>
                                  {studio.users?.map((studioUser) => (
                                    <UserListItem key={studioUser.userID}>
                                      <ListItemIcon>
                                        <PersonIcon color="action" />
                                      </ListItemIcon>
                                      
                                      <ListItemText
                                        primary={
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Tooltip title={studioUser.username} placement="top">
                                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {trimStr(`${studioUser.username}`, 30)}
                                              </Typography>
                                            </Tooltip>
                                            {checkAuthority(studio, studioUser.userID) && (
                                              <Chip 
                                                label="Admin" 
                                                size="small" 
                                                color="warning" 
                                                variant="outlined"
                                                icon={<AdminIcon />}
                                              />
                                            )}
                                          </Box>
                                        }
                                        secondary={
                                          <Typography variant="caption" color="text.secondary">
                                            {studioUser.userID}
                                          </Typography>
                                        }
                                      />

                                      {!checkAuthority(studio, studioUser.userID) && (
                                        <ListItemSecondaryAction>
                                          <Tooltip
                                            title={
                                              userProfile.email === studioUser.userID
                                                ? "Leave studio"
                                                : "Remove user from studio"
                                            }
                                            placement="top"
                                          >
                                            <ActionButton
                                              variant={
                                                pendingRemoveUserID === studioUser.userID
                                                  ? "confirm"
                                                  : "remove"
                                              }
                                              onMouseLeave={resetPendingRemove}
                                              onClick={() =>
                                                startRemovingUser(
                                                  studioUser.userID,
                                                  studio.studioID
                                                )
                                              }
                                            >
                                              {userProfile.email === studioUser.userID ? (
                                                pendingRemoveUserID === studioUser.userID ? (
                                                  <CheckIcon />
                                                ) : (
                                                  <ExitToAppIcon />
                                                )
                                              ) : pendingRemoveUserID === studioUser.userID ? (
                                                <CheckIcon />
                                              ) : (
                                                <PersonRemoveIcon />
                                              )}
                                            </ActionButton>
                                          </Tooltip>
                                        </ListItemSecondaryAction>
                                      )}
                                    </UserListItem>
                                  ))}
                                </List>
                              </Collapse>
                            </CardContent>
                          </StudioCard>
                        ))}
                      </Box>
                    </Collapse>
                  </CardContent>
                </PublisherCard>
              ))}

              {publishers.length === 0 && (
                <Paper 
                  sx={{ 
                    p: 4, 
                    textAlign: 'center', 
                    background: '#f8fafc',
                    border: '2px dashed #d1d5db',
                    borderRadius: '12px'
                  }}
                >
                  <IconContainer color="primary" size="large" sx={{ mx: 'auto', mb: 2 }}>
                    <BusinessIcon />
                  </IconContainer>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Organizations Found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You are not currently a member of any organizations.
                  </Typography>
                </Paper>
              )}
            </Stack>
          </Box>
        </CardContent>
      </OrganizationsContainer>
    </Box>
  );
}

export default OrganizationsWidget;