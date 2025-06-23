import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import s from "./dashboard.module.css";
import sTable from "./charts/css/offersSalesAndProfileDataTable.module.css";

import LineChart from "./charts/LineChart";
import { Typography, IconButton, Tooltip } from "@mui/material";
import PercentIcon from "@mui/icons-material/Percent";
import { customAlphabet } from "nanoid";
import shortid from "shortid";

import useApi from "@strix/api";
import { Helmet } from "react-helmet";
import titles from "titles";
import DataTable from "./charts/realMoney/DataTable";

const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);
const DashboardRetention = ({
  defaultChartObj,
  filterDate,
  filterDateSecondary,
  filterSegments,
  game,
  branch,
  environment,
  includeBranchInAnalytics,
  includeEnvironmentInAnalytics,
}) => {
  const { getRetentionBig } = useApi();
  const { link } = useParams();
  const isFetchingData = useRef(false);

  // Add state for table
  const [retentionTableData, setRetentionTableData] = useState([]);

  // Add state for toggling between normal and percentage display
  const [isPercentileView, setIsPercentileView] = useState(true);

  // Save original table data for toggling display modes
  const [originalTableData, setOriginalTableData] = useState([]);

  // Color array for different segments
  const segmentColors = [
    "#CD6F00",
    "#4287f5",
    "#32CD32",
    "#FF6347",
    "#9370DB",
    "#20B2AA",
    "#FF8C00",
    "#4169E1",
    "#8A2BE2",
    "#E91E63",
  ];
  const [dashboardSettings, setDashboardSettings] = useState({
    charts: [
      // Retention
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "Retention",
        metricName: "retention",
        data: {},
        chartSettings: {
          type: "line",
          showDelta: false,
          deltaFormat: "$",
          deltaFormatPosition: "start",
          showLegend: true,
          ticks: {
            y: {
              customTickFormatY: false,
              customTickFormatYType: "",
              tooltipText: " ",
              metricFormat: "",
              metricFormatPosition: "start",
            },
          },
          fullWidth: true,
          customWidth: "100%",
          customHeight: 550,
        },
        categoryField: "day",
        datasetsConfigs: [
          {
            config: {
              type: "line",
              label: "All Users",
              yAxisID: "y",
              borderColor: "#CD6F00",
              backgroundColor: "#CD6F00",
              borderWidth: 3,
              pointRadius: 2,
              pointHoverRadius: 5,
              stack: "2",
            },
            valueField: "retention_AllUsers",
          },
        ],
      },
    ],
  });

  // State for dynamic retention table columns
  const [retentionColumns, setRetentionColumns] = useState([
    {
      field: "segment",
      headerName: "Segment",
      width: 200,
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "start",
            padding: "0 8px",
          }}
        >
          <Typography
            variant={"body1"}
            color={"text.secondary"}
            sx={{
              whiteSpace: "nowrap",
              fontSize: "14px",
              fontWeight: "600",
              textAlign: "left",
              verticalAlign: "middle",
            }}
          >
            {params.value || "All Users"}
          </Typography>
        </div>
      ),
    },
    // Other columns will be added dynamically when getting data
  ]);

  const [isLoading_Retention, setIsLoading_Retention] = useState(false);

  // Function to handle table column width changes
  const onColumnsChange_retention = (event) => {
    setRetentionColumns((prevColumns) =>
      prevColumns.map((column) =>
        column.field === event.colDef.field
          ? { ...column, width: event.colDef.width }
          : column
      )
    );
  };

  // Handler for toggling display modes
  const togglePercentileView = () => {
    // Toggle display mode
    setIsPercentileView(!isPercentileView);
  };

  // Effect to update table display when display mode changes
  useEffect(() => {
    if (originalTableData.length > 0) {
      updateDataDisplay();

      // Also update table columns to apply changes to cell rendering
      setRetentionColumns((prevColumns) => {
        return prevColumns.map((column) => {
          // Don't change segment column
          if (column.field === "segment") return column;

          // For other columns, update rendering with current display mode
          return {
            ...column,
            renderCell: (params) => (
              <div
                style={{
                  display: "flex",
                  height: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "end",
                  padding: isPercentileView ? "0 10px 0 16px" : "0 16px", // Shift right in percentage mode
                }}
              >
                <Typography
                  variant={"body1"}
                  color={`text.primary`}
                  sx={{
                    whiteSpace: "nowrap",
                    fontSize: "14px",
                    fontWeight: "700",
                    textAlign: "center",
                    verticalAlign: "middle",
                    color: parseInt(params.value) > 50 ? "#00c50a" : "inherit",
                  }}
                  className={sTable.itemValue}
                >
                  {params.value !== null && params.value !== undefined
                    ? isPercentileView
                      ? `${params.value}%`
                      : params.value
                    : "N/A"}
                </Typography>
              </div>
            ),
          };
        });
      });
    }
  }, [isPercentileView, originalTableData]);

  // Function to update data display based on display mode
  const updateDataDisplay = () => {
    if (!originalTableData || originalTableData.length === 0) {
      return; // Exit if no data
    }

    const isCohortsGraph =
      filterDateSecondary &&
      filterDateSecondary.startDate &&
      filterDateSecondary.endDate;
    const baseDay = isCohortsGraph ? "Day 0" : "Day 1";

    if (isPercentileView) {
      // If percentage view is enabled, convert numbers to percentages
      const percentileData = originalTableData.map((row) => {
        const baseValue = row[baseDay];

        if (baseValue === undefined || baseValue === null || baseValue === 0) {
          return row; // If no base value, leave row unchanged
        }

        const percentileRow = { ...row };

        // Convert each value to percentage of base day
        Object.keys(row).forEach((key) => {
          if (key !== "segment" && key !== "id") {
            if (row[key] !== null && row[key] !== undefined) {
              if (key === baseDay) {
                percentileRow[key] = 100; // Base day is always 100%
              } else {
                percentileRow[key] = parseFloat(
                  ((row[key] / baseValue) * 100).toFixed(2)
                );
              }
            }
          }
        });

        return percentileRow;
      });

      setRetentionTableData(percentileData);
    } else {
      // Return to original data
      setRetentionTableData(originalTableData);
    }
  };

  async function fetchRetention() {
    setIsLoading_Retention(true);

    let secondaryDateParams = null;
    if (
      filterDateSecondary &&
      filterDateSecondary.startDate &&
      filterDateSecondary.endDate
    ) {
      secondaryDateParams = [
        filterDateSecondary.startDate.toISOString(),
        filterDateSecondary.endDate.toISOString(),
      ];
    }

    // Create object for request parameters
    const requestParams = {
      gameID: game.gameID,
      branch: branch,
      environment: environment,
      includeBranchInAnalytics: includeBranchInAnalytics,
      includeEnvironmentInAnalytics: includeEnvironmentInAnalytics,
      filterDate: [
        filterDate.startDate.toISOString(),
        filterDate.endDate.toISOString(),
      ],
      filterSegments: filterSegments.map((segment) => segment.segmentID),
      filterDateSecondary: secondaryDateParams,
    };

    try {
      const response = await getRetentionBig(requestParams);

      if (!response.success) {
        setRetentionTableData([]);
        setOriginalTableData([]);
        setDashboardSettings((prevDashboards) => {
          return {
            ...prevDashboards,
            charts: prevDashboards.charts.map((chart) => {
              if (chart.metricName === "retention") {
                return {
                  ...chart,
                  data: {},
                };
              }
              return chart;
            }),
          };
        });
      } else {
        if (response.message && Array.isArray(response.message)) {
          // Collect all unique days from data of all segments
          const uniqueDays = new Set();
          response.message.forEach((segmentInfo) => {
            if (segmentInfo.data && Array.isArray(segmentInfo.data)) {
              segmentInfo.data.forEach((item) => {
                if (item.day) {
                  uniqueDays.add(item.day);
                }
              });
            }
          });

          // Sort days by number
          const sortedDays = Array.from(uniqueDays).sort((a, b) => {
            //      "Day 0", "Day 1"  ..
            const dayA = parseInt(a.split(" ")[1]);
            const dayB = parseInt(b.split(" ")[1]);
            return dayA - dayB;
          });

          // Create mapping segmentID -> segmentName
          const segmentNameMap = {};
          filterSegments.forEach((segment) => {
            segmentNameMap[segment.segmentID] = segment.segmentName;
          });

          // Prepare new datasetsConfigs for chart
          const newDatasetsConfigs = [];

          // Get segment data for mapping
          const segmentsInfo = response.message.map((segmentInfo, index) => {
            const segmentID = segmentInfo.segmentId;
            // Use segmentName from mapping or fallback to segmentID if not found
            // Special handling for 'everyone'
            let segmentName =
              segmentID === "everyone"
                ? "All Users"
                : segmentNameMap[segmentID] || segmentID;
            const color = segmentColors[index % segmentColors.length];

            return {
              segmentID,
              segmentName,
              color,
              data: segmentInfo.data || [],
            };
          });

          // Group data by day for chart
          const groupedData = {};

          segmentsInfo.forEach((segmentInfo) => {
            if (segmentInfo.data && Array.isArray(segmentInfo.data)) {
              segmentInfo.data.forEach((item) => {
                if (!groupedData[item.day]) {
                  groupedData[item.day] = {
                    day: item.day, // Keep "Day X" format as is for chart
                    timestamp: item.timestamp,
                  };
                }
                // Create unique field for each segment
                groupedData[item.day][`retention_${segmentInfo.segmentName}`] =
                  item.retention;
              });
            }
          });

          // Convert grouped data to array and sort by day order
          const chartData = Object.values(groupedData).sort((a, b) => {
            //      "Day 0", "Day 1"  ..
            const dayA = parseInt(a.day.split(" ")[1]);
            const dayB = parseInt(b.day.split(" ")[1]);
            return dayA - dayB;
          });

          // Create datasetsConfigs for each segment, using segmentName
          segmentsInfo.forEach((segmentInfo) => {
            newDatasetsConfigs.push({
              config: {
                type: "line",
                label: segmentInfo.segmentName, // Use segmentName in chart legend
                yAxisID: "y",
                borderColor: segmentInfo.color,
                backgroundColor: segmentInfo.color,
                borderWidth: 3,
                pointRadius: 2,
                pointHoverRadius: 5,
                stack: "2",
              },
              valueField: `retention_${segmentInfo.segmentName}`, // Use segmentName in value field
            });
          });

          // Update columns for table based on received days
          const newColumns = [
            // Keep first column with segment
            retentionColumns[0],
          ];

          // Calculate flex for each column for even distribution
          const columnFlex = 1;

          // Add columns for each day
          sortedDays.forEach((day) => {
            newColumns.push({
              field: day,
              headerName: day, //     (, "Day 0")
              type: "number",
              width: 120,
              flex: columnFlex,
              minWidth: 100,
              renderCell: (params) => (
                <div
                  style={{
                    display: "flex",
                    height: "100%",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "end",
                    padding: isPercentileView ? "0 10px 0 16px" : "0 16px", // Shift right in percentage mode
                  }}
                >
                  <Typography
                    variant={"body1"}
                    color={`text.primary`}
                    sx={{
                      whiteSpace: "nowrap",
                      fontSize: "14px",
                      fontWeight: "700",
                      textAlign: "center",
                      verticalAlign: "middle",
                      color:
                        parseInt(params.value) > 50 ? "#00c50a" : "inherit",
                    }}
                    className={sTable.itemValue}
                  >
                    {params.value !== null && params.value !== undefined
                      ? isPercentileView
                        ? `${params.value}%`
                        : params.value
                      : "N/A"}
                  </Typography>
                </div>
              ),
            });
          });

          setRetentionColumns(newColumns);

          // Prepare data for table
          const tableData = [];

          // Create rows for each segment, using segmentName
          segmentsInfo.forEach((segmentInfo) => {
            const segmentRow = {
              id: shortid.generate(),
              segment: segmentInfo.segmentName, // Use segmentName in table
            };

            // Fill values by days
            if (segmentInfo.data && Array.isArray(segmentInfo.data)) {
              sortedDays.forEach((day) => {
                const dayData = segmentInfo.data.find(
                  (item) => item.day === day
                );
                segmentRow[day] = dayData ? dayData.retention : 0;
              });
            }

            tableData.push(segmentRow);
          });

          // Save original data for subsequent display mode switching
          setOriginalTableData(tableData);

          // Apply appropriate format based on current display mode
          if (isPercentileView) {
            const isCohortsGraph =
              filterDateSecondary &&
              filterDateSecondary.startDate &&
              filterDateSecondary.endDate;
            const baseDay = isCohortsGraph ? "Day 0" : "Day 1";

            // Convert data to percentage format
            const percentileData = tableData.map((row) => {
              const baseValue = row[baseDay];

              if (
                baseValue === undefined ||
                baseValue === null ||
                baseValue === 0
              ) {
                return row; // If no base value, leave row unchanged
              }

              const percentileRow = { ...row };

              // Convert each value to percentage of base day
              Object.keys(row).forEach((key) => {
                if (key !== "segment" && key !== "id") {
                  if (row[key] !== null && row[key] !== undefined) {
                    if (key === baseDay) {
                      percentileRow[key] = 100; // Base day is always 100%
                    } else {
                      percentileRow[key] = parseFloat(
                        ((row[key] / baseValue) * 100).toFixed(2)
                      );
                    }
                  }
                }
              });

              return percentileRow;
            });

            setRetentionTableData(percentileData);
          } else {
            setRetentionTableData(tableData);
          }

          // Update data for chart
          setDashboardSettings((prevDashboards) => {
            return {
              ...prevDashboards,
              charts: prevDashboards.charts.map((chart) => {
                if (chart.metricName === "retention") {
                  return {
                    ...chart,
                    // Pass transformed data
                    data: { data: chartData },
                    // Update configurations
                    datasetsConfigs: newDatasetsConfigs,
                    categoryField: "day", // Use "day" field for X axis
                  };
                }
                return chart;
              }),
            };
          });
        }
      }
    } catch (error) {
      console.error("Error in fetchRetention:", error);
      setRetentionTableData([]);
      setOriginalTableData([]);
    } finally {
      setIsLoading_Retention(false);
    }
  }

  async function fetchAnalyticsData() {
    if (isFetchingData.current == true) return;
    isFetchingData.current = true;

    try {
      await fetchRetention();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      isFetchingData.current = false;
    }
  }

  const lastDateFilter = useRef(null);
  const lastSegmentsFilter = useRef(null);
  const lastSecondaryDateFilter = useRef(null);

  const isEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  };

  useEffect(() => {
    let hasChanged = false;
    if (!filterDate.startDate || !filterDate.endDate) return;
    if (!isEqual(lastDateFilter.current, filterDate)) {
      if (lastDateFilter.current !== null) {
        hasChanged = true;
      }
      lastDateFilter.current = filterDate;
    }

    // Add check for secondary date
    if (
      filterDateSecondary &&
      filterDateSecondary.startDate &&
      filterDateSecondary.endDate
    ) {
      if (!isEqual(lastSecondaryDateFilter.current, filterDateSecondary)) {
        // Always set hasChanged = true when date changes,
        // even if lastSecondaryDateFilter.current was null
        hasChanged = true;
        lastSecondaryDateFilter.current = filterDateSecondary;
      }
    } else if (lastSecondaryDateFilter.current !== null) {
      // If secondary date was removed, this is also a change
      hasChanged = true;
      lastSecondaryDateFilter.current = null;
    }

    if (!isEqual(lastSegmentsFilter.current, filterSegments)) {
      if (lastSegmentsFilter.current !== null) {
        hasChanged = true;
      }
      lastSegmentsFilter.current = filterSegments;
    }

    // Update chart name based on presence of Secondary Date
    setDashboardSettings((prevDashboards) => {
      const chartName =
        filterDateSecondary &&
        filterDateSecondary.startDate &&
        filterDateSecondary.endDate
          ? "Retention"
          : "Rolling Retention";

      return {
        ...prevDashboards,
        charts: prevDashboards.charts.map((chart) => {
          if (chart.metricName === "retention") {
            return {
              ...chart,
              name: chartName,
            };
          }
          return chart;
        }),
      };
    });

    if (hasChanged) {
      async function doFetch() {
        isFetchingData.current = false;
        await fetchAnalyticsData();
      }
      doFetch();
    }
  }, [filterDate, filterDateSecondary, filterSegments]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [includeBranchInAnalytics, includeEnvironmentInAnalytics]);

  // Settings for retention table
  const retentionTableSettings = {
    sx: {
      p: "15px",
      height: 400,
      width: "100%",
      mb: 7,
    },
    title: "Table View",
    rowHeight: 70, // Increase row height to match style
    mainProps: {
      autoHeight: true,
      columnVisibilityModel: {},
      disableColumnMenu: false,
      disableExtendRowFullWidth: false,
    },
    initialState: {
      pagination: {
        paginationModel: {
          pageSize: 10,
        },
      },
      sorting: {
        sortModel: [{ field: "segment", sort: "asc" }],
      },
    },
    pageSizeOptions: [10],
  };

  return (
    <div className={s.dashboardContent}>
      <Helmet>
        <title>{titles.d_retention}</title>
      </Helmet>

      <div className={s.userMetrics}>
        <LineChart
          isLoading={isLoading_Retention}
          chartObj={dashboardSettings.charts[0]}
          dateRange={filterDate}
          gameID={game.gameID}
          branch={branch}
        />
      </div>

      {/* Retention table */}
      <DataTable
        tableSettings={{
          ...retentionTableSettings,
          title: (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <Typography variant="h6" component="div">
                Table View
              </Typography>
              <Tooltip
                title={
                  isPercentileView
                    ? "Switch to raw values"
                    : "Switch to percentile view"
                }
              >
                <IconButton
                  onClick={togglePercentileView}
                  color={isPercentileView ? "primary" : "default"}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  <PercentIcon />
                </IconButton>
              </Tooltip>
            </div>
          ),
        }}
        columns={retentionColumns}
        rows={retentionTableData}
        onColumnsChange={onColumnsChange_retention}
        isLoading={isLoading_Retention}
      />
    </div>
  );
};

export default DashboardRetention;
