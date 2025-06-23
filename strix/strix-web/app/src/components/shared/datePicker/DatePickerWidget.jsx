import React, { useState, useRef, useEffect, useMemo } from "react";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import s from "./datePickerWidget.module.css";

import { Box } from "@mui/material";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";
dayjs.extend(utc);
import chroma from "chroma-js";
import ArrowBackIosNewSharpIcon from "@mui/icons-material/ArrowBackIosNewSharp";
import { useTheme } from "@mui/material/styles";

function DatePickerWidget({
  onStateChange,
  customSx = {},
  filterStateOverride,
  isSingleDate = false,
  onInitialize,
  skipInitialize = true,
  disabled = false,
}) {
  const theme = useTheme();

  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(
    dayjs.utc().month()
  );
  const [currentCalendarYear, setCurrentCalendarYear] = useState(
    dayjs.utc().year()
  );
  const [openPicker, setOpenPicker] = useState(null);
  const [calendarViewMode, setCalendarViewMode] = useState("eu"); // eu = monday is the first day of the week. us = sunday is the first.
  const defaultState = isSingleDate
    ? [dayjs.utc().toISOString()]
    : [
        dayjs.utc().subtract(7, "days").toISOString(),
        dayjs.utc().toISOString(),
      ];
  const [filterDateState, setDateFilterState] = useState(
    filterStateOverride ? filterStateOverride : defaultState
  );
  const [currentSelection, setCurrentSelection] = useState(
    filterStateOverride ? filterStateOverride : defaultState
  );

  useEffect(() => {
    if (filterStateOverride) {
      setDateFilterState(filterStateOverride);
      setCurrentSelection(filterStateOverride);
    }
  }, [filterStateOverride]);

  useEffect(() => {
    if (!skipInitialize) {
      onInitialize(filterDateState);
    }
  }, [filterDateState]);

  function applyFilter() {
    // apply new state
    setDateFilterState(currentSelection);
    onStateChange(currentSelection);
    setOpenPicker(null);
  }
  function cancelFilter() {
    // reset to the last applied state
    setCurrentSelection(filterDateState);
    onStateChange(filterDateState);
    setOpenPicker(null);
  }
  function resetFilter() {
    // reset to default
    setDateFilterState(defaultState);
    setCurrentSelection(defaultState);
    onStateChange(defaultState);
  }

  function subtractMonth(delta) {
    let newYear = currentCalendarYear;
    if (currentCalendarMonth + delta < 0) {
      newYear -= 1;
    } else if (currentCalendarMonth + delta > 11) {
      newYear += 1;
    }
    const newMonth = (currentCalendarMonth + delta + 12) % 12;
    return { m: newMonth, y: newYear };
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
    startDay = convertDayNumber(calendarViewMode, startDay);
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

    // console.log("All days:", daysArray, month, year);

    return daysArray.map((day) => {
      return { day: day, isCurrentMonth: isDayInCurrentMonth(day) };
    });
  }

  function pickPlaceholder() {
    if (isSingleDate) {
      return `${dayjs.utc(filterDateState[0]).format("DD.MM.YYYY")}`;
    } else {
      return `${dayjs.utc(filterDateState[0]).format("DD.MM.YYYY")} - ${dayjs.utc(filterDateState[1]).format("DD.MM.YYYY")}`;
    }
  }

  function makeSelection(date) {
    if (currentSelection.length === 0 || isSingleDate) {
      setCurrentSelection([date]);
    } else if (currentSelection.length === 1) {
      const newSelection = [...currentSelection, date].sort((a, b) =>
        dayjs.utc(a).isAfter(dayjs.utc(b)) ? 1 : -1
      );
      setCurrentSelection(newSelection);
    } else if (currentSelection.length === 2) {
      setCurrentSelection([date]);
    }
  }

  function renderDays(month, year, currentSelection) {
    let daysArray = getCalendarDays(month, year);
    const daysInRow = 7;
    let rows = [];
    for (let i = 0; i < daysArray.length; i += daysInRow) {
      const weekDays = daysArray.slice(i, i + daysInRow);

      // Make row for each 7 days
      const row = (
        <tr key={i} className={s.weekRow}>
          {weekDays.map((dayObj) => {
            return (
              <DateItem
                onClick={makeSelection}
                dayObj={dayObj}
                currentSelection={currentSelection}
                isSameMonth={dayjs.utc(dayObj.day).month() === month}
                isSingleDate={isSingleDate}
              />
            );
          })}
        </tr>
      );
      rows.push(row);
    }
    return rows;
  }
  function getYearsArray() {
    const yearRange = 2;
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

  function shortcut_Today() {
    setCurrentSelection([dayjs.utc().format("YYYY-MM-DD")]);
  }
  function shortcut_Yesterday() {
    setCurrentSelection([dayjs.utc().subtract(1, "day").format("YYYY-MM-DD")]);
  }
  function shortcut_ThisWeek() {
    const startOfWeek = dayjs.utc().startOf("week").format("YYYY-MM-DD");
    const endOfWeek = dayjs.utc().endOf("week").format("YYYY-MM-DD");
    setCurrentSelection([startOfWeek, endOfWeek]);
  }

  function shortcut_ThisMonth() {
    const startOfMonth = dayjs.utc().startOf("month").format("YYYY-MM-DD");
    const endOfMonth = dayjs.utc().endOf("month").format("YYYY-MM-DD");
    setCurrentSelection([startOfMonth, endOfMonth]);
  }

  function shortcut_Last7Days() {
    const sevenDaysAgo = dayjs.utc().subtract(7, "days").format("YYYY-MM-DD");
    const today = dayjs.utc().format("YYYY-MM-DD");
    setCurrentSelection([sevenDaysAgo, today]);
  }

  function shortcut_PreviousWeek() {
    const startOfPreviousWeek = dayjs
      .utc()
      .subtract(1, "week")
      .startOf("week")
      .format("YYYY-MM-DD");
    const endOfPreviousWeek = dayjs
      .utc()
      .subtract(1, "week")
      .endOf("week")
      .format("YYYY-MM-DD");
    setCurrentSelection([startOfPreviousWeek, endOfPreviousWeek]);
  }

  function shortcut_Last30Days() {
    const thirtyDaysAgo = dayjs.utc().subtract(30, "days").format("YYYY-MM-DD");
    const today = dayjs.utc().format("YYYY-MM-DD");
    setCurrentSelection([thirtyDaysAgo, today]);
  }

  function shortcut_PreviousMonth() {
    const startOfPreviousMonth = dayjs
      .utc()
      .subtract(1, "month")
      .startOf("month")
      .format("YYYY-MM-DD");
    const endOfPreviousMonth = dayjs
      .utc()
      .subtract(1, "month")
      .endOf("month")
      .format("YYYY-MM-DD");
    setCurrentSelection([startOfPreviousMonth, endOfPreviousMonth]);
  }

  function shortcut_ThisYear() {
    const startOfYear = dayjs.utc().startOf("year").format("YYYY-MM-DD");
    const endOfYear = dayjs.utc().endOf("year").format("YYYY-MM-DD");
    setCurrentSelection([startOfYear, endOfYear]);
  }

  return (
    <>
      <Button
        onClick={(e) => setOpenPicker(e.currentTarget)}
        variant="outlined"
        sx={{
          minHeight: 35,
          textTransform: "none",
          textAlign: "left",
          justifyContent: "start",
          ...customSx,
        }}
        disabled={disabled}
      >
        {pickPlaceholder()}
      </Button>
      <Popover
        open={Boolean(openPicker)}
        anchorEl={openPicker}
        onClose={() => cancelFilter()}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              overflow: "hidden",
            },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            p: 2,
            pt: 4,
            maxHeight: "500px",
            overlow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              mb: 3,
            }}
          >
            {!isSingleDate && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  marginRight: "2rem",
                }}
              >
                <Button
                  variant="text"
                  sx={{ justifyContent: "start", textTransform: "none" }}
                  onClick={() => shortcut_Today()}
                >
                  Today
                </Button>
                <Button
                  variant="text"
                  sx={{ justifyContent: "start", textTransform: "none" }}
                  onClick={() => shortcut_Yesterday()}
                >
                  Yesterday
                </Button>
                <Button
                  variant="text"
                  sx={{ justifyContent: "start", textTransform: "none" }}
                  onClick={() => shortcut_ThisWeek()}
                >
                  This week
                </Button>
                <Button
                  variant="text"
                  sx={{ justifyContent: "start", textTransform: "none" }}
                  onClick={() => shortcut_ThisMonth()}
                >
                  This month
                </Button>
                <Button
                  variant="text"
                  sx={{ justifyContent: "start", textTransform: "none" }}
                  onClick={() => shortcut_Last7Days()}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="text"
                  sx={{ justifyContent: "start", textTransform: "none" }}
                  onClick={() => shortcut_Last30Days()}
                >
                  Last 30 days
                </Button>
                <Button
                  variant="text"
                  sx={{ justifyContent: "start", textTransform: "none" }}
                  onClick={() => shortcut_PreviousMonth()}
                >
                  Prev. month
                </Button>
                <Button
                  variant="text"
                  sx={{ justifyContent: "start", textTransform: "none" }}
                  onClick={() => shortcut_PreviousWeek()}
                >
                  Prev. week
                </Button>
                <Button
                  variant="text"
                  sx={{ justifyContent: "start", textTransform: "none" }}
                  onClick={() => shortcut_ThisYear()}
                >
                  This year
                </Button>
              </Box>
            )}
            {!isSingleDate && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ ml: "auto", mr: "auto", fontSize: "1.1rem" }}
                  >
                    {convertNumberToMonth(subtractMonth(-1).m)}{" "}
                    {subtractMonth(-1).y}
                  </Typography>
                  <Button
                    variant="text"
                    sx={{ position: "absolute", left: "0px" }}
                    onClick={() => {
                      const { m, y } = subtractMonth(-1);
                      setCurrentCalendarMonth(m);
                      setCurrentCalendarYear(y);
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
                </Box>
                <table
                  className={s.calendarTable}
                  style={{ marginRight: "1rem" }}
                >
                  <thead>
                    <tr className={s.weekDays}>
                      {getWeekDays(calendarViewMode).map((day, index) => (
                        <th className={s.weekDay} key={index}>
                          <Typography color="text.disabled">
                            {trimStr(day, 2)}
                          </Typography>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {renderDays(
                      subtractMonth(-1).m,
                      subtractMonth(-1).y,
                      currentSelection
                    )}
                  </tbody>
                </table>
              </Box>
            )}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ ml: "auto", mr: "auto", fontSize: "1.1rem" }}
                >
                  {convertNumberToMonth(currentCalendarMonth)}{" "}
                  {currentCalendarYear}
                </Typography>

                {isSingleDate && (
                  <Button
                    variant="text"
                    sx={{ position: "absolute", left: "0px" }}
                    onClick={() => {
                      const { m, y } = subtractMonth(-1);
                      setCurrentCalendarMonth(m);
                      setCurrentCalendarYear(y);
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
                <Button
                  variant="text"
                  sx={{ position: "absolute", right: "0px" }}
                  onClick={() => {
                    const { m, y } = subtractMonth(1);
                    setCurrentCalendarMonth(m);
                    setCurrentCalendarYear(y);
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
              </Box>
              <table className={s.calendarTable}>
                <thead>
                  <tr className={s.weekDays}>
                    {getWeekDays(calendarViewMode).map((day, index) => (
                      <th className={s.weekDay} key={index}>
                        <Typography color="text.disabled">
                          {trimStr(day, 2)}
                        </Typography>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {renderDays(
                    currentCalendarMonth,
                    currentCalendarYear,
                    currentSelection
                  )}
                </tbody>
              </table>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
            }}
          >
            <Button
              variant="contained"
              sx={{ mr: 1, width: 150 }}
              onClick={() => {
                applyFilter();
              }}
            >
              Apply
            </Button>
            <Button
              variant="text"
              onClick={() => {
                cancelFilter();
              }}
            >
              Cancel
            </Button>

            {!isSingleDate && (
              <Button
                variant="outlined"
                sx={{ ml: "auto", width: 100 }}
                onClick={() => {
                  resetFilter();
                }}
              >
                Reset
              </Button>
            )}
          </Box>
        </Box>
      </Popover>
    </>
  );
}
function DateItem({
  dayObj,
  onClick,
  currentSelection = [],
  isSameMonth, // When we draw 2 windows of dates, we need to hide duplicate dates that we dont need in both windows
  isSingleDate,
}) {
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    setSelection(() => {
      if (
        !dayObj.day ||
        !Array.isArray(currentSelection) ||
        currentSelection.length === 0
      ) {
        return null;
      }

      const currentDate = dayjs.utc(dayObj.day).startOf("day");

      if (currentSelection.length === 1) {
        if (dayjs.utc(currentSelection[0]).startOf("day").isSame(currentDate)) {
          return "start";
        } else {
          return null;
        }
      }

      const [startDate, endDate] = currentSelection.map((d) =>
        dayjs.utc(d).startOf("day")
      );

      if (currentDate.isSame(startDate)) {
        return "start";
      } else if (currentDate.isSame(endDate)) {
        return "end";
      } else if (
        currentDate.isAfter(startDate) &&
        currentDate.isBefore(endDate)
      ) {
        return "mid";
      }

      return null;
    });
  }, [currentSelection, dayObj]);

  return (
    <td
      style={{
        position: "relative",
        ...(isSameMonth ? {} : { width: "40px", height: "40px" }),
      }}
      className={`${dayObj.isCurrentMonth ? s.dateItem : `${s.dateItem} ${s.previous}`}`}
    >
      {selection && currentSelection.length > 1 && isSameMonth && (
        <div
          style={{
            position: "absolute",
            top: "2.5px",
            bottom: "2.5px",
            left:
              selection === "start" && currentSelection.length === 2 ? 15 : 0,
            right:
              selection === "end" && currentSelection.length === 2 ? 15 : 0,
            backgroundColor: "rgb(174, 173, 231)",
          }}
        />
      )}
      {isSameMonth && (
        <Button
          onClick={() => onClick(dayObj.day)}
          variant={
            selection === "start" || selection === "end"
              ? "contained"
              : selection === "mid"
                ? "text"
                : "text"
          }
          sx={(theme) => ({
            minWidth: 10,
            width: "40px",
            height: "40px",
            borderRadius: "2rem",
            zIndex: 1,
          })}
        >
          <Typography
            fontWeight="500"
            sx={(theme) => ({
              ...(dayObj.isCurrentMonth ||
              selection === "start" ||
              selection === "end" ||
              !isSingleDate
                ? {}
                : { color: "text.grey" }),
            })}
          >
            {dayjs.utc(dayObj.day).format("DD")}
          </Typography>
        </Button>
      )}
    </td>
  );
}
function getWeekDays(calendarViewMode) {
  if (calendarViewMode === "eu") {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  } else {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }
}
function trimStr(str, maxLength) {
  if (str === undefined || str === "") return "";
  return str.length > maxLength ? `${str.slice(0, maxLength)}` : str;
}
function convertNumberToMonth(month) {
  switch (month) {
    case 0:
      return "January";
    case 1:
      return "February";
    case 2:
      return "March";
    case 3:
      return "April";
    case 4:
      return "May";
    case 5:
      return "June";
    case 6:
      return "July";
    case 7:
      return "August";
    case 8:
      return "September";
    case 9:
      return "October";
    case 10:
      return "November";
    case 11:
      return "December";
  }
}
function convertMonthToNumber(month) {
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
}
function convertNumberToDay(number) {
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
}
function convertWeekDayToNumber(number) {
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
}

function convertDayNumber(calendarViewMode, dayNumber) {
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
}
export default DatePickerWidget;
