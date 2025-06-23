import React, { useState, memo } from "react";
import { styled } from "@mui/material/styles";
import MuiListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { useTheme } from "@mui/material/styles";
import { openPage } from "./utils/navbarUtils";
import PublicIcon from '@mui/icons-material/Public';


const ListItemButton = styled(MuiListItemButton)(({ isopened }) => ({
  height: "45px",
  backgroundColor: "rgba(0, 0, 0, 0)",
  "&:hover": {
    backgroundColor: "#6962ea",
  },
  ...(isopened && {
    backgroundColor: "#7f7bca",
    "&:hover": {
      backgroundColor: "#6962ea",
    },
  }),
}));

const OverviewButton = memo(
  ({ disabled, currentOpenedPage, setOpenedPage, navigate }) => {
    const [hovered, setHovered] = useState(false);
    const theme = useTheme();
    const isActive = currentOpenedPage === "/overview";

    const handleClick = (e) => {
      openPage(e, "/overview", navigate, setOpenedPage);
    };

    return (
      <ListItemButton
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        variant={isActive ? "contained" : "text"}
        isopened={isActive}
        onClick={handleClick}
        onMouseDown={handleClick}
        disabled={disabled}
        sx={{
          textTransform: "none",
          width: "100%",
          justifyContent: "start",
          textAlign: "start",
          pl: "1rem",
          color: hovered || isActive ? "#e7e7e7" : theme.palette.text.primary,
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: "40px",
            color: hovered || isActive ? "#e7e7e7" : "#5754c2",
          }}
        >
          <PublicIcon />
        </ListItemIcon>
        <ListItemText primary="Global View" />
      </ListItemButton>
    );
  }
);

OverviewButton.displayName = "OverviewButton";

export default OverviewButton;
