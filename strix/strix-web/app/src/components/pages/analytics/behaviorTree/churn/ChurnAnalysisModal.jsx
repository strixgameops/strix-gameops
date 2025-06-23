import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Typography,
  Box,
  Tab,
  Alert,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import PredictionsIcon from '@mui/icons-material/Psychology';
import { Chart as ChartJS, registerables } from 'chart.js';

// Import sub-components
import ChurnFunnelAnalysis from './FunnelAnalysis';
import ChurnEventAnalysis from './EventAnalysis';
import ChurnPredictionModel from './PredictionModel';
import {
  StyledDialog,
  StyledDialogTitle,
  StyledDialogContent,
  IconContainer,
  StyledTabs
} from './ComponentsStyle';

ChartJS.register(...registerables);

const ChurnAnalysisModal = ({ open, onClose, sessionsData, funnelEvents, designEvents }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [churnAnalysis, setChurnAnalysis] = useState(null);
  const [eventAnalytics, setEventAnalytics] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [predictionModel, setPredictionModel] = useState(null);
  
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [eventDistributions, setEventDistributions] = useState({});
  const [featureSearch, setFeatureSearch] = useState('');
  const [featureFilter, setFeatureFilter] = useState('all');
  const [discoveredProperties, setDiscoveredProperties] = useState({});

  // System fields to exclude from analysis
  const SYSTEM_FIELDS = new Set([
    'sid', 'id', 'timestamp', 'clientID', 'sessionID', 'time', 'sessionId'
  ]);

  // Discover all available properties dynamically
  const discoverProperties = () => {
    if (!sessionsData || sessionsData.length === 0) return {};

    const properties = {};
    const eventTypes = new Set();

    sessionsData.forEach(session => {
      session.forEach(event => {
        eventTypes.add(event.id);
        Object.keys(event).forEach(key => {
          if (!SYSTEM_FIELDS.has(key)) {
            if (!properties[key]) {
              properties[key] = {
                type: 'unknown',
                sampleValues: new Set(),
                eventTypes: new Set(),
                totalOccurrences: 0
              };
            }
            properties[key].eventTypes.add(event.id);
            properties[key].totalOccurrences++;
            
            // Collect sample values to determine type
            if (properties[key].sampleValues.size < 10) {
              properties[key].sampleValues.add(event[key]);
            }
          }
        });
      });
    });

    // Determine property types based on sample values
    Object.keys(properties).forEach(prop => {
      const sampleValues = Array.from(properties[prop].sampleValues);
      const nonNullValues = sampleValues.filter(v => v !== null && v !== undefined);
      
      if (nonNullValues.length === 0) {
        properties[prop].type = 'null';
      } else if (nonNullValues.every(v => typeof v === 'boolean')) {
        properties[prop].type = 'boolean';
      } else if (nonNullValues.every(v => !isNaN(Number(v)))) {
        properties[prop].type = 'numeric';
      } else {
        properties[prop].type = 'categorical';
      }
    });

    return properties;
  };

  // Calculate time metrics for events
  const calculateTimeMetrics = (session, eventIds) => {
    const eventInstances = [];
    
    // Find all instances of events in the funnel sequence
    eventIds.forEach((eventId, stepIndex) => {
      const eventOccurrences = session
        .map((event, index) => ({ ...event, originalIndex: index }))
        .filter(event => event.id === eventId);
      
      eventOccurrences.forEach(event => {
        eventInstances.push({
          ...event,
          stepIndex,
          eventId
        });
      });
    });

    // Sort by timestamp
    eventInstances.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const timeMetrics = {
      totalDuration: 0,
      stepDurations: [],
      avgTimeBetweenEvents: 0,
      timeToFirstEvent: 0,
      timeToLastEvent: 0
    };

    if (eventInstances.length === 0) return timeMetrics;

    const sessionStart = new Date(session[0].timestamp);
    const firstFunnelEvent = new Date(eventInstances[0].timestamp);
    const lastFunnelEvent = new Date(eventInstances[eventInstances.length - 1].timestamp);

    timeMetrics.timeToFirstEvent = (firstFunnelEvent - sessionStart) / 1000; // seconds
    timeMetrics.timeToLastEvent = (lastFunnelEvent - sessionStart) / 1000;
    timeMetrics.totalDuration = (lastFunnelEvent - firstFunnelEvent) / 1000;

    // Calculate time between consecutive funnel events
    const stepTimes = [];
    for (let i = 1; i < eventInstances.length; i++) {
      const timeDiff = (new Date(eventInstances[i].timestamp) - new Date(eventInstances[i-1].timestamp)) / 1000;
      stepTimes.push(timeDiff);
    }

    timeMetrics.stepDurations = stepTimes;
    timeMetrics.avgTimeBetweenEvents = stepTimes.length > 0 
      ? stepTimes.reduce((sum, time) => sum + time, 0) / stepTimes.length 
      : 0;

    return timeMetrics;
  };

  // Filter sessions same as FunnelBuilder
  const filterSession = (session, filterEvents) => {
    let lastIndex = -1;
    for (const idObj of filterEvents) {
      let index = -1;
      let found = false;
      for (let i = lastIndex + 1; i < session.length; i++) {
        if (session[i].id === idObj.id) {
          index = i; 
          found = true;
          break;
        }
      }

      if (!found) return false;

      if (idObj.filters && idObj.filters.length > 0) {
        for (const filter of idObj.filters) {
          switch (filter.condition) {
            case "is":
              if (session[index][filter.targetField] !== filter.value) return false;
              break;
            case "is not":
              if (session[index][filter.targetField] === filter.value) return false;
              break;
            case "contains":
              if (String(session[index][filter.targetField]).indexOf(filter.value) === -1) return false;
              break;
            case "starts with":
              if (String(session[index][filter.targetField]).indexOf(filter.value) !== 0) return false;
              break;
            case "ends with":
              const str = String(session[index][filter.targetField]);
              if (str.indexOf(filter.value) !== str.length - filter.value.length) return false;
              break;
            case "=":
              if (Number(session[index][filter.targetField]) !== Number(filter.value)) return false;
              break;
            case "!=":
              if (Number(session[index][filter.targetField]) === Number(filter.value)) return false;
              break;
            case "<":
              if (Number(session[index][filter.targetField]) >= Number(filter.value)) return false;
              break;
            case "<=":
              if (Number(session[index][filter.targetField]) > Number(filter.value)) return false;
              break;
            case ">":
              if (Number(session[index][filter.targetField]) <= Number(filter.value)) return false;
              break;
            case ">=":
              if (Number(session[index][filter.targetField]) < Number(filter.value)) return false;
              break;
          }
        }
      }
      lastIndex = index;
    }
    return true;
  };

  useEffect(() => {
    if (!sessionsData || !funnelEvents || funnelEvents.length === 0) return;

    // Discover properties
    const properties = discoverProperties();
    setDiscoveredProperties(properties);

    const analysis = analyzeChurnData();
    setChurnAnalysis(analysis);
    
    const eventStats = analyzeEventSpecificData();
    setEventAnalytics(eventStats);

    const distributions = analyzeEventDistributions();
    setEventDistributions(distributions);

    const prediction = buildPredictionModel(properties);
    setPredictionModel(prediction);
  }, [sessionsData, funnelEvents]);

  const analyzeChurnData = () => {
    const totalSessions = sessionsData.length;
    const funnelSteps = [];
    const funnelEventIds = funnelEvents.map(e => e.id);
    
    // Calculate conversion at each funnel step with time metrics
    funnelEvents.forEach((event, index) => {
      const stepEvents = funnelEvents.slice(0, index + 1);
      const convertedSessions = sessionsData.filter(session => filterSession(session, stepEvents));
      const conversionRate = (convertedSessions.length / totalSessions) * 100;
      const churnRate = index === 0 ? 0 : funnelSteps[index - 1].conversionRate - conversionRate;
      
      // Calculate time metrics for this step
      const timeMetrics = {
        avgTimeToReach: 0,
        avgTimeBetweenEvents: 0,
        timeToReachDistribution: []
      };

      if (convertedSessions.length > 0) {
        const timesToReach = convertedSessions.map(session => {
          const metrics = calculateTimeMetrics(session, funnelEventIds.slice(0, index + 1));
          return metrics.timeToLastEvent;
        }).filter(time => time > 0);

        timeMetrics.avgTimeToReach = timesToReach.length > 0 
          ? timesToReach.reduce((sum, time) => sum + time, 0) / timesToReach.length 
          : 0;
        timeMetrics.timeToReachDistribution = timesToReach;
      }
      
      funnelSteps.push({
        eventId: event.id,
        eventName: getEventName(event.id),
        totalSessions: convertedSessions.length,
        conversionRate: conversionRate,
        churnRate: churnRate,
        churnedSessions: index === 0 ? 0 : funnelSteps[index - 1].totalSessions - convertedSessions.length,
        timeMetrics
      });
    });

    // Identify critical churn points
    const criticalPoints = funnelSteps
      .filter((step, index) => index > 0 && step.churnRate > 10)
      .sort((a, b) => b.churnRate - a.churnRate);

    return {
      totalSessions,
      funnelSteps,
      criticalPoints,
      overallConversionRate: funnelSteps.length > 0 ? funnelSteps[funnelSteps.length - 1].conversionRate : 0
    };
  };

  const analyzeEventSpecificData = () => {
    const eventStats = {};
    const funnelEventIds = funnelEvents.map(e => e.id);
    
    funnelEvents.forEach((funnelEvent, stepIndex) => {
      const convertedSessions = [];
      const churnedSessions = [];
      
      // Get sessions that reached this step
      const stepEvents = funnelEvents.slice(0, stepIndex + 1);
      const reachedStep = sessionsData.filter(session => filterSession(session, stepEvents));
      
      // Get sessions that reached next step (if exists)
      if (stepIndex < funnelEvents.length - 1) {
        const nextStepEvents = funnelEvents.slice(0, stepIndex + 2);
        const reachedNextStep = sessionsData.filter(session => filterSession(session, nextStepEvents));
        
        reachedStep.forEach(session => {
          if (reachedNextStep.some(nextSession => nextSession[0]?.sessionID === session[0]?.sessionID)) {
            convertedSessions.push(session);
          } else {
            churnedSessions.push(session);
          }
        });
      } else {
        // Last step - all are converted
        convertedSessions.push(...reachedStep);
      }

      // Analyze event properties dynamically
      const eventProperties = analyzeEventPropertiesDynamic(funnelEvent.id, convertedSessions, churnedSessions, stepIndex);
      
      // Calculate time metrics for this event
      const timeAnalysis = analyzeEventTimeMetrics(funnelEvent.id, convertedSessions, churnedSessions, funnelEventIds, stepIndex);
      
      eventStats[funnelEvent.id] = {
        eventName: getEventName(funnelEvent.id),
        convertedCount: convertedSessions.length,
        churnedCount: churnedSessions.length,
        conversionRate: reachedStep.length > 0 ? (convertedSessions.length / reachedStep.length) * 100 : 0,
        properties: eventProperties,
        sessions: { converted: convertedSessions, churned: churnedSessions },
        stepIndex: stepIndex,
        timeAnalysis
      };
    });
    
    return eventStats;
  };

  const analyzeEventTimeMetrics = (eventId, convertedSessions, churnedSessions, funnelEventIds, stepIndex) => {
    const calculateSessionTimeMetrics = (sessions, label) => {
      const timeMetrics = sessions.map(session => {
        const metrics = calculateTimeMetrics(session, funnelEventIds.slice(0, stepIndex + 1));
        return {
          timeToReach: metrics.timeToLastEvent,
          avgTimeBetweenEvents: metrics.avgTimeBetweenEvents,
          totalDuration: metrics.totalDuration
        };
      }).filter(m => m.timeToReach > 0);

      return {
        count: timeMetrics.length,
        avgTimeToReach: timeMetrics.length > 0 
          ? timeMetrics.reduce((sum, m) => sum + m.timeToReach, 0) / timeMetrics.length 
          : 0,
        avgTimeBetweenEvents: timeMetrics.length > 0
          ? timeMetrics.reduce((sum, m) => sum + m.avgTimeBetweenEvents, 0) / timeMetrics.length
          : 0,
        timeDistribution: timeMetrics.map(m => m.timeToReach)
      };
    };

    const convertedTimeMetrics = calculateSessionTimeMetrics(convertedSessions, 'converted');
    const churnedTimeMetrics = calculateSessionTimeMetrics(churnedSessions, 'churned');

    return {
      converted: convertedTimeMetrics,
      churned: churnedTimeMetrics,
      timeImpact: {
        avgTimeToReachDiff: convertedTimeMetrics.avgTimeToReach - churnedTimeMetrics.avgTimeToReach,
        avgTimeBetweenEventsDiff: convertedTimeMetrics.avgTimeBetweenEvents - churnedTimeMetrics.avgTimeBetweenEvents
      }
    };
  };

  const analyzeEventDistributions = () => {
    const distributions = {};
    
    funnelEvents.forEach((funnelEvent, stepIndex) => {
      const stepEvents = funnelEvents.slice(0, stepIndex + 1);
      const reachedStep = sessionsData.filter(session => filterSession(session, stepEvents));
      
      // Get next step for churn classification
      let reachedNextStep = [];
      if (stepIndex < funnelEvents.length - 1) {
        const nextStepEvents = funnelEvents.slice(0, stepIndex + 2);
        reachedNextStep = sessionsData.filter(session => filterSession(session, nextStepEvents));
      } else {
        reachedNextStep = reachedStep; // Last step - all converted
      }

      // Extract all events of this type at this step
      const allEventInstances = [];
      reachedStep.forEach(session => {
        const eventsInSession = session.filter(event => event.id === funnelEvent.id);
        eventsInSession.forEach(eventInstance => {
          const isConverted = reachedNextStep.some(nextSession => 
            nextSession[0]?.sessionID === session[0]?.sessionID
          );
          allEventInstances.push({
            ...eventInstance,
            isConverted,
            sessionId: session[0]?.sessionID || 'unknown'
          });
        });
      });

      // Analyze distributions for each property dynamically
      const propertyDistributions = {};
      
      if (allEventInstances.length > 0) {
        const allProperties = new Set();
        allEventInstances.forEach(event => {
          Object.keys(event).forEach(key => {
            if (!SYSTEM_FIELDS.has(key) && key !== 'isConverted' && key !== 'sessionId') {
              allProperties.add(key);
            }
          });
        });

        allProperties.forEach(prop => {
          const values = allEventInstances.map(e => ({ value: e[prop], isConverted: e.isConverted }))
                                          .filter(v => v.value !== undefined && v.value !== null);
          
          if (values.length === 0) return;

          const propertyInfo = discoveredProperties[prop];
          const isNumeric = propertyInfo?.type === 'numeric';
          
          if (isNumeric) {
            // Create buckets for numeric values
            const numericValues = values.map(v => Number(v.value));
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            const bucketCount = Math.min(10, Math.ceil(Math.sqrt(numericValues.length)));
            const bucketSize = (max - min) / bucketCount || 1;
            
            const buckets = Array.from({ length: bucketCount }, (_, i) => ({
              range: `${(min + i * bucketSize).toFixed(1)}-${(min + (i + 1) * bucketSize).toFixed(1)}`,
              converted: 0,
              churned: 0,
              total: 0
            }));

            values.forEach(({ value, isConverted }) => {
              const bucketIndex = Math.min(bucketCount - 1, Math.floor((Number(value) - min) / bucketSize));
              buckets[bucketIndex].total++;
              if (isConverted) {
                buckets[bucketIndex].converted++;
              } else {
                buckets[bucketIndex].churned++;
              }
            });

            propertyDistributions[prop] = {
              type: 'numeric',
              buckets: buckets.filter(b => b.total > 0),
              totalEvents: values.length
            };
          } else {
            // Categorical distribution
            const categoryMap = {};
            values.forEach(({ value, isConverted }) => {
              const key = String(value);
              if (!categoryMap[key]) {
                categoryMap[key] = { converted: 0, churned: 0, total: 0 };
              }
              categoryMap[key].total++;
              if (isConverted) {
                categoryMap[key].converted++;
              } else {
                categoryMap[key].churned++;
              }
            });

            const categories = Object.entries(categoryMap)
              .map(([value, stats]) => ({
                value,
                ...stats,
                conversionRate: (stats.converted / stats.total) * 100
              }))
              .sort((a, b) => b.total - a.total);

            propertyDistributions[prop] = {
              type: 'categorical',
              categories: categories.slice(0, 20), // Limit to top 20 categories
              totalEvents: values.length
            };
          }
        });
      }

      distributions[funnelEvent.id] = {
        eventName: getEventName(funnelEvent.id),
        stepIndex,
        totalInstances: allEventInstances.length,
        convertedInstances: allEventInstances.filter(e => e.isConverted).length,
        properties: propertyDistributions
      };
    });

    return distributions;
  };

  const analyzeEventPropertiesDynamic = (eventId, convertedSessions, churnedSessions, stepIndex) => {
    const properties = {};
    
    // Get all events of this type from both converted and churned sessions
    const convertedEvents = convertedSessions.flatMap(session => 
      session.filter(event => event.id === eventId)
    );
    const churnedEvents = churnedSessions.flatMap(session => 
      session.filter(event => event.id === eventId)
    );

    // Find all property keys dynamically (excluding system fields)
    const allProperties = new Set();
    [...convertedEvents, ...churnedEvents].forEach(event => {
      Object.keys(event).forEach(key => {
        if (!SYSTEM_FIELDS.has(key)) {
          allProperties.add(key);
        }
      });
    });

    allProperties.forEach(prop => {
      const convertedValues = convertedEvents.map(e => e[prop]).filter(v => v !== undefined && v !== null);
      const churnedValues = churnedEvents.map(e => e[prop]).filter(v => v !== undefined && v !== null);
      
      if (convertedValues.length === 0 && churnedValues.length === 0) return;

      const propertyInfo = discoveredProperties[prop];
      const isNumeric = propertyInfo?.type === 'numeric';
      const isBoolean = propertyInfo?.type === 'boolean';
      
      if (isNumeric) {
        // Numeric analysis
        const convertedNums = convertedValues.map(v => Number(v));
        const churnedNums = churnedValues.map(v => Number(v));
        
        const convertedAvg = convertedNums.reduce((a, b) => a + b, 0) / convertedNums.length || 0;
        const churnedAvg = churnedNums.reduce((a, b) => a + b, 0) / churnedNums.length || 0;
        const impact = convertedAvg - churnedAvg;
        
        properties[prop] = {
          type: 'numeric',
          convertedAvg,
          churnedAvg,
          impact,
          impactPercentage: churnedAvg !== 0 ? ((convertedAvg - churnedAvg) / churnedAvg) * 100 : 0,
          significance: Math.abs(impact) > Math.max(convertedAvg, churnedAvg) * 0.1 ? 'high' : 'low',
          eventId,
          eventName: getEventName(eventId),
          stepIndex
        };
      } else if (isBoolean) {
        // Boolean analysis
        const convertedTrue = convertedValues.filter(v => v === true).length;
        const churnedTrue = churnedValues.filter(v => v === true).length;
        
        const convertedRate = (convertedTrue / convertedValues.length) * 100;
        const churnedRate = (churnedTrue / churnedValues.length) * 100;
        
        properties[prop] = {
          type: 'boolean',
          convertedTrueRate: convertedRate,
          churnedTrueRate: churnedRate,
          impact: convertedRate - churnedRate,
          eventId,
          eventName: getEventName(eventId),
          stepIndex
        };
      } else {
        // Categorical analysis
        const convertedCounts = {};
        const churnedCounts = {};
        
        convertedValues.forEach(val => {
          const key = String(val);
          convertedCounts[key] = (convertedCounts[key] || 0) + 1;
        });
        
        churnedValues.forEach(val => {
          const key = String(val);
          churnedCounts[key] = (churnedCounts[key] || 0) + 1;
        });
        
        const categories = Array.from(new Set([...Object.keys(convertedCounts), ...Object.keys(churnedCounts)]));
        const categoryAnalysis = categories.map(cat => {
          const convertedRate = (convertedCounts[cat] || 0) / convertedValues.length * 100;
          const churnedRate = (churnedCounts[cat] || 0) / churnedValues.length * 100;
          return {
            value: cat,
            convertedRate,
            churnedRate,
            impact: convertedRate - churnedRate
          };
        }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
        
        properties[prop] = {
          type: 'categorical',
          categories: categoryAnalysis,
          topImpactCategory: categoryAnalysis[0],
          eventId,
          eventName: getEventName(eventId),
          stepIndex
        };
      }
    });
    
    return properties;
  };

  const buildPredictionModel = (properties) => {
    if (!churnAnalysis || churnAnalysis.funnelSteps.length === 0) return null;

    // Simple prediction model based on event patterns
    const features = [];
    const labels = [];
    
    sessionsData.forEach(session => {
      const sessionFeatures = extractSessionFeaturesDynamic(session, properties);
      const isConverted = filterSession(session, funnelEvents);
      
      features.push(sessionFeatures);
      labels.push(isConverted ? 1 : 0);
    });

    // Calculate feature importance (correlation with conversion)
    const featureImportance = calculateFeatureImportance(features, labels);
    
    const enhancedFeatures = Object.entries(featureImportance).map(([name, data]) => {
      const metadata = parseFeatureName(name, properties);
      return {
        name,
        ...data,
        ...metadata,
        impactScore: Math.abs(data.correlation),
        isPositiveForConversion: data.direction === 'positive'
      };
    }).sort((a, b) => b.impactScore - a.impactScore);
    
    return {
      features: enhancedFeatures,
      accuracy: calculateModelAccuracy(features, labels),
      totalSamples: features.length,
      featureCount: enhancedFeatures.length,
      highImpactFeatures: enhancedFeatures.filter(f => f.impactScore > 0.1).length
    };
  };

  // Helper functions for model building
  const parseFeatureName = (featureName, properties) => {
    let category = 'General';
    let eventId = null;
    let propertyName = null;
    let aggregationType = null;

    if (featureName.includes('Time') || featureName.includes('Duration')) {
      category = 'Time Analysis';
    } else if (featureName.includes('Session')) {
      category = 'Session';
    } else if (featureName.startsWith('has') || featureName.startsWith('count')) {
      category = 'Event Presence';
      const match = featureName.match(/(has|count)(.+)/);
      if (match) {
        const eventName = match[2];
        eventId = findEventIdByName(eventName);
      }
    } else if (featureName.startsWith('total') || featureName.startsWith('avg') || featureName.startsWith('max') || featureName.startsWith('min')) {
      category = 'Property Aggregation';
      const match = featureName.match(/(total|avg|max|min)(.+)/);
      if (match) {
        aggregationType = match[1];
        propertyName = match[2];
      }
    } else {
      // Check if it's a discovered property
      if (properties[featureName]) {
        category = 'Dynamic Property';
        propertyName = featureName;
      }
    }

    return {
      category,
      eventId,
      propertyName,
      aggregationType,
      description: generateFeatureDescription(featureName, category, aggregationType, propertyName)
    };
  };

  const findEventIdByName = (cleanName) => {
    const match = designEvents.find(event => {
      const cleanEventName = (event.name || event.id).replace(/[^a-zA-Z0-9]/g, '');
      return cleanEventName === cleanName;
    });
    return match ? match.id : null;
  };

  const generateFeatureDescription = (name, category, aggregationType, propertyName) => {
    switch (category) {
      case 'Time Analysis':
        if (name.includes('TimeToReach')) return 'Time to reach this funnel step';
        if (name.includes('TimeBetweenEvents')) return 'Average time between funnel events';
        if (name.includes('TotalDuration')) return 'Total time spent in funnel';
        break;
      case 'Session':
        if (name === 'sessionLength') return 'Total events in session';
        if (name === 'uniqueEvents') return 'Number of unique event types';
        if (name === 'avgTimeBetweenEvents') return 'Average time between events (seconds)';
        break;
      case 'Event Presence':
        return `Event occurrence: ${name.replace(/^(has|count)/, '')}`;
      case 'Values Aggregation':
        return `${aggregationType?.toUpperCase()} of ${propertyName} across all events`;
      case 'Custom Value':
        return `Property: ${propertyName}`;
      default:
        return name;
    }
    return name;
  };

  const extractSessionFeaturesDynamic = (session, properties) => {
    const features = {
      sessionLength: session.length,
      uniqueEvents: new Set(session.map(e => e.id)).size,
      avgTimeBetweenEvents: calculateAvgTimeBetweenEvents(session)
    };

    // Add time-based features for funnel
    const funnelEventIds = funnelEvents.map(e => e.id);
    const timeMetrics = calculateTimeMetrics(session, funnelEventIds);
    features[`totalFunnelDuration`] = timeMetrics.totalDuration;
    features[`timeToFirstFunnelEvent`] = timeMetrics.timeToFirstEvent;
    features[`timeToLastFunnelEvent`] = timeMetrics.timeToLastEvent;
    features[`avgTimeBetweenFunnelEvents`] = timeMetrics.avgTimeBetweenEvents;

    // Dynamic event presence features
    const uniqueEventIds = new Set(sessionsData.flatMap(s => s.map(e => e.id)));
    uniqueEventIds.forEach(eventId => {
      const eventName = getEventName(eventId).replace(/[^a-zA-Z0-9]/g, '');
      features[`has${eventName}`] = session.some(e => e.id === eventId);
      features[`count${eventName}`] = session.filter(e => e.id === eventId).length;
    });

    // Dynamic property aggregation features based on discovered properties
    Object.keys(properties).forEach(prop => {
      const events = session.filter(e => e[prop] !== undefined && e[prop] !== null);
      if (events.length === 0) return;

      const cleanPropName = prop.replace(/[^a-zA-Z0-9]/g, '');
      
      if (properties[prop].type === 'numeric') {
        const values = events.map(e => Number(e[prop])).filter(v => !isNaN(v));
        if (values.length > 0) {
          features[`total${cleanPropName}`] = values.reduce((sum, val) => sum + val, 0);
          features[`avg${cleanPropName}`] = features[`total${cleanPropName}`] / values.length;
          features[`max${cleanPropName}`] = Math.max(...values);
          features[`min${cleanPropName}`] = Math.min(...values);
        }
      } else if (properties[prop].type === 'boolean') {
        features[`has${cleanPropName}True`] = events.some(e => e[prop] === true);
        features[`count${cleanPropName}True`] = events.filter(e => e[prop] === true).length;
      } else {
        // For categorical, create features for most common values
        const valueCounts = {};
        events.forEach(e => {
          const key = String(e[prop]);
          valueCounts[key] = (valueCounts[key] || 0) + 1;
        });
        
        // Add features for top 5 most common values
        const topValues = Object.entries(valueCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
          
        topValues.forEach(([value, count]) => {
          const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '');
          features[`${cleanPropName}Is${cleanValue}`] = count > 0;
          features[`${cleanPropName}Count${cleanValue}`] = count;
        });
      }
    });

    return features;
  };

  const calculateAvgTimeBetweenEvents = (session) => {
    if (session.length < 2) return 0;
    let totalTime = 0;
    let validIntervals = 0;
    
    for (let i = 1; i < session.length; i++) {
      if (session[i].timestamp && session[i-1].timestamp) {
        const timeDiff = new Date(session[i].timestamp) - new Date(session[i-1].timestamp);
        totalTime += timeDiff;
        validIntervals++;
      }
    }
    
    return validIntervals > 0 ? totalTime / validIntervals / 1000 : 0; // seconds
  };

  const calculateFeatureImportance = (features, labels) => {
    const featureNames = Object.keys(features[0] || {});
    const importance = {};
    
    featureNames.forEach(feature => {
      const convertedValues = [];
      const churnedValues = [];
      
      features.forEach((f, index) => {
        if (labels[index] === 1) {
          convertedValues.push(f[feature]);
        } else {
          churnedValues.push(f[feature]);
        }
      });
      
      // Simple correlation calculation
      const convertedAvg = convertedValues.reduce((a, b) => a + b, 0) / convertedValues.length || 0;
      const churnedAvg = churnedValues.reduce((a, b) => a + b, 0) / churnedValues.length || 0;
      
      importance[feature] = {
        convertedAvg,
        churnedAvg,
        correlation: Math.abs(convertedAvg - churnedAvg),
        direction: convertedAvg > churnedAvg ? 'positive' : 'negative'
      };
    });
    
    return importance;
  };

  const calculateModelAccuracy = (features, labels) => {
    // Simple accuracy calculation based on majority class
    const conversions = labels.filter(l => l === 1).length;
    const total = labels.length;
    return Math.max(conversions / total, (total - conversions) / total) * 100;
  };

  const getEventName = (eventId) => {
    const designEvent = designEvents.find(e => e.id === eventId);
    if (designEvent) return designEvent.name || eventId;
    
    const eventNames = {
      'newSession': 'Session Start',
      'endSession': 'Session End',
      'offerEvent': 'Purchase Made',
      'offerShown': 'Offer Shown',
      'economyEvent': 'Economy Event',
      'adEvent': 'Ad Shown',
      'reportEvent': 'Message Sent'
    };
    
    return eventNames[eventId] || `Event ${eventId.slice(0, 8)}...`;
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (!open) return null;

  return (
    <StyledDialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <StyledDialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconContainer color="primary" size="large" sx={{ mr: 2 }}>
              <TrendingDownIcon />
            </IconContainer>
            <Typography variant="h5">
              Dynamic Churn Analysis & Prediction
            </Typography>
          </Box>
          <IconButton 
            onClick={onClose}
            sx={{
              color: theme.palette.text.primary,
              '&:hover': {
                background: '#f4433610',
                color: '#f44336',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </StyledDialogTitle>
      
      <StyledDialogContent>
        {(!sessionsData || !funnelEvents || funnelEvents.length === 0) ? (
          <Alert 
            severity="info" 
            sx={{ 
              background: `linear-gradient(135deg, ${theme.palette.primary.main}10 0%, ${theme.palette.primary.main}15 100%)`,
              border: `1px solid ${theme.palette.primary.main}30`,
              color: theme.palette.text.primary,
              '& .MuiAlert-icon': {
                color: theme.palette.primary.main,
              }
            }}
          >
            Please configure your funnel in the main interface to enable churn analysis.
          </Alert>
        ) : (
          <Box>
            <StyledTabs value={activeTab} onChange={handleTabChange} sx={{ mb: 4 }}>
              <Tab 
                label="Funnel Analysis" 
                icon={<ShowChartIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="Event Analytics" 
                icon={<TimelineIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="Prediction Model" 
                icon={<PredictionsIcon />} 
                iconPosition="start"
              />
            </StyledTabs>

            <Box>
              {activeTab === 0 && (
                <ChurnFunnelAnalysis 
                  churnAnalysis={churnAnalysis} 
                  theme={theme}
                />
              )}
              {activeTab === 1 && (
                <ChurnEventAnalysis 
                  eventAnalytics={eventAnalytics}
                  eventDistributions={eventDistributions}
                  selectedEvent={selectedEvent}
                  setSelectedEvent={setSelectedEvent}
                  theme={theme}
                />
              )}
              {activeTab === 2 && (
                <ChurnPredictionModel 
                  predictionModel={predictionModel}
                  selectedFeature={selectedFeature}
                  setSelectedFeature={setSelectedFeature}
                  featureSearch={featureSearch}
                  setFeatureSearch={setFeatureSearch}
                  featureFilter={featureFilter}
                  setFeatureFilter={setFeatureFilter}
                  getEventName={getEventName}
                  setActiveTab={setActiveTab}
                  setSelectedEvent={setSelectedEvent}
                  theme={theme}
                />
              )}
            </Box>
          </Box>
        )}
      </StyledDialogContent>
    </StyledDialog>
  );
};

export default ChurnAnalysisModal;