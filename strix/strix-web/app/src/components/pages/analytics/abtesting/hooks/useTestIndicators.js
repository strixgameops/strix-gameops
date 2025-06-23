import React, { useState, useEffect } from "react";
import { Typography } from "@mui/material";

export const useTestIndicators = (testId) => {
  const getDefaultSettings = () => ({
    pValue: { green: 0.05, orange: 0.1 },
    zScore: { threshold: 1.96 },
    lift: { green: 1.05, orange: 0.95 },
    power: { green: 0.8, orange: 0.5 },
    confidenceInterval: { boundary: 0 },
  });

  const validateSettings = (settings) => {
    const required = [
      "pValue",
      "zScore",
      "lift",
      "power",
      "confidenceInterval",
    ];
    return required.every(
      (field) => settings[field] && typeof settings[field] === "object"
    );
  };

  const [indicatorSettings, setIndicatorSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("indicatorSettings");
      const allSettings = saved ? JSON.parse(saved) : {};
      const testSettings = allSettings[testId];

      if (testSettings && validateSettings(testSettings)) {
        return testSettings;
      }

      return getDefaultSettings();
    } catch (error) {
      console.error("Error loading indicator settings:", error);
      return getDefaultSettings();
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("indicatorSettings");
      const allSettings = saved ? JSON.parse(saved) : {};
      allSettings[testId] = indicatorSettings;
      localStorage.setItem("indicatorSettings", JSON.stringify(allSettings));
    } catch (error) {
      console.error("Error saving indicator settings:", error);
    }
  }, [indicatorSettings, testId]);

  const getIndicatorColor = (metric, value, options = {}) => {
    const settings = indicatorSettings[metric];
    const expected = options.expected || "increase";

    if (metric === "SE" && value === null) return "red";
    if (metric === "smallSampleWarning" && value === true) return "orange";

    switch (metric) {
      case "pValue":
        if (value < settings.green) return "green";
        if (value < settings.orange) return "orange";
        return "red";
      case "zScore":
        return Math.abs(value) >= settings.threshold ? "green" : "red";
      case "confidenceInterval":
        const [lower, upper] = Array.isArray(value)
          ? value
          : value.split(" - ").map(parseFloat);
        return lower > settings.boundary || upper < settings.boundary
          ? "green"
          : "red";
      case "lift":
        if (expected === "increase") {
          if (value > settings.green) return "green";
          if (value < settings.orange) return "red";
          return "orange";
        } else {
          if (value < settings.orange) return "green";
          if (value > settings.green) return "red";
          return "orange";
        }
      case "power":
        if (value >= settings.green) return "green";
        if (value >= settings.orange) return "orange";
        return "red";
      default:
        return "gray";
    }
  };

  const getIndicatorDescription = (metric, value, label, options = {}) => {
    const settings = indicatorSettings[metric] || {};
    const formattedValue = formatValue(metric, value);

    return (
      <>
        <Typography variant="subtitle2" fontWeight="bold">
          {getMetricCategory(metric)}
        </Typography>
        <Typography variant="body2" fontWeight="bold">
          {label}: {formattedValue}
        </Typography>
        {renderThresholds(metric, settings, options)}
      </>
    );
  };

  const formatValue = (metric, value) => {
    if (metric === "confidenceInterval") {
      if (Array.isArray(value)) {
        return value
          .map((val) =>
            Number(val).toLocaleString("en-EN", { maximumFractionDigits: 4 })
          )
          .join(" / ");
      }
      if (typeof value === "string") {
        return value
          .split(" - ")
          .map((val) =>
            Number(val).toLocaleString("en-EN", { maximumFractionDigits: 4 })
          )
          .join(" / ");
      }
    }
    if (metric === "smallSampleWarning") return value ? "Yes" : "No";
    if (typeof value === "number")
      return value.toLocaleString("en-EN", { maximumFractionDigits: 4 });
    return value;
  };

  const getMetricCategory = (metric) => {
    const categories = {
      pValue: "Statistical Significance & Readiness",
      zScore: "Statistical Significance & Readiness",
      confidenceInterval: "Statistical Significance & Readiness",
      lift: "Effect Size",
      power: "Reliability & Quality",
      SE: "Reliability & Quality",
      smallSampleWarning: "Sample Size Warning",
    };
    return categories[metric] || "Metric";
  };

  const renderThresholds = (metric, settings, options) => {
    // Simplified threshold rendering - would include color-coded thresholds
    return (
      <Typography variant="caption" sx={{ display: "block" }}>
        Thresholds configured based on metric type
      </Typography>
    );
  };

  return {
    indicatorSettings,
    setIndicatorSettings,
    getIndicatorColor,
    getIndicatorDescription,
  };
};
