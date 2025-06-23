import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Tooltip,
  Input,
  Popover,
} from "@mui/material";
import { trimStr } from "../utils/testUtils";
import s from "../abtesting.module.css";

const TestSegments = ({ test, segmentsList, onSegmentChange, disabled }) => {
  const [controlAnchorEl, setControlAnchorEl] = useState(null);
  const [shareEditing, setShareEditing] = useState(false);

  const findSegmentName = (segmentID) => {
    return (
      segmentsList.find((s) => s.segmentID === segmentID)?.segmentName || ""
    );
  };

  const handleSegmentSelect = (segmentID) => {
    onSegmentChange({
      ...test.segments,
      control: segmentID,
      test: segmentID,
    });
    setControlAnchorEl(null);
  };

  const handleShareChange = (value) => {
    const parsedShare = parseFloat(value) / 100;
    const normalizedShare = Math.min(Math.max(parsedShare, 0.01), 1);
    onSegmentChange({
      ...test.segments,
      testShare: isNaN(normalizedShare) ? 0 : normalizedShare,
    });
  };

  const availableSegments = segmentsList.filter(
    (s) => s.segmentID !== `abtest_${test.id}`
  );

  return (
    <div className={s.group}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography sx={{ m: 1, mr: 0 }} color="text.secondary">
          Control:
        </Typography>
        <Tooltip title={findSegmentName(test.segments.control)} placement="top">
          <Button
            disabled={disabled || !test.subject.every((s) => s.type)}
            onClick={(e) => setControlAnchorEl(e.currentTarget)}
            variant="outlined"
            sx={{ height: "35px", textTransform: "none" }}
          >
            <Typography fontSize={14}>
              {trimStr(findSegmentName(test.segments.control), 20)}
            </Typography>
          </Button>
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ m: 1, mr: 0 }} color="text.secondary">
          Test:
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Button
            disabled
            variant="outlined"
            sx={{ height: "35px", textTransform: "none" }}
          >
            <Typography fontSize={14}>
              {trimStr(findSegmentName(test.segments.test), 20)}
            </Typography>
          </Button>
          <Button
            disabled={disabled || !test.subject.every((s) => s.type)}
            variant="outlined"
            sx={{ height: "35px", textTransform: "none", pl: 0, pr: 1 }}
            onClick={() => setShareEditing(true)}
          >
            <Input
              spellCheck={false}
              fullWidth
              value={
                test.segments.testShare === 0
                  ? ""
                  : Math.round(test.segments.testShare * 100)
              }
              onBlur={() => setShareEditing(false)}
              onChange={(e) => handleShareChange(e.target.value)}
              sx={{
                width: "30px",
                fontSize: "14px",
                backgroundColor: "rgba(0,0,0,0.0)",

                "& .MuiInputBase-input": {
                  textAlign: "center",
                  fontSize: "13px",
                },
                "&.MuiInputBase-root::before": {
                  borderBottom: "none",
                },
                "&.MuiInputBase-root:hover::before": {
                  borderBottom: "1px solid #6E758E",
                },
                pl: 0,
                pr: 0,
              }}
            />
            %
          </Button>
        </Box>
      </Box>

      <Popover
        open={Boolean(controlAnchorEl)}
        anchorEl={controlAnchorEl}
        onClose={() => setControlAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div className={s.popoverSegmentsList}>
          {availableSegments.map((segment) => (
            <Button
              key={segment.segmentID}
              sx={{ textTransform: "none", justifyContent: "start" }}
              onClick={() => handleSegmentSelect(segment.segmentID)}
            >
              {segment.segmentName}
            </Button>
          ))}
        </div>
      </Popover>
    </div>
  );
};

export default React.memo(TestSegments);
