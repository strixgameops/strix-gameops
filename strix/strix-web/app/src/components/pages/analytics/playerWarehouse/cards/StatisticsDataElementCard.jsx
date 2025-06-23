import React, { useState, useEffect, useRef } from "react";
import s from "../css/dataElement.module.css";

// MUI
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import useApi from "@strix/api";
import Tooltip from "@mui/material/Tooltip";
import ScaleText from "react-scale-text";
import Typography from "@mui/material/Typography";

import { useLocation } from "react-router-dom";

import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";

import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";

import { useGame, useBranch } from "@strix/gameContext";
import { useAlert } from "@strix/alertsContext";

import shortid from "shortid";

const StatisticsDataElementCard = ({
  template,
  client,
  onRemove,
  onAskRefresh,
  onChangeElementValue,
}) => {
  const {
    removeWarehouseTemplate,
    updateStatisticsTemplate,
    forceSetStatisticsElement,
  } = useApi();

  const { game } = useGame();
  const { branch, environment } = useBranch();

  const { triggerAlert } = useAlert();

  const [anchorEl, setAnchorEl] = React.useState(null);

  const [prevElementValue, setPrevElementValue] = useState("");
  const [elementValue, setElementValue] = useState("");

  useEffect(() => {
    if (client !== undefined) {
      const foundElement = client.elements.statistics.find(
        (element) => element.elementID === template.templateID
      );
      setElementValue(foundElement ? foundElement.elementValue : "");
      setPrevElementValue(foundElement ? foundElement.elementValue : "");
    }
  }, [client]);

  async function changeElementForClient(clientID, elementID, newValue) {
    const resp = await forceSetStatisticsElement({
      gameID: game.gameID,
      branch: branch,
      clientID,
      elementID,
      value: newValue,
    });
    if (resp.success) {
      triggerAlert("Element updated successfully", "success");
      setPrevElementValue(elementValue);
    } else {
      triggerAlert(
        "Failed to update element. Please contact support!",
        "error"
      );
      setElementValue(prevElementValue);
    }
  }

  function handleElementValueChange(newValue) {
    setEditing_AnyChangeMade(true);
    setElementValue(newValue);
  }

  const onSettingsClick = (event) => {
    if (!client) {
      setAnchorEl(event.currentTarget);
    } else {
      setEditingClient(true);
    }
  };

  const handleCloseSettings = () => {
    setEditing_AnyChangeMade(false);
    setAnchorEl(null);
  };

  const handleCloseValueChanger = () => {
    setElementValue(prevElementValue);
    setEditing_AnyChangeMade(false);
    setEditingClient(false);
  };

  const openPopover = Boolean(anchorEl);

  const handleRemoveTemplate = async () => {
    const response = await removeWarehouseTemplate({
      gameID: game.gameID,
      branch: branch,
      templateID: template.templateID,
    });
    if (response.success) {
      onRemove();
    }
  };

  function handleEditTemplate() {
    setEditing(true);
    setEditing_AnyChangeMade(false);
  }

  const [editingClient, setEditingClient] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  const [editing_AnyChangeMade, setEditing_AnyChangeMade] =
    React.useState(false);
  const [editing_templateName, setEditing_templateName] = React.useState(
    template.templateName
  );
  const [editing_templateCodeName, setEditing_templateCodeName] =
    React.useState(template.templateCodeName);
  const [editing_templateDefaultValue, setEditing_templateDefaultValue] =
    React.useState(template.templateDefaultValue);
  const [editing_templateValueRangeMin, setEditing_templateValueRangeMin] =
    React.useState(template.templateValueRangeMin);
  const [editing_templateValueRangeMax, setEditing_templateValueRangeMax] =
    React.useState(template.templateValueRangeMax);

  function onTemplateNameChange(newName) {
    setEditing_templateName(newName);
    setEditing_AnyChangeMade(true);
  }
  function onTemplateCodeNameChange(newCodeName) {
    setEditing_templateCodeName(newCodeName);
    setEditing_AnyChangeMade(true);
  }
  function onTemplateDefaultValueChange(newDefaultValue) {
    let value = newDefaultValue;
    switch (template.templateType) {
      case "integer":
        value = handleIntegerInput(value);
        break;
      case "float":
        value = handleFloatInput(value);
        break;
      default:
        break;
    }
    setEditing_templateDefaultValue(value);
    setEditing_AnyChangeMade(true);
  }
  function onTemplateRangeMinChange(newRangeMin) {
    let value = newRangeMin;
    switch (template.templateType) {
      case "integer":
        value = handleIntegerInput(value);
        break;
      case "float":
        value = handleFloatInput(value);
        break;
      default:
        break;
    }
    setEditing_templateValueRangeMin(value);
    setEditing_AnyChangeMade(true);
  }
  function onTemplateRangeMaxChange(newRangeMax) {
    let value = newRangeMax;
    switch (template.templateType) {
      case "integer":
        value = handleIntegerInput(value);
        break;
      case "float":
        value = handleFloatInput(value);
        break;
      default:
        break;
    }
    setEditing_templateValueRangeMax(value);
    setEditing_AnyChangeMade(true);
  }
  // Return formatted float
  function handleFloatInput(value) {
    // Real-world value input
    let currentInputValue = value;
    if (currentInputValue === ".") {
      currentInputValue = "0.";
    }

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

    return sanitizedValue;
  }
  // Return formatted integer
  function handleIntegerInput(value) {
    if (value === undefined) return;
    // Real-world value input
    let currentInputValue = value;

    let sanitizedValue = currentInputValue.replace(/[^0-9]/g, "");

    return sanitizedValue;
  }
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "fit-content",
    bgcolor: "background.paper",
    border: "1px solid #615ff449",
    boxShadow: 24,
    borderRadius: "2rem",
    p: 4,
  };

  async function onSaveTemplate() {
    let tempRangeMin = editing_templateValueRangeMin;
    let tempRangeMax = editing_templateValueRangeMax;

    // If range is swapped, we need to swap it back
    function checkIfRangeSwapped() {
      if (
        editing_templateValueRangeMin !== "" &&
        editing_templateValueRangeMax !== ""
      ) {
        if (editing_templateValueRangeMin > editing_templateValueRangeMax) {
          tempRangeMin = editing_templateValueRangeMax;
          tempRangeMax = editing_templateValueRangeMin;
        }
      }
    }
    checkIfRangeSwapped();

    const resp = await updateStatisticsTemplate({
      gameID: game.gameID,
      branch: branch,
      templateID: template.templateID,
      templateObject: {
        templateName: editing_templateName,
        templateCodeName: editing_templateCodeName,
        templateDefaultValue: editing_templateDefaultValue,
        templateValueRangeMin: tempRangeMin,
        templateValueRangeMax: tempRangeMax,
      },
    });

    setTimeout(() => {
      setEditing(false);
      onAskRefresh();
    }, 300);
  }

  function getTemplateValueFieldToChange() {
    switch (template.templateType) {
      case "bool":
        return (
          <FormControl sx={{ mr: 1, mt: 3 }} variant="outlined">
            <InputLabel>New value</InputLabel>
            <Select
              label="New value"
              value={elementValue}
              onChange={(event) => handleElementValueChange(event.target.value)}
            >
              <MenuItem value={"True"}>True</MenuItem>
              <MenuItem value={"False"}>False</MenuItem>
            </Select>
          </FormControl>
        );
      default:
        return (
          <FormControl sx={{ mr: 1, mt: 3 }} variant="outlined">
            <InputLabel>New value</InputLabel>
            <OutlinedInput
              spellCheck={false}
              value={elementValue}
              onChange={(event) => {
                switch (template.templateType) {
                  case "string":
                    handleElementValueChange(event.target.value);
                    break;
                  case "float":
                    handleElementValueChange(
                      handleFloatInput(event.target.value)
                    );

                    break;
                  case "integer":
                    handleElementValueChange(
                      handleIntegerInput(event.target.value)
                    );
                    break;
                  default:
                    break;
                }
              }}
              label="New value"
            />
          </FormControl>
        );
    }
  }

  return (
    <div>
      <Modal open={editing} onClose={() => setEditing(false)}>
        <Box sx={style}>
          <Typography
            sx={{ mb: 2 }}
            id="modal-modal-title"
            variant="h6"
            component="h2"
          >
            Edit element
          </Typography>
          <Typography
            color="text.grey"
            id="modal-modal-description"
            sx={{ mb: 4 }}
          >
            Change element name, ID, default value or range.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
            <TextField
              spellCheck={false}
              label="Name"
              variant="outlined"
              value={editing_templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
            />
            <TextField
              spellCheck={false}
              label="ID"
              variant="outlined"
              value={editing_templateCodeName}
              onChange={(e) => onTemplateCodeNameChange(e.target.value)}
            />
            <TextField
              spellCheck={false}
              sx={{ mt: 3 }}
              label="Default value"
              variant="outlined"
              value={editing_templateDefaultValue}
              onChange={(e) => onTemplateDefaultValueChange(e.target.value)}
            />
          </Box>

          {template.templateType === "float" ||
          template.templateType === "integer" ? (
            <div>
              <Typography sx={{ mb: 1 }}>Available range (optional)</Typography>
              <span style={{ display: "flex", gap: 5 }}>
                <TextField
                  spellCheck={false}
                  id="outlined-basic"
                  label="Range Min"
                  variant="standard"
                  value={editing_templateValueRangeMin}
                  onChange={(e) => onTemplateRangeMinChange(e.target.value)}
                />
                <span
                  style={{
                    fontSize: "1.2rem",
                    paddingTop: "15px",
                    color: "#e7e7e7",
                  }}
                >
                  -
                </span>
                <TextField
                  spellCheck={false}
                  id="outlined-basic"
                  label="Range Max"
                  variant="standard"
                  value={editing_templateValueRangeMax}
                  onChange={(e) => onTemplateRangeMaxChange(e.target.value)}
                />
              </span>
            </div>
          ) : (
            <div></div>
          )}

          <Button
            disabled={!editing_AnyChangeMade}
            sx={{ mt: 6 }}
            variant="contained"
            onClick={() => onSaveTemplate()}
          >
            Save
          </Button>
        </Box>
      </Modal>

      <Modal open={editingClient} onClose={() => handleCloseValueChanger()}>
        <Box sx={style}>
          <Typography
            sx={{ mb: 2 }}
            id="modal-modal-title"
            variant="h6"
            component="h2"
          >
            Edit value for client
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
            {getTemplateValueFieldToChange()}

            <TextField
              disabled
              spellCheck={false}
              sx={{ mt: 3 }}
              label="Default value"
              variant="outlined"
              value={editing_templateDefaultValue}
            />
          </Box>

          {template.templateType === "float" ||
          template.templateType === "integer" ? (
            <div>
              <Typography sx={{ mb: 0 }}>Possible range</Typography>
              <Typography variant="caption">
                Can be overriden by "New value"
              </Typography>

              <span style={{ marginTop: "15px", display: "flex", gap: 5 }}>
                <TextField
                  disabled
                  spellCheck={false}
                  id="outlined-basic"
                  label="Range Min"
                  variant="standard"
                  value={editing_templateValueRangeMin}
                  onChange={(e) => onTemplateRangeMinChange(e.target.value)}
                />
                <span
                  style={{
                    fontSize: "1.2rem",
                    paddingTop: "15px",
                    color: "#e7e7e7",
                  }}
                >
                  -
                </span>
                <TextField
                  disabled
                  spellCheck={false}
                  id="outlined-basic"
                  label="Range Max"
                  variant="standard"
                  value={editing_templateValueRangeMax}
                  onChange={(e) => onTemplateRangeMaxChange(e.target.value)}
                />
              </span>
            </div>
          ) : (
            <div></div>
          )}

          <Button
            disabled={!editing_AnyChangeMade}
            sx={{ mt: 6 }}
            variant="contained"
            onClick={() =>
              changeElementForClient(
                client.clientID,
                template.templateID,
                elementValue
              )
            }
          >
            Save
          </Button>
        </Box>
      </Modal>

      <div
        className={s.dataElementStatistics}
        onClick={(e) => onSettingsClick(e)}
      >
        <Tooltip
          title={`Element name: ${template.templateName}`}
          placement="right-start"
        >
          <div className={s.header}>
            <ScaleText minFontSize={6} maxFontSize={16}>
              <Typography className={s.templateName}>
                {template.templateName}
              </Typography>
            </ScaleText>
          </div>
        </Tooltip>

        <Tooltip
          title={`Element ${client == undefined ? "default" : ""} value: ${elementValue !== "" ? elementValue : template.templateDefaultValue}`}
          placement="right-start"
        >
          <div className={s.body}>
            <ScaleText minFontSize={6} maxFontSize={20}>
              <Typography className={s.templateValue}>
                {elementValue !== ""
                  ? elementValue
                  : template.templateDefaultValue}
              </Typography>
            </ScaleText>
          </div>
        </Tooltip>

        <Tooltip
          title={`Element ID: ${template.templateCodeName}`}
          placement="right-start"
        >
          <div className={s.id}>
            <ScaleText minFontSize={6} maxFontSize={12}>
              <Typography color="text.secondary" className={s.templateID}>
                {template.templateCodeName}
              </Typography>
            </ScaleText>
          </div>
        </Tooltip>
      </div>
      <Popover
        id={"templatesettings"}
        open={openPopover}
        anchorEl={anchorEl}
        onClose={handleCloseSettings}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: { style: { padding: "10px", borderRadius: "2rem" } },
        }}
      >
        <Stack direction="column">
          <Button
            variant="text"
            sx={{ borderRadius: "2rem" }}
            onClick={() => {
              if (client) {
                handleEditTemplateValue();
              } else {
                handleEditTemplate();
              }
            }}
          >
            edit
          </Button>
          <Button
            variant="text"
            color="error"
            sx={{ borderRadius: "2rem" }}
            onClick={handleRemoveTemplate}
          >
            delete
          </Button>
        </Stack>
      </Popover>
    </div>
  );
};

export default StatisticsDataElementCard;
