import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Popover,
  Autocomplete,
  Typography,
  Tooltip,
  InputAdornment,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import { orange } from "@mui/material/colors";
import ErrorIcon from "@mui/icons-material/Error";
import CloseIcon from "@mui/icons-material/Close";
import s from "../offerItem.module.css";

// Entity icon placeholder
import EntityIcon from "../entityBasic.svg?react";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import WidgetsIcon from "@mui/icons-material/Widgets";
import useApi from "@strix/api";
import { useGame, useBranch } from "@strix/gameContext";
import { currencies } from "shared/currencies.js";
import { useAlert } from "@strix/alertsContext";

/**
 * SetPrice component for managing price settings for in-game offers
 */
const SetPrice = ({
  onPriceChanged,
  entities,
  offerStatePrice,
  defaultBorders = false,
  disabledWidget = false,
  pricing,
  gameModelFunctions,
  exchangeRates,
  exchangeRates_USD,
  onClose,
  // New prop to control if this is used in AB tests
  isAbTestContext = false,
}) => {
  const { triggerAlert } = useAlert();
  const { getEntityIcon } = useApi();
  const { game, getEntityIcon_cache, setGetEntityIcon_cache } = useGame();
  const { branch, environment } = useBranch();

  // Get base currency from game settings
  const baseCurr =
    game.apiKeys?.find((key) => key.service === "googleplayservices")
      ?.secondary || "USD";

  // State management
  const [anchorEl, setAnchorEl] = useState(null);
  const [priceObject, setPriceObject] = useState(offerStatePrice);
  const [errorCurrencies, setErrorCurrencies] = useState({});
  const [searchCurrencyAnchor, setSearchCurrencyAnchor] = useState(null);
  const [priceIcon, setPriceIcon] = useState("");

  const open = Boolean(anchorEl);

  // Helper functions
  const trimStr = (str, maxLength) => {
    if (!str) return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  };

  const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
  };

  // Handle opening price popover
  const showAddNewPopover = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Get currency entities from available entities
  const getCurrencyEntities = () => {
    return entities
      .filter((entity) => entity.entityBasic.isCurrency === true)
      .map((e) => ({
        label: `${e.name} (${e.entityBasic.entityID})`,
        entity: e,
      }));
  };

  // Price object update methods
  const setPriceTargetCurrency = (newCurrency) => {
    setPriceObject((prev) => ({
      ...prev,
      targetCurrency: newCurrency,
      amount: 0,
    }));
  };

  const setPriceAmount = (newAmount) => {
    setPriceObject((prev) => ({
      ...prev,
      amount: newAmount,
    }));
  };

  const setPriceAsku = (newAsku) => {
    setPriceObject((prev) => ({
      ...prev,
      pricingTemplateAsku: newAsku,
    }));
  };

  const setPriceTargetNodeID = (nodeID) => {
    if (!nodeID) return;
    setPriceObject((prev) => ({
      ...prev,
      nodeID: nodeID || "",
    }));
  };

  const setPriceAmountIsDerived = (bool) => {
    setPriceObject((prev) => ({
      ...prev,
      isDerivedAmount: bool,
    }));
  };
  const setPriceDerivedAmount = (functionID) => {
    setPriceObject((prev) => ({
      ...prev,
      derivedAmount: functionID,
    }));
  };

  // Save changes
  const callChange = () => {
    const cleanedObject = { ...priceObject };
    if (cleanedObject.targetCurrency === "money") {
      delete cleanedObject.amount;
      delete cleanedObject.nodeID;
    }
    onPriceChanged(cleanedObject);
  };

  // Input validation
  const handleIntegerInput = (value) => {
    if (value === undefined) return;
    let sanitizedValue = value.replace(/[^0-9]/g, "");
    sanitizedValue = sanitizedValue.replace(/^0+(?!\.)/, "");
    return sanitizedValue;
  };

  function getRealPriceIfExists() {
    if (
      priceObject.targetCurrency === "money" &&
      priceObject.pricingTemplateAsku
    ) {
      const template = pricing.find(
        (t) => t.asku === priceObject.pricingTemplateAsku
      );
      if (template) {
        return template.baseValue;
      }
    }
    return "0.00";
  }

  function getFunctionName(id) {
    return (
      gameModelFunctions.find((f) => f.id === id)?.name || "Model Function"
    );
  }

  // UI display helpers
  const getCurrencyAmountForVisual = () => {
    switch (priceObject.targetCurrency) {
      case "money":
        return getRealPriceIfExists() || "0.00";
      case "entity":
        if (priceObject.isDerivedAmount && !isAbTestContext) {
          return getFunctionName(priceObject.derivedAmount);
        } else {
          return priceObject.nodeID ? priceObject.amount : "0";
        }
      default:
        return "0.00";
    }
  };

  // Fetch icon for the price display
  useEffect(() => {
    const fetchPriceIcon = async () => {
      switch (priceObject.targetCurrency) {
        case "money":
          const currency = currencies.find((c) => c.code === baseCurr);
          setPriceIcon(currency?.symbol || "");
          break;

        case "entity":
          if (!priceObject.nodeID) {
            setPriceIcon(<EntityIcon />);
            return;
          }

          let icon = null;

          if (!icon) {
            icon = await getEntityIcon({
              gameID: game.gameID,
              branch,
              nodeID: priceObject.nodeID,
            });
          }

          if (icon?.success) {
            setPriceIcon(
              icon.entityIcon ? (
                <img
                  src={icon.entityIcon}
                  alt="Entity icon"
                  className={s.priceEntityIcon}
                />
              ) : (
                <EntityIcon />
              )
            );
          } else {
            setPriceIcon(<EntityIcon />);
          }
          break;
      }
    };

    fetchPriceIcon();
  }, [priceObject, baseCurr]);

  // Render currency price options
  const renderMoneyPriceOptions = () => (
    <div className={s.setPriceBody}>
      <FormControl sx={{ width: "100%" }}>
        <InputLabel>Pricing template</InputLabel>
        <Select
          value={priceObject.pricingTemplateAsku || ""}
          label="Pricing template"
          onChange={(e) => {
            setPriceAsku(e.target.value);
          }}
        >
          {pricing.map((t, idx) => (
            <MenuItem key={t.asku} value={t.asku}>
              {t.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box
        sx={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          mt: 2,
        }}
      >
        <Button
          onClick={() => {
            callChange();
            setAnchorEl(null);
          }}
          variant="contained"
          color="primary"
        >
          Save
        </Button>
        <Button
          onClick={() => {
            setPriceObject(offerStatePrice);
            setAnchorEl(null);
          }}
          variant="outlined"
        >
          Cancel & Close
        </Button>
      </Box>
    </div>
  );

  // Render entity price options
  const renderEntityPriceOptions = () => (
    <div className={s.setPriceBody}>
      {entities && entities.length > 0 ? (
        <>
          <Autocomplete
            disablePortal
            size="small"
            id="entitySearch"
            value={
              priceObject.nodeID
                ? {
                    label: entities.find((e) => e.nodeID === priceObject.nodeID)
                      ? `${entities.find((e) => e.nodeID === priceObject.nodeID).name} (${entities.find((e) => e.nodeID === priceObject.nodeID).entityBasic.entityID})`
                      : "",
                    nodeID: priceObject.nodeID,
                  }
                : ""
            }
            onChange={(_, newValue) => {
              if (newValue === null) {
                setPriceTargetNodeID(null);
              } else {
                setPriceTargetNodeID(newValue.entity.nodeID);
              }
            }}
            options={getCurrencyEntities()}
            sx={{ width: "100%", mb: 2 }}
            renderInput={(params) => (
              <TextField spellCheck={false} {...params} label="Entities" />
            )}
          />

          {/* Only show derived value option if NOT in AB test context */}
          {!isAbTestContext && (
            <FormControl fullWidth>
              <InputLabel>Price Amount Type</InputLabel>
              <Select
                value={priceObject.isDerivedAmount}
                label="Price Amount Type"
                onChange={(e) => setPriceAmountIsDerived(e.target.value)}
              >
                <MenuItem value={true}>Derived value</MenuItem>
                <MenuItem value={false}>Manual value</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Show function selector only if derived is enabled AND not in AB test context */}
          {priceObject.isDerivedAmount && !isAbTestContext ? (
            <FormControl fullWidth>
              <InputLabel>Function</InputLabel>
              <Select
                value={priceObject.derivedAmount}
                label="Function"
                onChange={(e) => setPriceDerivedAmount(e.target.value)}
              >
                {gameModelFunctions.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            // Always show manual input in AB test context or when manual is selected
            priceObject.nodeID && (
              <TextField
                spellCheck={false}
                id="entityAmount"
                fullWidth
                size="small"
                value={priceObject.amount || ""}
                onChange={(e) =>
                  setPriceAmount(handleIntegerInput(e.target.value))
                }
                label="Amount"
                sx={{ mb: 2 }}
              />
            )
          )}
        </>
      ) : (
        <div className={s.noEntities}>
          <p>No currency entities found.</p>
        </div>
      )}

      <Box
        sx={{ display: "flex", width: "100%", justifyContent: "space-between" }}
      >
        <Button
          disabled={!priceObject.nodeID}
          onClick={() => {
            callChange();
            setAnchorEl(null);
          }}
          variant="contained"
          color="primary"
        >
          Save
        </Button>
        <Button
          onClick={() => {
            setPriceObject(offerStatePrice);
            setAnchorEl(null);
          }}
          variant="outlined"
        >
          Cancel & Close
        </Button>
      </Box>
    </div>
  );

  return (
    <div className={s.container}>
      <Button
        onClick={showAddNewPopover}
        fullWidth
        disabled={disabledWidget}
        variant="outlined"
        className={s.priceButton}
        sx={{
          justifyContent: "start",
          backgroundColor: "var(--regular-card-bg-color2)",
          minWidth: "120px",
          maxWidth: "200px",
          height: "30px",
          textTransform: "none",
          borderRadius: "2rem",
        }}
        startIcon={priceIcon}
      >
        <span className={s.priceValue}>
          {trimStr(getCurrencyAmountForVisual(), 10)}
        </span>
      </Button>

      {/* Main price popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 3,
              overflow: "visible",
              backgroundImage: "none",
              backgroundColor: "var(--bg-color3)",
              borderRadius: "2rem",
              boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
              minWidth: "300px",
            },
          },
        }}
      >
        {window.__env.edition !== "community" && (
          <Box sx={{ display: "flex", mb: 4 }}>
            <Tooltip title="Price template" placement="top">
              <Button
                onClick={() => setPriceTargetCurrency("money")}
                variant={
                  priceObject.targetCurrency === "money"
                    ? "contained"
                    : "outlined"
                }
              >
                <AttachMoneyIcon />
              </Button>
            </Tooltip>
            <Tooltip title="Entity currency" placement="top">
              <Button
                onClick={() => setPriceTargetCurrency("entity")}
                variant={
                  priceObject.targetCurrency === "entity"
                    ? "contained"
                    : "outlined"
                }
              >
                <WidgetsIcon />
              </Button>
            </Tooltip>
          </Box>
        )}
        {priceObject.targetCurrency === "money" && renderMoneyPriceOptions()}
        {priceObject.targetCurrency === "entity" && renderEntityPriceOptions()}
      </Popover>
    </div>
  );
};

export default SetPrice;
