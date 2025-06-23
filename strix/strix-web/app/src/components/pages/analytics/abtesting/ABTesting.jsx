import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import titles from "titles";
import s from "./abtesting.module.css";
import { useGame, useBranch } from "@strix/gameContext";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import { customAlphabet } from "nanoid";

import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";
import NorthSharpIcon from "@mui/icons-material/NorthSharp";
import TargetChangeContainer from "./TargetChangeContainer";
import OfferIconPlaceholder from "shared/icons/OfferIconPlaceholder.jsx";
import { Popover } from "@mui/material";
import dayjs from "dayjs";
import SearchWrapper from "shared/searchFramework/SearchWrapper.jsx";

import TestObj from "./TestObj";

import useApi from "@strix/api";
const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);
import Input from "@mui/material/Input";

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

const ABTesting = () => {
  const {
    getAllSegmentsForAnalyticsFilter,
    getOffers,
    getEntitiesIDs,
    createABTest,
    removeABTest,
    getABTests,
    updateABTest,
    getPricing,
    getRegionalPrices,
    getPlanningNodes,
    getNodeTree,
    getAllAnalyticsEvents,
    getOffersNames,
    getCurrencyEntities,
  } = useApi();

  const { game } = useGame();
  const { branch, environment } = useBranch();

  const baseCurr =
    game.apiKeys?.find((key) => key.service === "googleplayservices")
      ?.secondary || "USD";

  const [tabs, setTabs] = React.useState(0);
  const handleTabChange = (event, newValue) => {
    setTabs(newValue);
  };
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [segmentsList, setSegmentsList] = useState([]);
  const [offers, setOffers] = useState([]);
  const [entities, setEntities] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});
  const [exchangeRates_USD, setExchangeRates_USD] = useState(undefined);
  const [allAnalyticsEvents, setAllAnalyticsEvents] = useState([]);

  const [offersNames, setOffersNames] = useState([]);
  const [entityCurrencies, setEntityCurrencies] = useState([]);

  const [nodeTree, setNodeTree] = useState([]);
  const [nodeData, setNodeData] = useState([]);

  const [filteredTests, setFilteredTests] = useState([]);

  // Getting segment list
  async function fetchSegmentList() {
    const response = await getAllSegmentsForAnalyticsFilter({
      gameID: game.gameID,
      branch: branch,
    });
    if (response.success) {
      setSegmentsList(response.message);
    }
  }

  // Fix: Separate function to fetch tests
  async function fetchABTests() {
    const response = await getABTests({
      gameID: game.gameID,
      branch: branch,
    });
    if (response.success) {
      let processedTests = response.abTests;
      setTests(processedTests);
    }
  }

  useEffect(() => {
    async function fetchNodes() {
      const nodeDataResponse = await getPlanningNodes({
        gameID: game.gameID,
        branch: branch,
        planningType: "entity",
      });
      setNodeData(nodeDataResponse.nodes);
      const treeDataResponse = await getNodeTree({
        gameID: game.gameID,
        branch: branch,
        planningType: "entity",
      });
      setNodeTree(treeDataResponse.nodes[0]);
    }
    fetchNodes();

    fetchSegmentList();
    async function fetchOffers() {
      const response = await getOffers({ gameID: game.gameID, branch: branch });
      if (response.success) {
        setOffers(response.offers);
      }
    }
    fetchOffers();
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

    // Fix: Call the separate fetchABTests function
    fetchABTests();

    async function fetchPricing() {
      const result = await getPricing({ gameID: game.gameID, branch });
      if (result.success) {
        setPricing(result.templates);
      }
    }
    fetchPricing();

    async function getExchange() {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const formatted = dayjs.utc(oneMonthAgo).format("YYYY-MM-DD").toString();
      const resp = await getRegionalPrices({
        baseCurrency: baseCurr.toLowerCase(),
        date: formatted,
      });
      setExchangeRates(resp);

      // Getting the default exchange rates for USD, so we can measure the limits of prices
      const respDef = await getRegionalPrices({
        baseCurrency: "usd",
        date: formatted,
      });
      setExchangeRates_USD(respDef);
    }
    getExchange();

    async function fetchEvents() {
      const resp = await getAllAnalyticsEvents({
        gameID: game.gameID,
        branch: branch,
      });
      if (resp) {
        setAllAnalyticsEvents(resp.events);
      }
    }
    fetchEvents();

    async function fetchOffersNames() {
      const offers = await getOffersNames({
        gameID: game.gameID,
        branch: branch,
      });
      setOffersNames(offers.offers);
      return offers.offers;
    }
    fetchOffersNames();

    async function fetchCurrencies() {
      const response = await getCurrencyEntities({
        gameID: game.gameID,
        branch: branch,
      });
      setEntityCurrencies(response.entities);
      return response.entities;
    }
    fetchCurrencies();
  }, []);

  const [tests, setTests] = useState([]);

  function getTestIndexById(id) {
    return tests.findIndex((test) => test.id === id);
  }
  function setTestName(newName, id) {
    const tempTests = [...tests];
    tempTests[getTestIndexById(id)].name = newName;
    setTests(tempTests);
    onTestUpdate(tempTests[getTestIndexById(id)]);
  }
  function setTestID(newID, id) {
    const tempTests = [...tests];
    tempTests[getTestIndexById(id)].codename = newID;
    setTests(tempTests);
    onTestUpdate(tempTests[getTestIndexById(id)]);
  }
  function setTestComment(newComment, id) {
    const tempTests = [...tests];
    tempTests[getTestIndexById(id)].comment = newComment;
    setTests(tempTests);
    onTestUpdate(tempTests[getTestIndexById(id)]);
  }
  function setTestStarted(id) {
    const tempTests = [...tests];
    tempTests[getTestIndexById(id)].startDate = dayjs.utc().toISOString();
    setTests(tempTests);
    onTestUpdate(tempTests[getTestIndexById(id)]);
  }
  function setTestSubject(newChangedFields, id) {
    const tempTests = [...tests];
    tempTests[getTestIndexById(id)].subject = newChangedFields;
    setTests(tempTests);
    onTestUpdate(tempTests[getTestIndexById(id)]);
  }
  function setTestSegment(newSegmentID, id) {
    const tempTests = [...tests];
    tempTests[getTestIndexById(id)].segments.control = newSegmentID;
    tempTests[getTestIndexById(id)].segments.test = newSegmentID;
    setTests(tempTests);
    onTestUpdate(tempTests[getTestIndexById(id)]);
  }
  function setTestSegmentShare(newShare, id) {
    const tempTests = [...tests];
    const parsedShare = parseFloat(newShare) / 100;
    const normalizedShare = Math.min(Math.max(parsedShare, 0.01), 1);
    if (isNaN(normalizedShare)) {
      tempTests[getTestIndexById(id)].segments.testShare = 0;
    } else {
      tempTests[getTestIndexById(id)].segments.testShare = normalizedShare;
    }
    setTests(tempTests);
    onTestUpdate(tempTests[getTestIndexById(id)]);
  }
  function setTestObservedMetric(newMetric, id) {
    const tempTests = [...tests];
    tempTests[getTestIndexById(id)].observedMetric = newMetric;
    setTests(tempTests);
    onTestUpdate(tempTests[getTestIndexById(id)]);
  }
  function setTestPaused(id) {
    const tempTests = [...tests];
    tempTests[getTestIndexById(id)].paused =
      !tempTests[getTestIndexById(id)].paused;
    setTests(tempTests);
    onTestUpdate(tempTests[getTestIndexById(id)]);
  }

  const [deletingTest, setDeletingTest] = useState(false);
  async function deleteTest(id, shouldArchive, archiveResult, shouldRollout) {
    let tempTests = [...tests];

    setDeletingTest(true);

    const resp = await removeABTest({
      gameID: game.gameID,
      branch: branch,
      testObject: tempTests[getTestIndexById(id)],
      shouldArchive,
      archiveResult,
      shouldRollout,
    });
    if (shouldArchive) {
      if (resp.success) {
        tempTests[getTestIndexById(id)].archived = true;
        tempTests[getTestIndexById(id)].archivedResult = archiveResult;
        setTests(JSON.parse(JSON.stringify(tempTests)));
      }
    } else {
      if (resp.success) {
        tempTests = tempTests.filter((t) => t.id !== id);
        setTests(JSON.parse(JSON.stringify(tempTests)));
      }
    }
    setDeletingTest(false);

    // Refetch segments, otherwise we would be able to select removed segment as control or test group in other tests
    fetchSegmentList();
  }

  async function addTest() {
    const tempTests = [...tests];
    const defaultTestObject = {
      id: nanoid(),
      codename: "abtest_" + nanoid(),
      name: `Test #${tests.length}`,
      comment: "Some description",
      segments: {
        control: "everyone",
        test: "everyone",
        testShare: 0.1,
      },
      observedMetric: [],
      subject: [],
      sampleSize: 0,
      startDate: "",
      paused: false,
      removed: false,
      archived: false,
      archivedResult: "",
    };

    const resp = await createABTest({
      gameID: game.gameID,
      branch: branch,
      testObject: defaultTestObject,
    });
    if (resp.success) {
      // Update the state with the new test immediately
      const updatedTests = [defaultTestObject, ...tempTests];
      setTests(updatedTests);
    }
  }

  const timeoutRef_Save = useRef(null);
  async function onTestUpdate(newTest) {
    clearTimeout(timeoutRef_Save.current);
    timeoutRef_Save.current = setTimeout(async () => {
      console.log("Updating test ", newTest);
      const resp = await updateABTest({
        gameID: game.gameID,
        branch: branch,
        testObject: newTest,
      });
    }, 1000);
  }

  return (
    <div className={s.mainContainer}>
      <Helmet>
        <title>{titles.abtesting}</title>
      </Helmet>

      <Backdrop sx={{ color: "#fff", zIndex: 2 }} open={isLoadingData}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <div className={s.navbarContainer}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", width: "100%" }}>
          <Tabs
            TabIndicatorProps={{}}
            value={tabs}
            onChange={handleTabChange}
            aria-label="abtesting navbar tabs"
          >
            <Tab label="tests" />
            <Tab label="archive" />
          </Tabs>
        </Box>
      </div>

      <div className={s.pageContent}>
        <CustomTabPanel value={tabs} index={0}>
          <div className={s.scrollableList}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                borderBottom: "1px solid #615ff449",
              }}
            >
              <Typography
                sx={{ m: 3, mb: 2 }}
                variant="body1"
                color={"text.secondary"}
              >
                Ongoing:{" "}
                {
                  tests
                    .filter((test) => test.archived === false)
                    .filter((test) => test.startDate !== "" && !test.paused)
                    .length
                }
              </Typography>

              <Typography
                sx={{ m: 3, mb: 2 }}
                variant="body1"
                color={"text.secondary"}
              >
                Not started:{" "}
                {
                  tests
                    .filter((test) => test.archived === false)
                    .filter((test) => test.startDate === "").length
                }
              </Typography>

              <Typography
                sx={{ m: 3, mb: 2 }}
                variant="body1"
                color={"text.secondary"}
              >
                Paused:{" "}
                {
                  tests
                    .filter((test) => test.archived === false)
                    .filter((test) => test.paused === true).length
                }
              </Typography>
            </Box>

            <Box
              sx={{ p: 2, pt: 2, pb: 0, display: "flex", alignItems: "center" }}
            >
              <SearchWrapper
                itemsToFilter={tests}
                segmentsEnabled={true}
                tagsEnabled={false}
                nameEnabled={true}
                possibleTags={[]}
                possibleSegments={segmentsList}
                segmentMatcher={(item, segments) => {
                  return (
                    segments.some((s) => item.segments.control === s) ||
                    segments.some((s) => item.segments.test === s)
                  );
                }}
                nameMatcher={(item, name) => {
                  return item.name.toLowerCase().indexOf(name) !== -1;
                }}
                onItemsFiltered={(filtered) => {
                  setFilteredTests(filtered);
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
                onClick={addTest}
              >
                Add new test
              </Button>
            </Box>

            <div className={s.testList}>
              {filteredTests
                .filter((test) => test.archived === false)
                .map((test, index) => (
                  <TestObj
                    key={test.id}
                    test={test}
                    index={index}
                    entities={entities}
                    segmentsList={segmentsList}
                    allAnalyticsEvents={allAnalyticsEvents}
                    offers={offers}
                    pricing={pricing}
                    exchangeRates_USD={exchangeRates_USD}
                    exchangeRates={exchangeRates}
                    nodeTree={nodeTree}
                    nodeData={nodeData}
                    offersNames={offersNames}
                    entityCurrencies={entityCurrencies}
                    game={game}
                    branch={branch}
                    environment={environment}
                    setTestName={setTestName}
                    setTestID={setTestID}
                    setTestComment={setTestComment}
                    setTestStarted={setTestStarted}
                    setTestPaused={setTestPaused}
                    setTestSegment={setTestSegment}
                    setTestSegmentShare={setTestSegmentShare}
                    setTestObservedMetric={setTestObservedMetric}
                    setTestSubject={setTestSubject}
                    onTestDelete={deleteTest}
                    deletingTest={deletingTest}
                  />
                ))}
            </div>
          </div>
        </CustomTabPanel>

        <CustomTabPanel value={tabs} index={1}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid #615ff449",
            }}
          >
            <Typography
              sx={{ m: 3, mb: 2 }}
              variant="body1"
              color={"text.secondary"}
            >
              Total:{" "}
              {filteredTests.filter((test) => test.archived === true).length}
            </Typography>

            <Typography
              sx={{ m: 3, mb: 2 }}
              variant="body1"
              color={"text.secondary"}
            >
              Successful:{" "}
              {
                filteredTests
                  .filter((test) => test.archived === true)
                  .filter((test) => test?.archiveResult === "success").length
              }
            </Typography>

            <Typography
              sx={{ m: 3, mb: 2 }}
              variant="body1"
              color={"text.secondary"}
            >
              Failed:{" "}
              {
                filteredTests
                  .filter((test) => test.archived === true)
                  .filter((test) => test?.archiveResult === "failure").length
              }
            </Typography>
          </Box>

          <div className={s.scrollableList}>
            <div className={s.testList}>
              {filteredTests
                .filter((test) => test.archived === true)
                .map((test, index) => (
                  <TestObj
                    key={test.id}
                    test={test}
                    index={index}
                    entities={entities}
                    segmentsList={segmentsList}
                    allAnalyticsEvents={allAnalyticsEvents}
                    offers={offers}
                    pricing={pricing}
                    exchangeRates_USD={exchangeRates_USD}
                    exchangeRates={exchangeRates}
                    nodeTree={nodeTree}
                    nodeData={nodeData}
                    offersNames={offersNames}
                    entityCurrencies={entityCurrencies}
                    game={game}
                    branch={branch}
                    environment={environment}
                    setTestName={setTestName}
                    setTestID={setTestID}
                    setTestComment={setTestComment}
                    setTestStarted={setTestStarted}
                    setTestPaused={setTestPaused}
                    setTestSegment={setTestSegment}
                    setTestSegmentShare={setTestSegmentShare}
                    setTestObservedMetric={setTestObservedMetric}
                    setTestSubject={setTestSubject}
                    onTestDelete={deleteTest}
                    deletingTest={deletingTest}
                  />
                ))}
            </div>
          </div>
        </CustomTabPanel>
      </div>
    </div>
  );
};

export default ABTesting;
