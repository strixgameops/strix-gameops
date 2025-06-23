import React, { useState, useRef } from 'react';
import { 
  Typography, 
  Input, 
  IconButton, 
  Button, 
  Tooltip,
  Modal,
  Box,
  Slider,
  Chip,
  Divider,
  Stack,
  Card,
  CardContent
} from '@mui/material';
import { 
  AccessTime as AccessTimeIcon, 
  Settings as SettingsIcon,
  RestartAlt,
  CheckCircle
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTestIndicators } from '../hooks/useTestIndicators';

const TestHeader = ({ 
  test, 
  onNameChange, 
  testGraph, 
  isArchived = false 
}) => {
  const [nameEditing, setNameEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const nameRef = useRef();
  const { indicatorSettings, setIndicatorSettings, getIndicatorColor, getIndicatorDescription } = useTestIndicators(test.id);

  const handleNameSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      setNameEditing(false);
    }
  };

  const getTestStartInfo = () => {
    if (!test.startDate) return null;
    const startDate = dayjs.utc(test.startDate);
    return {
      formattedDate: startDate.format("DD MMM YYYY, HH:mm"),
      daysPassed: dayjs.utc().diff(startDate, "day")
    };
  };

  const renderIndicators = () => {
    if (!testGraph.data || testGraph.data.length === 0) return null;
    
    const dataPoint = testGraph.data[testGraph.data.length - 1];
    const indicators = [
      { key: "pValue", label: "p-Value", value: dataPoint.pValue },
      { key: "zScore", label: "z-Score", value: dataPoint.zScore },
      { key: "confidenceInterval", label: "Confidence Interval", value: dataPoint.confidenceInterval?.join(" - ") },
      { key: "lift", label: "Lift", value: dataPoint.lift },
      { key: "power", label: "Power", value: dataPoint.power },
      { key: "smallSampleWarning", label: "Small Sample", value: dataPoint.smallSampleWarning }
    ];

    return indicators.map((ind) => (
      <Tooltip
        key={ind.key}
        title={getIndicatorDescription(ind.key, ind.value, ind.label, { expected: test.observedMetric?.expectation })}
        placement="top"
      >
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: getIndicatorColor(ind.key, ind.value, { expected: test.observedMetric?.expectation })
          }}
        />
      </Tooltip>
    ));
  };

  const renderResultChip = () => {
    if (!isArchived) return null;
    
    const isSuccess = test.archivedResult === "success";
    return (
      <div className={`resultChip ${isSuccess ? 'success' : 'failure'}`} style={{
        marginLeft: 'auto',
        marginRight: '2rem',
        borderRadius: '2rem',
        padding: '1px 15px',
        border: `1px solid ${isSuccess ? '#5ef05e' : '#f05e5e'}`,
        backgroundColor: isSuccess ? '#39a33083' : '#a3303083'
      }}>
        <Typography sx={{ fontSize: "16px" }}>
          {isSuccess ? 'Successful' : 'Failed'}
        </Typography>
      </div>
    );
  };

  const settingGroups = [
    {
      title: "Statistical Significance",
      items: [
        {
          key: "pValue",
          title: "p-Value Thresholds",
          fields: [
            { key: "green", label: "Excellent", color: "success.main", max: 1, step: 0.01 },
            { key: "orange", label: "Warning", color: "warning.main", max: 1, step: 0.01 }
          ]
        },
        {
          key: "zScore",
          title: "z-Score Threshold",
          fields: [
            { key: "threshold", label: "Threshold", color: "secondary.main", max: 5, step: 0.1 }
          ]
        },
        {
          key: "confidenceInterval",
          title: "Confidence Interval Boundary",
          fields: [
            { key: "boundary", label: "Boundary", color: "info.main", max: 10, step: 0.1, min: -10 }
          ]
        }
      ]
    },
    {
      title: "Effect Size & Quality",
      items: [
        {
          key: "lift",
          title: "Lift Thresholds",
          fields: [
            { key: "green", label: "Good Lift", color: "success.main", max: 3, step: 0.01, min: 0 },
            { key: "orange", label: "Poor Lift", color: "warning.main", max: 3, step: 0.01, min: 0 }
          ]
        },
        {
          key: "power",
          title: "Statistical Power",
          fields: [
            { key: "green", label: "High Power", color: "success.main", max: 1, step: 0.1, min: 0 },
            { key: "orange", label: "Low Power", color: "warning.main", max: 1, step: 0.1, min: 0 }
          ]
        }
      ]
    }
  ];

  const startInfo = getTestStartInfo();

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px' }}>
        {isArchived ? (
          <Typography sx={{ fontSize: "20px" }}>{test.name}</Typography>
        ) : (
          <Tooltip title="Test name that is displayed only on the website" placement="top">
            <Input
              ref={nameRef}
              value={test.name}
              onFocus={() => setNameEditing(true)}
              onBlur={handleNameSubmit}
              onKeyDown={handleNameSubmit}
              onChange={(e) => onNameChange(e.target.value)}
              sx={{
                fontSize: "20px",
                backgroundColor: nameEditing ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.0)",
                "& .MuiInputBase-input": { textAlign: "start", fontSize: "20px", width: "fit-content" },
                "&.MuiInputBase-root::before": { borderBottom: "none" },
                "&.MuiInputBase-root:hover::before": { borderBottom: "1px solid #6E758E" }
              }}
            />
          </Tooltip>
        )}

        {renderResultChip()}
        
        {!isArchived && (
          <div style={{ display: "flex", gap: "8px", marginLeft: "auto", marginRight: "0rem" }}>
            {renderIndicators()}
          </div>
        )}

        {startInfo && (
          <Tooltip title={`Test started: ${startInfo.formattedDate} | Days passed: ${startInfo.daysPassed}`}>
            <span>
              <IconButton disabled sx={{ pointerEvents: "auto", "&.Mui-disabled": { pointerEvents: "auto", cursor: "default" } }}>
                <AccessTimeIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {!isArchived && (
          <Button onClick={() => setSettingsOpen(true)} sx={{ ml: 1 }}>
            <SettingsIcon />
          </Button>
        )}
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <Box sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: '90vw', sm: 600 },
          maxWidth: 700,
          bgcolor: "background.paper",
          borderRadius: 2,
          maxHeight: "90vh",
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon />
              Indicator Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure thresholds for A/B test analysis
            </Typography>
          </Box>

          {/* Content */}
          <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
            <Stack spacing={3}>
              {settingGroups.map((group, groupIndex) => (
                <Box key={groupIndex}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    {group.title}
                  </Typography>
                  <Stack spacing={2}>
                    {group.items.map((setting, settingIndex) => (
                      <Card key={settingIndex} variant="outlined">
                        <CardContent sx={{ pb: 2 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            {setting.title}
                          </Typography>
                          
                          <Stack spacing={2}>
                            {setting.fields.map((field, fieldIndex) => (
                              <Box key={fieldIndex}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                  <Chip 
                                    size="small" 
                                    label={field.label}
                                    color={field.color.includes('success') ? 'success' : field.color.includes('warning') ? 'warning' : 'default'}
                                    variant="outlined"
                                  />
                                  <Typography variant="body2" color="text.secondary">
                                    {indicatorSettings[setting.key][field.key]}
                                  </Typography>
                                </Box>
                                
                                <Slider
                                  value={indicatorSettings[setting.key][field.key]}
                                  onChange={(e, value) => setIndicatorSettings(prev => ({
                                    ...prev,
                                    [setting.key]: {
                                      ...prev[setting.key],
                                      [field.key]: value
                                    }
                                  }))}
                                  min={field.min || 0}
                                  max={field.max}
                                  step={field.step}
                                  valueLabelDisplay="auto"
                                  size="small"
                                />
                              </Box>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Footer */}
          <Divider />
          <Box sx={{ p: 2, display: 'flex', gap: 2, justifyContent: 'space-between' }}>
            <Button 
              startIcon={<RestartAlt />}
              onClick={() => {
                setIndicatorSettings({
                  pValue: { green: 0.05, orange: 0.1 },
                  adjustedPValue: { green: 0.05, orange: 0.1 },
                  zScore: { threshold: 1.96 },
                  lift: { green: 1.05, orange: 0.95 },
                  power: { green: 0.8, orange: 0.5 },
                  confidenceInterval: { boundary: 0 }
                });
              }}
              color="inherit"
              size="small"
            >
              Reset
            </Button>
            
            <Button 
              variant="contained" 
              startIcon={<CheckCircle />}
              onClick={() => setSettingsOpen(false)}
              size="small"
            >
              Save Settings
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default TestHeader;