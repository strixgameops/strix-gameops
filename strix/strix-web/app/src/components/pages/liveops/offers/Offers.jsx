import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Helmet } from "react-helmet";
import titles from "titles";
import {
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Container,
  Backdrop,
  CircularProgress,
  Stack,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

import { useBranch, useGame } from "@strix/gameContext";
import { useAlert } from "@strix/alertsContext";
import useApi from "@strix/api";
import dayjs from "dayjs";
import { customAlphabet } from "nanoid";

import OfferItem from "./OfferItem";
import PositionItem from "./PositionItem";
import RegionalPricing from "./RegionalPricing";
import SearchWrapper from "shared/searchFramework/SearchWrapper.jsx";

const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);

function CustomTabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`offers-tabpanel-${index}`}
      aria-labelledby={`offers-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Offers = () => {
  const { game } = useGame();
  const { branch } = useBranch();
  const { triggerAlert } = useAlert();

  const {
    getAllSegmentsForAnalyticsFilter,
    getEntitiesIDs,
    createNewOffer,
    getOffers,
    updateOffer,
    getLocalizationItems,
    removeOffer,
    getPositionedOffers,
    updatePositionedOffers,
    removePositionedOffer,
    getPricing,
    getRegionalPrices,
    getABTests,
    getBalanceModel,
  } = useApi();

  const baseCurr =
    game.apiKeys?.find((key) => key.service === "googleplayservices")
      ?.secondary || "USD";

  // State
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [offers, setOffers] = useState([]);
  const [filteredOffers, setFilteredOffers] = useState([]);
  const [positions, setPositions] = useState([]);
  const [localizations, setLocalizations] = useState([]);
  const [exchangeRates, setExchangeRates] = useState(undefined);
  const [exchangeRates_USD, setExchangeRates_USD] = useState(undefined);
  const [tabs, setTabs] = useState(0);
  const [segmentsList, setSegmentsList] = useState([]);
  const [segmentsListFull, setSegmentsListFull] = useState([]);
  const [tagsList, setTagsList] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [abTests, setAbTests] = useState([]);
  const [gameModelFunctions, setGameModelFunctions] = useState([]);
  const [entities, setEntities] = useState([]);

  // Refs for debouncing
  const updateTimeouts = useRef(new Map());
  const pendingUpdates = useRef(new Map());

  // Handlers
  const handleTabChange = (event, newValue) => setTabs(newValue);

  const extractTags = useCallback((offers) => {
    return offers.reduce((acc, curr) => [...acc, ...curr.offerTags], []);
  }, []);

  const getTagsList = useMemo(() => {
    return Array.from(new Set(tagsList));
  }, [tagsList]);

  // Data fetching
  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [
        functionsResp,
        offersResp,
        positionsResp,
        testsResp,
        segmentsResp,
        entitiesResp,
        pricingResp,
        exchangeResp,
        exchangeUSDResp,
      ] = await Promise.all([
        getBalanceModel({
          gameID: game.gameID,
          branch,
          specificTypes: ["functions"],
        }),
        getOffers({ gameID: game.gameID, branch }),
        getPositionedOffers({ gameID: game.gameID, branch }),
        getABTests({ gameID: game.gameID, branch: branch }),
        getAllSegmentsForAnalyticsFilter({
          gameID: game.gameID,
          branch: branch,
        }),
        getEntitiesIDs({ gameID: game.gameID, branch }),
        getPricing({ gameID: game.gameID, branch }),
        getRegionalPrices({
          baseCurrency: baseCurr.toLowerCase(),
          date: dayjs.utc().subtract(1, "month").format("YYYY-MM-DD"),
        }),
        getRegionalPrices({
          baseCurrency: "usd",
          date: dayjs.utc().subtract(1, "month").format("YYYY-MM-DD"),
        }),
      ]);

      // Process functions
      if (functionsResp.result.functions) {
        setGameModelFunctions(
          functionsResp.result.functions.map((f) => ({
            name: f.name,
            id: f.functionID,
          }))
        );
      }

      // Process offers
      if (offersResp.success) {
        const localizations = [];
        const tempOffers = offersResp.offers.map((offer) => {
          localizations.push({
            offerID: offer.offerID,
            name: offer.offerInGameName,
            descr: offer.offerInGameDescription,
          });
          return { ...offer };
        });
        setOffers(tempOffers);

        // Fetch localizations
        if (localizations.length > 0) {
          const locals = await getLocalizationItems({
            gameID: game.gameID,
            branch,
            type: "offers",
            sids: localizations
              .map((l) => l.name)
              .concat(localizations.map((l) => l.descr)),
          });
          if (locals?.success) {
            setLocalizations(locals.localizations);
          }
        }
      }

      // Process other data
      if (positionsResp?.success) setPositions(positionsResp.positions);
      if (testsResp.success) setAbTests(testsResp.abTests);
      if (entitiesResp.success) setEntities(entitiesResp.entities);
      if (pricingResp.success) setPricing(pricingResp.templates);

      // Process segments
      if (segmentsResp.success) {
        const segments = segmentsResp.message;
        setSegmentsListFull([...segments]);
        setSegmentsList(segments.filter((s) => s.segmentID !== "everyone"));
      }

      setExchangeRates(exchangeResp);
      setExchangeRates_USD(exchangeUSDResp);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [
    game.gameID,
    branch,
    baseCurr,
    getBalanceModel,
    getOffers,
    getPositionedOffers,
    getABTests,
    getAllSegmentsForAnalyticsFilter,
    getEntitiesIDs,
    getPricing,
    getRegionalPrices,
    getLocalizationItems,
  ]);

  // Debounced API update function
  const performOfferUpdate = useCallback(
    async (offer) => {
      try {
        const cleanedOffer = { ...offer };
        delete cleanedOffer.analytics;
        
        if (cleanedOffer.price?.targetCurrency === "money") {
          cleanedOffer.price.pricingTemplateAsku =
            cleanedOffer.price.pricingTemplateAsku.map((curr) => ({
              ...curr,
              amount: curr.amount === "" ? 0 : curr.amount,
            }));
        }

        await updateOffer({
          gameID: game.gameID,
          branch,
          offerObj: cleanedOffer,
        });

        // Clear the pending update after successful API call
        pendingUpdates.current.delete(offer.offerID);
      } catch (error) {
        console.error("Error updating offer:", error);
        
        // Revert to the last known state on error
        const originalOffer = pendingUpdates.current.get(offer.offerID);
        if (originalOffer) {
          setOffers((prevOffers) =>
            prevOffers.map((o) => 
              o.offerID === offer.offerID ? originalOffer : o
            )
          );
          pendingUpdates.current.delete(offer.offerID);
        }
        
        triggerAlert("Failed to update offer", "error");
      }
    },
    [game.gameID, branch, updateOffer, triggerAlert]
  );

  // Offer management with debouncing
  const onOfferChange = useCallback(
    (offer) => {
      const offerID = offer.offerID;

      // Store the original offer state before any changes (only if not already stored)
      if (!pendingUpdates.current.has(offerID)) {
        const originalOffer = offers.find(o => o.offerID === offerID);
        if (originalOffer) {
          pendingUpdates.current.set(offerID, originalOffer);
        }
      }

      // Update state immediately for UI responsiveness
      setOffers((prevOffers) =>
        prevOffers.map((o) => (o.offerID === offerID ? offer : o))
      );

      // Clear existing timeout for this offer
      const existingTimeout = updateTimeouts.current.get(offerID);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout for API call
      const newTimeout = setTimeout(() => {
        performOfferUpdate(offer);
        updateTimeouts.current.delete(offerID);
      }, 500); // 0.5 second delay

      updateTimeouts.current.set(offerID, newTimeout);
    },
    [offers, performOfferUpdate]
  );

  // Cleanup function to clear all timeouts
  useEffect(() => {
    return () => {
      updateTimeouts.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      updateTimeouts.current.clear();
      pendingUpdates.current.clear();
    };
  }, []);

  const onOfferAdded = useCallback(async () => {
    const tempID = nanoid();
    const newOffer = {
      offerID: tempID,
      offerName: `Offer ${offers.length + 1}`,
      offerCodeName: `Offer ${offers.length + 1}`,
      offerIcon: "",
      offerInGameName: `${tempID}|name`,
      offerInGameDescription: `${tempID}|desc`,
      offerTags: [],
      offerPurchaseLimit: 0,
      offerDuration: { value: 0, timeUnit: "days" },
      offerPrice: {
        targetCurrency: "entity",
        nodeID: "",
        derivedAmount: "",
        isDerivedAmount: false,
        amount: 0,
        pricingTemplateAsku: "",
      },
      removed: false,
      linkedEntities: [],
      content: [],
    };

    setIsLoadingData(true);
    try {
      await createNewOffer({
        gameID: game.gameID,
        branch,
        offerObj: newOffer,
      });
      setOffers((prevOffers) => [newOffer, ...prevOffers]);
    } catch (error) {
      console.error("Error creating offer:", error);
      triggerAlert("Failed to create offer", "error");
    } finally {
      setIsLoadingData(false);
    }
  }, [offers.length, game.gameID, branch, createNewOffer, triggerAlert]);

  const onRemoveOffer = useCallback(
    async (offerID) => {
      const relatedTest = abTests.find((t) =>
        t.subject.some((s) => s.itemID === offerID)
      );
      if (relatedTest) {
        triggerAlert(
          `Cannot remove offer because of ongoing AB test "${relatedTest.name}". Stop & remove the test first.`,
          "error"
        );
        return;
      }

      // Clear any pending updates for this offer
      const existingTimeout = updateTimeouts.current.get(offerID);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        updateTimeouts.current.delete(offerID);
      }
      pendingUpdates.current.delete(offerID);

      setIsLoadingData(true);
      try {
        const resp = await removeOffer({
          gameID: game.gameID,
          branch,
          offerID,
        });
        if (resp.success) {
          setOffers((prevOffers) =>
            prevOffers.filter((o) => o.offerID !== offerID)
          );
        }
      } catch (error) {
        console.error("Error removing offer:", error);
        triggerAlert("Failed to remove offer", "error");
      } finally {
        setIsLoadingData(false);
      }
    },
    [abTests, game.gameID, branch, removeOffer, triggerAlert]
  );

  const onCloneOffer = useCallback(
    async (offer) => {
      const tempID = nanoid();
      const tempOffer = {
        ...offer,
        offerID: tempID,
        offerName: `${offer.offerName} (copy)`,
        offerCodeName: `${offer.offerCodeName}${offers.length + 1}`,
        offerInGameName: `${tempID}|name`,
        offerInGameDescription: `${tempID}|desc`,
      };

      try {
        const resp = await createNewOffer({
          gameID: game.gameID,
          branch,
          offerObj: tempOffer,
        });
        if (resp.success) {
          setOffers((prevOffers) => [...prevOffers, tempOffer]);
        }
      } catch (error) {
        console.error("Error cloning offer:", error);
        triggerAlert("Failed to clone offer", "error");
      }
    },
    [offers.length, game.gameID, branch, createNewOffer, triggerAlert]
  );

  // Position management
  const onPositionAdded = useCallback(() => {
    const newPos = {
      positionID: nanoid(),
      positionName: "New position",
      positionCodeName: "pos1",
      comment: "",
      segments: [{ segmentID: "everyone", offers: [] }],
    };
    setPositions((prevPositions) => [...prevPositions, newPos]);
    updatePositionedOffers({
      gameID: game.gameID,
      branch,
      positionID: newPos.positionID,
      position: newPos,
    });
  }, [game.gameID, branch, updatePositionedOffers]);

  const onPositionRemoved = useCallback(
    (positionID) => {
      setPositions((prevPositions) =>
        prevPositions.filter((position) => position.positionID !== positionID)
      );
      removePositionedOffer({ gameID: game.gameID, branch, positionID });
    },
    [game.gameID, branch, removePositionedOffer]
  );

  const onPositionUpdated = useCallback(
    (newPosition) => {
      setPositions((prevPositions) =>
        prevPositions.map((position) =>
          position.positionID === newPosition.positionID
            ? newPosition
            : position
        )
      );
      updatePositionedOffers({
        gameID: game.gameID,
        branch,
        positionID: newPosition.positionID,
        position: newPosition,
      });
    },
    [game.gameID, branch, updatePositionedOffers]
  );

  const onPositionCloned = useCallback(
    (positionID) => {
      const originalPosition = positions.find(
        (p) => p.positionID === positionID
      );
      const newPos = {
        ...originalPosition,
        positionName: `${originalPosition.positionName} (copy)`,
        positionCodeName: `${originalPosition.positionCodeName}-copy`,
        positionID: nanoid(),
      };
      setPositions([...positions, newPos]);
      updatePositionedOffers({
        gameID: game.gameID,
        branch,
        positionID: newPos.positionID,
        position: newPos,
      });
    },
    [positions, game.gameID, branch, updatePositionedOffers]
  );

  // Effects
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setTagsList(extractTags(offers));
  }, [offers]);

  // Memoized values
  const allOffersIDs = useMemo(
    () => offers.map((o) => o.offerCodeName),
    [offers]
  );

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        overflowY: "auto",
      }}
    >
      <Helmet>
        <title>{titles.lo_offers}</title>
      </Helmet>

      <Box sx={{ borderBottom: 1, borderColor: "divider", backgroundColor: "var(--upperbar-bg-color)" }}>
        <Tabs value={tabs} onChange={handleTabChange}>
          <Tab label="Offers" />
          <Tab label="Positioned Offers" />
          {window.__env.edition !== "community" && (<Tab label="Pricing" />)}
        </Tabs>
      </Box>

      <Backdrop open={isLoadingData} sx={{ color: "#fff", zIndex: 1300 }}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <CustomTabPanel value={tabs} index={0}>
        <Container maxWidth="xl">
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <SearchWrapper
              itemsToFilter={offers}
              segmentsEnabled={false}
              tagsEnabled={true}
              nameEnabled={true}
              possibleTags={getTagsList}
              possibleSegments={segmentsList}
              tagsMatcher={(item, tags) =>
                item.offerTags.some((tag) => tags.includes(tag))
              }
              nameMatcher={(item, name) =>
                item.offerName.toLowerCase().includes(name.toLowerCase())
              }
              onItemsFiltered={setFilteredOffers}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onOfferAdded}
              sx={{ minWidth: 140 }}
            >
              Add Offer
            </Button>
          </Stack>

          <Stack spacing={3}>
            {filteredOffers.map((offer) => (
              <OfferItem
                key={offer.offerID}
                gameModelFunctions={gameModelFunctions}
                segments={segmentsList}
                offer={offer}
                onOfferChange={onOfferChange}
                onOfferRemove={onRemoveOffer}
                onOfferClone={onCloneOffer}
                entities={entities}
                tags={tagsList}
                allOffersIDs={allOffersIDs}
                localization={{
                  name: localizations.find(
                    (l) => l.sid === `${offer.offerID}|name`
                  ),
                  desc: localizations.find(
                    (l) => l.sid === `${offer.offerID}|desc`
                  ),
                }}
                pricing={pricing}
                exchangeRates_USD={exchangeRates_USD}
                exchangeRates={exchangeRates}
              />
            ))}
          </Stack>
        </Container>
      </CustomTabPanel>

      <CustomTabPanel value={tabs} index={1}>
        <Container maxWidth="xl">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onPositionAdded}
            sx={{ mb: 3 }}
          >
            New Position
          </Button>

          <Stack spacing={3}>
            {positions.map((item) => (
              <PositionItem
                key={item.positionID}
                item={item}
                segmentsList={segmentsListFull}
                offersList={offers}
                onRemove={onPositionRemoved}
                onUpdate={onPositionUpdated}
                onClone={onPositionCloned}
              />
            ))}
          </Stack>
        </Container>
      </CustomTabPanel>

      <CustomTabPanel value={tabs} index={2}>
        <Container maxWidth="xl">
          <RegionalPricing
            onChange={setPricing}
            exchangeRates={exchangeRates}
          />
        </Container>
      </CustomTabPanel>
    </Container>
  );
};

export default Offers;