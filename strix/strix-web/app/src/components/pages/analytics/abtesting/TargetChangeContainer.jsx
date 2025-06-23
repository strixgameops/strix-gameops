import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
  Divider,
  Grid,
  Paper,
  Stack,
  Alert,
  Backdrop,
  CircularProgress,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Tooltip,
  Container,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  ArrowForward as ArrowForwardIcon,
  Remove as RemoveIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import imageCompression from "browser-image-compression";
import OfferIconPlaceholder from "shared/icons/OfferIconPlaceholder.jsx";
import SetPrice from "../../liveops/offers/addComponents/SetPrice";
import AddEntity from "../../liveops/offers/addComponents/AddEntity";
import EntityItem from "../../liveops/offers/EntityItem";
import useApi from "@strix/api";
import RemoteConfig from "../../planning/node/RemoteConfig/RemoteConfig";

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  border: `1px solid ${theme.palette.divider}`,
  transition: "all 0.3s ease",
  "&:hover": {
    boxShadow: "0 6px 25px rgba(0,0,0,0.15)",
  },
}));

const ChangeChip = styled(Chip)(({ theme, active }) => ({
  borderRadius: theme.spacing(1),
  height: "auto",
  padding: theme.spacing(1),
  "& .MuiChip-label": {
    padding: theme.spacing(0.5, 1),
    whiteSpace: "normal",
    textAlign: "center",
  },
  ...(active && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  }),
}));

const UploadButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  border: `2px dashed ${theme.palette.primary.main}`,
  minHeight: 160,
  width: 180,
  flexDirection: "column",
  textTransform: "none",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

// Utility functions
const compressImage = async (base64Image) => {
  const byteCharacters = atob(base64Image.split(",")[1]);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = Array.from(slice, (char) => char.charCodeAt(0));
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  const blob = new Blob(byteArrays, { type: "image/png" });
  const compressedBlob = await imageCompression(blob, {
    maxWidthOrHeight: 250,
  });
  return await blobToBase64(compressedBlob);
};

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

const handleIntegerInput = (value) => {
  if (!value) return "";
  return value.replace(/[^0-9]/g, "");
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function TargetChangeContainer({
  test,
  onChangeFields,
  entities,
  offersList,
  pricing,
  exchangeRates,
  exchangeRates_USD,
  nodeTree,
  nodeData,
  gameID,
  branch,
  onClose,
}) {
  const { getEntitiesByNodeIDs, getEntitiesNames, getNode, getBalanceModel } =
    useApi();

  const [testState, setTestState] = useState(test);
  const [activeChangeIndex, setActiveChangeIndex] = useState(0);
  const activeChange = testState.subject[activeChangeIndex] || {};
  const isEditable = !Boolean(testState.startDate);

  const fileInputRef = useRef(null);
  const [allEntitiesNames, setAllEntitiesNames] = useState([]);
  const [addChangeMenuAnchor, setAddChangeMenuAnchor] = useState(null);
  const [isValid_Icon, setIsValid_Icon] = useState(false);
  const [isValid_Price, setIsValid_Price] = useState(false);
  const [nodeContent, setNodeContent] = useState(null);
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  const [testChangedOfferContent, setTestChangedOfferContent] = useState();
  const [entitiesContent_offer, setEntitiesContent_offer] = useState([]);
  const [entitiesContent_test, setEntitiesContent_test] = useState([]);
  const [gameModelFunctions, setGameModelFunctions] = useState([]);

  const defaultAvailableChanges_offer = ["icon", "price", "content"];
  const [selectedOffer, setSelectedOffer] = useState();
  const [selectedEntity, setSelectedEntity] = useState();

  // Synchronize local state
  useEffect(() => {
    setTestState(test);
  }, [test]);

  // Ensure there is at least one change in test.subject
  useEffect(() => {
    if (!testState.subject || testState.subject.length === 0) {
      handleAddNewChange();
    }
  }, [testState.subject]);

  // Fetch data
  useEffect(() => {
    async function fetchFunctions() {
      const resp = await getBalanceModel({
        gameID: gameID,
        branch,
        specificTypes: ["functions"],
      });
      setGameModelFunctions(
        resp.result.functions
          ? resp.result.functions.map((f) => ({
              name: f.name,
              id: f.functionID,
            }))
          : []
      );
    }
    fetchFunctions();

    async function fetchEntities() {
      const resp = await getEntitiesNames({ gameID, branch });
      if (resp.success) {
        setAllEntitiesNames(
          resp.entities.filter((e) => {
            const foundEntity = nodeData.find((n) => n.nodeID === e.nodeID);
            return (
              e.nodeID !== "Root" && foundEntity && !foundEntity.entityCategory
            );
          })
        );
      }
    }
    fetchEntities();

    if (activeChange.type === "entity" && activeChange.itemID) {
      fetchNodeContent(activeChange.itemID);
    }
  }, [activeChange.type, activeChange.itemID]);

  // File upload handlers
  const handleFileUpload = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64File = e.target.result;
          const compressedImage = await compressImage(base64File);
          onAddChangeValue("icon", compressedImage);
        };
        reader.readAsDataURL(selectedFile);
      } catch (error) {
        console.error("Error processing image", error);
      }
    }
  };

  const clearImage = () => {
    onAddChangeValue("icon", "");
    fileInputRef.current.value = null;
  };

  // Update active change fields helper
  const updateActiveChangeFields = (newFields) => {
    const updatedSubject = [...testState.subject];
    updatedSubject[activeChangeIndex] = {
      ...activeChange,
      changedFields: newFields,
    };
    onChangeFields(updatedSubject, test.id);
    setTestState({ ...testState, subject: updatedSubject });
  };

  // Change field handlers
  const onAddChangeValue = (change, value) => {
    const newFields = { ...activeChange.changedFields, [change]: value };
    updateActiveChangeFields(newFields);
  };

  const onRemoveChange = (change) => {
    const newFields = { ...activeChange.changedFields };
    delete newFields[change];
    updateActiveChangeFields(newFields);
    if (change === "content") {
      setTestChangedOfferContent(undefined);
      setEntitiesContent_test([]);
    }
  };

  const onAddChange = (change) => {
    const newFields = { ...activeChange.changedFields, [change]: "" };
    if (change === "content") {
      newFields[change] = getOfferEntityContent(activeChange.itemID).map(
        (entity) => ({
          nodeID: entity.nodeID,
          amount: entity.amount,
        })
      );
      setTestChangedOfferContent(newFields.content);
    }
    updateActiveChangeFields(newFields);
    setAddChangeMenuAnchor(null);
  };

  // Offer data getters
  const getOfferIcon = (offerID) => {
    const icon = offersList.find(
      (offer) => offer.offerID === offerID
    )?.offerIcon;
    return icon ? (
      <img
        src={icon}
        alt="offer icon"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
        }}
      />
    ) : (
      <OfferIconPlaceholder />
    );
  };

  const getOfferPriceObject = (offerID) => {
    return offersList.find((offer) => offer.offerID === offerID)?.offerPrice;
  };

  const getOfferEntityContent = (offerID) => {
    const content = offersList.find(
      (offer) => offer.offerID === offerID
    )?.content;
    return content || [];
  };

  // Node content fetching
  const fetchNodeContent = async (nodeID) => {
    setIsFetchingConfig(true);
    const response = await getNode({ gameID, branch, nodeID });
    setNodeContent(response);
    setIsFetchingConfig(false);
  };

  // Change management handlers
  const handleTypeChange = (newType) => {
    const updatedChange = { ...activeChange, type: newType };
    const updatedSubject = [...testState.subject];
    updatedSubject[activeChangeIndex] = updatedChange;
    onChangeFields(updatedSubject, test.id);
    setTestState({ ...testState, subject: updatedSubject });
  };

  const handleItemIDChange = (newItemID) => {
    const updatedChange = { ...activeChange, itemID: newItemID };
    const updatedSubject = [...testState.subject];
    updatedSubject[activeChangeIndex] = updatedChange;
    onChangeFields(updatedSubject, test.id);
    setTestState({ ...testState, subject: updatedSubject });
  };

  const handleAddNewChange = () => {
    const newChange = {
      type: "entity",
      itemID: "",
      changedFields: {},
    };
    const updatedSubject = testState.subject
      ? [...testState.subject, newChange]
      : [newChange];
    onChangeFields(updatedSubject, test.id);
    setTestState({ ...testState, subject: updatedSubject });
    setActiveChangeIndex(updatedSubject.length - 1);
  };

  const handleRemoveChange = (index) => {
    const updatedSubject = testState.subject.filter((_, i) => i !== index);
    onChangeFields(updatedSubject, test.id);
    setTestState({ ...testState, subject: updatedSubject });
    setTimeout(() => {
      setActiveChangeIndex(0);
    }, 50);
  };

  function getChangedItemName(itemID, subjectType) {
    switch (subjectType) {
      case "offer":
        return offersList.find((o) => o.offerID === itemID)?.offerName;
      case "entity":
        return allEntitiesNames.find((e) => e.nodeID === itemID)?.name;
      default:
        return "N/A";
    }
  }

  const availableChanges = defaultAvailableChanges_offer.filter(
    (change) => activeChange.changedFields?.[change] === undefined
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="bold">
          {isEditable ? "Configure Test Changes" : "View Test Changes"}
        </Typography>
        <IconButton onClick={onClose} size="large">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Change Selector */}
      <StyledCard sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Changes
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            sx={{ alignItems: "center" }}
            useFlexGap
          >
            {testState.subject &&
              testState.subject.map((change, idx) => (
                <ChangeChip
                  key={idx}
                  active={activeChangeIndex === idx}
                  label={
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="body2" fontWeight="bold">
                        {getChangedItemName(change.itemID, change.type) ||
                          "Not set"}
                      </Typography>
                      <Typography variant="caption">{change.type}</Typography>
                    </Box>
                  }
                  onClick={() => setActiveChangeIndex(idx)}
                  onDelete={
                    isEditable && testState.subject.length > 1
                      ? () => handleRemoveChange(idx)
                      : undefined
                  }
                  deleteIcon={<CloseIcon fontSize="small" />}
                />
              ))}
            {isEditable && (
              <Fab
                size="small"
                color="primary"
                onClick={handleAddNewChange}
                sx={{ ml: 2 }}
              >
                <AddIcon />
              </Fab>
            )}
          </Stack>
        </CardContent>
      </StyledCard>

      {/* Change Configuration */}
      <Grid container spacing={3}>
        {/* Left Panel - Type and Item Selection */}
        <Grid item xs={12} md={4}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Change Configuration
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Change Type</InputLabel>
                <Select
                  disabled={!isEditable}
                  value={activeChange.type || ""}
                  label="Change Type"
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  <MenuItem value="entity">Entity</MenuItem>
                  <MenuItem value="offer">Offer</MenuItem>
                </Select>
              </FormControl>

              {activeChange.type === "entity" && (
                <Autocomplete
                  disabled={!isEditable}
                  value={
                    activeChange.itemID
                      ? {
                          label:
                            allEntitiesNames.find(
                              (e) => e.nodeID === activeChange.itemID
                            )?.name || "",
                          nodeID: activeChange.itemID,
                        }
                      : null
                  }
                  getOptionLabel={(option) => option.label || ""}
                  isOptionEqualToValue={(o, v) => v?.nodeID === o?.nodeID}
                  onChange={(e, newValue) => {
                    if (newValue) {
                      handleItemIDChange(newValue.nodeID);
                      setSelectedEntity(newValue.nodeID);
                    }
                  }}
                  options={allEntitiesNames.map((e) => ({
                    label: e.name,
                    nodeID: e.nodeID,
                  }))}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Entity" />
                  )}
                />
              )}

              {activeChange.type === "offer" && (
                <FormControl fullWidth>
                  <InputLabel>Select Offer</InputLabel>
                  <Select
                    disabled={!isEditable}
                    value={activeChange.itemID || ""}
                    label="Select Offer"
                    onChange={(e) => {
                      setSelectedOffer(e.target.value);
                      handleItemIDChange(e.target.value);
                    }}
                  >
                    {offersList?.map((offer) => (
                      <MenuItem key={offer.offerID} value={offer.offerID}>
                        {offer.offerName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Add Change Button for Offers */}
              {isEditable &&
                activeChange.type === "offer" &&
                activeChange.itemID && (
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={(e) => setAddChangeMenuAnchor(e.currentTarget)}
                      disabled={availableChanges.length === 0}
                      fullWidth
                    >
                      Add Change Type
                    </Button>
                    <Menu
                      anchorEl={addChangeMenuAnchor}
                      open={Boolean(addChangeMenuAnchor)}
                      onClose={() => setAddChangeMenuAnchor(null)}
                    >
                      {availableChanges.map((change) => (
                        <MenuItem
                          key={change}
                          onClick={() => onAddChange(change)}
                        >
                          {change.charAt(0).toUpperCase() + change.slice(1)}
                        </MenuItem>
                      ))}
                    </Menu>
                  </Box>
                )}
            </CardContent>
          </StyledCard>
        </Grid>

        {/* Right Panel - Change Details */}
        <Grid item xs={12} md={8} sx={{ overflow: "auto" }}>
          <Box sx={{ maxHeight: "100%", pb: 3 }}>
            {/* Entity Configuration */}
            {activeChange.type === "entity" && nodeContent && (
              <StyledCard>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Entity Configuration
                  </Typography>
                  <Box
                    sx={{
                      height: "450px",
                      overflow: "hidden",
                      border: "1px solid #25205e",
                      borderRadius: "1rem",
                    }}
                  >
                    <RemoteConfig
                      onMainConfigChange={(newConfigs) => {
                        setNodeContent((prev) => ({
                          ...prev,
                          entityBasic: {
                            ...prev.entityBasic,
                            mainConfigs: newConfigs,
                          },
                        }));
                      }}
                      onInheritedConfigChange={(newConfigs) => {
                        setNodeContent((prev) => ({
                          ...prev,
                          entityBasic: {
                            ...prev.entityBasic,
                            inheritedConfigs: newConfigs,
                          },
                        }));
                      }}
                      nodeContent={nodeContent}
                      dataNodes={nodeData}
                      dataTree={nodeTree}
                      preventSave={false}
                      disableIDChanging
                      disableFieldRemoval
                      disableCreation
                      defaultCompareSegment={
                        activeChange.segments?.control || "everyone"
                      }
                      defaultCurrentSegment={`abtest_${testState.id}`}
                    />
                  </Box>
                </CardContent>
              </StyledCard>
            )}

            {/* Offer Changes */}
            {activeChange.type === "offer" && (
              <Stack spacing={3}>
                {/* Icon Change */}
                {activeChange.changedFields?.icon !== undefined && (
                  <StyledCard>
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Typography variant="h6">Icon Change</Typography>
                        {isEditable && (
                          <IconButton
                            onClick={() => onRemoveChange("icon")}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                      <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2, textAlign: "center" }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Current
                            </Typography>
                            <Box
                              sx={{
                                width: 80,
                                height: 80,
                                mx: "auto",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {getOfferIcon(activeChange.itemID)}
                            </Box>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={1} sx={{ textAlign: "center" }}>
                          <ArrowForwardIcon />
                        </Grid>
                        <Grid item xs={12} md={7}>
                          <Paper sx={{ p: 2, textAlign: "center" }}>
                            <Typography variant="subtitle2" gutterBottom>
                              New
                            </Typography>
                            {activeChange.changedFields.icon ? (
                              <Box
                                sx={{
                                  position: "relative",
                                  display: "inline-block",
                                }}
                              >
                                <img
                                  src={activeChange.changedFields.icon}
                                  alt="New icon"
                                  style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 8,
                                    objectFit: "contain",
                                  }}
                                />
                                {isEditable && (
                                  <IconButton
                                    onClick={clearImage}
                                    sx={{
                                      position: "absolute",
                                      top: -8,
                                      right: -8,
                                      bgcolor: "background.paper",
                                    }}
                                    size="small"
                                  >
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            ) : (
                              <UploadButton
                                component="label"
                                disabled={!isEditable}
                                startIcon={<CloudUploadIcon />}
                              >
                                Upload New Icon
                                <VisuallyHiddenInput
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={handleFileChange}
                                  accept=".png,.jpg,.svg,.jpeg"
                                />
                              </UploadButton>
                            )}
                          </Paper>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </StyledCard>
                )}

                {/* Price Change */}
                {activeChange.changedFields?.price !== undefined && (
                  <StyledCard>
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Typography variant="h6">Price Change</Typography>
                        {isEditable && (
                          <IconButton
                            onClick={() => onRemoveChange("price")}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                      <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} md={5}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Current Price
                            </Typography>
                            <SetPrice
                              gameModelFunctions={gameModelFunctions}
                              onPriceChanged={() => {}}
                              entities={entities}
                              disabledWidget
                              offerStatePrice={getOfferPriceObject(
                                activeChange.itemID
                              )}
                              defaultBorders
                              pricing={pricing}
                              exchangeRates_USD={exchangeRates_USD}
                              exchangeRates={exchangeRates}
                              isAbTestContext={true}
                            />
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={1} sx={{ textAlign: "center" }}>
                          <ArrowForwardIcon />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              New Price
                            </Typography>
                            <SetPrice
                              gameModelFunctions={gameModelFunctions}
                              onPriceChanged={(priceObj) =>
                                onAddChangeValue("price", priceObj)
                              }
                              entities={entities}
                              pricing={pricing}
                              onClose={() => {}}
                              offerStatePrice={
                                activeChange.changedFields.price
                                  .targetCurrency === "money"
                                  ? {
                                      targetCurrency:
                                        activeChange.changedFields.price
                                          .targetCurrency,
                                      pricingTemplateAsku:
                                        activeChange.changedFields.price
                                          .pricingTemplateAsku,
                                    }
                                  : {
                                      targetCurrency:
                                        activeChange.changedFields.price
                                          .targetCurrency,
                                      nodeID:
                                        activeChange.changedFields.price.nodeID,
                                      amount:
                                        activeChange.changedFields.price.amount,
                                    }
                              }
                              defaultBorders
                              exchangeRates={exchangeRates}
                              exchangeRates_USD={exchangeRates_USD}
                              isAbTestContext={true}
                            />
                          </Paper>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </StyledCard>
                )}

                {/* Content Change */}
                {activeChange.changedFields?.content !== undefined && (
                  <StyledCard>
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Typography variant="h6">Content Change</Typography>
                        {isEditable && (
                          <IconButton
                            onClick={() => onRemoveChange("content")}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Current Content
                            </Typography>
                            <Stack spacing={1}>
                              {entitiesContent_offer.map((entity) => (
                                <EntityItem
                                  key={entity.nodeID}
                                  entity={entity}
                                  disabledWidget
                                />
                              ))}
                            </Stack>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              New Content
                            </Typography>
                            <Stack spacing={1}>
                              {entitiesContent_test &&
                                entitiesContent_test.length > 0 &&
                                entitiesContent_test.map((entity) => (
                                  <EntityItem
                                    key={entity.nodeID}
                                    entity={entity}
                                    onRemove={(nodeID) => {
                                      const updatedContent = (
                                        activeChange.changedFields.content || []
                                      ).filter((e) => e.nodeID !== nodeID);
                                      updateActiveChangeFields({
                                        ...activeChange.changedFields,
                                        content: updatedContent,
                                      });
                                    }}
                                    onAmountChanged={(nodeID, newAmount) => {
                                      const updatedContent = (
                                        activeChange.changedFields.content || []
                                      ).map((entity) => {
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
                                      });
                                      updateActiveChangeFields({
                                        ...activeChange.changedFields,
                                        content: updatedContent,
                                      });
                                    }}
                                  />
                                ))}
                              {isEditable && (
                                <AddEntity
                                  onEntityAdded={(newEntity, amount) => {
                                    const newContent = [
                                      ...(activeChange.changedFields.content ||
                                        []),
                                      {
                                        nodeID: newEntity.nodeID,
                                        amount: clamp(
                                          handleIntegerInput(amount),
                                          1,
                                          Number.MAX_SAFE_INTEGER
                                        ),
                                      },
                                    ];
                                    updateActiveChangeFields({
                                      ...activeChange.changedFields,
                                      content: newContent,
                                    });
                                  }}
                                  onAmountChanged={() => {}}
                                  entities={entities}
                                  offerStateContent={
                                    activeChange.changedFields.content || []
                                  }
                                />
                              )}
                            </Stack>
                          </Paper>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </StyledCard>
                )}
              </Stack>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isFetchingConfig}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Container>
  );
}

export default TargetChangeContainer;
