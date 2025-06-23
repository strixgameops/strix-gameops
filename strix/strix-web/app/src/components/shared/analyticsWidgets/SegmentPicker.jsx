import React, { useState, useEffect } from "react";
import useApi from "@strix/api";
import { useGame, useBranch } from "@strix/gameContext";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

function SegmentPicker({ onChange }) {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { getAllSegmentsForAnalyticsFilter } = useApi();

  const [filterSegments, setFilteredSegments] = useState([]);
  const [segmentsList, setSegmentsList] = useState([]);

  useEffect(() => {
    onChange(filterSegments);
  }, [filterSegments]);

  const handleChange_filterSegments = (event) => {
    const {
      target: { value },
    } = event;
    setFilteredSegments(
      // On autofill we get a stringified value.
      typeof value === "string" ? value.split(",") : value
    );
  };

  useEffect(() => {
    // Getting segment list
    async function fetchSegmentList() {
      const response = await getAllSegmentsForAnalyticsFilter({
        gameID: game.gameID,
        branch: branch,
      });
      if (response.success) {
        // Segments with "everyone" segment
        let segments = response.message;

        for (let i = 0; i < segments.length; i++) {
          if (segments[i].segmentID === "everyone") {
            segments.splice(i, 1);
            break;
          }
        }

        // Populate segments filter with all segments, except "everyone"
        setSegmentsList(segments);
      }
    }
    fetchSegmentList();
  }, []);

  return (
    <div>
      <FormControl size="small" sx={{ width: 120, minHeight: 35 }}>
        {filterSegments.length === 0 ? (
          <InputLabel id="segments" sx={{ fontSize: 12 }}>
            {filterSegments.length} segments
          </InputLabel>
        ) : (
          <InputLabel id="segments" sx={{ fontSize: 0 }}></InputLabel>
        )}
        <Select
          size="small"
          sx={{
            borderRadius: "2px",
            height: 35,
            fontSize: 12,
            legend: {
              display: "none",
            },
            fieldset: {
              top: 0,
            },
          }}
          multiple
          value={filterSegments}
          onChange={handleChange_filterSegments}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 0.5 }}>
              {selected.length} segments
            </Box>
          )}
        >
          {segmentsList.length === 0 && (
            <Typography
              variant="subtitle1"
              color={"text.secondary"}
              sx={{
                p: 2,
                fontSize: "14px",
                fontWeight: "regular",
                textAlign: "center",
              }}
            >
              No segments found
            </Typography>
          )}
          {segmentsList.length !== 0 &&
            segmentsList.map((segment) => (
              <MenuItem key={segment.segmentID} value={segment}>
                {segment.segmentName}
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    </div>
  );
}

export default SegmentPicker;
