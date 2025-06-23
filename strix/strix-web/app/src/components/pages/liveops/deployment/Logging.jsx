import React, { useEffect, useState, useRef } from "react";
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
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import BackupSharpIcon from "@mui/icons-material/BackupSharp";
import CloudDoneSharpIcon from "@mui/icons-material/CloudDoneSharp";
import EastSharpIcon from "@mui/icons-material/EastSharp";
import WarningSharpIcon from "@mui/icons-material/WarningSharp";
import DoneAllSharpIcon from "@mui/icons-material/DoneAllSharp";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";
import PriorityHighSharpIcon from "@mui/icons-material/PriorityHighSharp";
import RuleSharpIcon from "@mui/icons-material/RuleSharp";
import DataTable from "./DataTable";
import useApi from "@strix/api";
import { useGame, useBranch } from "@strix/gameContext";
import EntityIcon from "./entityBasic.svg?react";
import OfferIcon from "shared/icons/OfferIconPlaceholder.jsx";
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";
dayjs.extend(utc);
function Logging() {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const {
    getActionLogsByType,
    getABTestsShort,
    getOffers,
    getEntitiesIDs,
    getAllSegmentsForAnalyticsFilter,
    getAllAnalyticsEvents,
  } = useApi();
  const [selectedLogsType, setSelectedLogsType] = useState("cookingLogs"); // "changelogs" or "cookingLogs"
  const [actionLogs, setActionLogs] = useState([]);
  const [cookingLogs, setCookingLogs] = useState([]);

  const [deploymentChecksums, setDeploymentChecksums] = useState({
    targetBranch: {},
    sourceBranch: {},
  });
  const offers = useRef([]);
  const abTests = useRef([]);
  const nodes = useRef([]);
  const events = useRef([]);
  const segments = useRef([]);

  async function fetchPlaceholderData() {
    const promises = await Promise.all([
      getABTestsShort({ gameID: game.gameID, branch: branch }),
      getOffers({ gameID: game.gameID, branch, getRemoved: true }),
      getEntitiesIDs({ gameID: game.gameID, branch, getRemoved: true }),
      getAllAnalyticsEvents({ gameID: game.gameID, branch: branch }),
      getAllSegmentsForAnalyticsFilter({
        gameID: game.gameID,
        branch: branch,
      }),
    ]);
    const [abtestsResp, offersResp, nodesResp, eventsResp, segmentsResp] =
      promises;
    if (abtestsResp.success) abTests.current = abtestsResp.abTests;
    if (offersResp.success) offers.current = offersResp.offers;
    if (nodesResp.success) nodes.current = nodesResp.entities;
    if (eventsResp.success) events.current = eventsResp.events;
    if (segmentsResp.success) segments.current = segmentsResp.message;
  }
  const parseLogMessage = (logObj) => {
    const parts = logObj.message.split(" | ");
    const logObject = {
      TIME: "",
      CLIENT: "",
      BRANCH: "",
      ACTION: "",
      SUBJECT: "",
    };
    parts.forEach((part) => {
      const colonIndex = part.indexOf(": ");
      if (colonIndex !== -1) {
        const key = part.slice(0, colonIndex).trim();
        const value = part.slice(colonIndex + 2).trim();
        if (logObject.hasOwnProperty(key)) logObject[key] = value;
      }
    });
    logObject["TIME"] = logObj.timestamp;
    return logObject;
  };
  async function fetchCookingLogs() {
    const resp = await getActionLogsByType({
      gameID: game.gameID,
      type: "cooking",
    });
    if (resp.success) {
      const parsed = resp.logs.map((log, i) => {
        const { TIME, CLIENT, ACTION } = parseLogMessage(log);
        return {
          id: i,
          time: dayjs.utc(TIME).format("DD MMMM YYYY | HH:MM:ss"),
          client: CLIENT,
          action: ACTION,
        };
      });
      setCookingLogs(parsed);
    }
  }

  useEffect(() => {
    fetchCookingLogs();
    fetchPlaceholderData();
  }, []);

  function changeLogType(type) {
    setSelectedLogsType(type);
  }
  // function getChecksumByType(type) {
  //   if (
  //     deploymentChecksums &&
  //     deploymentChecksums.sourceBranch &&
  //     deploymentChecksums.targetBranch &&
  //     deploymentChecksums.deployChecksum != null
  //   ) {
  //     return {
  //       sourceBranch: deploymentChecksums.sourceBranch[type],
  //       targetBranch: deploymentChecksums.targetBranch[type],
  //       deployChecksum: deploymentChecksums.deployChecksum[type],
  //     };
  //   } else {
  //     return undefined;
  //   }
  // }
  function onColumnsChange_cookingLogs(event) {
    setColumns_cookingLogs((prevColumns) =>
      prevColumns.map((column) =>
        column.field === event.colDef.field
          ? { ...column, width: event.colDef.width }
          : column
      )
    );
  }
  function onColumnsChange_changelogs(event) {
    setColumns_changelogs((prevColumns) =>
      prevColumns.map((column) =>
        column.field === event.colDef.field
          ? { ...column, width: event.colDef.width }
          : column
      )
    );
  }
  const tableSettings = [
    {
      sx: { p: 0, height: "100%", width: "100%" },
      // rowHeight: "auto",
      initialState: { pagination: { paginationModel: { pageSize: 50 } } },
      pageSizeOptions: [50, 100, 300],
    },
    {
      sx: { p: 0, height: "100%", width: "100%", maxWidth: "100%" },
      rowHeight: "auto",
      initialState: { pagination: { paginationModel: { pageSize: 50 } } },
      pageSizeOptions: [50, 100, 300],
    },
  ];

  const [columns_cookingLogs, setColumns_cookingLogs] = useState([
    {
      field: "time",
      headerName: "Timestamp",
      headerAlign: "center",
      width: 200,
      sortable: false,
      filterable: false,
    },
    {
      field: "client",
      headerName: "User",
      headerAlign: "center",
      width: 175,
      sortable: false,
      filterable: false,
    },
    {
      field: "action",
      headerName: "Action",
      headerAlign: "start",
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ ml: 1, fontSize: "14px", textAlign: "start" }}
        >
          {params.value}
        </Typography>
      ),
    },
  ]);

  const [columns_changelogs, setColumns_changelogs] = useState([
    {
      field: "time",
      headerName: "Timestamp",
      headerAlign: "center",
      width: 120,
      sortable: false,
      filterable: false,
    },
    {
      field: "client",
      headerName: "User",
      headerAlign: "center",
      width: 175,
      sortable: false,
      filterable: false,
    },
    {
      field: "action",
      headerName: "Action",
      headerAlign: "center",
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ ml: 1, fontSize: "14px", textAlign: "start" }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "subject",
      headerName: "Item",
      headerAlign: "center",
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => pickPlaceholder(params.value),
    },
  ]);

  function pickPlaceholder(itemID) {
    let icon, foundItem;
    foundItem = nodes?.current?.find((n) => n.nodeID === itemID);
    if (foundItem) {
      icon =
        foundItem.entityBasic?.entityIcon ||
        foundItem.entityCategory?.entityIcon;
      return icon ? (
        <Tooltip title={foundItem.name} placement="top">
          <img
            src={icon}
            alt={foundItem.name}
            style={{ width: 24, height: 24 }}
          />
        </Tooltip>
      ) : (
        <EntityIcon />
      );
    }
    foundItem = offers?.current?.find((o) => o.offerID === itemID);
    if (foundItem) {
      icon = foundItem.offerIcon;
      return icon ? (
        <Tooltip title={foundItem.offerName} placement="top">
          <img
            src={icon}
            alt={foundItem.offerIcon}
            style={{ width: 24, height: 24 }}
          />
        </Tooltip>
      ) : (
        <Tooltip title={foundItem.offerName} placement="top">
          <OfferIcon />
        </Tooltip>
      );
    }
    foundItem = abTests?.current?.find((t) => t.id === itemID);
    if (foundItem)
      return (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ ml: 1, fontSize: "14px", textAlign: "start" }}
        >
          {foundItem.name}
        </Typography>
      );
    foundItem = events?.current?.find((e) => e.eventID === itemID);
    if (foundItem)
      return (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ ml: 1, fontSize: "14px", textAlign: "start" }}
        >
          {foundItem.eventName}
        </Typography>
      );
    foundItem = segments?.current?.find((e) => e.segmentID === itemID);
    if (foundItem)
      return (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ ml: 1, fontSize: "14px", textAlign: "start" }}
        >
          {foundItem.segmentName}
        </Typography>
      );
    return "";
  }
  return (
    <>
      {/* Changes */}
      {/* <Grid item xs={12} md={3}>
        <Paper
          elevation={3}
          sx={{
            p: 2,
            backgroundColor: "var(--regular-card-bg-color)",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Changes
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <ChangesItem
              title="Analytics Events"
              tooltipDesc=""
              checksums={getChecksumByType("analyticsEvents")}
              fetchingChecksums={fetchingChecksums}
            />
            <ChangesItem
              title="Entities Config"
              tooltipDesc=""
              checksums={getChecksumByType("nodes")}
              fetchingChecksums={fetchingChecksums}
            />
            <ChangesItem
              title="Offers"
              tooltipDesc=""
              checksums={getChecksumByType("offers")}
              fetchingChecksums={fetchingChecksums}
            />
            <ChangesItem
              title="Entities Tree"
              tooltipDesc=""
              checksums={getChecksumByType("planningTree")}
              fetchingChecksums={fetchingChecksums}
            />
            <ChangesItem
              title="Localization"
              tooltipDesc=""
              checksums={getChecksumByType("localization")}
              fetchingChecksums={fetchingChecksums}
            />
            <ChangesItem
              title="Player Warehouse"
              tooltipDesc=""
              checksums={getChecksumByType("PWtemplates")}
              fetchingChecksums={fetchingChecksums}
            />
            <ChangesItem
              title="Segments"
              tooltipDesc=""
              checksums={getChecksumByType("segments")}
              fetchingChecksums={fetchingChecksums}
            />
            <ChangesItem
              title="A/B Tests"
              tooltipDesc=""
              checksums={getChecksumByType("abTests")}
              fetchingChecksums={fetchingChecksums}
            />
            <ChangesItem
              title="Game Events"
              tooltipDesc=""
              checksums={getChecksumByType("abTests")}
              fetchingChecksums={fetchingChecksums}
            />
            <ChangesItem
              title="Flows"
              tooltipDesc=""
              checksums={getChecksumByType("abTests")}
              fetchingChecksums={fetchingChecksums}
            />
          </Box>
        </Paper>
      </Grid> */}

      {/* Changelogs */}
      <Grid item xs={12} md={9}>
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
            Cooking Logs
          </Typography>
          {/* <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 1 }}>
            <Button
              onClick={() => changeLogType("changelogs")}
              variant={selectedLogsType === "changelogs" ? "contained" : "text"}
              sx={{ textTransform: "none" }}
            >
              <Typography variant="h6" sx={{}}>
                Changelogs
              </Typography>
            </Button>
            <Typography variant="h6" sx={{}}>
              /
            </Typography>
            <Button
              onClick={() => changeLogType("cookingLogs")}
              variant={
                selectedLogsType === "cookingLogs" ? "contained" : "text"
              }
              sx={{ textTransform: "none" }}
            >
              <Typography variant="h6" sx={{}}>
                Deployment Logs
              </Typography>
            </Button>
          </Box> */}

          {selectedLogsType === "changelogs" ? (
            <Box sx={{ height: 600, position: "relative" }}>
              <DataTable
                tableSettings={tableSettings[1]}
                columns={columns_changelogs}
                rows={actionLogs}
                onColumnsChange={onColumnsChange_changelogs}
              />
            </Box>
          ) : (
            <Box sx={{ height: 600, position: "relative" }}>
              <DataTable
                tableSettings={tableSettings[0]}
                columns={columns_cookingLogs}
                rows={cookingLogs}
                onColumnsChange={onColumnsChange_cookingLogs}
              />
            </Box>
          )}
        </Paper>
      </Grid>
    </>
  );
}
function ChangesItem({ fetchingChecksums, checksums, title, tooltipDesc }) {
  const [syncState, setSyncState] = useState("");
  function checkState() {
    const t = checksums?.targetBranch;
    const s = checksums?.sourceBranch;
    const c = checksums?.deployChecksum;
    if (t === c && s === c) {
      setSyncState("ok");
      return;
    }
    let numWrong = 0;
    let wrongType = "";
    if (t !== c) {
      numWrong += 1;
      wrongType = "target-wrong";
    }
    if (s !== c) {
      numWrong += 1;
      wrongType = "source-wrong";
    }
    setSyncState(numWrong === 1 ? wrongType : "both-wrong");
  }
  useEffect(() => {
    if (checksums) {
      checkState();
    }
  }, [checksums]);

  function getSyncIcon() {
    switch (syncState) {
      case "ok":
        return <DoneAllSharpIcon htmlColor="green" />;
      case "target-wrong":
      case "source-wrong":
        return <RuleSharpIcon htmlColor="orange" />;
      case "both-wrong":
        return <PriorityHighSharpIcon htmlColor="#cc0000" />;
      default:
        return null;
    }
  }
  function getSyncTooltipText() {
    const t = checksums?.targetBranch || 0;
    const s = checksums?.sourceBranch || 0;
    const c = checksums?.deployChecksum || 0;
    const sumMessage = (
      <>
        <br />
        Checksums:
        <br /> Source branch: {s}
        <br /> Target branch: {t}
        <br /> Current deploy: {c}
      </>
    );
    switch (syncState) {
      case "ok":
        return <>Both branches match the current deploy.{sumMessage}</>;
      case "target-wrong":
        return (
          <>
            Target branch differs from current deploy. Deploying now will
            overwrite those changes.{sumMessage}
          </>
        );
      case "source-wrong":
        return <>Source branch differs from current deploy.{sumMessage}</>;
      case "both-wrong":
        return (
          <>
            Both branches differ from current deploy. Resolve conflicts before
            deploying.{sumMessage}
          </>
        );
      default:
        return "";
    }
  }
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="body1">{title}:</Typography>
      {fetchingChecksums ? (
        <CircularProgress size={20} sx={{ ml: 1 }} />
      ) : checksums ? (
        <Tooltip
          title={
            <Typography variant="body2" sx={{ textAlign: "center" }}>
              {getSyncTooltipText()}
              <br />
              {tooltipDesc}
            </Typography>
          }
          arrow
        >
          <IconButton sx={{ ml: 1 }}>{getSyncIcon()}</IconButton>
        </Tooltip>
      ) : (
        <Typography variant="caption" sx={{ ml: 1 }}>
          No target
        </Typography>
      )}
    </Box>
  );
}

export default Logging;
