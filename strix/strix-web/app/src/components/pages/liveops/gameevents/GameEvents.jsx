import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Helmet } from "react-helmet";
import titles from "titles";
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";
import s from "./css/gameevents.module.css";

import shortid from "shortid";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import { useGame, useBranch } from "@strix/gameContext";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import { useTheme } from "@mui/material/styles";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import ArrowBackIosNewSharpIcon from "@mui/icons-material/ArrowBackIosNewSharp";
import { useAlert } from "@strix/alertsContext";
import { customAlphabet } from "nanoid";
import useApi from "@strix/api";
import NotesEditor from "./NotesEditor.jsx";
import GanttTimelineCalendar from "./GanttTimelineCalendar.jsx";
import CalendarTableDayRows from "./CalendarTableDayRows.jsx";
import { trimStr, getEmptyEventTemplate, clamp } from "./sharedFunctions.jsx";
const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);
dayjs.extend(utc);
const GameEvents = () => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const theme = useTheme();

  const baseCurr =
    game.apiKeys?.find((key) => key.service === "googleplayservices")
      ?.secondary || "USD";

  const [calendarViewMode, setCalendarViewMode] = useState("eu"); // eu = monday is the first day of the week. us = sunday is the first.
  const [viewMode, setViewMode] = useState("calendar"); // calendar / timeline
  const [currentDaysArray, setCurrentDaysArray] = useState([]);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(
    dayjs.utc().month()
  );
  const [currentCalendarYear, setCurrentCalendarYear] = useState(
    dayjs.utc().year()
  );

  // {
  //   id: 1,
  //   name: "My Awesome Event 1",
  //   startingDate: new Date(2023, 5, 1), // Sets when the event starts
  //   startingTime: parseInt("0000"), // Time in 24h format. Determines when the event starts at the day of startingDate
  //   duration: 24, // Determines how long the event lasts, in hours.
  //   isRecurring: false, // If true, the event will recur
  //   recurEveryN: 1, // Sets amount of units event will recur. E.g. Every 2 days.
  //   recurEveryType: "days", // Units type. E.g. every 2 days/weeks/months/years
  //   recurWeekly_recurOnWeekDay: ["Mon"], // Determines the day when the event should occur.
  //   recurMonthly_ConfigNum: 0,
  //   Monthly config #0:
  //   recurMonthly_recurOnDayNum: 1, // Determines the day when the event should occur. E.g. if every 2 months, occur on day 15
  //   Monthly config #1:
  //   recurMonthly_recurOnWeekNum: 1, // Determines the week num. E.g. on the 3rd week day. 3rd would be the number.
  //   recurMonthly_recurOnWeekDay: "Mon", // Determines the first day of month, e.g. first sunday / first sunday.
  //   recurYearly_ConfigNum: 0,
  //   Yearly config #0:
  //   recurYearly_recurOnMonth: "January", // Determines the month when the event should occur. E.g. if every 2 years, occur on first april of the 3rd year
  //   recurYearly_recurOnDayNum: 1, // Determines the day when the event should occur. Require _recurOnMonth. E.g. if every 2 years, occur on day 15 of april on the 3rd year
  //   Yearly config #1:
  //   recurYearly_recurOnWeekNum: 1, // Determines the week num in alternative config. E.g. on the 3rd week day of X month. 3rd would be the number.
  //   recurYearly_recurOnWeekDay: "Mon", // Determines the week day in alternative config. E.g. on the N wednesday of X month.
  // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
  //   chipColor: "#fff", // Visual color for calendar
  //   isPaused: false, // If true, event will look deactivated and won't be available to players
  //   selectedEntities: [], // Entities node IDs that are affected by this event
  // },
  const [events, setEvents] = useState([
    // {
    //   id: 1,
    //   name: "My Awesome Event 1",
    //   startingDate: dayjs.utc(),
    //   startingTime: "1234", // Time in 24h format. Determines when the event starts at the day of startingDate
    //   duration: 72, // Determines how long the event lasts, in hours.
    //   isRecurring: false,
    //   recurEveryType: "days",
    //   recurEveryN: 1,
    //   recurWeekly_recurOnWeekDay: ["Mon", "Sat"], // Determines the day when the event should occur.
    //   recurMonthly_ConfigNum: 1,
    //   recurMonthly_recurOnDayNum: 1, // Determines the day when the event should occur. E.g. if every 2 months, occur on day 15
    //   recurMonthly_recurOnWeekNum: 1, // Determines the week num. E.g. on the 3rd week day. 3rd would be the number.
    //   recurMonthly_recurOnWeekDay: "Mon", // Determines the first day of month, e.g. first sunday / first sunday.
    //   recurYearly_ConfigNum: 1,
    //   recurYearly_recurOnMonth: "April", // Determines the month when the event should occur. E.g. if every 2 years, occur on first april of the 3rd year
    //   recurYearly_recurOnDayNum: 22, // Determines the day when the event should occur. Require _recurOnMonth. E.g. if every 2 years, occur on day 15 of april on the 3rd year
    //   recurYearly_recurOnWeekNum: 3, // Determines the week num in alternative config. E.g. on the 3rd week day of X month. 3rd would be the number.
    //   recurYearly_recurOnWeekDay: "Mon", // Determines the week day in alternative config. E.g. on the N wednesday of X month.
    //   chipColor: "#fff",
    //   isPaused: false,
    //   selectedEntities: [],
    // },
    // {
    //   id: 2,
    //   name: "My Awesome Event 2",
    //   startingDate: dayjs.utc().startOf("month"),
    //   startingTime: "1234", // Time in 24h format. Determines when the event starts at the day of startingDate
    //   duration: 4, // Determines how long the event lasts, in hours.
    //   isRecurring: true,
    //   recurEveryType: "days",
    //   recurEveryN: 1,
    //   recurWeekly_recurOnWeekDay: ["Mon", "Sat"], // Determines the day when the event should occur.
    //   recurMonthly_ConfigNum: 1,
    //   recurMonthly_recurOnDayNum: 1, // Determines the day when the event should occur. E.g. if every 2 months, occur on day 15
    //   recurMonthly_recurOnWeekNum: 1, // Determines the week num. E.g. on the 3rd week day. 3rd would be the number.
    //   recurMonthly_recurOnWeekDay: "Mon", // Determines the first day of month, e.g. first sunday / first sunday.
    //   recurYearly_ConfigNum: 1,
    //   recurYearly_recurOnMonth: "April", // Determines the month when the event should occur. E.g. if every 2 years, occur on first april of the 3rd year
    //   recurYearly_recurOnDayNum: 22, // Determines the day when the event should occur. Require _recurOnMonth. E.g. if every 2 years, occur on day 15 of april on the 3rd year
    //   recurYearly_recurOnWeekNum: 3, // Determines the week num in alternative config. E.g. on the 3rd week day of X month. 3rd would be the number.
    //   recurYearly_recurOnWeekDay: "Mon", // Determines the week day in alternative config. E.g. on the N wednesday of X month.
    //   chipColor: "red",
    //   isPaused: false,
    //   selectedEntities: [],
    // },
    // {
    //   id: 3,
    //   name: "My Awesome Event 3",
    //   startingDate: dayjs.utc().startOf("month"),
    //   startingTime: "0134", // Time in 24h format. Determines when the event starts at the day of startingDate
    //   duration: 7, // Determines how long the event lasts, in hours.
    //   isRecurring: true,
    //   recurEveryType: "days",
    //   recurEveryN: 2,
    //   recurWeekly_recurOnWeekDay: ["Mon", "Sat"], // Determines the day when the event should occur.
    //   recurMonthly_ConfigNum: 1,
    //   recurMonthly_recurOnDayNum: 1, // Determines the day when the event should occur. E.g. if every 2 months, occur on day 15
    //   recurMonthly_recurOnWeekNum: 1, // Determines the week num. E.g. on the 3rd week day. 3rd would be the number.
    //   recurMonthly_recurOnWeekDay: "Mon", // Determines the first day of month, e.g. first sunday / first sunday.
    //   recurYearly_ConfigNum: 1,
    //   recurYearly_recurOnMonth: "April", // Determines the month when the event should occur. E.g. if every 2 years, occur on first april of the 3rd year
    //   recurYearly_recurOnDayNum: 22, // Determines the day when the event should occur. Require _recurOnMonth. E.g. if every 2 years, occur on day 15 of april on the 3rd year
    //   recurYearly_recurOnWeekNum: 3, // Determines the week num in alternative config. E.g. on the 3rd week day of X month. 3rd would be the number.
    //   recurYearly_recurOnWeekDay: "Mon", // Determines the week day in alternative config. E.g. on the N wednesday of X month.
    //   chipColor: "yellow",
    //   isPaused: false,
    //   selectedEntities: [],
    // },
    // {
    //   id: 4,
    //   name: "My Awesome Event 4",
    //   startingDate: dayjs.utc().add(6, "day"),
    //   startingTime: "1800", // Time in 24h format. Determines when the event starts at the day of startingDate
    //   duration: 2, // Determines how long the event lasts, in hours.
    //   isRecurring: true,
    //   recurEveryType: "days",
    //   recurEveryN: 3,
    //   recurWeekly_recurOnWeekDay: ["Mon", "Sat"], // Determines the day when the event should occur.
    //   recurMonthly_ConfigNum: 1,
    //   recurMonthly_recurOnDayNum: 1, // Determines the day when the event should occur. E.g. if every 2 months, occur on day 15
    //   recurMonthly_recurOnWeekNum: 1, // Determines the week num. E.g. on the 3rd week day. 3rd would be the number.
    //   recurMonthly_recurOnWeekDay: "Mon", // Determines the first day of month, e.g. first sunday / first sunday.
    //   recurYearly_ConfigNum: 1,
    //   recurYearly_recurOnMonth: "April", // Determines the month when the event should occur. E.g. if every 2 years, occur on first april of the 3rd year
    //   recurYearly_recurOnDayNum: 22, // Determines the day when the event should occur. Require _recurOnMonth. E.g. if every 2 years, occur on day 15 of april on the 3rd year
    //   recurYearly_recurOnWeekNum: 3, // Determines the week num in alternative config. E.g. on the 3rd week day of X month. 3rd would be the number.
    //   recurYearly_recurOnWeekDay: "Mon", // Determines the week day in alternative config. E.g. on the N wednesday of X month.
    //   chipColor: "#00bdec",
    //   isPaused: true,
    // },
    // {
    //   id: 5,
    //   name: "My Awesome Event 5",
    //   startingDate: dayjs.utc().subtract(2, "day"),
    //   startingTime: "1800", // Time in 24h format. Determines when the event starts at the day of startingDate
    //   duration: 5, // Determines how long the event lasts, in hours.
    //   isRecurring: true,
    //   recurEveryType: "days",
    //   recurEveryN: 3,
    //   recurWeekly_recurOnWeekDay: ["Mon", "Sat"], // Determines the day when the event should occur.
    //   recurMonthly_ConfigNum: 1,
    //   recurMonthly_recurOnDayNum: 1, // Determines the day when the event should occur. E.g. if every 2 months, occur on day 15
    //   recurMonthly_recurOnWeekNum: 1, // Determines the week num. E.g. on the 3rd week day. 3rd would be the number.
    //   recurMonthly_recurOnWeekDay: "Mon", // Determines the first day of month, e.g. first sunday / first sunday.
    //   recurYearly_ConfigNum: 1,
    //   recurYearly_recurOnMonth: "April", // Determines the month when the event should occur. E.g. if every 2 years, occur on first april of the 3rd year
    //   recurYearly_recurOnDayNum: 22, // Determines the day when the event should occur. Require _recurOnMonth. E.g. if every 2 years, occur on day 15 of april on the 3rd year
    //   recurYearly_recurOnWeekNum: 3, // Determines the week num in alternative config. E.g. on the 3rd week day of X month. 3rd would be the number.
    //   recurYearly_recurOnWeekDay: "Mon", // Determines the week day in alternative config. E.g. on the N wednesday of X month.
    //   chipColor: "pink",
    //   isPaused: false,
    // },
    // {
    //   id: 6,
    //   name: "My Awesome Event 6",
    //   startingDate: dayjs.utc().add(2, "day"),
    //   startingTime: "0900", // Time in 24h format. Determines when the event starts at the day of startingDate
    //   duration: 10, // Determines how long the event lasts, in hours.
    //   isRecurring: true,
    //   recurEveryType: "days",
    //   recurEveryN: 3,
    //   recurWeekly_recurOnWeekDay: ["Mon", "Sat"], // Determines the day when the event should occur.
    //   recurMonthly_ConfigNum: 1,
    //   recurMonthly_recurOnDayNum: 1, // Determines the day when the event should occur. E.g. if every 2 months, occur on day 15
    //   recurMonthly_recurOnWeekNum: 1, // Determines the week num. E.g. on the 3rd week day. 3rd would be the number.
    //   recurMonthly_recurOnWeekDay: "Mon", // Determines the first day of month, e.g. first sunday / first sunday.
    //   recurYearly_ConfigNum: 1,
    //   recurYearly_recurOnMonth: "April", // Determines the month when the event should occur. E.g. if every 2 years, occur on first april of the 3rd year
    //   recurYearly_recurOnDayNum: 22, // Determines the day when the event should occur. Require _recurOnMonth. E.g. if every 2 years, occur on day 15 of april on the 3rd year
    //   recurYearly_recurOnWeekNum: 3, // Determines the week num in alternative config. E.g. on the 3rd week day of X month. 3rd would be the number.
    //   recurYearly_recurOnWeekDay: "Mon", // Determines the week day in alternative config. E.g. on the N wednesday of X month.
    //   chipColor: "black",
    //   isPaused: false,
    // },
  ]);
  const yearRange = 1;

  const {
    getAllSegmentsForAnalyticsFilter,
    getPlanningNodes,
    getNodeTree,
    getGameEvents,
    updateGameEvent,
    removeGameEvent,
    createGameEvent,
    removeEntityFromGameEvent,

    //
    getOffers,
    getPricing,
    getRegionalPrices,
    getCurrencyEntities,
    getOffersNames,
    getEntitiesIDs,
    getEntitiesNames,

    //
    getGameEventsNotes,
    updateGameEventsNotes,
  } = useApi();

  //   offersList
  // pricing
  // exchangeRates
  // exchangeRates_USD

  const { triggerAlert } = useAlert();

  const [segmentsList, setSegmentsList] = useState([]);

  const [offers, setOffers] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});
  const [exchangeRates_USD, setExchangeRates_USD] = useState(undefined);
  const [entities, setEntities] = useState([]);
  const [gameModelFunctions, setGameModelFunctions] = useState([]);

  const [nodeTree, setNodeTree] = useState([]);
  const [nodeData, setNodeData] = useState([]);
  const [allEntitiesNames, setAllEntitiesNames] = useState([]);
  const [notes, setNotes] = useState([
    // {
    //   id: nanoid(),
    //   date: dayjs.utc().format(),
    //   note: "Lorem ipsum dolor sit amet consectetur, adipisicing elit. Distinctio facere deleniti accusantium mollitia labore ut architecto ipsa vitae dicta atque amet rerum eaque harum cumque veniam commodi accusamus, fuga omnis cupiditate deserunt nemo voluptates non? Sit aut, alias pariatur magni vel earum ullam ex cupiditate rem ratione. Autem, eum amet nihil at quas vero dolores in asperiores minima id, esse eius aspernatur porro ipsa. Inventore temporibus fuga necessitatibus, provident reiciendis, eaque minus dolorem totam voluptatem mollitia in quos dicta sed hic alias harum distinctio omnis tempora veniam nulla cupiditate error rem ullam ducimus. Perferendis autem non tempora totam! Eius illo fuga nostrum expedita minima nam dolores! Adipisci recusandae cum fugit iusto? Suscipit cum, necessitatibus voluptatibus ipsam dignissimos odio vero voluptas!",
    // },
  ]);
  const [showNoteEditor, setShowNoteEditor] = useState(undefined);

  const [eventsOccasions, setEventsOccasions] = useState([]);
  const [eventsOccasionsWithoutDurations, setEventsOccasionsWithoutDurations] =
    useState([]);

  const lastNotesState = useRef(JSON.stringify(notes));
  useEffect(() => {
    if (lastNotesState.current === JSON.stringify(notes)) return;
    lastNotesState.current = JSON.stringify(notes);
    saveNotes();
  }, [notes]);

  const getEventOccasions = useMemo(
    () => (event) => {
      if (!currentDaysArray || currentDaysArray.length === 0) return;
      let dates = [];
      console.log("Firing occasions");
      const endDate = dayjs.utc(
        currentDaysArray[currentDaysArray.length - 1].day
      ); // Only account events until this date
      let currentDate = dayjs.utc(event.startingDate);

      switch (event.isRecurring) {
        case true:
          switch (event.recurEveryType) {
            case "days":
              while (currentDate <= endDate) {
                dates.push(currentDate);
                currentDate = currentDate.add(event.recurEveryN, "day");
              }
              break;
            case "weeks":
              //
              while (currentDate <= endDate) {
                // Check if the current day is one of the specified days
                if (
                  event.recurWeekly_recurOnWeekDay.includes(
                    convertNumberToDay(currentDate.day())
                  )
                ) {
                  dates.push(currentDate.clone());
                }

                // Move to the next day
                currentDate = currentDate.add(1, "day");

                // If we've completed a week cycle, jump to the next occurrence based on recurEveryN
                if (currentDate.day() === dayjs.utc(event.startingDate).day()) {
                  currentDate = currentDate.add(event.recurEveryN - 1, "week");
                }
              }
              break;
            case "months":
              while (currentDate <= endDate) {
                if (event.recurMonthly_ConfigNum === 0) {
                  // Config 0: Recur every N months on a certain day (e.g., 15th)
                  if (currentDate.date() === event.recurMonthly_recurOnDayNum) {
                    dates.push(currentDate.clone());
                    // Move to the next month occurrence
                    currentDate = currentDate.add(event.recurEveryN, "month");
                  } else {
                    // Move to the next day
                    currentDate = currentDate.add(1, "day");
                  }
                } else {
                  // Config 1: Recur every N months on the first X week day (e.g., first Monday)
                  const weekNum = event.recurMonthly_recurOnWeekNum;
                  const weekDay = convertWeekDayToNumber(
                    event.recurMonthly_recurOnWeekDay
                  );

                  // Find the first occurrence of the specified weekday in the month
                  let firstOccurrence = currentDate
                    .startOf("month")
                    .day(weekDay);
                  if (firstOccurrence.month() !== currentDate.month()) {
                    firstOccurrence = firstOccurrence.add(1, "week");
                  }

                  // Calculate the target date based on the week number
                  let targetDate = firstOccurrence.add(weekNum - 1, "week");

                  // Check if the target date is within the current month
                  if (targetDate.month() === currentDate.month()) {
                    if (currentDate.isSame(targetDate, "day")) {
                      dates.push(currentDate.clone());
                      // Move to the next month occurrence
                      currentDate = currentDate
                        .add(event.recurEveryN, "month")
                        .startOf("month");
                    } else if (currentDate.isAfter(targetDate)) {
                      // If we've passed the target date, move to the next month
                      currentDate = currentDate
                        .add(event.recurEveryN, "month")
                        .startOf("month");
                    } else {
                      // Move to the next day
                      currentDate = currentDate.add(1, "day");
                    }
                  } else {
                    // If the target date is not in this month, move to the next month
                    currentDate = currentDate.add(1, "month").startOf("month");
                  }
                }
              }
              break;
            case "years":
              while (currentDate <= endDate) {
                if (event.recurYearly_ConfigNum === 0) {
                  // Case 1: Recur every N years on X day of Y month
                  if (
                    currentDate.month() ===
                      convertMonthToNumber(event.recurYearly_recurOnMonth) &&
                    currentDate.date() === event.recurYearly_recurOnDayNum
                  ) {
                    dates.push(currentDate.clone());
                    // Move to the next year occurrence
                    currentDate = currentDate.add(event.recurEveryN, "year");
                  } else {
                    // Move to the next day
                    currentDate = currentDate.add(1, "day");
                  }
                } else {
                  // Case 2: Recur every N years on X week day of Y month
                  const weekNum = event.recurYearly_recurOnWeekNum;
                  const weekDay = convertWeekDayToNumber(
                    event.recurYearly_recurOnWeekDay
                  );
                  const month = convertMonthToNumber(
                    event.recurYearly_recurOnMonth
                  );

                  // Find the first occurrence of the specified weekday in the target month
                  let firstOccurrence = currentDate
                    .month(month)
                    .startOf("month")
                    .day(weekDay);
                  if (firstOccurrence.month() !== month) {
                    firstOccurrence = firstOccurrence.add(1, "week");
                  }

                  // Calculate the target date based on the week number
                  let targetDate = firstOccurrence.add(weekNum - 1, "week");

                  // Check if the target date is within the target month
                  if (targetDate.month() === month) {
                    if (currentDate.isSame(targetDate, "day")) {
                      dates.push(currentDate.clone());
                      // Move to the next year occurrence
                      currentDate = currentDate
                        .add(event.recurEveryN, "year")
                        .month(month)
                        .startOf("month");
                    } else if (currentDate.isAfter(targetDate)) {
                      // If we've passed the target date, move to the next year
                      currentDate = currentDate
                        .add(event.recurEveryN, "year")
                        .month(month)
                        .startOf("month");
                    } else {
                      // Move to the next day
                      currentDate = currentDate.add(1, "day");
                    }
                  } else {
                    // If the target date is not in this month, move to the next month
                    currentDate = currentDate.add(1, "month").startOf("month");
                  }
                }
              }
              break;
          }
          break;
        case false:
          dates.push(event.startingDate);
          break;
      }
      let datesWithoutDuration = JSON.parse(JSON.stringify(dates));
      setEventsOccasionsWithoutDurations((prevEvents) => {
        let newEvents = [...prevEvents];
        const index = newEvents.findIndex((e) => e.id === event.id);
        if (index !== -1) {
          newEvents[index] = {
            id: event.id,
            dates: JSON.parse(JSON.stringify(datesWithoutDuration)),
          };
        } else {
          newEvents.push({
            id: event.id,
            dates: JSON.parse(JSON.stringify(datesWithoutDuration)),
          });
        }
        return newEvents;
      });

      let uniqueDates = new Set();
      const hours = parseInt(event.startingTime.slice(0, 2), 10);
      const minutes = parseInt(event.startingTime.slice(2, 4), 10);
      dates.forEach((startDate) => {
        let currentStartDate = dayjs
          .utc(startDate)
          .hour(hours)
          .minute(minutes)
          .second(0)
          .millisecond(0);
        const endDate = currentStartDate.add(event.duration, "minutes");

        while (currentStartDate <= endDate) {
          uniqueDates.add(currentStartDate.format());
          currentStartDate = currentStartDate.add(30, "minutes");
        }
      });

      dates = Array.from(uniqueDates)
        .map((dateStr) => dayjs.utc(dateStr))
        .sort((a, b) => (a.isBefore(b) ? -1 : 1));

      setEventsOccasions((prevEvents) => {
        let newEvents = [...prevEvents];
        const index = newEvents.findIndex((e) => e.id === event.id);
        if (index !== -1) {
          newEvents[index] = {
            id: event.id,
            dates: dates,
          };
        } else {
          newEvents.push({
            id: event.id,
            dates: dates,
          });
        }
        console.log(newEvents);
        return newEvents;
      });
    },
    [event]
  );
  function convertMonthToNumber(month) {
    // const result = useMemo(() => {
    switch (month) {
      case "January":
        return 0;
      case "February":
        return 1;
      case "March":
        return 2;
      case "April":
        return 3;
      case "May":
        return 4;
      case "June":
        return 5;
      case "July":
        return 6;
      case "August":
        return 7;
      case "September":
        return 8;
      case "October":
        return 9;
      case "November":
        return 10;
      case "December":
        return 11;
    }
    // }, [number]);
    // return result;
  }
  function convertNumberToDay(number) {
    // const result = useMemo(() => {
    switch (number) {
      case 0:
        return "Sun";
      case 1:
        return "Mon";
      case 2:
        return "Tue";
      case 3:
        return "Wed";
      case 4:
        return "Thu";
      case 5:
        return "Fri";
      case 6:
        return "Sat";
    }
    // }, [number]);
    // return result;
  }
  function convertWeekDayToNumber(number) {
    // const result = useMemo(() => {
    switch (number) {
      case "Sun":
        return 0;
      case "Mon":
        return 1;
      case "Tue":
        return 2;
      case "Wed":
        return 3;
      case "Thu":
        return 4;
      case "Fri":
        return 5;
      case "Sat":
        return 6;
    }
    // }, [number]);
    // return result;
  }

  function convertDayNumber(dayNumber) {
    // const result = useMemo(() => {
    if (calendarViewMode === "eu") {
      // Shift day numbers to match eu format where monday is the first day of the week
      switch (dayNumber) {
        case 0:
          return 6;
        case 1:
          return 0;
        case 2:
          return 1;
        case 3:
          return 2;
        case 4:
          return 3;
        case 5:
          return 4;
        case 6:
          return 5;
      }
    } else {
      return dayNumber;
    }
    // }, [dayNumber]);
    // return result;
  }
  const isDayInCurrentMonth = (day) => {
    return dayjs.utc(day).month() === currentCalendarMonth;
  };
  function getCalendarDays(month, year) {
    // const result = useMemo(() => {
    const currentMonth = month; // Month (0-11)
    const currentYear = year; // Year

    // Get days in current month
    const daysInMonth = dayjs
      .utc(`${currentYear}-${currentMonth + 1}-01`, "YYYY-MM")
      .daysInMonth();

    // Get first day of current month
    const firstDayOfMonth = dayjs.utc(`${currentYear}-${currentMonth + 1}-01`);

    const daysArray = [];

    // Get a few days from the previous month
    let startDay = firstDayOfMonth.day();
    startDay = convertDayNumber(startDay);
    if (startDay !== 0) {
      const prevMonthLastDay = firstDayOfMonth
        .subtract(1, "month")
        .endOf("month");
      const daysToAdd = startDay;
      for (let i = daysToAdd - 1; i >= 0; i--) {
        daysArray.unshift(
          prevMonthLastDay
            .subtract(daysToAdd - 1 - i, "day")
            .format("YYYY-MM-DD")
        );
      }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(
        dayjs
          .utc(`${currentYear}-${currentMonth + 1}-${day}`)
          .format("YYYY-MM-DD")
      );
    }

    const targetRows = 6;
    const targetCols = 7;

    // Add more days until we hit the desired count
    if (daysArray.length !== targetRows * targetCols) {
      const daysToAdd = targetRows * targetCols - daysArray.length;
      const lastDay = dayjs.utc(daysArray[daysArray.length - 1]);
      for (let i = 0; i < daysToAdd; i++) {
        daysArray.push(lastDay.add(i + 1, "day").format("YYYY-MM-DD"));
      }
    }

    console.log("All days:", daysArray, month, year);

    return daysArray.map((day) => {
      return { day: day, isCurrentMonth: isDayInCurrentMonth(day) };
    });
    // }, [month, year]);
    // return result;
  }

  const calendarDays = useMemo(() => {
    return getCalendarDays(currentCalendarMonth, currentCalendarYear);
  }, [currentCalendarMonth, currentCalendarYear]);

  const timelineDays = useMemo(() => {
    return getAllTimelineDaysOfMonths(getTimelineMonths());
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "calendar") {
      setCurrentDaysArray(calendarDays);
    } else if (viewMode === "timeline") {
      setCurrentDaysArray(timelineDays);
    }
  }, [
    calendarViewMode,
    viewMode,
    currentCalendarMonth,
    currentCalendarYear,
    calendarDays,
    timelineDays,
  ]);
  useEffect(() => {
    if (localStorage.getItem(`calendar_first_day_of_week`)) {
      setCalendarViewMode(localStorage.getItem(`calendar_first_day_of_week`));
    }
    if (localStorage.getItem(`gameevents_viewmode`)) {
      setViewMode(localStorage.getItem(`gameevents_viewmode`));
    }
    if (localStorage.getItem(`gameevents_show_duration`)) {
      setShowEventsDurations(
        localStorage.getItem(`gameevents_show_duration`) === "true"
      );
    }
    async function fetchEvents() {
      const response = await getGameEvents({
        gameID: game.gameID,
        branch: branch,
      });
      if (response.success) {
        setEvents(response.events);
      }
    }
    fetchEvents();
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

    async function fetchSegmentList() {
      const response = await getAllSegmentsForAnalyticsFilter({
        gameID: game.gameID,
        branch: branch,
      });
      if (response.success) {
        setSegmentsList(response.message);
      }
    }
    fetchSegmentList();

    async function fetchOffers() {
      const response = await getOffers({ gameID: game.gameID, branch: branch });
      if (response.success) {
        setOffers(response.offers);
      }
    }
    fetchOffers();
    async function fetchPricing() {
      const result = await getPricing({ gameID: game.gameID, branch });
      if (result.success) {
        setPricing(result.templates);
      }
    }
    fetchPricing();

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

    async function fetchEntitiesNames() {
      const resp = await getEntitiesNames({
        gameID: game.gameID,
        branch,
      });
      if (resp.success) {
        setAllEntitiesNames(resp.entities);
      }
    }
    fetchEntitiesNames();
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
    async function getNotes() {
      const resp = await getGameEventsNotes({
        gameID: game.gameID,
        branch: branch,
      });
      if (resp.success) {
        lastNotesState.current = JSON.stringify(resp.notes);
        setNotes(resp.notes);
      } else {
        triggerAlert(resp.message, "error");
      }
    }
    getNotes();

    async function fetchFunctions() {
      const resp = await getBalanceModel({
        gameID: game.gameID,
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
  }, []);

  useEffect(() => {
    events.map((e) => {
      getEventOccasions(e);
    });
  }, [events, currentDaysArray]);
  function changeCalendarViewMode(newViewMode) {
    setCalendarViewMode(newViewMode);
    localStorage.setItem(`calendar_first_day_of_week`, newViewMode);
  }
  function changeViewMode(newViewMode) {
    setViewMode(newViewMode);
    localStorage.setItem(`gameevents_viewmode`, newViewMode);
  }

  function getWeekDays() {
    if (calendarViewMode === "eu") {
      return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    } else {
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    }
  }

  function getNumDaysInMonth(year, monthNumber) {
    return dayjs.utc(`${year}-${monthNumber + 1}`).daysInMonth();
  }
  function getYearsArray() {
    const additiveYears = 0;
    const currYear = dayjs.utc().year();
    let arr = [];
    for (
      let i = currYear - yearRange - additiveYears;
      i < currYear + yearRange + additiveYears;
      i++
    ) {
      arr.push(i);
    }
    return arr.reverse();
  }
  function changeMonth(delta) {
    let newYear = currentCalendarYear;
    if (currentCalendarMonth + delta < 0) {
      newYear -= 1;
    } else if (currentCalendarMonth + delta > 11) {
      newYear += 1;
    }
    setCurrentCalendarYear(newYear);
    setCurrentCalendarMonth((prevMonth) => {
      const newMonth = (prevMonth + delta + 12) % 12;
      return newMonth;
    });
  }

  function getTimelineMonths() {
    const months = [];
    const currentMonth = dayjs.utc();
    const formatMonth = (date) => date.format("YYYY-MM");

    for (let i = -3; i <= 3; i++) {
      months.push(formatMonth(currentMonth.add(i, "month")));
    }
    return months;
  }
  function getAllTimelineDaysOfMonths(months) {
    const allDays = [];

    months.forEach((month) => {
      let m = dayjs.utc(month);
      const daysInMonth = m.daysInMonth();
      console.log("Month:", month, daysInMonth);

      for (let day = 1; day <= daysInMonth; day++) {
        allDays.push(
          dayjs
            .utc(
              `${m.year()}-${(m.month() + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
            )
            .format("YYYY-MM-DD")
        );
      }
    });

    return allDays.map((day) => {
      return { day: day, isCurrentMonth: isDayInCurrentMonth(day) };
    });
  }

  const [startDate, setStartDate] = useState(dayjs.utc());
  const [timelineTotalDays, setTimelineTotalDays] = useState(() => {
    let days = 0;
    getTimelineMonths().map((month, i) => {
      if (i === 0) {
        setStartDate(dayjs.utc(month).day(0));
      }
      days += getNumDaysInMonth(
        dayjs.utc(month).year(),
        dayjs.utc(month).month()
      );
    });
    return days;
  });

  async function onEventChange(event) {
    console.log("onEventChange", event);
    setEvents((prevEvents) => {
      const index = prevEvents.findIndex((e) => e.id === event.id);
      if (index === -1) {
        prevEvents.push(event);
        onEventCreated(event);
      } else {
        prevEvents[index] = event;
        onEventChanged(event);
      }
      return [...prevEvents];
    });
  }
  async function onEventCreated(event) {
    const resp = await createGameEvent({
      gameID: game.gameID,
      branch: branch,
      eventObj: event,
    });
    if (resp.success) {
      triggerAlert("New event successfully created", "success");
    } else {
      triggerAlert(resp.message, "error");
    }
  }
  async function onEventRemoved(event) {
    const resp = await removeGameEvent({
      gameID: game.gameID,
      branch: branch,
      gameEventID: event.id,
    });
    if (resp.success) {
      triggerAlert("Game event successfully removed", "success");
    } else {
      triggerAlert(resp.message, "error");
    }
  }
  async function onEventChanged(event) {
    const resp = await updateGameEvent({
      gameID: game.gameID,
      branch: branch,
      eventObj: event,
    });
    if (resp.success) {
    } else {
      triggerAlert(resp.message, "error");
    }
  }
  async function onEventRemove(event) {
    // Crucial to clear occasions before removing event. After that, changed events array will trigger occasions recalculation so they match the events.length,
    // in order for gantt chart to be rendered because there are checks that compare occasions array length to events array length.
    // We can also just remove the deleted event's occasions from these arrays using .filter, but I dont want to.
    setEventsOccasions([]);
    setEventsOccasionsWithoutDurations([]);
    setEvents((prevEvents) => prevEvents.filter((e) => e.id !== event.id));
    onEventRemoved(event);
  }

  const [showEventsDurations, setShowEventsDurations] = useState(false);
  const [calendarFilteredEvent, setCalendarFilteredEvent] = useState([]);
  function toggleFilteredEvents(event) {
    setCalendarFilteredEvent(event);
  }
  function toggleShowEventsDurations(newVal) {
    setShowEventsDurations(newVal);
    localStorage.setItem(`gameevents_show_duration`, newVal);
  }
  function isAtTheEdgeMonthOfAvailableYear(isBackwards) {
    // Disable scrolling buttons if user hits scroll limit
    const arr = getYearsArray();
    if (isBackwards) {
      const firstAvailableMonth = dayjs.utc(`${arr[arr.length - 1]}-01-01`);
      return dayjs
        .utc(`${currentCalendarYear}-${currentCalendarMonth + 1}-01`)
        .isSame(firstAvailableMonth, "month");
    } else {
      const lastAvailableMonth = dayjs.utc(`${arr[0]}-12-01`);
      return dayjs
        .utc(`${currentCalendarYear}-${currentCalendarMonth + 1}-01`)
        .isSame(lastAvailableMonth, "month");
    }
  }
  function onOpenNoteEditor(day) {
    setShowNoteEditor(day);
  }
  function onNotesSaved(n) {
    setNotes(n);
  }

  async function saveNotes() {
    const resp = await updateGameEventsNotes({
      gameID: game.gameID,
      branch: branch,
      newNotes: notes,
    });
  }

  return (
    <div className={s.gameEvents}>
      <Helmet>
        <title>{titles.lo_gameEvent}</title>
      </Helmet>

      <div className={s.upperBar}>
        {/* Month selector */}
        {viewMode === "calendar" && (
          <FormControl size="small" sx={{ ml: 2, width: 150, minHeight: 35 }}>
            <InputLabel id="months" sx={{ fontSize: 12 }}>
              Month
            </InputLabel>
            <Select
              size="small"
              sx={{ borderRadius: "2rem", height: 35, fontSize: 12 }}
              labelId="months"
              id="months"
              value={currentCalendarMonth}
              onChange={(e) => setCurrentCalendarMonth(e.target.value)}
              input={
                <OutlinedInput
                  spellCheck={false}
                  id="select-multiple-chip"
                  label="Month"
                />
              }
            >
              <MenuItem value={0}>January</MenuItem>
              <MenuItem value={1}>February</MenuItem>
              <MenuItem value={2}>March</MenuItem>
              <MenuItem value={3}>April</MenuItem>
              <MenuItem value={4}>May</MenuItem>
              <MenuItem value={5}>June</MenuItem>
              <MenuItem value={6}>July</MenuItem>
              <MenuItem value={7}>August</MenuItem>
              <MenuItem value={8}>September</MenuItem>
              <MenuItem value={9}>October</MenuItem>
              <MenuItem value={10}>November</MenuItem>
              <MenuItem value={11}>December</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Year selector */}
        {viewMode === "calendar" && (
          <FormControl size="small" sx={{ ml: 2, width: 90, minHeight: 35 }}>
            <InputLabel id="years" sx={{ fontSize: 12 }}>
              Year
            </InputLabel>
            <Select
              size="small"
              sx={{ borderRadius: "2rem", height: 35, fontSize: 12 }}
              labelId="years"
              id="years"
              value={currentCalendarYear}
              onChange={(e) => setCurrentCalendarYear(e.target.value)}
              input={
                <OutlinedInput
                  spellCheck={false}
                  id="select-multiple-chip"
                  label="Year"
                />
              }
            >
              {getYearsArray().map((year, index) => (
                <MenuItem value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Previous and next month buttons */}
        {viewMode === "calendar" && (
          <Button
            sx={{ ml: 2 }}
            onClick={() => {
              changeMonth(-1);
            }}
            disabled={isAtTheEdgeMonthOfAvailableYear(true)}
          >
            <ArrowBackIosNewSharpIcon
              htmlColor={
                isAtTheEdgeMonthOfAvailableYear(true)
                  ? theme.palette.text.disabled
                  : theme.palette.text.primary
              }
            />
          </Button>
        )}
        {viewMode === "calendar" && (
          <Button
            sx={{ ml: 1 }}
            onClick={() => {
              changeMonth(1);
            }}
            disabled={isAtTheEdgeMonthOfAvailableYear()}
          >
            <ArrowBackIosNewSharpIcon
              htmlColor={
                isAtTheEdgeMonthOfAvailableYear()
                  ? theme.palette.text.disabled
                  : theme.palette.text.primary
              }
              sx={{ rotate: "180deg" }}
            />
          </Button>
        )}

        <FormControl
          size="small"
          sx={{ ml: 2, mr: 2, width: 180, minHeight: 35 }}
        >
          <InputLabel sx={{ fontSize: 12 }}>Event filter</InputLabel>
          <Select
            size="small"
            sx={{ borderRadius: "2rem", height: 35, fontSize: 12 }}
            value={calendarFilteredEvent}
            onChange={(e) => {
              toggleFilteredEvents(e.target.value);
            }}
            multiple
            input={
              <OutlinedInput
                spellCheck={false}
                id="select-multiple-chip"
                label="Event filter"
              />
            }
          >
            {events.map((e) => (
              <MenuItem value={e.id}>{e.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {viewMode === "calendar" && (
          <FormControl
            size="small"
            sx={{ ml: 2, mr: 2, width: 150, minHeight: 35 }}
          >
            <InputLabel sx={{ fontSize: 12 }}>Show duration</InputLabel>
            <Select
              size="small"
              sx={{ borderRadius: "2rem", height: 35, fontSize: 12 }}
              value={showEventsDurations}
              onChange={(e) => toggleShowEventsDurations(e.target.value)}
              input={
                <OutlinedInput
                  spellCheck={false}
                  id="select-multiple-chip"
                  label="Show duration"
                />
              }
            >
              <MenuItem value={true}>Show</MenuItem>
              <MenuItem value={false}>Hide</MenuItem>
            </Select>
          </FormControl>
        )}

        <Button
          sx={{
            mr: 2,
            ml: 2,
            textTransform: "none",
            // color: "#e7e7e7"
          }}
          variant="outlined"
          onClick={() => onOpenNoteEditor(null)}
        >
          View notes
        </Button>

        <Box sx={{ ml: "auto", mr: 2 }}>
          {/* Calendar/timeline switch */}
          <FormControl
            size="small"
            sx={{ ml: "auto", mr: 2, width: 150, minHeight: 35 }}
          >
            <InputLabel sx={{ fontSize: 12 }}>Viewmode</InputLabel>
            <Select
              size="small"
              sx={{ borderRadius: "2rem", height: 35, fontSize: 12 }}
              value={viewMode}
              onChange={(e) => changeViewMode(e.target.value)}
              input={
                <OutlinedInput
                  spellCheck={false}
                  id="select-multiple-chip"
                  label="Viewmode"
                />
              }
            >
              <MenuItem value={"timeline"}>Timeline</MenuItem>
              <MenuItem value={"calendar"}>Calendar</MenuItem>
            </Select>
          </FormControl>

          {/* First day of week option */}
          <FormControl
            size="small"
            sx={{ ml: "auto", width: 150, minHeight: 35 }}
          >
            <InputLabel id="weekDay" sx={{ fontSize: 12 }}>
              First day of week
            </InputLabel>
            <Select
              size="small"
              sx={{ borderRadius: "2rem", height: 35, fontSize: 12 }}
              labelId="weekDay"
              id="weekDay"
              value={calendarViewMode}
              onChange={(e) => changeCalendarViewMode(e.target.value)}
              input={
                <OutlinedInput
                  spellCheck={false}
                  id="select-multiple-chip"
                  label="First day of week"
                />
              }
            >
              <MenuItem value={"eu"}>Monday</MenuItem>
              <MenuItem value={"us"}>Sunday</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </div>

      {viewMode === "timeline" ? (
        <GanttTimelineCalendar
          gameModelFunctions={gameModelFunctions}
          nodeData={nodeData}
          treeData={nodeTree}
          getTimelineMonths={getTimelineMonths}
          getNumDaysInMonth={getNumDaysInMonth}
          startDate={startDate}
          timelineTotalDays={timelineTotalDays}
          events={events}
          eventsOccasions={eventsOccasions}
          onEventChange={onEventChange}
          onEventRemove={onEventRemove}
          segmentsList={segmentsList}
          offers={offers}
          pricing={pricing}
          exchangeRates={exchangeRates}
          exchangeRates_USD={exchangeRates_USD}
          entities={entities}
          allEntitiesNames={allEntitiesNames}
        />
      ) : (
        // <div className={s.timelineContainer}>
        //   {events.map((e, i) => (
        //     <div
        //       className={`${s.timelineEventItem} ${i % 2 === 1 ? s.otherColor : null}`}
        //       style={{ gridColumn: "1 / 8" }}
        //     ></div>
        //   ))}
        // </div>
        <div className={s.calendarContainer}>
          <table className={s.calendarTable}>
            <thead>
              <tr className={s.weekDays}>
                {getWeekDays().map((day, index) => (
                  <th className={s.weekDay} key={index}>
                    <Typography>{day}</Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CalendarTableDayRows
                gameModelFunctions={gameModelFunctions}
                nodeData={nodeData}
                treeData={nodeTree}
                daysArray={currentDaysArray}
                calendarFilteredEvent={calendarFilteredEvent}
                events={
                  calendarFilteredEvent.length > 0
                    ? events.filter((e) => calendarFilteredEvent.includes(e.id))
                    : events
                }
                eventsOccasions={eventsOccasions}
                eventsOccasionsWithoutDurations={
                  eventsOccasionsWithoutDurations
                }
                onEventChange={onEventChange}
                onEventRemove={onEventRemove}
                showEventsDurations={showEventsDurations}
                segmentsList={segmentsList}
                offers={offers}
                pricing={pricing}
                exchangeRates={exchangeRates}
                exchangeRates_USD={exchangeRates_USD}
                entities={entities}
                notes={notes}
                onOpenNoteEditor={onOpenNoteEditor}
                allEntitiesNames={allEntitiesNames}
              />
            </tbody>
          </table>
        </div>
      )}

      <NotesEditor
        notes={notes}
        open={showNoteEditor !== undefined} // Open if null or valid day. Null = all days
        onClose={() => setShowNoteEditor(undefined)}
        day={showNoteEditor}
        onNotesSaved={onNotesSaved}
      />
    </div>
  );
};

export default GameEvents;
