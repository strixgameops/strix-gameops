import React, { useEffect, useState, useRef } from "react";
import s from "./propsBuilder.module.css";
import sp from "./universalProp.module.css";

import Typography from "@mui/material/Typography";

// Sidebar Headers
import TopicSharpIcon from "@mui/icons-material/TopicSharp";
import DriveFileMoveSharpIcon from "@mui/icons-material/DriveFileMoveSharp";

// For saving
import CircularProgress from "@mui/material/CircularProgress";
import ErrorIcon from "@mui/icons-material/Error";
import SaveIcon from "@mui/icons-material/Save";
import Tooltip from "@mui/material/Tooltip";
import { red } from "@mui/material/colors";

// Other things
import { useTheme } from "@mui/material/styles";
import ExpandLessSharpIcon from "@mui/icons-material/ExpandLessSharp";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import MoreVertSharpIcon from "@mui/icons-material/MoreVertSharp";
import Popover from "@mui/material/Popover";
import UniversalProp from "./UniversalProp.jsx";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import InheritedConfigCategoryArrow from "./assets/InheritedConfigCategoryArrow.svg?react";

// Raw json widget modal
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Zoom from "@mui/material/Zoom";
import Backdrop from "@mui/material/Backdrop";
import AutoSizer from "react-virtualized-auto-sizer";

// For renaming configs
import Input from "@mui/material/Input";

// Misc
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import IconButton from "@mui/material/IconButton";
import shortid from "shortid";
import { useBranch, useGame } from "@strix/gameContext";

import useApi from "@strix/api";

const PropsBuilder = ({
  nodeContent,
  // Configs
  mainConfigs,
  inheritedConfigs,
  // Default inherited configs when we need to reset to default
  defaultInheritedConfigs,

  // Actions with configs
  onMainConfigSaved,
  onInheritedConfigSaved,
  onConfigAdded,
  onConfigRemoved,
  saveInProgress,
  saveError = "",

  // Needed to know names of nodes we inherit configs from
  dataNodes,

  disableIDChanging,
  disableFieldRemoval,
  disableCreation,
  defaultCurrentSegment = "everyone",
  defaultCompareSegment = "",
}) => {
  const theme = useTheme();
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { getBalanceModel } = useApi();
  const [showSidebar, setShowSidebar] = React.useState(true);

  const [selectedConfig, setSelectedConfig] = React.useState({});
  const [currentConfigIsInherited, setCurrentConfigIsInherited] =
    React.useState(false);
  const [
    currentSelectedInheritedCategory,
    setCurrentSelectedInheritedCategory,
  ] = React.useState("");

  const [canSave, setCanSave] = React.useState(true);

  const [balanceModelFunctions, setBalanceModelFunctions] = useState([]);

  const [anchorEl, setAnchorEl] = React.useState(null);

  const [showBytes, setShowBytes] = React.useState(false);
  const [showDiffSegment, setShowDiffSegment] = React.useState(false);
  const [showRawJSON, setShowRawJSON] = React.useState(false);
  const [rawJSONBackdropOpen, setRawJSONBackdropOpen] = React.useState(false);

  const [currentSegment, setCurrentSegment] = React.useState(
    defaultCurrentSegment
  );
  const [compareSegment, setCompareSegment] = React.useState(
    defaultCompareSegment
  );
  const allSegments = ["everyone", "some users", "some other users"];

  useEffect(() => {
    async function fetchModelFunctions() {
      const resp = await getBalanceModel({
        gameID: game.gameID,
        branch: branch,
        specificTypes: ["functions"],
      });
      if (resp.success) {
        setBalanceModelFunctions(resp.result.functions);
      }
    }
    fetchModelFunctions();
  }, []);

  function addNewMainConfig() {
    onConfigAdded();
  }

  function addNewFieldToConfig() {
    let tempConfigValues = [...selectedConfig.values];

    let fieldName = `field${selectedConfig.values.length + 1}`;
    tempConfigValues.push({
      valueID: fieldName,
      sid: shortid.generate(),
      type: "string",
      segments: [
        {
          segmentID: "everyone",
          value: "value1",
          // changed: false
        },
      ],
    });

    onMainConfigSaved({ ...selectedConfig, values: tempConfigValues });
    setSelectedConfig({ ...selectedConfig, values: tempConfigValues });
  }

  // Value change handlers
  function findConfigValue(config, valueID, segmentID) {
    if (!config) return false;

    for (let value of config) {
      // If found value, update it
      if (value.sid === valueID) {
        if (
          value.type === "image" ||
          value.type === "video" ||
          value.type === "sound"
        ) {
          let segmentFound = false;
          for (let segment of value.segments) {
            if (segment.segmentID === segmentID) {
              segmentFound = true;
              return {
                found: true,
                value: segment.value,
                valueFileName: segment.valueFileName,
              };
            }
          }
          if (!segmentFound) {
            return {
              found: false,
              value: "",
              valueFileName: "",
            };
          }
        } else {
          let segmentFound = false;
          for (let segment of value.segments) {
            if (segment.segmentID === segmentID) {
              segmentFound = true;
              return { found: true, value: segment.value };
            }
          }
          if (!segmentFound) {
            return { found: false, value: "" };
          }
        }
      }

      // If map, go through its values and search for the right one
      if (value.type === "map" && Array.isArray(value.values)) {
        let result = findConfigValue(value.values, valueID, segmentID);
        if (result) return result; // Return early if result is found
      }
    }

    return false; // Return false if value is not found
  }
  function findAndUpdateValue(
    config,
    valueID,
    segmentID,
    newValue,
    changeType,
    valueFileName,
    subChangeType
  ) {
    if (!config) return;

    config.forEach((value) => {
      // If found value, update it
      if (value.sid === valueID) {
        switch (changeType) {
          case "value":
            if (
              value.type === "image" ||
              value.type === "video" ||
              value.type === "sound" ||
              value.type === "any file"
            ) {
              function setSegmentedValue() {
                let segmentFound = false;
                // For file-related values we also set a file name field
                value.segments.forEach((segment) => {
                  if (segment.segmentID === segmentID) {
                    segment.value = newValue;
                    segment.valueFileName = valueFileName;
                    if (currentConfigIsInherited) {
                      segment.changed = true;
                    } else {
                      segment.changed = false;
                    }
                    segmentFound = true;
                  }
                });
                if (!segmentFound) {
                  const newSegment = {
                    segmentID: segmentID,
                    value: newValue,
                    valueFileName: valueFileName,
                  };

                  if (currentConfigIsInherited) {
                    newSegment.changed = true;
                  } else {
                    newSegment.changed = false;
                  }

                  value.segments.push(newSegment);
                }
              }

              // When we switch types from "map" to other type, we need to set "segments" field.
              // This is because "segments" field is not always present in "map" type,
              // because it has "values" field instead of "segments" field.
              if (value.segments) {
                setSegmentedValue();
              } else {
                value.segments = [];
                delete value.values;
                setSegmentedValue();
              }
            } else {
              function setSegmentedValue() {
                // For non-file values. Only set the value
                let segmentFound = false;
                value.segments.forEach((segment) => {
                  if (segment.segmentID === segmentID) {
                    segment.value = newValue;
                    if (currentConfigIsInherited) {
                      // If the field was changed by a reset, we need to keep "changed" false
                      if (subChangeType == "reset") {
                        segment.changed = false;
                      } else {
                        segment.changed = true;
                      }
                    } else {
                      segment.changed = false;
                    }
                    segmentFound = true;
                  }
                });
                if (!segmentFound) {
                  const newSegment = {
                    segmentID: segmentID,
                    value: newValue,
                    valueFileName: valueFileName,
                  };

                  if (currentConfigIsInherited) {
                    // If the field was changed by a reset, we need to keep "changed" false
                    if (subChangeType == "reset") {
                      newSegment.changed = false;
                    } else {
                      newSegment.changed = true;
                    }
                  } else {
                    newSegment.changed = false;
                  }

                  value.segments.push(newSegment);
                }
              }

              // When we switch types from "map" to other type, we need to set "segments" field and remove "values".
              // This is because "segments" field is not always present in "map" type,
              // because it has "values" field instead of "segments" field.
              if (value.segments) {
                setSegmentedValue();
              } else {
                value.segments = [];
                delete value.values;
                setSegmentedValue();
              }
            }

            return;
          case "type":
            value.type = newValue;
            if (newValue === "map") {
              delete value.segments;
            }
            return;
          case "id":
            value.valueID = newValue;
            return;
          case "delete":
            config.splice(config.indexOf(value), 1);
            return;
          case "mapAdd":
            if (!value.values) {
              value.values = [];
            }

            value.values.push({
              valueID: value.valueID + value.values.length + 1,
              sid: shortid.generate(),
              type: "string",
              segments: [
                {
                  segmentID: "everyone",
                  value: "value1",
                },
              ],
            });
            return;
        }
      }

      // If map, go through it's values and search for the right one
      if (value.type === "map" && Array.isArray(value.values)) {
        findAndUpdateValue(
          value.values,
          valueID,
          segmentID,
          newValue,
          changeType,
          valueFileName,
          subChangeType
        );
      }
    });
  }
  //
  function onValueChangeID(valueID, newValue) {
    console.log(
      "Changing value",
      valueID,
      "to",
      newValue,
      "in segment",
      currentSegment
    );
    let tempConfig = { ...selectedConfig };
    findAndUpdateValue(
      tempConfig.values,
      valueID,
      currentSegment,
      newValue,
      "id"
    );
    setSelectedConfig(tempConfig);
    onMainConfigSaved(tempConfig);
    console.log("New config values", tempConfig);
  }
  function onValueChangeValue(valueID, newValue, valueFileName) {
    let tempConfig = { ...selectedConfig };
    findAndUpdateValue(
      tempConfig.values,
      valueID,
      currentSegment,
      newValue,
      "value",
      valueFileName
    );
    setSelectedConfig(tempConfig);
    if (currentConfigIsInherited) {
      onInheritedConfigSaved(tempConfig, currentSelectedInheritedCategory);
    } else {
      onMainConfigSaved(tempConfig);
    }
    console.log("New config values", tempConfig);
  }
  function onValueChangeType(valueID, newValue) {
    let tempConfig = { ...selectedConfig };
    findAndUpdateValue(
      tempConfig.values,
      valueID,
      currentSegment,
      newValue,
      "type"
    );
    setSelectedConfig(tempConfig);
    onMainConfigSaved(tempConfig);
    console.log("New config values", tempConfig);
  }
  function onValueDelete(valueID) {
    let tempConfig = { ...selectedConfig };
    findAndUpdateValue(
      tempConfig.values,
      valueID,
      currentSegment,
      " ",
      "delete"
    );
    setSelectedConfig(tempConfig);
    onMainConfigSaved(tempConfig);
    console.log("New config values", tempConfig);
  }
  function onValueReset(valueID) {
    let tempConfig = { ...selectedConfig };

    console.log("RESETTING VALUE, DEFAULT CONFIG", defaultInheritedConfigs);
    let defConfig = defaultInheritedConfigs
      .find((config) => config.nodeID === currentSelectedInheritedCategory)
      .configs.find((config) => config.sid === tempConfig.sid);

    let defaultValue = findConfigValue(
      defConfig.values,
      valueID,
      currentSegment
    );
    if (defaultValue === undefined || defaultValue === false) {
      defaultValue = {
        value: "",
        valueFileName: "",
      };
    }
    console.log(
      "RESET CONFIG DONE",
      tempConfig.values,
      valueID,
      currentSegment,
      defaultValue.value,
      "value",
      defaultValue.valueFileName,
      "reset"
    );
    findAndUpdateValue(
      tempConfig.values,
      valueID,
      currentSegment,
      defaultValue.value,
      "value",
      defaultValue.valueFileName,
      "reset"
    );
    onInheritedConfigSaved(tempConfig, currentSelectedInheritedCategory);

    // Avoid mutating the state and passing a new object to setState,
    // otherwise it will not trigger a re-render on UniversalProp
    let temp = JSON.stringify(tempConfig);
    setSelectedConfig(JSON.parse(temp));
    temp = "";
  }
  function addNewFieldToMap(valueID) {
    let tempConfig = { ...selectedConfig };
    findAndUpdateValue(
      tempConfig.values,
      valueID,
      currentSegment,
      " ",
      "mapAdd"
    );
    setSelectedConfig(tempConfig);
    onMainConfigSaved(tempConfig);
  }

  const currOpenedNodeID = useRef(nodeContent?.nodeID);
  useEffect(() => {
    if (!nodeContent) return;
    if (nodeContent.nodeID !== currOpenedNodeID.current) {
      currOpenedNodeID.current = nodeContent.nodeID;
      setSelectedConfig({});
    }
  }, [nodeContent]);

  //
  // Widgets
  //
  function showBytesInConfig() {
    setShowBytes(!showBytes);
  }
  function getBytesTotal() {
    return new Blob([JSON.stringify(selectedConfig)]).size;
  }
  let rawjsonloading = null;
  function toggleRawJSON() {
    if (showRawJSON || rawJSONBackdropOpen) {
      setRawJSONBackdropOpen(false);
      setShowRawJSON(false);
      if (rawjsonloading !== null) {
        clearTimeout(rawjsonloading);
        rawjsonloading = null;
      }
      return;
    }
    setRawJSONBackdropOpen(true);
    rawjsonloading = setTimeout(() => {
      setShowRawJSON(!showRawJSON);
      setRawJSONBackdropOpen(false);
    }, 1500);
  }

  function toggleDiffSegment() {
    if (showDiffSegment) {
      setCompareSegment("");
    } else {
      setCompareSegment(currentSegment);
    }
    setShowDiffSegment(!showDiffSegment);
  }

  function buildConfig(config, isMapChild, isLastMapChild) {
    let props = [];

    function checkIfFieldIsABTested(value) {
      let fieldIsBeingABTested = dataNodes.some((node) => {
        let isTested = false;
        let inheritedConf;
        if (node.entityBasic) {
          if (node.entityBasic.inheritedConfigs !== "") {
            inheritedConf = JSON.parse(node.entityBasic.inheritedConfigs);
          }
        } else {
          if (node.entityCategory.inheritedConfigs !== "") {
            inheritedConf = JSON.parse(node.entityCategory.inheritedConfigs);
          }
        }

        if (inheritedConf) {
          inheritedConf.map((n) => {
            if (nodeContent && n.nodeID === nodeContent.nodeID) {
              n.configs.map((c) => {
                traverseConf(c);
              });
            }
          });
        }

        function traverseConf(conf) {
          conf.values.map((val) => {
            if (val.values) {
              if (
                val.values.some(
                  (v) =>
                    v.valueID === value.valueID &&
                    v.segments.some((s) => s.segmentID.startsWith("abtest_"))
                )
              ) {
                isTested = true;
              }
            } else {
              if (val.valueID === value.valueID) {
                if (
                  val.segments &&
                  val.segments.some((s) => s.segmentID.startsWith("abtest_"))
                ) {
                  isTested = true;
                }
              }
            }
          });
        }

        return isTested;
      });
      return fieldIsBeingABTested;
    }
    // console.log('Building config:', config)

    function buildSingleProp(value, isMapChild, isLastMapChild) {
      // console.log('Building single prop:', value)
      props.push(
        <UniversalProp
          key={value.sid}
          valueObj={value}
          currentSegment={currentSegment}
          isMapChild={isMapChild}
          isLastMapChild={isLastMapChild}
          showBytes={showBytes}
          compareSegment={compareSegment}
          currentConfigIsInherited={currentConfigIsInherited}
          nodeContent={nodeContent}
          balanceModelFunctions={balanceModelFunctions}
          disableIDChanging={disableIDChanging}
          disableFieldRemoval={disableFieldRemoval}
          isBeingABTestedInChildrenNodes={checkIfFieldIsABTested(value)}
          onValueChangeValue={onValueChangeValue}
          onValueChangeType={onValueChangeType}
          onValueChangeID={onValueChangeID}
          onValueDelete={onValueDelete}
          onValueReset={onValueReset}
        />
      );
    }

    // Iterating through all values and building config
    if (config.values) {
      Object.entries(config).forEach(([key, value]) => {
        // If value is a map, iterate through it
        if (value.type === "map") {
          const tempProp = (
            <UniversalProp
              key={value.sid}
              valueObj={value}
              currentSegment={currentSegment}
              showBytes={showBytes}
              compareSegment={compareSegment}
              isMapChild={false}
              nodeContent={nodeContent}
              balanceModelFunctions={balanceModelFunctions}
              disableIDChanging={disableIDChanging}
              disableFieldRemoval={disableFieldRemoval}
              isBeingABTestedInChildrenNodes={checkIfFieldIsABTested(value)}
              onValueChangeValue={onValueChangeValue}
              onValueChangeType={onValueChangeType}
              onValueChangeID={onValueChangeID}
              onValueDelete={onValueDelete}
              onValueReset={onValueReset}
              currentConfigIsInherited={currentConfigIsInherited}
            >
              {value.values &&
                value.values.length > 0 &&
                value.values.map((nestedValue, index) => {
                  return buildConfig(
                    nestedValue,
                    true,
                    index === value.values.length - 1
                  );
                })}

              {/* We never want to show any "Add fields" buttons if we are editing inherited config */}
              {!currentConfigIsInherited && !disableCreation && (
                <div className={sp.addNewField}>
                  <div
                    className={`${value.values && value.values.length > 0 ? sp.addNewField_lastVerticalLine : sp.smallVerticalLine}`}
                  ></div>
                  <div className={sp.horizontalLine}></div>

                  <Button
                    size="small"
                    sx={{ textTransform: "none", height: "25px" }}
                    onClick={() => addNewFieldToMap(value.sid)}
                  >
                    + Add new field
                  </Button>
                </div>
              )}
            </UniversalProp>
          );
          props.push(tempProp);
        } else {
          buildSingleProp(value, isMapChild, isLastMapChild);
        }
      });
    } else if (config.sid) {
      buildSingleProp(config, isMapChild, isLastMapChild);
    }
    return props;
  }

  function deleteConfig(sid) {
    if (sid === selectedConfig.sid) {
      setSelectedConfig({});
    }
    onConfigRemoved(sid);
  }
  function renameConfig(newName) {
    let tempConfig = selectedConfig;
    tempConfig.id = newName;
    onMainConfigSaved(tempConfig);
    setSelectedConfig(tempConfig);
  }

  const BtnConfigMain = ({ config, isSelected }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);

    const [showSettings, setShowSettings] = React.useState(false);
    const [settingsHovered, setSettingsHovered] = React.useState(false);

    // Renaming config
    const [showNameInput, setShowNameInput] = React.useState(false);
    const [nameInputValue, setNameInputValue] = React.useState("");
    const inputRef = React.useRef();

    function startRenameConfig() {
      closeConfigSettings();
      setShowNameInput(true);
      setNameInputValue(config.id);
    }

    // Using useEffect to set focus on input when renaming config.
    // Using other methods will result in a bug with the input not being focused.
    useEffect(() => {
      if (showNameInput) {
        inputRef.current.focus();
      }
    }, [showNameInput]);

    function endRenameConfig(e, blur) {
      if (e.keyCode !== 13 && !blur) return;
      setShowNameInput(false);
      console.log("Renaming to", nameInputValue);
      renameConfig(nameInputValue);
    }

    function onConfigSelected() {
      if (!isSelected) {
        setSelectedConfig(config);
        setCurrentConfigIsInherited(false);
        setCurrentSelectedInheritedCategory("");
      }
    }

    // If config is not loaded, show loading spinner
    if (!config) {
      return (
        <div className={s.btnConfig}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, pt: 5 }}>
            <CircularProgress size={20} />
            <Typography
              variant={"subtitle1"}
              color={"text.grey"}
              sx={{
                fontSize: "14px",
                fontWeight: "regular",
                textAlign: "start",
              }}
            >
              Loading...
            </Typography>
          </div>
        </div>
      );
    }

    function openConfigSettings(e) {
      setAnchorEl(e.currentTarget);
    }
    function closeConfigSettings() {
      setAnchorEl(null);
    }
    const open = Boolean(anchorEl);

    function formatConfigNameInput(input) {
      const formatted = trimStr(input.replace(/\s/g, ""), 30);
      return formatted;
    }

    return (
      <Button
        fullWidth
        variant={isSelected ? "contained" : "outlined"}
        sx={{
          borderRadius: "1rem",
          // backgroundColor: isSelected ? "#3e4173" : "#22263f",
          // "&:hover": {
          //   backgroundColor: isSelected ? "#676cbf" : "#2A2C4D",
          // },
          // "&& .MuiTouchRipple-child": {
          //   backgroundColor: isSelected
          //     ? theme.palette.primary.dark
          //     : theme.palette.primary.light,
          // },
          justifyContent: "start",
        }}
        onClick={() => onConfigSelected()}
        onMouseEnter={() => setShowSettings(true)}
        onMouseLeave={() => setShowSettings(false)}
      >
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={closeConfigSettings}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "1rem",
            }}
          >
            <Button
              sx={{ textTransform: "none" }}
              onClick={() => startRenameConfig(config.sid)}
            >
              <Typography variant="subtitle1" color={"text.primary"}>
                Rename config
              </Typography>
            </Button>
            <Button
              sx={{ textTransform: "none" }}
              onClick={() => deleteConfig(config.sid)}
            >
              <Typography variant="subtitle1" color={"text.primary"}>
                Delete config
              </Typography>
            </Button>
          </div>
        </Popover>

        <div className={s.btnConfig}>
          {showSettings && isSelected ? (
            <div
              className={s.btnConfigSettings}
              onClick={openConfigSettings}
              onMouseEnter={() => setSettingsHovered(true)}
              onMouseLeave={() => setSettingsHovered(false)}
            >
              <MoreVertSharpIcon
                sx={{ fontSize: 23 }}
                // htmlColor={
                //   settingsHovered ? "#fff" : isSelected ? "#b8b8b8" : "#6E758E"
                // }
              />
            </div>
          ) : (
            <div className={s.btnConfigSettings} style={{ width: 0 }}></div>
          )}
          {showNameInput ? (
            <Input
              spellCheck={false}
              inputRef={inputRef}
              sx={{
                whiteSpace: "pre-wrap",
                textTransform: "none",
                fontSize: "14px",
                fontWeight: "regular",
                textAlign: "start",
                color: "#e7e7e7",
              }}
              value={nameInputValue}
              onChange={(e) =>
                setNameInputValue(formatConfigNameInput(e.target.value))
              }
              onKeyDown={(e) => endRenameConfig(e)}
              onBlur={(e) => endRenameConfig(e, true)}
            ></Input>
          ) : (
            <Typography
              variant={"subtitle1"}
              // color={isSelected ? "text.primary" : "text.secondary"}
              sx={{
                whiteSpace: "pre-wrap",
                textTransform: "none",
                fontSize: "14px",
                fontWeight: "regular",
                textAlign: "start",
              }}
            >
              {trimStr(config.id, 25)}
            </Typography>
          )}

          {isSelected ? (
            <div className={s.btnArrowIcon}>
              <ExpandLessSharpIcon
                sx={{ fontSize: 23, ml: "auto", transform: "rotate(90deg)" }}
                htmlColor={"#b8b8b8"}
              />
            </div>
          ) : (
            <div className={s.btnArrowIcon}></div>
          )}
        </div>
      </Button>
    );
  };
  const BtnConfigInherited = ({
    config,
    originalConfig,
    isSelected,
    nodeID,
  }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);

    const [showSettings, setShowSettings] = React.useState(false);
    const [settingsHovered, setSettingsHovered] = React.useState(false);

    function onConfigSelected() {
      if (!isSelected) {
        setSelectedConfig(config);
        setCurrentConfigIsInherited(true);
        setCurrentSelectedInheritedCategory(nodeID);
      }
    }

    function resetInheritedConfig() {
      onInheritedConfigSaved(originalConfig, nodeID);

      // Swap back and forth this config to force-refresh all props inside it
      setSelectedConfig("");
      setTimeout(() => {
        setSelectedConfig(originalConfig);
      }, 300);
    }

    // If config is not loaded, show loading spinner
    if (!config) {
      return (
        <div className={s.btnConfig}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, pt: 5 }}>
            <CircularProgress size={20} />
            <Typography
              variant={"subtitle1"}
              color={"text.grey"}
              sx={{
                fontSize: "14px",
                fontWeight: "regular",
                textAlign: "start",
              }}
            >
              Loading...
            </Typography>
          </div>
        </div>
      );
    }

    function openConfigSettings(e) {
      setAnchorEl(e.currentTarget);
    }
    function closeConfigSettings() {
      setAnchorEl(null);
    }
    const open = Boolean(anchorEl);

    return (
      <Button
        fullWidth
        variant={isSelected ? "contained" : "outlined"}
        sx={(theme) => ({
          // backgroundColor: isSelected ? "#3e4173" : "#22263f",
          // "&:hover": {
          //   backgroundColor: isSelected ? "#676cbf" : "#2A2C4D",
          // },

          // ...theme.applyStyles("light", {
          //   backgroundColor: isSelected ? "#6272db" : "#4e5bb0",
          //   "&:hover": {
          //     backgroundColor: isSelected ? "#676cbf" : "#2A2C4D",
          //   },
          // }),

          // "&& .MuiTouchRipple-child": {
          //   backgroundColor: isSelected
          //     ? theme.palette.primary.dark
          //     : theme.palette.primary.light,
          // },
          justifyContent: "start",
          borderRadius: "1rem",
        })}
        onClick={() => onConfigSelected()}
        onMouseEnter={() => setShowSettings(true)}
        onMouseLeave={() => setShowSettings(false)}
      >
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={closeConfigSettings}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Button
              sx={{ textTransform: "none" }}
              onClick={() => resetInheritedConfig()}
            >
              <Typography variant="subtitle1" color={"text.primary"}>
                Reset to defaults
              </Typography>
            </Button>
          </div>
        </Popover>

        <div className={s.btnConfig}>
          {showSettings && isSelected ? (
            <div
              className={s.btnConfigSettings}
              onClick={openConfigSettings}
              onMouseEnter={() => setSettingsHovered(true)}
              onMouseLeave={() => setSettingsHovered(false)}
            >
              <MoreVertSharpIcon
                sx={{ fontSize: 23 }}
                // htmlColor={
                //   settingsHovered ? "#fff" : isSelected ? "#b8b8b8" : "#6E758E"
                // }
              />
            </div>
          ) : (
            <div className={s.btnConfigSettings} style={{ width: 0 }}></div>
          )}

          <Typography
            variant={"subtitle1"}
            // color={isSelected ? "text.primary" : "text.grey"}
            sx={{
              whiteSpace: "pre-wrap",
              textTransform: "none",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "start",
            }}
          >
            {trimStr(config.id, 25)}
          </Typography>

          {isSelected ? (
            <div className={s.btnArrowIcon}>
              <ExpandLessSharpIcon
                sx={{ fontSize: 23, ml: "auto", transform: "rotate(90deg)" }}
                htmlColor={"#b8b8b8"}
              />
            </div>
          ) : (
            <div className={s.btnArrowIcon}></div>
          )}
        </div>
      </Button>
    );
  };

  // Trim string if it is too long
  function trimStr(str, maxLength) {
    if (str === undefined || str === "") return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}` : str;
  }

  function toggleSidebar() {
    setShowSidebar(!showSidebar);
  }

  function closeWorkspaceSettings() {
    setAnchorEl(null);
  }

  const openWorkspaceSettingsPopover = Boolean(anchorEl);

  const [feedbackCopyOpen, setFeedBackCopyOpen] = useState(false);

  return (
    <div className={s.builderBody}>
      <div className={`${s.sidebar} ${showSidebar ? "" : s.sidebarClosed}`}>
        {/* Main configs */}
        <div className={s.mainConfigs}>
          <div className={s.header}>
            <TopicSharpIcon htmlColor={"#6E758E"} />
            <Typography
              variant={"body1"}
              color={"text.secondary"}
              sx={{
                fontSize: "18px",
                fontWeight: "regular",
                textAlign: "start",
              }}
            >
              Remote Configs
            </Typography>
          </div>
          <div className={s.configs}>
            {mainConfigs.map((config, index) => (
              <BtnConfigMain
                key={config.sid}
                config={config}
                isSelected={selectedConfig.sid === config.sid}
              />
            ))}

            {!disableCreation && (
              <Button
                fullWidth
                variant="text"
                sx={{ textTransform: "none" }}
                onClick={() => addNewMainConfig()}
              >
                + Add new config
              </Button>
            )}
          </div>
        </div>
        {/* Inherited configs */}
        <div className={s.inheritedConfigs}>
          <div className={s.header}>
            <DriveFileMoveSharpIcon htmlColor={"#6E758E"} />
            <Typography
              variant={"body1"}
              color={"text.secondary"}
              sx={{
                fontSize: "18px",
                fontWeight: "regular",
                textAlign: "start",
              }}
            >
              Inherited Configs
            </Typography>
          </div>
          <div className={s.configs}>
            {inheritedConfigs &&
              inheritedConfigs.filter((config) => {
                if (config.configs === "") return false;
                if (config.configs.length === 0) return false;
                return true;
              }).length > 0 &&
              inheritedConfigs
                .filter((config) => {
                  if (config.configs === "") return false;
                  if (config.configs.length === 0) return false;
                  return true;
                })
                .map(
                  (category, index) =>
                    category.configs !== "" && (
                      <div
                        className={s.inheritedConfigsCategoryItem}
                        key={category.nodeID + nodeContent?.nodeID + index}
                      >
                        <div className={s.inheritedConfigsCategoryLabel}>
                          <Typography
                            key={nodeContent?.nodeID}
                            variant={"subtitle1"}
                            color={"text.secondary"}
                            sx={{
                              fontSize: "16px",
                              fontWeight: "regular",
                              textAlign: "start",
                            }}
                          >
                            {trimStr(
                              dataNodes.find(
                                (node) => node.nodeID === category.nodeID
                              ).name,
                              25
                            )}
                          </Typography>
                          <InheritedConfigCategoryArrow
                            className={s.inheritedConfigsCategoryArrow}
                          />
                        </div>

                        <div
                          className={s.inheritedConfigsItem}
                          key={
                            category.nodeID +
                            nodeContent?.nodeID +
                            index +
                            index
                          }
                        >
                          {category.configs.map((config, index) => (
                            <BtnConfigInherited
                              key={
                                category.nodeID + nodeContent?.nodeID + index
                              }
                              config={config}
                              originalConfig={defaultInheritedConfigs
                                .find(
                                  (config) => config.nodeID === category.nodeID
                                )
                                .configs.find(
                                  (config) => config.sid === config.sid
                                )}
                              nodeID={category.nodeID}
                              isSelected={selectedConfig.sid === config.sid}
                            />
                          ))}
                        </div>
                      </div>
                    )
                )}
            {/* Filter empty inherited configs */}
            {inheritedConfigs.filter((config) => {
              if (config.configs === "") return false;
              if (config.configs.length === 0) return false;
              return true;
            }).length === 0 && (
              <div className={s.noConfigs}>
                <Typography
                  variant={"body1"}
                  color={"text.grey"}
                  sx={{
                    fontSize: "14px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  No inherited configs
                </Typography>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`${s.workspace} ${showSidebar ? "" : s.workspaceEnlarged}`}
      >
        {selectedConfig.id ? (
          <div className={s.valueContainer}>
            {buildConfig(selectedConfig.values, false)}

            {/* We never want to show any "Add fields" buttons if we are editing inherited config */}
            {!currentConfigIsInherited && !disableCreation ? (
              selectedConfig.values.length === 0 ? (
                <div className={s.emptyConfigBillboard}>
                  <Typography color={"text.grey"} sx={{ fontSize: 24, mb: 3 }}>
                    Start creating fields in your config
                  </Typography>
                  <Button
                    size="small"
                    sx={{
                      textTransform: "none",
                      height: "25px",
                      width: "170px",
                      p: 3,
                    }}
                    variant="outlined"
                    onClick={() => addNewFieldToConfig()}
                  >
                    + Create field
                  </Button>
                </div>
              ) : (
                <Button
                  size="small"
                  sx={{
                    textTransform: "none",
                    height: "25px",
                    width: "170px",
                    p: 3,
                  }}
                  onClick={() => addNewFieldToConfig()}
                >
                  + Add new field
                </Button>
              )
            ) : (
              selectedConfig.values.length === 0 && (
                <div className={s.emptyConfigBillboard}>
                  <Typography color={"text.grey"} sx={{ fontSize: 24, mb: 3 }}>
                    No fields found
                  </Typography>
                </div>
              )
            )}
          </div>
        ) : (
          <div className={s.noConfigSelected}>
            <Typography
              variant={"body1"}
              color={"text.grey"}
              sx={{
                fontSize: "14px",
                fontWeight: "regular",
                textAlign: "center",
              }}
            >
              No config selected. <br></br>
              You can select or create one from the sidebar.
            </Typography>
          </div>
        )}

        {/* Below are widgets that are positioned on the workspace */}
        <div className={s.saveContainer}>
          {saveInProgress && saveError === "" ? (
            <CircularProgress size={20} color="success" />
          ) : saveError !== "" ? (
            <Tooltip
              title={
                <Typography
                  fontSize={15}
                >{`Errors while saving config: \n${saveError}`}</Typography>
              }
            >
              <ErrorIcon color="error" />
            </Tooltip>
          ) : (
            <Tooltip
              title={<Typography fontSize={15}>Config is saved</Typography>}
            >
              <SaveIcon color="success" />
            </Tooltip>
          )}
        </div>
        <div className={s.collapseContainer} onClick={toggleSidebar}>
          <ArrowBackIosNewIcon
            htmlColor="#fff"
            sx={{
              fontSize: 23,
              transform: !showSidebar ? "rotate(180deg)" : "",
            }}
          />
        </div>
        {/* View raw json here below */}
        <div className={s.workspaceSettings}>
          <IconButton
            sx={{
              p: "4px",
              fontSize: 3,
              // color: "#6E758E",
              borderRadius: 0,
            }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <MoreVertSharpIcon
              sx={{
                fontSize: 23,
                color: "#6E758E",
                "&:hover": {
                  cursor: "pointer",
                  // color: "#fff",
                },
              }}
            />
          </IconButton>

          <Popover
            open={openWorkspaceSettingsPopover}
            anchorEl={anchorEl}
            onClose={closeWorkspaceSettings}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "0.5rem",
              }}
            >
              {/* <Button sx={{textTransform: 'none'}} onClick={toggleDiffSegment}>
                <Typography variant="subtitle1" color={'text.primary'}>Compare segments</Typography>
                </Button> */}
              <Button
                sx={{ textTransform: "none" }}
                onClick={showBytesInConfig}
              >
                <Typography variant="subtitle1" color={"text.primary"}>
                  Show bytes
                </Typography>
              </Button>
              <Button sx={{ textTransform: "none" }} onClick={toggleRawJSON}>
                <Typography variant="subtitle1" color={"text.primary"}>
                  View raw JSON
                </Typography>
              </Button>
            </div>
          </Popover>

          <Backdrop
            sx={{ zIndex: (theme) => theme.zIndex.drawer + 5 }}
            open={rawJSONBackdropOpen}
            onClick={toggleRawJSON}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{ mb: 2, width: "500px" }}
                id="modal-modal-title"
                variant="h6"
                component="h2"
                color={"#e7e7e7"}
              >
                This might take a while if your JSON has uploaded files in it...
              </Typography>
              <CircularProgress color="primary" />
            </div>
          </Backdrop>

          <Modal
            open={showRawJSON}
            onClose={toggleRawJSON}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 600,
                bgcolor: "background.paper",
                border: "1px solid #25205e",
                boxShadow: 24,
                p: 4,
                borderRadius: "2rem",
              }}
            >
              <Typography
                sx={{ mb: 2 }}
                id="modal-modal-title"
                variant="h6"
                component="h2"
                color={"text.primary"}
              >
                Raw JSON - {selectedConfig.sid}
              </Typography>
              <div className={s.rawConfigBody}>
                <AutoSizer>
                  {({ height, width }) => {
                    return (
                      <pre style={{ height: height, width: width }}>
                        {JSON.stringify(selectedConfig, null, 2)}
                      </pre>
                    );
                  }}
                </AutoSizer>
              </div>
              <div className={s.copyButton}>
                <Button
                  sx={{ textTransform: "none" }}
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(selectedConfig, null, 2)
                    );
                    setFeedBackCopyOpen(true);
                    setTimeout(() => {
                      setFeedBackCopyOpen(false);
                    }, 1000);
                  }}
                >
                  <Tooltip
                    open={feedbackCopyOpen}
                    title="Copied!"
                    disableInteractive
                    TransitionComponent={Zoom}
                  >
                    <ContentCopyIcon sx={{ fontSize: 23 }} />
                  </Tooltip>
                </Button>
              </div>
            </Box>
          </Modal>
        </div>
        {/* <div className={`${s.segmentsWidget} ${showDiffSegment && s.segmentsWidgetComparing}`}>
                <FormControl sx={{ m: 1, minWidth: 120, maxWidth: 120 }} size="small">
                  <InputLabel sx={{fontSize: 12, pt: 0.6, zIndex: 2,}}>Segment</InputLabel>
                  <Select
                    value={currentSegment}
                    label="Segment"
                    onChange={(e) => setCurrentSegment(e.target.value)}
                    sx={{
                    maxHeight: '35px',
                    "& .MuiOutlinedInput-notchedOutline": { fontSize: "12px", zIndex: 2, },
                    fontSize: 12,
                    backgroundColor: '#151326',
                    '& .MuiOutlinedInput-root': {
                    },
                    zIndex: 1,
                    }}
                  >
                    {allSegments.map((segment, index) => (
                      <MenuItem key={index} value={segment}>{segment}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {showDiffSegment && [
                <div className={s.diffSegment}>
                    <Typography sx={{fontSize: 12, whiteSpace: 'nowrap', pt: 1.9}} variant="subtitle1" color={'text.grey'}>diff with</Typography>
                </div>,
                <FormControl sx={{ m: 1, minWidth: 120, maxWidth: 120 }} size="small">
                  <InputLabel sx={{fontSize: 12, pt: 0.6}}>Comparing segment</InputLabel>
                  <Select
                    value={compareSegment}
                    label="Comparing segment"
                    onChange={(e) => setCompareSegment(e.target.value)}
                    sx={{
                    maxHeight: '35px',
                    "& .MuiOutlinedInput-notchedOutline": { fontSize: "12px" },
                    fontSize: 12,
                    }}
                  >
                    {allSegments.map((segment, index) => (
                      <MenuItem key={index} value={segment}>{segment}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                ]}
            </div> */}
        <div className={s.totalBytesWidget}>
          {showBytes && (
            <Typography variant="subtitle1" color={"text.grey"}>
              Total bytes: {getBytesTotal()}
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropsBuilder;
