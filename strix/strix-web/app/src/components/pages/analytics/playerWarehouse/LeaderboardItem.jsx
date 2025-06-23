import React, { useEffect, useState } from "react";

import s from "./css/playerWarehouse.module.css";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";
import CheckSharpIcon from "@mui/icons-material/CheckSharp";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useAlert } from "@strix/alertsContext";
import { Helmet } from "react-helmet";
import titles from "titles";
import { Button } from "@mui/material";
import Input from "@mui/material/Input";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import shortid from "shortid";
import DatePicker from "shared/datePicker/DatePickerWidget.jsx";

import MoreVertSharpIcon from "@mui/icons-material/MoreVertSharp";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Popover from "@mui/material/Popover";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Backdrop from "@mui/material/Backdrop";

import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import useApi from "@strix/api";
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";

dayjs.extend(utc);

function LeaderboardItem({
  gameID,
  branch,
  lb,
  allBoards,
  onLbChange,
  onLbRemove,
  onLbClone,
  allTemplates,
}) {
  const { getLeaderboardTop } = useApi();

  const [leaderboardState, setLeaderboardState] = useState(lb);
  const [additionalElements, setAdditionalElements] = useState(
    lb.additionalElementIDs.map((e) => ({
      key: shortid.generate(),
      elementID: e,
    }))
  );
  const [errorDuplicateID, setErrorDuplicateID] = useState(false);
  const [inputNameFocused, setInputNameFocused] = useState(false);
  const inputNameRef = React.useRef();
  // Name input
  useEffect(() => {
    if (inputNameFocused) {
      inputNameRef.current.focus();
    }
  }, [inputNameFocused]);
  function unfocusInputName(e, blur) {
    if ((e.keyCode !== 13) & !blur) return;
    setInputNameFocused(false);
    if (inputNameRef) {
      inputNameRef.current.blur();
    }
  }
  function onDeletePressed() {
    onLbRemove(lb.id);
  }

  function trimStr(str, maxLength) {
    if (str === undefined || str === "") return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}` : str;
  }

  function onLbIDChange(newName) {
    const newValue = trimStr(newName.replace(/\s/g, ""), 30);
    if (
      allBoards.filter(
        (b) => b.codename === newValue && b.id !== leaderboardState.id
      ).length > 0
    ) {
      setErrorDuplicateID(true);
    } else {
      setErrorDuplicateID(false);
    }
    setLeaderboardState({ ...leaderboardState, codename: newValue });
  }
  function onLbNameChange(newName) {
    setLeaderboardState({ ...leaderboardState, name: newName });
  }
  function onLbCommentChange(newComment) {
    setLeaderboardState({ ...leaderboardState, comment: newComment });
  }

  const initialLbStateWasRun = React.useRef(false);
  useEffect(() => {
    console.log("leaderboardState", leaderboardState);

    if (initialLbStateWasRun.current === false) {
      initialLbStateWasRun.current = true;
    } else {
      if (
        !errorDuplicateID &&
        leaderboardState.codename &&
        leaderboardState.codename !== "" &&
        leaderboardState.timeframes.every(
          (t) => !isNaN(parseInt(t.relativeUnitCount))
        ) &&
        !isNaN(parseInt(leaderboardState.topLength)) &&
        leaderboardState.additionalElementIDs.every((e) => Boolean(e))
      ) {
        onLbChange(leaderboardState);
      }
    }
  }, [leaderboardState]);

  function addTimeframe() {
    const newTimeframe = {
      key: shortid.generate(),
      type: "relative", // if "relative", we count using calendar days, if "absolute", we count from the given start
      relativeMode: "day", // can be: day, hour, month, week
      relativeUnitCount: 1, // if mode is "day", that means leaderboard resets every day.
    };
    setLeaderboardState({
      ...leaderboardState,
      timeframes: [...leaderboardState.timeframes, newTimeframe],
    });
  }

  function cycleTimeframeRelativeMode(key) {
    let index = leaderboardState.timeframes.findIndex((t) => t.key === key);
    let current = leaderboardState.timeframes[index].relativeMode;
    switch (current) {
      case "day":
        current = "hour";
        break;
      case "hour":
        current = "month";
        break;
      case "month":
        current = "week";
        break;
      case "week":
        current = "day";
        break;
      default:
        current = "day";
        break;
    }
    let changedTimeframes = [...leaderboardState.timeframes];
    changedTimeframes[index].relativeMode = current;
    setLeaderboardState({
      ...leaderboardState,
      timeframes: changedTimeframes,
    });
  }
  function removeTimeframe(key) {
    let index = leaderboardState.timeframes.findIndex((t) => t.key === key);
    const changedTimeframes = [...leaderboardState.timeframes];
    changedTimeframes.splice(index, 1);
    setLeaderboardState({
      ...leaderboardState,
      timeframes: changedTimeframes,
    });
  }
  function removeAdditionalElement(elementID) {
    let index = additionalElements.findIndex((t) => t.elementID === elementID);
    const changedElements = [...additionalElements];
    changedElements.splice(index, 1);
    setAdditionalElements([...changedElements]);
    setLeaderboardState({
      ...leaderboardState,
      additionalElementIDs: changedElements.map((e) => e.elementID),
    });
  }

  function formatInteger(value) {
    // Remove all non-numeric symbols
    let sanitizedValue = value.replace(/[^0-9]/g, "");

    // Remove leading zeros
    sanitizedValue = sanitizedValue.replace(/^/, "");

    return sanitizedValue;
  }
  function changeUnitCount(key, newCount) {
    let index = leaderboardState.timeframes.findIndex((t) => t.key === key);
    let changedTimeframes = [...leaderboardState.timeframes];
    changedTimeframes[index].relativeUnitCount = formatInteger(newCount);
    setLeaderboardState({
      ...leaderboardState,
      timeframes: changedTimeframes,
    });
  }

  function changeTopLength(newLength) {
    setLeaderboardState({
      ...leaderboardState,
      topLength: clamp(formatInteger(newLength), 0, 300),
    });
  }

  function setStartDate(newDate) {
    setLeaderboardState({
      ...leaderboardState,
      startDate: newDate,
    });
  }
  function setTargetElement(newElement) {
    setLeaderboardState({
      ...leaderboardState,
      aggregateElementID: newElement,
    });
  }
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "85%",
    height: 600,
    bgcolor: "background.paper",
    border: "1px solid #625FF440",
    boxShadow: 24,
    borderRadius: "2rem",
    p: 4,
  };
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const settingsOpened = Boolean(settingsAnchorEl);
  const handleClickSettings = (e) => {
    setSettingsAnchorEl(e.currentTarget);
  };
  const handleCloseSettings = () => {
    setSettingsAnchorEl(null);
  };

  function addAdditionalElement() {
    const newElement = {
      key: shortid.generate(),
      elementID: "",
    };
    setAdditionalElements([...additionalElements, newElement]);
  }
  function setAdditionalElementID(key, id) {
    let index = additionalElements.findIndex((t) => t.key === key);
    let changedElementIDs = [...additionalElements];
    changedElementIDs[index].elementID = id;

    setAdditionalElements([...changedElementIDs]);
    setLeaderboardState({
      ...leaderboardState,
      additionalElementIDs: changedElementIDs.map((e) => e.elementID),
    });
  }

  const [openedTimeframeTopKey, setOpenedTimeframeTopKey] = useState("");
  const [isLoadingTop, setIsLoadingTop] = useState(false);
  const [topData, setTopData] = useState(undefined);
  function viewTop(key) {
    setOpenedTimeframeTopKey(key);
  }
  async function fetchTimeframeTop(key) {
    setIsLoadingTop(true);
    const resp = await getLeaderboardTop({
      gameID: gameID,
      branch: branch,
      timeframeKey: key,
    });
    if (resp.success) {
      const data = Object.keys(resp.message).map((d) => {
        return {
          clientID: d,
          targetValue: resp.message[d].targetValue,
          additionalValues: resp.message[d].additionalValues,
        };
      });
      setTopData(data);
    }
    setIsLoadingTop(false);
  }
  useEffect(() => {
    fetchTimeframeTop(openedTimeframeTopKey);
  }, [openedTimeframeTopKey]);

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getTemplateName(elementID) {
    return (
      allTemplates.find((t) => t.templateID === elementID)?.templateName ||
      elementID
    );
  }

  function getTopColumns(top) {
    const uniqueElements = new Set();
    top.forEach((t) => {
      uniqueElements.add(t.targetValue.elementID);
      t.additionalValues.forEach((a) => uniqueElements.add(a.elementID));
    });
    return Array.from(uniqueElements)
      .filter(Boolean)
      .map((e) => ({ elementID: e, name: getTemplateName(e) }));
  }
  return (
    <div className={s.lbBody}>
      <Modal
        open={openedTimeframeTopKey !== ""}
        onClose={() => {
          setOpenedTimeframeTopKey("");
        }}
      >
        <Box sx={style}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Leaderboard viewer
          </Typography>

          <div className={s.topData}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client ID</TableCell>
                    {topData &&
                      topData.length > 0 &&
                      getTopColumns(topData).map((col, i) => (
                        <TableCell key={i} align="right">
                          {col.name}{" "}
                          {lb.aggregateElementID === col.elementID
                            ? `(score element)`
                            : ""}
                        </TableCell>
                      ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topData &&
                    topData.map((row) => (
                      <TableRow
                        key={row.clientID}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell component="th" scope="row">
                          {row.clientID}
                        </TableCell>
                        <TableCell align="right">
                          {row.targetValue.elementValue}
                        </TableCell>
                        {row.additionalValues.map((v, i) => (
                          <TableCell key={row.clientID + i} align="right">
                            {v.elementValue}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          {isLoadingTop && (
            <Backdrop sx={{ color: "#fff", zIndex: 2 }} open={isLoadingTop}>
              <CircularProgress color="inherit" />
            </Backdrop>
          )}
        </Box>
      </Modal>

      <div className={s.lbOptions}>
        <div className={s.lbOptionsUpper}>
          <IconButton sx={{ p: 0 }} onClick={(e) => handleClickSettings(e)}>
            <MoreVertSharpIcon sx={{ fontSize: 32 }} />
          </IconButton>
          <Input
            spellCheck={false}
            inputRef={inputNameRef}
            value={leaderboardState.name}
            onKeyDown={(e) => unfocusInputName(e)}
            onBlur={(e) => unfocusInputName(e, true)}
            onFocus={() => setInputNameFocused(true)}
            onSubmit={(e) => onLbNameChange(e.target.value)}
            onChange={(e) => onLbNameChange(e.target.value)}
            sx={{
              width: "40%",
              backgroundColor: inputNameFocused
                ? "rgba(0,0,0,0.1)"
                : "rgba(0,0,0,0.0)",
              "& .MuiInputBase-input": {
                textAlign: "start",
                fontSize: "16px",
                width: "fit-content",
              },
              "&.MuiInputBase-root::before": {
                borderBottom: "none",
              },
              "&.MuiInputBase-root:hover::before": {
                borderBottom: "1px solid #6E758E",
              },
              ml: 3,
              mr: 5,
            }}
          />
          <Tooltip
            open={errorDuplicateID}
            placement="bottom"
            disableInteractive
            title={`Event ID must be unique`}
          >
            <TextField
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography
                      sx={{ fontSize: 12 }}
                      variant="body1"
                      color={"text.secondary"}
                    >
                      ID
                    </Typography>
                  </InputAdornment>
                ),
              }}
              error={
                !leaderboardState.codename || leaderboardState.codename === ""
              }
              sx={{
                "& input": {
                  fontSize: 14,
                },
                "& .MuiInputBase-root::after": {
                  borderBottom: errorDuplicateID
                    ? "2px solid red"
                    : "2px solid #6E758E",
                },
                "& .MuiInputBase-root::before": {
                  borderBottom: errorDuplicateID
                    ? "2px solid red"
                    : "2px solid #6E758E",
                },
                width: "100%",
                maxWidth: "200px",
                mr: 5,
              }}
              size="small"
              variant="standard"
              value={leaderboardState.codename}
              onChange={(e) => onLbIDChange(e.target.value)}
            />
          </Tooltip>
          {/* <div className={s.removeLb}>
            <Tooltip title="Remove leaderboard">
              <Button
                onClick={onDeletePressed}
                onMouseLeave={() => setPendingDelete(false)}
                sx={{
                  ml: "auto",
                  p: 0,
                  minWidth: "40px",
                  width: "40px",
                  height: "40px",
                  mr: 2,

                  "&": pendingDelete
                    ? { bgcolor: "#b03333", color: "white" }
                    : {},
                  ":hover": pendingDelete
                    ? { bgcolor: "#cf4040", color: "white" }
                    : { bgcolor: "#b03333", color: "white" },
                }}
              >
                {pendingDelete ? (
                  <CheckSharpIcon htmlColor="#e7e7e7" sx={{ fontSize: 24 }} />
                ) : (
                  <DeleteSharpIcon htmlColor="#e7e7e7" sx={{ fontSize: 24 }} />
                )}
              </Button>
            </Tooltip>
          </div> */}
        </div>
        <div className={s.lbOptionsBottom}>
          <div className={s.lbTimeframesBody}>
            <Typography color={"text.secondary"} fontSize={"small"}>
              Timeframes ({leaderboardState.timeframes?.length})
            </Typography>
            <div className={s.lbTimeframesList}>
              {leaderboardState.timeframes &&
                leaderboardState.timeframes.map((t, i) => (
                  <div className={s.tfItem} key={t.key}>
                    <Typography sx={{ fontSize: 12 }}>Unit:</Typography>
                    <Button
                      variant="contained"
                      onClick={() => cycleTimeframeRelativeMode(t.key)}
                      sx={{
                        fontSize: 12,
                        minWidth: "64px",
                        height: "70%",
                        // textTransform: "none",
                      }}
                    >
                      {t.relativeMode}
                    </Button>

                    <Typography sx={{ fontSize: 12 }}>Count:</Typography>
                    <TextField
                      sx={{
                        "& input": {
                          fontSize: 14,
                        },
                        width: "100%",
                        maxWidth: "200px",
                        mr: 5,
                      }}
                      error={isNaN(parseInt(t.relativeUnitCount))}
                      size="small"
                      variant="standard"
                      value={t.relativeUnitCount}
                      onChange={(e) => changeUnitCount(t.key, e.target.value)}
                    />

                    <Tooltip placement="right" title="View top">
                      <Button
                        key={t.key}
                        sx={{ minWidth: "30px", ml: "auto" }}
                        onClick={() => viewTop(t.key)}
                      >
                        <VisibilityIcon />
                      </Button>
                    </Tooltip>

                    <Tooltip placement="right" title="Remove timeframe">
                      <Button
                        key={t.key}
                        sx={{ minWidth: "30px", ml: "auto" }}
                        onClick={() => removeTimeframe(t.key)}
                      >
                        <CloseIcon />
                      </Button>
                    </Tooltip>
                  </div>
                ))}
              <Button
                onClick={() => addTimeframe()}
                disabled={leaderboardState.timeframes?.length >= 5}
                sx={{ fontSize: 12 }}
              >
                Add timeframe ({leaderboardState.timeframes?.length}/5)
              </Button>
            </div>
          </div>
          <div className={s.lbMainOptions}>
            <div className={s.lbMainOptionItem}>
              <Typography color={"text.secondary"} fontSize={"small"}>
                Start date
              </Typography>
              <DatePicker
                filterStateOverride={[dayjs.utc(leaderboardState.startDate).toISOString()]}
                onStateChange={(newDates) => {
                  setStartDate(newDates);
                }}
                isSingleDate
              />
            </div>
            <div className={s.lbMainOptionItem}>
              <Typography color={"text.secondary"} fontSize={"small"}>
                Target element
              </Typography>
              <Select
                value={leaderboardState.aggregateElementID}
                onChange={(e) => setTargetElement(e.target.value)}
                autoWidth
                size="small"
              >
                {allTemplates &&
                  allTemplates
                    .filter(
                      (t) =>
                        t.templateType === "float" ||
                        t.templateType === "integer"
                    )
                    .map((template) => (
                      <MenuItem
                        key={template.templateID}
                        className="dropdown-option"
                        value={template.templateID}
                      >
                        {template.templateName}
                      </MenuItem>
                    ))}
              </Select>
            </div>
            <div className={s.lbMainOptionItem}>
              <Typography color={"text.secondary"} fontSize={"small"}>
                Top length
              </Typography>
              <TextField
                sx={{
                  "& input": {
                    fontSize: 14,
                  },
                  width: "100%",
                  maxWidth: "200px",
                  mr: 5,
                }}
                error={isNaN(parseInt(leaderboardState.topLength))}
                size="small"
                variant="standard"
                value={leaderboardState.topLength}
                onChange={(e) => changeTopLength(e.target.value)}
              />
            </div>
          </div>
          <div className={s.lbMainOptionItem}>
            <Typography color={"text.secondary"} fontSize={"small"}>
              Additional elements
            </Typography>
            <div className={s.lbTimeframesList}>
              {additionalElements &&
                additionalElements.map((t, i) => (
                  <div className={s.tfItem} key={t.key}>
                    <FormControl error={t.elementID == false}>
                      <Select
                        value={t.elementID}
                        onChange={(e) =>
                          setAdditionalElementID(t.key, e.target.value)
                        }
                        autoWidth
                        size="small"
                        sx={{ height: "25px" }}
                      >
                        {allTemplates &&
                          allTemplates.map((template) => (
                            <MenuItem
                              disabled={
                                leaderboardState.additionalElementIDs.includes(
                                  template.templateID
                                ) ||
                                leaderboardState.aggregateElementID ==
                                  template.templateID
                              }
                              key={template.templateID}
                              className="dropdown-option"
                              value={template.templateID}
                            >
                              {template.templateName}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>

                    <Tooltip placement="right" title="Remove element">
                      <Button
                        key={t.key}
                        sx={{ minWidth: "30px", ml: "auto" }}
                        onClick={() => removeAdditionalElement(t.elementID)}
                      >
                        <CloseIcon />
                      </Button>
                    </Tooltip>
                  </div>
                ))}
              <Button
                onClick={() => addAdditionalElement()}
                disabled={additionalElements.length >= 5}
                sx={{ fontSize: 12 }}
              >
                Add elements ({additionalElements.length}/5)
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className={s.rightSide}>
        <textarea
          className={s.comment}
          type="text"
          value={leaderboardState.comment}
          onChange={(e) => onLbCommentChange(e.target.value)}
        />
      </div>

      <Popover
        open={settingsOpened}
        anchorEl={settingsAnchorEl}
        onClose={handleCloseSettings}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              backgroundImage: "none",
              backgroundColor: "var(--bg-color3)",
              p: 2,
              overflow: "hidden",
            },
          },
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Button sx={{ textTransform: "none" }}>
            <Typography
              onClick={() => onLbClone(leaderboardState)}
              variant="subtitle1"
              color={"text.primary"}
            >
              Clone
            </Typography>
          </Button>
          <Button
            onClick={() => onDeletePressed()}
            sx={{ textTransform: "none" }}
          >
            <Typography variant="subtitle1" color={"text.primary"}>
              Remove
            </Typography>
          </Button>
        </div>
      </Popover>
    </div>
  );
}

export default LeaderboardItem;
