import React from 'react';
import { Box, Backdrop, CircularProgress } from '@mui/material';
import TestGraph from '../TestGraph';
import s from '../abtesting.module.css';

const TestChart = ({ testGraph, isLoading, testStartDate }) => {
  return (
    <Box sx={{ position: 'relative', flex: 1, height: "100%" }}>
      <Backdrop
        sx={{
          position: "absolute",
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
        open={isLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      
      <TestGraph 
        chartObj={testGraph} 
        testStartDate={testStartDate} 
      />
    </Box>
  );
};

export default React.memo(TestChart);