import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Fade from "@mui/material/Fade";
import { styled } from "@mui/material/styles";
import { useOverviewData } from "@strix/hooks/useOverviewData";
import { useNavbarSelection } from "@strix/hooks/useNavbarSelection";
import { trimStr } from "./utils/navbarUtils";
import { useGame } from "@strix/gameContext";
import GameDisplaySection from "./GameDisplaySection";
import useApi from "@strix/api";

// Icons
import BusinessIcon from "@mui/icons-material/Business";
import ApartmentIcon from "@mui/icons-material/Apartment";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";

const SelectorContainer = styled(Paper)(({ theme }) => ({
  padding: "16px",
  background: `linear-gradient(135deg, 
    rgba(105, 98, 234, 0.08) 0%, 
    rgba(87, 80, 210, 0.12) 50%, 
    rgba(105, 98, 234, 0.08) 100%)`,
  borderRadius: "16px",
  border: "1px solid rgba(105, 98, 234, 0.2)",
  backdropFilter: "blur(10px)",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 32px rgba(105, 98, 234, 0.15)",
    border: "1px solid rgba(105, 98, 234, 0.3)",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "1px",
    background:
      "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
  },
}));

const CollapseButton = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  borderRadius: "8px",
  background: "rgba(105, 98, 234, 0.1)",
  color: "#6962ea",
  cursor: "pointer",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(105, 98, 234, 0.15)",
  zIndex: 1,
  "&:hover": {
    background: "linear-gradient(135deg, #6962ea 0%, #8b7ed8 100%)",
    color: "#ffffff",
    transform: "scale(1.1)",
    boxShadow: "0 4px 12px rgba(105, 98, 234, 0.3)",
    border: "1px solid rgba(105, 98, 234, 0.3)",
  },
  "&:active": {
    transform: "scale(0.95)",
  },
}));

const SelectorRow = styled(Box)(({ theme, disabled }) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
  transition: "all 0.3s ease",
  opacity: disabled ? 0.5 : 1,
  "&:last-child": {
    marginBottom: 0,
  },
}));

const IconContainer = styled(Box)(({ theme, active }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  background: active
    ? "linear-gradient(135deg, #6962ea 0%, #8b7ed8 100%)"
    : "rgba(105, 98, 234, 0.1)",
  color: active ? "#ffffff" : "#6962ea",
  transition: "all 0.3s ease",
  boxShadow: active ? "0 4px 12px rgba(105, 98, 234, 0.3)" : "none",
}));

const StyledSelect = styled(Select)(({ theme, hasvalue }) => ({
  flex: 1,
  fontSize: "13px",
  fontWeight: 500,
  letterSpacing: 0.3,
  "& .MuiSelect-select": {
    paddingTop: "8px",
    paddingBottom: "8px",
    paddingLeft: "12px",
    paddingRight: "32px",
    borderRadius: "10px",
    background: hasvalue
      ? "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)"
      : "rgba(255,255,255,0.03)",
    transition: "all 0.3s ease",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderWidth: "1px",
    borderColor: "rgba(105, 98, 234, 0.2)",
    borderRadius: "10px",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "#6962ea",
    borderWidth: "1px",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#6962ea",
    borderWidth: "2px",
    boxShadow: "0 0 0 3px rgba(105, 98, 234, 0.1)",
  },
  "& .MuiSelect-icon": {
    color: "#6962ea",
    transition: "transform 0.3s ease",
  },
  "&.Mui-focused .MuiSelect-icon": {
    transform: "rotate(180deg)",
  },
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "16px",
  paddingBottom: "8px",
  borderBottom: "1px solid rgba(105, 98, 234, 0.1)",
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  fontSize: "10px",
  height: "20px",
  background: "linear-gradient(135deg, #6962ea 0%, #8b7ed8 100%)",
  color: "#ffffff",
  fontWeight: 600,
  letterSpacing: 0.5,
  "& .MuiChip-label": {
    paddingLeft: "6px",
    paddingRight: "6px",
  },
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  padding: "24px",
  color: "#6962ea",
}));

const AutoSelectedIndicator = styled(Typography)(({ theme }) => ({
  fontSize: "10px",
  color: "rgba(105, 98, 234, 0.7)",
  fontWeight: 500,
  letterSpacing: 0.5,
  textAlign: "center",
  marginTop: "8px",
  padding: "4px 8px",
  background: "rgba(105, 98, 234, 0.08)",
  borderRadius: "6px",
  border: "1px solid rgba(105, 98, 234, 0.15)",
}));

const CollapsedContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  cursor: "pointer",
  borderRadius: "12px",
  transition: "all 0.3s ease",
  "&:hover": {
    background: "rgba(105, 98, 234, 0.1)",
  },
}));

const CollapsedInfo = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
}));

const CollapsedTitle = styled(Typography)(({ theme }) => ({
  fontSize: "13px",
  fontWeight: 600,
  color: "#6962ea",
  marginBottom: "2px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const CollapsedSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: "11px",
  color: "rgba(105, 98, 234, 0.7)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const ExpandButton = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  borderRadius: "6px",
  background: "rgba(105, 98, 234, 0.1)",
  color: "#6962ea",
  transition: "all 0.3s ease",
  "&:hover": {
    background: "#6962ea",
    color: "#ffffff",
  },
}));

const GameSelector = memo(() => {
  const overviewData = useOverviewData();
  const navbarSelection = useNavbarSelection(overviewData);
  const [isExpanded, setIsExpanded] = useState(false);
  const { game, setBranch, branch, environment, setEnvironment } = useGame();
  const [latestBranches, setLatestBranches] = useState([]);
  const [allEnvironments, setAllEnvironments] = useState([]);

  const { publishers, studios, getStudioGames, isLoadingOrganizations } =
    overviewData;

  const { getLatestDeployedBranches, getListOfEnvironments } = useApi();

  const {
    selectedPublisher,
    selectedStudio,
    selectedGame,
    setSelectedPublisher,
    setSelectedStudio,
    setSelectedGame,
    resetAutoSelection,
  } = navbarSelection;

  // Prevent duplicate fetches
  const lastFetchedGameId = useRef(null);

  // Filter studios by selected publisher
  const currentStudios = selectedPublisher
    ? studios.filter(
        (studio) => studio.publisherID === selectedPublisher.publisherID
      )
    : [];

  // Debug log for studio filtering
  useEffect(() => {
    console.debug("GameSelector studios filtered:", {
      publisherID: selectedPublisher?.publisherID,
      publisherName: selectedPublisher?.publisherName,
      totalStudios: studios.length,
      filteredStudios: currentStudios.length,
      studioNames: currentStudios.map((s) => s.studioName),
    });
  }, [selectedPublisher, studios, currentStudios]);

  // Get current studio's games
  const currentGames = selectedStudio
    ? getStudioGames(selectedStudio.studioID)
    : [];

  const handlePublisherChange = useCallback(
    (event) => {
      const publisherID = event.target.value;
      const publisher = publishers.find((p) => p.publisherID === publisherID);
      console.debug("Publisher changed to:", publisher);
      setSelectedPublisher(publisher);
      setSelectedStudio(null);
      setSelectedGame(null);
    },
    [publishers, setSelectedPublisher, setSelectedStudio, setSelectedGame]
  );

  const handleStudioChange = useCallback(
    (event) => {
      const studioID = event.target.value;
      const studio = currentStudios.find((s) => s.studioID === studioID);
      console.debug("Studio changed to:", studio);
      setSelectedStudio(studio);
      setSelectedGame(null);
      // Clear deployment data when studio changes
      setLatestBranches([]);
      setAllEnvironments([]);
      lastFetchedGameId.current = null;
    },
    [currentStudios, setSelectedStudio, setSelectedGame]
  );

  const handleGameChange = useCallback(
    (event) => {
      const gameID = event.target.value;
      const selectedGameItem = currentGames.find((g) => g.gameID === gameID);
      console.debug("Game changed to:", selectedGameItem);

      // Set game first
      setSelectedGame(selectedGameItem || null);

      // Then fetch deployment data
      if (selectedGameItem?.gameID) {
        fetchDeploymentData(selectedGameItem.gameID);
      } else {
        // Clear data if no game selected
        setLatestBranches([]);
        setAllEnvironments([]);
        lastFetchedGameId.current = null;
      }
    },
    [currentGames, setSelectedGame]
  );

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const changeBranch = useCallback(
    (newBranch) => {
      setBranch(newBranch);
    },
    [setBranch]
  );

  const changeEnvironment = useCallback(
    (newEnv) => {
      setEnvironment(newEnv);
    },
    [setEnvironment]
  );

  // Enhanced deployment data fetching
  const fetchDeploymentData = useCallback(
    async (gameID) => {
      if (!gameID) {
        setLatestBranches([]);
        setAllEnvironments([]);
        lastFetchedGameId.current = null;
        return;
      }

      if (lastFetchedGameId.current === gameID) {
        return;
      }

      console.debug(`Fetching deployment data for game: ${gameID}`);
      lastFetchedGameId.current = gameID;

      try {
        const [branchesResp, environmentsResp] = await Promise.all([
          getLatestDeployedBranches({ gameID, limit: 20 }),
          getListOfEnvironments({ gameID }),
        ]);

        if (branchesResp.success) {
          setLatestBranches(branchesResp.result);
        } else {
          console.warn("Failed to fetch branches:", branchesResp.error);
          setLatestBranches([]);
        }

        if (environmentsResp.success) {
          setAllEnvironments(environmentsResp.result);
        } else {
          console.warn("Failed to fetch environments:", environmentsResp.error);
          setAllEnvironments([]);
        }
      } catch (error) {
        console.error("Failed to fetch deployment data:", error);
        setLatestBranches([]);
        setAllEnvironments([]);
      }
    },
    [getLatestDeployedBranches, getListOfEnvironments]
  );

  // Fetch deployment data when game changes
  useEffect(() => {
    fetchDeploymentData(game?.gameID);
  }, [game?.gameID]);

  // Handle games list changes to reset auto-selection
  useEffect(() => {
    if (
      currentGames.length > 0 &&
      !selectedGame &&
      selectedStudio &&
      resetAutoSelection
    ) {
      resetAutoSelection();
    }
  }, [currentGames.length, selectedGame, selectedStudio]);

  const renderCollapsedView = () => (
    <SelectorContainer elevation={0}>
      <CollapsedContainer onClick={handleToggleExpand}>
        <IconContainer active={true}>
          <SportsEsportsIcon sx={{ fontSize: "16px" }} />
        </IconContainer>
        <CollapsedInfo>
          <CollapsedTitle>
            {trimStr(selectedGame?.gameName || "No game", 20)}
          </CollapsedTitle>
          <CollapsedSubtitle>
            {selectedStudio?.studioName && selectedPublisher?.publisherName
              ? `${trimStr(selectedStudio.studioName, 15)} • ${trimStr(selectedPublisher.publisherName, 15)}`
              : "No selection"}
          </CollapsedSubtitle>
        </CollapsedInfo>
        <ExpandButton>
          <EditIcon sx={{ fontSize: "14px" }} />
        </ExpandButton>
      </CollapsedContainer>
      <GameDisplaySection
        game={game}
        selectedBranch={branch}
        environment={environment}
        latestBranches={latestBranches}
        allEnvironments={allEnvironments}
        changeBranch={changeBranch}
        changeEnvironment={changeEnvironment}
        disableBranchButton={() => !game?.gameID}
      />
    </SelectorContainer>
  );

  if (isLoadingOrganizations) {
    return (
      <SelectorContainer elevation={0}>
        <LoadingContainer>
          <CircularProgress size={20} sx={{ color: "#6962ea" }} />
          <Typography
            variant="caption"
            sx={{ color: "#6962ea", fontWeight: 500 }}
          >
            Loading...
          </Typography>
        </LoadingContainer>
      </SelectorContainer>
    );
  }

  // Show collapsed view when game is selected and not expanded
  if (!isExpanded && selectedGame) {
    return renderCollapsedView();
  }

  const showPublisherSelector = publishers.length > 1;
  const hasSelections = selectedPublisher && selectedStudio && selectedGame;

  return (
    <SelectorContainer elevation={0}>
      <HeaderSection>
        <Typography
          variant="caption"
          sx={{
            color: "#6962ea",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: 1.2,
            fontWeight: 600,
          }}
        >
          Game Selection
        </Typography>
        {hasSelections && (
          <Fade in={true}>
            <StatusChip label="Connected" size="small" />
          </Fade>
        )}
        <CollapseButton onClick={handleToggleExpand}>
          <ExpandMoreIcon
            sx={{ fontSize: "16px", transform: "rotate(180deg)" }}
          />
        </CollapseButton>
      </HeaderSection>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* Publisher Selector */}
        {showPublisherSelector && window.__env.edition !== "community" && (
          <Fade in={true} timeout={300}>
            <SelectorRow>
              <IconContainer active={!!selectedPublisher}>
                <BusinessIcon sx={{ fontSize: "16px" }} />
              </IconContainer>
              <StyledSelect
                value={selectedPublisher?.publisherID || ""}
                onChange={handlePublisherChange}
                disabled={publishers.length === 0}
                displayEmpty
                hasvalue={!!selectedPublisher}
                IconComponent={KeyboardArrowDownIcon}
                size="small"
              >
                <MenuItem value="">
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Select Publisher
                  </Typography>
                </MenuItem>
                {publishers.map((publisher) => (
                  <MenuItem
                    key={publisher.publisherID}
                    value={publisher.publisherID}
                  >
                    {trimStr(publisher.publisherName, 25)}
                  </MenuItem>
                ))}
              </StyledSelect>
            </SelectorRow>
          </Fade>
        )}

        {/* Studio Selector - Now filtered by selected publisher */}
        {window.__env.edition !== "community" && (
          <Fade in={true} timeout={400}>
            <SelectorRow disabled={!selectedPublisher}>
              <IconContainer active={!!selectedStudio}>
                <ApartmentIcon sx={{ fontSize: "16px" }} />
              </IconContainer>
              <StyledSelect
                value={selectedStudio?.studioID || ""}
                onChange={handleStudioChange}
                disabled={!selectedPublisher || currentStudios.length === 0}
                displayEmpty
                hasvalue={!!selectedStudio}
                IconComponent={KeyboardArrowDownIcon}
                size="small"
              >
                <MenuItem value="">
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Select Studio
                  </Typography>
                </MenuItem>
                {currentStudios.map((studio) => (
                  <MenuItem key={studio.studioID} value={studio.studioID}>
                    {trimStr(studio.studioName, 25)}
                  </MenuItem>
                ))}
              </StyledSelect>
            </SelectorRow>
          </Fade>
        )}

        {/* Game Selector */}
        <Fade in={true} timeout={500}>
          <SelectorRow disabled={!selectedStudio}>
            <IconContainer active={!!game}>
              <SportsEsportsIcon sx={{ fontSize: "16px" }} />
            </IconContainer>
            <StyledSelect
              value={selectedGame?.gameID || ""}
              onChange={handleGameChange}
              disabled={!selectedStudio || currentGames.length === 0}
              displayEmpty
              hasvalue={!!selectedGame}
              IconComponent={KeyboardArrowDownIcon}
              size="small"
            >
              <MenuItem value="">
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Select Game
                </Typography>
              </MenuItem>
              {currentGames.map((gameItem) => (
                <MenuItem key={gameItem.gameID} value={gameItem.gameID}>
                  {trimStr(gameItem.gameName, 25)}
                </MenuItem>
              ))}
            </StyledSelect>
          </SelectorRow>
        </Fade>

        {/* Auto-selected publisher indicator */}
        {!showPublisherSelector && selectedPublisher && (
          <Fade in={true} timeout={600}>
            <AutoSelectedIndicator>
              Publisher: {trimStr(selectedPublisher.publisherName, 30)}
            </AutoSelectedIndicator>
          </Fade>
        )}
      </Box>
    </SelectorContainer>
  );
});

GameSelector.displayName = "GameSelector";

export default GameSelector;
