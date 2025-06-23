import React, { memo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import { NAVBAR_ASPECTS } from "./utils/navbarConstants";
import s from "./css/navbar.module.css";

const SwitcherContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  backgroundColor: "rgba(87, 80, 210, 0.1)",
  borderRadius: "24px",
  padding: "4px",
  margin: "16px 0",
  position: "relative",
  overflow: "hidden",
}));

const SwitcherButton = styled(Button)(({ theme, active }) => ({
  flex: 1,
  minWidth: 0,
  padding: "8px 16px",
  borderRadius: "20px",
  textTransform: "none",
  fontSize: "13px",
  fontWeight: 500,
  letterSpacing: 0.5,
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  zIndex: 2,
  position: "relative",
  border: "none",
  backgroundColor: "transparent",
  color: active ? "#ffffff" : theme.palette.text.secondary,
  "&:hover": {
    backgroundColor: active ? "rgba(105, 98, 234, 0.9)" : "rgba(105, 98, 234, 0.2)",
    color: active ? "#ffffff" : theme.palette.text.primary,
  },
  ...(active && {
    backgroundColor: "#6962ea",
    color: "#ffffff",
    boxShadow: "0 2px 8px rgba(105, 98, 234, 0.3)",
  }),
}));

const AspectSwitcher = memo(({ currentAspect, onAspectChange, disabled }) => {
  return (
    <SwitcherContainer className={s.aspectSwitcher}>
      <SwitcherButton
        active={currentAspect === NAVBAR_ASPECTS.ANALYTICS}
        onClick={() => onAspectChange(NAVBAR_ASPECTS.ANALYTICS)}
        disabled={disabled}
      >
        Analytics
      </SwitcherButton>
      <SwitcherButton
        active={currentAspect === NAVBAR_ASPECTS.LIVEOPS}
        onClick={() => onAspectChange(NAVBAR_ASPECTS.LIVEOPS)}
        disabled={disabled}
      >
        LiveOps
      </SwitcherButton>
    </SwitcherContainer>
  );
});

AspectSwitcher.displayName = "AspectSwitcher";

export default AspectSwitcher;