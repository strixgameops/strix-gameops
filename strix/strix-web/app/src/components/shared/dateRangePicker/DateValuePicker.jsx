import React, { useState, useEffect, useRef } from "react";

import Popover from "@mui/material/Popover";
import { DateRangePicker, Calendar } from "react-date-range";
import { Button } from "@mui/material";
import s from "./datePicker.module.css";
import dayjs from "dayjs";

function DateValuePicker({
  onValueSet,
  customSX,
  filterStateOverride,
  skipInitialCallback = false,
  isSingleDate = false,
  date, // used only for single date picker
}) {
  const [filterDateState, setDateFilterState] = useState([
    {
      startDate: dayjs.utc().subtract(7, "days").toDate(),
      endDate: dayjs.utc().toDate(),
      key: "selection",
      ...(filterStateOverride ? filterStateOverride : {}),
    },
  ]);
  const [filterDate, setFilteredDate] = useState([
    filterDateState[0].startDate,
    filterDateState[0].endDate,
  ]);

  const [anchorEl_DatePicker, setAnchorEl_DatePicker] = useState(null);
  const handleClick_DatePicker = (event) => {
    setAnchorEl_DatePicker(event.currentTarget);
  };
  const handleClose_DatePicker = () => {
    setAnchorEl_DatePicker(null);
  };
  const openDatePicker = Boolean(anchorEl_DatePicker);

  const minDate = addDays(new Date(), -365);
  const maxDate = addDays(new Date(), 0);
  const lastDateFilter = useRef(null);

  useEffect(() => {
    if (skipInitialCallback) return;
    doCallback();
  }, []);

  function doCallback() {
    let tempDate = filterDateState.map((date) => [
      dayjs.utc(date.startDate),
      dayjs.utc(date.endDate),
    ])[0];

    if (JSON.stringify(tempDate) !== JSON.stringify(lastDateFilter.current)) {
      lastDateFilter.current = tempDate;
      // tempDate[0] = dayjs.utc(tempDate[0]).add(1, "day");
      setFilteredDate(tempDate);
      onValueSet([tempDate[0].toISOString(), tempDate[1].toISOString()]);
    }
    setAnchorEl_DatePicker(null);
  }

  const [singleDateState, setSingleDateState] = useState(date || new Date());

  function pickPlaceholder() {
    if (isSingleDate) {
      return `${dayjs.utc(singleDateState).format("DD.MM.YYYY")}`;
    } else {
      return `${dayjs.utc(filterDateState[0].startDate).format("DD.MM.YYYY")} - ${dayjs.utc(filterDateState[0].endDate).format("DD.MM.YYYY")}`;
    }
  }

  useEffect(() => {
    if (isSingleDate) {
      onValueSet(singleDateState.toISOString());
    }
  }, [singleDateState]);

  return (
    <div
      style={{ display: "flex", width: "fit-content", height: "fit-content" }}
    >
      <Button
        variant="outlined"
        sx={(theme) => ({
          minHeight: 35,
          maxHeight: 35,
          justifyContent: "start",

          ...theme.applyStyles("dark", {
            color: "#e7e7e7",
            borderColor: "#5a5b5e",
            "&:hover": {
              borderColor: "#e7e7e7",
              background: "none",
            },
          }),
          ...theme.applyStyles("light", {
            color: "#151720",
            borderColor: "#a8abc2",
            "&:hover": {
              borderColor: "#151720",
              background: "none",
            },
          }),

          backgroundColor: "none",
          minWidth: "120px",
          maxWidth: "200px",
          borderRadius: "2rem",
          whiteSpace: "nowrap",
          ...customSX,
        })}
        onClick={handleClick_DatePicker}
      >
        {pickPlaceholder()}
      </Button>
      <Popover
        open={openDatePicker}
        anchorEl={anchorEl_DatePicker}
        onClose={handleClose_DatePicker}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <div className={s.datePickerBodyWrapper}>
          {isSingleDate ? (
            <Calendar
              date={dayjs.utc(singleDateState).toDate()}
              onChange={(item) => {
                handleClose_DatePicker();
                setSingleDateState(
                  dayjs.utc(item).add(item.getTimezoneOffset() * -1, "minute")
                );
              }}
              showSelectionPreview={true}
            />
          ) : (
            <DateRangePicker
              onChange={(item) => {
                const start = dayjs
                  .utc(item.selection.startDate)
                  .add(
                    item.selection.startDate.getTimezoneOffset() * -1,
                    "minute"
                  );
                const end = dayjs
                  .utc(item.selection.endDate)
                  .add(
                    item.selection.endDate.getTimezoneOffset() * -1,
                    "minute"
                  );

                setDateFilterState([
                  {
                    ...item.selection,
                    startDate: start.toDate(),
                    endDate: end.toDate(),
                  },
                ]);
              }}
              showSelectionPreview={true}
              moveRangeOnFirstSelection={false}
              months={2}
              ranges={filterDateState}
              direction="horizontal"
              minDate={minDate}
              maxDate={maxDate}
            />
          )}
          {!isSingleDate && (
            <Button
              variant="contained"
              onClick={doCallback}
              sx={{
                position: "absolute",
                zIndex: 1,
                bottom: "0%",
                left: "0%",
                margin: 1,
                width: "200px",
              }}
            >
              Apply
            </Button>
          )}
        </div>
      </Popover>
    </div>
  );
}

export default DateValuePicker;
