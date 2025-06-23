import React from 'react';
import { Box, Button, Typography, Tooltip } from '@mui/material';

const TestControls = ({ 
  test, 
  isValid, 
  errors, 
  onStart, 
  onPause, 
  onStop, 
  onDelete,
  isDeleting 
}) => {
  if (test.archived) {
    return (
      <Box sx={{ display: "flex", width: "100%", alignItems: "center", p: 2 }}>
        <Button variant="outlined" sx={{ width: "100px" }} onClick={() => onDelete(test.id)}>
          Delete
        </Button>
      </Box>
    );
  }

  if (test.startDate) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2 }}>
        <Button
          variant={test.paused ? "contained" : "outlined"}
          sx={{ width: "100px" }}
          onClick={() => onPause(test.id)}
        >
          {test.paused ? "Resume" : "Pause"}
        </Button>
        <Button variant="outlined" sx={{ width: "100px" }} onClick={() => onStop(test.id)}>
          Stop
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", width: "100%", alignItems: "center", p: 2 }}>
      <Button
        variant="contained"
        disabled={!isValid}
        sx={{ width: "100px", mr: 3 }}
        onClick={() => onStart(test.id)}
      >
        Start
      </Button>
      
      <Tooltip title={errors.length > 0 ? errors.join(", ") : "No errors found"}>
        <Typography sx={{ fontSize: 14 }} color="error">
          Fill all fields to start
        </Typography>
      </Tooltip>

      <Button
        variant="outlined"
        sx={{ width: "100px", ml: "auto" }}
        onClick={() => onDelete(test.id)}
        disabled={isDeleting}
      >
        Delete
      </Button>
    </Box>
  );
};

export default TestControls;