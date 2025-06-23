import React, { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import { styled } from "@mui/material/styles";
import Select from "@mui/material/Select";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CloudIcon from "@mui/icons-material/Cloud";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { trimStr } from "./utils/navbarUtils";
import s from "./css/navbar.module.css";

const SelectorRow = styled(Box)(({ theme, disabled }) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "8px",
  transition: "all 0.3s ease",
  opacity: disabled ? 0.5 : 1,
  "&:last-child": {
    marginBottom: 0,
  },
}));

const IconContainer = styled(Box)(({ theme, active }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  borderRadius: "7px",
  background: active
    ? "linear-gradient(135deg, #6962ea 0%, #8b7ed8 100%)"
    : "rgba(105, 98, 234, 0.1)",
  color: active ? "#ffffff" : "#6962ea",
  transition: "all 0.3s ease",
  boxShadow: active ? "0 3px 10px rgba(105, 98, 234, 0.3)" : "none",
}));

const StyledSelect = styled(Select)(({ theme, hasvalue }) => ({
  flex: 1,
  fontSize: "13px",
  fontWeight: 500,
  letterSpacing: 0.3,
  minWidth: "120px",
  "& .MuiSelect-select": {
    paddingTop: "6px",
    paddingBottom: "6px",
    paddingLeft: "10px",
    paddingRight: "28px",
    borderRadius: "8px",
    background: hasvalue
      ? "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)"
      : "rgba(255,255,255,0.03)",
    transition: "all 0.3s ease",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderWidth: "1px",
    borderColor: "rgba(105, 98, 234, 0.2)",
    borderRadius: "8px",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "#6962ea",
    borderWidth: "1px",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#6962ea",
    borderWidth: "2px",
    boxShadow: "0 0 0 3px rgba(105, 98, 234, 0.1)",
  },
  "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(105, 98, 234, 0.1)",
  },
  "& .MuiSelect-icon": {
    color: "#6962ea",
    transition: "transform 0.3s ease",
  },
  "&.Mui-focused .MuiSelect-icon": {
    transform: "rotate(180deg)",
  },
  "&.Mui-disabled .MuiSelect-icon": {
    color: "rgba(105, 98, 234, 0.3)",
  },
}));

const GameDisplaySection = memo(
  ({
    game,
    selectedBranch,
    environment,
    latestBranches,
    allEnvironments,
    changeBranch,
    changeEnvironment,
    disableBranchButton,
  }) => {
    const isDisabled = disableBranchButton();
    const branchValue = selectedBranch?.includes("_")
      ? selectedBranch.split("_")[0]
      : selectedBranch || "";
    const envValue = environment || "";

    return (
      <Box className={s.gameDisplayContainer}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {/* Branch Selector */}
          <SelectorRow disabled={isDisabled || latestBranches.length === 0}>
            <IconContainer active={!!selectedBranch}>
              <AccountTreeIcon sx={{ fontSize: "14px" }} />
            </IconContainer>
            <FormControl sx={{ flex: 1 }}>
              <StyledSelect
                value={branchValue}
                size="small"
                disabled={isDisabled}
                onChange={(e) => changeBranch(e.target.value)}
                displayEmpty
                hasvalue={!!selectedBranch}
                IconComponent={KeyboardArrowDownIcon}
              >
                <MenuItem value="">
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", fontSize: "13px" }}
                  >
                    Select Branch
                  </Typography>
                </MenuItem>
                {latestBranches.map((b) => (
                  <MenuItem key={b?.branch} value={b?.branch}>
                    {b?.branch?.split("_")[0]}
                  </MenuItem>
                ))}
              </StyledSelect>
            </FormControl>
          </SelectorRow>

          {/* Environment Selector */}
          <SelectorRow disabled={isDisabled || allEnvironments.length === 0}>
            <IconContainer
              active={!!environment}
              sx={{
                background: environment
                  ? environment.toLowerCase() === "development"
                    ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                    : environment.toLowerCase() === "staging"
                      ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                      : environment.toLowerCase() === "production"
                        ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                        : "linear-gradient(135deg, #6962ea 0%, #8b7ed8 100%)"
                  : "rgba(105, 98, 234, 0.1)",
                color: environment ? "#ffffff" : "#6962ea",
              }}
            >
              <CloudIcon sx={{ fontSize: "14px" }} />
            </IconContainer>
            <FormControl sx={{ flex: 1 }}>
              <StyledSelect
                value={envValue}
                size="small"
                disabled={isDisabled}
                onChange={(e) => changeEnvironment(e.target.value)}
                displayEmpty
                hasvalue={!!environment}
                IconComponent={KeyboardArrowDownIcon}
              >
                <MenuItem value="">
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", fontSize: "13px" }}
                  >
                    Select Environment
                  </Typography>
                </MenuItem>
                {allEnvironments.map((e) => (
                  <MenuItem key={e} value={e}>
                    {e}
                  </MenuItem>
                ))}
              </StyledSelect>
            </FormControl>
          </SelectorRow>
        </Box>
      </Box>
    );
  }
);

GameDisplaySection.displayName = "GameDisplaySection";

export default GameDisplaySection;
