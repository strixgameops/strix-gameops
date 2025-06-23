import React, { useEffect, useRef, useState } from "react";
import s from "./css/clientListSidebar.module.css";

import Box from "@mui/material/Box";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Popover from "@mui/material/Popover";

import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import InputAdornment from "@mui/material/InputAdornment";
import OutlinedInput from "@mui/material/OutlinedInput";
import CloseSharpIcon from "@mui/icons-material/CloseSharp";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Input from "@mui/material/Input";
import InputLabel from "@mui/material/InputLabel";

import ListSubheader from "@mui/material/ListSubheader";

import shortid from "shortid";
import dayjs, { diff } from "dayjs";
import utc from "dayjs-plugin-utc";

import { useBranch, useGame } from "@strix/gameContext";
import useApi from "@strix/api";
import DatePicker from "shared/datePicker/DatePickerWidget.jsx";

const WarehouseClientListSidebar = ({
  onClientSelect,
  allTemplates,
  allSegments,
  selectedClient,
  allEntities,
}) => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { getAllAnalyticsEvents, queryWarehousePlayers } = useApi();

  const [filters, setFilters] = useState([]);
  const [analyticsEvents, setAnalyticsEvents] = useState([]);
  const [errorFilters, setErrorFilters] = useState([]);

  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const [clients, setClients] = useState([]);
  const [selectedClientIndex, setSelectedClientIndex] = useState("");

  async function fetchData() {
    let events = await getAllAnalyticsEvents({
      gameID: game.gameID,
      branch: branch,
      getRemoved: false,
    });
    events = events.events;
    setAnalyticsEvents(events);
  }
  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    if (!selectedClient) {
      setSelectedClientIndex("");
    }
  }, [selectedClient]);

  function onSelect(index) {
    const selectedClient = clients[index];
    setSelectedClientIndex(index);
    if (selectedClient) {
      onClientSelect(selectedClient);
    }
  }
  function renderRow(props) {
    const { index, style } = props;

    return (
      <ListItem style={style} key={index} component="div" disablePadding>
        <ListItemButton
          dense={true}
          onClick={() => onSelect(index)}
          sx={(theme) => ({
            ml: 2,
            mr: 2,
            backgroundColor: selectedClientIndex === index ? "#5754c2" : "",
            "&:hover": {
              backgroundColor: selectedClientIndex === index ? "#403d8f" : "",
            },
          })}
        >
          <ListItemText
            sx={(theme) => ({
              color:
                selectedClientIndex === index
                  ? "#e7e7e7"
                  : theme.palette.text.primary,
            })}
            primary={trimStr(clients[index], 50, true)}
          />
        </ListItemButton>
      </ListItem>
    );
  }

  const [queryAnchorEl, setQueryAnchorEl] = useState(null);
  const handleClickQueryBuilder = (e) => {
    setQueryAnchorEl(e.currentTarget);
  };
  const handleCloseQueryBuilder = () => {
    setQueryAnchorEl(null);
  };

  const fetchTimeoutRef = useRef(null);
  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      if (filters.length > 0) {
        if (!filters.some((f) => f.filterValue === "")) {
          setErrorFilters([]);
          fetchWarehousePlayers();
        } else {
          setErrorFilters(
            filters.filter((f) => f.filterValue === "").map((f) => f.uid)
          );
        }
      } else {
        fetchWarehousePlayers();
      }
    }, 500); // 500ms debounce

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [filters]);

  let fetchTimer = null;
  async function fetchWarehousePlayers() {
    clearTimeout(fetchTimer);
    fetchTimer = setTimeout(async () => {
      setIsLoadingClients(true);
      const resp = await queryWarehousePlayers({
        gameID: game.gameID,
        branch: branch,
        environment: environment,
        query: filters,
      });
      setClients(resp.message);
      setIsLoadingClients(false);
    });
  }

  function getAnalyticsTemplateValueType(template) {
    switch (template.templateMethod) {
      case "numberOfEvents":
      case "numberOfEventsForTime":
      case "meanForTime":
      case "summ":
      case "summForTime":
        return "float";
      case "date":
        return "date";
      default:
        return (
          analyticsEvents
            .find((e) => e.eventID === template.templateAnalyticEventID)
            ?.values.find(
              (v) => v.uniqueID === template.templateEventTargetValueId
            )?.valueFormat || template.templateDefaultVariantType
        );
    }
  }

  function addFilterToList(filter) {
    if (filters.length === 0) {
      setFilters([...filters, filter]);
    } else {
      setFilters([
        ...filters,
        {
          condition: "and",
        },
        filter,
      ]);
    }
  }

  function onElementQueryAdded(item, type) {
    switch (type) {
      case "template":
        // Checking if template is analytics
        if (item.templateMethod || item.templateDefaultVariantType) {
          addFilterToList({
            templateID: item.templateID,
            filterCondition:
              item.templateDefaultVariantType === "date" ? "dateRange" : "",
            filterValue: "",
            filterType: getAnalyticsTemplateValueType(item),
            uid: shortid.generate(),
          });
        } else {
          addFilterToList({
            templateID: item.templateID,
            filterCondition: "",
            filterValue: "",
            filterType: item.templateType,
            uid: shortid.generate(),
          });
        }
        break;
      case "segment":
        addFilterToList({
          segmentID: item.segmentID,
          filterCondition: "in segment",
          filterType: "segment",
          uid: shortid.generate(),
        });
        break;
      case "inventory":
        addFilterToList({
          nodeID: "",
          filterCondition: item,
          filterType: "inventory",
          uid: shortid.generate(),
        });
        break;
    }
  }

  function getFilterName(filter) {
    if (allTemplates.some((e) => e.templateID === filter.templateID)) {
      return allTemplates.find((e) => e.templateID === filter.templateID)
        .templateName;
    }
    if (allSegments.some((s) => s.segmentID === filter.segmentID)) {
      return allSegments.find((s) => s.segmentID === filter.segmentID)
        .segmentName;
    }
    if (allEntities.some((e) => e.nodeID === filter.nodeID)) {
      return allEntities.find((e) => e.nodeID === filter.nodeID).name;
    }
  }

  const conditions_numeric = ["<", "<=", ">", ">=", "=", "!="];
  const conditions_string = [
    "contains",
    "starts with",
    "ends with",
    "is",
    "is not",
  ];
  const conditions_bool = ["is", "is not"];
  const conditions_segments = ["in segment", "not in segment"];
  const conditions_inventory = ["has item", "has no item"];
  function getFilterConditions(filter) {
    switch (filter.filterType) {
      case "segment":
        return conditions_segments;
      case "bool":
        return conditions_bool;
      case "integer":
        return conditions_numeric;
      case "float":
        return conditions_numeric;
      case "integer":
        return conditions_numeric;
      case "date":
        return [];
      case "inventory":
        return conditions_inventory;
      default:
        return conditions_string;
    }
  }
  function getFilterTypeEndAdornment(filter) {
    switch (filter.filterType) {
      case "string":
        return "str";
      case "bool":
        return "bool";
      case "float":
        return "12.3";
      case "integer":
        return "123";
      case "date":
        return "date";
      default:
        return "123";
    }
  }
  function setFilterCondition(index, condition) {
    setFilters((prevFilters) => {
      return prevFilters.map((f, i) => {
        if (i === index) {
          return {
            ...f,
            filterCondition: condition,
          };
        } else {
          return f;
        }
      });
    });
  }
  function setFilterValue(index, value) {
    setFilters((prevFilters) => {
      return prevFilters.map((f, i) => {
        if (i === index) {
          return {
            ...f,
            filterValue: value,
          };
        } else {
          return f;
        }
      });
    });
  }
  function handleFloatInput(value) {
    // Real-world value input
    let currentInputValue = value;
    if (currentInputValue === "") {
      return "";
    }

    if (currentInputValue === ".") {
      currentInputValue = "0.";
    }

    //   ,
    let sanitizedValue = currentInputValue.replace(/[^0-9.]/g, "");

    //
    let dotCount = sanitizedValue.split(".").length - 1;

    //   ,
    if (dotCount > 1) {
      sanitizedValue =
        sanitizedValue.split(".").slice(0, 2).join(".") +
        sanitizedValue.split(".").slice(2).join("");
    }

    //      ,
    if (
      sanitizedValue.startsWith("0") &&
      sanitizedValue.length > 1 &&
      sanitizedValue[1] !== "."
    ) {
      sanitizedValue = "0." + sanitizedValue.slice(1);
    }

    //
    dotCount = sanitizedValue.split(".").length - 1;

    return sanitizedValue;
  }
  function handleIntegerInput(value) {
    //   ,
    if (value === "") {
      return "";
    }

    //   ,
    let sanitizedValue = value.replace(/[^0-9]/g, "");

    //   ,
    if (sanitizedValue === "") {
      return "";
    }

    //
    return sanitizedValue;
  }
  function GetFilterValueInput(filter, index) {
    switch (filter.filterType) {
      case "bool":
        return (
          <Select
            disabled={filter.filterCondition === ""}
            value={filter.filterValue}
            size="small"
            sx={{ ml: 1.5, height: "30px", width: "70%" }}
            onChange={(event) => setFilterValue(index, event.target.value)}
          >
            <MenuItem value={"True"}>True</MenuItem>
            <MenuItem value={"False"}>False</MenuItem>
          </Select>
        );
      case "inventory":
        return (
          <Select
            disabled={filter.filterCondition === ""}
            value={filter.filterValue}
            size="small"
            sx={{ ml: 1.5, height: "30px", width: "70%", maxWidth: "200px" }}
            onChange={(event) => setFilterValue(index, event.target.value)}
          >
            {allEntities
              .sort(function (a, b) {
                if (a.name < b.name) {
                  return -1;
                }
                if (a.name > b.name) {
                  return 1;
                }
                return 0;
              })
              .map((e) => (
                <MenuItem value={e.nodeID}>
                  {e.name} ({e.entityBasic.entityID})
                </MenuItem>
              ))}
          </Select>
        );
      case "date":
        return (
          <Box sx={{ pl: 1.2 }}>
            <DatePicker
              index={index}
              onStateChange={(value) => setFilterValue(index, value)}
            />
          </Box>
        );
      default:
        return (
          <FormControl
            disabled={filter.filterCondition === ""}
            sx={{ ml: 1.5, height: "30px", width: "30%", mr: 1 }}
            variant="outlined"
          >
            <OutlinedInput
              spellCheck={false}
              disabled={filter.filterCondition === ""}
              sx={{ height: "30px" }}
              id="outlined-adornment-weight"
              value={filter.filterValue}
              onChange={(event) => {
                switch (filter.filterType) {
                  case "string":
                    setFilterValue(index, event.target.value);
                    break;
                  case "float":
                    setFilterValue(index, handleFloatInput(event.target.value));

                    break;
                  case "integer":
                    setFilterValue(
                      index,
                      handleIntegerInput(event.target.value)
                    );
                    break;
                  default:
                    break;
                }
              }}
              endAdornment={
                <InputAdornment position="end">
                  {getFilterTypeEndAdornment(filter)}
                </InputAdornment>
              }
              aria-describedby="outlined-weight-helper-text"
              inputProps={{
                "aria-label": "weight",
              }}
            />
          </FormControl>
        );
    }
  }

  function removeFilter(index) {
    if (index === 0) {
      setFilters((prevFilters) => {
        let temp = prevFilters.filter((f, i) => i !== index);
        temp = temp.filter((f, i) => i !== index);
        return temp;
      });
    } else {
      setFilters((prevFilters) => {
        let temp = prevFilters.filter((f, i) => i !== index);
        temp = temp.filter((f, i) => i !== index - 1);
        return temp;
      });
    }
  }

  function trimStr(str, maxLength, includeDots) {
    if (str === undefined || str === "") return "";
    return str.length > maxLength
      ? `${str.slice(0, maxLength)}${includeDots ? "..." : ""}`
      : str;
  }

  // console.log("allTemplates", allTemplates);

  return (
    <div className={s.sidebarContainer}>
      <div className={s.queryContainer}>
        <div className={s.queryBox}>
          <div className={s.innerList}>
            {filters &&
              filters.length > 0 &&
              filters.map((filter, index) =>
                filter.condition ? (
                  <div></div>
                ) : (
                  <div
                    key={filter.uid}
                    className={`${s.filterItem} ${errorFilters.includes(filter.uid) ? s.error : ""}`}
                  >
                    {filter.filterType !== "inventory" && (
                      <div className={s.filterName}>
                        <Typography
                          sx={{ fontSize: "14px", fontWeight: "500" }}
                        >
                          {trimStr(getFilterName(filter), 25, true)}
                        </Typography>
                      </div>
                    )}

                    {filter.filterType !== "date" && (
                      <Select
                        value={filter.filterCondition}
                        size="small"
                        sx={{
                          ml: 1.5,
                          height: "30px",
                          width:
                            filter.filterType === "string"
                              ? "35%"
                              : filter.filterType === "segment"
                                ? "50%"
                                : "30%",
                        }}
                        onChange={(event) =>
                          setFilterCondition(index, event.target.value)
                        }
                      >
                        {getFilterConditions(filter).map((condition, index) => (
                          <MenuItem key={index} value={condition}>
                            {condition}
                          </MenuItem>
                        ))}
                      </Select>
                    )}

                    {filter.filterType !== "segment" &&
                      GetFilterValueInput(filter, index)}

                    <Button
                      sx={{
                        p: 0,
                        ml: "auto",
                        height: "20px",
                        width: "20px",
                        minWidth: "20px",
                      }}
                      variant="outlined"
                      onClick={() => removeFilter(index)}
                    >
                      <CloseSharpIcon />
                    </Button>
                  </div>
                )
              )}
          </div>
          <Button
            variant="contained"
            onClick={handleClickQueryBuilder}
            className={s.addQuery}
          >
            + Query
          </Button>
        </div>
        <Popover
          open={Boolean(queryAnchorEl)}
          anchorEl={queryAnchorEl}
          onClose={handleCloseQueryBuilder}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          slotProps={{
            paper: {
              sx: {
                backgroundImage: "none",
                backgroundColor: "var(--bg-color3)",
                overflow: "hidden",
              },
            },
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column" }}
            className={s.elementsSelect}
          >
            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
              <InputLabel>Query</InputLabel>
              <Select
                open={Boolean(queryAnchorEl)}
                onClose={handleCloseQueryBuilder}
                onChange={(e) => {
                  if (
                    allTemplates.find((t) => t.templateID === e.target.value)
                  ) {
                    onElementQueryAdded(
                      allTemplates.find((t) => t.templateID === e.target.value),
                      "template"
                    );
                  } else if (
                    allSegments.find((s) => s.segmentID === e.target.value)
                  ) {
                    onElementQueryAdded(
                      allSegments.find((s) => s.segmentID === e.target.value),
                      "segment"
                    );
                  } else {
                    onElementQueryAdded(e.target.value, "inventory");
                  }
                  handleCloseQueryBuilder();
                }}
              >
                <ListSubheader>Inventory</ListSubheader>
                <MenuItem key={"has item"} value={"has item"}>
                  Has item
                </MenuItem>
                <MenuItem key={"has no item"} value={"has no item"}>
                  Has no item
                </MenuItem>

                {allSegments && [
                  <ListSubheader>Segments</ListSubheader>,
                  allSegments.map((s) => (
                    <MenuItem key={s.segmentID} value={s.segmentID}>
                      {s.segmentName}
                    </MenuItem>
                  )),
                ]}

                {allTemplates && [
                  <ListSubheader>Elements</ListSubheader>,
                  allTemplates.map((t, i) => (
                    <MenuItem key={i} value={t.templateID}>
                      {t?.templateName || "Unknown element"}
                    </MenuItem>
                  )),
                ]}
              </Select>
            </FormControl>
          </div>
        </Popover>
      </div>
      <div className={s.clientList}>
        <Backdrop
          sx={{
            position: "absolute",
            color: "#fff",
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={isLoadingClients}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemSize={46}
              itemCount={clients?.length || 0}
            >
              {renderRow}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
};

export default WarehouseClientListSidebar;
