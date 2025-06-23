import React, { useState, memo } from "react";
import Button from "@mui/material/Button";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { useTheme } from "@mui/material/styles";
import { openPage } from "./utils/navbarUtils";

const NavbarButton = memo(({ 
  padding = 1.6, 
  disabled, 
  icon, 
  pageLink, 
  name, 
  currentOpenedPage,
  setOpenedPage,
  navigate 
}) => {
  const [hovered, setHovered] = useState(false);
  const theme = useTheme();
  const isActive = currentOpenedPage === pageLink;

  const handleClick = (e) => {
    openPage(e, pageLink, navigate, setOpenedPage);
  };

  return (
    <Button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      variant={isActive ? "contained" : "text"}
      onMouseDown={handleClick}
      disabled={disabled}
      sx={{
        height: "45px",
        textTransform: "none",
        width: "90%",
        justifyContent: "start",
        textAlign: "start",
        pl: padding,
        mr: "2rem",
        backgroundColor: isActive ? "#a3a1d7" : "rgba(0, 0, 0, 0)",
        color: hovered || isActive ? "#e7e7e7" : theme.palette.text.primary,
        borderTopLeftRadius: isActive ? 0 : undefined,
        borderBottomLeftRadius: isActive ? 0 : undefined,
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          backgroundColor: "#6962ea",
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: "24px",
          mr: "8px",
          width: "24px",
          color: hovered || isActive ? "#e7e7e7" : "#5754c2",
          transition: "color 0.2s ease-in-out",
        }}
      >
        {icon}
      </ListItemIcon>
      <ListItemText primary={name} />
    </Button>
  );
});

NavbarButton.displayName = "NavbarButton";

export default NavbarButton;