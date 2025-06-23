import React, { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet";
import titles from "titles";
import s from "./customCharts.module.css";

// MUI
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Input from "@mui/material/Input";

// Components
import ChartSelectionItem from "./ChartSelectionItem";
import ChartBuilder from "./chartBuilder/ChartBuilder";

import useApi from "@strix/api";

import shortid from "shortid";
import { useGame, useBranch } from "@strix/gameContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useAlert } from "@strix/alertsContext";

const CustomCharts = () => {
  const { game } = useGame();
  const location = useLocation();
  const { triggerAlert } = useAlert();

  const { branch, environment } = useBranch();
  const Navigate = useNavigate();
  const {
    getDashboards,
    addCustomDashboard,
    addChartToCustomDashboard,

    updateCustomDashboardChart,
  } = useApi();
  const [dashboards, setDashboards] = useState([]);

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

  async function saveChartToDashboard(chart, dashboard) {
    const params = new URLSearchParams(location.search);
    const isEditingChart = params.get(`editChart`);
    if (isEditingChart) {
      let t = { ...chart };
      t.chartSettings.fullWidth = false; // was set to true when started editing, otherwise it will change size during editing which we dont want
      delete t.chartSettings.isEditing;
      await updateCustomDashboardChart({
        gameID: game.gameID,
        branch,
        chartID: chart.chartID,
        newChart: t,
      });
      triggerAlert("Chart was saved successfully!", "success");
    } else {
      let t = { ...chart };
      t.id = shortid.generate();
      t.chartID = shortid.generate();
      await addChartToCustomDashboard({
        gameID: game.gameID,
        branch,
        dashboardID: dashboard,
        chartObj: t,
      });
      triggerAlert("New chart was saved successfully!", "success");
    }
  }

  return (
    <div className={s.main}>
      <Helmet>
        <title>{titles.charts}</title>
      </Helmet>

      <div className={s.chartBuilder}>
        {dashboards && (
          <ChartBuilder
            onChartSaved={async (chart, dashboard) => {
              await saveChartToDashboard(chart, dashboard);
            }}
            closeBuilder={() => {
              setSelectedChartType("");
              setEditingChart(false);
            }}
            key="someKey"
            dashboards={dashboards}
            addNewDashboard={() => {
              onDashboardAdded();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CustomCharts;
