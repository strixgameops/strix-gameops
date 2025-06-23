import React, { useEffect, useRef, useState } from "react";
import useApi from "@strix/api";
import { useBranch, useGame } from "@strix/gameContext";
import s from "./eventSearcher.module.css";
import { useCollapse } from "react-collapsed";
import { TextField, Tooltip } from "@mui/material";
import CollapsibleCategory from "./CollapsibleCategory";
import CollapsibleNode from "./CollapsibleNode";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

function SearchEventField({
  onTargetEventSelected,
  allEvents,
  hardSelectEvent,
  chosenSecondaryDimension,
}) {
  const { game } = useGame();
  const { branch, environment } = useBranch();

  const [events, setEvents] = useState(allEvents);
  const [eventMatches, setEventMatches] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState({});
  const [isInputFocused, setIsInputFocused] = useState(!hardSelectEvent);
  const resultsRef = useRef(null);
  const isHovered = useRef(false);
  const [currentPrompt, setCurrentPrompt] = useState("");

  const [isCategoryExpanded, setCategoryExpanded] = useState(true);

  const {
    getCollapseProps: getCategoryCollapseProps,
    getToggleProps: getCategoryToggleProps,
  } = useCollapse({
    isExpanded: isCategoryExpanded,
  });

  useEffect(() => {
    setEvents(allEvents);
  }, [allEvents]);
  useEffect(() => {
    onPromptChange("");
  }, [events]);

  function onPromptChange(text) {
    if (!events) return;
    const searchText = text.toLowerCase();
    // Filtering for matches
    const matches = events.filter((event) => {
      const eventsMatch = event.eventName.toLowerCase().includes(searchText);
      return eventsMatch;
    });
    setCurrentPrompt(text);
    setEventMatches(matches);
  }

  useEffect(() => {
    if (hardSelectEvent !== undefined) {
      //   onEventSelected(hardSelectEvent);
      //   // console.log('Hard select event', hardSelectEvent)
      setSelectedEvent(hardSelectEvent);
      setCurrentPrompt(`${hardSelectEvent.eventName}`);
    }
  }, [hardSelectEvent]);

  function onEventSelected(event, hardSetValue) {
    setSelectedEvent(event);
    setCurrentPrompt(`${event.eventName}`);
    onTargetEventSelected(event, hardSetValue);
    handleInputBlur();
  }

  function handleInputFocus() {
    setIsInputFocused(true);
  }
  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  const handleResultsMouseEnter = () => {
    isHovered.current = true;
  };

  const handleResultsMouseLeave = () => {
    isHovered.current = false;
  };

  function trim(str, maxLength) {
    if (str === undefined || str === "") return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  }

  function isEventOfChosenSecondaryDimension(event) {
    if (!chosenSecondaryDimension) {
      return true;
    }
    return event.values.some((v) => v.uniqueID === chosenSecondaryDimension);
  }

  return (
    <div
      className={s.searchAnalyticsEventContainer}
      onMouseEnter={handleResultsMouseEnter}
      onMouseLeave={handleResultsMouseLeave}
    >
      <TextField
        spellCheck={false}
        fullWidth
        label="Analytics Event"
        id="fullWidth"
        autoComplete={false}
        value={currentPrompt}
        onFocus={() => handleInputFocus()}
        onBlur={handleInputBlur}
        onChange={(event) => onPromptChange(event.target.value)}
        InputLabelProps={{ shrink: currentPrompt ? true : false }}
        sx={{
          "& .MuiInputBase-root": {
            borderRadius: "2rem",
            borderBottomRightRadius: isInputFocused ? 0 : "2rem",
            borderBottomLeftRadius: isInputFocused ? 0 : "2rem",
            transition: "border-radius 0.15s ease-in-out",
          },
        }}
      />

      <div
        className={`${!isInputFocused ? s.foundEventsContainerClosed : ""} ${s.foundEventsContainer}`}
        ref={resultsRef}
      >
        <div className={s.eventsBody}>
          {eventMatches.map((event, index) => (
            <div key={index} className={`${s.matchOption}`}>
              <ul>
                <Tooltip
                  title={
                    !isEventOfChosenSecondaryDimension(event)
                      ? "You have selected a secondary dimension, so you can't add other events to dataset"
                      : ""
                  }
                  disableInteractive
                >
                  <li
                    key={event.eventID}
                    onClick={() => {
                      if (isEventOfChosenSecondaryDimension(event)) {
                        onEventSelected(event);
                      }
                    }}
                    className={`${s.event} ${!isEventOfChosenSecondaryDimension(event) ? s.matchOptionDisabled : ""}`}
                  >
                    <Typography sx={{ width: "80%", p: "5px", pl: 2 }}>
                      {event.eventName}
                    </Typography>

                    <Typography sx={{ width: "80%", p: "5px", pl: 2 }}>
                      {event.values.length} values
                    </Typography>

                    {/* <div className={s.eventValues}>
                        {event.values.length > 0 &&
                          event.values.map((value, index) => (
                            <Tooltip
                              title={`${value.valueName} | ${value.valueFormat}`.toUpperCase()}
                              disableInteractive
                            >
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventSelected(event, value);
                                }}
                                disabled={
                                  !isEventOfChosenSecondaryDimension(event)
                                }
                                variant="contained"
                                sx={{
                                  width: "fit-content",
                                  fontSize: 14,
                                  p: "5px",
                                  pt: "2px",
                                  pb: "2px",
                                  backgroundColor: "#273ca79d",
                                }}
                                key={index}
                              >
                                {trim(value.valueName, 10)}
                              </Button>
                            </Tooltip>
                          ))}
                      </div> */}
                  </li>
                </Tooltip>
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SearchEventField;
