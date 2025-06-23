import React, { memo } from "react";
import Typography from "@mui/material/Typography";
import ListItemIcon from "@mui/material/ListItemIcon";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

const CategoryButton = memo(({ 
  icon, 
  name
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        height: "48px",
        width: "100%",
        pl: "1rem",
        pr: "1rem",
        mb: "8px",
        background: "linear-gradient(135deg, rgba(121, 116, 202, 0.08) 0%, rgba(105, 98, 234, 0.05) 100%)",
        borderRadius: "12px",
        border: "1px solid rgba(87, 84, 194, 0.12)",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(231, 231, 231, 0.3) 50%, transparent 100%)",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "3px",
          height: "100%",
          background: "linear-gradient(180deg, #6962ea 0%, #5754c2 100%)",
          borderRadius: "0 2px 2px 0",
        }
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: "32px",
          mr: "12px",
          color: "#6962ea",
          "& .MuiSvgIcon-root": {
            fontSize: "20px",
            filter: "drop-shadow(0 2px 4px rgba(105, 98, 234, 0.2))",
          }
        }}
      >
        {icon}
      </ListItemIcon>
      
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          fontSize: "14px",
          letterSpacing: "0.025em",
          color: theme.palette.text.primary,
          textTransform: "uppercase",
          background: "linear-gradient(135deg, #6962ea 0%, #5754c2 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: "-2px",
            left: 0,
            right: 0,
            height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(105, 98, 234, 0.4) 50%, transparent 100%)",
          }
        }}
      >
        {name}
      </Typography>
    </Box>
  );
});

CategoryButton.displayName = "CategoryButton";

export default CategoryButton;