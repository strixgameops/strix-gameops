import React from 'react';
import {
  Typography,
  Box,
  CardContent,
  Grid,
  Slide,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  AccordionSummary,
  AccordionDetails,
  Fade,
  Button,
  Divider
} from '@mui/material';
import { Bar, Line } from 'react-chartjs-2';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TimelineIcon from '@mui/icons-material/Timeline';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import InsightsIcon from '@mui/icons-material/Insights';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import {
  GradientCard,
  IconContainer,
  MetricCard,
  ChartContainer,
  FeatureChip,
  StyledAccordion
} from './ComponentsStyle';

const ChurnEventAnalysis = ({ 
  eventAnalytics, 
  eventDistributions, 
  selectedEvent, 
  setSelectedEvent, 
  theme 
}) => {
  const events = Object.keys(eventAnalytics);

  const createDistributionChart = (distribution, prop) => {
    if (distribution.type === 'numeric') {
      return {
        labels: distribution.buckets.map(b => b.range),
        datasets: [
          {
            label: 'Converted',
            data: distribution.buckets.map(b => b.converted),
            backgroundColor: '#22c55e80',
            borderColor: '#22c55e',
            borderWidth: 2,
            borderRadius: 6,
          },
          {
            label: 'Churned',
            data: distribution.buckets.map(b => b.churned),
            backgroundColor: '#ef444480',
            borderColor: '#ef4444',
            borderWidth: 2,
            borderRadius: 6,
          }
        ]
      };
    } else {
      return {
        labels: distribution.categories.map(c => c.value),
        datasets: [
          {
            label: 'Conversion Rate %',
            data: distribution.categories.map(c => c.conversionRate),
            backgroundColor: distribution.categories.map(c => 
              c.conversionRate > 50 ? '#22c55e80' : '#ef444480'
            ),
            borderColor: distribution.categories.map(c => 
              c.conversionRate > 50 ? '#22c55e' : '#ef4444'
            ),
            borderWidth: 2,
            borderRadius: 6,
          }
        ]
      };
    }
  };

  const createTimeDistributionChart = (timeAnalysis) => {
    if (!timeAnalysis || (!timeAnalysis.converted.timeDistribution.length && !timeAnalysis.churned.timeDistribution.length)) {
      return null;
    }

    // Create histogram buckets for time distribution
    const allTimes = [...timeAnalysis.converted.timeDistribution, ...timeAnalysis.churned.timeDistribution];
    if (allTimes.length === 0) return null;

    const min = Math.min(...allTimes);
    const max = Math.max(...allTimes);
    const bucketCount = Math.min(10, Math.ceil(Math.sqrt(allTimes.length)));
    const bucketSize = (max - min) / bucketCount || 1;

    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      range: `${Math.round(min + i * bucketSize)}-${Math.round(min + (i + 1) * bucketSize)}s`,
      converted: 0,
      churned: 0
    }));

    timeAnalysis.converted.timeDistribution.forEach(time => {
      const bucketIndex = Math.min(bucketCount - 1, Math.floor((time - min) / bucketSize));
      buckets[bucketIndex].converted++;
    });

    timeAnalysis.churned.timeDistribution.forEach(time => {
      const bucketIndex = Math.min(bucketCount - 1, Math.floor((time - min) / bucketSize));
      buckets[bucketIndex].churned++;
    });

    return {
      labels: buckets.map(b => b.range),
      datasets: [
        {
          label: 'Converted Users',
          data: buckets.map(b => b.converted),
          backgroundColor: '#22c55e80',
          borderColor: '#22c55e',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Churned Users',
          data: buckets.map(b => b.churned),
          backgroundColor: '#ef444480',
          borderColor: '#ef4444',
          borderWidth: 2,
          borderRadius: 6,
        }
      ]
    };
  };

  const getChartOptions = (prop, isNumeric) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { 
          color: '#1f2937',
          font: { family: 'Inter, sans-serif', weight: 600 }
        }
      }
    },
    scales: {
      x: { 
        title: { display: true, text: prop, color: '#1f2937' },
        ticks: { color: '#374151' },
        grid: { color: '#e5e7eb' }
      },
      y: { 
        title: { 
          display: true, 
          text: isNumeric ? 'Count' : 'Conversion Rate %', 
          color: '#1f2937' 
        },
        max: isNumeric ? undefined : 100,
        ticks: { color: '#374151' },
        grid: { color: '#e5e7eb' }
      }
    }
  });

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <Fade in={true} timeout={600}>
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#1f2937', fontWeight: 700 }}>
            Event-Specific Analysis with Time Metrics
          </Typography>
          <Typography variant="body1" sx={{ color: '#4b5563', fontWeight: 500 }}>
            Click on any event card to see detailed property analysis, value distributions, and timing patterns
          </Typography>
        </Box>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {events.map(eventId => {
            const stats = eventAnalytics[eventId];
            const distribution = eventDistributions[eventId];
            const timeAnalysis = stats.timeAnalysis;
            const isSelected = selectedEvent === eventId;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={eventId}>
                <Slide direction="up" in={true} timeout={300 + events.indexOf(eventId) * 100}>
                  <GradientCard 
                    clickable={true}
                    sx={{ 
                      cursor: 'pointer',
                      border: isSelected 
                        ? `3px solid ${theme.palette.primary.main}` 
                        : '2px solid #e2e8f0',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: isSelected 
                        ? `0 12px 40px ${theme.palette.primary.main}30` 
                        : '0 4px 20px rgba(0, 0, 0, 0.08)',
                      background: isSelected 
                        ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                        : '#ffffff',
                      position: 'relative',
                      '&::before': isSelected ? {
                        content: '"✓ SELECTED"',
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: theme.palette.primary.main,
                        color: '#ffffff',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        zIndex: 1,
                      } : {},
                      '&::after': !isSelected ? {
                        content: '"Click to analyze"',
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: '#f1f5f9',
                        color: '#64748b',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        opacity: 0,
                        transition: 'opacity 0.2s ease',
                      } : {},
                      '&:hover::after': !isSelected ? {
                        opacity: 1,
                      } : {},
                    }}
                    onClick={() => setSelectedEvent(isSelected ? null : eventId)}
                  >
                    <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <IconContainer 
                          color={stats.conversionRate > 50 ? 'success' : 'error'} 
                          size="medium" 
                          sx={{ mr: 2 }}
                        >
                          <TimelineIcon />
                        </IconContainer>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                          {stats.eventName}
                        </Typography>
                      </Box>
                      
                      <Typography 
                        variant="h3" 
                        sx={{ 
                          color: stats.conversionRate > 50 ? '#22c55e' : '#ef4444',
                          fontWeight: 800,
                          mb: 2 
                        }}
                      >
                        {stats.conversionRate.toFixed(1)}%
                      </Typography>
                      
                      <Typography variant="body1" sx={{ color: '#374151', mb: 2, fontWeight: 500 }}>
                        {stats.convertedCount} converted • {stats.churnedCount} churned
                      </Typography>

                      {/* Time Metrics Preview */}
                      {timeAnalysis && (timeAnalysis.converted.avgTimeToReach > 0 || timeAnalysis.churned.avgTimeToReach > 0) && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 600, mb: 1 }}>
                            Avg Time to Reach:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <FeatureChip 
                              label={`Converted: ${formatTime(timeAnalysis.converted.avgTimeToReach)}`}
                              impact="medium"
                              size="small"
                            />
                            <FeatureChip 
                              label={`Churned: ${formatTime(timeAnalysis.churned.avgTimeToReach)}`}
                              impact="high"
                              size="small"
                            />
                          </Box>
                        </Box>
                      )}
                      
                      {distribution && (
                        <FeatureChip 
                          label={`${distribution.totalInstances} instances analyzed`}
                          impact="low"
                          size="small"
                        />
                      )}
                    </CardContent>
                  </GradientCard>
                </Slide>
              </Grid>
            );
          })}
        </Grid>

        {selectedEvent && eventAnalytics[selectedEvent] && (
          <Slide direction="up" in={true} timeout={500}>
            <GradientCard sx={{ 
              border: `3px solid ${theme.palette.primary.main}60`,
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconContainer color="primary" size="large" sx={{ mr: 3 }}>
                      <AutoGraphIcon />
                    </IconContainer>
                    <Box>
                      <Typography variant="h5" sx={{ color: '#1f2937', fontWeight: 700 }}>
                        {eventAnalytics[selectedEvent].eventName}
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#4b5563', fontWeight: 500 }}>
                        Detailed Property & Time Analysis
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={() => setSelectedEvent(null)}
                    sx={{
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      '&:hover': {
                        background: `${theme.palette.primary.main}10`,
                        borderColor: theme.palette.primary.main,
                      }
                    }}
                  >
                    Close Analysis
                  </Button>
                </Box>

                {/* Time Analysis Section */}
                {eventAnalytics[selectedEvent].timeAnalysis && (
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <IconContainer color="warning" size="medium" sx={{ mr: 2 }}>
                        <AccessTimeIcon />
                      </IconContainer>
                      <Box>
                        <Typography variant="h6" sx={{ color: '#1f2937', fontWeight: 700 }}>
                          Timing Analysis
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#4b5563', fontWeight: 500 }}>
                          Time patterns for converted vs churned users
                        </Typography>
                      </Box>
                    </Box>

                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      <Grid item xs={12} md={6}>
                        <MetricCard highlight={Math.abs(eventAnalytics[selectedEvent].timeAnalysis.timeImpact.avgTimeToReachDiff) > 60}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <IconContainer color="success" size="small" sx={{ mr: 2 }}>
                              <SpeedIcon />
                            </IconContainer>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1f2937' }}>
                              Average Time to Reach Event
                            </Typography>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 600 }}>
                                Converted Users
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 700 }}>
                                {formatTime(eventAnalytics[selectedEvent].timeAnalysis.converted.avgTimeToReach)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 600 }}>
                                Churned Users
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 700 }}>
                                {formatTime(eventAnalytics[selectedEvent].timeAnalysis.churned.avgTimeToReach)}
                              </Typography>
                            </Grid>
                          </Grid>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="body1" sx={{ color: '#374151', fontWeight: 600 }}>
                            Time Impact: 
                            <Typography 
                              component="span" 
                              sx={{ 
                                color: eventAnalytics[selectedEvent].timeAnalysis.timeImpact.avgTimeToReachDiff > 0 ? '#ef4444' : '#22c55e',
                                fontWeight: 700,
                                ml: 1
                              }}
                            >
                              {eventAnalytics[selectedEvent].timeAnalysis.timeImpact.avgTimeToReachDiff > 0 ? '+' : ''}
                              {formatTime(Math.abs(eventAnalytics[selectedEvent].timeAnalysis.timeImpact.avgTimeToReachDiff))}
                            </Typography>
                          </Typography>
                        </MetricCard>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <MetricCard highlight={Math.abs(eventAnalytics[selectedEvent].timeAnalysis.timeImpact.avgTimeBetweenEventsDiff) > 30}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <IconContainer color="warning" size="small" sx={{ mr: 2 }}>
                              <AccessTimeIcon />
                            </IconContainer>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1f2937' }}>
                              Average Time Between Events
                            </Typography>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 600 }}>
                                Converted Users
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 700 }}>
                                {formatTime(eventAnalytics[selectedEvent].timeAnalysis.converted.avgTimeBetweenEvents)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 600 }}>
                                Churned Users
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 700 }}>
                                {formatTime(eventAnalytics[selectedEvent].timeAnalysis.churned.avgTimeBetweenEvents)}
                              </Typography>
                            </Grid>
                          </Grid>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="body1" sx={{ color: '#374151', fontWeight: 600 }}>
                            Pace Impact: 
                            <Typography 
                              component="span" 
                              sx={{ 
                                color: eventAnalytics[selectedEvent].timeAnalysis.timeImpact.avgTimeBetweenEventsDiff > 0 ? '#ef4444' : '#22c55e',
                                fontWeight: 700,
                                ml: 1
                              }}
                            >
                              {eventAnalytics[selectedEvent].timeAnalysis.timeImpact.avgTimeBetweenEventsDiff > 0 ? '+' : ''}
                              {formatTime(Math.abs(eventAnalytics[selectedEvent].timeAnalysis.timeImpact.avgTimeBetweenEventsDiff))}
                            </Typography>
                          </Typography>
                        </MetricCard>
                      </Grid>
                    </Grid>

                    {/* Time Distribution Chart */}
                    {createTimeDistributionChart(eventAnalytics[selectedEvent].timeAnalysis) && (
                      <ChartContainer sx={{ height: 450, mb: 4 }}>
                        <Typography variant="h6" sx={{ mb: 2, color: '#1f2937', fontWeight: 700 }}>
                          Time to Reach Event Distribution
                        </Typography>
                        <Box sx={{pb: 4.5, height: "100%"}}>

                        <Bar
                          data={createTimeDistributionChart(eventAnalytics[selectedEvent].timeAnalysis)}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                labels: { 
                                  color: '#1f2937',
                                  font: { family: 'Inter, sans-serif', weight: 600 }
                                }
                              }
                            },
                            scales: {
                              x: { 
                                title: { display: true, text: 'Time Range', color: '#1f2937' },
                                ticks: { color: '#374151' },
                                grid: { color: '#e5e7eb' }
                              },
                              y: { 
                                title: { display: true, text: 'User Count', color: '#1f2937' },
                                ticks: { color: '#374151' },
                                grid: { color: '#e5e7eb' }
                              }
                            }
                          }}
                        />
                        </Box>
                      </ChartContainer>
                    )}
                  </Box>
                )}
                
                {/* Value Distribution Analysis */}
                {eventDistributions[selectedEvent] && (
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <IconContainer color="warning" size="medium" sx={{ mr: 2 }}>
                        <InsightsIcon />
                      </IconContainer>
                      <Box>
                        <Typography variant="h6" sx={{ color: '#1f2937', fontWeight: 700 }}>
                          Dynamic Property Distributions
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#4b5563', fontWeight: 500 }}>
                          How different property values correlate with churn vs conversion
                        </Typography>
                      </Box>
                    </Box>
                    
                    {Object.entries(eventDistributions[selectedEvent].properties).map(([prop, distribution]) => (
                      <StyledAccordion key={prop}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: theme.palette.primary.main }} />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                              {prop}
                            </Typography>
                            <FeatureChip 
                              label={distribution.type}
                              impact="medium"
                              size="small"
                            />
                            <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                              ({distribution.totalEvents} events)
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <ChartContainer sx={{ height: 300 }}>
                            <Bar
                              data={createDistributionChart(distribution, prop)}
                              options={getChartOptions(prop, distribution.type === 'numeric')}
                            />
                          </ChartContainer>
                        </AccordionDetails>
                      </StyledAccordion>
                    ))}
                  </Box>
                )}

                {/* Property Analysis */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <IconContainer color="primary" size="medium" sx={{ mr: 2 }}>
                    <AutoGraphIcon />
                  </IconContainer>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#1f2937', fontWeight: 700 }}>
                      Property Impact Analysis
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#4b5563', fontWeight: 500 }}>
                      Statistical analysis of all discovered properties
                    </Typography>
                  </Box>
                </Box>

                {Object.entries(eventAnalytics[selectedEvent].properties).map(([prop, analysis]) => (
                  <StyledAccordion key={prop}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: theme.palette.primary.main }} />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                          {prop}
                        </Typography>
                        <FeatureChip 
                          label={analysis.type}
                          impact={analysis.significance === 'high' ? 'high' : 'low'}
                          size="small"
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {analysis.type === 'numeric' ? (
                        <Grid container spacing={3}>
                          <Grid item xs={6}>
                            <MetricCard>
                              <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                                Converted Average
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 700 }}>
                                {analysis.convertedAvg.toFixed(2)}
                              </Typography>
                            </MetricCard>
                          </Grid>
                          <Grid item xs={6}>
                            <MetricCard>
                              <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                                Churned Average
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 700 }}>
                                {analysis.churnedAvg.toFixed(2)}
                              </Typography>
                            </MetricCard>
                          </Grid>
                          <Grid item xs={12}>
                            <MetricCard highlight={Math.abs(analysis.impact) > 1}>
                              <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                                Impact Analysis
                              </Typography>
                              <Typography 
                                variant="h4" 
                                sx={{ 
                                  color: analysis.impact > 0 ? '#22c55e' : '#ef4444',
                                  fontWeight: 700 
                                }}
                              >
                                {analysis.impact > 0 ? '+' : ''}{analysis.impact.toFixed(2)} 
                                <Typography component="span" variant="h6" sx={{ ml: 1, opacity: 0.8 }}>
                                  ({analysis.impactPercentage.toFixed(1)}%)
                                </Typography>
                              </Typography>
                            </MetricCard>
                          </Grid>
                        </Grid>
                      ) : analysis.type === 'boolean' ? (
                        <Grid container spacing={3}>
                          <Grid item xs={6}>
                            <MetricCard>
                              <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                                Converted True Rate
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 700 }}>
                                {analysis.convertedTrueRate.toFixed(1)}%
                              </Typography>
                            </MetricCard>
                          </Grid>
                          <Grid item xs={6}>
                            <MetricCard>
                              <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                                Churned True Rate
                              </Typography>
                              <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 700 }}>
                                {analysis.churnedTrueRate.toFixed(1)}%
                              </Typography>
                            </MetricCard>
                          </Grid>
                          <Grid item xs={12}>
                            <MetricCard highlight={Math.abs(analysis.impact) > 10}>
                              <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                                Impact Analysis
                              </Typography>
                              <Typography 
                                variant="h4" 
                                sx={{ 
                                  color: analysis.impact > 0 ? '#22c55e' : '#ef4444',
                                  fontWeight: 700 
                                }}
                              >
                                {analysis.impact > 0 ? '+' : ''}{analysis.impact.toFixed(1)}%
                              </Typography>
                            </MetricCard>
                          </Grid>
                        </Grid>
                      ) : (
                        <TableContainer component={Paper} sx={{ 
                          background: '#ffffff',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px'
                        }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ color: '#1f2937', fontWeight: 700, fontSize: '14px' }}>Value</TableCell>
                                <TableCell sx={{ color: '#1f2937', fontWeight: 700, fontSize: '14px' }}>Converted %</TableCell>
                                <TableCell sx={{ color: '#1f2937', fontWeight: 700, fontSize: '14px' }}>Churned %</TableCell>
                                <TableCell sx={{ color: '#1f2937', fontWeight: 700, fontSize: '14px' }}>Impact</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {analysis.categories.slice(0, 5).map((cat, index) => (
                                <TableRow key={index} sx={{ 
                                  '&:hover': { background: '#f8fafc' } 
                                }}>
                                  <TableCell sx={{ color: '#374151', fontWeight: 600 }}>{cat.value}</TableCell>
                                  <TableCell sx={{ color: '#22c55e', fontWeight: 600 }}>{cat.convertedRate.toFixed(1)}%</TableCell>
                                  <TableCell sx={{ color: '#ef4444', fontWeight: 600 }}>{cat.churnedRate.toFixed(1)}%</TableCell>
                                  <TableCell 
                                    sx={{ 
                                      color: cat.impact > 0 ? '#22c55e' : '#ef4444',
                                      fontWeight: 700
                                    }}
                                  >
                                    {cat.impact > 0 ? '+' : ''}{cat.impact.toFixed(1)}%
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </AccordionDetails>
                  </StyledAccordion>
                ))}
              </CardContent>
            </GradientCard>
          </Slide>
        )}
      </Box>
    </Fade>
  );
};

export default ChurnEventAnalysis;