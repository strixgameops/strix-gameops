import React from 'react';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Button,
  Switch,
  Tooltip
} from '@mui/material';
import { Close as CloseIcon, Edit as EditIcon, FileCopy as FileCopyIcon } from '@mui/icons-material';
import DatePicker from 'shared/datePicker/DatePickerWidget';

const CupedModal = ({
  open,
  onClose,
  test,
  selectedMetricIndex,
  onMetricChange,
  getAnalyticsEventName,
  getAnalyticsEventValueName,
  onEditMetric
}) => {
  const currentMetric = test.observedMetric?.[selectedMetricIndex];
  
  const hasCupedMetric = () => {
    return currentMetric?.cupedMetric?.queryAnalyticEventID;
  };

  const getCupedMetricName = () => {
    const metric = currentMetric?.cupedMetric;
    if (!metric?.queryAnalyticEventID) return "No CUPED Metric";
    
    const eventName = getAnalyticsEventName(metric.queryAnalyticEventID) || "New Metric";
    const valueName = getAnalyticsEventValueName(metric.queryAnalyticEventID, metric.queryEventTargetValueId);
    return `${eventName}${valueName ? ": " + valueName : ""}`;
  };

  const copyMetricToCuped = () => {
    if (!currentMetric?.metric?.queryAnalyticEventID) return;
    
    const updatedMetrics = [...test.observedMetric];
    updatedMetrics[selectedMetricIndex].cupedMetric = { ...currentMetric.metric };
    onMetricChange(updatedMetrics);
  };

  const handleCupedToggle = (enabled) => {
    const updatedMetrics = [...test.observedMetric];
    updatedMetrics[selectedMetricIndex].cupedState = enabled;
    onMetricChange(updatedMetrics);
  };

  const handleDateChange = (dates) => {
    const updatedMetrics = [...test.observedMetric];
    updatedMetrics[selectedMetricIndex].cupedDateStart = dates[0];
    updatedMetrics[selectedMetricIndex].cupedDateEnd = dates[1];
    onMetricChange(updatedMetrics);
  };

  if (!currentMetric) {
    return (
      <Modal open={open} onClose={onClose}>
        <Box sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: "1rem"
        }}>
          <Typography>Please select a metric first to configure CUPED settings.</Typography>
        </Box>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 500,
        bgcolor: "background.paper",
        boxShadow: 24,
        p: 4,
        borderRadius: "1rem"
      }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6">CUPED Settings</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Current CUPED Metric</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body1">{getCupedMetricName()}</Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => onEditMetric(selectedMetricIndex, "cuped")}
              startIcon={<EditIcon />}
            >
              Edit
            </Button>
            <Tooltip title="Copy the current metric settings to use as the CUPED metric">
              <Button
                variant="outlined"
                size="small"
                onClick={copyMetricToCuped}
                startIcon={<FileCopyIcon />}
              >
                Copy from Metric
              </Button>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>CUPED Date Range</Typography>
          <DatePicker
            value={[currentMetric.cupedDateStart, currentMetric.cupedDateEnd]}
            onStateChange={handleDateChange}
            disabled={!hasCupedMetric()}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="subtitle1">Enable CUPED</Typography>
          <Switch
            checked={currentMetric.cupedState || false}
            onChange={(e) => handleCupedToggle(e.target.checked)}
          />
        </Box>

        <Box sx={{ p: 2, bgcolor: "rgba(25, 118, 210, 0.08)", borderRadius: 1, mb: 3 }}>
          <Typography variant="body2">
            CUPED allows you to select another metric that will help to suppress noise in your main metric and make the results clearer. To make it work:
            <br/><br/>
            1. Set a correlating metric (the more correlation - the better).
            <br/>
            2. It must not be affected directly by the experiment.
            <br/><br/>
            It is possible to use the same metric as in the experiment, but from the past (before the A/B test). If you do so, make sure to pick the right date.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" onClick={onClose}>Close</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default React.memo(CupedModal);