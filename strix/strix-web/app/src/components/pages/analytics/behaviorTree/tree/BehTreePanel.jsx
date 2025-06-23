import React, { useState, useEffect, useRef } from "react";
import s from "../css/behTree.module.css";
import { styled } from "@mui/material/styles";
import { withStyles } from "@mui/material/styles";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ButtonGroup from "@mui/material/ButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { addDays } from "date-fns";
import { useTheme } from "@mui/material/styles";
import {
  FormControl,
  InputLabel,
  OutlinedInput,
  Select,
  MenuItem,
  Chip,
  Box,
} from "@mui/material";

import StepsIcon from "../assets/showStepsIcon.svg?react";
import ChurnIcon from "../assets/showChurnIcon.svg?react";
import CorrelationIcon from "../assets/showCorrelation.svg?react";
import ControlCamera from "@mui/icons-material/ControlCameraSharp";
import HourglassEmptySharpIcon from "@mui/icons-material/HourglassEmptySharp";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import TextField from "@mui/material/TextField";
import DatePicker from "shared/datePicker/DatePickerWidget.jsx";

import shortid from "shortid";

import SegmentsPicker from "shared/segmentsWidget/SegmentsPickerWidget.jsx";

import reservedEvents from "./ReservedEventsList";

import useApi from "@strix/api";
import { useGame, useBranch } from "@strix/gameContext";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import dayjs from "dayjs";

const BehTreePanel = ({ onSettingsChange, isEconomyAnalysis, onShowChurn }) => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { getAllAnalyticsEvents, getAllSegmentsForAnalyticsFilter } = useApi();
  const [showChurnAnalysis, setShowChurnAnalysis] = useState(false);

  const [settings, setSettings] = useState({
    showSteps: false,
    showChurn: false,
    showCorrelation: false,
    viewmode: "all",
    maxStep: 3,
    minPlayers: 0,
    panToStart: "randomshortid",
    segments: [],
    date: [
      dayjs.utc().subtract(7, "days").toISOString(),
      dayjs.utc().toISOString(),
    ],
    hiddenEvents: [],
    maxSessionLength: 0,
  });

  useEffect(() => {
    onSettingsChange({ ...settings, showChurnAnalysis });
  }, [settings, showChurnAnalysis]);

  const [segments, setSegments] = useState([]);
  useEffect(() => {
    async function fetchSegmentList() {
      const response = await getAllSegmentsForAnalyticsFilter({
        gameID: game.gameID,
        branch: branch,
      });
      if (response.success) {
        // Segments with "everyone" segment
        let segments = response.message;

        for (let i = 0; i < segments.length; i++) {
          if (segments[i].segmentID === "everyone") {
            segments.splice(i, 1);
            break;
          }
        }

        // Populate segments filter with all segments, except "everyone"
        setSegments(segments);
      }
    }
    fetchSegmentList();
  }, []);
  const enabledColor = "#cbcbcb";
  const disabledColor = "#6b6b6b";

  function toggleSettingsParam(param) {
    setSettings({
      ...settings,
      [param]: !settings[param],
    });
  }

  function cycleViewmode() {
    switch (settings.viewmode) {
      case "all":
        setSettings({
          ...settings,
          viewmode: "conversion",
        });
        break;
      case "conversion":
        setSettings({
          ...settings,
          viewmode: "dropoff",
        });
        break;
      case "dropoff":
        setSettings({
          ...settings,
          viewmode: "all",
        });
        break;
    }
  }

  useEffect(() => {
    if (isEconomyAnalysis) {
      setSettings({
        ...settings,
        showChurn: false,
        showCorrelation: false,
        viewmode: "all",
        hiddenEvents: [],
        maxSessionLength: 0,
      });
    }
  }, [isEconomyAnalysis]);

  // Max. steps input field
  const inputRef_MaxSteps = React.useRef();
  const [stepsInput, setStepsInput] = useState(settings.maxStep);
  const [editingMaxSteps, setEditingMaxSteps] = useState(false);
  useEffect(() => {
    if (editingMaxSteps) {
      inputRef_MaxSteps.current.focus();
    }
  }, [editingMaxSteps]);
  function editMaxStep() {
    setEditingMaxSteps(true);
  }
  function formatToNumber(value) {
    return value.toString().replace(/\D/g, "");
  }
  function changeMaxStep(event, blur) {
    if (event.keyCode !== 13 && !blur) return;
    let newValue = formatToNumber(event.target.value);
    newValue = clamp(newValue, 0, newValue);
    if (newValue === "") {
      newValue = 0;
    }
    setSettings({ ...settings, maxStep: newValue });
    setStepsInput(newValue);
    setEditingMaxSteps(false);
    inputRef_MaxSteps.current.blur();
  }

  // Min. players share input field
  const inputRef_MinPlayersShare = React.useRef();
  const [minPlayersInput, setMinPlayersInput] = useState(settings.minPlayers);
  const [editingMinPlayers, setEditingMinPlayers] = useState(false);
  useEffect(() => {
    if (editingMinPlayers) {
      inputRef_MinPlayersShare.current.focus();
    }
  }, [editingMinPlayers]);
  function editMinPlayers() {
    setEditingMinPlayers(true);
  }
  function changeMinPlayers(event, blur) {
    if (event.keyCode !== 13 && !blur) return;
    let newValue = parseFloat(formatToNumber(event.target.value));
    newValue = clamp(newValue, 0, 100);
    if (newValue === "") {
      newValue = 0;
    }
    setSettings({ ...settings, minPlayers: newValue });
    setMinPlayersInput(newValue);
    setEditingMinPlayers(false);
    inputRef_MinPlayersShare.current.blur();
  }
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  // Max. session length input field
  const inputRef_MaxSessionLength = React.useRef();
  const [sessionLengthInput, setSessionLengthInput] = useState(
    settings.maxSessionLength
  );
  const [editingMaxSessionLength, setEditingMaxSessionLength] = useState(false);
  useEffect(() => {
    if (editingMaxSessionLength) {
      inputRef_MaxSessionLength.current.focus();
    }
  }, [editingMaxSessionLength]);
  function editMaxSessionLength() {
    setEditingMaxSessionLength(true);
  }
  function changeMaxSessionLength(event, blur) {
    if (event.keyCode !== 13 && !blur) return;
    let newValue = formatToNumber(event.target.value);
    newValue = clamp(newValue, 0, newValue);
    if (newValue === "") {
      newValue = 0;
    }
    setSettings({ ...settings, maxSessionLength: newValue });
    setSessionLengthInput(newValue);
    setEditingMaxSessionLength(false);
    inputRef_MaxSessionLength.current.blur();
  }

  const handleChange_hiddenEvents = (event) => {
    const {
      target: { value },
    } = event;
    setSettings({
      ...settings,
      hiddenEvents: typeof value === "string" ? value.split(",") : value,
    });
  };

  useEffect(() => {
    fetchAnalyticsEvents();
  }, []);
  const [baseEvents, setBaseEvents] = useState([]);
  async function fetchAnalyticsEvents() {
    const resp = await getAllAnalyticsEvents({
      gameID: game.gameID,
      branch: branch,
      getRemoved: false,
    });
    let events = resp.events.map((event) => ({
      id: event.eventID,
      name: event.eventName,
    }));
    events = events.filter(
      (e) =>
        e.id !== "newSession" &&
        e.id !== "endSession" &&
        e.id !== "endSessionCrash"
    );
    setBaseEvents(events);
  }

  return (
    <div className={s.panel}>
      {/* Upper menu */}
      <ButtonGroup
        variant="outlined"
        sx={{
          maxHeight: "35px",
          width: "fit-content",
          backgroundColor: "var(--bg-color3)",
          borderTopLeftRadius: "1rem",
          borderTopRightRadius: "1rem",
        }}
      >
        <Tooltip title="Move to the first event" disableInteractive>
          <Button
            sx={{ borderBottomLeftRadius: 0, borderTopLeftRadius: "1rem" }}
            onClick={() =>
              setSettings({ ...settings, panToStart: shortid.generate() })
            }
            variant={"outlined"}
          >
            <ControlCamera style={{ rotate: "90deg", fill: disabledColor }} />
          </Button>
        </Tooltip>

        <Tooltip title="Show steps" disableInteractive>
          <Button
            onClick={() => toggleSettingsParam("showSteps")}
            variant={settings.showSteps ? "contained" : "outlined"}
          >
            <StepsIcon
              style={{
                rotate: "90deg",
                fill: settings.showSteps ? enabledColor : disabledColor,
              }}
            />
          </Button>
        </Tooltip>

        <Tooltip title="Show churn from the funnel" disableInteractive>
          <Button
            disabled={isEconomyAnalysis}
            sx={{
              ...(isEconomyAnalysis
                ? { backgroundColor: "rgba(0, 0, 0, 0.1)" }
                : {}),
            }}
            onClick={() => toggleSettingsParam("showChurn")}
            variant={settings.showChurn ? "contained" : "outlined"}
          >
            <ChurnIcon
              className={s.icon}
              style={{
                fill: settings.showChurn ? enabledColor : disabledColor,
              }}
            />
          </Button>
        </Tooltip>

        <Tooltip title="Highlight correlation" disableInteractive>
          <Button
            disabled={isEconomyAnalysis}
            sx={{
              ...(isEconomyAnalysis
                ? { backgroundColor: "rgba(0, 0, 0, 0.1)" }
                : {}),
            }}
            onClick={() => toggleSettingsParam("showCorrelation")}
            variant={settings.showCorrelation ? "contained" : "outlined"}
          >
            <CorrelationIcon
              style={{
                rotate: "90deg",
                fill: settings.showCorrelation ? enabledColor : disabledColor,
              }}
            />
          </Button>
        </Tooltip>

        <Tooltip title="Open Churn Analysis" disableInteractive>
          <Button
            disabled={isEconomyAnalysis}
            sx={{
              borderBottomRightRadius: 0,
              borderTopRightRadius: "1rem",
              ...(isEconomyAnalysis
                ? { backgroundColor: "rgba(0, 0, 0, 0.1)" }
                : {}),
            }}
            onClick={() => onShowChurn()}
            variant="outlined"
          >
            <AnalyticsIcon
              style={{
                fill: disabledColor,
              }}
            />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Lower menu */}
      <ButtonGroup
        variant="outlined"
        sx={{
          maxHeight: "35px",
          width: "fit-content",
          backgroundColor: "var(--bg-color3)",
          borderBottomRightRadius: "5rem",
          borderTopRightRadius: "5rem",
        }}
      >
        <DatePicker
          customSx={{
            pt: 0,
            pb: 0,
            borderRadius: 0,
          }}
          onStateChange={(newDate) =>
            setSettings({ ...settings, date: newDate })
          }
        />

        <SegmentsPicker
          segments={segments}
          currentSegments={settings.segments}
          onStateChange={(s) => {
            setSettings({ ...settings, segments: s });
          }}
        />

        <Tooltip title="Toggle view mode" disableInteractive>
          <Button
            disabled={isEconomyAnalysis}
            onClick={() => cycleViewmode()}
            sx={{
              minWidth: "200px",
              width: "100px",
              textTransform: "none",
              ...(isEconomyAnalysis
                ? { backgroundColor: "rgba(0, 0, 0, 0.1)" }
                : {}),
            }}
          >
            <Typography
              variant="subtitle1"
              color={"text.secondary"}
              sx={{
                fontSize: "14px",
                fontWeight: "regular",
                textAlign: "center",
              }}
            >
              {settings.viewmode === "all"
                ? "All"
                : settings.viewmode === "conversion"
                  ? "Conversion"
                  : "Dropoff"}
            </Typography>
          </Button>
        </Tooltip>

        <Tooltip title="Set max. steps to expand" disableInteractive>
          <Button
            onClick={(e) => {
              editMaxStep(e);
            }}
            key="setstepsdepth"
            sx={{
              minWidth: "200px",
              width: "100px",
              textTransform: "none",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Typography
              variant="subtitle1"
              color={"text.secondary"}
              sx={{
                fontSize: "14px",
                fontWeight: "regular",
                textAlign: "start",
                whiteSpace: "nowrap",
              }}
            >
              Steps:
            </Typography>

            {editingMaxSteps ? (
              <TextField
                spellCheck={false}
                inputRef={inputRef_MaxSteps}
                sx={{
                  width: 80,
                  height: "100%",
                  "& input": {
                    fontSize: "14px",
                    textAlign: "center",
                  },
                }}
                onFocus={(event) => {
                  event.target.select();
                }}
                value={stepsInput}
                onChange={(e) => setStepsInput(e.target.value)}
                onBlur={(e) => changeMaxStep(e, true)}
                onKeyDown={(e) => changeMaxStep(e)}
                variant="standard"
              />
            ) : (
              <Typography
                variant="subtitle1"
                color={"text.secondary"}
                sx={{
                  fontSize: "14px",
                  width: 80,
                  fontWeight: "regular",
                  textAlign: "middle",
                  whiteSpace: "nowrap",
                }}
              >
                {settings.maxStep}
              </Typography>
            )}
          </Button>
        </Tooltip>

        <Tooltip
          title="Set min. players share for event to be shown"
          disableInteractive
        >
          <Button
            onClick={(e) => {
              editMinPlayers(e);
            }}
            key="setminplayersshare"
            sx={{
              minWidth: "200px",
              width: "100px",
              textTransform: "none",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Typography
              variant="subtitle1"
              color={"text.secondary"}
              sx={{
                fontSize: "14px",
                fontWeight: "regular",
                textAlign: "start",
                whiteSpace: "nowrap",
              }}
            >
              Min:
            </Typography>

            {editingMinPlayers ? (
              <TextField
                spellCheck={false}
                inputRef={inputRef_MinPlayersShare}
                sx={{
                  width: 80,
                  height: "100%",
                  "& input": {
                    fontSize: "14px",
                    textAlign: "center",
                  },
                }}
                onFocus={(event) => {
                  event.target.select();
                }}
                value={minPlayersInput}
                onChange={(e) => setMinPlayersInput(e.target.value)}
                onBlur={(e) => changeMinPlayers(e, true)}
                onKeyDown={(e) => changeMinPlayers(e)}
                variant="standard"
              />
            ) : (
              <Typography
                variant="subtitle1"
                color={"text.secondary"}
                sx={{
                  fontSize: "14px",
                  width: 80,
                  fontWeight: "regular",
                  textAlign: "middle",
                  whiteSpace: "nowrap",
                }}
              >
                {settings.minPlayers}%
              </Typography>
            )}
          </Button>
        </Tooltip>

        <FormControl size="small" sx={{ width: 140, minHeight: 35 }}>
          {settings.hiddenEvents.length === 0 ? (
            <InputLabel id="events" sx={{ fontSize: 12 }}>
              {settings.hiddenEvents.length} hidden events
            </InputLabel>
          ) : (
            <InputLabel id="events" sx={{ fontSize: 0 }}></InputLabel>
          )}
          <Select
            size="small"
            disabled={isEconomyAnalysis}
            sx={{
              borderRadius: "2px",
              height: 35,
              fontSize: 12,
              legend: {
                display: "none",
              },
              fieldset: {
                top: 0,
              },
              ...(isEconomyAnalysis
                ? { backgroundColor: "rgba(0, 0, 0, 0.1)" }
                : {}),
            }}
            multiple
            value={settings.hiddenEvents}
            onChange={(e) => handleChange_hiddenEvents(e)}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 0.5 }}>
                {settings.hiddenEvents.length} hidden events
              </Box>
            )}
          >
            {baseEvents.length !== 0 &&
              baseEvents.map((event) => {
                if (event.name) {
                  return (
                    <MenuItem key={event.eventID} value={event.id}>
                      {event.name}
                      {settings.hiddenEvents.some((e) => e === event.id) && (
                        <VisibilityOffIcon sx={{ ml: 2 }} />
                      )}
                    </MenuItem>
                  );
                }
              })}
          </Select>
        </FormControl>

        <Tooltip
          title="Set max. session length in seconds (0 = no limit)"
          disableInteractive
        >
          <Button
            onClick={(e) => {
              editMaxSessionLength(e);
            }}
            disabled={isEconomyAnalysis}
            sx={{
              borderBottomRightRadius: 0,
              borderTopRightRadius: "1rem",
              minWidth: "120px",
              width: "120px",
              textTransform: "none",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              ...(isEconomyAnalysis
                ? { backgroundColor: "rgba(0, 0, 0, 0.1)" }
                : {}),
            }}
          >
            <HourglassEmptySharpIcon sx={{ fill: disabledColor }} />

            {editingMaxSessionLength ? (
              <TextField
                spellCheck={false}
                inputRef={inputRef_MaxSessionLength}
                sx={{
                  width: 300,
                  height: "100%",
                  "& input": {
                    fontSize: "14px",
                    textAlign: "center",
                  },
                }}
                onFocus={(event) => {
                  event.target.select();
                }}
                value={sessionLengthInput}
                onChange={(e) => setSessionLengthInput(e.target.value)}
                onBlur={(e) => changeMaxSessionLength(e, true)}
                onKeyDown={(e) => changeMaxSessionLength(e)}
                variant="standard"
              />
            ) : (
              <Typography
                variant="subtitle1"
                color={"text.secondary"}
                sx={{
                  fontSize: "14px",
                  width: 80,
                  fontWeight: "regular",
                  textAlign: "middle",
                  whiteSpace: "nowrap",
                }}
              >
                {settings.maxSessionLength}
              </Typography>
            )}
          </Button>
        </Tooltip>
      </ButtonGroup>
    </div>
  );
};

export default BehTreePanel;
