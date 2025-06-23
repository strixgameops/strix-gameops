import React, { useMemo, useCallback } from "react";
import { Button, Tooltip, Box } from "@mui/material";
import { Description as DescriptionIcon } from "@mui/icons-material";
import { useLocation } from "react-router-dom";
import docs from "./pageDocumentations.js";
import { styled } from "@mui/material/styles";

const IconContainer = styled(Box)(({
  theme,
  color = "primary",
  size = "medium",
}) => {
  const colors = {
    primary: "#6f63ff",
    success: "#22c55e",
    error: "#ef4444",
    warning: "#f59e0b",
  };

  const sizes = {
    small: { width: "36px", height: "36px", fontSize: "18px" },
    medium: { width: "44px", height: "44px", fontSize: "22px" },
    large: { width: "52px", height: "52px", fontSize: "26px" },
  };

  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...sizes[size],
    borderRadius: "12px",
    background: `${colors[color]}15`,
    color: colors[color],
    border: `2px solid ${colors[color]}30`,
    transition: "all 0.3s ease",
    cursor: "pointer",
    "&:hover": {
      background: colors[color],
      color: "#ffffff",
      transform: "scale(1.1)",
      boxShadow: `0 8px 25px ${colors[color]}40`,
    },
  };
});
const LANDING_PAGE = "https://strixgameops.com";

const DocumentationButton = () => {
  const location = useLocation();

  const docsAvailable = useMemo(() => {
    return Boolean(docs[location.pathname]);
  }, [location.pathname]);

  const handleDocsClick = useCallback(() => {
    const docsPath = docs[location.pathname];
    if (docsPath) {
      window.open(LANDING_PAGE + docsPath, "_blank", "noopener,noreferrer");
    }
  }, [location.pathname]);

  return (
    <Tooltip
      title={`View docs for this page${docsAvailable ? "" : ` (Unavailable)`}`}
      disableInteractive
    >
      <Box sx={{ position: "relative" }}>
        <IconContainer
          disabled={!docsAvailable}
          color={docsAvailable ? "primary" : "secondary"}
          size="small"
          onClick={handleDocsClick}
          sx={{
            mr: 2,
          }}
        >
          <DescriptionIcon
            sx={(theme) => ({
              fontSize: 24,
              color: docsAvailable ? theme.palette.primary : "grey",
            })}
          />
        </IconContainer>
      </Box>
    </Tooltip>
  );
};

export default React.memo(DocumentationButton);
