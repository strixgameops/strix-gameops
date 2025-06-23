import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Tooltip, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Modal
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Science as ScienceIcon,
  ExpandMore as ExpandMoreIcon 
} from '@mui/icons-material';
import AnalyticsEventSearcher from 'shared/analyticsEventsModal/ModalEventSearcher';
import CupedModal from './CupedModal';

const TestMetrics = ({ 
  test, 
  selectedMetricIndex, 
  onMetricIndexChange, 
  onMetricChange,
  allAnalyticsEvents,
  offersNames,
  entityCurrencies
}) => {
  const [metricMenuAnchor, setMetricMenuAnchor] = useState(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const [currentMetricIndex, setCurrentMetricIndex] = useState(null);
  const [eventSearchModal, setEventSearchModal] = useState(false);
  const [cupedModal, setCupedModal] = useState(false);
  const [editingMetricType, setEditingMetricType] = useState('regular');

  const maxVisible = 2;
  const visibleMetrics = test.observedMetric ? test.observedMetric.slice(0, maxVisible) : [];
  const hiddenMetrics = test.observedMetric ? test.observedMetric.slice(maxVisible) : [];

  const getMetricDisplayName = (metric) => {
    if (!metric || !metric.queryAnalyticEventID) return "New Metric";
    
    const eventName = getAnalyticsEventName(metric.queryAnalyticEventID) || "New Metric";
    const valueName = getAnalyticsEventValueName(metric.queryAnalyticEventID, metric.queryEventTargetValueId);
    return `${eventName}${valueName ? ": " + valueName : ""}`;
  };

  const getAnalyticsEventName = (eventID) => {
    return allAnalyticsEvents.find(e => e.eventID === eventID)?.eventName || "";
  };

  const getAnalyticsEventValueName = (eventID, valueID) => {
    const event = allAnalyticsEvents.find(e => e.eventID === eventID);
    return event?.values?.find(v => v.uniqueID === valueID)?.valueName || "";
  };

  const hasCupedMetric = (metric) => {
    return metric.cupedState === true && 
           metric.cupedMetric && 
           metric.cupedMetric.queryAnalyticEventID;
  };

  const handleMetricMenuOpen = (event, index) => {
    event.preventDefault();
    setMetricMenuAnchor(event.currentTarget);
    setCurrentMetricIndex(index);
  };

  const handleEditMetric = (index, type) => {
    setEditingMetricType(type);
    
    if (type === "cuped" && (!test.observedMetric[index].cupedMetric || !test.observedMetric[index].cupedMetric.queryMethod)) {
      const updatedMetrics = [...test.observedMetric];
      if (!updatedMetrics[index].cupedMetric) {
        updatedMetrics[index].cupedMetric = {
          queryAnalyticEventID: "",
          queryEventTargetValueId: "",
          queryMethod: ""
        };
        onMetricChange(updatedMetrics);
      }
    }
    
    setEventSearchModal(index);
    setMetricMenuAnchor(null);
  };

  const addMetric = () => {
    const updatedMetrics = [
      ...test.observedMetric,
      {
        metric: {
          queryAnalyticEventID: "",
          queryEventTargetValueId: "",
          queryMethod: ""
        },
        cupedMetric: {
          queryAnalyticEventID: "",
          queryEventTargetValueId: "",
          queryMethod: ""
        },
        cupedState: false,
        cupedDateStart: "",
        cupedDateEnd: ""
      }
    ];
    onMetricChange(updatedMetrics);
  };

  const removeMetric = (index) => {
    const updatedMetrics = [...test.observedMetric];
    updatedMetrics.splice(index, 1);
    onMetricChange(updatedMetrics);
    setMetricMenuAnchor(null);
  };

  const onObservedEventAdded = (event) => {
    const updatedMetrics = [...test.observedMetric];
    
    if (editingMetricType === "regular") {
      updatedMetrics[eventSearchModal].metric = event;
    } else {
      if (!updatedMetrics[eventSearchModal].cupedMetric) {
        updatedMetrics[eventSearchModal].cupedMetric = {};
      }
      updatedMetrics[eventSearchModal].cupedMetric = event;
    }
    
    onMetricChange(updatedMetrics);
    setEventSearchModal(false);
  };

  return (
    <>
      <Box sx={{ p: 2, pb: 0, position: "absolute", zIndex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          {visibleMetrics.map((metric, index) => (
            <Box key={index} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Tooltip title="Right click to open context menu">
                <Button
                  onClick={() => onMetricIndexChange(index)}
                  variant={selectedMetricIndex === index ? "contained" : "outlined"}
                  sx={{ height: "35px", textTransform: "none" }}
                  onContextMenu={(e) => handleMetricMenuOpen(e, index)}
                >
                  {getMetricDisplayName(metric.metric)}
                  {hasCupedMetric(metric) && (
                    <Tooltip title="CUPED adjusting is performed for this metric">
                      <ScienceIcon sx={{ ml: 1, fontSize: "18px" }} />
                    </Tooltip>
                  )}
                </Button>
              </Tooltip>
            </Box>
          ))}

          {hiddenMetrics.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Button
                onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
                variant="outlined"
                endIcon={<ExpandMoreIcon />}
                sx={{ height: "35px", textTransform: "none" }}
              >
                +{hiddenMetrics.length} metrics
              </Button>
              <Menu
                anchorEl={moreMenuAnchor}
                open={Boolean(moreMenuAnchor)}
                onClose={() => setMoreMenuAnchor(null)}
              >
                {hiddenMetrics.map((metric, idx) => {
                  const actualIndex = idx + maxVisible;
                  return (
                    <MenuItem
                      key={actualIndex}
                      onClick={() => onMetricIndexChange(actualIndex)}
                      selected={selectedMetricIndex === actualIndex}
                      onContextMenu={(e) => handleMetricMenuOpen(e, actualIndex)}
                    >
                      {getMetricDisplayName(metric.metric)}
                      {hasCupedMetric(metric) && <ScienceIcon sx={{ ml: 1, fontSize: "18px" }} />}
                    </MenuItem>
                  );
                })}
              </Menu>
            </Box>
          )}

          <Button
            onClick={addMetric}
            variant="text"
            sx={{ height: "35px", textTransform: "none", mb: 1 }}
          >
            + Add Metric
          </Button>
        </Box>
      </Box>

      <Menu
        anchorEl={metricMenuAnchor}
        open={Boolean(metricMenuAnchor)}
        onClose={() => setMetricMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleEditMetric(currentMetricIndex, "regular")}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit metric</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setCupedModal(true);
          onMetricIndexChange(currentMetricIndex);
          setMetricMenuAnchor(null);
        }}>
          <ListItemIcon><ScienceIcon fontSize="small" /></ListItemIcon>
          <ListItemText>CUPED Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => removeMetric(currentMetricIndex)}>
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Modal open={eventSearchModal !== false} onClose={() => setEventSearchModal(false)}>
        <div>
          <AnalyticsEventSearcher
            changeEvent={onObservedEventAdded}
            eventToEdit={
              eventSearchModal !== false && test.observedMetric[eventSearchModal]
                ? editingMetricType === "regular" 
                  ? { target: test.observedMetric[eventSearchModal].metric }
                  : { target: test.observedMetric[eventSearchModal].cupedMetric }
                : undefined
            }
            onApply={onObservedEventAdded}
            allAnalyticsEvents={allAnalyticsEvents}
            allOffersNames={offersNames}
            allCurrenciesNames={entityCurrencies}
            forbiddenCountingMethods={[
              "summForTime", "numberOfEventsForTime", "meanForTime", 
              "mostRecent", "leastCommon", "mostCommon", "firstReceived", 
              "dateOfFirst", "dateOfLast"
            ]}
          />
        </div>
      </Modal>

      <CupedModal
        open={cupedModal}
        onClose={() => setCupedModal(false)}
        test={test}
        selectedMetricIndex={selectedMetricIndex}
        onMetricChange={onMetricChange}
        getAnalyticsEventName={getAnalyticsEventName}
        getAnalyticsEventValueName={getAnalyticsEventValueName}
        onEditMetric={handleEditMetric}
      />
    </>
  );
};

export default React.memo(TestMetrics);