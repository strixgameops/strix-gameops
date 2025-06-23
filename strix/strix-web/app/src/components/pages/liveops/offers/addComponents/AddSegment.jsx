import React, { useState, useEffect, useRef } from "react";
import s from "../offerItem.module.css";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import AddIcon from "@mui/icons-material/Add";

const AddSegment = ({ onSegmentAdded, segments, offerState }) => {
  // Add new entity to content
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const showAddNewPopover = (event) => {
    setAnchorEl(event.currentTarget);
  };

  function getSegmentsToAdd() {
    return segments
      .filter(
        (segment) =>
          offerState.segments.some((s) => s === segment.segmentID) === false
      )
      .map((s) => ({
        label: `${s.segmentName}`,
        segmentID: s.segmentID,
      }));
  }

  return (
    <div style={{ width: "100%" }}>
      <Button
        onClick={showAddNewPopover}
        fullWidth
        key="addSegmentsButton"
        variant="contained"
        sx={{
          height: "25px",
          textTransform: "none",
          fontSize: "12px",
          borderRadius: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          p: 1,
          m: 0,
        }}
      >
        Add segment
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={(event) => {
          setAnchorEl(null);
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
              backgroundImage: "none",
              backgroundColor: "var(--bg-color3)",
            },
          },
        }}
      >
        {segments && segments.length > 0 ? (
          <Autocomplete
            disablePortal
            id="Search"
            onChange={(event, newValue) => {
              setAnchorEl(null);
              onSegmentAdded(newValue);
            }}
            options={getSegmentsToAdd()}
            sx={{ width: 300 }}
            renderInput={(params) => (
              <TextField spellCheck={false} {...params} label="Segments" />
            )}
          />
        ) : (
          <div className={s.addNewEntityBody}>
            <div className={s.noEntities}>
              <p>No segments found.</p>
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
};

export default AddSegment;
