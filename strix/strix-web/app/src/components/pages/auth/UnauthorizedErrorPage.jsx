import React from "react";
import { Typography, Box } from "@mui/material";

function UnauthorizedErrorPage() {
  const style = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  };
  return (
    <Box sx={style}>
      <Typography variant={"h5"} sx={{pb: 5}}>Unauthorized access!</Typography>
      <Typography>
        Looks like you have no access to the requested resource. Contact the
        tech support if you believe that is an error.
      </Typography>
    </Box>
  );
}

export default UnauthorizedErrorPage;
