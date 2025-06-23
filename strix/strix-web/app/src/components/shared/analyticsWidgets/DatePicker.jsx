import React, { useState, useEffect, useRef } from "react";
import { useGame, useBranch } from "@strix/gameContext";
import { DateRangePicker } from "react-date-range";
import { addDays } from "date-fns";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";

function DatePicker({ customSX }) {
  const [filterDateState, setDateFilterState] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 7),
      key: "selection",
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
    let tempDate = filterDateState.map((date) => [
      date.startDate,
      date.endDate,
    ])[0];

    if (JSON.stringify(tempDate) !== JSON.stringify(lastDateFilter.current)) {
      lastDateFilter.current = tempDate;
      setFilteredDate(tempDate);
    }
  }, [filterDateState]);

  return (
    <div>
      <Button
        variant="outlined"
        sx={{
          minHeight: "100%",
          justifyContent: "start",
          borderColor: "#5a5b5e",
          "&:hover": {
            borderColor: "#e7e7e7",
            background: "none",
          },
          color: "#e7e7e7",
          backgroundColor: "none",
          minWidth: "120px",
          maxWidth: "200px",
          borderRadius: "2px",
          whiteSpace: "nowrap",
          ...customSX,
        }}
        onClick={handleClick_DatePicker}
      >
        {filterDateState[0].startDate.toLocaleDateString()} -{" "}
        {filterDateState[0].endDate.toLocaleDateString()}
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
        <DateRangePicker
          onChange={(item) => {
            setDateFilterState([item.selection]);
          }}
          showSelectionPreview={true}
          moveRangeOnFirstSelection={false}
          months={2}
          ranges={filterDateState}
          direction="horizontal"
          minDate={minDate}
          maxDate={maxDate}
        />
      </Popover>
    </div>
  );
}

export default DatePicker;
