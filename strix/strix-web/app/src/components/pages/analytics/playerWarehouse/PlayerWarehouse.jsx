import React, { useEffect, useState, useRef } from "react";
import Navbar from "../../navbar/Navbar";
import CollapsibleSection from "./CollapsibleSection";
import CreateDataElementCard from "./cards/CreateDataElementCard";
import ModalCreateStatisticsElement from "./modals/ModalCreateStatisticsElement";
import ModalCreateAnalyticsElement from "./modals/ModalCreateAnalyticsElement";
import useApi from "@strix/api";

import { useBranch, useGame } from "@strix/gameContext";
import StatisticsDataElementCard from "./cards/StatisticsDataElementCard";
import AnalyticsDataElementCard from "./cards/AnalyticsDataElementCard";
import SegmentDataElementCard from "./cards/SegmentDataElementCard";
import WarehouseClientListSidebar from "./WarehouseClientListSidebar";
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
import s from "./css/playerWarehouse.module.css";
import { Helmet } from "react-helmet";
import titles from "titles";
import { Button } from "@mui/material";
import Input from "@mui/material/Input";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";

// Tabs
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import MuiTab from "@mui/material/Tab";
import Collapse from "@mui/material/Collapse";
import shortid from "shortid";
import LeaderboardItem from "./LeaderboardItem";
import SearchWrapper from "shared/searchFramework/SearchWrapper.jsx";

import BlankEntityIcon from "./entityBasic.svg?react";

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
      className={s.tabContent}
      style={{ overflow: "hidden", height: "100%" }}
    >
      {value === index && <Box sx={{ p: 0, height: "100%" }}>{children}</Box>}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function allyProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const PlayerWarehouse = () => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const {
    // Warehouse
    addStatisticsTemplate,
    addAnalyticsTemplate,
    getWarehouseTemplates,
    getWarehousePlayerData,
    getSegmentsByIdArray,
    getAllSegmentsForAnalyticsFilter,
    getABTestsShort,
    getEntitiesIDs,
    getEntityIcons,
    // Leadeboards
    getLeaderboards,
    addLeaderboard,
    removeLeaderboard,
    updateLeaderboard,
  } = useApi();
  const { triggerAlert } = useAlert();

  const [abTests, setAbTests] = useState([]);

  const [
    isModalCreateStatisticsTemplateOpened,
    setIsModalCreateStatisticsTemplateOpened,
  ] = useState(false);
  const [
    isModalCreateAnalyticsTemplateOpened,
    setIsModalCreateAnalyticsTemplateOpened,
  ] = useState(false);

  const [templatesStatistics, setTemplatesStatistics] = useState();
  const [templatesAnalytics, setTemplatesAnalytics] = useState();

  const [selectedClient, setSelectedClient] = useState();

  const [entityIcons, setEntityIcons] = useState([]);

  // An array of objects with "segmentID & segmentName" keys
  const [selectedClientSegments, setSelectedClientSegments] = useState([]);
  const [segmentsList, setSegmentsList] = useState([]);

  const [filteredLeaderboards, setFilteredLeaderboards] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  // Tabs
  const [tabs, setTabs] = React.useState(0);
  const handleTabChange = (event, newValue) => {
    setTabs(newValue);
  };

  useEffect(() => {
    const params = new URLSearchParams();
    params.append("gameID", game.gameID);
    params.append("branch", branch);
    const currentPath = window.location.pathname;
    const newPath = `${currentPath}?${params.toString()}`;
    navigate(newPath);
  }, []);

  useEffect(() => {
    if (selectedClient && selectedClient.inventory.length > 0) {
      fetchIcons();
    }
  }, [selectedClient]);

  async function fetchIcons() {
    const icons = await getEntityIcons({
      gameID: game.gameID,
      branch: branch,
      nodeIDs: selectedClient.inventory.map((i) => i.nodeID),
    });
    setEntityIcons(icons.entityIcons);
  }
  const fetchTemplates = async () => {
    const response = await getWarehouseTemplates({
      gameID: game.gameID,
      branch: branch,
    });
    setTemplatesStatistics(response.templates.statistics);
    setTemplatesAnalytics(response.templates.analytics);
  };
  async function fetchSegments() {
    const response = await getAllSegmentsForAnalyticsFilter({
      gameID: game.gameID,
      branch: branch,
    });
    if (response.success) {
      setSegmentsList(response.message);
    }
  }

  const [entities, setEntities] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    console.log("refetching");
    fetchTemplates();
    fetchSegments();

    async function getAllABTests() {
      const res = await getABTestsShort({
        gameID: game.gameID,
        branch: branch,
      });
      if (res.success) {
        setAbTests(res.abTests);
      }
    }
    getAllABTests();

    async function fetchEntitiesIDs() {
      const response = await getEntitiesIDs({
        gameID: game.gameID,
        branch: branch,
      });
      if (response.success) {
        setEntities(response.entities);
      }
    }
    fetchEntitiesIDs();
  }

  function closeModal() {
    setIsModalCreateStatisticsTemplateOpened(false);
    setIsModalCreateAnalyticsTemplateOpened(false);
  }

  function callModalWindow(templateType) {
    if (templateType === "statistics") {
      setIsModalCreateStatisticsTemplateOpened(true);
    } else if (templateType === "analytics") {
      setIsModalCreateAnalyticsTemplateOpened(true);
    }
  }

  async function onModalSubmit(template) {
    if (template.templateType === "statistics") {
      const response = await addStatisticsTemplate({
        gameID: game.gameID,
        branch: branch,
        templateObject: template.templateObject,
      });
      setIsModalCreateStatisticsTemplateOpened(false);
      setTemplatesStatistics((prevTemplates) => [
        ...prevTemplates,
        response.newTemplate,
      ]);
    } else if (template.templateType === "analytics") {
      let sanitizedTemplate = template;

      if (
        sanitizedTemplate &&
        sanitizedTemplate.templateObject.templateConditions
      ) {
        sanitizedTemplate.templateObject.templateConditions =
          sanitizedTemplate.templateObject.templateConditions.filter(
            (condition) => condition.conditionEnabled === true
          );
      }

      const response = await addAnalyticsTemplate({
        gameID: game.gameID,
        branch: branch,
        templateObject: sanitizedTemplate.templateObject,
      });
      setIsModalCreateAnalyticsTemplateOpened(false);
      setTemplatesAnalytics((prevTemplates) => [
        ...prevTemplates,
        response.newTemplate,
      ]);
    }

    fetchTemplates();
    return;
  }

  async function onClientSelect(clientID) {
    const response = await getWarehousePlayerData({
      gameID: game.gameID,
      branch: branch,
      environment,
      clientID,
    });
    setSelectedClient(response.player);
    const segmentsResponse = await getSegmentsByIdArray({
      gameID: game.gameID,
      branch: branch,
      segmentIDs: response.player.segments,
    });
    setSelectedClientSegments(segmentsResponse.segments);
  }
  const [leaderboards, setLeaderboards] = useState([]);

  async function fetchLeaderboards() {
    const resp = await getLeaderboards({
      gameID: game.gameID,
      branch: branch,
    });
    if (resp.success) {
      setLeaderboards(resp.message || []);
    }
  }
  useEffect(() => {
    fetchLeaderboards();
  }, []);

  async function addNewLeaderboard(lb) {
    let newBoard = {};
    if (lb) {
      newBoard = {
        ...lb,
        id: shortid.generate(),
        codename: shortid.generate(),
      };
    } else {
      newBoard = {
        id: shortid.generate(),
        name: "New Leaderboard",
        codename: shortid.generate(),
        timeframes: [],
        tops: [],
        topLength: 10,
        segments: [],

        aggregateElementID: "",
        additionalElementIDs: [],
        currentState: [],
      };
    }
    setLeaderboards([...leaderboards, newBoard]);

    const resp = await addLeaderboard({
      gameID: game.gameID,
      branch: branch,
      leaderboard: newBoard,
    });
    if (resp.success) {
      triggerAlert("New leaderboard created", "success");
    } else {
      setLeaderboards([...leaderboards.filter((b) => b.id !== newBoard.id)]);
    }
  }

  const timeoutRef_Save = useRef(null);
  async function onLeaderboardChange(newBoard, index) {
    clearTimeout(timeoutRef_Save.current);
    timeoutRef_Save.current = setTimeout(async () => {
      const resp = await updateLeaderboard({
        gameID: game.gameID,
        branch: branch,
        leaderboard: newBoard,
      });
      let t = [...leaderboards];
      t[index] = newBoard;
      setLeaderboards(t);
    }, 1000);
  }

  async function onLeaderboardRemove(id) {
    const resp = await removeLeaderboard({
      gameID: game.gameID,
      branch: branch,
      leaderboard: id,
    });
    if (resp.success) {
      triggerAlert("Leaderboard removed", "success");
      setLeaderboards([...leaderboards.filter((b) => b.id !== id)]);
    }
  }

  return (
    <div className={s.PWpage}>
      <Helmet>
        <title>{titles.playerWarehouse}</title>
      </Helmet>

      <div className={s.navbarContainer}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", width: "100%" }}>
          <Tabs value={tabs} onChange={handleTabChange} aria-label="pw tabs">
            <MuiTab label="elements" {...allyProps(0)} />
            <MuiTab label="leaderboards" {...allyProps(1)} />
          </Tabs>
        </Box>
      </div>

      <CustomTabPanel value={tabs} index={0}>
        <div className={s.pwRow}>
          <aside className={s.sidebarRight}>
            <WarehouseClientListSidebar
              onClientSelect={onClientSelect}
              allTemplates={[]
                .concat(templatesAnalytics)
                .concat(templatesStatistics)
                .filter(Boolean)}
              allSegments={segmentsList}
              selectedClient={selectedClient}
              allEntities={entities.filter((e) => e.entityBasic)}
            />
          </aside>
          <main className={s.containersColumn}>
            <div className={s.clientTitleContainer}>
              <div className={s.clientName}>
                <Typography
                  color={selectedClient ? "text.primary" : "text.secondary"}
                  sx={{ mr: 2 }}
                >
                  Viewing client:
                </Typography>
                {selectedClient ? (
                  [
                    <Typography color="text.secondary">
                      {selectedClient.clientID}
                    </Typography>,

                    <Tooltip title={"Reset selection"}>
                      <IconButton
                        onClick={() => setSelectedClient()}
                        sx={{ borderRadius: "2rem", ml: 1 }}
                        size="small"
                      >
                        <CloseIcon />
                      </IconButton>
                    </Tooltip>,
                  ]
                ) : (
                  <Typography color="text.grey">None</Typography>
                )}
              </div>
            </div>

            <div className={s.dataElementContainers}>
              {templatesAnalytics !== undefined && (
                <CollapsibleSection
                  name="Analytics"
                  cardsAmount={templatesAnalytics.length}
                >
                  {templatesAnalytics !== undefined ? (
                    templatesAnalytics.map((template, index) => (
                      <AnalyticsDataElementCard
                        key={index}
                        template={template}
                        client={selectedClient}
                        onRemove={fetchData}
                        onAskRefresh={fetchData}
                      />
                    ))
                  ) : (
                    <div></div>
                  )}
                  <CreateDataElementCard
                    elementType="analytics"
                    onClicked={callModalWindow}
                  />
                </CollapsibleSection>
              )}

              {templatesStatistics !== undefined && (
                <CollapsibleSection
                  name="Statistics"
                  cardsAmount={templatesStatistics.length}
                >
                  {templatesStatistics !== undefined ? (
                    templatesStatistics.map((template, index) => (
                      <StatisticsDataElementCard
                        key={index}
                        template={template}
                        client={selectedClient}
                        onRemove={fetchData}
                        onAskRefresh={fetchData}
                      />
                    ))
                  ) : (
                    <div></div>
                  )}
                  <CreateDataElementCard
                    elementType="statistics"
                    onClicked={callModalWindow}
                  />
                </CollapsibleSection>
              )}

              {/* If client selected, show segments container */}
              {selectedClient && selectedClientSegments && (
                <CollapsibleSection
                  name="Segments"
                  cardsAmount={selectedClientSegments.length}
                >
                  {selectedClientSegments &&
                    selectedClientSegments.map((segment, index) => (
                      <SegmentDataElementCard
                        key={index}
                        segment={segment}
                        abTests={abTests}
                      />
                    ))}
                </CollapsibleSection>
              )}

              <CollapsibleSection
                name="Inventory"
                cardsAmount={selectedClient?.inventory?.length || 0}
              >
                {selectedClient ? (
                  <div className={s.inventoryItems}>
                    {selectedClient.inventory &&
                      selectedClient.inventory.map((item) => (
                        <Tooltip
                          title={
                            entities.find((e) => e.nodeID === item.nodeID)
                              ?.name || "Loading or unknown..."
                          }
                        >
                          <div className={s.inventoryItem}>
                            <div className={s.amountLabel}>
                              <Typography fontSize="18px">
                                {item.quantity}
                              </Typography>
                            </div>
                            {item.slot && (
                              <div className={s.slotLabel}>
                                <Typography fontSize="24px">
                                  #{item.slot}
                                </Typography>
                              </div>
                            )}
                            {entityIcons.find((i) => i.nodeID === item.nodeID)
                              ?.icon ? (
                              <img
                                src={
                                  entityIcons.find(
                                    (i) => i.nodeID === item.nodeID
                                  )?.icon || ""
                                }
                              />
                            ) : (
                              <BlankEntityIcon />
                            )}
                          </div>
                        </Tooltip>
                      ))}
                  </div>
                ) : (
                  <Typography variant="subtitle1" color="text.grey">
                    Pick client to view
                  </Typography>
                )}
              </CollapsibleSection>
              {/* {selectedClient && (
              )} */}
            </div>
          </main>
        </div>
      </CustomTabPanel>

      <CustomTabPanel value={tabs} index={1}>
        <div className={s.leaderboardsContainer}>
          <div className={s.lbNavbar}>
            <Box sx={{ p: 0, pt: 2, display: "flex", alignItems: "center" }}>
              <SearchWrapper
                itemsToFilter={leaderboards}
                segmentsEnabled={false}
                tagsEnabled={false}
                nameEnabled={true}
                possibleTags={[]}
                possibleSegments={[]}
                nameMatcher={(item, name) => {
                  return item.name.toLowerCase().indexOf(name) !== -1;
                }}
                onItemsFiltered={(filtered) => {
                  setFilteredLeaderboards(filtered);
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
                onClick={addNewLeaderboard}
              >
                Add new segment
              </Button>
            </Box>
          </div>
          <div className={s.leaderboardsList}>
            {filteredLeaderboards.map((lb, index) => (
              <LeaderboardItem
                gameID={game.gameID}
                branch={branch}
                key={lb.id}
                lb={lb}
                allTemplates={[]
                  // .concat(templatesAnalytics)
                  .concat(templatesStatistics)
                  .filter(Boolean)}
                allBoards={leaderboards}
                onLbChange={(updatedLB) =>
                  onLeaderboardChange(updatedLB, index)
                }
                onLbRemove={onLeaderboardRemove}
                onLbClone={(lb) => addNewLeaderboard(lb)}
              />
            ))}
          </div>
        </div>
      </CustomTabPanel>

      <Modal
        open={isModalCreateStatisticsTemplateOpened}
        onClose={() => setIsModalCreateStatisticsTemplateOpened(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
          <ModalCreateStatisticsElement
            onModalClose={closeModal}
            onSubmit={onModalSubmit}
          />
      </Modal>

      <Modal
        open={isModalCreateAnalyticsTemplateOpened}
        onClose={() => setIsModalCreateAnalyticsTemplateOpened(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
          <ModalCreateAnalyticsElement
            onModalClose={closeModal}
            onSubmit={onModalSubmit}
          />
      </Modal>
    </div>
  );
};

export default PlayerWarehouse;
