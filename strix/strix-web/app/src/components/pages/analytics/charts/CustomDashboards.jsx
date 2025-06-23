import React, { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet";
import titles from "titles";
import s from "./customCharts.module.css";

// MUI
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";
import CheckSharpIcon from "@mui/icons-material/CheckSharp";
import Input from "@mui/material/Input";
import Tooltip from "@mui/material/Tooltip";
import { Box } from "@mui/material";

// Components
import ChartSelectionItem from "./ChartSelectionItem";
import ChartBuilder from "./chartBuilder/ChartBuilder";

import useApi from "@strix/api";

import shortid from "shortid";
import { useGame, useBranch } from "@strix/gameContext";
import { useNavigate } from "react-router-dom";
import SearchWrapper from "shared/searchFramework/SearchWrapper.jsx";

const CustomCharts = () => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const Navigate = useNavigate();
  const {
    getDashboards,
    addCustomDashboard,
    updateCustomDashboard,
    removeCustomDashboard,
    addChartToCustomDashboard,
  } = useApi();
  const [dashboards, setDashboards] = useState([]);

  const [editingChart, setEditingChart] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState("");

  const [filteredDashboards, setFilteredDashboards] = useState([]);

  const [selectedDashboard, setSelectedDashboard] = useState({});

  function onChartSelected(chartType) {
    setSelectedChartType(chartType);
    setEditingChart(true);
  }

  useEffect(() => {
    async function fetchData() {
      const response = await getDashboards({ gameID: game.gameID, branch });
      if (response.success) {
        if (response.dashboards && response.dashboards.length > 0) {
          setDashboards(response.dashboards);
        }
      }
    }
    fetchData();
  }, []);

  function convertToSlug(phrase) {
    return phrase
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^\w\d]+/g, "");
  }
  function safelyConvertToSlug(newName) {
    let link = convertToSlug(newName);
    let isErr = dashboards.some((dashboard, index) => {
      if (dashboard.linkName === link) {
        return true;
      }
    });

    const reservedNames = [
      "iap",
      "ingamecurrency",
      "userbehavior",
      "rfm",
      "monetization",
      "engagement",
      "analytics",
      "playerwarehouse",
      "segmentation",
      "all",
      "custom",
    ];
    isErr = reservedNames.includes(link);

    let iteration = 1;
    while (isErr) {
      link = `${link}_${iteration}`;
      iteration++;

      isErr = dashboards.some((dashboard, index) => {
        if (dashboard.linkName === link) {
          return true;
        }
      });
    }
    return link;
  }
  function onDashboardAdded() {
    let newDashboard = {
      id: shortid.generate(),
      name: "New dashboard",
      linkName: "newdashboard",
      charts: [],
    };
    setDashboards([...dashboards, newDashboard]);
    addCustomDashboard({ gameID: game.gameID, branch, newDashboard });
  }
  function renameDashboard(newName, index) {
    const tempDashboards = [...dashboards];
    tempDashboards[index].name = newName;
    tempDashboards[index].linkName = safelyConvertToSlug(newName);
    setDashboards(tempDashboards);

    updateCustomDashboard({
      gameID: game.gameID,
      branch,
      dashboardID: tempDashboards[index].id,
      newDashboard: tempDashboards[index],
    });
  }
  function removeDashboard(id) {
    setDashboards((prev) => prev.filter((d) => d.id !== id));
    removeCustomDashboard({
      gameID: game.gameID,
      branch,
      dashboardID: id,
    });
  }
  function onDashboardSelected(dashboard) {
    setSelectedDashboard(dashboard);
    Navigate(`/dashboards/${dashboard.linkName}`);
  }

  function DashboardItem({
    index,
    dashboard,
    renameDashboard,
    onDashboardSelected,
    onDashboardRemoved,
  }) {
    const [isHovered, setIsHovered] = useState(false);

    // Renaming config
    const [showNameInput, setShowNameInput] = React.useState(false);
    const [nameInputValue, setNameInputValue] = React.useState("");
    const inputRef = React.useRef();

    function startRenameConfig(e) {
      setShowNameInput(true);
      setNameInputValue(dashboard.name);
    }
    function endRenameConfig(e, blur) {
      if ((e.keyCode !== 13) & !blur) return;
      setShowNameInput(false);
      renameDashboard(nameInputValue, index);
    }
    // Using useEffect to set focus on input when renaming config.
    // Using other methods will result in a bug with the input not being focused.
    useEffect(() => {
      if (showNameInput) {
        inputRef.current.focus();
      }
    }, [showNameInput]);

    function trimStr(str, maxLength) {
      if (str === undefined || str === "") return "";
      return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
    }

    const [pendingDelete, setPendingDelete] = useState(false);
    function onDeletePressed(index) {
      if (!pendingDelete) {
        setPendingDelete(true);
      } else {
        onDashboardRemoved(dashboard.id);
      }
    }

    return (
      <div
        className={s.dashboardItem}
        style={{ backgroundColor: showNameInput ? "#3c3893" : "" }}
      >
        {showNameInput && (
          <Tooltip placement="top" title="Press Enter to apply">
            <Input
              spellCheck={false}
              inputRef={inputRef}
              sx={(theme) => ({
                ml: "16px",
                pl: "2rem",
                whiteSpace: "pre-wrap",
                textTransform: "none",
                fontWeight: "regular",
                textAlign: "start",
                color: "#e7e7e7",
              })}
              value={nameInputValue}
              onChange={(e) => setNameInputValue(e.target.value)}
              onKeyDown={(e) => endRenameConfig(e)}
              onBlur={(e) => endRenameConfig(e, true)}
            ></Input>
          </Tooltip>
        )}
        {!showNameInput && (
          <Button
            onClick={() => onDashboardSelected(dashboard)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            variant={isHovered ? "contained" : "outlined"}
            sx={{
              textTransform: "none",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              pl: "2rem",

              ...(!isHovered
                ? { backgroundColor: "var(--regular-card-bg-color)" }
                : {}),
            }}
          >
            <Typography
              variant={"body1"}
              sx={{
                fontWeight: "regular",
                textAlign: "start",
                width: "100%",
              }}
            >
              {trimStr(dashboard.name, 35)}
            </Typography>

            <Tooltip placement="top" title="Edit name">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  startRenameConfig(e);
                }}
                sx={{
                  color: "#e7e7e7",
                  mr: 2.5,
                  display: isHovered ? "block" : "none",
                }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>

            <Tooltip placement="top" title="Delete">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePressed(index);
                }}
                onMouseLeave={() => setPendingDelete(false)}
                sx={{
                  color: "#e7e7e7",
                  height: "100%",
                  display: isHovered ? "block" : "none",
                  "&": pendingDelete
                    ? { bgcolor: "#b03333", color: "white" }
                    : {},
                  ":hover": pendingDelete
                    ? { bgcolor: "#cf4040", color: "white" }
                    : { bgcolor: "#b03333", color: "white" },
                }}
              >
                {pendingDelete ? (
                  <CheckSharpIcon sx={{ fontSize: 24 }} />
                ) : (
                  <DeleteSharpIcon sx={{ fontSize: 24 }} />
                )}
              </IconButton>
            </Tooltip>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={s.main}>
      <Helmet>
        <title>{titles.charts}</title>
      </Helmet>

      <div className={s.customDashboards}>
        <div className={s.upperbarButtons}>
          <Typography
            variant={"h5"}
            color={"text.secondary"}
            sx={{
              display: editingChart ? "none" : "block",
              fontWeight: "regular",
              textAlign: "start",
            }}
          >
            Dashboards
          </Typography>
        </div>

        <Box sx={{ p: 2, pt: 4, display: "flex", alignItems: "center" }}>
          <SearchWrapper
            itemsToFilter={dashboards}
            segmentsEnabled={false}
            tagsEnabled={false}
            nameEnabled={true}
            possibleTags={[]}
            possibleSegments={[]}
            nameMatcher={(item, name) => {
              return item.name.toLowerCase().indexOf(name) !== -1;
            }}
            onItemsFiltered={(filtered) => {
              setFilteredDashboards(filtered);
            }}
          />
          <Button
            sx={{
              m: 2,
              ml: 1,
              borderRadius: "2rem",
              minWidth: 100,
              minHeight: "45px",
            }}
            variant="contained"
            onClick={onDashboardAdded}
          >
            Add new dashboard
          </Button>
        </Box>

        <div className={s.dashboardList}>
          {filteredDashboards &&
            filteredDashboards.length > 0 &&
            filteredDashboards.map((dashboard, index) => (
              <DashboardItem
                key={index}
                index={index}
                dashboard={dashboard}
                onDashboardSelected={onDashboardSelected}
                renameDashboard={renameDashboard}
                onDashboardRemoved={removeDashboard}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default CustomCharts;
