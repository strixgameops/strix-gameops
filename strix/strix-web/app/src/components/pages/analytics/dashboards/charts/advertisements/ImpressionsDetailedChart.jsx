import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { select, geoPath, geoMercator, min, max, scaleLinear } from "d3";
import useResizeObserver from "../utility/useResizeObserver";
import Chip from "@mui/material/Chip";

import s from "../css/detailedAdImpressionsChart.module.css";
import Skeleton from "@mui/material/Skeleton";

// Date modules
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";

// Table view
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { withStyles } from "@mui/material/styles";

import { Tooltip } from "chart.js";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

// For coloring
import chroma from "chroma-js";

const ImpressionsDetailedChart = ({ chartObj, dateRange }) => {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [chartRendered, setChartRendered] = useState(false);

  const [currentGranularity, setCurrentGranularity] = useState();
  const currentGranularityRef = useRef(null);
  currentGranularityRef.current = currentGranularity;

  const chartRef = useRef(null);

  const [showNoDataError, setShowNoDataError] = useState();

  const [currentDeltaValue, setCurrentDeltaValue] = useState(0);

  const availableNetworks = [
    "AdMob",
    "AdColony",
    "Applovin",
    "Applovin MAX",
    "Facebook",
    "Fyber",
    "HyprMX",
    "ironSource",
    "MoPub",
    "myTarget",
    "Vungle",
    "Yandex",
    "Unity Ads",
  ];

  // Function for loading new data to chart (or updating). Initial data is set in drawChart()
  function updateData(newData) {
    if (
      chartRef.current !== undefined &&
      chartRef.current !== null &&
      !showNoDataError
    ) {
      let dataset = newData.map((dataItem) =>
        getTotalImpressionsByNetwork(
          dataItem.networkName.toLowerCase().replace(/\s+/g, "")
        )
      );

      function addData(chart) {
        chart.data.labels = newData.map((dataItem) =>
          availableNetworks.find(
            (n) =>
              n.toLowerCase().replace(/\s+/g, "") ===
              dataItem.networkName.toLowerCase().replace(/\s+/g, "")
          )
        );
        chart.data.datasets[0].data = dataset;
        chart.update();
      }
      addData(chartRef.current);
    }
  }

  // If data changes, toggle update
  useEffect(() => {
    if (chartObj.data.data !== undefined && !chartObj.isError) {
      setCurrentDeltaValue(chartObj.data.deltaValue);

      if (chartObj.data.data.length > 0) {
        // Check if any data is present before updating chart. Chart with no data is ugly so we dont want to show it
        setShowNoDataError(false);
        setShowSkeleton(false);

        if (chartRendered) {
          updateData(chartObj.data.data);
        } else {
          // If we didnt draw the chart yet, do it now
          drawChart();
        }
      } else {
        // If no data returned, show "No Data"
        setShowSkeleton(false);
        setShowNoDataError(true);
      }
    } else {
      // If data is undefined, we check again if delta or granularity undefined too.
      // If they are NOT undefined, it means we just had no data for the given date range
      if (!chartObj.isError) {
        setShowSkeleton(true);
      } else {
        setShowSkeleton(false);
        setShowNoDataError(true);
      }
    }
  }, [chartObj]);

  useEffect(() => {
    if (!showSkeleton) {
      drawChart();
    }
  }, [showSkeleton]);

  useEffect(() => {
    if (showNoDataError && chartRef.current !== null) {
      chartRef.current.destroy();
    } else {
      // We want to invalidate and redraw the chart by force after we change showing No Data error. Otherwise rect elements will turn black for some reason
      // Reminder: all this behavior is caused by appending noDataChart class to .chart div.
      drawChart(true);
    }
  }, [showNoDataError]);

  // REQUIRED: Use this useEffect on mount since otherwise "bindto" won't find an element to bind chart to and it will just be put into the page's body.
  // This is because the DOM is not loaded yet if we call it outside of a hook, and no such element with id is yet present.
  function drawChart(forceRedraw) {
    if (
      document.getElementById(`histotableChart${chartObj.chartID}`) !== null
    ) {
      // Still check if any data is present, even if forceRedraw = true. And make sure
      // ...we dont draw chart when isError is true (that means there are no data by some reason, wrong date range or just absolutely no data)
      if (
        ((chartObj.data.data === undefined || chartRendered === true) &&
          !forceRedraw) ||
        chartObj.isError
      )
        return;

      if (chartRef.current !== null) {
        chartRef.current.destroy();
      }
      // console.log(chartObj)
      // console.log('Date range in X axis [0]:', dateRange[0].hour(0).minute(0).second(0).millisecond(0).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'))
      // console.log('Date range in X axis [1]:', dateRange[1].hour(23).minute(59).second(59).millisecond(999).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'))
      const canvasObj = document
        .getElementById(`histotableChart${chartObj.chartID}`)
        .getContext("2d");
      const chart = new Chart(canvasObj, {
        type: "pie",
        data: {
          labels: chartObj.data.data.map((dataItem) =>
            availableNetworks.find(
              (n) =>
                n.toLowerCase().replace(/\s+/g, "") ===
                dataItem.networkName.toLowerCase().replace(/\s+/g, "")
            )
          ),
          datasets: [
            {
              data: chartObj.data.data.map((dataItem) =>
                getTotalImpressionsByNetwork(
                  dataItem.networkName.toLowerCase().replace(/\s+/g, "")
                )
              ),

              // Picking color from available pool
              backgroundColor: [
                "rgba(255, 99, 132, 0.2)",
                "rgba(255, 159, 64, 0.2)",
                "rgba(255, 205, 86, 0.2)",
                "rgba(75, 192, 192, 0.2)",
                "rgba(54, 162, 235, 0.2)",
                "rgba(153, 102, 255, 0.2)",
                "rgba(201, 203, 207, 0.2)",
                "rgba(128, 0, 0, 0.2)",
                "rgba(0, 128, 0, 0.2)",
                "rgba(0, 0, 128, 0.2)",
                "rgba(255, 0, 0, 0.2)",
                "rgba(0, 255, 0, 0.2)",
                "rgba(0, 0, 255, 0.2)",
                "rgba(128, 128, 0, 0.2)",
                "rgba(128, 0, 128, 0.2)",
                "rgba(0, 128, 128, 0.2)",
                "rgba(192, 192, 192, 0.2)",
                "rgba(255, 165, 0, 0.2)",
                "rgba(255, 192, 203, 0.2)",
              ],
              borderColor: [
                "rgb(255, 99, 132)",
                "rgb(255, 159, 64)",
                "rgb(255, 205, 86)",
                "rgb(75, 192, 192)",
                "rgb(54, 162, 235)",
                "rgb(153, 102, 255)",
                "rgb(201, 203, 207)",
                "rgb(128, 0, 0)",
                "rgb(0, 128, 0)",
                "rgb(0, 0, 128)",
                "rgb(255, 0, 0)",
                "rgb(0, 255, 0)",
                "rgb(0, 0, 255)",
                "rgb(128, 128, 0)",
                "rgb(128, 0, 128)",
                "rgb(0, 128, 128)",
                "rgb(192, 192, 192)",
                "rgb(255, 165, 0)",
                "rgb(255, 192, 203)",
              ],
              borderWidth: 1,
            },
          ],
        },
        options: {
          // Resize funnel to be the width and height of it's container
          // Requires dedicated <div> around <canvas>
          maintainAspectRatio: false,

          plugins: {
            legend: {
              display: chartObj.chartSettings.showLegend,
              position: chartObj.chartSettings.legendPosition,
            },
            // Tooltip on hovering exact day
            tooltip: {
              enabled: true,
              intersect: false,
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || "";
                  if (context.parsed !== null) {
                    // Making space between the label and text
                    label += " ";

                    // Put format at start if needed
                    if (chartObj.metricFormatPosition === "start") {
                      label += chartObj.metricFormat;
                    }

                    label += `${formatValue(context.parsed)}`;

                    // Put format at start if needed
                    if (chartObj.metricFormatPosition === "end") {
                      label += chartObj.metricFormat;
                    }

                    label += `${chartObj.chartSettings.tooltipText}`;
                  }
                  return label;
                },
              },
            },
            // Labels
            datalabels: {
              display: false,
              color: "#36A2EB",
              formatter: (value, context) => {
                const label = context.chart.data.labels[context.dataIndex];
                return `${label}\n${"aboba".toLocaleString()}%`;
              },
            },
          },
        },
      });

      setChartRendered(true);
      chartRef.current = chart;
    }
  }
  useEffect(() => {
    drawChart();
  }, []);

  useEffect(() => {
    if (dateRange[0] === null || dateRange[1] === null) return;

    if (chartRef.current !== undefined && chartRef.current !== null) {
      chartRef.current.destroy();
      drawChart(true);
    }
  }, [dateRange]);

  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: "none",
      color: theme.palette.common.white,
    },
    [`&.${tableCellClasses.body}`]: {
      fontSize: 14,
    },
  }));
  const StyledTableRow = styled(TableRow)(({ theme }) => ({
    "&": {
      backgroundColor: "rgba(0,0,0,0)",
    },
  }));

  function formatValue(value) {
    // Format 1000 to 1 000

    const parsedValue = parseFloat(value).toFixed(0).toString();

    const formattedDollars = parsedValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    const formattedValue = `${formattedDollars}`;

    return formattedValue;
  }

  function getTotalImpressionsByNetwork(networkName) {
    const networkData = chartObj.data.data.find(
      (item) => item.networkName === networkName
    );

    if (networkData) {
      const { impressions } = networkData;
      const impressionsSum = Object.values(impressions).reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        0
      );

      return impressionsSum;
    }

    return 0; //  0,
  }

  function getImpressionsByType(networkName, fieldName) {
    const networkData = chartObj.data.data.find(
      (item) => item.networkName === networkName
    );
    if (networkData) {
      const { impressions } = networkData;
      const fieldValue = impressions[fieldName];

      return fieldValue;
    }

    return null; //  null,
  }

  function getImpressionsByType(networkName, fieldName) {
    const networkData = chartObj.data.data.find(
      (item) => item.networkName === networkName
    );
    if (networkData) {
      const { impressions } = networkData;
      const fieldValue = impressions[fieldName];

      return fieldValue;
    }

    return null; //  null,
  }

  console.log(chartObj);
  return (
    <div className={s.LineChartBody}>
      <div className={s.innerBodyWrapper}>
        <div className={s.leftSide}>
          <div className={s.LineChartUpper}>
            {/* Chart Name */}
            <div className={s.LineChartName}>
              {showSkeleton ? (
                <div className={s.LineChartSkeletonContainer}>
                  <Skeleton
                    animation="wave"
                    variant="text"
                    sx={{ fontSize: "2rem", width: "200px" }}
                  />
                </div>
              ) : (
                chartObj.name
              )}
            </div>

            <div className={s.LineChartDeltaLabel}>
              {showSkeleton ? (
                <div className={s.LineChartSkeletonContainer}>
                  <Skeleton
                    animation="wave"
                    variant="text"
                    sx={{ fontSize: "2rem", width: "50px" }}
                  />
                </div>
              ) : (
                // Set delta value and it's classes. Green if positive, red if negative, grey if 0
                <div
                  className={`${currentDeltaValue > 0 ? s.positiveDelta : currentDeltaValue < 0 ? s.negativeDelta : s.neutralDelta}`}
                >
                  {chartObj.chartSettings.showDelta ? (
                    <span>
                      {currentDeltaValue >= 0 ? "+" : "-"}

                      {chartObj.metricFormatPosition === "start" &&
                        chartObj.metricFormat}
                      {Math.abs(currentDeltaValue)}
                      {chartObj.metricFormatPosition === "end" &&
                        chartObj.metricFormat}
                    </span>
                  ) : (
                    <div></div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={s.LineChart}>
            {showSkeleton
              ? [
                  <Skeleton
                    key="1"
                    animation="wave"
                    variant="rectangle"
                    sx={{ width: "100%", height: "90%", marginBottom: 1 }}
                  />,
                  <Skeleton
                    key="2"
                    animation="wave"
                    variant="rectangle"
                    sx={{ width: "100%", height: "130px", marginBottom: 1 }}
                  />,
                  <Skeleton
                    key="3"
                    animation="wave"
                    variant="text"
                    sx={{ fontSize: "1rem", width: "20%" }}
                  />,
                ]
              : [
                  <div className={s.ChartContainerOnly}>
                    <canvas
                      className={`${s.chart} ${showNoDataError ? s.noDataChart : ""}`}
                      id={`histotableChart${chartObj.chartID}`}
                    ></canvas>
                  </div>,

                  showNoDataError &&
                    (chartObj.chartSettings.customNoDataLabel !== undefined ? (
                      <div className={s.noDataLabel}>
                        {chartObj.chartSettings.customNoDataLabel}
                      </div>
                    ) : (
                      <div className={s.noDataLabel}>No Data</div>
                    )),
                ]}
          </div>
        </div>

        <div className={s.dataTable}>
          {showSkeleton ? (
            <Skeleton
              animation="wave"
              variant="rectangle"
              sx={{ width: "95%", height: "95%", marginLeft: "35px" }}
            />
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                height: "220px",
                backgroundColor: "rgba(0,0,0,0)",
                backgroundImage: "none",
                boxShadow: "none",
              }}
            >
              <Table stickyHeader size="small" aria-label="simple table">
                <TableHead>
                  {/* Building fancy table view. This is headers & borders between them (i.e. expenses and income are separated).
                Empty cells are crucial for proper positions  */}
                  <StyledTableRow>
                    <StyledTableCell
                      align="center"
                      sx={{ minWidth: "fit-content", whiteSpace: "pre" }}
                    ></StyledTableCell>
                    <StyledTableCell
                      align="center"
                      sx={{ minWidth: "fit-content", whiteSpace: "pre" }}
                    ></StyledTableCell>
                    <StyledTableCell
                      align="center"
                      sx={{
                        minWidth: "fit-content",
                        whiteSpace: "pre",
                        borderLeft: `1px solid rgba(81, 81, 81, 1)`,
                      }}
                    ></StyledTableCell>
                    <StyledTableCell
                      align="center"
                      sx={{
                        minWidth: "fit-content",
                        whiteSpace: "pre",
                        textAlign: "center",
                      }}
                    >
                      Impressions (per type)
                    </StyledTableCell>
                    <StyledTableCell
                      align="center"
                      sx={{ minWidth: "fit-content", whiteSpace: "pre" }}
                    ></StyledTableCell>
                  </StyledTableRow>

                  <StyledTableRow>
                    <StyledTableCell>Network</StyledTableCell>
                    <StyledTableCell
                      align="center"
                      sx={{
                        minWidth: "fit-content",
                        whiteSpace: "pre",
                        borderLeft: `1px solid rgba(81, 81, 81, 1)`,
                      }}
                    >
                      Total Impressions
                    </StyledTableCell>

                    {/* Per type */}
                    <StyledTableCell
                      align="center"
                      sx={{
                        minWidth: "fit-content",
                        whiteSpace: "pre",
                        borderLeft: `1px solid rgba(81, 81, 81, 1)`,
                      }}
                    >
                      Rewarded
                    </StyledTableCell>
                    <StyledTableCell
                      align="center"
                      sx={{ minWidth: "fit-content", whiteSpace: "pre" }}
                    >
                      Interstitial
                    </StyledTableCell>
                    <StyledTableCell
                      align="center"
                      sx={{ minWidth: "fit-content", whiteSpace: "pre" }}
                    >
                      Banners
                    </StyledTableCell>
                  </StyledTableRow>
                </TableHead>

                <TableBody>
                  {chartObj.data.data !== undefined &&
                    availableNetworks
                      .filter((network) =>
                        chartObj.data.networks.includes(
                          network.toLowerCase().replace(/\s+/g, "")
                        )
                      )
                      .map((network, networkIndex) => (
                        <TableRow
                          key={network}
                          sx={{
                            "&:last-child td, &:last-child th": {
                              borderBottom: 0,
                            },
                          }}
                        >
                          <TableCell
                            component="th"
                            scope="row"
                            sx={{ fontSize: 13 }}
                          >
                            {network}
                          </TableCell>

                          <TableCell
                            align="center"
                            sx={{
                              fontSize: 13,
                              borderLeft: `1px solid rgba(81, 81, 81, 1)`,
                            }}
                          >
                            {formatValue(
                              getTotalImpressionsByNetwork(
                                network.toLowerCase().replace(/\s+/g, "")
                              )
                            )}
                          </TableCell>

                          {/* Impressions by type */}
                          <TableCell
                            align="center"
                            sx={{
                              fontSize: 13,
                              borderLeft: `1px solid rgba(81, 81, 81, 1)`,
                            }}
                          >
                            {formatValue(
                              getImpressionsByType(
                                network.toLowerCase().replace(/\s+/g, ""),
                                "rewarded"
                              )
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: 13 }}>
                            {formatValue(
                              getImpressionsByType(
                                network.toLowerCase().replace(/\s+/g, ""),
                                "interstitial"
                              )
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: 13 }}>
                            {formatValue(
                              getImpressionsByType(
                                network.toLowerCase().replace(/\s+/g, ""),
                                "banner"
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpressionsDetailedChart;
