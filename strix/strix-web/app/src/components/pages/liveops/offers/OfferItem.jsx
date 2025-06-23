import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Grid,
  IconButton,
  Popover,
  Button,
  Typography,
  TextField,
  InputAdornment,
  Tooltip,
  Collapse,
  Box,
  Chip,
  Paper,
  Card,
  CardContent,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  CloudUpload as CloudUploadIcon,
  OpenInNew as OpenInNewIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from "@mui/icons-material";

import useApi from "@strix/api";
import { useBranch, useGame } from "@strix/gameContext";

// Components
import EntityItem from "./EntityItem";
import AddEntity from "./addComponents/AddEntity";
import AddTags from "../../../shared/AddTags.jsx";
import SetPrice from "./addComponents/SetPrice";
import OfferAnalyticsSection from "./OfferAnalyticsSection";
import AddLinkedEntity from "./addComponents/AddLinkedEntity.jsx";
import languages from "../localization/languages.js";

const OfferItem = ({
  offer,
  onOfferChange,
  onOfferRemove,
  onOfferClone,
  allOffersIDs,
  gameModelFunctions,
  entities,
  segments,
  tags,
  localization,
  pricing,
  exchangeRates,
  exchangeRates_USD,
}) => {
  const { game, getEntitiesByNodeIDs_cache, setGetEntitiesByNodeIDs_cache } =
    useGame();
  const { branch } = useBranch();
  const { getEntitiesByNodeIDs, gameModelManageFunctionLinkedConfigValue } =
    useApi();

  const [offerState, setOfferState] = useState(offer);
  const [entitiesContent, setEntitiesContent] = useState([]);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const [openAnalytics, setOpenAnalytics] = useState(false);
  const [errorDuplicateID, setErrorDuplicateID] = useState(false);
  const [durationUnit, setDurationUnit] = useState(
    offer.offerDuration?.timeUnit || "days"
  );

  // Local input states for debouncing
  const [localOfferName, setLocalOfferName] = useState(offer.offerName);
  const [localOfferID, setLocalOfferID] = useState(offer.offerCodeName);

  const fileInputRef = useRef(null);
  const initialLoadRef = useRef(true);

  // Debounce timers
  const nameDebounceRef = useRef(null);
  const idDebounceRef = useRef(null);

  const durationOptions = ["days", "hours", "minutes", "seconds"];
  const settingsOpened = Boolean(settingsAnchorEl);

  // Utility functions
  const trimStr = (str, maxLength) => {
    if (!str) return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const handleIntegerInput = (value) => {
    if (value === undefined) return "";
    return value.replace(/[^0-9]/g, "");
  };

  // Sync with external offer changes
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    setOfferState(offer);
    setLocalOfferName(offer.offerName);
    setLocalOfferID(offer.offerCodeName);
  }, []);

  // Settings handlers
  const handleClickSettings = (e) => setSettingsAnchorEl(e.currentTarget);
  const handleCloseSettings = () => setSettingsAnchorEl(null);

  // File upload handlers
  const handleFileUpload = () => fileInputRef.current?.click();

  const handleFileChange = useCallback(
    (event) => {
      const selectedFile = event.target.files[0];
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newState = { ...offerState, offerIcon: e.target.result };
          setOfferState(newState);
          onOfferChange(newState);
        };
        reader.readAsDataURL(selectedFile);
      }
    },
    [offerState, onOfferChange]
  );

  const clearImage = useCallback(() => {
    const newState = { ...offerState, offerIcon: "" };
    setOfferState(newState);
    onOfferChange(newState);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  }, [offerState, onOfferChange]);

  // Entity content management
  const getEntitiesContent = useCallback(async () => {
    const uniqueContentMap = {};
    offerState.content.forEach((entity) => {
      if (!uniqueContentMap[entity.nodeID]) {
        uniqueContentMap[entity.nodeID] = entity;
      }
    });

    const uniqueNodeIDs = Object.keys(uniqueContentMap);
    if (uniqueNodeIDs.length === 0) {
      setEntitiesContent([]);
      return;
    }

    if (
      uniqueNodeIDs.every((id) => getEntitiesByNodeIDs_cache[id] !== undefined)
    ) {
      const tempContent = uniqueNodeIDs.map((id) => ({
        ...getEntitiesByNodeIDs_cache[id],
        amount: uniqueContentMap[id].amount,
      }));
      setEntitiesContent(tempContent);
    } else {
      const res = await getEntitiesByNodeIDs({
        gameID: game.gameID,
        branch,
        nodeIDs: uniqueNodeIDs,
      });
      if (res.success) {
        const tempContent = res.entities.map((entity) => ({
          ...entity,
          amount: uniqueContentMap[entity.nodeID].amount,
        }));
        setEntitiesContent(tempContent);
        res.entities.forEach((e) => {
          setGetEntitiesByNodeIDs_cache((prevCache) => ({
            ...prevCache,
            [e.nodeID]: e,
          }));
        });
      }
    }
  }, [
    offerState.content,
    getEntitiesByNodeIDs_cache,
    game.gameID,
    branch,
    getEntitiesByNodeIDs,
    setGetEntitiesByNodeIDs_cache,
  ]);

  // Load entities content when content changes
  useEffect(() => {
    getEntitiesContent();
  }, []);

  // Offer state update handlers with immediate sync
  const updateOfferState = useCallback(
    (updater) => {
      setOfferState((prevState) => {
        const newState =
          typeof updater === "function" ? updater(prevState) : updater;
        // Immediate sync to parent
        onOfferChange(newState);
        return newState;
      });
    },
    [onOfferChange]
  );

  // Debounced offer name handler
  const handleOfferNameChange = useCallback(
    (newName) => {
      setLocalOfferName(newName);

      // Clear existing timeout
      if (nameDebounceRef.current) {
        clearTimeout(nameDebounceRef.current);
      }

      // Set new timeout
      nameDebounceRef.current = setTimeout(() => {
        setOfferState((prevState) => {
          const newState = { ...prevState, offerName: newName };
          onOfferChange(newState);
          return newState;
        });
      }, 300); // 300ms debounce
    },
    [onOfferChange]
  );

  // Debounced offer ID handler
  const handleOfferIDChange = useCallback(
    (newID) => {
      const trimmedID = trimStr(newID.replace(/\s/g, ""), 30);
      setLocalOfferID(trimmedID);

      const isDuplicate =
        allOffersIDs.filter((id) => id === trimmedID).length > 0;
      setErrorDuplicateID(isDuplicate);

      if (!isDuplicate) {
        // Clear existing timeout
        if (idDebounceRef.current) {
          clearTimeout(idDebounceRef.current);
        }

        // Set new timeout
        idDebounceRef.current = setTimeout(() => {
          setOfferState((prevState) => {
            const newState = { ...prevState, offerCodeName: trimmedID };
            onOfferChange(newState);
            return newState;
          });
        }, 300); // 300ms debounce
      }
    },
    [allOffersIDs, onOfferChange]
  );

  const setOfferPrice = useCallback(
    (newPrice) => {
      updateOfferState((prev) => {
        if (prev.offerPrice.isDerivedAmount && !newPrice.isDerivedAmount) {
          removeDerivedValueLink();
        }
        if (newPrice.isDerivedAmount === true) {
          setDerivedValueLink({
            overrideNewFunctionID: newPrice.derivedAmount,
          });
        }
        return { ...prev, offerPrice: newPrice };
      });
    },
    [updateOfferState]
  );

  const setOfferDurationAmount = useCallback(
    (newDuration) => {
      updateOfferState((prev) => ({
        ...prev,
        offerDuration: { ...prev.offerDuration, value: newDuration },
      }));
    },
    [updateOfferState]
  );

  const setOfferDurationTimeUnit = useCallback(
    (newUnit) => {
      updateOfferState((prev) => ({
        ...prev,
        offerDuration: { ...prev.offerDuration, timeUnit: newUnit },
      }));
      setDurationUnit(newUnit);
    },
    [updateOfferState]
  );

  const setOfferEntityAmount = useCallback(
    (nodeID, newAmount) => {
      updateOfferState((prev) => ({
        ...prev,
        content: prev.content.map((entity) => {
          if (entity.nodeID === nodeID) {
            return {
              ...entity,
              amount: clamp(
                handleIntegerInput(newAmount),
                1,
                Number.MAX_SAFE_INTEGER
              ),
            };
          }
          return entity;
        }),
      }));
    },
    [updateOfferState]
  );

  const removeEntityFromOffer = useCallback(
    (nodeID) => {
      updateOfferState((prev) => ({
        ...prev,
        content: prev.content.filter((entity) => entity.nodeID !== nodeID),
      }));
    },
    [updateOfferState]
  );

  const setOfferNewEntity = useCallback(
    (newEntity, amount) => {
      updateOfferState((prev) => ({
        ...prev,
        content: [
          ...prev.content,
          {
            nodeID: newEntity.nodeID,
            amount: clamp(
              handleIntegerInput(amount),
              1,
              Number.MAX_SAFE_INTEGER
            ),
          },
        ],
      }));
    },
    [updateOfferState]
  );

  const setOfferNewTag = useCallback(
    (newTag) => {
      if (!newTag) return;
      updateOfferState((prev) => ({
        ...prev,
        offerTags: [...prev.offerTags, newTag],
      }));
    },
    [updateOfferState]
  );

  const removeTagFromOffer = useCallback(
    (tag) => {
      updateOfferState((prev) => ({
        ...prev,
        offerTags: prev.offerTags.filter((s) => s !== tag),
      }));
    },
    [updateOfferState]
  );

  const setOfferLimit = useCallback(
    (newLimit) => {
      updateOfferState((prev) => ({ ...prev, purchaseLimit: newLimit }));
    },
    [updateOfferState]
  );

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (nameDebounceRef.current) {
        clearTimeout(nameDebounceRef.current);
      }
      if (idDebounceRef.current) {
        clearTimeout(idDebounceRef.current);
      }
    };
  }, []);

  // Derived value handlers
  const setDerivedValueLink = useCallback(
    async ({ overrideNewFunctionID }) => {
      await gameModelManageFunctionLinkedConfigValue({
        gameID: game.gameID,
        branch,
        valueID: `${offerState.offerID}|priceAmount`,
        actionType: "set",
        changes: {
          valueSID: `${offerState.offerID}|priceAmount`,
          valueID: "priceAmount",
          valueType: "priceAmount",
          nodeID: offerState.offerID,
          linkedFunctionID: overrideNewFunctionID || "",
        },
      });
    },
    [
      gameModelManageFunctionLinkedConfigValue,
      game.gameID,
      branch,
      offerState.offerID,
    ]
  );

  const removeDerivedValueLink = useCallback(async () => {
    await gameModelManageFunctionLinkedConfigValue({
      gameID: game.gameID,
      branch,
      valueSID: `${offerState.offerID}|priceAmount`,
      actionType: "remove",
    });
  }, [
    gameModelManageFunctionLinkedConfigValue,
    game.gameID,
    branch,
    offerState.offerID,
  ]);

  // Localization helpers
  const getLanguageByCode = (code) => {
    return languages.find((language) => language.code === code);
  };

  const getLanguageFlag = (type) => {
    const loc = type === "name" ? localization.name : localization.desc;
    if (!loc?.translations?.length) return "";
    return getLanguageByCode(loc.translations[0].code)?.flag || "";
  };

  const getLocalizedText = (type) => {
    if (!localization) return "";
    const loc = type === "name" ? localization.name : localization.desc;
    return loc?.translations?.[0]?.value || "";
  };

  const openLocalization = () => {
    setTimeout(() => {
      window.open("/localization?tab=1", "_blank", "noreferrer");
    }, 100);
  };

  const visibleTags = useMemo(
    () => offerState.offerTags.slice(0, 5),
    [offerState.offerTags]
  );
  const hiddenTagsCount = offerState.offerTags.length - 5;

  return (
    <Card
      elevation={3}
      sx={{
        mb: 4,
        borderRadius: 3,
        overflow: "visible",
        border: openAnalytics ? "none" : undefined,
        borderBottomLeftRadius: openAnalytics ? "1rem" : 3,
        borderBottomRightRadius: openAnalytics ? "1rem" : 3,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <IconButton onClick={handleClickSettings}>
            <MoreVertIcon />
          </IconButton>

          <Tooltip
            open={errorDuplicateID}
            title="Offer ID must be unique"
            placement="bottom"
          >
            <TextField
              size="small"
              value={localOfferID}
              onChange={(e) => handleOfferIDChange(e.target.value)}
              error={errorDuplicateID}
              sx={{ width: 200 }}
              placeholder="Offer ID"
              helperText={errorDuplicateID ? "ID must be unique" : ""}
            />
          </Tooltip>

          <TextField
            size="small"
            value={localOfferName}
            onChange={(e) => handleOfferNameChange(e.target.value)}
            placeholder="Offer Name"
            sx={{ flexGrow: 1 }}
          />

          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
            {hiddenTagsCount > 0 && (
              <Tooltip title={offerState.offerTags.join(", ")} placement="top">
                <Typography variant="caption" color="text.secondary">
                  +{hiddenTagsCount} more tags
                </Typography>
              </Tooltip>
            )}
            {visibleTags.map((tag) => (
              <Chip
                key={tag}
                label={trimStr(tag, 10)}
                size="small"
                onDelete={() => removeTagFromOffer(tag)}
                sx={{ maxWidth: 120 }}
              />
            ))}
            <AddTags
              tags={tags}
              tagsInUse={offerState.offerTags || []}
              onTagAdded={setOfferNewTag}
            />
          </Stack>
        </Stack>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Icon Upload */}
          <Grid item xs={12} md={3}>
            <Box sx={{ position: "relative" }}>
              {offerState.offerIcon && (
                <IconButton
                  onClick={clearImage}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    backgroundColor: "background.paper",
                  }}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              )}

              <Button
                component="label"
                variant="outlined"
                startIcon={!offerState.offerIcon && <CloudUploadIcon />}
                sx={{
                  width: "100%",
                  height: 180,
                  borderRadius: 2,
                  borderStyle: "dashed",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  p: offerState.offerIcon ? 0 : 2,
                }}
              >
                {offerState.offerIcon ? (
                  <Box
                    component="img"
                    src={offerState.offerIcon}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Upload Icon
                  </Typography>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".png,.jpg,.jpeg"
                  style={{ display: "none" }}
                />
              </Button>
            </Box>
          </Grid>

          {/* Localization */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <TextField
                label="In-game Name"
                value={getLocalizedText("name")}
                onClick={openLocalization}
                disabled
                InputProps={{
                  readOnly: true,
                  startAdornment: getLanguageFlag("name") && (
                    <InputAdornment position="start">
                      <Box
                        component="img"
                        src={`https://flagcdn.com/w20/${getLanguageFlag("name").toLowerCase()}.png`}
                        width={20}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <OpenInNewIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ cursor: "pointer" }}
                size="small"
              />

              <TextField
                label="In-game Description"
                value={trimStr(getLocalizedText("desc"), 60)}
                onClick={openLocalization}
                multiline
                maxRows={4}
                disabled
                InputProps={{
                  readOnly: true,
                  startAdornment: getLanguageFlag("desc") && (
                    <InputAdornment position="start">
                      <Box
                        component="img"
                        src={`https://flagcdn.com/w20/${getLanguageFlag("desc").toLowerCase()}.png`}
                        width={20}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <OpenInNewIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ cursor: "pointer" }}
                size="small"
              />
            </Stack>
          </Grid>

          {/* Options */}
          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              <Box sx={{display: "flex", gap: 1}}>
                Price:
                <SetPrice
                  gameModelFunctions={gameModelFunctions}
                  onPriceChanged={setOfferPrice}
                  entities={entities}
                  offerStatePrice={offerState.offerPrice}
                  pricing={pricing}
                  exchangeRates_USD={exchangeRates_USD}
                  exchangeRates={exchangeRates}
                />
              </Box>

              <Stack direction="row" spacing={1}>
                <TextField
                  label="Duration"
                  value={offerState.offerDuration.value}
                  onChange={(e) => setOfferDurationAmount(e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={durationUnit}
                    label="Unit"
                    onChange={(e) => setOfferDurationTimeUnit(e.target.value)}
                  >
                    {durationOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <TextField
                label="Purchase Limit"
                value={offerState.offerPurchaseLimit}
                onChange={(e) =>
                  setOfferLimit(handleIntegerInput(e.target.value))
                }
                size="small"
                helperText="0 = unlimited"
              />
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Content and Linked Entities */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Typography variant="h6" gutterBottom>
                Content
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  minHeight: 160,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  alignContent: "flex-start",
                }}
              >
                {entitiesContent.map((entity) => (
                  <EntityItem
                    key={entity.nodeID}
                    entity={entity}
                    onRemove={removeEntityFromOffer}
                    onAmountChanged={setOfferEntityAmount}
                  />
                ))}
                <AddEntity
                  onEntityAdded={setOfferNewEntity}
                  onAmountChanged={setOfferEntityAmount}
                  entities={entities}
                  offerStateContent={offerState.content}
                />
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Typography variant="h6" gutterBottom>
                Linked Entities
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  minHeight: 160,
                }}
              >
                <Stack spacing={1}>
                  {offerState.linkedEntities.map((nodeID) => {
                    const entity = entities.find((e) => e.nodeID === nodeID);
                    return (
                      <Stack
                        key={nodeID}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          p: 1,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2">
                          {trimStr(entity?.name, 25)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateOfferState((prev) => ({
                              ...prev,
                              linkedEntities: prev.linkedEntities.filter(
                                (id) => id !== nodeID
                              ),
                            }))
                          }
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    );
                  })}
                  <AddLinkedEntity
                    onLinkedEntityAdded={(nodeID) =>
                      updateOfferState((prev) => ({
                        ...prev,
                        linkedEntities: [...prev.linkedEntities, nodeID],
                      }))
                    }
                    entities={entities}
                    offerState={offerState}
                  />
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>

      {/* Settings Popover */}
      <Popover
        open={settingsOpened}
        anchorEl={settingsAnchorEl}
        onClose={handleCloseSettings}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Stack sx={{ p: 2 }}>
          <Button onClick={() => setOpenAnalytics(!openAnalytics)}>
            Toggle Analytics
          </Button>
          <Button onClick={() => onOfferClone(offerState)}>Clone</Button>
          <Button
            onClick={() => onOfferRemove(offer.offerID)}
            color="error"
          >
            Remove
          </Button>
        </Stack>
      </Popover>

      {/* Analytics Section */}
      <Collapse in={openAnalytics} timeout="auto" unmountOnExit>
        <Paper
          sx={{
            borderTop: 1,
            borderColor: "divider",
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: "1rem",
            borderBottomRightRadius: "1rem",
            backgroundColor: "var(--regular-card-bg-color)",
            overflow: "hidden",
          }}
        >
          <OfferAnalyticsSection
            segments={segments}
            offerID={offerState.offerID}
            isRealMoney={offerState.offerPrice.targetCurrency === "money"}
          />
        </Paper>
      </Collapse>
    </Card>
  );
};

export default OfferItem;
