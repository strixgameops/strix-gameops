import React, { useEffect, useState, useRef, useCallback } from "react";
import { Helmet } from "react-helmet";
import titles from "titles";
import s from "./analyticsEvents.module.css";

import useApi from "@strix/api";

import { useGame, useBranch } from "@strix/gameContext";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import EntityIconPlaceholder from "./entityItemPlaceholder.svg?react";
import Button from "@mui/material/Button";
import { red } from "@mui/material/colors";
import {
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import Input from "@mui/material/Input";
import Modal from "@mui/material/Modal";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";
import CheckSharpIcon from "@mui/icons-material/CheckSharp";
import { Chip } from "@mui/material";

import ErrorIcon from "@mui/icons-material/Error";
import SaveIcon from "@mui/icons-material/Save";
import Tooltip from "@mui/material/Tooltip";

import Backdrop from "@mui/material/Backdrop";

import CircularProgress from "@mui/material/CircularProgress";
import SearchWrapper from "shared/searchFramework/SearchWrapper.jsx";
import AddTags from "shared/AddTags.jsx";
import PreviewIcon from "@mui/icons-material/Preview";
import DataTable from "../dashboards/charts/realMoney/DataTable";
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);
const PRIORITY_ORDER = [
  "newSession",
  "endSession",
  "offerEvent",
  "economyEvent",
  "offerShown",
  "adEvent",
  "reportEvent",
];

const mapDefaultValues = (event) => {
  switch (event.eventCodeName) {
    case "newSession":
      return { ...event, defaultValues: ["isNewPlayer"] };
    case "endSession":
      return { ...event, defaultValues: ["sessionLength"] };
    case "offerEvent":
    case "offerShown":
      return {
        ...event,
        defaultValues: ["offerID", "currency", "price", "orderID", "discount"],
      };
    case "economyEvent":
      return {
        ...event,
        defaultValues: ["currencyID", "type", "origin", "amount"],
      };
    case "adEvent":
      return { ...event, defaultValues: ["adNetwork", "adType", "timeSpent"] };
    case "reportEvent":
      return { ...event, defaultValues: ["severity", "reportID", "message"] };
    default:
      return event;
  }
};
function AnalyticEvents() {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { getAllAnalyticsEvents, updateAnalyticsEvent, getWarehouseTemplates } =
    useApi();

  const [analyticsEvents, setAnalyticsEvents] = useState([]);
  const [filteredAnalyticsEvents, setFilteredAnalyticsEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savingInProcess, setSavingInProcess] = useState(false);
  const [eventsAreValidForSaving, setEventsAreValidForSaving] = useState(true);
  const [allTags, setAllTags] = useState([]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await getWarehouseTemplates({
        gameID: game.gameID,
        branch: branch,
      });
      if (response?.templates?.analytics) {
        setTemplates(response.templates.analytics);
      }
    } catch (error) {
      console.error("Failed to fetch templates", error);
    }
  }, [game.gameID, branch, getWarehouseTemplates]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getAllAnalyticsEvents({
        gameID: game.gameID,
        branch: branch,
        getRemoved: false,
      });
      if (response?.success) {
        const sortedEvents = response.events
          .sort((a, b) => {
            const aHasPriority = PRIORITY_ORDER.includes(a.eventCodeName);
            const bHasPriority = PRIORITY_ORDER.includes(b.eventCodeName);
            if (aHasPriority && !bHasPriority) return -1;
            if (!aHasPriority && bHasPriority) return 1;
            return 0;
          })
          .map(mapDefaultValues);
        setAnalyticsEvents(sortedEvents);

        setAllTags([...new Set(sortedEvents.flatMap((e) => e.tags))] || []);
      }
    } catch (error) {
      console.error("Failed to fetch events", error);
    } finally {
      setIsLoading(false);
    }
  }, [game.gameID, branch, getAllAnalyticsEvents]);

  useEffect(() => {
    fetchEvents();
    fetchTemplates();
  }, []);

  const handleRemoveEvent = async (eventID) => {
    setAnalyticsEvents((prevEvents) =>
      prevEvents.filter((event) => event.eventID !== eventID)
    );
  };

  const handleUpdateEvent = async (updatedEvent, hasError) => {
    setAnalyticsEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.eventID === updatedEvent.eventID ? updatedEvent : event
      )
    );
    setEventsAreValidForSaving(!hasError);
    if (!hasError) {
      setSavingInProcess(true);
      await updateAnalyticsEvent({
        gameID: game.gameID,
        branch: branch,
        eventID: updatedEvent.eventID,
        eventObject: updatedEvent,
      });
      setSavingInProcess(false);
    }
  };

  useEffect(() => {
    setAllTags([...new Set(analyticsEvents.flatMap((e) => e.tags))] || []);
  }, [analyticsEvents]);

  return (
    <div className={s.mainContainer}>
      <Helmet>
        <title>{titles.analyticsEvents}</title>
      </Helmet>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #615ff449",
          backgroundColor: "var(--upperbar-bg-color)",
        }}
      >
        <Typography sx={{ m: 3, mb: 2 }} variant="body1" color="text.secondary">
          Events total: {analyticsEvents.length}
        </Typography>

        <Box
          className={s.saveContainer}
          sx={{
            m: 3,
            mb: 2,
            fontSize: 12,
            maxWidth: "24px",
            maxHeight: "24px",
          }}
        >
          {savingInProcess ? (
            <CircularProgress size={20} color="success" />
          ) : eventsAreValidForSaving ? (
            <Tooltip
              title={<Typography fontSize={15}>Segment is saved</Typography>}
            >
              <SaveIcon size={20} color="success" />
            </Tooltip>
          ) : (
            <Tooltip
              title={
                <Typography fontSize={15}>
                  Events can't be saved if there are unfilled fields. Fill or
                  remove unnecessary items to save events
                </Typography>
              }
            >
              <ErrorIcon sx={{ color: red[400] }} />
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          p: 2,
        }}
      >
        <SearchWrapper
          itemsToFilter={analyticsEvents}
          segmentsEnabled={false}
          tagsEnabled={true}
          nameEnabled={true}
          possibleTags={allTags}
          nameMatcher={(item, name) => {
            return item.eventName.toLowerCase().indexOf(name) !== -1;
          }}
          tagsMatcher={(item, tags) => {
            return item.tags.some((tag) => tags.includes(tag));
          }}
          onItemsFiltered={(filtered) => {
            setFilteredAnalyticsEvents(filtered);
          }}
        />
      </Box>

      <div
        className={s.entities}
        style={{ position: "relative", height: "100%" }}
      >
        <Backdrop
          sx={{ color: "#fff", zIndex: 2, position: "absolute" }}
          open={isLoading}
        >
          <CircularProgress color="inherit" />
        </Backdrop>

        <div className={s.list}>
          {filteredAnalyticsEvents.length === 0 ? (
            <Typography
              color="text.grey"
              fontSize={24}
              sx={{ textAlign: "center" }}
            >
              No events found <br /> Events are automatically registered when
              they are sent from a game
            </Typography>
          ) : (
            <div className={s.eventsList}>
              {filteredAnalyticsEvents.map((event, index) => (
                <EventItem
                  key={`${event.eventID}-${index}`}
                  event={event}
                  index={index}
                  onRemove={handleRemoveEvent}
                  onUpdate={handleUpdateEvent}
                  allEvents={filteredAnalyticsEvents}
                  allTemplates={templates}
                  allTags={allTags}
                  askRefetchAllTemplates={fetchTemplates}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventItem({
  event,
  index,
  onRemove,
  onUpdate,
  allEvents,
  allTemplates,
  allTags,
  askRefetchAllTemplates,
}) {
  const { removeAnalyticsEvent, getRecentAnalyticsEvents } = useApi();
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const [eventObj, setEventObj] = useState(event);
  const [inputNameFocused, setInputNameFocused] = useState(false);
  const inputNameRef = useRef();
  const [openRecentEventsModal, setOpenRecentEventsModal] = useState(false);

  useEffect(() => {
    if (inputNameFocused && inputNameRef.current) {
      inputNameRef.current.focus();
    }
  }, [inputNameFocused]);

  const handleUnfocusInputName = useCallback((e, isBlur = false) => {
    if (e.keyCode !== 13 && !isBlur) return;
    setInputNameFocused(false);
    inputNameRef.current && inputNameRef.current.blur();
  }, []);

  const trimStr = useCallback((str, maxLength) => {
    if (!str) return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  }, []);

  const handleEventUpdate = useCallback(
    async (updatedEvent, errorFlag) => {
      onUpdate(updatedEvent, errorFlag);
    },
    [onUpdate]
  );

  const handleEventRemove = useCallback(
    async (eventID) => {
      const response = await removeAnalyticsEvent({
        gameID: game.gameID,
        branch: branch,
        eventID,
      });
      if (response?.success) {
        onRemove(event.eventID);
      }
    },
    [game.gameID, branch, removeAnalyticsEvent, onRemove, event.eventID]
  );

  const handleValueFormatChange = useCallback(
    (valueID, newFormat) => {
      setEventObj((prevEvent) => {
        if (prevEvent.eventID === event.eventID) {
          const newValues = prevEvent.values.map((val) =>
            val.uniqueID === valueID ? { ...val, valueFormat: newFormat } : val
          );
          return { ...prevEvent, values: newValues };
        }
        return prevEvent;
      });
    },
    [event.eventID]
  );

  const handleValueNameChange = useCallback(
    (valueID, newName) => {
      setEventObj((prevEvent) => {
        if (prevEvent.eventID === event.eventID) {
          const newValues = prevEvent.values.map((val) =>
            val.uniqueID === valueID ? { ...val, valueName: newName } : val
          );
          return { ...prevEvent, values: newValues };
        }
        return prevEvent;
      });
    },
    [event.eventID]
  );

  const handleValueIDChange = useCallback(
    (valueID, newID) => {
      setEventObj((prevEvent) => {
        if (prevEvent.eventID === event.eventID) {
          const newValues = prevEvent.values.map((val) =>
            val.uniqueID === valueID ? { ...val, valueID: newID } : val
          );
          return { ...prevEvent, values: newValues };
        }
        return prevEvent;
      });
    },
    [event.eventID]
  );

  const [pendingDelete, setPendingDelete] = useState(false);
  const onDeletePressed = useCallback(() => {
    if (!pendingDelete) {
      setPendingDelete(true);
    } else {
      handleEventRemove(event.eventID);
    }
  }, [pendingDelete, handleEventRemove, event.eventID]);

  const [errorDuplicateID, setErrorDuplicateID] = useState(false);
  const handleEventIDChange = useCallback(
    (newName) => {
      const newValue = trimStr(newName.replace(/\s/g, ""), 30);
      const isDuplicate = allEvents.some(
        (e) => e.eventCodename === newValue && e.eventID !== eventObj.eventID
      );
      setErrorDuplicateID(isDuplicate);
      setEventObj((prev) => ({ ...prev, eventCodeName: newValue }));
    },
    [allEvents, eventObj.eventID, trimStr]
  );

  const handleEventNameChange = useCallback((newName) => {
    setEventObj((prev) => ({ ...prev, eventName: newName }));
  }, []);

  const addNewValue = useCallback(() => {
    const generateRandomHex = (size) =>
      Array.from({ length: size }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");
    if (eventObj.values.length < 3) {
      const newValue = {
        valueName: "",
        valueFormat: "",
        valueCountMethod: "",
        uniqueID: uuid(),
      };
      setEventObj((prev) => ({
        ...prev,
        values: [...prev.values, newValue],
      }));
    }
  }, [eventObj.values]);

  const removeValue = useCallback((valueID) => {
    setEventObj((prev) => ({
      ...prev,
      values: prev.values.filter((value) => value.uniqueID !== valueID),
    }));
  }, []);

  const [errorEmptyValue, setErrorEmptyValue] = useState(undefined);
  const [errorMissingID, setErrorMissingID] = useState(false);
  const initialEventUpdate = useRef(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (!initialEventUpdate.current) {
        initialEventUpdate.current = true;
        return;
      }
      let hasError = false;
      if (!errorDuplicateID) {
        if (eventObj.eventCodeName === "") {
          setErrorMissingID(true);
          hasError = true;
        } else {
          setErrorMissingID(false);
        }
        const invalidValues = eventObj.values.filter(
          (v) => !v.valueID || !v.valueFormat
        );
        if (invalidValues.length > 0) {
          setErrorEmptyValue(invalidValues);
          hasError = true;
        } else {
          setErrorEmptyValue(false);
        }
        handleEventUpdate(eventObj, hasError);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [eventObj, errorDuplicateID]);

  function addTag(tagName) {
    if (!eventObj.tags.includes(tagName)) {
      setEventObj((prev) => ({
        ...prev,
        tags: [...prev.tags, tagName],
      }));
    }
  }
  function removeTag(tagName) {
    setEventObj((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagName),
    }));
  }

  const [showValues, setShowValues] = useState(false);
  const maxTags = 3;
  const [tableSettings, setTableSettings] = useState({
    sx: { p: "15px", height: "90%", width: "100%" },
    rowHeight: "45px",
    initialState: {},
    mainProps: {
      autosizeOptions: {
        columns: [],
        includeOutliers: true,
      },
    },
    pageSizeOptions: [],
  });
  function useIntervalToggle(callback, delay = 60000) {
    const [isActive, setIsActive] = useState(false);
    const callbackRef = useRef(callback);

    useEffect(() => {
      callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
      if (!isActive) return;

      const interval = setInterval(() => {
        callbackRef.current();
      }, delay);

      return () => clearInterval(interval);
    }, [isActive, delay]);

    return [isActive, setIsActive];
  }
  const [recentEvents, setRecentEvents] = useState([]);
  const [genericEventsFields, setGenericEventsFields] = useState([]);
  const [isRunning, setIsRunning] = useIntervalToggle(async () => {
    fetchRecentEvents();
  });
  const [columns, setColumns] = useState([]);
  const [isLoading_RecentEvents, setIsLoading_RecentEvents] = useState(false);
  async function fetchRecentEvents() {
    setIsLoading_RecentEvents(true);
    const resp = await getRecentAnalyticsEvents({
      gameID: game.gameID,
      branch,
      eventID: event.eventID,
    });
    let result = resp.events;
    function processEvents(events) {
      const headerKeys = new Set();
      events.forEach((event) => {
        if (event.event) {
          Object.keys(event.event).forEach((key) => headerKeys.add(key));
        }
        if (event.event.actions) {
          Object.keys(event.event.actions).forEach((key) =>
            headerKeys.add(key)
          );
        }
        if (event.event.customData) {
          Object.keys(event.event.customData).forEach((key) =>
            headerKeys.add(key)
          );
        }
        if (event.headers) {
          Object.keys(event.headers).forEach((key) => headerKeys.add(key));
        }
      });
      headerKeys.delete("actions");
      headerKeys.delete("customData");

      const transformedEvents = events.map(({ headers, event }) => ({
        id: nanoid(),
        ...headers,
        ...event,
        ...event.actions,
        ...event.customData,
      }));

      return {
        uniqueHeaderKeys: Array.from(headerKeys),
        transformedEvents,
      };
    }
    if (resp.events.length > 0) {
      const processed = processEvents(resp.events);

      const dynamicColumns = processed.uniqueHeaderKeys.map((key) => {
        const sampleValue = processed.transformedEvents[0][key];
        const colType = typeof sampleValue === "number" ? "number" : "string";

        return {
          field: key,
          headerName: key.charAt(0).toUpperCase() + key.slice(1),
          // width: 150,
          type: colType,
          headerAlign: "center",
          align: "center",
          sortable: true,
          filterable: true,
          renderCell: (params) => (
            <div
              style={{
                display: "flex",
                height: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  whiteSpace: "nowrap",
                  fontSize: "14px",
                  fontWeight: "regular",
                  textAlign: "center",
                  verticalAlign: "middle",
                }}
              >
                {params.value}
              </Typography>
            </div>
          ),
        };
      });
      setColumns(dynamicColumns);
      setRecentEvents(processed.transformedEvents);
      setTableSettings((prev) => {
        return {
          ...prev,
          mainProps: {
            autosizeOptions: {
              columns: dynamicColumns,
              includeOutliers: true,
              outliersFactor: 3,
              expand: true,
            },
          },
        };
      });
    } else {
      setRecentEvents(result);
    }
    setIsLoading_RecentEvents(false);
  }
  useEffect(() => {
    if (!openRecentEventsModal) {
      setRecentEvents([]);
    } else {
      fetchRecentEvents();
    }
    setIsRunning(openRecentEventsModal);
  }, [openRecentEventsModal]);

  return (
    <div
      className={`${s.event} ${
        errorDuplicateID || errorEmptyValue || errorMissingID
          ? s.eventError
          : ""
      }`}
    >
      <Modal
        open={openRecentEventsModal}
        onClose={() => setOpenRecentEventsModal(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            height: "90%",
            bgcolor: "var(--bg-color3)",
            border: "1px solid #625FF440",
            boxShadow: "0px 0px 5px 2px rgba(98, 95, 244, 0.2)",
            overflowY: "auto",
            scrollbarWidth: "thin",
            borderRadius: "2rem",
            display: "flex",
            flexDirection: "column",
            p: 4,
          }}
        >
          <Typography
            sx={{ mb: 2 }}
            id="modal-modal-title"
            variant="h6"
            component="h2"
          >
            {event.eventName} - the last 100 events
          </Typography>

          <DataTable
            isLoading={isLoading_RecentEvents}
            tableSettings={tableSettings}
            columns={columns}
            rows={recentEvents}
          />
        </Box>
      </Modal>

      <div className={s.basicSettings}>
        <Tooltip title="View recent events" disableInteractive>
          <IconButton
            variant="text"
            onClick={() => setOpenRecentEventsModal(true)}
          >
            <PreviewIcon />
          </IconButton>
        </Tooltip>
        <Input
          spellCheck={false}
          inputRef={inputNameRef}
          value={eventObj.eventName}
          onKeyDown={handleUnfocusInputName}
          onBlur={(e) => handleUnfocusInputName(e, true)}
          onFocus={() => setInputNameFocused(true)}
          onChange={(e) => handleEventNameChange(e.target.value)}
          sx={{
            width: "20%",
            backgroundColor: inputNameFocused
              ? "rgba(0,0,0,0.1)"
              : "rgba(0,0,0,0.0)",
            "& .MuiInputBase-input": {
              textAlign: "start",
              fontSize: "16px",
              width: "fit-content",
            },
            "&.MuiInputBase-root::before": { borderBottom: "none" },
            "&.MuiInputBase-root:hover::before": {
              borderBottom: "1px solid #6E758E",
            },
            ml: 3,
            mr: 5,
          }}
        />

        <Tooltip
          open={errorDuplicateID}
          placement="bottom"
          disableInteractive
          title="Event ID must be unique"
        >
          <TextField
            disabled
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography
                    sx={{ fontSize: 12 }}
                    variant="body1"
                    color="text.secondary"
                  >
                    Event ID
                  </Typography>
                </InputAdornment>
              ),
            }}
            error={errorMissingID}
            sx={{
              "& input": { fontSize: 14 },
              "& .MuiInputBase-root::after": {
                borderBottom: errorDuplicateID
                  ? "2px solid red"
                  : "2px solid #6E758E",
              },
              "& .MuiInputBase-root::before": {
                borderBottom: errorDuplicateID
                  ? "2px solid red"
                  : "2px solid #6E758E",
              },
              width: "100%",
              maxWidth: "200px",
              mr: 5,
            }}
            size="small"
            variant="standard"
            onChange={(e) => handleEventIDChange(e.target.value)}
            defaultValue={eventObj.eventCodeName}
          />
        </Tooltip>
        <Button
          onClick={() => setShowValues(!showValues)}
          sx={{ width: 300, ml: 2 }}
          variant={showValues ? "outlined" : "contained"}
        >
          Show values
        </Button>

        <div className={s.tags}>
          {eventObj.tags.length > maxTags && (
            <Tooltip
              disableInteractive
              title={eventObj.tags.map((tag) => tag).join(", ")}
              placement="top"
              variant="body2"
              sx={{
                fontSize: "12px",
                display: "block",
              }}
            >
              <Typography
                sx={{ textWrap: "nowrap", mr: 2, fontSize: "12px" }}
                variant="body2"
                color="text.grey"
              >
                {eventObj.tags.length - maxTags} more tags
              </Typography>
            </Tooltip>
          )}
          {eventObj.tags.slice(0, maxTags).map((tag, index) => (
            <Tooltip
              disableInteractive
              title="Click to remove"
              placement="top"
              key={tag + index}
            >
              <Chip
                onClick={() => removeTag(tag)}
                label={trimStr(tag, 10)}
                sx={{ mr: 0.5 }}
              />
            </Tooltip>
          ))}
          <AddTags
            tags={eventObj.tags}
            tagsInUse={allTags || []}
            onTagAdded={addTag}
          />
        </div>
      </div>

      {showValues && (
        <div className={s.values}>
          {eventObj.values.map((value, idx) => (
            <ValueItem
              key={value.uniqueID}
              value={value}
              isDefaultValue={
                eventObj.defaultValues &&
                eventObj.defaultValues.includes(value.valueID)
              }
              index={idx}
              onValueRemove={removeValue}
              onValueFormatChange={handleValueFormatChange}
              onValueNameChange={handleValueNameChange}
              onValueIDChange={handleValueIDChange}
              allTemplates={allTemplates}
              askRefetchAllTemplates={askRefetchAllTemplates}
            />
          ))}
        </div>
      )}

      <div className={s.removeEvent}>
        <Tooltip title="Remove event as unused">
          <Button
            onClick={onDeletePressed}
            onMouseLeave={() => setPendingDelete(false)}
            sx={{
              ml: "auto",
              p: 0,
              minWidth: "40px",
              width: "40px",
              height: "40px",
              mr: 2,
              ...(pendingDelete
                ? {
                    bgcolor: "#b03333",
                    color: "white",
                    ":hover": { bgcolor: "#cf4040", color: "white" },
                  }
                : {
                    bgcolor: "#b03333",
                    color: "white",
                    ":hover": { bgcolor: "#cf4040", color: "white" },
                  }),
            }}
          >
            {pendingDelete ? (
              <CheckSharpIcon sx={{ fontSize: 24 }} />
            ) : (
              <DeleteSharpIcon sx={{ fontSize: 24 }} />
            )}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

function ValueItem({
  value,
  onValueNameChange,
  onValueIDChange,
  onValueFormatChange,
  onValueRemove,
  isDefaultValue,
  allTemplates,
  askRefetchAllTemplates,
}) {
  const [valueObj, setValueObj] = useState(value);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [dependencyList, setDependencyList] = useState([]);
  const confirmCallback = useRef(null);

  const trimStr = useCallback((str, maxLength) => {
    if (!str) return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  }, []);

  const [pendingDelete, setPendingDelete] = useState(false);
  const startRemoveValue = useCallback(() => {
    if (!pendingDelete) {
      setPendingDelete(true);
    } else {
      if (dependencyList.length > 0) {
        setOpenConfirmModal(true);
        confirmCallback.current = callRemove;
      } else {
        callRemove();
      }
    }
  }, [pendingDelete, dependencyList]);

  const onChangeType = useCallback(
    (newType) => {
      if (dependencyList.length > 0) {
        setOpenConfirmModal(true);
        confirmCallback.current = () => callChangeType(newType);
      } else {
        callChangeType(newType);
      }
    },
    [dependencyList]
  );

  const callChangeType = useCallback(
    (newType) => {
      onValueFormatChange(value.uniqueID, newType);
      setValueObj((prev) => ({ ...prev, valueFormat: newType }));
      askRefetchAllTemplates();
    },
    [onValueFormatChange, value.uniqueID, askRefetchAllTemplates]
  );

  const callRemove = useCallback(() => {
    onValueRemove(value.uniqueID);
    askRefetchAllTemplates();
  }, [onValueRemove, value.uniqueID, askRefetchAllTemplates]);

  useEffect(() => {
    setDependencyList(
      allTemplates.filter(
        (t) => t.templateEventTargetValueId === valueObj.uniqueID
      )
    );
  }, [allTemplates, valueObj.uniqueID]);

  return (
    <div className={s.valueContainer}>
      <Modal
        open={openConfirmModal}
        onClose={() => setOpenConfirmModal(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            maxHeight: 800,
            bgcolor: "var(--bg-color3)",
            border: "1px solid #625FF440",
            boxShadow: "0px 0px 5px 2px rgba(98, 95, 244, 0.2)",
            overflowY: "auto",
            scrollbarWidth: "thin",
            borderRadius: "2rem",
            display: "flex",
            flexDirection: "column",
            p: 4,
          }}
        >
          <Typography id="modal-modal-title" variant="h6" component="h2">
            You have dependencies for this value!
          </Typography>
          <Typography
            id="modal-modal-description"
            sx={{ mt: 2, display: "inline-block" }}
          >
            The following player warehouse elements depend on this event value:{" "}
            <Typography
              component="span"
              color="primary"
              sx={{ filter: "brightness(1.2)" }}
            >
              {dependencyList.map((t) => t.templateName).join(", ")}
            </Typography>
          </Typography>
          <Typography
            id="modal-modal-description"
            sx={{ mt: 2, display: "inline-block" }}
          >
            If you confirm changes, dependent elements will be removed forever.
            Change value format type?
          </Typography>
          <Box
            sx={{ display: "flex", width: "100%", alignItems: "center", mt: 2 }}
          >
            <Button
              onClick={() => {
                confirmCallback.current();
                setOpenConfirmModal(false);
              }}
            >
              Confirm
            </Button>
            <Button
              sx={{ ml: "auto" }}
              onClick={() => setOpenConfirmModal(false)}
              variant="contained"
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Modal>

      <Tooltip
        disableInteractive
        title={isDefaultValue ? "Default value cannot be changed" : ""}
        placement="top"
      >
        <div className={s.eventValue}>
          <TextField
            disabled={isDefaultValue}
            error={!valueObj.valueName}
            onChange={(e) => {
              onValueNameChange(value.uniqueID, e.target.value);
              setValueObj((prev) => ({ ...prev, valueName: e.target.value }));
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography
                    sx={{ fontSize: 12 }}
                    variant="body1"
                    color="text.secondary"
                  >
                    Name:
                  </Typography>
                </InputAdornment>
              ),
            }}
            sx={{ "& input": { fontSize: 14 }, width: "160px", mr: 2 }}
            size="small"
            variant="standard"
            value={valueObj.valueName}
          />

          <FormControl
            disabled={isDefaultValue}
            error={!valueObj.valueFormat}
            sx={{ width: "140px" }}
            variant="standard"
            size="small"
          >
            <Select
              sx={{ fontSize: 14 }}
              value={valueObj.valueFormat}
              size="small"
              onChange={(e) => onChangeType(e.target.value)}
            >
              <MenuItem value="float">Number (1.23)</MenuItem>
              <MenuItem value="string">String (text)</MenuItem>
              <MenuItem value="bool">Boolean (true/false)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            disabled={isDefaultValue}
            error={!valueObj.valueID}
            onChange={(e) => {
              onValueIDChange(value.uniqueID, e.target.value);
              setValueObj((prev) => ({ ...prev, valueID: e.target.value }));
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography
                    sx={{ fontSize: 12 }}
                    variant="body1"
                    color="text.secondary"
                  >
                    ID:
                  </Typography>
                </InputAdornment>
              ),
            }}
            sx={{ "& input": { fontSize: 14 }, width: "160px", ml: 2 }}
            size="small"
            variant="standard"
            value={valueObj.valueID}
          />

          {!isDefaultValue && (
            <Tooltip title="Remove as unused" disableInteractive>
              <Button
                sx={{
                  p: 2,
                  minWidth: "24px",
                  width: "24px",
                  height: "24px",
                  ml: "15px",
                  "&": pendingDelete
                    ? { bgcolor: "#b03333", color: "#e7e7e7" }
                    : {},
                  ":hover": pendingDelete
                    ? { bgcolor: "#cf4040", color: "#e7e7e7" }
                    : { bgcolor: "#b03333", color: "#e7e7e7" },
                }}
                onClick={startRemoveValue}
                onMouseLeave={() => setPendingDelete(false)}
              >
                {pendingDelete ? (
                  <CheckSharpIcon sx={{ fontSize: 24 }} />
                ) : (
                  <DeleteSharpIcon sx={{ fontSize: 24 }} />
                )}
              </Button>
            </Tooltip>
          )}
        </div>
      </Tooltip>
    </div>
  );
}

export default AnalyticEvents;
