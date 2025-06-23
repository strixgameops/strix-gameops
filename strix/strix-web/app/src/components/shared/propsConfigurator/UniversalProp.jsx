import React, { useEffect, useState, useRef, useCallback } from "react";
import s from "./universalProp.module.css";

import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import ListSubheader from "@mui/material/ListSubheader";

// For file input
import { styled } from "@mui/material/styles";
import { Button, Box } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Tooltip from "@mui/material/Tooltip";
import FileValueInput from "./FileValueInput";
//
import IconButton from "@mui/material/IconButton";
import RemoveSharpIcon from "@mui/icons-material/RemoveSharp";
import ReplayCircleFilledSharpIcon from "@mui/icons-material/ReplayCircleFilledSharp";
import { useGame, useBranch } from "@strix/gameContext";

import useApi from "@strix/api";
import { useAlert } from "@strix/alertsContext";

const UniversalProp = ({
  nodeContent,
  balanceModelFunctions,

  // To display the value
  valueObj,
  currentSegment,

  // Actions with value
  onValueChangeID,
  onValueChangeValue,
  onValueChangeType,
  onValueDelete,
  onValueReset,

  // For maps. Children are the maps children
  children,
  isMapChild,
  isLastMapChild,

  // From widgets
  showBytes,
  compareSegment,

  // For inherited configs
  currentConfigIsInherited,
  disableIDChanging,
  disableFieldRemoval,
  isBeingABTestedInChildrenNodes,
}) => {
  // console.log('Value obj', valueObj.sid, valueObj)
  // console.log('Children', children)

  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { triggerAlert } = useAlert();

  const {
    updateLocalization,
    removeLocalizationItem,
    getLocalizationItems,
    changeLocalizationItemKey,
    gameModelManageFunctionLinkedConfigValue,
  } = useApi();
  const [valueID, setValueID] = React.useState("");
  const [valueValue, setValueValue] = React.useState("");
  const [valueType, setValueType] = React.useState("");

  // Inherited configs
  const [isValueChanged, setIsValueChanged] = React.useState(false);

  // For file inputs

  const [valueFileName, setValueFileName] = React.useState("");

  useEffect(() => {
    setValueID(valueObj.valueID);
    setValueType(valueObj.type);
    setValueValue(getSegmentedValue(currentSegment));
    if (
      getSegmentedValueFileName(currentSegment) &&
      getSegmentedValueFileName(currentSegment) !== ""
    ) {
      setValueFileName(getSegmentedValueFileName(currentSegment));
    }

    // If we're editing inherited config, we need to check if value was changed
    if (currentConfigIsInherited) {
      if (valueObj.type !== "map") {
        let currentValuePiece = valueObj.segments.find(
          (segment) => segment.segmentID == currentSegment
        );
        if (currentValuePiece !== undefined) {
          // Last check if .changed field is present and we can use it
          if (currentValuePiece.changed) {
            setIsValueChanged(currentValuePiece.changed);
          } else {
            // If the field isn't present, set "false" as default
            setIsValueChanged(false);
          }
        }
      }
    }
  }, [valueObj]);

  function makeLocalizedID() {
    return valueObj.sid + "|" + nodeContent.nodeID;
  }

  function formatIDInput(input) {
    const formatted = trimStr(input.replace(/\s/g, ""), 30);
    return formatted;
  }
  function trimStr(str, maxLength) {
    if (str === undefined || str === "") return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  }

  function handleChangeID(value) {
    let formattedValue = formatIDInput(value);

    if (valueObj.type === "localized text") {
      changeLocalizationItemKey({
        gameID: game.gameID,
        branch,
        type: "entities",
        sid: makeLocalizedID(),
        newKey: formattedValue,
      });
    }
    onValueChangeID(valueObj.sid, formattedValue);
    setValueID(valueObj.valueID);
  }
  async function handleChangeValue(value, valueFileName) {
    onValueChangeValue(valueObj.sid, value, valueFileName);
    setValueValue(value);

    if (currentConfigIsInherited) {
      setIsValueChanged(true);
    }

    if (valueObj.type.endsWith("(derived)")) {
      await setDerivedValueLink({ overrideNewFunctionID: value });
    }
  }

  async function handleChangeType(value) {
    if (value !== "map") {
      // if map, skip because maps dont have values
      if (
        (valueObj.type.endsWith("(derived)") && value.endsWith("(derived)")) ===
        false
      ) {
        // if derived, and changed to also derived, skip because thats not a big deal and validation clashes should be dealed with in Modeling
        handleChangeValue("", "");
      }
    }
    if (value === "localized text") {
      createNewLocalization();
    } else if (valueObj.type === "localized text") {
      removeLocalizationItem({
        gameID: game.gameID,
        branch,
        type: "entities",
        sid: makeLocalizedID(),
      });
    }
    if (valueObj.type.endsWith("(derived)") && !value.endsWith("(derived)")) {
      // If we change the type FROM derived to NON-derived, remove the derived
      await removeDerivedValueLink();
    }
    if (valueObj.type.endsWith("(derived)") && value.endsWith("(derived)")) {
      // If we change the type FROM derived to ALSO derived, set the new type
      await setDerivedValueLink({
        overrideNewType: value,
        // overrideNewFunctionID: "", // because the value cleared on every change of prop type. Naturally it is already handled but since there are 2 such calls in a short time, lets not hope it won't conflict
      });
    }

    onValueChangeType(valueObj.sid, value);
    setValueType(value);
  }
  function handleValueReset() {
    onValueReset(valueObj.sid);
    setIsValueChanged(false);
  }

  async function handleValueDelete() {
    let check = true;
    if (valueObj.values) {
      valueObj.values.map((val) => {
        if (val.segments.some((s) => s.segmentID.startsWith("abtest_"))) {
          check = false;
        }
      });
    } else {
      if (valueObj.segments.some((s) => s.segmentID.startsWith("abtest_"))) {
        check = false;
      }
    }
    if (!check || isBeingABTestedInChildrenNodes) {
      triggerAlert(
        "Cannot delete this field because it is used in an AB test.",
        "error"
      );
      return;
    }
    if (valueObj.type === "localized text") {
      await removeLocalizationItem({
        gameID: game.gameID,
        branch,
        type: "entities",
        sid: makeLocalizedID(),
      });
    }
    if (valueObj.type.endsWith("(derived)")) {
      await removeDerivedValueLink();
    }

    onValueDelete(valueObj.sid);
  }

  function handleNumberInput(e) {
    const value = e.target.value;
    const validateNumber = new RegExp("^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$");

    // Only validate if value is not empty
    if (value !== "") {
      if (validateNumber.test(value)) {
        handleChangeValue(value);
      }
    } else {
      handleChangeValue(value);
    }
  }

  async function setDerivedValueLink({
    overrideNewType = undefined,
    overrideNewID = undefined,
    overrideNewFunctionID = undefined,
  }) {
    // When we select which function to get value from
    const resp = await gameModelManageFunctionLinkedConfigValue({
      gameID: game.gameID,
      branch,
      valueID: valueObj.sid,
      actionType: "set",
      changes: {
        valueSID: valueObj.sid,
        valueID: overrideNewID ? overrideNewID : valueObj.valueID,
        valueType: overrideNewType ? overrideNewType : valueObj.type,
        nodeID: nodeContent.nodeID,
        linkedFunctionID: overrideNewFunctionID
          ? overrideNewFunctionID
          : getSegmentedValue(currentSegment),
      },
    });
  }
  async function removeDerivedValueLink() {
    // When we select another value type or remove the value
    const resp = await gameModelManageFunctionLinkedConfigValue({
      gameID: game.gameID,
      branch,
      valueSID: valueObj.sid,
      actionType: "remove",
    });
  }

  async function createNewLocalization() {
    const resp = await updateLocalization({
      gameID: game.gameID,
      branch,
      type: "entities",
      translationObjects: [
        {
          sid: makeLocalizedID(),
          key: valueObj.valueID,
          translations: {
            en: "",
          },
        },
      ],
    });
  }
  const [localizedText, setLocalizedText] = useState("");

  const fileTypesImage = [".png", ".jpg"];
  const fileTypesVideo = [".mov", ".mp4", ".avi", ".webm"];
  const fileTypesSound = [".mp3", ".ogg", ".wav"];
  const fileTypesAny = [".*"];
  const [currentFileTypes, setCurrentFileTypes] = useState([]);
  useEffect(() => {
    if (valueType === "image") {
      setCurrentFileTypes(fileTypesImage);
    } else if (valueType === "video") {
      setCurrentFileTypes(fileTypesVideo);
    } else if (valueType === "sound") {
      setCurrentFileTypes(fileTypesSound);
    } else {
      setCurrentFileTypes(fileTypesAny);
    }

    if (valueObj.type === "localized text") {
      getLocalizedText();
    }
    async function getLocalizedText() {
      async function fetch() {
        const resp = await getLocalizationItems({
          gameID: game.gameID,
          branch,
          type: "entities",
          sids: [`${valueObj.sid}|${nodeContent.nodeID}`],
        });
        if (resp.success) {
          let val;
          try {
            val = resp.localizations[0].translations[0].value;
          } catch (error) {
            val = "Text";
          }
          if (val) {
            return val;
          } else {
            return "Text";
          }
        } else {
          return "Text";
        }
      }
      const value = await fetch();
      setLocalizedText(value);
    }
  }, [valueType]);

  let existingTypes = [
    "string",
    "boolean",
    "number",
    "string (derived)",
    "boolean (derived)",
    "number (derived)",
    "localized text",
  ];
  // This statement below is made to prevent map children from having "map" type.
  // When we are OK with nesting, we can remove this statement & just add "map" to existingTypes
  if (!isMapChild) {
    existingTypes.push("map");
  }
  // Pushing files after other types so they are always at the end
  existingTypes.push("image", "video", "sound", "any file");

  function makeModelFunctionsOptions() {
    let uniqueCategories = new Set();
    balanceModelFunctions.forEach((func) =>
      uniqueCategories.add(func.respectiveCategory)
    );

    let result = [];
    if (
      Array.from(uniqueCategories) &&
      Array.from(uniqueCategories).length > 0
    ) {
      Array.from(uniqueCategories).forEach((category) => {
        result.push(
          <ListSubheader key={category} sx={{ fontWeight: 800 }}>
            {category.toUpperCase()}
          </ListSubheader>
        );
        balanceModelFunctions
          .filter((func) => func.respectiveCategory === category)
          .forEach((func) => {
            result.push(
              <MenuItem value={func.functionID}>{func.name}</MenuItem>
            );
          });
      });
    }
    return result;
  }

  function getInputByType(isCompareInput) {
    switch (valueObj.type) {
      case "string (derived)":
      case "boolean (derived)":
      case "number (derived)":
        return (
          <FormControl fullWidth size="small">
            <InputLabel>
              {!compareSegment
                ? "Value"
                : isCompareInput
                  ? "Default value"
                  : "New value"}
            </InputLabel>
            <Select
              value={getSegmentedValue(currentSegment)}
              onChange={(e) => handleChangeValue(e.target.value)}
              label={
                !compareSegment
                  ? "Value"
                  : isCompareInput
                    ? "Default value"
                    : "New value"
              }
              disabled={isCompareInput || currentConfigIsInherited}
            >
              {makeModelFunctionsOptions()}
            </Select>
          </FormControl>
        );
      case "string":
        return (
          <Tooltip
            title={
              isCompareInput
                ? getSegmentedValue(compareSegment)
                : getSegmentedValue(currentSegment)
            }
            placement="right"
          >
            <FormControl fullWidth>
              <TextField
                disabled={isCompareInput}
                spellCheck={false}
                value={
                  isCompareInput
                    ? getSegmentedValue(compareSegment)
                    : getSegmentedValue(currentSegment)
                }
                onChange={(e) => handleChangeValue(e.target.value)}
                label={
                  !compareSegment
                    ? "Value"
                    : isCompareInput
                      ? "Default value"
                      : "New value"
                }
                // placeholder={getSegmentedValue('everyone')}
                size="small"
                InputProps={
                  showBytes && {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="subtitle1" color={"text.grey"}>
                          {getBytes(valueValue)}
                        </Typography>
                      </InputAdornment>
                    ),
                  }
                }
              />
            </FormControl>
          </Tooltip>
        );
      case "localized text":
        return (
          <Tooltip title={localizedText} placement="right">
            <FormControl fullWidth>
              <TextField
                spellCheck={false}
                disabled
                multiline
                value={trimStr(localizedText, 11)}
                onChange={(e) => handleChangeValue(e.target.value)}
                label="Text"
                // placeholder={getSegmentedValue('everyone')}
                size="small"
                InputProps={
                  showBytes && {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="subtitle1" color={"text.grey"}>
                          {getBytes(valueValue)}
                        </Typography>
                      </InputAdornment>
                    ),
                  }
                }
              />
            </FormControl>
          </Tooltip>
        );
      case "boolean":
        return (
          <Tooltip
            title={
              isCompareInput
                ? getSegmentedValue(compareSegment).toString()
                : getSegmentedValue(currentSegment).toString()
            }
            placement="right"
          >
            <FormControl fullWidth size="small">
              <InputLabel>
                {!compareSegment
                  ? "Value"
                  : isCompareInput
                    ? "Default value"
                    : "New value"}
              </InputLabel>
              <Select
                value={
                  isCompareInput
                    ? getSegmentedValue(compareSegment)
                    : getSegmentedValue(currentSegment)
                }
                onChange={(e) => handleChangeValue(e.target.value)}
                label={
                  !compareSegment
                    ? "Value"
                    : isCompareInput
                      ? "Default value"
                      : "New value"
                }
                sx={
                  showBytes && {
                    "& .MuiInputBase-root": { paddingRight: "0px" },
                  }
                }
                disabled={isCompareInput}
                endAdornment={
                  showBytes && (
                    <InputAdornment position="start">
                      <Typography
                        variant="subtitle1"
                        sx={{ paddingRight: "5px" }}
                        color={"text.grey"}
                      >
                        {getBytes(valueValue)}
                      </Typography>
                    </InputAdornment>
                  )
                }
              >
                <MenuItem value={true}>true</MenuItem>
                <MenuItem value={false}>false</MenuItem>
              </Select>
            </FormControl>
          </Tooltip>
        );
      case "number":
        return (
          <Tooltip
            title={
              isCompareInput
                ? getSegmentedValue(compareSegment)
                : getSegmentedValue(currentSegment)
            }
            placement="right"
          >
            <FormControl fullWidth>
              <TextField
                spellCheck={false}
                disabled={isCompareInput}
                value={
                  isCompareInput
                    ? getSegmentedValue(compareSegment)
                    : getSegmentedValue(currentSegment)
                }
                onChange={(e) => handleNumberInput(e)}
                label={
                  !compareSegment
                    ? "Value"
                    : isCompareInput
                      ? "Default value"
                      : "New value"
                }
                // placeholder={getSegmentedValue('everyone')}
                size="small"
                InputProps={
                  showBytes && {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="subtitle1" color={"text.grey"}>
                          {getBytes(valueValue)}
                        </Typography>
                      </InputAdornment>
                    ),
                  }
                }
              />
            </FormControl>
          </Tooltip>
        );
      case "image":
        return (
          <FileValueInput
            disabled={isCompareInput}
            currentFileTypes={currentFileTypes}
            valueValue={
              isCompareInput ? getSegmentedValue(compareSegment) : valueValue
            }
            valueFileName={valueFileName}
            valueType={valueType}
            handleChangeValue={handleChangeValue}
            setValueFileName={setValueFileName}
          />
        );
      case "video":
        return (
          <FileValueInput
            disabled={isCompareInput}
            currentFileTypes={currentFileTypes}
            valueValue={
              isCompareInput ? getSegmentedValue(compareSegment) : valueValue
            }
            valueFileName={valueFileName}
            valueType={valueType}
            handleChangeValue={handleChangeValue}
            setValueFileName={setValueFileName}
          />
        );
      case "sound":
        return (
          <FileValueInput
            disabled={isCompareInput}
            currentFileTypes={currentFileTypes}
            valueValue={
              isCompareInput ? getSegmentedValue(compareSegment) : valueValue
            }
            valueFileName={valueFileName}
            valueType={valueType}
            handleChangeValue={handleChangeValue}
            setValueFileName={setValueFileName}
          />
        );
      case "any file":
        return (
          <FileValueInput
            disabled={isCompareInput}
            currentFileTypes={currentFileTypes}
            valueValue={
              isCompareInput ? getSegmentedValue(compareSegment) : valueValue
            }
            valueFileName={valueFileName}
            valueType={valueType}
            handleChangeValue={handleChangeValue}
            setValueFileName={setValueFileName}
          />
        );
    }
  }

  function getSegmentedValue(segmentToFind) {
    if (segmentToFind === undefined) return "";
    if (valueObj.segments === undefined) return "";

    const foundSegmentValue = valueObj.segments.find(
      (segment) => segment.segmentID === segmentToFind
    );
    // If we found nothins, it means there are no segmented value, which means we should show "everyone" segment
    if (foundSegmentValue === undefined) {
      return valueObj.segments.find(
        (segment) => segment.segmentID === "everyone"
      ).value;
    } else {
      return foundSegmentValue.value;
    }
  }
  function getSegmentedValueFileName(segmentToFind) {
    if (segmentToFind === undefined) return "";
    if (valueObj.segments === undefined) return "";

    const foundSegmentValue = valueObj.segments.find(
      (segment) => segment.segmentID === segmentToFind
    );
    // If we found nothing, it means there are no segmented value, which means we should show "everyone" segment
    if (foundSegmentValue === undefined) {
      return valueObj.segments.find(
        (segment) => segment.segmentID === "everyone"
      ).valueFileName;
    } else {
      return foundSegmentValue.valueFileName;
    }
  }

  function getBytes(str) {
    return new Blob([str]).size;
  }

  return (
    <div className={valueObj.type === "map" && s.universalPropMapContainer}>
      <div className={`${s.universalProp} ${isMapChild && s.childProp}`}>
        <div
          className={`${isMapChild && s.verticalLine} ${isLastMapChild && s.lastVerticalLine}`}
        ></div>
        <div className={`${isMapChild && s.horizontalLine}`}></div>

        {/* ID */}
        <div className={s.propID}>
          <TextField
            spellCheck={false}
            disabled={currentConfigIsInherited || disableIDChanging}
            value={valueID}
            onChange={(e) => handleChangeID(e.target.value)}
            label={valueObj.type === "localized text" ? "Key" : "ID"}
            size="small"
            InputProps={
              showBytes && {
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="subtitle1" color={"text.grey"}>
                      {getBytes(valueID)}
                    </Typography>
                  </InputAdornment>
                ),
              }
            }
          />
        </div>

        {/* Equal sign */}
        <Typography
          variant={"button"}
          color={"text.grey"}
          sx={{
            pl: "5px",
            fontSize: "18px",
            fontWeight: "regular",
            textAlign: "center",
            justifyContent: "center",
          }}
        >
          =
        </Typography>

        {/* Type */}
        <div className={s.propType}>
          <FormControl
            fullWidth
            disabled={currentConfigIsInherited || disableIDChanging}
          >
            <InputLabel>Type</InputLabel>
            <Select
              size="small"
              value={valueObj.type}
              label="Type"
              onChange={(e) => handleChangeType(e.target.value)}
            >
              {existingTypes.map((type, index) => (
                <MenuItem key={index} value={type}>
                  {type === "map" ? "array" : type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* Value */}
        {valueObj.type !== "map" && (
          <div className={s.propValue}>{getInputByType()}</div>
        )}
        {/* Compare Value */}
        {valueObj.type !== "map" && compareSegment !== "" && (
          <div className={s.propCompareValue}>{getInputByType(true)}</div>
        )}

        <div className={s.propDelete}>
          {currentConfigIsInherited ? (
            <Tooltip title="Revert to default" placement="top">
              <IconButton
                disabled={!isValueChanged}
                sx={{ borderRadius: "2rem", padding: "0px" }}
                onClick={() => handleValueReset()}
              >
                <ReplayCircleFilledSharpIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Remove field" placement="top">
              <IconButton
                disabled={disableFieldRemoval}
                sx={{ borderRadius: "2rem", padding: "0px" }}
                onClick={() => handleValueDelete(valueObj.sid)}
              >
                <RemoveSharpIcon sx={{ fontSize: 20 }} htmlColor={"#6E758E"} />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Map values */}
      <div className={s.propMapValues}>{children}</div>
    </div>
  );
};

export default UniversalProp;
