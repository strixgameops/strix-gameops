import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import {
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Chip,
  Button,
  Fade,
  Grow,
  IconButton,
} from "@mui/material";
import {
  TrendingUp,
  AttachMoney,
  People,
  Compare,
  Clear,
  Close,
  SwapHoriz,
  InfoOutlined,
} from "@mui/icons-material";
import styles from "../css/worldMap.module.css";
import * as geoData from "../../analytics/dashboards/charts/utility/worldGeoData.world.geo.json";

const WorldMap = ({
  selectedGames,
  onCountryClick,
  countryData = {},
  onMetricChange,
  currentMetric = "revenue",
  retentionData = {},
}) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomRef = useRef(null);
  const transformRef = useRef(d3.zoomIdentity);
  const mapGroupRef = useRef(null);
  const countriesRef = useRef(null);
  const labelsGroupRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [metric, setMetric] = useState(currentMetric);
  const [retentionPeriod, setRetentionPeriod] = useState("d7");
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [compareAnimation, setCompareAnimation] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const compareModeRef = useRef(false);
  const selectedCountriesRef = useRef([]);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    compareModeRef.current = compareMode;
  }, [compareMode]);
  
  useEffect(() => {
    selectedCountriesRef.current = selectedCountries;
  }, [selectedCountries]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  const getCurrentData = useCallback(() => {
    if (metric === "retention") {
      // Для retention данных используем retentionData prop с выбранным периодом
      return retentionData[retentionPeriod] || {};
    }
    // Для других метрик используем соответствующие данные из countryData
    return countryData || {};
  }, [metric, retentionPeriod, countryData, retentionData]);

  const formatValue = useCallback((value, metricType) => {
    if (!value && value !== 0) return "0";
    
    if (metricType === "installs") {
      return value >= 1000 ? `${Math.round(value / 1000)}K` : value.toString();
    }
    if (metricType === "revenue") {
      return value >= 1000 ? `$${Math.round(value / 1000)}K` : `$${value}`;
    }
    if (metricType === "retention") {
      return `${value}%`;
    }
    return value.toString();
  }, []);

  const getTopCountries = useCallback(() => {
    const data = getCurrentData();
    if (!data || Object.keys(data).length === 0) {
      return [];
    }
    
    return Object.entries(data)
      .filter(([country, value]) => value && value > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([country, value]) => ({ country, value }));
  }, [getCurrentData]);

  const handleCountryInteraction = useCallback(
    (countryName, event, isClick = false) => {
      if (compareModeRef.current && isClick) {
        const currentSelected = selectedCountriesRef.current;
        if (currentSelected.includes(countryName)) {
          setSelectedCountries(
            currentSelected.filter((c) => c !== countryName)
          );
        } else if (currentSelected.length < 2) {
          setSelectedCountries([...currentSelected, countryName]);
          if (currentSelected.length === 1) {
            setCompareAnimation(true);
            setTimeout(() => setCompareAnimation(false), 600);
          }
        } else {
          // Replace the first selected country with the new one
          setSelectedCountries([currentSelected[1], countryName]);
        }
        return;
      }

      // if (isClick && onCountryClick && !compareModeRef.current) {
      //   const rect = containerRef.current.getBoundingClientRect();
      //   const screenPosition = {
      //     left: event.clientX,
      //     top: event.clientY,
      //   };
      //   onCountryClick(countryName, screenPosition, event);
      // }
    },
    [onCountryClick]
  );

  const handleMouseMove = useCallback((event) => {
    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  const handleMetricChange = useCallback(
    (newMetric) => {
      setMetric(newMetric);
      if (onMetricChange) {
        onMetricChange(newMetric);
      }
    },
    [onMetricChange]
  );

  const swapCountries = useCallback(() => {
    if (selectedCountries.length === 2) {
      setSelectedCountries([selectedCountries[1], selectedCountries[0]]);
    }
  }, [selectedCountries]);

  const clearSelection = useCallback(() => {
    setSelectedCountries([]);
  }, []);

  // Initialize map structure once
  useEffect(() => {
    if (!dimensions.width || !dimensions.height || mapInitialized) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

    // Set up projection and path
    const projection = d3
      .geoNaturalEarth1()
      .scale(width / 6.5)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Create main group for countries
    const g = svg.append("g").attr("class", "map-group");
    mapGroupRef.current = g;

    // Calculate map bounds for translation constraints
    const mapBounds = path.bounds(geoData);
    const mapWidth = mapBounds[1][0] - mapBounds[0][0];
    const mapHeight = mapBounds[1][1] - mapBounds[0][1];

    const padding = 100;
    const maxTranslateX = Math.max(0, (mapWidth - width) / 2 + padding);
    const maxTranslateY = Math.max(0, (mapHeight - height) / 2 + padding);

    // Set up smooth zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.8, 4])
      .translateExtent([
        [-maxTranslateX, -maxTranslateY],
        [width + maxTranslateX, height + maxTranslateY],
      ])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        setCurrentZoom(event.transform.k);
        g.transition()
          .duration(50)
          .ease(d3.easeLinear)
          .attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Create enhanced glow filter
    const defs = svg.append("defs");
    const filter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    filter
      .append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "coloredBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Create pulse animation filter
    const pulseFilter = defs
      .append("filter")
      .attr("id", "pulse")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    pulseFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "6")
      .attr("result", "coloredBlur");

    const pulseMerge = pulseFilter.append("feMerge");
    pulseMerge.append("feMergeNode").attr("in", "coloredBlur");
    pulseMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Create selection animation filter
    const selectFilter = defs
      .append("filter")
      .attr("id", "selection-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    selectFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "8")
      .attr("result", "coloredBlur");

    const selectMerge = selectFilter.append("feMerge");
    selectMerge.append("feMergeNode").attr("in", "coloredBlur");
    selectMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Draw countries
    const countries = g
      .selectAll("path")
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("class", styles.country)
      .style("cursor", "pointer")
      .style("pointer-events", "all")
      .style("transition", "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)")
      .on("mouseenter", function (event, d) {
        setHoveredCountry(d.properties.name);
        d3.select(this)
          .transition()
          .duration(200)
          .ease(d3.easeBackOut)
          .style("stroke-width", "2.5px")
          .style(
            "filter",
            compareMode && selectedCountries.includes(d.properties.name)
              ? "url(#selection-glow)"
              : "url(#pulse)"
          );
      })
      .on("mousemove", handleMouseMove)
      .on("mouseleave", function (event, d) {
        setHoveredCountry(null);
        d3.select(this)
          .transition()
          .duration(200)
          .ease(d3.easeBackOut)
          .style(
            "stroke-width",
            compareMode && selectedCountries.includes(d.properties.name)
              ? "3px"
              : "1px"
          )
          .style(
            "filter",
            compareMode && selectedCountries.includes(d.properties.name)
              ? "url(#selection-glow)"
              : null
          );
      })
      .on("click", (event, d) => {
        if (compareModeRef.current) {
          event.stopPropagation();
          event.preventDefault();
        }
        handleCountryInteraction(d.properties.name, event, true);
      });

    countriesRef.current = countries;

    // Create labels group
    const labelsGroup = g.append("g").attr("class", "labels-group");
    labelsGroupRef.current = labelsGroup;

    setMapInitialized(true);
  }, [dimensions, mapInitialized, handleCountryInteraction, handleMouseMove]);

  // Update map styling when data changes
  useEffect(() => {
    if (!mapInitialized || !countriesRef.current) return;

    const currentData = getCurrentData();
    const dataValues = Object.values(currentData || {}).filter(val => val && val > 0);
    const maxValue = dataValues.length > 0 ? Math.max(...dataValues) : 0;
    const topCountries = getTopCountries();

    // Update country styling with smooth transitions
    countriesRef.current
      .attr("data-selected", (d) => {
        if (compareMode && selectedCountries.includes(d.properties.name)) {
          return selectedCountries[0] === d.properties.name
            ? "first"
            : "second";
        }
        return null;
      })
      .transition()
      .duration(400)
      .ease(d3.easeCubicInOut)
      .style("fill", (d) => {
        const value = currentData?.[d.properties.name] || 0;
        const intensity = maxValue > 0 ? value / maxValue : 0;

        if (compareMode && selectedCountries.includes(d.properties.name)) {
          const isFirst = selectedCountries[0] === d.properties.name;
          return isFirst ? "rgba(98, 95, 244, 0.9)" : "rgba(244, 95, 98, 0.9)";
        }

        return `rgba(98, 95, 244, ${0.15 + intensity * 0.7})`;
      })
      .style("stroke", (d) => {
        if (compareMode && selectedCountries.includes(d.properties.name)) {
          return selectedCountries[0] === d.properties.name
            ? "#625ff4"
            : "#f45f62";
        }
        return "rgba(98, 95, 244, 0.6)";
      })
      .style("stroke-width", (d) => {
        if (compareMode && selectedCountries.includes(d.properties.name)) {
          return "3px";
        }
        return "1px";
      })
      .style("filter", (d) => {
        if (compareMode && selectedCountries.includes(d.properties.name)) {
          return "url(#selection-glow)";
        }
        const value = currentData?.[d.properties.name] || 0;
        if (value > maxValue * 0.7) return "url(#pulse)";
        if (value > 0) return "url(#glow)";
        return "none";
      });

    // Update labels with zoom-aware scaling
    if (labelsGroupRef.current && mapGroupRef.current) {
      labelsGroupRef.current.selectAll("*").remove();

      const svg = d3.select(svgRef.current);
      const { width, height } = dimensions;
      const projection = d3
        .geoNaturalEarth1()
        .scale(width / 6.5)
        .translate([width / 2, height / 2]);
      const path = d3.geoPath().projection(projection);

      // Show labels for top countries or selected countries in compare mode
      const countriesToLabel =
        compareMode && selectedCountries.length > 0
          ? selectedCountries.map((country) => ({
              country,
              value: currentData?.[country] || 0,
            }))
          : topCountries.slice(0, 15);

      countriesToLabel.forEach(({ country, value }) => {
        const feature = geoData.features.find(
          (f) => f.properties.name === country
        );
        if (feature) {
          const centroid = path.centroid(feature);
          const formattedValue = formatValue(value, metric);

          const isSelected = compareMode && selectedCountries.includes(country);
          const bgColor = isSelected
            ? selectedCountries[0] === country
              ? "rgba(98, 95, 244, 0.9)"
              : "rgba(244, 95, 98, 0.9)"
            : "rgba(0, 0, 0, 0.7)";

          const clampedZoom = clamp(currentZoom, 1, 2);

          const labelGroup = labelsGroupRef.current
            .append("g")
            .attr("class", "label-group")
            .attr(
              "transform",
              `translate(${centroid[0]}, ${centroid[1]}) scale(${1 / clampedZoom})`
            );

          const rectWidth = 60 * (1 / clampedZoom);
          const rectHeight = 20 * (1 / clampedZoom);
          const fontSize = 12 * (1 / clampedZoom);

          function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
          }

          labelGroup
            .append("rect")
            .attr("x", -rectWidth / 2)
            .attr("y", -rectHeight / 2)
            .attr("width", rectWidth)
            .attr("height", rectHeight)
            .attr("rx", rectHeight / 2)
            .style("fill", bgColor)
            .style("pointer-events", "none")
            .style("opacity", 0)
            .transition()
            .duration(300)
            .style("opacity", 1);

          labelGroup
            .append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("fill", "#ffffff")
            .style("font-size", `${fontSize}px`)
            .style("font-weight", "bold")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .text(formattedValue)
            .transition()
            .duration(300)
            .style("opacity", 1);
        }
      });
    }
  }, [
    getCurrentData,
    getTopCountries,
    formatValue,
    metric,
    compareMode,
    selectedCountries,
    mapInitialized,
    dimensions,
    currentZoom,
  ]);

  return (
    <div
      ref={containerRef}
      className={styles.mapContainer}
      onMouseMove={handleMouseMove}
    >
      {/* Toolbar */}
      <Paper className={styles.toolbar}>
        <Box className={styles.toolbarSection}>
          <Typography variant="body2" className={styles.toolbarLabel}>
            Metric:
          </Typography>
          <ToggleButtonGroup
            value={metric}
            exclusive
            onChange={(e, value) => value && handleMetricChange(value)}
            size="small"
            className={styles.toggleGroup}
          >
            <ToggleButton value="installs" className={styles.toggleButton}>
              <People fontSize="small" />
              Installs
            </ToggleButton>
            <ToggleButton value="revenue" className={styles.toggleButton}>
              <AttachMoney fontSize="small" />
              Revenue
            </ToggleButton>
            <ToggleButton value="retention" className={styles.toggleButton}>
              <TrendingUp fontSize="small" />
              Retention
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {metric === "retention" && (
          <Box className={styles.toolbarSection}>
            <Typography variant="body2" className={styles.toolbarLabel}>
              Period:
            </Typography>
            <ToggleButtonGroup
              value={retentionPeriod}
              exclusive
              onChange={(e, value) => value && setRetentionPeriod(value)}
              size="small"
              className={styles.toggleGroup}
            >
              <ToggleButton value="d1" className={styles.toggleButton}>
                D1
              </ToggleButton>
              <ToggleButton value="d3" className={styles.toggleButton}>
                D3
              </ToggleButton>
              <ToggleButton value="d7" className={styles.toggleButton}>
                D7
              </ToggleButton>
              <ToggleButton value="d30" className={styles.toggleButton}>
                D30
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        <Box className={styles.toolbarSection}>
          <Button
            variant={compareMode ? "contained" : "outlined"}
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedCountries([]);
            }}
            startIcon={compareMode ? <Clear /> : <Compare />}
            className={styles.compareButton}
            size="small"
          >
            {compareMode ? "Exit Compare" : "Compare"}
          </Button>
        </Box>
      </Paper>

      {/* Compare Info with fluid animations */}
      {compareMode && (
        <Grow in={compareMode} timeout={400}>
          <Paper
            className={`${styles.compareInfo} ${compareAnimation ? styles.compareInfoAnimate : ""}`}
          >
            {selectedCountries.length === 0 && (
              <Fade in={selectedCountries.length === 0} timeout={300}>
                <Box className={styles.compareContent}>
                  <InfoOutlined className={styles.compareIcon} />
                  <Typography variant="body2" className={styles.compareText}>
                    Click on two countries to compare their {metric}
                  </Typography>
                </Box>
              </Fade>
            )}

            {selectedCountries.length === 1 && (
              <Fade in={selectedCountries.length === 1} timeout={300}>
                <Box className={styles.compareContent}>
                  <Box className={styles.selectedCountry}>
                    <Chip
                      label={selectedCountries[0]}
                      size="small"
                      className={styles.countryChip1}
                      onDelete={clearSelection}
                    />
                  </Box>
                  <Typography variant="body2" className={styles.comparePrompt}>
                    Select one more country...
                  </Typography>
                </Box>
              </Fade>
            )}

            {selectedCountries.length === 2 && (
              <Fade in={selectedCountries.length === 2} timeout={300}>
                <Box className={styles.compareResults}>
                  <IconButton
                    size="small"
                    onClick={clearSelection}
                    className={styles.clearButton}
                  >
                    <Close fontSize="small" />
                  </IconButton>

                  <Box className={styles.compareMetrics}>
                    <Box className={styles.countryMetric}>
                      <Typography
                        variant="caption"
                        className={styles.countryLabel}
                      >
                        {selectedCountries[0]}
                      </Typography>
                      <Typography variant="h6" className={styles.countryValue1}>
                        {formatValue(
                          getCurrentData()[selectedCountries[0]] || 0,
                          metric
                        )}
                      </Typography>
                    </Box>

                    <IconButton
                      size="small"
                      onClick={swapCountries}
                      className={styles.swapButton}
                    >
                      <SwapHoriz />
                    </IconButton>

                    <Box className={styles.countryMetric}>
                      <Typography
                        variant="caption"
                        className={styles.countryLabel}
                      >
                        {selectedCountries[1]}
                      </Typography>
                      <Typography variant="h6" className={styles.countryValue2}>
                        {formatValue(
                          getCurrentData()[selectedCountries[1]] || 0,
                          metric
                        )}
                      </Typography>
                    </Box>
                  </Box>

                  <Box className={styles.compareDifference}>
                    {(() => {
                      const data = getCurrentData();
                      const val1 = data[selectedCountries[0]] || 0;
                      const val2 = data[selectedCountries[1]] || 0;
                      const diff = val1 - val2;
                      const diffPercent =
                        val2 > 0 ? ((diff / val2) * 100).toFixed(1) : 0;
                      const winner =
                        val1 > val2
                          ? selectedCountries[0]
                          : selectedCountries[1];

                      return (
                        <>
                          <Typography
                            variant="caption"
                            className={styles.differenceLabel}
                          >
                            {winner} leads by
                          </Typography>
                          <Box className={styles.differenceValues}>
                            <Chip
                              label={formatValue(Math.abs(diff), metric)}
                              size="small"
                              className={styles.differenceChip}
                            />
                            <Chip
                              label={`${Math.abs(diffPercent)}%`}
                              size="small"
                              className={
                                val1 > val2
                                  ? styles.positiveChip
                                  : styles.negativeChip
                              }
                            />
                          </Box>
                        </>
                      );
                    })()}
                  </Box>
                </Box>
              </Fade>
            )}
          </Paper>
        </Grow>
      )}

      {/* Hover tooltip that follows mouse */}
      {hoveredCountry && !compareMode && (
        <Paper
          className={styles.hoverTooltip}
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 50,
          }}
        >
          <Typography variant="body2" className={styles.tooltipCountry}>
            {hoveredCountry}
          </Typography>
          <Typography variant="h6" className={styles.tooltipValue}>
            {formatValue(getCurrentData()[hoveredCountry] || 0, metric)}
          </Typography>
        </Paper>
      )}

      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className={styles.worldMapSvg}
      />
    </div>
  );
};

export default WorldMap;