import React, { useEffect, useState, useRef } from "react";
import ScaleText from "react-scale-text";
import { Tooltip, Typography } from "@mui/material";
import chroma from "chroma-js";
import { styled } from "@mui/material/styles";
import Tooltip_SingleDefaultDistributionChart from "../Tooltip_SingleDefaultDistributionChart";
import { tooltipClasses } from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import DraggableComponent from "shared/draggableWrapper.jsx";

import CloseIcon from "@mui/icons-material/Close";
import { useThemeContext } from "@strix/themeContext";
import { useTheme } from "@mui/material/styles";

import Button from "@mui/material/IconButton";

const CustomWidthTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 700,
    //   display: "flex"
  },
});
function AnchorElTooltips(props) {
  const positionRef = React.useRef({
    x: 0,
    y: 0,
  });
  const popperRef = React.useRef(null);
  const areaRef = React.useRef(null);

  const handleMouseMove = (event) => {
    positionRef.current = { x: event.clientX, y: event.clientY };

    if (popperRef.current != null) {
      popperRef.current.update();
    }
  };

  return (
    <CustomWidthTooltip
      open={props.open}
      title={props.title}
      placement={props.placement}
      componentsProps={props.componentsProps}
      PopperProps={{
        popperRef,
        anchorEl: {
          getBoundingClientRect: () => {
            return new DOMRect(0, 0, 0, 0);
          },
        },
      }}
    >
      <Box ref={areaRef}>{props.children}</Box>
    </CustomWidthTooltip>
  );
}

const ElementItem = ({
  s,
  profile,
  colored = false,
  scaleMin,
  scaleMax,
  tooltipContent,
}) => {
  const theme = useTheme();

  const [isLocked, setIsLocked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const normalize = (value, max) => {
    if (max === 0) return 0;
    return value / max;
  };
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  const colorScale = chroma.scale([theme.palette.text.primary, "#00c50a"]);

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

  const elementContainer = useRef(null);
  const [tooltipInitialPos, setTooltipInitialPos] = useState({ x: 0, y: 0 });

  // useEffect(() => {
  //   if (!elementContainer.current) return;
  //   setTooltipInitialPos(getInitialPosition());
  // }, [elementContainer.current]);

  // function getInitialPosition() {
  //   if (!elementContainer.current) return { top: 0, left: 0 };
  //   const { top, left } = elementContainer.current.getBoundingClientRect();

  //   return { top, left };
  // }

  if (!profile.value || !profile.name) return null; // In case we've got bad data

  return (
    <>
      <AnchorElTooltips
        open={isLocked || isHovered}
        componentsProps={{
          tooltip: {
            sx: {
              backgroundColor: "transparent",
            },
          },
        }}
        title={
          <DraggableComponent initialPos={tooltipInitialPos}>
            <div className={s.tooltipSelectedData}>
              <Button
                onClick={() => setIsLocked(false)}
                sx={{
                  position: "absolute",
                  top: "7px",
                  right: "15px",
                  zIndex: 1,
                  minWidth: "30px",
                  width: "30px",
                  marginLeft: "auto",
                }}
              >
                <CloseIcon
                // htmlColor="#e7e7e7"
                />
              </Button>
              <Tooltip_SingleDefaultDistributionChart
                data={[
                  { value: profile.value, players: profile.players },
                  ...tooltipContent,
                ]}
                valueName={profile.name}
              />
              <Typography variant="subtitle" color="text.secondary">
                {!isLocked
                  ? "Click on the element to fixate and make movable"
                  : ""}
              </Typography>
            </div>
          </DraggableComponent>
        }
        placement="top"
      >
        <div
          ref={elementContainer}
          className={`${s.profileItem} ${isLocked ? s.profileItemSelected : ""}`}
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            setTooltipInitialPos({ top: e.clientY, left: e.clientX });
            setIsLocked(!isLocked);
          }}
          onMouseEnter={(e) => {
            if (!isLocked) {
              setTooltipInitialPos({ top: e.clientY, left: e.clientX + 50 });
            }
            setIsHovered(true);
          }}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={`${s.itemText} ${s.itemName}`}>
            {Boolean(profile.name) && (
              <ScaleText maxFontSize={18} minFontSize={12}>
                {profile.name}
              </ScaleText>
            )}
          </div>
          <div className={`${s.itemText} ${s.itemValue}`}>
            {Boolean(profile.value) && (
              <ScaleText maxFontSize={18} minFontSize={12}>
                {profile.value.toString()}
              </ScaleText>
            )}
          </div>
          <div
            className={`${s.itemText} ${s.itemShare}`}
            style={
              colored
                ? { color: colorScale(normalize(profile.share, scaleMax)) }
                : {}
            }
          >
            {Boolean(profile.share) && (
              <ScaleText maxFontSize={18} minFontSize={12}>
                {`${parseFloat(clamp(profile.share, 0, 100)).toFixed(2)}%`}
              </ScaleText>
            )}
          </div>
        </div>
      </AnchorElTooltips>
    </>
  );
};

export default ElementItem;
