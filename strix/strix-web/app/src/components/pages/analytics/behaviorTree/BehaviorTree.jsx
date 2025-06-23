import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import titles from "titles";
import s from "./css/engagement.module.css";
import { useGame, useBranch } from "@strix/gameContext";

import BehaviorTree from "./tree/Tree";
import BehTreePanel from "./tree/BehTreePanel";
import FunnelBuilder from "./funnel/FunnelBuilder";

import { Button, Box } from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import shortid from "shortid";

import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import PortableSegmentBuilder from "shared/newSegmentModal/PortableSegmentBuilder";

import CorrelationTable from "./tree/CorrelationTable";
import dayjs from "dayjs";
import ChurnAnalysisModal from "./churn/ChurnAnalysisModal";

// Axios
import useApi from "@strix/api";

const Engagement = () => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const [dataRaw, setDataRaw] = useState([]);
  const [data, setData] = useState([]);
  const {
    getOffers,
    getTemplatesForSegments,
    getEntitiesIDs,
    getAllAnalyticsEvents,
    queryBehaviorAnalysis,
    getCurrencyEntities,
    getEntityIcons,
    getPlayersProfileByClientIDs,
  } = useApi();

  const [allAnalyticsEvents, setAnalyticsEvents] = useState([]);
  const [isEconomyAnalysis, setIsEconomyAnalysis] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState([]);
  const [elements, setElements] = useState({
    analytics: [],
    statistics: [],
    inventory: [],
  });
  const [showChurnModal, setShowChurnModal] = useState(false);

  // Declaring the events here. Declare what IDs are reserved, their styling, etc.
  // Also define random events that will be generated.
  const sessionStartEvent = "newSession";
  const sessionEndEvent = "endSession";
  const sessionEndCrashEvent = "endSessionCrash";
  const offerEvent = "offerEvent";
  const economyEvent = "economyEvent";
  const adEvent = "adEvent";
  const reportEvent = "reportEvent";
  const offerShownEvent = "offerShown";

  const testSessionLengthMax = 2;
  const testDataLength = 2;

  const reservedEvents = [
    sessionStartEvent,
    sessionEndEvent,
    offerEvent,
    economyEvent,
    adEvent,
    reportEvent,
    offerShownEvent,
  ];


  let generatedSessions = [];

  async function fetchCurrencies() {
    const resp = await getCurrencyEntities({
      gameID: game.gameID,
      branch: branch,
    });
    if (resp.success) {
      const icons = await getEntityIcons({
        gameID: game.gameID,
        branch: branch,
        nodeIDs: resp.entities.map((e) => e.nodeID),
      });
      if (icons.success) {
        setCurrencies(
          resp.entities.map((e) => {
            e.icon = icons.entityIcons.find((n) => n.nodeID === e.nodeID).icon;
            return e;
          })
        );
        setSelectedCurrencies(resp.entities.map((e) => e.nodeID));
      }
    }
  }
  useEffect(() => {
    async function fetchEvents() {
      setAnalyticsEvents(await fetchAnalyticsEvents(true));
    }
    fetchEvents();
    async function getTemplates() {
      const resp = await getTemplatesForSegments({
        gameID: game.gameID,
        branch: branch,
      });
      if (resp.success) {
        setElements(resp.templates);
      }
    }
    getTemplates();
  }, []);
  async function fetchAnalyticsEvents(getRemoved) {
    const resp = await getAllAnalyticsEvents({
      gameID: game.gameID,
      branch: branch,
      getRemoved: getRemoved,
    });

    let events = resp.events.map((event) => ({
      id: event.eventID,
      name: event.eventName,
      values: event.values,
    }));
    return events;
  }

  const [designEvents, setDesignEvents] = useState([]);

  // Making a tree data structure:
  // [
  //  [{ id: 'newSession', occurency: 10, prevEvent: '' }, { id: 'event1', occurency: 5, prevEvent: 'newSession' }, ...],
  // ]
  // Where each array in the root array is a step in the tree. prevEvent is the previous event for the given event.
  // We need it to separate the events that have different previous events but they are on the same step.
  const [funnelEvents, setFunnelEvents] = useState([]);
  function onFunnelEventsChange(newFunnelEvents) {
    setFunnelEvents(newFunnelEvents);
  }
  const [panelSettings, setPanelSettings] = useState({});
  function onSettingsChange(newSettings) {
    setPanelSettings(newSettings);
  }
  const [expandFunnel, setExpandFunnel] = useState(true);

  const [correlationData, setCorrelationData] = useState({});
  function onCorrelationDataGenerated(newCorrelationData) {
    setCorrelationData(newCorrelationData);
  }

  useEffect(() => {
    async function fetchEvents() {
      let designEventsLocal = await fetchAnalyticsEvents(true);
      setDesignEvents(designEventsLocal);
    }
    fetchEvents();
  }, []);

  // Add a cache to store fetched data for each analysis mode
  const dataCache = useRef({ regular: null, economy: null });

  // Modify fetchData to use cache and accept a forceFetch flag
  async function fetchData(forceFetch = false) {
    const modeKey = isEconomyAnalysis ? "economy" : "regular";
    // Use cached data if available and not forcing a refresh
    if (!forceFetch && dataCache.current[modeKey]) {
      setDataRaw(dataCache.current[modeKey]);
      setData(filterHiddenEvents(dataCache.current[modeKey]));
      return;
    }
    if (!panelSettings.date || panelSettings.date.length === 0) return;

    setIsLoading(true);
    await fetchCurrencies();

    const resp = await queryBehaviorAnalysis({
      gameID: game.gameID,
      branch: branch,
      environment: environment,
      filterDate: panelSettings.date,
      filterSegments: panelSettings.segments?.map((s) => s.segmentID) || [],
      minSessionLength: 0,
      isEconomy: isEconomyAnalysis,
    });

    // Update cache for the current mode
    dataCache.current[modeKey] = resp.message;
    setDataRaw(resp.message);
    setData(filterHiddenEvents(resp.message));
    setIsLoading(false);
  }

  const lastDateFilter = useRef([
    dayjs.utc().subtract(7, "days").toISOString(),
    dayjs.utc().toISOString(),
  ]);
  const lastSegmentsFilter = useRef([]);
  const fetchTimer = useRef(null);

  const isEqual = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  };

  useEffect(() => {
    if (!panelSettings.date || panelSettings.date.length === 0) return;
    if (
      !isEqual(lastDateFilter.current, panelSettings.date) ||
      !isEqual(lastSegmentsFilter.current, panelSettings.segments)
    ) {
      lastDateFilter.current = panelSettings.date;
      lastSegmentsFilter.current = panelSettings.segments;

      console.log("Filters changed. Fetching new data...");
      clearTimeout(fetchTimer.current);
      fetchTimer.current = setTimeout(() => {
        fetchData(true);
      }, 1000);
    }
  }, [panelSettings.date, panelSettings.segments]);

  useEffect(() => {
    setData(filterHiddenEvents(dataRaw));
  }, [panelSettings.hiddenEvents, selectedCurrencies]);
  
  // On switching analysis mode, fetchData() will use cached data if available
  useEffect(() => {
    fetchData();
  }, [isEconomyAnalysis]);

  function filterHiddenEvents(data) {
    if (isEconomyAnalysis && currencies.length > 0) {
      return data.map((session) => {
        session = session.filter((s) => {
          if (s.currencyID) {
            return selectedCurrencies.includes(s.currencyID);
          } else {
            return true;
          }
        });
        return session;
      });
    } else {
      if (
        !panelSettings.hiddenEvents ||
        panelSettings.hiddenEvents.length === 0
      )
        return data;
      return data.map((session) => {
        session = session.filter(
          (e) =>
            !panelSettings.hiddenEvents.some((hiddenID) => hiddenID === e.id)
        );
        return session;
      });
    }
  }
  function toggleSelectedCurrency(nodeID) {
    setSelectedCurrencies((prevCurrs) =>
      prevCurrs.includes(nodeID)
        ? prevCurrs.filter((curr) => curr !== nodeID)
        : [...prevCurrs, nodeID]
    );
  }
  const [openSegmentBuilder, setOpenSegmentBuilder] = useState(false);
  const [viewingProfile, setViewingProfile] = useState([]);
  const [selectedClientIDs, setSelectedClientIDs] = useState([]);

  async function onProfileViewed(clientIDs) {
    setIsLoading(true);

    const resp = await getPlayersProfileByClientIDs({
      gameID: game.gameID,
      branch: branch,
      clientIDs: clientIDs,
    });
    if (resp.success) {
      function makeAvgProfile(players) {
        if (!players) return;

        const templateNames = []
          .concat(
            elements.analytics.map((template) => ({
              name: template.templateName,
              id: template.templateID,
            }))
          )
          .concat(
            elements.statistics.map((template) => ({
              name: template.templateName,
              id: template.templateID,
            }))
          )
          .concat(
            elements.inventory.map((template) => ({
              name: template.templateName,
              id: template.templateID,
            }))
          );

        let elementData = {};

        for (let player of players) {
          let elements = player.elements;

          for (let element of elements) {
            let { elementID, elementValue } = element;
            if (!elementData[elementID]) {
              elementData[elementID] = {
                name:
                  templateNames.find((t) => t.id === elementID)?.name ||
                  elementID,
                templateID: elementID,
                totalPlayers: 0,
                subProfiles: {},
              };
            }

            elementData[elementID].totalPlayers++;

            if (!elementData[elementID].subProfiles[elementValue]) {
              elementData[elementID].subProfiles[elementValue] = {
                value: elementValue,
                players: 0,
              };
            }

            elementData[elementID].subProfiles[elementValue].players++;
          }
        }

        let avgProfile = Object.values(elementData).map((element) => {
          let maxSubProfile = Object.values(element.subProfiles).reduce(
            (a, b) => (a.players > b.players ? a : b)
          );
          let subProfiles = Object.values(element.subProfiles).filter(
            (subProfile) => subProfile.value !== maxSubProfile.value
          );
          return {
            name: element.name,
            value: maxSubProfile.value,
            templateID: element.templateID,
            players: maxSubProfile.players,
            subProfiles: subProfiles,
          };
        });
        return avgProfile;
      }
      setSelectedClientIDs(clientIDs);
      setViewingProfile(makeAvgProfile(resp.players));
      setOpenSegmentBuilder(true);
    }
    setIsLoading(false);
  }

  const handleCloseChurnModal = () => {
    setShowChurnModal(false);
  };

  return (
    <div className={s.mainContainer}>
      <Helmet>
        <title>{titles.ub_engagement}</title>
      </Helmet>

      <ChurnAnalysisModal
        open={showChurnModal}
        onClose={handleCloseChurnModal}
        sessionsData={data}
        funnelEvents={funnelEvents}
        designEvents={designEvents}
      />

      <PortableSegmentBuilder
        profiles={[viewingProfile]}
        open={openSegmentBuilder}
        close={() => setOpenSegmentBuilder(false)}
        selectedClientIDs={selectedClientIDs}
      />

      <div
        className={`${s.upperbar} ${!expandFunnel || isEconomyAnalysis ? s.upperbarClosed : ""}`}
      >
        {!isEconomyAnalysis && (
          <div className={`${s.funnelContainer}`}>
            <FunnelBuilder
              expanded={expandFunnel}
              data={data}
              onFunnelChanged={onFunnelEventsChange}
              designEvents={designEvents}
            />

            <Button
              variant="contained"
              sx={{
                height: "25px",
                position: "absolute",
                bottom: "-25px",
                zIndex: "2",
                backgroundColor: expandFunnel ? "#32325c" : "#6a69bd",
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              }}
              onClick={() => setExpandFunnel(!expandFunnel)}
            >
              {expandFunnel ? <ExpandLess /> : <ExpandMore />}
            </Button>
          </div>
        )}

        {currencies && isEconomyAnalysis && (
          <Box sx={{ display: "flex", p: 1.5, gap: 1 }}>
            {currencies.map((curr) => (
              <Button
                onClick={() => toggleSelectedCurrency(curr.nodeID)}
                variant={
                  selectedCurrencies.includes(curr.nodeID)
                    ? "contained"
                    : "outlined"
                }
                sx={{
                  zIndex: "2",
                }}
              >
                {curr.icon && (
                  <img
                    style={{ width: 40, marginRight: "1rem" }}
                    src={curr.icon}
                    alt=""
                  />
                )}
                {curr.name}
              </Button>
            ))}
          </Box>
        )}
        <Button
          variant="contained"
          sx={{
            height: "45px",
            right: "15px",
            position: "absolute",
            bottom: "-60px",
            zIndex: "2",
          }}
          onClick={() => {
            setIsEconomyAnalysis(!isEconomyAnalysis);
          }}
        >
          {isEconomyAnalysis ? "Regular Analysis" : "Economy Analysis"}
        </Button>
      </div>

      <div style={{ position: "relative", height: "100%" }}>
        <Backdrop
          sx={{ color: "#fff", zIndex: 2, position: "absolute" }}
          open={isLoading}
        >
          <CircularProgress color="inherit" />
        </Backdrop>

        <BehaviorTree
          data={data}
          isEconomyAnalysis={isEconomyAnalysis}
          settings={panelSettings}
          funnelEvents={isEconomyAnalysis ? [] : funnelEvents}
          onCorrelationDataGenerated={onCorrelationDataGenerated}
          designEvents={designEvents}
          onProfileViewed={onProfileViewed}
        />
      </div>

      <BehTreePanel
        onSettingsChange={onSettingsChange}
        isEconomyAnalysis={isEconomyAnalysis}
        onShowChurn={() => setShowChurnModal(true)}
      />

      {!isEconomyAnalysis && (
        <CorrelationTable
          correlationData={correlationData}
          allAnalyticsEvents={allAnalyticsEvents}
        />
      )}
    </div>
  );
};

export default Engagement;
