import React, { useEffect, useState } from "react";
import { currencies } from "shared/currencies";
import { regions } from "shared/regions";
import useApi from "@strix/api";
import {
  Typography,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  Box,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useGame, useBranch } from "@strix/gameContext";
import { useAlert } from "@strix/alertsContext";
import Alert from "@mui/material/Alert";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import ModeIcon from "@mui/icons-material/Mode";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import Popover from "@mui/material/Popover";

function PricingTemplates({ onChange, exchangeRates }) {
  const {
    updatePricingTemplate,
    createPricingTemplate,
    removePricingTemplate,
    getPricingAutoFilledRegions,
    getPricing,
  } = useApi();
  const { game } = useGame();
  const { triggerAlert } = useAlert();
  const { branch, environment } = useBranch();

  const baseCurr =
    game.apiKeys?.find((key) => key.service === "googleplayservices")
      ?.secondary || "USD";

  const [templates, setTemplates] = useState([]);
  useEffect(() => {
    async function fetchPricing() {
      const result = await getPricing({ gameID: game.gameID, branch });
      if (result.success) {
        setTemplates(result.templates);
      }
    }
    fetchPricing();
  }, []);
  useEffect(() => {
    onChange(templates);
  }, [templates]);

  // Called when a single template’s pricing changes
  const handleTemplateChange = (asku, newPricing, field) => {
    setTemplates((prev) =>
      prev.map((tpl) =>
        tpl.asku === asku ? { ...tpl, [field]: newPricing } : tpl
      )
    );
    updatePricingTemplate({
      gameID: game.gameID,
      branch: branch,
      asku: asku,
      field: field,
      change: newPricing,
    });
  };

  // Add a new template with a unique ID and default pricing data
  const addNewTemplate = async () => {
    const resp = await createPricingTemplate({
      gameID: game.gameID,
      branch: branch,
    });
    if (resp.success) {
      triggerAlert("New template created successfully", "success");
      setTemplates((prev) => [
        ...prev,
        {
          asku: resp.result.asku,
          name: resp.result.name,
          baseValue: 1,
          regions: [],
        },
      ]);
    } else {
      triggerAlert("Could not create new template", "error");
    }
  };

  async function handleTemplateRemove(asku) {
    const resp = await removePricingTemplate({
      gameID: game.gameID,
      branch: branch,
      environment: environment,
      asku,
    });
    if (resp.success) {
      triggerAlert(`Removed template successfully`, "success");
      setTemplates((prev) => prev.filter((t) => t.asku !== asku));
    } else {
      triggerAlert(
        `Could not remove pricing template: ${resp.message}`,
        "error"
      );
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          onClick={addNewTemplate}
          sx={{ mt: 1, mb: 2 }}
        >
          Add New Template
        </Button>
        <Alert
          severity="warning"
          sx={{ width: "fit-content", height: "fit-content" }}
        >
          Please note that all templates exist outside of any branches. All
          changes you make will apply globally when you commit your changes and
          create a new version (even if you don't deploy it).
        </Alert>
      </Box>
      {templates.map((template) => (
        <RegionalPricing
          templateObj={template}
          exchangeRates={exchangeRates}
          baseCurr={baseCurr}
          onChange={(change, field) => {
            handleTemplateChange(template.asku, change, field);
          }}
          onRemove={() => {
            handleTemplateRemove(template.asku);
          }}
        />
      ))}
    </Box>
  );
}
function RegionalPricing({
  templateObj,
  onChange,
  onRemove,
  exchangeRates,
  baseCurr,
}) {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const [template, setTemplate] = useState(templateObj);
  const [open, setOpen] = useState(false);
  const { getPricingAutoFilledRegions } = useApi();
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [pendingRemove, setPendingRemove] = useState(false);
  const [openLastRemovalAccept, setOpenLastRemovalAccept] = useState(false);

  function handleFloatInput(value) {
    if (value === "") return "";
    let currentValue = value === "." ? "0." : value;
    let sanitizedValue = currentValue.replace(/[^0-9.]/g, "");
    const dotCount = sanitizedValue.split(".").length - 1;
    if (dotCount > 1) {
      sanitizedValue =
        sanitizedValue.split(".").slice(0, 2).join(".") +
        sanitizedValue.split(".").slice(2).join("");
    }
    if (
      sanitizedValue.startsWith("0") &&
      sanitizedValue.length > 1 &&
      sanitizedValue[1] !== "."
    ) {
      sanitizedValue = "0." + sanitizedValue.slice(1);
    }
    return sanitizedValue;
  }

  function setCurrencyNewBase(code, newBase) {
    let newPricing = { ...template };
    newPricing.baseValue = newBase;
    setTemplate(newPricing);
    onChange(newBase, "baseValue");
  }

  function setRegionBase(regionCode, newBase) {
    let newPricing = { ...template };
    let item = newPricing.regions.find((r) => r.code === regionCode);
    if (!item) {
      item = {
        code: regionCode,
        base: handleFloatInput(newBase),
        changed: true,
      };
      newPricing.regions.push(item);
    } else {
      item.base = handleFloatInput(newBase);
      item.changed = true;
    }
    setTemplate(newPricing);
    onChange(newPricing.regions, "regions");
  }

  function getBaseCurrencyAmount() {
    return template?.baseValue ? parseFloat(template.baseValue) : 0;
  }
  async function autoFillPricingTable() {
    setIsLoadingData(true);
    const resp = await getPricingAutoFilledRegions({
      gameID: game.gameID,
      branch: branch,
      baseCurrencyCode: baseCurr,
      baseCurrencyAmount: getBaseCurrencyAmount(),
    });
    if (resp.success) {
      let newPricing = { ...template };
      newPricing.regions = resp.pricing;
      setTemplate(newPricing);
      onChange(newPricing.regions, "regions");
    }
    setIsLoadingData(false);
  }
  function setName(newName) {
    setTemplate((prev) => ({ ...prev, name: newName }));
    onChange(newName, "name");
  }
  function callRemoveItem(e) {
    // On first click
    if (!pendingRemove) {
      setPendingRemove(true);
    } else {
      // On accept click
      setOpenLastRemovalAccept(e.currentTarget);
    }
  }
  async function removeTemplate() {
    onRemove();
  }
  return (
    <Paper
      key={template.asku}
      sx={{ p: 2, mt: 2, backgroundColor: "var(--regular-card-bg-color)" }}
    >
      <Backdrop sx={{ color: "#fff", zIndex: 3 }} open={isLoadingData}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Box
        sx={{ width: "100%", display: "flex", alignItems: "center", gap: 3 }}
      >
        <TextField
          label={open ? "Template Name" : ""}
          value={templateObj.name}
          disabled={!open}
          onChange={(e) => setName(e.target.value)}
          variant={open ? "outlined" : "standard"}
          sx={{ mb: 2, mt: 2, width: "20%" }}
        />
        {!open && (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography sx={{ mr: 1 }} variant="subtitle2">
              Default price:{" "}
            </Typography>
            <Typography fontSize={16} variant="subtitle2">
              {currencies.find((c) => c.code === baseCurr).symbol}
              {template.baseValue}
            </Typography>
          </Box>
        )}

        <Box sx={{ ml: "auto", display: "flex", gap: 2 }}>
          <Button onClick={() => setOpen(!open)} variant="contained">
            view template & configure
          </Button>

          <Box>
            <Button
              onClick={callRemoveItem}
              onMouseLeave={() => setPendingRemove(false)}
              sx={{
                pt: "5px",
                ml: 1,
                height: "100%",
                minWidth: "30px",
                width: "45px",
                borderRadius: "2rem",

                "&": pendingRemove
                  ? { bgcolor: "#b03333", color: "white" }
                  : {},
                ":hover": pendingRemove
                  ? { bgcolor: "#cf4040", color: "white" }
                  : { bgcolor: "#b03333", color: "white" },
              }}
            >
              {pendingRemove ? <CheckIcon /> : <DeleteIcon />}
            </Button>
          </Box>

          {open && (
            <Tooltip
              title={
                getBaseCurrencyAmount() === 0
                  ? "Base currency must not be 0"
                  : ""
              }
            >
              <span>
                <Button
                  disabled={getBaseCurrencyAmount() === 0}
                  size="small"
                  sx={{ p: 1, ml: "auto" }}
                  onClick={() => {
                    autoFillPricingTable();
                  }}
                >
                  Auto-fill exchange rate
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>
      {open && (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            {currencies.map((currency, i) => (
              <Grid item xs={12} key={currency.code}>
                {currency.code === baseCurr && (
                  <Paper
                    sx={{
                      p: 1,
                      pl: 2,
                      backgroundColor: "#777dd9",
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                    }}
                  >
                    <Typography variant="subtitle2" color="white">
                      Main currency
                    </Typography>
                  </Paper>
                )}
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: "white",
                    ...(currency.code === baseCurr
                      ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 }
                      : {}),
                  }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={3}>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Typography variant="subtitle2">
                          {
                            currencies.find((c) => c.code === currency.code)
                              ?.code
                          }
                        </Typography>
                        <Typography>
                          {
                            currencies.find((c) => c.code === currency.code)
                              ?.name
                          }
                        </Typography>
                      </Box>
                    </Grid>
                    {currency.code === baseCurr && (
                      <Grid item xs={3}>
                        <TextField
                          label="Base value"
                          size="small"
                          value={template.baseValue}
                          onChange={(e) =>
                            setCurrencyNewBase(currency.code, e.target.value)
                          }
                          variant="standard"
                        />
                      </Grid>
                    )}
                  </Grid>
                  {/* Regions Pricing Accordion */}
                  {getCurrencyRegions(currency.code).length > 0 && (
                    <Accordion
                      sx={{
                        mt: 2,
                        backgroundColor: "var(--regular-card-bg-color2)",
                        borderRadius: "1rem !important",
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2" sx={{ mr: 3 }}>
                          {getCurrencyRegions(currency.code).length} Regions
                        </Typography>
                        {getCurrencyRegions(currency.code).filter((r) =>
                          getRegionChanged(r.code)
                        ).length > 0 && (
                          <Typography variant="subtitle2">
                            {
                              getCurrencyRegions(currency.code).filter((r) =>
                                getRegionChanged(r.code)
                              ).length
                            }{" "}
                            custom changes
                          </Typography>
                        )}
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={1} sx={{ pl: 2 }}>
                          <Grid item xs={4}>
                            <Typography variant="subtitle2">Region</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="subtitle2">
                              Local Price
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="subtitle2">VAT</Typography>
                          </Grid>
                          {getCurrencyRegions(currency.code).map((region) => (
                            <React.Fragment key={region.code}>
                              <Grid item xs={4}>
                                <Typography>{region.name}</Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <TextField
                                  size="small"
                                  value={getRegionPrice(region.code)}
                                  onChange={(e) =>
                                    setRegionBase(region.code, e.target.value)
                                  }
                                  variant="standard"
                                />
                                {getRegionChanged(region.code) && (
                                  <Tooltip
                                    title="Price was changed manually"
                                    placement="right"
                                  >
                                    <ModeIcon />
                                  </Tooltip>
                                )}
                              </Grid>
                              <Grid item xs={4}>
                                <Typography>{region.tax}%</Typography>
                              </Grid>
                            </React.Fragment>
                          ))}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Popover
        open={Boolean(openLastRemovalAccept)}
        anchorEl={openLastRemovalAccept}
        onClose={() => {
          setPendingRemove(null);
          setOpenLastRemovalAccept(null);
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              overflow: "visible",
            },
          },
        }}
      >
        <Typography sx={{ mb: 1 }}>
          Are you sure you want to delete this pricing template? <br />
          This action cannot be undone.
        </Typography>
        <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
          <Button sx={{ color: "error.primary" }} onClick={removeTemplate}>
            Delete
          </Button>
          <Button
            variant="contained"
            sx={{ ml: "auto" }}
            onClick={() => {
              setPendingRemove(null);
              setOpenLastRemovalAccept(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </Popover>
    </Paper>
  );

  // Helper to get regions matching a given currency code
  function getCurrencyRegions(currencyCode) {
    const t = Object.keys(regions)
      .map((r) => ({ code: r, ...regions[r] }))
      .filter((region) => region.currency === currencyCode);
    return t;
  }

  function getRegionChanged(code) {
    const found = template.regions.find((r) => r.code === code);
    return found ? found.changed : false;
  }

  // Helper to get a region’s price
  function getRegionPrice(code) {
    const found = template.regions.find((r) => r.code === code);
    return found ? found.base : "";
  }
}
export default PricingTemplates;
