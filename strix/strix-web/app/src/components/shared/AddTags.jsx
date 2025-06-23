import React, { useState, useEffect, useRef } from "react";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import AddIcon from "@mui/icons-material/Add";
import { Chip } from "@mui/material";

const AddTags = ({ onTagAdded, tags, tagsInUse, fullWidth = true }) => {
  // Add new entity to content
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const showAddNewPopover = (event) => {
    setAnchorEl(event.currentTarget);
  };
  function getTagsToAdd() {
    let allTags = tags.filter(
      (tag) => tagsInUse.some((t) => t === tag) === false
    );
    allTags = new Set(allTags);
    allTags = Array.from(allTags);
    allTags.map((t, index) => ({
      label: `${t}`,
    }));
    return allTags;
  }
  const [inputValue, setInputValue] = React.useState("");
  function tryToAddTag(e) {
    if (e.key === "Enter") {
      if (tagsInUse.some((t) => t === inputValue) === false) {
        if (inputValue !== undefined) {
          onTagAdded(inputValue);
        }
      }
    }
  }

  return (
    <div style={{ width: fullWidth ? "100%" : "fit-content" }}>
      <Button
        label="Add tag"
        variant="contained"
        onClick={showAddNewPopover}
        sx={{ textTransform: "none", textSize: 10, minHeight: 30, minWidth: 100 }}
      >
        Add tags
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
        <Autocomplete
          noOptionsText={"Press Enter to add tag"}
          disablePortal
          id="tagssearch"
          onInputChange={(event, newInputValue) => {
            setInputValue(newInputValue);
          }}
          onKeyDown={(e, value) => {
            tryToAddTag(e, value);
          }}
          onChange={(event, newValue) => {
            onTagAdded(newValue);
          }}
          options={getTagsToAdd()}
          sx={{ width: 300 }}
          renderInput={(params) => (
            <TextField
              spellCheck={false}
              {...params}
              label="Search or create tags"
            />
          )}
        />
      </Popover>
    </div>
  );
};

export default AddTags;
