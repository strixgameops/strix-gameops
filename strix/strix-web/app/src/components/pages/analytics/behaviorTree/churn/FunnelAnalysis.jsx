import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Fade
} from '@mui/material';
import { Bar } from 'react-chartjs-2';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import WarningIcon from '@mui/icons-material/Warning';
import InsightsIcon from '@mui/icons-material/Insights';
import {
  GradientCard,
  IconContainer,
  MetricCard,
  ChartContainer,
  FeatureChip
} from './ComponentsStyle';

const ChurnFunnelAnalysis = ({ churnAnalysis, theme }) => {
  if (!churnAnalysis) return <Typography sx={{ color: '#374151' }}>Loading analysis...</Typography>;

  const chartData = {
    labels: churnAnalysis.funnelSteps.map(step => step.eventName),
    datasets: [
      {
        label: 'Conversion Rate %',
        data: churnAnalysis.funnelSteps.map(step => step.conversionRate),
        backgroundColor: '#22c55e80',
        borderColor: '#22c55e',
        borderWidth: 3,
        borderRadius: 8,
      },
      {
        label: 'Churn Rate %',
        data: churnAnalysis.funnelSteps.map(step => step.churnRate),
        backgroundColor: '#ef444480',
        borderColor: '#ef4444',
        borderWidth: 3,
        borderRadius: 8,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#1f2937',
          font: {
            family: 'Inter, sans-serif',
            weight: 600,
            size: 14
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#374151', font: { weight: 500 } },
        grid: { color: '#e5e7eb' }
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: '#374151', font: { weight: 500 } },
        grid: { color: '#e5e7eb' }
      }
    }
  };

  return (
    <Fade in={true} timeout={600}>
      <Box>
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <GradientCard>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <IconContainer color="primary" size="large" sx={{ mr: 3 }}>
                    <ShowChartIcon />
                  </IconContainer>
                  <Box>
                    <Typography variant="h5" sx={{ color: '#1f2937', fontWeight: 700 }}>
                      Funnel Conversion Analysis
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#4b5563', fontWeight: 500 }}>
                      Track conversion and churn rates across your funnel steps
                    </Typography>
                  </Box>
                </Box>
                <ChartContainer sx={{ height: 350 }}>
                  <Bar data={chartData} options={chartOptions} />
                </ChartContainer>
              </CardContent>
            </GradientCard>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <GradientCard variant="success">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <IconContainer color="success" size="medium" sx={{ mr: 2 }}>
                    <InsightsIcon />
                  </IconContainer>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#1f2937', fontWeight: 700 }}>
                      Key Metrics
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#4b5563', fontWeight: 500 }}>
                      Overall funnel performance
                    </Typography>
                  </Box>
                </Box>
                <List>
                  <ListItem sx={{ px: 0, py: 2 }}>
                    <ListItemText 
                      primary={
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                          Total Sessions
                        </Typography>
                      }
                      secondary={
                        <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 800 }}>
                          {churnAnalysis.totalSessions.toLocaleString()}
                        </Typography>
                      } 
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 2 }}>
                    <ListItemText 
                      primary={
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                          Overall Conversion Rate
                        </Typography>
                      }
                      secondary={
                        <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 800 }}>
                          {churnAnalysis.overallConversionRate.toFixed(2)}%
                        </Typography>
                      } 
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 2 }}>
                    <ListItemText 
                      primary={
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                          Funnel Steps
                        </Typography>
                      }
                      secondary={
                        <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 800 }}>
                          {churnAnalysis.funnelSteps.length}
                        </Typography>
                      } 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </GradientCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <GradientCard variant="error">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <IconContainer color="error" size="medium" sx={{ mr: 2 }}>
                    <WarningIcon />
                  </IconContainer>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#1f2937', fontWeight: 700 }}>
                      Critical Churn Points
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#4b5563', fontWeight: 500 }}>
                      Events with highest churn rates
                    </Typography>
                  </Box>
                </Box>
                {churnAnalysis.criticalPoints.length > 0 ? (
                  <List>
                    {churnAnalysis.criticalPoints.slice(0, 3).map((point, index) => (
                      <ListItem key={index} sx={{ px: 0, py: 2 }}>
                        <ListItemText 
                          primary={
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
                              {point.eventName}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="h6" sx={{ color: '#ef4444', fontWeight: 600 }}>
                              {point.churnRate.toFixed(1)}% churn rate
                            </Typography>
                          }
                        />
                        <FeatureChip 
                          label={`${point.churnedSessions} users`} 
                          impact="high"
                          size="small" 
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    borderRadius: '12px',
                    border: '2px solid #22c55e30'
                  }}>
                    <Typography sx={{ color: '#22c55e', fontWeight: 700, fontSize: '18px' }}>
                      🎉 No critical churn points detected!
                    </Typography>
                    <Typography sx={{ color: '#16a34a', fontWeight: 500, mt: 1 }}>
                      Your funnel is performing well
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </GradientCard>
          </Grid>
        </Grid>
      </Box>
    </Fade>
  );
};

export default ChurnFunnelAnalysis;