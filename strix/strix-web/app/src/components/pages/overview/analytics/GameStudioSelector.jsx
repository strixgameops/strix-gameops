import React, { useState, useRef } from "react";
import {
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Avatar,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Gamepad as GameIcon,
  Business as StudioIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import styles from "../css/gameStudioSelector.module.css";
import EditIcon from "@mui/icons-material/Edit";

const GameStudioSelector = ({
  games = [],
  studios = [],
  selectedGames = [],
  selectedStudios = [],
  onGameSelect,
  onStudioSelect,
  navigationMode = window.__env.edition !== "community"
    ? "publisher"
    : "studio",
  onNavigateToStudio,
  onNavigateToPublisher,
  currentStudio,
  onGameSettings,
  onStudioSettings,
  onCreateGame,
  onCreateStudio,
}) => {
  const [gamesExpanded, setGamesExpanded] = useState(true);
  const [studiosExpanded, setStudiosExpanded] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedGameForContext, setSelectedGameForContext] = useState(null);
  const [selectedStudioForContext, setSelectedStudioForContext] = useState(null);

  const handleGameToggle = (game) => {
    const isSelected = selectedGames.some((g) => g.gameID === game.gameID);
    if (isSelected) {
      onGameSelect(selectedGames.filter((g) => g.gameID !== game.gameID));
    } else {
      onGameSelect([...selectedGames, game]);
    }
  };

  const handleStudioToggle = (studio) => {
    const isSelected = selectedStudios.some(
      (s) => s.studioID === studio.studioID
    );
    if (isSelected) {
      onStudioSelect(
        selectedStudios.filter((s) => s.studioID !== studio.studioID)
      );
    } else {
      onStudioSelect([...selectedStudios, studio]);
    }
  };

  const handleGameRightClick = (event, game) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedGameForContext(game);
    setSelectedStudioForContext(null);
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
          }
        : null
    );
  };

  const handleStudioRightClick = (event, studio) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedStudioForContext(studio);
    setSelectedGameForContext(null);
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
          }
        : null
    );
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
    setSelectedGameForContext(null);
    setSelectedStudioForContext(null);
  };

  const handleGameSettingsFromContext = () => {
    if (selectedGameForContext && onGameSettings) {
      onGameSettings(selectedGameForContext.gameID);
    }
    handleContextMenuClose();
  };

  const handleStudioSettingsFromContext = () => {
    if (selectedStudioForContext && onStudioSettings) {
      onStudioSettings(selectedStudioForContext.studioID);
    }
    handleContextMenuClose();
  };

  const handleSelectAllGames = () => {
    onGameSelect(games);
  };

  const handleDeselectAllGames = () => {
    onGameSelect([]);
  };

  const handleSelectAllStudios = () => {
    onStudioSelect(studios);
  };

  const handleDeselectAllStudios = () => {
    onStudioSelect([]);
  };

  const renderGameChip = (game, index) => {
    const isSelected = selectedGames.some((g) => g.gameID === game.gameID);
    const isPendingDeletion = game.scheduledDeletionDate;

    return (
      <Box key={game.gameID} className={styles.chipContainer}>
        <Tooltip
          title="Right click to open settings"
          disableInteractive
          placement="top"
        >
          <Chip
            avatar={
              <Avatar src={game.gameIcon} className={styles.chipAvatar}>
                <GameIcon />
              </Avatar>
            }
            label={game.gameName}
            onClick={() => handleGameToggle(game)}
            onContextMenu={(e) => handleGameRightClick(e, game)}
            className={`${styles.chip} ${isSelected ? styles.chipSelected : ""} ${isPendingDeletion ? styles.chipPendingDeletion : ""}`}
            color={isSelected ? "primary" : "default"}
            variant={isSelected ? "filled" : "outlined"}
          />
        </Tooltip>
      </Box>
    );
  };

  const renderStudioChip = (studio) => {
    const isSelected = selectedStudios.some(
      (s) => s.studioID === studio.studioID
    );
    return (
      <Box key={studio.studioID} className={styles.studioChipContainer}>
        <Box className={styles.chipContainer}>
          <Tooltip
            title="Right click to open settings"
            disableInteractive
            placement="top"
          >
            <Chip
              avatar={
                <Avatar src={studio.studioIcon} className={styles.chipAvatar}>
                  <StudioIcon />
                </Avatar>
              }
              label={studio.studioName}
              onClick={() => handleStudioToggle(studio)}
              onContextMenu={(e) => handleStudioRightClick(e, studio)}
              className={`${styles.chip} ${isSelected ? styles.chipSelected : ""}`}
              color={isSelected ? "primary" : "default"}
              variant={isSelected ? "filled" : "outlined"}
            />
          </Tooltip>
        </Box>
        <Button
          size="small"
          onClick={() => onNavigateToStudio && onNavigateToStudio(studio)}
          className={styles.viewStudioButton}
          endIcon={<ForwardIcon />}
        >
          View Studio
        </Button>
      </Box>
    );
  };

  return (
    <Box className={styles.selectorContainer}>
      {/* Navigation Panel */}
      {navigationMode === "studio" &&
        window.__env.edition !== "community" &&
        studios.length > 1 && (
          <Paper className={styles.navigationPanel}>
            <Button
              startIcon={<BackIcon />}
              onClick={onNavigateToPublisher}
              className={styles.backButton}
              fullWidth
            >
              Back to Publisher View
            </Button>
            {currentStudio && (
              <Typography variant="body2" className={styles.currentContext}>
                Viewing: {currentStudio.studioName}
              </Typography>
            )}
          </Paper>
        )}

      {/* Games Panel */}
      {navigationMode === "studio" && (
        <Paper className={styles.panel}>
          <Box
            className={styles.panelHeader}
            onClick={() => setGamesExpanded(!gamesExpanded)}
          >
            <Box className={styles.headerContent}>
              <GameIcon className={styles.headerIcon} />
              <Typography variant="h6" className={styles.headerTitle}>
                Games
              </Typography>
              <Typography variant="body2" className={styles.headerCount}>
                {selectedGames.length}/{games.length}
              </Typography>
            </Box>
            <Box className={styles.headerActions}>
              {games.length > 1 && (
                <>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAllGames();
                    }}
                    sx={{ ml: 0.5 }}
                    className={styles.selectAllButton}
                  >
                    All
                  </Button>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeselectAllGames();
                    }}
                    className={styles.selectAllButton}
                  >
                    None
                  </Button>
                </>
              )}
              {onCreateGame && (
                <Tooltip title="Create New Game">
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateGame();
                    }}
                    className={styles.createButton}
                    startIcon={<AddIcon />}
                    variant="outlined"
                    color="primary"
                  >
                    New Game
                  </Button>
                </Tooltip>
              )}
              <IconButton size="small" className={styles.expandButton}>
                {gamesExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

          <Collapse in={gamesExpanded}>
            <Box className={styles.panelContent}>
              {games.length === 0 ? (
                <Box className={styles.emptyState}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                  >
                    No games available
                  </Typography>
                  {onCreateGame && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={onCreateGame}
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Create Your First Game
                    </Button>
                  )}
                </Box>
              ) : games.length === 1 ? (
                <Box className={styles.singleItem}>
                  {renderGameChip(games[0], 0)}
                </Box>
              ) : (
                <Box className={styles.chipGrid}>
                  {games.map((game, index) => renderGameChip(game, index))}
                </Box>
              )}
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* Studios Panel - Only show in publisher mode */}
      {navigationMode === "publisher" && (
        <Paper className={styles.panel}>
          <Box
            className={styles.panelHeader}
            onClick={() => setStudiosExpanded(!studiosExpanded)}
          >
            <Box className={styles.headerContent}>
              <StudioIcon className={styles.headerIcon} />
              <Typography variant="h6" className={styles.headerTitle}>
                Studios
              </Typography>
              <Typography variant="body2" className={styles.headerCount}>
                {selectedStudios.length}/{studios.length}
              </Typography>
            </Box>
            <Box className={styles.headerActions}>
              {onCreateStudio && (
                <Tooltip title="Create New Studio">
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateStudio();
                    }}
                    className={styles.createButton}
                    startIcon={<AddIcon />}
                    variant="outlined"
                    color="primary"
                  >
                    New Studio
                  </Button>
                </Tooltip>
              )}
              {studios.length > 1 && (
                <>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAllStudios();
                    }}
                    className={styles.selectAllButton}
                  >
                    All
                  </Button>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeselectAllStudios();
                    }}
                    className={styles.selectAllButton}
                  >
                    None
                  </Button>
                </>
              )}
              <IconButton size="small" className={styles.expandButton}>
                {studiosExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

          <Collapse in={studiosExpanded}>
            <Box className={styles.panelContent}>
              {studios.length === 0 ? (
                <Box className={styles.emptyState}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                  >
                    No studios available
                  </Typography>
                  {onCreateStudio && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={onCreateStudio}
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Create Your First Studio
                    </Button>
                  )}
                </Box>
              ) : studios.length === 1 ? (
                <Box className={styles.singleItem}>
                  {renderStudioChip(studios[0])}
                </Box>
              ) : (
                <Box className={styles.chipGrid}>
                  {studios.map(renderStudioChip)}
                </Box>
              )}
            </Box>
          </Collapse>
        </Paper>
      )}

      {window.__env.edition === "community" && (
        <Tooltip title="Edit settings">
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onStudioSettings(currentStudio.studioID);
            }}
            className={styles.createButton}
            startIcon={<EditIcon />}
            variant="outlined"
            color="primary"
          >
            Edit Studio Settings
          </Button>
        </Tooltip>
      )}

      {/* Summary Panel */}
      {(selectedGames.length > 0 || selectedStudios.length > 0) && (
        <Paper className={styles.summaryPanel}>
          <Typography variant="body2" className={styles.summaryText}>
            {navigationMode === "publisher" ? (
              <>
                Analyzing {selectedGames.length} game
                {selectedGames.length !== 1 ? "s" : ""}
                {selectedStudios.length > 0 &&
                  window.__env.edition !== "community" &&
                  ` from ${selectedStudios.length} studio${selectedStudios.length !== 1 ? "s" : ""}`}
              </>
            ) : (
              <>
                Analyzing {selectedGames.length} game
                {selectedGames.length !== 1 ? "s" : ""}
                {currentStudio &&
                  window.__env.edition !== "community" &&
                  ` from ${currentStudio.studioName}`}
              </>
            )}
          </Typography>
        </Paper>
      )}

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              background: "var(--regular-card-bg-color)",
              border: "1px solid rgba(98, 95, 244, 0.3)",
              borderRadius: "8px",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
            },
          },
        }}
      >
        {selectedGameForContext && onGameSettings && (
          <MenuItem
            onClick={handleGameSettingsFromContext}
            sx={{
              color: "var(--text-primary-color)",
              "&:hover": {
                background: "rgba(98, 95, 244, 0.1)",
              },
            }}
          >
            <ListItemIcon>
              <SettingsIcon
                fontSize="small"
                sx={{ color: "rgba(98, 95, 244, 0.8)" }}
              />
            </ListItemIcon>
            <ListItemText>Game Settings</ListItemText>
          </MenuItem>
        )}
        {selectedStudioForContext && onStudioSettings && (
          <MenuItem
            onClick={handleStudioSettingsFromContext}
            sx={{
              color: "var(--text-primary-color)",
              "&:hover": {
                background: "rgba(98, 95, 244, 0.1)",
              },
            }}
          >
            <ListItemIcon>
              <SettingsIcon
                fontSize="small"
                sx={{ color: "rgba(98, 95, 244, 0.8)" }}
              />
            </ListItemIcon>
            <ListItemText>Studio Settings</ListItemText>
          </MenuItem>
        )}
      </Menu>
      
    </Box>
  );
};

export default GameStudioSelector;