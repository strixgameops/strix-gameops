import React from "react";
import { Box, Typography } from "@mui/material";
import PersonAddDisabledIcon from "@mui/icons-material/PersonAddDisabled";
function LockPlaceholder() {
  return (
    <Box
      sx={{
        position: "absolute",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.7)",
        zIndex: 10000,

        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <PersonAddDisabledIcon htmlColor="#cbcbcb" sx={{ fontSize: 120 }} />
        <Typography
          variant="h5"
          sx={{ color: "#e7e7e7", fontWeight: "500", textAlign: "center" }}
        >
          Seems like someone is already working in that page...
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: "#cbcbcb",
            fontWeight: "400",
            width: "60%",
            textAlign: "center",
          }}
        >
          We are still working on collaboration feature.
          <br />
          But for now we disabled ability to edit on the same page to prevent
          overlaps and misconfigurations
        </Typography>
      </Box>
    </Box>
  );
}

export default LockPlaceholder;
