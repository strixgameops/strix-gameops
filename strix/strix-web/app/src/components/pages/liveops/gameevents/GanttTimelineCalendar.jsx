import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import dayjs from "dayjs";
import s from "./css/gameevents.module.css";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import chroma from "chroma-js";
import EventEditor from "./EventsEditor.jsx";
import { trimStr, getEmptyEventTemplate, clamp } from "./sharedFunctions.jsx";

export default function GanttTimelineCalendar({
  getTimelineMonths,
  getNumDaysInMonth,
  startDate,
  timelineTotalDays,
  events,
  eventsOccasions,
  onEventChange,
  onEventRemove,
  nodeData,
  treeData,
  segmentsList,
  //
  entities,
  gameModelFunctions,
  offers,
  pricing,
  exchangeRates,
  exchangeRates_USD,
  allEntitiesNames,
}) {
  const [eventToEdit, setEventToEdit] = useState();
  const [eventsOccasionsOptimized, setEventsOccasionsOptimized] = useState(
    new Map()
  );
  useEffect(() => {
    const dataMap = new Map(
      eventsOccasions.map((item) => [
        item.id,
        new Set(item.dates.map((d) => d.format("YYYY-MM-DD"))),
      ])
    );

    setEventsOccasionsOptimized(dataMap);
  }, [eventsOccasions]);

  const ganttContainerRef = useRef(null);

  const [timelineCurrentDay, setTimelineCurrentDay] = useState(0);
  const setGanttContainerRef = useCallback(
    (node) => {
      if (node !== null) {
        ganttContainerRef.current = node;
        node.style.setProperty("--num-days", timelineTotalDays);

        const dayHeight = 40;
        const widthOffset = 300;
        const currentDay = getCurrentDayNumInTimeline();
        setTimelineCurrentDay(currentDay.obj);
        if (ganttContainerRef.current) {
          const scrollAmount = currentDay.num * dayHeight;
          ganttContainerRef.current.scrollTo({
            left: scrollAmount - widthOffset,
            behavior: "smooth",
          });
        }
      }
    },
    [timelineTotalDays]
  );
  function getCurrentDayNumInTimeline() {
    let resultDay = undefined;
    let daysNum = 0;
    let currDay = dayjs.utc();

    getTimelineMonths().forEach((month) => {
      const monthStart = dayjs.utc(month);
      const monthYear = monthStart.year();
      const monthMonth = monthStart.month();

      if (monthStart.isSame(currDay, "year")) {
        if (monthStart.isSame(currDay, "month")) {
          const numDaysInMonth = getNumDaysInMonth(monthYear, monthMonth);

          for (let day = 1; day <= numDaysInMonth; day++) {
            const dayInMonth = monthStart.date(day);

            if (dayInMonth.isSame(currDay, "day")) {
              resultDay = { obj: dayInMonth, num: daysNum + day };
              return;
            }
          }
        }
      }

      daysNum += getNumDaysInMonth(monthYear, monthMonth);
    });
    return resultDay;
  }

  const hasDate = useCallback(
    (id, date) => {
      const m = eventsOccasionsOptimized.get(id);
      return m ? m.has(date) : false;
    },
    [eventsOccasionsOptimized]
  );

  const openEditor = useCallback((event) => {
    setEventToEdit(event);
  }, []);

  const getDayProgress = useCallback(() => {
    const now = dayjs.utc();
    const startOfDay = dayjs.utc().startOf("day");
    const endOfDay = dayjs.utc().endOf("day");

    const elapsed = now.diff(startOfDay);
    const dayDuration = endOfDay.diff(startOfDay);

    return (elapsed / dayDuration) * 100;
  }, []);

  const renderMonthHeader = useCallback(
    (month, timelineDaysAccumulator) => {
      const daysNum = getNumDaysInMonth(
        dayjs.utc(month).year(),
        dayjs.utc(month).month()
      );
      const offset = 2;

      const gridPos = `${offset + (timelineDaysAccumulator - daysNum)} / ${timelineDaysAccumulator + offset}`;
      return (
        <div
          key={month}
          className={s.timelineHeaderDates}
          style={{ gridColumn: gridPos }}
        >
          <Typography color="text.secondary" fontSize="0.9rem">
            {dayjs.utc(month).format("MMMM")}
          </Typography>
          <div
            className={s.monthDateRange}
            style={{ "--num-days": timelineTotalDays }}
          >
            {[...Array(daysNum)].map((_, index) => {
              const isToday = dayjs
                .utc()
                .isSame(dayjs.utc(month).date(index + 1), "day");
              return (
                <div key={index} className={`${s.timelineHeaderDateCell}`}>
                  <Typography
                    fontSize="0.9rem"
                    fontWeight="bold"
                    color={isToday ? "#bd9100" : "text.primary"}
                  >
                    {index + 1}
                  </Typography>
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [getNumDaysInMonth, timelineTotalDays]
  );

  const eventButtons = useMemo(() => {
    return events.map((event, index) => (
      <div
        key={event.id}
        style={{ gridRow: index + 3 }}
        className={s.timelineTaskName}
      >
        <Button
          sx={{
            width: "100%",
            height: "100%",
            textTransform: "none",
            color: "#e7e7e7",
            display: "flex",
            justifyContent: "start",
          }}
          onClick={() => openEditor(event)}
        >
          <Typography color={event.isPaused ? "text.grey" : "text.primary"}>
            {trimStr(event.name, 19)}
          </Typography>
        </Button>
      </div>
    ));
  }, [events, openEditor]);

  const addNewEventButton = useMemo(
    () => (
      <div
        className={s.timelineNewEvent}
        style={{ gridRow: events.length + 3, position: "sticky" }}
      >
        <Button
          sx={{
            width: "100%",
            height: "100%",
            textTransform: "none",
            display: "flex",
            fontWeight: "bold",
            justifyContent: "start",
          }}
          onClick={() => openEditor(getEmptyEventTemplate(events, dayjs.utc()))}
        >
          + Add New Event
        </Button>
      </div>
    ),
    [events, openEditor]
  );

  const renderEventCell = useCallback(
    (event, currentDate, dayIndex) => {
      const isInRange = hasDate(event.id, currentDate.format("YYYY-MM-DD"));
      let eventStart;
      let eventEnd;
      let type;
      if (isInRange) {
        eventStart = dayjs.utc(event.startingDate).startOf("day");
        eventEnd = eventStart.add(event.duration, "minutes");
        type = eventStart.isSame(eventEnd, "day")
          ? "both"
          : currentDate.isSame(eventStart, "day")
            ? "start"
            : currentDate.isSame(eventEnd, "day")
              ? "end"
              : "";

        if (
          type === "end" &&
          hasDate(event.id, currentDate.add(1, "day").format("YYYY-MM-DD"))
        ) {
          type = "";
        }
      }
      const isToday = currentDate.isSame(dayjs.utc(), "day");
      const progress = isToday ? getDayProgress() : 0;
      return (
        <div
          key={dayIndex}
          style={{ gridColumn: dayIndex + 1 }}
          className={`${s.timelineCell} ${s.timelineCellWithEvent}`}
        >
          {timelineCurrentDay.isSame(currentDate, "day") && (
            <div className={s.timelineCellCurrentDay}></div>
          )}

          {isInRange && (
            <Box
              onClick={() => openEditor(event)}
              sx={(theme) => ({
                border: `1px solid ${chroma(event.chipColor).alpha(
                  isToday ? 0.95 : 0.55
                )}`,
                backgroundColor: `${chroma(event.chipColor).alpha(
                  isToday ? 0.35 : 0.15
                )}`,

                ...theme.applyStyles("light", {
                  border: `2px solid ${chroma(event.chipColor).alpha(
                    isToday ? 0.95 : 1
                  )}`,
                  backgroundColor: `${chroma(event.chipColor).alpha(
                    isToday ? 0.8 : 0.5
                  )}`,
                }),
              })}
              className={`${s.timelineEventItem} ${
                type === "start"
                  ? s.borderedLeft
                  : type === "end"
                    ? s.borderedRight
                    : type === "both"
                      ? s.borderedBoth
                      : s.isInBetweenCell
              }`}
            />
          )}

          {isToday && (
            <div
              style={{ left: `${progress}%` }}
              className={`${s.timelineTodayMark}`}
            />
          )}
        </div>
      );
    },
    [timelineCurrentDay, eventsOccasionsOptimized, getDayProgress, openEditor]
  );

  const memoizedEventCells = useMemo(() => {
    if (
      !eventsOccasionsOptimized ||
      eventsOccasionsOptimized.size !== events.length
    )
      return null;

    const cellsMap = {};
    events.forEach((event) => {
      cellsMap[event.id] = {};
      for (let dayIndex = 0; dayIndex < timelineTotalDays; dayIndex++) {
        const currentDate = dayjs.utc(startDate).add(dayIndex, "day");
        cellsMap[event.id][dayIndex] = renderEventCell(
          event,
          currentDate,
          dayIndex
        );
      }
    });
    return cellsMap;
  }, [
    events,
    eventsOccasionsOptimized,
    startDate,
    timelineTotalDays,
    renderEventCell,
  ]);

  const monthHeaders = useMemo(() => {
    let timelineDaysAccumulator = 0;
    return getTimelineMonths().map((month) => {
      const daysNum = getNumDaysInMonth(
        dayjs.utc(month).year(),
        dayjs.utc(month).month()
      );
      timelineDaysAccumulator += daysNum;
      return renderMonthHeader(month, timelineDaysAccumulator);
    });
  }, [getTimelineMonths, getNumDaysInMonth, renderMonthHeader]);

  const eventRows = useMemo(() => {
    if (
      !eventsOccasionsOptimized ||
      eventsOccasionsOptimized.size !== events.length ||
      !timelineCurrentDay
    )
      return null;

    return events.map((event, index) => (
      <div
        key={event.id}
        className={s.timelineRow}
        style={{ gridRow: index + 3, "--num-days": timelineTotalDays }}
      >
        {[...Array(timelineTotalDays)].map(
          (_, dayIndex) => memoizedEventCells[event.id][dayIndex]
        )}
      </div>
    ));
  }, [events, eventsOccasionsOptimized, memoizedEventCells, timelineTotalDays]);

  return (
    <div className={s.timelineContainer}>
      <div className={s.timelineBody} ref={setGanttContainerRef}>
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

        <div className={s.cornerPlaceholder}></div>

        {monthHeaders}

        {eventButtons}
        {addNewEventButton}

        {/* Actual grid cells and rows generation if all data is ok */}
        {eventsOccasionsOptimized &&
          eventsOccasionsOptimized.size === events.length &&
          eventRows}
      </div>
      {/* Background for the whole grid. Replicates original grid width and height */}
      <div
        className={s.timelineBackgroundGrid}
        style={{
          gridTemplateColumns: `200px repeat(${timelineTotalDays}, 40px)`,
        }}
      >
        <div
          className={s.timelineBackground}
          style={{
            gridRow: `1/${events.length + 4}`,
            gridColumn: `1/${timelineTotalDays}`,
          }}
        ></div>
      </div>
    </div>
  );
}