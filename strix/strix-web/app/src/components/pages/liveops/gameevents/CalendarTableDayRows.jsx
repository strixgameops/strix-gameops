import React, {
  useState,
  useEffect,
} from "react";
import dayjs from "dayjs";
import s from "./css/gameevents.module.css";

import shortid from "shortid";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import TodaySharpIcon from "@mui/icons-material/TodaySharp";
import EditSharpIcon from "@mui/icons-material/EditSharp";
import EventNoteSharpIcon from "@mui/icons-material/EventNoteSharp";
import PauseSharpIcon from "@mui/icons-material/PauseSharp";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import EventEditor from "./EventsEditor.jsx";
import { trimStr, getEmptyEventTemplate, clamp } from "./sharedFunctions.jsx";
import ContainerCell from "./ContainerCell.jsx";

export default function CalendarTableDayRows({
  daysArray,
  events,
  eventsOccasions,
  eventsOccasionsWithoutDurations,
  onEventChange,
  onEventRemove,
  calendarFilteredEvent,
  showEventsDurations = false,
  nodeData,
  treeData,
  segmentsList,
  notes,
  onOpenNoteEditor,

  //
  entities,
  gameModelFunctions,
  offers,
  pricing,
  exchangeRates,
  exchangeRates_USD,
  allEntitiesNames,
}) {
  let rows = [];
  const daysInRow = 7;
  const maxEventsVisible = 3;

  function DateItem({
    dayObj,
    events,
    onEventChange,
    onEventRemove,
    onOpenNoteEditor,
  }) {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [eventToEdit, setEventToEdit] = useState();
    const [currentEvents, setCurrentEvents] = useState([]);
    const [currentNotes, setCurrentNotes] = useState([]);

    useEffect(() => {
      if (notes) {
        setCurrentNotes(
          notes.filter((n) =>
            dayjs.utc(n.date).isSame(dayjs.utc(dayObj.day), "day")
          )
        );
      }
    }, [notes]);
    useEffect(() => {
      if (
        eventsOccasions &&
        eventsOccasions.length > 0 &&
        eventsOccasions.length === events.length
      ) {
        setCurrentEvents(filterEventsByDay(events));
      }
    }, [events, eventsOccasions]);
    const handleClick = (event) => {
      setAnchorEl(event.currentTarget);
    };
    function openEditor(event) {
      setEventToEdit(event);
    }

    const handleClose = () => {
      setAnchorEl(null);
    };
    const [isHovered, setIsHovered] = useState(false);

    function filterEventsByDay(events) {
      return events
        .map((e) => {
          let eventOcc = eventsOccasions.find((ev) => ev.id === e.id);
          const isInThisDay = eventOcc.dates.some((date) =>
            dayjs.utc(date).isSame(dayjs.utc(dayObj.day), "day")
          );
          if (isInThisDay) {
            return e;
          } else {
            return null;
          }
        })
        .filter(Boolean);
    }

    function getFillParams() {
      let result = currentEvents.slice(0, maxEventsVisible).map((event) => {
        let dates = eventsOccasionsWithoutDurations.find(
          (e) => e.id === event.id
        ).dates;

        // Find raw day of event start. If event doesn't occur on that day,
        // try to find the closest date in the past where it occurs, then play with event.duration.
        let startDate = findLatestDateBeforeCurrent(dates, dayObj.day);

        if (!startDate) {
          return { start: 0, end: 0, color: "#fff" };
        }
        startDate = dayjs.utc(startDate).startOf("day");

        // Find date of event start with exact hours and minutes
        let exactDate = startDate
          .hour(parseInt(event.startingTime.slice(0, 2)))
          .minute(parseInt(event.startingTime.slice(2, 5)));

        // Find end exact date of event
        let endDate = exactDate.add(event.duration, "minutes");

        const start = calculateTimePercentage(dayObj.day, exactDate);
        const end = calculateTimePercentage(dayObj.day, endDate);

        return {
          start: clamp(start, 0, 100),
          end: clamp(end, 0, 100),
          color: event.chipColor,
        };
      });
      return result;
    }
    function findLatestDateBeforeCurrent(dates, currentDate) {
      const currentDay = dayjs.utc(currentDate);

      // If no dates are before the current date, check if the current date itself is in the array
      if (dates.some((d) => dayjs.utc(d).isSame(currentDay, "day"))) {
        return currentDay; // Return the current date if it exists in the array
      }
      // Convert all dates to dayjs.utc objects
      const filteredDates = dates
        .map((date) => dayjs.utc(date)) // Convert all dates to dayjs.utc
        .filter((date) => date.isBefore(currentDay)); // Filter only those that are before the current date

      // If there are any dates before the current date, find the latest one
      if (filteredDates.length > 0) {
        const latest = filteredDates.reduce((max, date) =>
          date.isAfter(max) ? date : max
        );
        return latest; // Return the latest date found
      }

      // If no suitable dates are found, return null
      return null;
    }

    const calculateTimePercentage = (startDate, secondDate) => {
      const startMillis = dayjs.utc(startDate).valueOf();
      const secondMillis = dayjs.utc(secondDate).valueOf();
      const dayDuration =
        dayjs.utc(startDate).endOf("day").valueOf() - startMillis;
      const dur = secondMillis - startMillis;
      const perc = (dur / dayDuration) * 100;

      return perc;
    };
    function getCurrentTimeFiller() {
      const currentDate = dayjs.utc();
      const dateDay = dayjs.utc(dayObj.day);
      if (currentDate.isSame(dateDay, "day")) {
        const position = calculateTimePercentage(dateDay, currentDate);
        return { start: position, end: position };
      } else {
        return null;
      }
    }
    function getIsPreviousDay() {
      return dayjs.utc(dayObj.day).isBefore(dayjs.utc().startOf("day"), "day");
    }
    return (
      <>
        <ContainerCell
          isPreviousDay={getIsPreviousDay()}
          currentTimeFiller={getCurrentTimeFiller()}
          durationsFillers={showEventsDurations ? getFillParams() : []}
          onClick={handleClick}
          className={`${dayObj.isCurrentMonth ? s.dateItem : `${s.dateItem} ${s.previous}`}`}
          key={dayObj.day}
        >
          <Typography
            sx={{ position: "absolute", top: "5%", zIndex: 2 }}
            color={dayObj.isCurrentMonth ? "text.primary" : "text.grey"}
          >
            {dayjs.utc(dayObj.day).format("DD")}
          </Typography>

          <Button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            sx={{
              borderRadius: 0,
              position: "absolute",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              zIndex: 2,
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                transition: "all 0.15s",
              },
            }}
          >
            <EditSharpIcon
              htmlColor="#b8b8b8"
              style={{ opacity: isHovered ? 1 : 0, transition: "all 0.15s" }}
            />
          </Button>

          <Box sx={{ display: "flex" }}>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {currentEvents.map((event, index) => {
                if (index >= maxEventsVisible) return null;
                return (
                  <Typography
                    fontSize="small"
                    sx={{
                      position: "absolute",
                      top: `${25 + 14 * index}%`,
                      left: "10%",
                      display: "flex",
                      alignItems: "center",
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                    color={
                      dayObj.isCurrentMonth
                        ? event.isPaused
                          ? "text.secondary"
                          : "text.primary"
                        : "text.grey"
                    }
                  >
                    <div
                      className={s.calendarEventChip}
                      style={{
                        backgroundColor: event.chipColor,
                        opacity: dayObj.isCurrentMonth ? 1 : 0.4,
                      }}
                    ></div>
                    {trimStr(event.name, 22)}
                    {event.isPaused && (
                      <PauseSharpIcon
                        sx={{ ml: 0.6, width: "18px" }}
                        htmlColor="#8b8b8b"
                      />
                    )}
                  </Typography>
                );
              })}
              {currentEvents.length > maxEventsVisible && (
                <Typography
                  fontSize="small"
                  sx={{
                    position: "absolute",
                    top: `${25 + 14 * maxEventsVisible}%`,
                    left: "10%",
                  }}
                  color={"text.grey"}
                >
                  {currentEvents.length - maxEventsVisible} more events...
                </Typography>
              )}
            </Box>
            {currentNotes.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  position: "absolute",
                  right: "2%",
                  top: "8%",
                }}
              >
                <Typography
                  fontSize="medium"
                  sx={{ mr: 0.7 }}
                  color={"text.primary"}
                >
                  {currentNotes.length}
                </Typography>
                <StickyNote2Icon htmlColor={"#31cc31"} />
              </Box>
            )}
          </Box>
        </ContainerCell>
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          <Box
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              maxHeight: "400px",
            }}
          >
            <Box sx={{ display: "flex" }}>
              <TodaySharpIcon sx={{ mr: 1 }} />
              <Typography fontWeight="bold" sx={{ mb: 1 }}>
                {dayjs.utc(dayObj.day).format("DD MMMM YYYY")}
              </Typography>
            </Box>
            <Typography fontWeight="bold" fontSize="14px" sx={{ mb: 1 }}>
              Events:
            </Typography>
            <div
              className={s.eventsList}
              style={{
                overflowY: currentEvents.length > 7 ? "scroll" : "auto",
              }}
            >
              {currentEvents.map((event, index) => (
                <Tooltip
                  disableInteractive
                  title="Click to edit event"
                  placement="right"
                >
                  <Button
                    onClick={() => openEditor(event)}
                    sx={{
                      textTransform: "none",
                      width: "100%",
                      justifyContent: "start",
                    }}
                  >
                    <EventNoteSharpIcon sx={{ mr: 1 }} fontSize="small" />
                    <Typography>{trimStr(event.name, 40)}</Typography>
                  </Button>
                </Tooltip>
              ))}
              <Box
                sx={{ display: "flex", justifyContent: "space-between", p: 1 }}
              >
                <Button
                  variant="contained"
                  sx={{ mt: 2 }}
                  onClick={() =>
                    openEditor(getEmptyEventTemplate(events, dayObj.day))
                  }
                >
                  <Typography
                    // color="text.primary"
                    sx={{ textTransform: "none" }}
                  >
                    + Add new event
                  </Typography>
                </Button>

                <Button
                  variant="outlined"
                  sx={{ mt: 2 }}
                  onClick={() => onOpenNoteEditor(dayObj.day)}
                >
                  <Typography
                    color="text.primary"
                    sx={{ textTransform: "none" }}
                  >
                    View/make notes
                  </Typography>
                </Button>
              </Box>
            </div>
          </Box>
        </Popover>
        <EventEditor
          gameModelFunctions={gameModelFunctions}
          nodeData={nodeData}
          treeData={treeData}
          event={eventToEdit}
          onChange={onEventChange}
          onRemove={onEventRemove}
          open={Boolean(eventToEdit)}
          onClose={() => setEventToEdit(null)}
          segmentsList={segmentsList}
          offersList={offers}
          pricing={pricing}
          exchangeRates={exchangeRates}
          exchangeRates_USD={exchangeRates_USD}
          entities={entities}
          allEntitiesNames={allEntitiesNames}
        />
      </>
    );
  }

  for (let i = 0; i < daysArray.length; i += daysInRow) {
    const weekDays = daysArray.slice(i, i + daysInRow);

    // Make row for each 7 days
    const row = (
      <tr key={i} className={s.weekRow}>
        {weekDays.map((dayObj) => (
          <DateItem
            events={events}
            dayObj={dayObj}
            onEventChange={onEventChange}
            onEventRemove={onEventRemove}
            onOpenNoteEditor={onOpenNoteEditor}
          />
        ))}
      </tr>
    );
    rows.push(row);
  }

  return rows;
}