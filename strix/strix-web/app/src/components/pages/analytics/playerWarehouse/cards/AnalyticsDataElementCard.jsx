import React, { useState } from "react";
import s from "../css/dataElement.module.css";
// MUI
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import useApi from "@strix/api";
import { useLocation } from "react-router-dom";
import ScaleText from "react-scale-text";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { useAlert } from "@strix/alertsContext";

const AnalyticsDataElementCard = ({ template, client, onRemove }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const location = useLocation();
  const { removeWarehouseTemplate } = useApi();

  const { triggerAlert } = useAlert();

  let elementValue = "";
  if (client !== undefined) {
    const foundElement = client.elements.analytics.find(
      (element) => element.elementID === template.templateID
    );

    elementValue = foundElement ? foundElement.elementValue : "undefined";
  }

  const onSettingsClick = (event) => {
    if (template.templateAnalyticEventID) {
      if (!client) {
        setAnchorEl(event.currentTarget);
      } else {
        triggerAlert(
          "Cannot interact with analytics elements while viewing client",
          "error"
        );
      }
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const openPopover = Boolean(anchorEl);

  const handleRemoveTemplate = async () => {
    const searchParams = new URLSearchParams(location.search);
    const currentGameID = searchParams.get("gameID");
    const currentBranch = searchParams.get("branch");

    const response = await removeWarehouseTemplate({
      gameID: currentGameID,
      branch: currentBranch,
      templateID: template.templateID,
    });
    if (response.success) {
      onRemove();
    }
  };

  function trimStr(str) {
    if (str === undefined || str === "") return "";
    return str.length > 15 ? `${str.slice(0, 15)}...` : str;
  }

  function localizeTemplateMethod() {
    switch (template.templateMethod) {
      case "mostRecent":
        return "Most Recent";
      case "firstReceived":
        return "First Received";
      case "mostCommon":
        return "Most Common";
      case "leastCommon":
        return "Least Common";
      case "mean":
        return "Mean";
      case "meanForTime":
        return "Mean (N Days)";
      case "numberOfEvents":
        return "Count";
      case "numberOfEventsForTime":
        return "Count (N Days)";
      case "summ":
        return "Sum";
      case "summForTime":
        return "Sum (N Days)";
      case "dateOfFirst":
        return "Date of First Event";
      case "dateOfLast":
        return "Date of Last Event";
    }
  }

  return (
    <div>
      <Popover
        id={"templatesettings"}
        open={openPopover}
        anchorEl={anchorEl}
        onClose={handleClose}
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
            color="error"
            sx={{ borderRadius: "2rem" }}
            onClick={handleRemoveTemplate}
          >
            delete
          </Button>
        </Stack>
      </Popover>

      <div
        className={s.dataElementAnalytics}
        onClick={(e) => onSettingsClick(e)}
      >
        <Tooltip
          title={`Element name: ${template.templateName}`}
          placement="right-start"
        >
          <div className={s.header}>
            <ScaleText minFontSize={6} maxFontSize={14}>
              <Typography className={s.templateName}>
                {trimStr(template.templateName)}
              </Typography>
            </ScaleText>
          </div>
        </Tooltip>

        {client !== undefined && (
          <Tooltip
            title={`Element value: ${elementValue}`}
            placement="right-start"
          >
            <div className={s.elementValue}>
              <ScaleText minFontSize={14} maxFontSize={20} widthOnly>
                <Typography
                  color={elementValue === "" ? "text.grey" : "text.secondary"}
                  className={s.value}
                >
                  {elementValue === "" ? "---" : trimStr(elementValue)}
                </Typography>
              </ScaleText>
            </div>
          </Tooltip>
        )}

        <div
          style={{
            marginTop: client == undefined ? "15px" : "auto",
            marginBottom: "auto",
          }}
        >
          {/* Dependency Analytics Event name */}
          <Tooltip
            title={`Event name: ${template.templateVisualEventName}`}
            placement="right-start"
          >
            <div className={s.eventNameContainer}>
              <ScaleText maxFontSize={14}>
                <Typography className={s.eventName}>
                  {trimStr(template.templateVisualEventName)}
                </Typography>
              </ScaleText>
            </div>
          </Tooltip>

          {/* Analytics Event Value name */}
          {template.templateVisualValueName && (
            <Tooltip
              title={`Event value name: ${template.templateVisualValueName}`}
              placement="right-start"
            >
              <div className={s.eventValueNameContainer}>
                <ScaleText maxFontSize={12}>
                  <Typography
                    color="text.secondary"
                    className={s.eventValueName}
                  >
                    {template.templateVisualValueName !== "Value not found" &&
                      trimStr(template.templateVisualValueName)}
                  </Typography>
                </ScaleText>
              </div>
            </Tooltip>
          )}

          {/* Template method */}
          {client == undefined && template.templateAnalyticEventID && (
            <Tooltip
              title={`Template count method: ${template.templateMethod}`}
              placement="right-start"
            >
              <div className={s.eventValueNameContainer}>
                <ScaleText maxFontSize={18}>
                  <Typography
                    color="text.secondary"
                    className={s.eventValueName}
                  >
                    {trimStr(localizeTemplateMethod())}
                  </Typography>
                </ScaleText>
              </div>
            </Tooltip>
          )}

          {!template.templateAnalyticEventID && (
            <Tooltip
              title={`Element is created automatically and cannot be removed`}
              placement="right-start"
            >
              <div className={s.eventValueNameContainer}>
                <ScaleText maxFontSize={12}>
                  <Typography color="text.grey" className={s.eventValueName}>
                    Default
                  </Typography>
                </ScaleText>
              </div>
            </Tooltip>
          )}
        </div>
        <Tooltip
          title={`Element ID: ${template.templateCodeName}`}
          placement="bottom"
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
    </div>
  );
};

export default AnalyticsDataElementCard;
