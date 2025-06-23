import React, { useState, useEffect, useRef } from "react";

import { Button, TextField, Box } from "@mui/material";
import s from "./searchWrapper.module.css";
import dayjs from "dayjs";
import useApi from "@strix/api";
import { useBranch, useGame } from "@strix/gameContext";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import { OutlinedInput, Typography } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import SegmentsPicker from "shared/segmentsWidget/SegmentsPickerWidget.jsx";
import InputAdornment from "@mui/material/InputAdornment";
import TurnedInSharpIcon from "@mui/icons-material/TurnedInSharp";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";

function SearchWrapper({
  itemsToFilter = [],
  segmentsEnabled = true,
  tagsEnabled = true,
  nameEnabled = true,
  groupsEnabled = false,

  possibleTags = [],
  possibleSegments = [],
  possibleGroups = [],

  segmentMatcher = () => {},
  tagsMatcher = () => {},
  nameMatcher = () => {},
  groupMatcher = () => {},

  onItemsFiltered,
}) {
  const [filterSegments, setFilterSegments] = useState([]);
  const [filterTags, setFilterTags] = useState([]);

  const [filterGroups, setFilterGroups] = useState([]);
  const [filterName, setFilterName] = useState("");

  useEffect(() => {
    let filtered = itemsToFilter;
    if (segmentsEnabled) {
      filtered = filtered.filter((item) =>
        filterSegments.length === 0
          ? true
          : segmentMatcher(item, filterSegments)
      );
    }
    if (tagsEnabled) {
      filtered = filtered.filter((item) =>
        filterTags.length === 0 ? true : tagsMatcher(item, filterTags)
      );
    }
    if (nameEnabled) {
      filtered = filtered.filter((item) =>
        filterName.length === 0 ? true : nameMatcher(item, filterName)
      );
    }
    if (groupsEnabled) {
      filtered = filtered.filter((item) =>
        filterGroups.length === 0 ? true : groupMatcher(item, filterGroups)
      );
    }
    onItemsFiltered(filtered);
  }, [itemsToFilter, filterSegments, filterTags, filterName, filterGroups]);

  return (
    <div className={s.searchWrapper}>
      {nameEnabled && (
        <TextField
          spellCheck={false}
          label="Name"
          autoComplete={false}
          value={filterName}
          onChange={(event) => setFilterName(event.target.value)}
          sx={{
            "& label[data-shrink='false']": {
              top: "-5.5px",
            },
            "& .MuiInputBase-root": {
              height: "45px",
            },
          }}
        />
      )}
      {segmentsEnabled && (
        <SegmentsPicker
          segments={possibleSegments}
          currentSegments={possibleSegments.filter((s) =>
            filterSegments.includes(s.segmentID)
          )}
          onStateChange={(s) => {
            setFilterSegments(s.map((seg) => seg.segmentID));
          }}
          customSx={{ ml: 1, width: 200, height: 45 }}
          showAdornment
        />
      )}
      {tagsEnabled && (
        <FormControl
          size="small"
          sx={{
            ml: 1,
            minWidth: "120px",
            width: "fit-content",
            maxWidth: "220px",
          }}
        >
          <InputLabel id="tags">Tags</InputLabel>
          <Select
            sx={{
              borderRadius: "2rem",
              minHeight: 45,
              maxHeight: 45,
              "& .MuiSvgIcon-root": {
                display: "none",
              },
              "& .MuiInputAdornment-root .MuiSvgIcon-root": {
                display: "block",
              },
              "& .MuiOutlinedInput-input": {
                pr: "5px !important",
              },
            }}
            labelId="tags"
            multiple
            size="small"
            value={filterTags}
            onChange={(e) => {
              setFilterTags(e.target.value);
            }}
            input={
              <OutlinedInput
                spellCheck={false}
                size="small"
                id="select-multiple-chip"
                label="Tags"
                endAdornment={
                  <InputAdornment position="end">
                    <TurnedInSharpIcon sx={{ fontSize: 23, mr: 1 }} />
                  </InputAdornment>
                }
              />
            }
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 0.5 }}>
                {selected.length} tags
              </Box>
            )}
          >
            {possibleTags.map((tag) => (
              <MenuItem key={tag} value={tag}>
                {tag}
                {filterTags.includes(tag) ? (
                  <RadioButtonCheckedIcon sx={{ ml: "auto" }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ ml: "auto" }} />
                )}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {groupsEnabled && (
        <FormControl size="small" fullWidth sx={{ ml: 1, width: "70%" }}>
          <InputLabel id="groups" sx={{ fontSize: 16 }}>
            Groups
          </InputLabel>
          <Select
            size="small"
            sx={{ fontSize: 16, minHeight: 45, maxHeight: 45 }}
            labelId="groups"
            id="groups"
            multiple
            value={filterGroups}
            onChange={(e) => {
              setFilterGroups(e.target.value);
            }}
            input={
              <OutlinedInput
                spellCheck={false}
                id="select-multiple-chip"
                label="groups"
              />
            }
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 0.5 }}>
                {selected.length} groups
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 48 * 4.5 + 8,
                  width: 250,
                },
              },
            }}
          >
            {possibleGroups.length === 0 && (
              <Typography
                color="text.disabled"
                sx={{ pointerEvents: "none", p: 1 }}
              >
                No groups found
              </Typography>
            )}
            {possibleGroups.map((group) => (
              <MenuItem key={group} value={group}>
                {group}
                {filterGroups.includes(group) ? (
                  <RadioButtonCheckedIcon sx={{ ml: "auto" }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ ml: "auto" }} />
                )}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </div>
  );
}

export default SearchWrapper;
