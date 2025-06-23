import React, { useState, useEffect, useRef } from "react";
import s from "../offerItem.module.css";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

const AddLinkedEntity = ({ onLinkedEntityAdded, entities, offerState }) => {
  // Add new entity to content
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const showAddNewPopover = (event) => {
    setAnchorEl(event.currentTarget);
  };

  function getEntitiesToAdd() {
    return entities
      .filter((e) => offerState.linkedEntities.includes(e.nodeID) === false)
      .map((e) => ({
        label: `${e.name}`,
        nodeID: e.nodeID,
      }));
  }

  return (
    <div style={{ width: "100%" }}>
      <Button
        onClick={showAddNewPopover}
        fullWidth
        key="AddLinkedEntitysButton"
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
        Add entity
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
        {entities && entities.length > 0 ? (
          <Autocomplete
            disablePortal
            id="Search"
            onChange={(event, newValue) => {
              setAnchorEl(null);
              onLinkedEntityAdded(newValue.nodeID);
            }}
            options={getEntitiesToAdd()}
            sx={{ width: 300 }}
            renderInput={(params) => (
              <TextField spellCheck={false} {...params} label="Entities" />
            )}
          />
        ) : (
          <div className={s.addNewEntityBody}>
            <div className={s.noEntities}>
              <p>No entities found.</p>
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
};

export default AddLinkedEntity;
