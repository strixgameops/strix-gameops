import React, { useState, useRef, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";

import titles from "titles";

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  TextField,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  FormGroup,
  Menu,
  MenuItem,
  Chip,
  Paper,
  MenuItem as SelectMenuItem,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Popover,
  Autocomplete,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Editor from "@monaco-editor/react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import useApi from "@strix/api";
import { useBranch, useGame } from "@strix/gameContext";
import ClearIcon from "@mui/icons-material/Clear";
import PersonIcon from "@mui/icons-material/Person";
import { customAlphabet } from "nanoid";
import { useAlert } from "@strix/alertsContext";
import CommentIcon from "@mui/icons-material/Message";
const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);

import GameModelFunctions from "./GameModelFunctions.jsx";
const GameModel = () => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { triggerAlert } = useAlert();

  const [segments, setSegments] = useState([]);
  const [segmentsOverrides, setSegmentsOverrides] = useState([]);
  const [variables, setVariables] = useState([]);
  const [cards, setCards] = useState([]);
  const [functionLinks, setFunctionLinks] = useState([]);

  const [tabs, setTabs] = useState([]);
  const [segmentVariables, setSegmentVariables] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState("everyone");
  const [segmentContextMenu, setSegmentContextMenu] = useState(null);
  const [segmentAddPopover, setSegmentAddPopover] = useState(null);
  const [contextSelectedSegmentID, setContextSelectedSegmentID] =
    useState(null);

  const [newVarName, setNewVarName] = useState("");
  const [newVarType, setNewVarType] = useState("string");
  const [newCardName, setNewCardName] = useState("");
  const [newCardComment, setNewCardComment] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const {
    getBalanceModel,
    gameModelCreateSegment,
    gameModelUpdateSegmentOverride,
    gameModelRemoveSegment,
    gameModelCreateOrUpdateVariable,
    gameModelRemoveVariable,
    gameModelCreateOrUpdateFunction,
    gameModelRemoveFunction,
    gameModelCreateOrUpdateTab,
    gameModelRemoveTab,
    getAllSegmentsForAnalyticsFilter,
    getPlanningNodes,
    gameModelManageFunctionLinkedConfigValue,
    getOffers,
  } = useApi();

  // Nodes
  const [nodeData, setNodeData] = useState([]);
  // Offers
  const [offers, setOffers] = useState([]);

  // Variable management
  const [variableRemovalPopover, setVariableRemovalPopover] = useState(null);
  const [variableToRemove, setVariableToRemove] = useState(null);
  const [hoveredVariableIDComment, setHoveredVariableIDComment] = useState("");
  const [variableCommentDialogOpen, setVariableCommentDialogOpen] =
    useState(false);
  const [variableToChangeComment, setVariableToChangeComment] = useState("");
  const [variableCommentChange, setVariableCommentChange] = useState("");

  // Tab management
  const [tabRemovalPopover, setTabRemovalPopover] = useState(null);
  const [activeTabIndex, setActiveTabIndex] = useState("");
  const [newTabDialogOpen, setNewTabDialogOpen] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [tabContextMenu, setTabContextMenu] = useState(null);
  const [selectedTabId, setSelectedTabId] = useState(null);
  const [renameTabDialogOpen, setRenameTabDialogOpen] = useState(false);
  const [tabRename, setTabRename] = useState("");

  // Get the active tab ID
  const activeTabId = tabs[activeTabIndex]?.tabID || "";

  // Sidebar widths
  const segmentSidebarWidth = 200;
  const variableSidebarWidth = 240;

  // Filter variables and cards by active tab
  const filteredVariables = variables.filter(
    (variable) => variable.respectiveCategory === activeTabId
  );
  const filteredCards = cards.filter(
    (card) => card.respectiveCategory === activeTabId
  );

  const handleTabChange = (event, newValue) => {
    setActiveTabIndex(newValue);
  };

  const handleSegmentSelect = (segmentId) => {
    setSelectedSegment(segmentId);
  };

  useEffect(() => {
    async function fetchOffers() {
      const response = await getOffers({ gameID: game.gameID, branch: branch });
      if (response.success) {
        setOffers(response.offers);
      }
    }
    fetchOffers();
    async function fetchNodes() {
      const nodeDataResponse = await getPlanningNodes({
        gameID: game.gameID,
        branch: branch,
        planningType: "entity",
      });
      setNodeData(nodeDataResponse.nodes);
    }
    fetchNodes();

    async function fetchData() {
      setIsLoading(true);
      const resp = await getBalanceModel({ gameID: game.gameID, branch });
      if (resp.success) {
        setSegmentsOverrides(resp.result.segments);

        let overrides = {};
        resp.result.segments.map((seg) => {
          overrides[seg.segmentID] = {};
          seg.overrides.map((o) => {
            overrides[seg.segmentID][o.variableID] = o.value;
          });
        });
        setSegmentVariables(overrides);

        setVariables(resp.result.variables);
        setCards(resp.result.functions);
        setTabs(resp.result.tabs);
        if (resp.result.tabs.length > 0) {
          setActiveTabIndex(0);
        }

        setFunctionLinks(resp.result.links);
      }
      setIsLoading(false);
    }
    fetchData();
    async function fetchSegments() {
      const resp = await getAllSegmentsForAnalyticsFilter({
        gameID: game.gameID,
        branch: branch,
      });
      if (resp.success) {
        setSegments(resp.message);
      }
    }
    fetchSegments();
  }, []);

  // When a variable value changes, update the state locally and call the API to update the override
  const handleVariableValueChange = async (variableID, value) => {
    // update state optimistically
    setSegmentVariables({
      ...segmentVariables,
      [selectedSegment]: {
        ...segmentVariables[selectedSegment],
        [variableID]: value,
      },
    });
    // Call API to update segment override
    try {
      await gameModelUpdateSegmentOverride({
        gameID: game.gameID,
        branch: branch,
        segmentID: selectedSegment,
        variableID: variableID,
        value: value,
      });
    } catch (error) {
      console.error("Failed to update segment override", error);
    }
  };
  async function resetVariableSegmentedValue(variableID) {
    setSegmentVariables((prev) => {
      // Create a new copy for the current segment
      const updatedSegment = { ...prev[selectedSegment] };
      delete updatedSegment[variableID];

      // Return a new state object with the updated segment
      return {
        ...prev,
        [selectedSegment]: updatedSegment,
      };
    });
    // Call API to update segment override
    try {
      await gameModelUpdateSegmentOverride({
        gameID: game.gameID,
        branch: branch,
        segmentID: selectedSegment,
        variableID: variableID,
        value: null,
      });
    } catch (error) {
      console.error("Failed to update segment override", error);
    }
  }

  const addNewSegment = async (segmentID) => {
    setIsLoading(true);
    try {
      const createdSegment = await gameModelCreateSegment({
        gameID: game.gameID,
        branch: branch,
        segmentID: segmentID,
      });
      setSegmentsOverrides([
        ...segmentsOverrides,
        {
          segmentID: segmentID,
          name: `Segment ${segmentsOverrides.length + 1}`,
        },
      ]);
    } catch (error) {
      console.error("Failed to create segment", error);
      setIsLoading(false);
    }
    setIsLoading(false);
  };

  // Create a new variable via API and update local state
  const addNewVariable = async () => {
    if (newVarName.trim() === "") return;

    setIsLoading(true);
    const newVarId = nanoid();
    // Determine default value based on type.
    const defaultValue =
      newVarType === "string" ? "" : newVarType === "number" ? 0 : false;

    const camelCasedVarName = toCamelCase(newVarName);
    if (camelCasedVarName === "") {
      triggerAlert(
        "Couldn't create new variable: Variables with digits at the start of their names are forbidden.",
        "error"
      );
      setIsLoading(false);
      return;
    }

    if (
      variables.some(
        (v) =>
          v.variableName === camelCasedVarName &&
          v.respectiveCategory === activeTabId
      )
    ) {
      triggerAlert(
        "Couldn't create new variable: Same variable names are forbidden.",
        "error"
      );
      setIsLoading(false);
      return;
    }

    try {
      const createdVar = await gameModelCreateOrUpdateVariable({
        gameID: game.gameID,
        branch: branch,
        variableID: newVarId,
        variableName: camelCasedVarName,
        variableType: newVarType,
        variableComment: "",
        respectiveCategory: activeTabId,
      });
      setVariables([
        ...variables,
        {
          variableID: newVarId,
          variableName: camelCasedVarName,
          variableType: newVarType,
          variableComment: "",
          respectiveCategory: activeTabId,
        },
      ]);

      // Set default value for all segmentsOverrides
      const updatedSegmentVars = { ...segmentVariables };
      Object.keys(updatedSegmentVars).forEach((segmentId) => {
        updatedSegmentVars[segmentId][newVarId] = defaultValue;
      });
      setSegmentVariables(updatedSegmentVars);

      setNewVarName("");
    } catch (error) {
      console.error("Failed to create variable", error);
      setIsLoading(false);
    }
    setIsLoading(false);

    function toCamelCase(str) {
      const trimmed = str.trim();

      // If the entire string is digits, return empty string
      if (/^\d+$/.test(trimmed)) return "";

      // Remove leading digits.
      const withoutLeadingDigits = trimmed.replace(/^\d+/, "");
      if (!withoutLeadingDigits) return "";

      // Convert to camel case.
      return withoutLeadingDigits
        .split(" ")
        .map((word, index) =>
          index === 0
            ? word.toLowerCase()
            : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join("");
    }
  };

  async function changeVariableComment() {
    try {
      setIsLoading(true);

      const variableObj = variables.find(
        (v) => v.variableID === variableToChangeComment
      );

      await gameModelCreateOrUpdateVariable({
        gameID: game.gameID,
        branch: branch,
        variableID: variableObj.variableID,
        variableName: variableObj.variableName,
        variableType: variableObj.variableType,
        variableComment: variableCommentChange,
        respectiveCategory: variableObj.respectiveCategory,
      });
      setVariables((prev) => {
        prev = prev.map((v) => {
          if (v.variableID === variableToChangeComment) {
            return { ...v, variableComment: variableCommentChange };
          }
          return v;
        });
        return prev;
      });

      handleCloseVariableCommentDialog();
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
    setIsLoading(false);
  }

  // Create a new function (card) via API and update local state
  const addNewCard = async () => {
    if (newCardName.trim() === "") return;
    setIsLoading(true);

    const newCardId = nanoid();
    // Build code block based on filteredVariables names.
    const codeBlock = `
// Define your configuration logic here
function main() {
  // Example: make an array of values for configuration
  const array = [10, 5, 3, 2, 1];
  return array;
}

// Return the function that has the result of your calculation
return main;

// Enter "result[0]", "result[1]", "result[2]" etc. below for your linked configuration values
`;
    try {
      const createdFunction = await gameModelCreateOrUpdateFunction({
        gameID: game.gameID,
        branch: branch,
        functionID: newCardId,
        changes: {
          name: newCardName,
          comment: newCardComment,
          code: codeBlock,
          linkedEntities: [],
          respectiveCategory: activeTabId,
        },
      });
      setCards([
        ...cards,
        {
          functionID: newCardId,
          name: newCardName,
          comment: newCardComment,
          code: codeBlock,
          respectiveCategory: activeTabId,
        },
      ]);
      setNewCardName("");
      setNewCardComment("");
    } catch (error) {
      console.error("Failed to create function", error);
      setIsLoading(false);
    }
    setIsLoading(false);
  };

  // Delete a function (card) via API and update local state
  const deleteCard = async (cardId) => {
    try {
      setIsLoading(true);

      await gameModelRemoveFunction({
        gameID: game.gameID,
        branch: branch,
        functionID: cardId,
      });
      setCards(cards.filter((card) => card.functionID !== cardId));
    } catch (error) {
      console.error("Failed to delete function", error);
      setIsLoading(false);
    }
    setIsLoading(false);
  };

  async function deleteVariable(variableID) {
    setIsLoading(true);
    setVariableRemovalPopover(null);
    const resp = await gameModelRemoveVariable({
      gameID: game.gameID,
      branch: branch,
      variableID: variableID,
    });
    if (resp.success) {
      setVariables((prev) => prev.filter((v) => v.variableID !== variableID));
      setSegmentVariables((prev) => {
        Object.keys(prev).map((segmentID) => {
          if (prev[segmentID][variableID]) {
            delete prev[segmentID][variableID];
          }
        });
        return { ...prev };
      });
    }
    setIsLoading(false);
  }

  // Clone a function (card) and create a new one via API
  const cloneCard = async (cardId) => {
    const originalCard = cards.find((card) => card.functionID === cardId);
    if (originalCard) {
      const newCardId = `card${cards.length + 1}`;
      const clonedCard = {
        ...originalCard,
        functionID: newCardId,
        name: `${originalCard.name} (Clone)`,
      };
      try {
        await gameModelCreateOrUpdateFunction({
          gameID: game.gameID,
          branch: branch,
          functionID: newCardId,
          changes: {
            functionID: newCardId,
            name: clonedCard.newCardName,
            comment: clonedCard.newCardComment,
            code: clonedCard.code,
            linkedEntities: [],
            respectiveCategory: activeTabId,
          },
        });
        setCards([...cards, clonedCard]);
      } catch (error) {
        console.error("Failed to clone function", error);
      }
    }
  };

  const changeCard = async (cardId, changes) => {
    try {
      setCards((prev) => {
        prev = prev.map((card) => {
          if (card.functionID === cardId) {
            return { ...card, ...changes };
          }
          return card;
        });
        return prev;
      });
      await gameModelCreateOrUpdateFunction({
        gameID: game.gameID,
        branch: branch,
        functionID: cardId,
        changes: { ...changes },
      });
    } catch (error) {
      console.error("Failed to clone function", error);
    }
  };

  async function changeLink(
    linkValueSID,
    linkNodeID,
    linkInheritedFromNodeID,
    newPath
  ) {
    const resp = await gameModelManageFunctionLinkedConfigValue({
      gameID: game.gameID,
      branch: branch,
      valueSID: linkValueSID,
      actionType: "setPath",
      changes: {
        nodeID: linkNodeID,
        valueSID: linkValueSID,
        outputPath: newPath,
        inheritedFromNodeID: linkInheritedFromNodeID,
      },
    });
  }
  // Tab management functions remain unchanged
  const handleOpenNewTabDialog = () => {
    setNewTabName("");
    setNewTabDialogOpen(true);
  };

  const handleCloseNewTabDialog = () => {
    setNewTabDialogOpen(false);
  };

  const addNewTab = async () => {
    if (newTabName.trim() === "") return;
    const newTabId = newTabName.toLowerCase().replace(/\s+/g, "-");
    const newTab = { tabID: newTabId, tabName: newTabName };
    const newTabIndex = tabs.length;

    setIsLoading(true);

    await gameModelCreateOrUpdateTab({
      gameID: game.gameID,
      branch,
      tabID: newTabId,
      tabName: newTabName,
    });
    setTabs([...tabs, newTab]);
    setActiveTabIndex(newTabIndex);

    setIsLoading(false);

    handleCloseNewTabDialog();
  };

  const handleSegmentContextMenu = (event, segmentID, index) => {
    event.preventDefault();
    if (segmentID === "everyone") return;
    setSegmentContextMenu(event.currentTarget);
    setContextSelectedSegmentID({ segmentID, index });
  };

  const handleTabContextMenu = (event, respectiveCategory, index) => {
    event.preventDefault();
    setTabContextMenu(event.currentTarget);
    setSelectedTabId({ tabID: respectiveCategory, index });
  };

  const handleVariableCommentContextMenu = (variableID) => {
    setVariableCommentDialogOpen(true);
    setVariableToChangeComment(variableID);
    setVariableCommentChange(
      variables.find((v) => v.variableID === variableID).variableComment
    );
  };

  const handleCloseTabContextMenu = () => {
    setTabContextMenu(null);
    setTabRemovalPopover(null);
  };
  const handleCloseSegmentContextMenu = () => {
    setSegmentContextMenu(null);
  };
  const openRenameTabDialog = () => {
    if (selectedTabId) {
      const tabToRename = tabs.find((tab) => tab.tabID === selectedTabId.tabID);
      setTabRename(tabToRename?.tabName || "");
      setRenameTabDialogOpen(true);
      handleCloseTabContextMenu();
    }
  };

  const handleCloseRenameDialog = () => {
    setRenameTabDialogOpen(false);
  };
  const handleCloseVariableCommentDialog = () => {
    setVariableCommentDialogOpen(false);
  };

  const renameTab = async () => {
    if (tabRename.trim() === "" || !selectedTabId) return;
    setIsLoading(true);
    await gameModelCreateOrUpdateTab({
      gameID: game.gameID,
      branch,
      tabID: selectedTabId.tabID,
      tabName: tabRename,
    });
    setTabs(
      tabs.map((tab) =>
        tab.tabID === selectedTabId.tabID ? { ...tab, tabName: tabRename } : tab
      )
    );
    setIsLoading(false);
    handleCloseRenameDialog();
  };

  const deleteTab = async () => {
    if (!selectedTabId || tabs.length <= 1) return;

    const resp = await gameModelRemoveTab({
      gameID: game.gameID,
      branch,
      tabID: selectedTabId.tabID,
    });
    if (resp.success) {
      const newTabs = tabs.filter((tab) => tab.tabID !== selectedTabId.tabID);
      const newVariables = variables.filter(
        (variable) => variable.respectiveCategory !== selectedTabId.tabID
      );
      const newCards = cards.filter(
        (card) => card.respectiveCategory !== selectedTabId.tabID
      );
      setTabs(newTabs);
      setVariables(newVariables);
      setCards(newCards);
      // Update active tab if necessary
      if (activeTabIndex >= newTabs.length) {
        setActiveTabIndex(Math.max(0, newTabs.length - 1));
      } else if (selectedTabId.index < activeTabIndex) {
        setActiveTabIndex(activeTabIndex - 1);
      }
    }
    handleCloseTabContextMenu();
  };

  const deleteSegment = async () => {
    if (!contextSelectedSegmentID) return;
    const resp = await gameModelRemoveSegment({
      gameID: game.gameID,
      branch,
      segmentID: contextSelectedSegmentID.segmentID,
    });
    if (resp.success) {
      setSegmentVariables((prev) => {
        delete prev[contextSelectedSegmentID.segmentID];
        return { ...prev };
      });
      setSegmentsOverrides((prev) =>
        prev.filter((s) => s.segmentID !== contextSelectedSegmentID.segmentID)
      );
      setSelectedSegment("everyone");
    }
    handleCloseSegmentContextMenu();
  };
  function getSegmentsToAdd() {
    return segments
      .filter(
        (segment) =>
          segmentsOverrides.some((s) => s.segmentID === segment.segmentID) ===
          false
      )
      .map((s) => ({
        label: `${s.segmentName}`,
        segmentID: s.segmentID,
      }));
  }
  function getSegmentedVariableValue(variableID) {
    if (
      segmentVariables[selectedSegment] &&
      segmentVariables[selectedSegment][variableID] !== undefined
    ) {
      return segmentVariables[selectedSegment][variableID];
    } else {
      return segmentVariables["everyone"][variableID];
    }
  }
  return (
    // Top margin added to account for external navbars/upperbars
    <Box
      sx={{
        mt: 0,
        display: "flex",
        flexDirection: "row",
        height: "calc(100vh - 45px)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Helmet>
        <title>{titles.lo_model}</title>
      </Helmet>

      <Backdrop sx={{ color: "#fff", zIndex: 3 }} open={isLoading}>
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Left Sidebar: Segments */}
      {window.__env.edition !== "community" && (
        <Box
          sx={{
            width: segmentSidebarWidth,
            flexShrink: 0,
            borderRight: "1px solid #ccc",
            p: 2,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "var(--regular-card-bg-color)",
            overflowY: "auto",
            scrollbarColor: "var(--scrollbar-color)",
            scrollbarWidth: "thin",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2 }}>
            Segments
          </Typography>
          <List sx={{ flexGrow: 1, width: "100%" }}>
            {segmentsOverrides.map((segment, index) => (
              <Tooltip
                title="Right click to open context menu (only if not 'Everyone' segment)"
                placement="top"
                arrow
                enterDelay={1000}
                disableInteractive
                key={segment.segmentID}
              >
                <ListItem
                  button
                  key={segment.segmentID}
                  selected={selectedSegment === segment.segmentID}
                  onClick={() => handleSegmentSelect(segment.segmentID)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    "&.Mui-selected": {
                      backgroundColor: "rgba(25, 118, 210, 0.12)",
                    },
                  }}
                  onContextMenu={(e) =>
                    handleSegmentContextMenu(e, segment.segmentID, index)
                  }
                >
                  <ListItemText
                    primary={
                      segments.find((s) => s.segmentID === segment.segmentID)
                        ?.segmentName || ""
                    }
                  />
                </ListItem>
              </Tooltip>
            ))}
          </List>
          <Divider />
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            sx={{ mt: 2 }}
            onClick={(e) => setSegmentAddPopover(e.currentTarget)}
          >
            Add Segment
          </Button>
        </Box>
      )}

      {/* Main Content */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          // maxWidth: `calc(100% - ${segmentSidebarWidth}px)`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            borderBottom: 1,
            borderColor: "divider",
            width: "100%",
            backgroundColor: "var(--upperbar-bg-color)",
            alignItems: "center",
          }}
        >
          <Tabs
            value={activeTabIndex}
            onChange={handleTabChange}
            sx={{ width: "fit-content" }}
          >
            {tabs.map((tab, index) => (
              <Tooltip
                title="Right click to open context menu"
                placement="top"
                disableInteractive
                key={tab.tabID}
              >
                <Tab
                  label={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        position: "relative",
                      }}
                    >
                      <span>{tab.tabName}</span>
                    </Box>
                  }
                  onContextMenu={(e) =>
                    handleTabContextMenu(e, tab.tabID, index)
                  }
                />
              </Tooltip>
            ))}
          </Tabs>
          <Button
            variant={tabs.length > 0 ? "text" : "contained"}
            sx={{
              minHeight: 20,
              minWidth: 20,
              ml: 0.5,
              display: "flex",
              alignItems: "center",
            }}
            onClick={handleOpenNewTabDialog}
          >
            <AddIcon fontSize="small" />
            <Typography variant="caption" sx={{ mt: 0.2 }}>
              new
            </Typography>
          </Button>
        </Box>

        <Box
          sx={{
            display: "flex",
            height: "100%",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Backdrop when no tab selected */}
          {activeTabIndex === "" && (
            <Box
              sx={{
                backgroundColor: "#000",
                opacity: 0.3,
                position: "absolute",
                width: "100%",
                height: "100%",
                zIndex: 1,
              }}
            />
          )}

          {/* Middle Sidebar: Variables */}
          <Box
            sx={{
              width: variableSidebarWidth,
              flexShrink: 0,
              borderRight: "1px solid #ccc",
              p: 2,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "var(--regular-card-bg-color2)",
              overflowY: "auto",
              scrollbarColor: "var(--scrollbar-color)",
              scrollbarWidth: "thin",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2 }}>
              Variables - {tabs[activeTabIndex]?.tabName}
            </Typography>
            <Chip
              label={
                selectedSegment === "everyone"
                  ? "Default Values"
                  : `Custom for: ${segments.find((s) => s.segmentID === selectedSegment)?.segmentName}`
              }
              color={selectedSegment === "everyone" ? "primary" : "secondary"}
              sx={{ mb: 2, p: 0.5 }}
            />

            {/* Add New Variable Form */}
            <Box sx={{ mt: 1, mb: 2 }}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: "1rem",
                  backgroundColor: "var(--game-model-variable-create-bg-color)",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  Add New Variable
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Variable Name"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  margin="dense"
                />
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Type"
                  value={newVarType}
                  onChange={(e) => setNewVarType(e.target.value)}
                  margin="dense"
                >
                  <SelectMenuItem value="string">String</SelectMenuItem>
                  <SelectMenuItem value="number">Number</SelectMenuItem>
                  <SelectMenuItem value="boolean">Boolean</SelectMenuItem>
                </TextField>
                <Button
                  disabled={newVarName === ""}
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={addNewVariable}
                  fullWidth
                  sx={{ mt: 1 }}
                  size="small"
                >
                  Create Variable
                </Button>
              </Paper>
            </Box>

            <List sx={{ flexGrow: 1, width: "100%" }}>
              {filteredVariables.map((variable) => (
                <ListItem
                  key={variable.variableID}
                  sx={{
                    flexDirection: "column",
                    alignItems: "flex-start",
                    p: 1.5,
                    mb: 1,
                    gap: 0.4,
                    border: "1px solid rgba(0, 0, 0, 0.12)",
                    backgroundColor: "var(--game-model-variable-bg-color)",
                    borderRadius: "1rem",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      {variable.variableName}
                    </Typography>
                    <Tooltip
                      title={
                        Boolean(variable.variableComment)
                          ? variable.variableComment
                          : "Click to set comment"
                      }
                    >
                      <IconButton
                        size="small"
                        sx={{
                          opacity:
                            hoveredVariableIDComment === variable.variableID
                              ? 1
                              : 0.5,
                        }}
                        onClick={() => {
                          handleVariableCommentContextMenu(variable.variableID);
                        }}
                        onMouseLeave={() => setHoveredVariableIDComment("")}
                        onMouseEnter={() =>
                          setHoveredVariableIDComment(variable.variableID)
                        }
                      >
                        <CommentIcon fontSize="12px" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {variable.variableType}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {variable.variableType === "boolean" ? (
                      <FormGroup sx={{ width: "100%" }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={getSegmentedVariableValue(
                                variable.variableID
                              )}
                              onChange={(e) =>
                                handleVariableValueChange(
                                  variable.variableID,
                                  e.target.checked
                                )
                              }
                              size="small"
                            />
                          }
                          label="Enabled"
                        />
                      </FormGroup>
                    ) : variable.variableType === "string" ? (
                      <TextField
                        fullWidth
                        size="small"
                        margin="dense"
                        value={getSegmentedVariableValue(variable.variableID)}
                        onChange={(e) =>
                          handleVariableValueChange(
                            variable.variableID,
                            e.target.value
                          )
                        }
                      />
                    ) : (
                      <TextField
                        fullWidth
                        type="number"
                        size="small"
                        margin="dense"
                        value={getSegmentedVariableValue(variable.variableID)}
                        onChange={(e) =>
                          handleVariableValueChange(
                            variable.variableID,
                            Number(e.target.value)
                          )
                        }
                      />
                    )}

                    {segmentVariables[selectedSegment] &&
                      segmentVariables[selectedSegment][variable.variableID] !==
                        undefined &&
                      selectedSegment !== "everyone" && (
                        <Tooltip
                          disableInteractive
                          arrow
                          placement="top"
                          title={`Differs from value of 'Everyone' segment. \nClick to reset.`}
                        >
                          <IconButton
                            onClick={() => {
                              resetVariableSegmentedValue(variable.variableID);
                            }}
                            color="secondary"
                            sx={{ minWidth: 20, minHeight: 20 }}
                          >
                            <PersonIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                  </Box>

                  <IconButton
                    onClick={(e) => {
                      setVariableToRemove(variable.variableID);
                      setVariableRemovalPopover(e.currentTarget);
                    }}
                    size="small"
                    sx={{
                      minWidth: 20,
                      minHeight: 20,
                      position: "absolute",
                      top: "3%",
                      right: "1%",
                    }}
                  >
                    <ClearIcon fontSize="12px" />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Function Cards Content */}
          <Box
            id={"functionsBody"}
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              overflowX: "hidden",
              maxWidth: `calc(100% - ${variableSidebarWidth}px)`,
            }}
          >
            <Container
              maxWidth="xl"
              sx={{
                py: 3,
                px: { xs: 2, sm: 3 },
                height: "100%",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                  flexWrap: "wrap",
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    mt: { xs: 2, sm: 0 },
                    backgroundColor: "var(--regular-card-bg-color)",
                    width: "100%",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Create New Function
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <TextField
                      size="small"
                      label="Function Name"
                      value={newCardName}
                      onChange={(e) => setNewCardName(e.target.value)}
                    />
                    <TextField
                      size="small"
                      label="Comment"
                      value={newCardComment}
                      onChange={(e) => setNewCardComment(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={addNewCard}
                    >
                      Create Function
                    </Button>
                  </Box>
                </Paper>
              </Box>

              {filteredCards.map((card) => (
                <GameModelFunctions
                  key={card.functionID}
                  card={card}
                  variables={variables
                    .filter(
                      (v) => v.respectiveCategory === card.respectiveCategory
                    )
                    .map((v) => {
                      v.value = getSegmentedVariableValue(v.variableID);
                      return v;
                    })}
                  segments={segments}
                  nodeData={nodeData}
                  offers={offers}
                  selectedSegment={selectedSegment}
                  links={functionLinks.filter(
                    (l) => l.linkedFunctionID === card.functionID
                  )}
                  onClone={cloneCard}
                  onDelete={deleteCard}
                  onChange={changeCard}
                  onLinkChange={changeLink}
                />
              ))}
            </Container>
          </Box>
        </Box>
      </Box>

      {/* Variable deletion */}
      <Popover
        open={Boolean(variableRemovalPopover)}
        anchorEl={variableRemovalPopover}
        onClose={() => {
          setVariableRemovalPopover(null);
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              overflow: "visible",
            },
          },
        }}
      >
        <Typography sx={{ mb: 1 }}>
          Are you sure you want to delete this variable? <br />
          Make sure you don't use this variable anywhere.
          <br />
          This action cannot be undone. <br />
        </Typography>
        <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
          <Button
            sx={{ color: "error.primary" }}
            onClick={() => deleteVariable(variableToRemove)}
          >
            Delete
          </Button>
          <Button
            variant="contained"
            sx={{ ml: "auto" }}
            onClick={() => {
              setVariableRemovalPopover(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </Popover>

      {/* Tab deletion */}
      <Popover
        open={Boolean(tabRemovalPopover)}
        anchorEl={tabRemovalPopover}
        onClose={() => {
          setTabRemovalPopover(null);
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              overflow: "visible",
            },
          },
        }}
      >
        <Typography sx={{ mb: 1 }}>
          Are you sure you want to delete this tab? <br />
          Everything you created within this tab will be deleted.
          <br />
          This action cannot be undone. <br />
        </Typography>
        <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
          <Button sx={{ color: "error.primary" }} onClick={() => deleteTab()}>
            Delete
          </Button>
          <Button
            variant="contained"
            sx={{ ml: "auto" }}
            onClick={() => {
              setTabRemovalPopover(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </Popover>

      {/* Tab Context Menu */}
      <Menu
        anchorEl={tabContextMenu}
        open={Boolean(tabContextMenu)}
        onClose={handleCloseTabContextMenu}
      >
        <MenuItem onClick={openRenameTabDialog}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={(e) => setTabRemovalPopover(e.currentTarget)}
          disabled={tabs.length <= 1}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Segment Context Menu */}
      <Menu
        anchorEl={segmentContextMenu}
        open={Boolean(segmentContextMenu)}
        onClose={handleCloseSegmentContextMenu}
      >
        <MenuItem onClick={deleteSegment}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Popover
        open={Boolean(segmentAddPopover)}
        anchorEl={segmentAddPopover}
        onClose={(event) => {
          setSegmentAddPopover(null);
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              overflow: "visible",
              backgroundImage: "none",
              backgroundColor: "var(--bg-color3)",
            },
          },
        }}
      >
        {segments && segments.length > 0 ? (
          <Autocomplete
            disablePortal
            id="Search"
            onChange={(event, newValue) => {
              setSegmentAddPopover(null);
              addNewSegment(newValue.segmentID);
            }}
            options={getSegmentsToAdd()}
            sx={{ width: 300 }}
            renderInput={(params) => (
              <TextField spellCheck={false} {...params} label="Segments" />
            )}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <Box sx={{ padding: "16px", textAlign: "center" }}>
              <Typography>No segments found.</Typography>
            </Box>
          </Box>
        )}
      </Popover>

      {/* New Tab Dialog */}
      <Dialog open={newTabDialogOpen} onClose={handleCloseNewTabDialog}>
        <DialogTitle>Create New Tab</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tab Name"
            fullWidth
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewTabDialog}>Cancel</Button>
          <Button onClick={addNewTab} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Tab Dialog */}
      <Dialog open={renameTabDialogOpen} onClose={handleCloseRenameDialog}>
        <DialogTitle>Rename Tab</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Name"
            fullWidth
            value={tabRename}
            onChange={(e) => setTabRename(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRenameDialog}>Cancel</Button>
          <Button onClick={renameTab} variant="contained" color="primary">
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Variable Comment Dialog */}
      <Dialog
        open={variableCommentDialogOpen}
        onClose={handleCloseVariableCommentDialog}
      >
        <DialogTitle>Set Comment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={4}
            sx={{
              "& fieldset": {
                borderRadius: "1rem",
              },
            }}
            margin="dense"
            label="Comment"
            fullWidth
            value={variableCommentChange}
            onChange={(e) => setVariableCommentChange(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVariableCommentDialog}>Cancel</Button>
          <Button
            onClick={changeVariableComment}
            variant="contained"
            color="primary"
          >
            Set
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GameModel;
