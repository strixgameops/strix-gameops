import React, { useEffect } from "react";
import ScaleText from "react-scale-text";
import { Tooltip } from "@mui/material";
import chroma from "chroma-js";
import { styled } from "@mui/material/styles";
import { tooltipClasses } from "@mui/material/Tooltip";
import s from "./elementItem.module.css";
const ElementItem = ({
  profile,
  colored = false,
  scaleMin,
  scaleMax,
  tooltipContent,
  isSelected,
  onSelect,
}) => {
  const normalize = (value, max) => {
    if (max === 0) return 0;
    return value / max;
  };
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  const colorScale = chroma.scale(["#FFFFFF", "#00c50a"]);

  useEffect(() => {
    // Manually removing ScaleText wrappers from the DOM, otherwise they will move to the <body> and stack there forever on every mount
    return () => {
      const scaleTextWrappers = document.querySelectorAll(
        `${s.profileItem} scaletext-wrapper`
      );
      scaleTextWrappers.forEach((wrapper) => {
        wrapper.parentNode.removeChild(wrapper);
      });
    };
  }, []);

  return (
    <div
      onClick={() => onSelect(profile)}
      className={`${s.profileItem} ${isSelected ? s.profileItemSelected : ""}`}
    >
      <div className={`${s.itemText} ${s.itemName}`}>
        {Boolean(profile.name) && (
          <ScaleText maxFontSize={18} minFontSize={12}>
            {profile.name}
          </ScaleText>
        )}
      </div>
      <div className={`${s.itemText} ${s.itemValue}`}>
        {Boolean(profile.name) && (
          <ScaleText maxFontSize={18} minFontSize={12}>
            {profile.value}
          </ScaleText>
        )}
      </div>
    </div>
  );
};

export default ElementItem;
