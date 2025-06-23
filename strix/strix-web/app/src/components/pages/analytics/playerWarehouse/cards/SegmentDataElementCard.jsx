import React from "react";
import s from "../css/dataElement.module.css";

import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

const SegmentDataElementCard = ({ segment, abTests }) => {
  function trimStr(str) {
    if (str === undefined || str === "") return "";
    return str.length > 25 ? `${str.slice(0, 25)}...` : str;
  }

  function getIsAbTestSegment() {
    if (segment.segmentID.startsWith("abtest_")) {
      const testId = segment.segmentID.slice(7);
      return abTests.some((t) => t.id === testId);
    }
    return false;
  }
  function getAbTestSegmentName() {
    if (segment.segmentID.startsWith("abtest_")) {
      const testId = segment.segmentID.slice(7);
      return abTests.find((t) => t.id === testId).name;
    }
    return false;
  }

  return (
    <div className={s.segmentDataItem}>
      <Tooltip
        title={`Segment name: ${segment.segmentName}`}
        placement="right-start"
      >
        <Typography>
          {trimStr(
            getIsAbTestSegment() ? getAbTestSegmentName() : segment.segmentName
          )}
        </Typography>
      </Tooltip>
    </div>
  );
};

export default SegmentDataElementCard;
