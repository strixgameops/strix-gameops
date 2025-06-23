import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import s from "./segmentsPickerWidget.module.css";

import { Box } from "@mui/material";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import GroupsSharpIcon from "@mui/icons-material/GroupsSharp";
import InputAdornment from "@mui/material/InputAdornment";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
      className={s.tabContent}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function SegmentsPickerWidget({
  segments,
  onStateChange,
  currentSegments = [],
  multiple = true,
  customSx = {},
  customLabelEnding = "",
  showAdornment = false,
}) {
  const [openPicker, setOpenPicker] = useState(null);
  const [tabs, setTabs] = useState(0);

  // Memoize filtered segments to prevent unnecessary recalculations
  const [regularSegments, flowsSegments, abTestsSegments] = useMemo(
    () => [
      segments.filter(
        (s) =>
          !s.segmentID.startsWith("abtest_") && !s.segmentID.startsWith("flow_")
      ),
      segments.filter((s) => s.segmentID.startsWith("flow_")),
      segments.filter((s) => s.segmentID.startsWith("abtest_")),
    ],
    [segments]
  );

  const handleTabChange = (event, newValue) => {
    setTabs(newValue);
  };

  const toggleSegment = useCallback(
    (segment) => {
      const newSegments = multiple
        ? currentSegments.some((s) => s.segmentID === segment.segmentID)
          ? currentSegments.filter((s) => s.segmentID !== segment.segmentID)
          : [...currentSegments, segment]
        : [segment];
      onStateChange(newSegments);
    },
    [currentSegments, multiple, onStateChange]
  );

  const NoSegmentsOverlay = useCallback(
    () => (
      <Typography
        variant="h6"
        color="text.grey"
        sx={{ pointerEvents: "none", p: 2 }}
      >
        No segments
      </Typography>
    ),
    []
  );

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
          borderColor: "rgba(0, 0, 0, 0.23)",
          "&:hover": {
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "#151720",
            boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.23)",
          },
          ...customSx,
        }}
      >
        {currentSegments.length === 0
          ? `Segments${customLabelEnding}`
          : `${currentSegments.length} segment(s)${customLabelEnding}`}
        {showAdornment && (
          <InputAdornment position="end" sx={{ ml: "auto" }}>
            <GroupsSharpIcon sx={{ fontSize: 23, mr: 1 }} />
          </InputAdornment>
        )}
      </Button>

      <Popover
        open={Boolean(openPicker)}
        anchorEl={openPicker}
        onClose={() => setOpenPicker(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { overflow: "hidden" } } }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            p: 0,
            maxHeight: "500px",
            width: "400px",
            maxWidth: "600px",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: 1,
              pb: 0,
              borderBottom: 1,
              borderColor: "divider",
              width: "100%",
              backgroundColor: "var(--upperbar-bg-color)",
            }}
          >
            <Tabs value={tabs} onChange={handleTabChange}>
              <Tab label="regular" />
              <Tab label="flows" />
              <Tab label="a/b tests" />
            </Tabs>
          </Box>

          <TabPanel value={tabs} index={0}>
            <SegmentList
              segments={regularSegments}
              currentSegments={currentSegments}
              toggleSegment={toggleSegment}
              NoSegmentsOverlay={NoSegmentsOverlay}
            />
          </TabPanel>

          <TabPanel value={tabs} index={1}>
            <SegmentList
              segments={flowsSegments}
              currentSegments={currentSegments}
              toggleSegment={toggleSegment}
              NoSegmentsOverlay={NoSegmentsOverlay}
            />
          </TabPanel>

          <TabPanel value={tabs} index={2}>
            <SegmentList
              segments={abTestsSegments}
              currentSegments={currentSegments}
              toggleSegment={toggleSegment}
              NoSegmentsOverlay={NoSegmentsOverlay}
            />
          </TabPanel>
        </Box>
      </Popover>
    </>
  );
}
const SegmentList = React.memo(
  ({ segments, currentSegments, toggleSegment, NoSegmentsOverlay }) => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        borderBottom: "1px solid #615ff449",
        p: 1,
        gap: 0.1,
      }}
    >
      {segments.length > 0 ? (
        segments.map((s) => (
          <SegmentItem
            key={s.segmentID}
            segment={s}
            currentSegments={currentSegments}
            onToggleSegment={toggleSegment}
          />
        ))
      ) : (
        <NoSegmentsOverlay />
      )}
    </Box>
  )
);
const SegmentItem = React.memo(
  ({ currentSegments, segment, onToggleSegment }) => (
    <Button
      variant="text"
      onClick={() => onToggleSegment(segment)}
      sx={{ width: "100%", height: "45px" }}
    >
      {segment.segmentName}
      {currentSegments.some((s) => s.segmentID === segment.segmentID) ? (
        <RadioButtonCheckedIcon sx={{ ml: "auto" }} />
      ) : (
        <RadioButtonUncheckedIcon sx={{ ml: "auto" }} />
      )}
    </Button>
  )
);

export default SegmentsPickerWidget;
