import React, { useState, useEffect, useRef } from "react";
import s from "./offerItem.module.css";

// Comps
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import Select from "@mui/material/Select";
import Chip from "@mui/material/Chip";
import GroupsSharpIcon from "@mui/icons-material/GroupsSharp";
import PropTypes from "prop-types";
import { styled } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Skeleton from "@mui/material/Skeleton";

// Analytics chart
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";
import SalesChart from "./offerAnalysis/SalesChart";
import { useBranch, useGame } from "@strix/gameContext";
import useApi from "@strix/api";
import DatePicker from "shared/datePicker/DatePickerWidget.jsx";
import "chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm";

import Popover from "@mui/material/Popover";
import SegmentsPicker from "shared/segmentsWidget/SegmentsPickerWidget.jsx";

import ArrowUpwardSharpIcon from "@mui/icons-material/ArrowUpwardSharp";
import ArrowDownwardSharpIcon from "@mui/icons-material/ArrowDownwardSharp";

const OfferAnalyticsSection = ({ segments, offerID, isRealMoney }) => {
  const [offerAnalytics, setOfferAnalytics] = useState({
    revenue: 0,
    revenuePositive: true,
    declinerate: 0,
    declineratePositive: true,
    salesTotal: 0,
    salesTotalPositive: true,
    impressions: 0,
    impressionsPositive: true,
    sales: [],
  });

  const { queryOfferAnalytics } = useApi();

  const theme = useTheme();
  const { game } = useGame();
  const { branch, environment } = useBranch();

  // Filters
  const [filterDate, setFilteredDate] = useState([]);
  const [filterSegments, setFilteredSegments] = useState([]);
  const [isFetchingData, setIsFetchingData] = useState(false);

  function formatToCurrencyNumber(value) {
    // Accepting numbers like 33300 which stands for $333.00
    // Here we want to format it to 333.00
    if (value === undefined) return;
    let preFormattedValue = value.toString();
    preFormattedValue = `${preFormattedValue.slice(0, -2)}.${preFormattedValue.slice(-2)}`;
    preFormattedValue = parseFloat(preFormattedValue).toFixed(2);

    const parts = preFormattedValue.toString().split(".");
    const dollars = parts[0];
    const cents = parts[1];

    const formattedDollars = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    const formattedValue = `${formattedDollars}.${cents}`;

    return formattedValue;
  }

  function getSummaryColor(positive) {
    return positive ? "#19B500" : "#df1c1c";
  }

  function formatToNumber(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  // The most default chart obj. Contains all default settings we need to customize.
  const defaultChartObj = {
    // Must be unique for every chart on page, because we seek for canvases with name that
    // created by appending chartID to 'lineChart' or 'funnelChart' or whatever chart
    chartID: "0",

    // Visual chart name
    name: "ChartName",

    // Metric
    metricName: "metricName",
    // Can be any symbol we need before or after the delta label (if its enabled)
    metricFormat: "",
    // Can be 'end' or 'start'
    metricFormatPosition: "start",

    // Leaving blank as it will be filled when we fetch data
    data: {},

    // Customization
    chartSettings: {
      // Define chart type. Use it later to draw various components
      type: "line",
      // Text on hovering any value on chart
      tooltipText: " default tooltip text",

      // Display delta (+100%, -$100) in the up-right corner
      showDelta: true,

      // Show legends. May be useful to disable it is we have only 1 dataset on chart
      showLegend: false,
      // Legend position relative to chart. By ChartJS defaults it is 'top', so we do the same
      legendPosition: "top",

      // Data labels (i.e. share percents on pie graph)
      showDataLabels: false,

      // Determine if we want to format Y axis on Line Chart
      customTickFormatY: false,
      // Can be "money" ($20), "percentile" (20%), "minutes" (2m 0s)
      customTickFormatYType: "",
    },

    // Fields we use as categories
    categoryField: "timestamp",

    // Fields we use as values
    valueFields: ["value"],
  };
  const [dashboardSettings, setDashboardSettings] = useState({
    charts: [
      // New Players
      {
        ...defaultChartObj,
        chartID: "0",
        name: "Sales & Revenue",
        metricName: "offerSales",
        metricFormat: "",
        metricFormatPosition: "start",
        data: {},
        chartSettings: {
          type: "line",
          tooltipText: "",
          showDelta: true,
          showLegend: false,
        },
        categoryField: "timestamp",
        valueFields: ["value"],
      },
    ],
  });
  async function fetchAnalyticsData() {
    // if (isFetchingData) return;
    setIsFetchingData(true);

    if (filterDate.length === 0) return;

    const response = await queryOfferAnalytics({
      gameID: game.gameID,
      branch: branch,
      environment: environment,
      filterDate: filterDate,
      filterSegments: filterSegments.map((segment) => segment.segmentID),
      offerID: offerID,
    });
    if (response.success) {
      setOfferAnalytics(response.message);
      setDashboardSettings((prevSettings) => ({
        ...prevSettings,
        charts: prevSettings.charts.map((chart) => {
          if (chart.metricName === "offerSales") {
            return {
              ...chart,
              data: { data: response.message.sales },
            };
          }
        }),
      }));
    }

    setIsFetchingData(false);
  }

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const lastDateFilter = useRef(null);
  const lastSegmentsFilter = useRef(null);
  const isEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  };
  useEffect(() => {
    let hasChanged = false;

    if (!filterDate || filterDate.length === 0) return;

    if (!isEqual(lastDateFilter.current, filterDate)) {
      lastDateFilter.current = filterDate;
      hasChanged = true;
    }

    if (!isEqual(lastSegmentsFilter.current, filterSegments)) {
      lastSegmentsFilter.current = filterSegments;
      hasChanged = true;
    }

    if (hasChanged) {
      console.log("Filters changed. Fetching new data...");
      async function doFetch() {
        await fetchAnalyticsData();
      }
      doFetch();
    }
  }, [filterDate, filterSegments]);

  function generateCharts(settings) {
    let tempCharts = [];

    settings.charts.forEach((chart, index) => {
      let obj;
      switch (chart.chartSettings.type) {
        case "line":
          obj = (
            <SalesChart
              key={index}
              isLoading={isFetchingData}
              chartObj={chart}
              dateRange={filterDate}
              gameID={game.gameID}
              branch={branch}
            />
          );
          tempCharts.push(obj);
          break;
        default:
          break;
      }
    });

    return tempCharts;
  }

  return (
    <div className={s.offerBottomBody}>
      <div className={s.filtersAndSummary}>
        <div className={s.filters}>
          {/* Date range picker */}
          <DatePicker
            onInitialize={(newDates) => {
              setFilteredDate(newDates);
            }}
            skipInitialize={false}
            onStateChange={(newDates) => {
              setFilteredDate(newDates);
            }}
          />

          {/* Segments */}
          <SegmentsPicker
            segments={segments}
            currentSegments={filterSegments}
            onStateChange={(s) => {
              setFilteredSegments(s);
            }}
          />
        </div>

        <div className={s.summary}>
          <div className={s.summaryGrid}>
            <div className={s.summaryItem}>
              <div className={s.summaryItemLabel}>
                <Typography
                  variant="subtitle1"
                  color={"text.secondary"}
                  sx={{
                    lineHeight: "14px",
                    mb: 1,
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {isRealMoney ? "Revenue" : "Currency bought"}
                </Typography>
              </div>
              <div className={s.summaryItemValue}>
                <Typography
                  variant="subtitle1"
                  color={getSummaryColor(offerAnalytics?.revenuePositive)}
                  sx={{
                    lineHeight: "14px",
                    mb: 0.8,
                    fontSize: "17px",
                    textAlign: "left",
                    fontWeight: 600,
                  }}
                >
                  {isRealMoney ? "$" : ""}
                  {formatToCurrencyNumber(offerAnalytics?.revenue * 100)}
                </Typography>
                {offerAnalytics?.revenuePositive ? (
                  <ArrowUpwardSharpIcon
                    htmlColor={getSummaryColor(offerAnalytics?.revenuePositive)}
                    sx={{ fontSize: 20, ml: 0.5, mb: 0.7 }}
                  />
                ) : (
                  <ArrowDownwardSharpIcon
                    htmlColor={getSummaryColor(offerAnalytics?.revenuePositive)}
                    sx={{ fontSize: 20, ml: 0.5, mb: 0.7 }}
                  />
                )}
              </div>
            </div>

            <div className={s.summaryItem}>
              <div className={s.summaryItemLabel}>
                <Typography
                  variant="subtitle1"
                  color={"text.secondary"}
                  sx={{
                    lineHeight: "14px",
                    mb: 1,
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Conversion Rate
                </Typography>
              </div>
              <div className={s.summaryItemValue}>
                <Typography
                  variant="subtitle1"
                  color={getSummaryColor(offerAnalytics?.declineratePositive)}
                  sx={{
                    lineHeight: "14px",
                    mb: 0.8,
                    fontSize: "17px",
                    textAlign: "left",
                    fontWeight: 600,
                  }}
                >
                  {offerAnalytics?.declinerate.toFixed(3)}%
                </Typography>
                {offerAnalytics?.declineratePositive ? (
                  <ArrowUpwardSharpIcon
                    htmlColor={getSummaryColor(
                      offerAnalytics?.declineratePositive
                    )}
                    sx={{ fontSize: 20, ml: 0.5, mb: 0.7 }}
                  />
                ) : (
                  <ArrowDownwardSharpIcon
                    htmlColor={getSummaryColor(
                      offerAnalytics?.declineratePositive
                    )}
                    sx={{ fontSize: 20, ml: 0.5, mb: 0.7 }}
                  />
                )}
              </div>
            </div>

            <div className={s.summaryItem}>
              <div className={s.summaryItemLabel}>
                <Typography
                  variant="subtitle1"
                  color={"text.secondary"}
                  sx={{
                    lineHeight: "14px",
                    mb: 1,
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Sales
                </Typography>
              </div>
              <div className={s.summaryItemValue}>
                <Typography
                  variant="subtitle1"
                  color={getSummaryColor(offerAnalytics?.salesTotalPositive)}
                  sx={{
                    lineHeight: "14px",
                    mb: 0.8,
                    fontSize: "17px",
                    textAlign: "left",
                    fontWeight: 600,
                  }}
                >
                  {formatToNumber(offerAnalytics?.salesTotal)}
                </Typography>
                {offerAnalytics?.salesTotalPositive ? (
                  <ArrowUpwardSharpIcon
                    htmlColor={getSummaryColor(
                      offerAnalytics?.salesTotalPositive
                    )}
                    sx={{ fontSize: 20, ml: 0.5, mb: 0.7 }}
                  />
                ) : (
                  <ArrowDownwardSharpIcon
                    htmlColor={getSummaryColor(
                      offerAnalytics?.salesTotalPositive
                    )}
                    sx={{ fontSize: 20, ml: 0.5, mb: 0.7 }}
                  />
                )}
              </div>
            </div>

            <div className={s.summaryItem}>
              <div className={s.summaryItemLabel}>
                <Typography
                  variant="subtitle1"
                  color={"text.secondary"}
                  sx={{
                    lineHeight: "14px",
                    mb: 1,
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Impressions
                </Typography>
              </div>
              <div className={s.summaryItemValue}>
                <Typography
                  variant="subtitle1"
                  color={getSummaryColor(offerAnalytics?.impressionsPositive)}
                  sx={{
                    lineHeight: "14px",
                    mb: 0.8,
                    fontSize: "17px",
                    textAlign: "left",
                    fontWeight: 600,
                  }}
                >
                  {formatToNumber(offerAnalytics?.impressions)}
                </Typography>
                {offerAnalytics?.impressionsPositive ? (
                  <ArrowUpwardSharpIcon
                    htmlColor={getSummaryColor(
                      offerAnalytics?.impressionsPositive
                    )}
                    sx={{ fontSize: 20, ml: 0.5, mb: 0.7 }}
                  />
                ) : (
                  <ArrowDownwardSharpIcon
                    htmlColor={getSummaryColor(
                      offerAnalytics?.impressionsPositive
                    )}
                    sx={{ fontSize: 20, ml: 0.5, mb: 0.7 }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.chartContainer}>
        {generateCharts(dashboardSettings)}
      </div>
    </div>
  );
};

export default OfferAnalyticsSection;
