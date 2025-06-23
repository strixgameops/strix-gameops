import React from 'react';
import {
  Typography,
  Box,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Button,
  AccordionSummary,
  AccordionDetails,
  Slide,
  Fade
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PredictionsIcon from '@mui/icons-material/Psychology';
import InfoIcon from '@mui/icons-material/Info';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  GradientCard,
  IconContainer,
  MetricCard,
  FeatureChip,
  StyledAccordion,
  SearchField,
  GlowingLinearProgress
} from './ComponentsStyle';

const ChurnPredictionModel = ({ 
  predictionModel, 
  selectedFeature, 
  setSelectedFeature,
  featureSearch,
  setFeatureSearch,
  featureFilter,
  setFeatureFilter,
  getEventName,
  setActiveTab,
  setSelectedEvent,
  theme 
}) => {
  if (!predictionModel) return <Typography sx={{ color: '#374151' }}>Loading prediction model...</Typography>;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const getFilteredFeatures = () => {
    let filtered = predictionModel.features;
    
    if (featureSearch) {
      filtered = filtered.filter(feature => 
        feature.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
        feature.description.toLowerCase().includes(featureSearch.toLowerCase()) ||
        feature.category.toLowerCase().includes(featureSearch.toLowerCase())
      );
    }
    
    if (featureFilter !== 'all') {
      switch (featureFilter) {
        case 'positive':
          filtered = filtered.filter(f => f.isPositiveForConversion);
          break;
        case 'negative':
          filtered = filtered.filter(f => !f.isPositiveForConversion);
          break;
        case 'high-impact':
          filtered = filtered.filter(f => f.impactScore > 0.1);
          break;
      }
    }
    
    return filtered;
  };

  const filteredFeatures = getFilteredFeatures();
  const categories = [...new Set(predictionModel.features.map(f => f.category))];

  return (
    <Fade in={true} timeout={600}>
      <Box>
        {/* Header with summary */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <GradientCard variant="success">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <IconContainer color="success" size="large" sx={{ mr: 2 }}>
                    <PredictionsIcon />
                  </IconContainer>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#1f2937', fontWeight: 700 }}>
                      Model Overview
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#4b5563', fontWeight: 500 }}>
                      Prediction performance metrics
                    </Typography>
                  </Box>
                </Box>
                <List dense>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemText 
                      primary={
                        <Typography variant="body1" sx={{ color: '#374151', fontWeight: 600 }}>
                          Baseline Accuracy
                        </Typography>
                      }
                      secondary={
                        <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 700 }}>
                          {predictionModel.accuracy.toFixed(1)}%
                        </Typography>
                      } 
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemText 
                      primary={
                        <Typography variant="body1" sx={{ color: '#374151', fontWeight: 600 }}>
                          Training Samples
                        </Typography>
                      }
                      secondary={
                        <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 700 }}>
                          {predictionModel.totalSamples.toLocaleString()}
                        </Typography>
                      } 
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemText 
                      primary={
                        <Typography variant="body1" sx={{ color: '#374151', fontWeight: 600 }}>
                          Total Features
                        </Typography>
                      }
                      secondary={
                        <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 700 }}>
                          {predictionModel.featureCount}
                        </Typography>
                      } 
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemText 
                      primary={
                        <Typography variant="body1" sx={{ color: '#374151', fontWeight: 600 }}>
                          High Impact Features
                        </Typography>
                      }
                      secondary={
                        <Typography variant="h5" sx={{ color: '#ef4444', fontWeight: 700 }}>
                          {predictionModel.highImpactFeatures}
                        </Typography>
                      } 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </GradientCard>
          </Grid>

          <Grid item xs={12} md={8}>
            <GradientCard variant="warning">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <IconContainer color="warning" size="large" sx={{ mr: 2 }}>
                    <InfoIcon />
                  </IconContainer>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#1f2937', fontWeight: 700 }}>
                      How to Read This Analysis
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#4b5563', fontWeight: 500 }}>
                      Understanding feature impact on conversion
                    </Typography>
                  </Box>
                </Box>
                <List dense>
                  <ListItem sx={{ px: 0, alignItems: 'flex-start', py: 1 }}>
                    <IconContainer color="success" size="small" sx={{ mr: 2, mt: 0.5 }}>
                      <TrendingUpIcon />
                    </IconContainer>
                    <ListItemText 
                      primary={
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#1f2937' }}>
                          Positive Impact
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body1" sx={{ color: '#374151', fontWeight: 500 }}>
                          Higher values → Higher conversion rate
                        </Typography>
                      }
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, alignItems: 'flex-start', py: 1 }}>
                    <IconContainer color="error" size="small" sx={{ mr: 2, mt: 0.5 }}>
                      <TrendingDownIcon />
                    </IconContainer>
                    <ListItemText 
                      primary={
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#1f2937' }}>
                          Negative Impact
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body1" sx={{ color: '#374151', fontWeight: 500 }}>
                          Higher values → Lower conversion rate (more churn)
                        </Typography>
                      }
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, alignItems: 'flex-start', py: 1 }}>
                    <IconContainer color="warning" size="small" sx={{ mr: 2, mt: 0.5 }}>
                      <AutoGraphIcon />
                    </IconContainer>
                    <ListItemText 
                      primary={
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#1f2937' }}>
                          Impact Score
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body1" sx={{ color: '#374151', fontWeight: 500 }}>
                          How much this feature affects conversion (0-1 scale)
                        </Typography>
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </GradientCard>
          </Grid>
        </Grid>

        {/* Search and filter controls */}
        <GradientCard sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <SearchField
                  fullWidth
                  placeholder="Search features by name, description, or category..."
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: theme.palette.primary.main }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#6b7280', fontWeight: 500 }}>Filter by Impact</InputLabel>
                  <Select
                    value={featureFilter}
                    label="Filter by Impact"
                    onChange={(e) => setFeatureFilter(e.target.value)}
                    sx={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#d1d5db',
                        borderWidth: '2px',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: `${theme.palette.primary.main}60`,
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      },
                      '& .MuiSelect-select': {
                        color: '#1f2937',
                        fontWeight: 500,
                      }
                    }}
                  >
                    <MenuItem value="all">All Features</MenuItem>
                    <MenuItem value="positive">Positive Impact</MenuItem>
                    <MenuItem value="negative">Negative Impact</MenuItem>
                    <MenuItem value="high-impact">High Impact Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard highlight={filteredFeatures.length !== predictionModel.featureCount}>
                  <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                    Showing Features
                  </Typography>
                  <Typography variant="h5" sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                    {filteredFeatures.length} / {predictionModel.featureCount}
                  </Typography>
                </MetricCard>
              </Grid>
            </Grid>
          </CardContent>
        </GradientCard>

        {/* Feature categories overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {categories.map((category, index) => {
            const categoryFeatures = predictionModel.features.filter(f => f.category === category);
            const avgImpact = categoryFeatures.reduce((sum, f) => sum + f.impactScore, 0) / categoryFeatures.length;
            
            return (
              <Grid item xs={12} sm={6} md={3} key={category}>
                <Slide direction="up" in={true} timeout={300 + index * 100}>
                  <GradientCard variant={avgImpact > 0.1 ? 'error' : avgImpact > 0.05 ? 'warning' : 'default'}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1f2937' }}>
                        {category}
                      </Typography>
                      <Badge badgeContent={categoryFeatures.length} max={999} color="primary" sx={{ mb: 2 }}>
                        <FeatureChip 
                          label={`Impact: ${avgImpact.toFixed(3)}`}
                          impact={avgImpact > 0.1 ? 'high' : avgImpact > 0.05 ? 'medium' : 'low'}
                          size="small"
                        />
                      </Badge>
                    </CardContent>
                  </GradientCard>
                </Slide>
              </Grid>
            );
          })}
        </Grid>

        {/* Feature list */}
        <GradientCard>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <IconContainer color="primary" size="large" sx={{ mr: 3 }}>
                <FilterListIcon />
              </IconContainer>
              <Box>
                <Typography variant="h5" sx={{ color: '#1f2937', fontWeight: 700 }}>
                  Feature Analysis
                </Typography>
                <Typography variant="body1" sx={{ color: '#4b5563', fontWeight: 500 }}>
                  Detailed breakdown of all prediction features
                </Typography>
              </Box>
            </Box>
            
            {filteredFeatures.map((feature, index) => (
              <StyledAccordion 
                key={feature.name}
                expanded={selectedFeature === feature.name}
                onChange={() => setSelectedFeature(selectedFeature === feature.name ? null : feature.name)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: theme.palette.primary.main }} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mr: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                        {feature.name}
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#4b5563', fontWeight: 500 }}>
                        {feature.description}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <FeatureChip 
                        label={feature.category}
                        impact="low"
                        size="small"
                      />
                      <FeatureChip 
                        label={feature.isPositiveForConversion ? 'Positive' : 'Negative'}
                        impact={feature.isPositiveForConversion ? 'medium' : 'high'}
                        size="small"
                      />
                      <Box sx={{ width: 100, mr: 1 }}>
                        <GlowingLinearProgress 
                          variant="determinate" 
                          value={clamp(feature.impactScore * 100, 0, 100)} 
                          color={clamp(feature.impactScore > 0.1, 0, 1) ? 'error' : 'primary'}
                        />
                      </Box>
                      <Typography variant="body1" sx={{ minWidth: 60, color: '#1f2937', fontWeight: 700 }}>
                        {feature.impactScore.toFixed(3)}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <MetricCard>
                        <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                          Converted Users Average
                        </Typography>
                        <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 700 }}>
                          {feature.convertedAvg.toFixed(2)}
                        </Typography>
                      </MetricCard>
                      <MetricCard sx={{ mt: 2 }}>
                        <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                          Churned Users Average
                        </Typography>
                        <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 700 }}>
                          {feature.churnedAvg.toFixed(2)}
                        </Typography>
                      </MetricCard>
                      <MetricCard sx={{ mt: 2 }} highlight={feature.impactScore > 0.1}>
                        <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                          Correlation Strength
                        </Typography>
                        <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                          {feature.correlation.toFixed(3)}
                        </Typography>
                      </MetricCard>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {feature.eventId && (
                        <MetricCard highlight>
                          <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                            Related Event
                          </Typography>
                          <Typography variant="h5" sx={{ color: theme.palette.primary.main, fontWeight: 700, mb: 3 }}>
                            {getEventName(feature.eventId)}
                          </Typography>
                          <Button
                            variant="contained"
                            size="large"
                            onClick={() => {
                              setActiveTab(1);
                              setSelectedEvent(feature.eventId);
                            }}
                            sx={{
                              background: theme.palette.primary.main,
                              color: '#ffffff',
                              fontWeight: 600,
                              borderRadius: '8px',
                              '&:hover': {
                                background: `${theme.palette.primary.main}dd`,
                                transform: 'translateY(-2px)',
                                boxShadow: `0 8px 25px ${theme.palette.primary.main}40`,
                              }
                            }}
                          >
                            View Event Analysis
                          </Button>
                        </MetricCard>
                      )}
                      {feature.propertyName && (
                        <MetricCard sx={{ mt: feature.eventId ? 3 : 0 }}>
                          <Typography variant="body1" sx={{ color: '#374151', mb: 1, fontWeight: 600 }}>
                            Property Details
                          </Typography>
                          <Typography variant="h6" sx={{ color: '#1f2937', fontWeight: 700 }}>
                            {feature.propertyName}
                            {feature.aggregationType && (
                              <Typography component="span" sx={{ color: theme.palette.primary.main, ml: 1, fontWeight: 600 }}>
                                ({feature.aggregationType})
                              </Typography>
                            )}
                          </Typography>
                        </MetricCard>
                      )}
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </StyledAccordion>
            ))}
          </CardContent>
        </GradientCard>
      </Box>
    </Fade>
  );
};

export default ChurnPredictionModel;