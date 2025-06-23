import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import titles from "titles";
import {
  Container,
  Grid,
  Paper,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  Button,
  CircularProgress,
  Modal,
  TextField,
  Chip,
  Slider,
  Card,
  CardContent,
  Divider,
  Alert,
  Stack,
  ListItem,
  ListItemText,
  List,
  Autocomplete,
  Checkbox,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import WarningIcon from "@mui/icons-material/Warning";
import InfoIcon from "@mui/icons-material/Info";
import BugReportIcon from "@mui/icons-material/BugReport";
import BalanceIcon from "@mui/icons-material/Balance";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import HistoryIcon from "@mui/icons-material/History";
import PublishIcon from "@mui/icons-material/Publish";
import LabelIcon from "@mui/icons-material/Label";
import useApi from "@strix/api";
import { useGame, useBranch } from "@strix/gameContext";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Logging from "./Logging.jsx";

const VersionDeployment = () => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const {
    cookBranchContent,
    getLatestDeployedBranches,
    getGameDeploymentCatalog,
    updateGameDeploymentCatalog,
    removeDeploymentVersion,
    getDeploymentChecksums,
    getCurrentAudienceDeploymentStats,
  } = useApi();

  // State for current version
  const [currentVersion, setCurrentVersion] = useState(
    branch.includes("_") ? branch.split("_")[0] : branch
  );
  const [versions, setVersions] = useState([]);
  const [environments, setEnvironments] = useState([]);

  // State for new version deployment
  const [deployInProcess, setDeployInProcess] = useState(false);
  const [deployStatus, setDeployStatus] = useState("undefined");
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [openVersionRemoveModal, setOpenVersionRemoveModal] = useState(false);
  const [versionPendingRemoval, setVersionPendingRemoval] = useState({});

  // State for environment assignment
  const [selectedEnvironment, setSelectedEnvironment] = useState("");
  const [selectedVersionsForEnv, setSelectedVersionsForEnv] = useState([]);
  const [versionShares, setVersionShares] = useState({});
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [openAssignConfirmModal, setOpenAssignConfirmModal] = useState(false);
  const [envChanged, setEnvChanged] = useState(false);
  const [changedEnvironmentsNames, setChangedEnvironmentsNames] = useState([]);
  const [shouldDeployRealtime, setShouldDeployRealtime] = useState(false);

  // Loading states
  const [isLoading_environmentAssign, setLoadingEnvironmentAssign] =
    useState(false);
  const [isLoading_VersionRemoval, setLoadingVersionRemoval] = useState(false);

  // Timestamp markers for the fetch cycle.
  const deploymentStatsFetchInterval = 30000;
  const [lastFetchTime, setLastFetchTime] = useState(Date.now());
  const [nextFetchTime, setNextFetchTime] = useState(
    Date.now() + deploymentStatsFetchInterval
  );
  const [progress, setProgress] = useState(0);
  const [deploymentStats, setDeploymentStats] = useState([]);

  useEffect(() => {
    // This effect updates the progress bar.
    const timer = setInterval(() => {
      const now = Date.now();
      const totalInterval = nextFetchTime - lastFetchTime;
      const elapsed = now - lastFetchTime;
      let newProgress = (elapsed / totalInterval) * 100;
      if (newProgress > 100) {
        newProgress = 100;
      }
      setProgress(newProgress);
    }, 500); // update every half second
    return () => clearInterval(timer);
  }, [lastFetchTime, nextFetchTime]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCycle() {
      while (!cancelled) {
        // Start of a new cycle:
        const cycleStart = Date.now();
        setLastFetchTime(cycleStart);
        setNextFetchTime(cycleStart + deploymentStatsFetchInterval);

        // Start the fetch.
        const resp = await getCurrentAudienceDeploymentStats({
          gameID: game.gameID,
        });
        if (resp.success) {
          setDeploymentStats(resp.data);
        }

        // Calculate remaining time until the next scheduled fetch.
        const now = Date.now();
        const delay = Math.max(
          cycleStart + deploymentStatsFetchInterval - now,
          0
        );

        // If fetch took longer than the allotted interval, delay will be 0.
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    fetchCycle();
    return () => {
      cancelled = true;
    };
  }, []);

  // useEffect(() => {
  //   const intervalId = setInterval(async () => {
  //     try {
  //       await getCurrentAudienceDeploymentStats();
  //     } catch (error) {
  //       console.error("Error in scheduled tasks:", error);
  //     }
  //   }, deploymentStatsFetchInterval);
  //   return () => clearInterval(intervalId);
  // }, []);

  function hideInitialVersion(v) {
    return v.filter((v) => v.branch !== "1.0.0.0");
  }

  async function fetchVersions() {
    const resp = await getLatestDeployedBranches({
      gameID: game.gameID,
      limit: 100,
    });
    if (resp.success) {
      setVersions(hideInitialVersion(resp.result)); // Hide this version to prevent user from deploying it, because it is always empty
    }
  }
  async function fetchCatalog() {
    const resp = await getGameDeploymentCatalog({ gameID: game.gameID });
    if (resp.success) {
      setEnvironments(resp.result.environments);
    }
  }

  useEffect(() => {
    fetchVersions();
    fetchCatalog();
  }, []);

  // Calculate next version based on selected tags
  const calculateNextVersion = () => {
    const baseParts = currentVersion.split(".").map(Number);
    const newVersion = [...baseParts];

    if (selectedTags.includes("breaking change")) {
      newVersion[0] += 1;
      newVersion[1] = 0;
      newVersion[2] = 0;
      newVersion[3] = 0;
    } else if (selectedTags.includes("feature")) {
      newVersion[1] += 1;
      newVersion[2] = 0;
      newVersion[3] = 0;
    } else if (selectedTags.includes("balance")) {
      newVersion[2] += 1;
      newVersion[3] = 0;
    } else if (selectedTags.includes("fix")) {
      newVersion[3] += 1;
    }

    return newVersion.join(".");
  };

  const nextVersion = calculateNextVersion();

  const tagOptions = [
    {
      label: "Fix",
      value: "fix",
      icon: <BugReportIcon sx={{ color: "red" }} />,
    },
    {
      label: "Balance",
      value: "balance",
      icon: <BalanceIcon sx={{ color: "orange" }} />,
    },
    {
      label: "Feature",
      value: "feature",
      icon: <NewReleasesIcon sx={{ color: "green" }} />,
    },
    {
      label: "Breaking Change",
      value: "breaking change",
      icon: <WarningAmberIcon sx={{ color: "purple" }} />,
    },
  ];

  const handleTagChange = (event, newValue) => {
    setSelectedTags(newValue);
  };

  const deployNewVersion = async () => {
    if (!commitMessage) {
      return;
    }

    setDeployInProcess(true);
    setDeployStatus("undefined");

    try {
      const resp = await cookBranchContent({
        gameID: game.gameID,
        sourceBranch: branch,
        tags: selectedTags,
        commitMessage: commitMessage,
      });
      if (resp.success) {
        setVersions(hideInitialVersion([resp.result, ...versions]));
        setCommitMessage("");
        setSelectedTags([]);
        setDeployStatus("success");
      }
    } catch (error) {
      console.error("Error deploying version:", error);
      setDeployStatus("failed");
    } finally {
      setDeployInProcess(false);
    }
  };

  const handleAssignVersions = async () => {
    if (selectedVersionsForEnv.length === 0) {
      return;
    }

    // Validate that shares add up to 100%
    const totalShare = selectedVersionsForEnv.reduce(
      (sum, verId) => sum + (versionShares[verId] || 0),
      0
    );
    if (Math.abs(totalShare - 100) > 0.01) {
      return;
    }

    // Update environment assignments
    const updatedEnvironments = environments.map((env) => {
      if (env.name === selectedEnvironment) {
        return {
          ...env,
          deployments: selectedVersionsForEnv.map((verId) => ({
            version: verId,
            audienceShare: versionShares[verId] || 0,
          })),
        };
      }
      return env;
    });
    let changedEnvs = new Set(changedEnvironmentsNames);
    changedEnvs.add(selectedEnvironment);
    setChangedEnvironmentsNames(Array.from(changedEnvs));
    setEnvChanged(
      JSON.stringify(updatedEnvironments) !== JSON.stringify(environments)
    );
    setEnvironments(updatedEnvironments);
    setOpenAssignModal(false);
    setSelectedVersionsForEnv([]);
    setVersionShares({});
  };

  async function confirmAssignEnvVersion() {
    if (!envChanged) return;
    setLoadingEnvironmentAssign(true);
    for (let env of environments.filter((e) =>
      changedEnvironmentsNames.includes(e.name)
    )) {
      const resp = await updateGameDeploymentCatalog({
        gameID: game.gameID,
        environment: env.name,
        updateObj: env.deployments,
        deployRealtime: shouldDeployRealtime,
      });
    }
    setEnvChanged(false);
    setLoadingEnvironmentAssign(false);
    setChangedEnvironmentsNames([]);
  }

  const handleOpenAssignModal = (envName) => {
    setSelectedEnvironment(envName);
    const env = environments.find((e) => e.name === envName);
    if (env) {
      const currentVersions = env.deployments.map((d) => d.version);
      setSelectedVersionsForEnv(currentVersions);

      const shares = {};
      env.deployments.forEach((d) => {
        shares[d.version] = d.audienceShare;
      });
      setVersionShares(shares);
    }
    setOpenAssignConfirmModal(false);
    setOpenAssignModal(true);
  };

  const handleVersionSelectionChange = (event, newValue) => {
    setSelectedVersionsForEnv(newValue);

    // Initialize shares evenly for newly added versions
    const newShares = { ...versionShares };
    const existingTotal = newValue
      .filter((vId) => versionShares[vId] !== undefined)
      .reduce((sum, vId) => sum + (versionShares[vId] || 0), 0);

    const newVersions = newValue.filter(
      (vId) => versionShares[vId] === undefined
    );
    if (newVersions.length > 0) {
      const remainingShare = Math.max(0, 100 - existingTotal);
      const sharePerNew =
        newVersions.length > 0 ? remainingShare / newVersions.length : 0;

      newVersions.forEach((vId) => {
        newShares[vId] = sharePerNew;
      });
    }

    setVersionShares(newShares);
  };

  const handleShareChange = (version, newValue) => {
    setVersionShares({
      ...versionShares,
      [version]: newValue,
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  async function removeVersion() {
    setLoadingVersionRemoval(true);
    try {
      const resp = await removeDeploymentVersion({
        gameID: game.gameID,
        version: versionPendingRemoval.branch,
      });
      if (resp.success) {
        const updatedVersions = versions.filter(
          (v) => v.branch !== versionPendingRemoval.branch
        );
        setVersions(hideInitialVersion(updatedVersions));
        setVersionPendingRemoval({});
      }
      setOpenVersionRemoveModal(false);
      setLoadingVersionRemoval(false);
    } catch (error) {
      setOpenVersionRemoveModal(false);
      setLoadingVersionRemoval(false);
      throw error;
    }
  }
  function formatNumber(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  function getDeploymentStatsEnvVersions(envName, existingVersions) {
    if (
      deploymentStats[envName] &&
      Object.keys(deploymentStats[envName]).length > 0
    ) {
      const existing = existingVersions.map((v) => v.version);
      return Object.keys(deploymentStats[envName])
        .filter((v) => existing.includes(v) === false)
        .map((v) => ({ version: v, audienceShare: 0, unDeployed: true }));
    }
    return [];
  }
  return (
    <Box
      sx={{
        p: 4,
        maxWidth: "100%",
        width: "100%",
        height: "100%",
        overflowY: "scroll",
      }}
    >
      <Helmet>
        <title>{titles.lo_deployment || "Version Deployment"}</title>
      </Helmet>

      {/* Deploy New Version Section */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: "2rem",
          backgroundColor: "white",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: "medium" }}>
          Deploy New Version
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Currently working on <strong>Version {currentVersion}</strong>.
                The next version will be <strong>{nextVersion}</strong> based on
                selected tags.
              </Typography>
            </Alert>
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Commit Message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              variant="outlined"
              placeholder="Describe the changes in this version..."
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Autocomplete
              multiple
              options={tagOptions}
              value={selectedTags.map(
                (tag) => tagOptions.find((t) => t.value === tag) || tag
              )}
              onChange={(e, newValues) =>
                handleTagChange(
                  e,
                  newValues.map((item) =>
                    typeof item === "string" ? item : item.value
                  )
                )
              }
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.label
              }
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {option.icon}
                    <Typography sx={{ ml: 1 }}>{option.label}</Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Version Tags"
                  placeholder="Select tags"
                  variant="outlined"
                />
              )}
              renderTags={(selectedTags, getTagProps) =>
                selectedTags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={typeof tag === "string" ? tag : tag.label}
                    icon={typeof tag === "string" ? <LabelIcon /> : tag.icon}
                    {...getTagProps({ index })}
                  />
                ))
              }
            />
          </Grid>

          <Grid
            item
            xs={12}
            sx={{ display: "flex", justifyContent: "flex-end" }}
          >
            <LoadingButton
              loading={deployInProcess}
              disabled={
                deployInProcess ||
                commitMessage.trim() === "" ||
                selectedTags.length === 0
              }
              onClick={() => setOpenConfirmModal(true)}
              loadingIndicator={<CircularProgress color="inherit" size={24} />}
              variant="contained"
              size="large"
              startIcon={
                deployInProcess ? (
                  <div />
                ) : deployStatus === "failed" ? (
                  <WarningIcon />
                ) : deployStatus === "success" ? (
                  <CloudDoneIcon />
                ) : (
                  <CloudUploadIcon />
                )
              }
              sx={{
                minWidth: 180,
                height: 48,
                fontSize: "1rem",
                fontWeight: "medium",
                backgroundColor:
                  deployStatus === "failed"
                    ? "error.main"
                    : deployStatus === "success"
                      ? "success.main"
                      : "primary.main",
                "&:hover": {
                  backgroundColor:
                    deployStatus === "failed"
                      ? "error.dark"
                      : deployStatus === "success"
                        ? "success.dark"
                        : "primary.dark",
                },
              }}
            >
              {deployInProcess
                ? "Cooking content..."
                : deployStatus === "failed"
                  ? "Failed"
                  : deployStatus === "success"
                    ? "Content cooked"
                    : "Cook content"}
            </LoadingButton>
          </Grid>
        </Grid>
      </Paper>

      {/* Environments Section */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: "2rem",
          backgroundColor: "var(--regular-card-bg-color)",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: "medium" }}>
            Environments
          </Typography>
          <Box
            sx={{
              ml: 2,
              display: "flex",
              alignItems: "center",
              position: "relative",
            }}
          >
            <Tooltip title="Deployments player counts update">
              <CircularProgress
                variant="determinate"
                sx={(theme) => ({
                  color: theme.palette.grey[50],
                  ...theme.applyStyles("dark", {
                    color: theme.palette.grey[800],
                  }),
                })}
                size={25}
                thickness={4}
                value={100}
              />
              <CircularProgress
                sx={{ position: "absolute", left: 0, zIndex: 1 }}
                variant="determinate"
                value={progress}
                size={25}
                thickness={4}
              />
            </Tooltip>
          </Box>
        </Box>
        <Grid container spacing={3}>
          {environments &&
            environments.map((env) => (
              <Grid item xs={12} md={4} key={env.name}>
                <Card
                  sx={{
                    backgroundColor: "white",
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {env.name.charAt(0).toUpperCase() + env.name.slice(1)}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {env.deployments
                      .concat(
                        getDeploymentStatsEnvVersions(env.name, env.deployments)
                      )
                      .map((deployment, idx) => {
                        const versionInfo = versions.find(
                          (v) => v.branch === deployment.version
                        );
                        return (
                          <Box
                            key={idx}
                            sx={{
                              mb: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography
                              variant="body1"
                              color={deployment.unDeployed ? "grey" : "text"}
                            >
                              {versionInfo
                                ? versionInfo.branch
                                : deployment.version}{" "}
                              - {deployment.audienceShare}%
                              {deployment.unDeployed ? " (Not deployed)" : ""}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mr: 2 }}
                            >
                              {deploymentStats[env.name] &&
                              deploymentStats[env.name][deployment.version]
                                ? `${formatNumber(deploymentStats[env.name][deployment.version])} players`
                                : "0 players"}
                            </Typography>
                          </Box>
                        );
                      })}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleOpenAssignModal(env.name)}
                      sx={{ mt: 2 }}
                    >
                      Assign Versions
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "end",
            justifyContent: "end",
          }}
        >
          {window.__env.edition !== "community" && (
            <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
              <Checkbox
                checked={shouldDeployRealtime}
                onClick={(e) => {
                  setShouldDeployRealtime(!shouldDeployRealtime);
                }}
              />
              <Typography sx={{ mr: 1 }}>Deploy in Real-Time</Typography>
            </Box>
          )}
          <LoadingButton
            loading={isLoading_environmentAssign}
            variant="contained"
            sx={{ mt: 2 }}
            disabled={!envChanged}
            onClick={() => setOpenAssignConfirmModal(true)}
            startIcon={<CloudUploadIcon />}
          >
            Save & Deploy Changes
          </LoadingButton>
        </Box>
      </Paper>

      {/* Deployed Versions History */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: "2rem",
          backgroundColor: "var(--regular-card-bg-color)",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: "medium" }}>
          Deployed Versions History
        </Typography>
        <Grid container spacing={2}>
          {versions.map((version) => (
            <Grid item xs={12} sm={6} md={4} key={version.id}>
              <Card sx={{ backgroundColor: "white" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Version {version.branch}
                    </Typography>

                    {/* <Tooltip title="Changes detected:" placement="top">
                      <WarningAmberIcon
                        sx={{ mb: 1, ml: 2 }}
                        htmlColor="orange"
                      />
                    </Tooltip> */}

                    {versions.length > 1 && version.branch !== "1.0.0.0" && (
                      // Only show if there are more than 1 version. Couldve just disable the button but thats ok too
                      <Tooltip title="Delete version">
                        <IconButton
                          sx={{ ml: "auto" }}
                          onClick={() => {
                            setOpenVersionRemoveModal(true);
                            setVersionPendingRemoval(version);
                          }}
                        >
                          <DeleteForeverIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {version.releaseNotes}
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}
                  >
                    {version.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        color="primary"
                      />
                    ))}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Author: {version.deployer} <br />
                    Deployed: {formatDate(version.timestamp)}
                    {version.sourceBranch
                      ? ` | Previous version: ${version.sourceBranch}`
                      : ""}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Modal
        open={openAssignConfirmModal}
        onClose={() => setOpenAssignConfirmModal(false)}
        aria-labelledby="confirm-assignment-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            bgcolor: "var(--regular-card-bg-color)",
            boxShadow: 24,
            p: 4,
            borderRadius: "2rem",
          }}
        >
          <Typography id="confirm-assignment-modal" variant="h6" sx={{ mb: 2 }}>
            Confirm Assignment Update
          </Typography>
          <Typography sx={{ mb: 2 }}>
            Apply changes to {changedEnvironmentsNames.length} environments:{" "}
            <strong>{changedEnvironmentsNames.join(", ")}</strong>?
            <br />
            Make sure your inputs is correct. Once you press "Confirm", all
            configs will start to be deployed to your players.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => setOpenAssignConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setOpenAssignConfirmModal(false);
                confirmAssignEnvVersion();
              }}
            >
              Confirm
            </Button>
          </Stack>
        </Box>
      </Modal>

      {/* Confirm Deployment Modal */}
      <Modal
        open={openConfirmModal}
        onClose={() => setOpenConfirmModal(false)}
        aria-labelledby="confirm-deployment-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "var(--regular-card-bg-color)",

            boxShadow: 24,
            p: 4,
            borderRadius: "2rem",
          }}
        >
          <Typography
            branch="confirm-deployment-modal"
            variant="h6"
            sx={{ mb: 2 }}
          >
            Confirm Deployment
          </Typography>
          <Typography sx={{ mb: 2 }}>
            Deploy version <strong>{nextVersion}</strong> with commit message:{" "}
            <em>{commitMessage}</em>?
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => setOpenConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setOpenConfirmModal(false);
                deployNewVersion();
              }}
            >
              Confirm
            </Button>
          </Stack>
        </Box>
      </Modal>

      {/* Environment Assignment Modal */}
      <Modal
        open={openAssignModal}
        onClose={() => setOpenAssignModal(false)}
        aria-labelledby="assign-environment-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            bgcolor: "var(--regular-card-bg-color)",
            boxShadow: 24,
            p: 4,
            borderRadius: "2rem",
          }}
        >
          <Typography id="assign-environment-modal" variant="h6" sx={{ mb: 2 }}>
            Assign Versions to{" "}
            {selectedEnvironment.charAt(0).toUpperCase() +
              selectedEnvironment.slice(1)}
          </Typography>
          <Autocomplete
            multiple
            options={versions.map((v) => v.branch)}
            value={selectedVersionsForEnv}
            onChange={handleVersionSelectionChange}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Select Versions"
                placeholder="Versions"
              />
            )}
            sx={{ mb: 3 }}
          />
          {selectedVersionsForEnv.map((vId) => (
            <Box key={vId} sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                {versions.find((v) => v.id === vId)?.version || vId}{" "}
                {versions.find((v) => v.id === vId)?.message
                  ? `- ${versions.find((v) => v.id === vId).message}`
                  : ""}
              </Typography>
              <Slider
                value={versionShares[vId] || 0}
                onChange={(e, newValue) => handleShareChange(vId, newValue)}
                aria-labelledby="input-slider"
                valueLabelDisplay="auto"
                min={0}
                max={100}
              />
            </Box>
          ))}
          {selectedVersionsForEnv.length > 0 &&
            Math.abs(
              selectedVersionsForEnv.reduce(
                (sum, verId) => sum + (versionShares[verId] || 0),
                0
              ) - 100
            ) > 0.01 && (
              <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                Must add up to 100
              </Typography>
            )}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => setOpenAssignModal(false)}
            >
              Cancel
            </Button>
            <LoadingButton
              loading={isLoading_environmentAssign}
              variant="contained"
              onClick={() => handleAssignVersions()}
              disabled={
                selectedVersionsForEnv.length === 0 ||
                Math.abs(
                  selectedVersionsForEnv.reduce(
                    (sum, verId) => sum + (versionShares[verId] || 0),
                    0
                  ) - 100
                ) > 0.01
              }
            >
              Assign
            </LoadingButton>
          </Stack>
        </Box>
      </Modal>

      {/* Confirm Version Remove Modal */}
      <Modal
        open={openVersionRemoveModal}
        onClose={() => {
          setOpenVersionRemoveModal(false);
          setVersionPendingRemoval({});
        }}
        aria-labelledby="remove-version-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            bgcolor: "var(--regular-card-bg-color)",
            boxShadow: 24,
            p: 4,
            borderRadius: "2rem",
          }}
        >
          <Typography id="remove-version-modal" variant="h6" sx={{ mb: 2 }}>
            Remove version {versionPendingRemoval.branch}?
          </Typography>
          <Typography id="remove-version-modal" variant="body1" sx={{ mb: 2 }}>
            This cannot be undone.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <LoadingButton
              loading={isLoading_VersionRemoval}
              variant="outlined"
              color="error"
              onClick={removeVersion}
            >
              Remove
            </LoadingButton>
            <Button
              variant="contained"
              onClick={() => {
                setOpenVersionRemoveModal(false);
                setVersionPendingRemoval({});
              }}
            >
              Cancel
            </Button>
          </Stack>
        </Box>
      </Modal>
      <Logging />
    </Box>
  );
};

export default VersionDeployment;
