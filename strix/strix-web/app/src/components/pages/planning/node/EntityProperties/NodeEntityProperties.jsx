import React from "react";
import { useState, useEffect } from "react";
import s from "./css/entityProperties.module.css";
import { useGame } from "@strix/gameContext";
import { useBranch } from "@strix/gameContext";
import EntityCustomProperty from "./EntityCustomProperty.jsx";
import useApi from "@strix/api";

import { useLocation, useParams } from "react-router-dom";

// Inputs
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import InputAdornment from "@mui/material/InputAdornment";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Input from "@mui/material/Input";
import FormHelperText from "@mui/material/FormHelperText";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

// Save icon
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import ErrorIcon from "@mui/icons-material/Error";
import { red } from "@mui/material/colors";
import SaveIcon from "@mui/icons-material/Save";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

const NodeEntityProperties = ({ onAutoSave, nodeContent }) => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { checkEntityIDExists, updateNode } = useApi();

  const [showEntityIdError, setShowEntityIdError] = useState(false);
  const [showRealValueError, setShowRealValueError] = useState(false);

  const [checkedInAppPurchase, setCheckedInAppPurchase] = useState(true);

  const [showPropertyIDExistsError, setShowPropertyIDExistsError] =
    useState(false);
  const [duplicatePropertyID, setDuplicatePropertyID] = useState("");

  const [entityID, setEntityID] = useState("");
  const [entityIDisValid, setEntityIDisValid] = useState(false);
  const [realValueInput, setRealValueInput] = useState(0.1);

  const entityProperties = nodeContent.entityProperties || {};
  const [customProperties, setCustomProperties] = useState(
    entityProperties.customProperties || []
  );

  const [savingInProcess, setSavingInProgress] = useState(false);

  const [canSave, setCanSave] = useState(true);

  // Autosave
  async function triggerAutoSave() {
    let fieldToUpdate = "entityProperties";
    let newField = nodeContent.entityProperties;

    // Check if custom properties have unique ID or empty
    const checkDuplicates = () => {
      const propertyIDSet = new Set();
      for (const item of customProperties) {
        if (propertyIDSet.has(item.propertyID) || item.propertyID === "") {
          setDuplicatePropertyID(item.propertyID);
          setShowPropertyIDExistsError(true);
          return false;
        }
        propertyIDSet.add(item.propertyID);
      }
      setDuplicatePropertyID("");
      setShowPropertyIDExistsError(false);
      return true;
    };
    const check = checkDuplicates();
    if (check === false) return;

    setSavingInProgress(true);
    await onAutoSave(fieldToUpdate, newField);
    setSavingInProgress(false);
  }
  // Custom properties
  function onCustomPropertyChange(index, newProperty) {
    if (newProperty !== undefined) {
      setCustomProperties((prevProperties) => {
        const newProperties = [...prevProperties];
        newProperties[index] = newProperty;
        nodeContent.entityProperties.customProperties = newProperties;
        return newProperties;
      });
    }
    triggerAutoSave();
  }
  // Checkbox on this page is buggy af for some reason (value isnt changing on click so easily) so dont touch this code unless you know what youre doing
  const handleChange = (event) => {
    // More precisely, dont touch the lines below
    setCheckedInAppPurchase(!checkedInAppPurchase);
    nodeContent.entityProperties.isInAppPurchase = !checkedInAppPurchase;

    // You can touch this one below
    triggerAutoSave();
  };
  // ID text input
  const handleInputChangeID = (event) => {
    let currentinputID = event.target.value;
    if (currentinputID && currentinputID !== "") {
    } else if (currentinputID === "") {
      setShowEntityIdError(false);
      setEntityIDisValid(false);
    }
    nodeContent.entityProperties.entityID = currentinputID;
    triggerAutoSave();
    setEntityID(currentinputID);
  };
  // Real-world value input
  const handleInputChangeRealValue = (event) => {
    let currentInputValue = event.target.value;

    //   ,
    let sanitizedValue = currentInputValue.replace(/[^0-9.]/g, "");

    //
    let dotCount = sanitizedValue.split(".").length - 1;

    //   ,
    if (dotCount > 1) {
      sanitizedValue =
        sanitizedValue.split(".").slice(0, 2).join(".") +
        sanitizedValue.split(".").slice(2).join("");
    }

    //      ,
    if (
      sanitizedValue.startsWith("0") &&
      sanitizedValue.length > 1 &&
      sanitizedValue[1] !== "."
    ) {
      sanitizedValue = "0." + sanitizedValue.slice(1);
    }

    //
    dotCount = sanitizedValue.split(".").length - 1;

    setRealValueInput(sanitizedValue);

    // ,
    const containsNonZero = sanitizedValue
      .split("")
      .some((char) => char !== "0" && char !== ".");

    if (
      dotCount > 1 ||
      sanitizedValue === "0" ||
      sanitizedValue === "" ||
      sanitizedValue === "0." ||
      !containsNonZero
    ) {
      setShowRealValueError(true);
    } else {
      setShowRealValueError(false);
      nodeContent.entityProperties.realValue = sanitizedValue * 100;
      triggerAutoSave();
    }
  };

  // When adding new property to the list
  function addNewProperty() {
    let properties = nodeContent.entityProperties.customProperties;
    const newProperties = [
      ...properties,
      { propertyID: "", valueType: "string", value: "" },
    ];
    setCustomProperties([
      ...customProperties,
      { propertyID: "", valueType: "string", value: "" },
    ]);
  }
  const removeCustomProperty = (propertyIDToRemove) => {
    const updatedData = customProperties.filter(
      (item) => item.propertyID !== propertyIDToRemove
    );
    setCustomProperties(updatedData);
  };

  // Grab all errors we can get and decide if entity is valid for saving
  useEffect(() => {
    if (
      entityIDisValid &&
      !showPropertyIDExistsError &&
      !showRealValueError &&
      !showEntityIdError
    ) {
      setCanSave(true);
    } else {
      setCanSave(false);
    }
  }, [
    entityIDisValid,
    showPropertyIDExistsError,
    showRealValueError,
    showEntityIdError,
  ]);

  // Saving data on any change
  useEffect(() => {
    nodeContent.entityProperties.customProperties = customProperties;
    triggerAutoSave();
  }, [customProperties]);

  // Checking if entered ID is valid
  useEffect(() => {
    try {
      const response = checkEntityIDExists({
        gameID: game.gameID,
        branch: branch,
        entityID: entityID,
      });
      setShowEntityIdError(response.exists);
      setEntityIDisValid(!response.exists);
    } catch (error) {}
  }, [entityID]);

  // Loading data from nodeContent
  useEffect(() => {
    setEntityID(nodeContent.entityProperties.entityID);
    setCheckedInAppPurchase(nodeContent.entityProperties.isInAppPurchase);
    setRealValueInput(nodeContent.entityProperties.realValue / 100);

    const properties = nodeContent.entityProperties.customProperties;
    setCustomProperties(properties);
  }, [nodeContent]);

  return (
    <div className={s.mainContainer}>
      <h1>Entity properties</h1>

      <div className={s.saveContainer}>
        {savingInProcess ? (
          <CircularProgress size={20} color="success" />
        ) : canSave ? (
          <Tooltip
            title={<Typography fontSize={15}>Entity is saved</Typography>}
          >
            <SaveIcon color="success" />
          </Tooltip>
        ) : (
          <Tooltip
            title={
              <Typography fontSize={15}>
                Entity cannot be saved while any error persists
              </Typography>
            }
          >
            <ErrorIcon sx={{ color: red[400] }} />
          </Tooltip>
        )}
      </div>

      <div className={s.inputId}>
        <TextField
          spellCheck={false}
          label="ID"
          variant="standard"
          onChange={handleInputChangeID}
          value={entityID}
          error={showEntityIdError}
          helperText={showEntityIdError ? `ID is already taken` : " "}
        />
      </div>
      <div
        className={
          entityIDisValid
            ? s.inputContainer
            : s.inputContainer + s.disabledState
        }
      >
        <div className={s.inputInappCheck}>
          <p>Is In-App Purchase?</p>
          <Checkbox
            checked={checkedInAppPurchase}
            onClick={(e) => handleChange(e)}
          />
        </div>

        <div
          className={
            checkedInAppPurchase
              ? s.realValueContainer
              : `${s.realValueContainer} ${s.disabledState}`
          }
        >
          <FormControl
            error={showRealValueError}
            fullWidth
            sx={{ m: 1 }}
            variant="standard"
          >
            <Input
              spellCheck={false}
              startAdornment={
                <InputAdornment position="start">$</InputAdornment>
              }
              id="realValueAmountInput"
              label="Value"
              onChange={handleInputChangeRealValue}
              value={realValueInput}
            />
            <FormHelperText>
              {showRealValueError ? "Value must be defined" : " "}
            </FormHelperText>
          </FormControl>
        </div>

        <div className={s.customPropertiesContainer}>
          <div className={s.header}>Custom properties</div>

          <Box
            sx={{
              padding: 2,
              border: "1px solid white",
            }}
          >
            <div className={s.customPropertyItem}>
              {customProperties &&
              customProperties.length > 0 &&
              customProperties !== undefined ? (
                customProperties.map((property, index) => (
                  <EntityCustomProperty
                    key={index}
                    ID={property.propertyID}
                    isDuplicateError={
                      duplicatePropertyID === property.propertyID &&
                      showPropertyIDExistsError
                        ? true
                        : false
                    }
                    value={property.value}
                    valueType={property.valueType}
                    onAnyChange={(newProperty) =>
                      onCustomPropertyChange(index, newProperty)
                    }
                    onRemove={() => removeCustomProperty(property.propertyID)}
                  />
                ))
              ) : (
                <div></div>
              )}
              <Button
                size="small"
                sx={{ m: 1, marginBottom: 0 }}
                onClick={addNewProperty}
                variant="outlined"
              >
                Add property
              </Button>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
};

export default NodeEntityProperties;
