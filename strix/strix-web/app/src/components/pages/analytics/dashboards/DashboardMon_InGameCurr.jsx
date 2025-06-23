import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useParams } from "react-router-dom";
import s from "./dashboard.module.css";
import sTable from "./charts/css/offersSalesAndProfileDataTable.module.css";

import LineChart from "./charts/LineChart";
import CloseIcon from "@mui/icons-material/Close";
import ElementItem from "./charts/profileAnalytics/ElementItem";
import { InputAdornment } from "@mui/material";
import UnfoldLess from "@mui/icons-material/UnfoldLess";
import UnfoldMore from "@mui/icons-material/UnfoldMore";
import { Button, Typography, Popover } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";
import IconButton from "@mui/material/IconButton";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import OutlinedInput from "@mui/material/OutlinedInput";
import Box from "@mui/material/Box";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import chroma from "chroma-js";
import shortid from "shortid";
import Checkbox from "@mui/material/Checkbox";

import useApi from "@strix/api";
import { useEffectOnce } from "react-use";

import { Helmet } from "react-helmet";
import titles from "titles";
import DataTable from "./charts/realMoney/DataTable";
import AvgProfileRow from "./charts/profileAnalytics/AvgProfileRow";

import BlankOfferIcon from "./charts/realMoney/treasure-chest.svg?react";
import BlankEntityIcon from "./charts/realMoney/entityBasic.svg?react";
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);
const DashboardMon_InGameCurr = ({
  defaultChartObj,
  filterDate,
  filterSegments,
  filterCurrencies,
  game,
  branch,
  environment,
  allCurrencyEntities,
  onActionItemsChanged,
  includeBranchInAnalytics,
  includeEnvironmentInAnalytics,
}) => {
  const {
    getEntityIcons,
    queryInGameBalance,
    queryTopCurrencyProducts,
    queryTopProductsDiscountAndSpend,
    queryTopSourcesAndSinks,
    getCurrencyEntities,
  } = useApi();

  const isFetchingData = useRef(false);
  const [isLoading_CurrencyBalance, setIsLoading_CurrencyBalance] =
    useState(false);
  const [isLoading_TopProducts, setIsLoading_TopProducts] = useState(false);
  const [isLoading_OffersSales, setIsLoading_OffersSales] = useState(false);
  const [isLoading_TopSourcesAndSinks, setIsLoading_TopSourcesAndSinks] =
    useState(false);

  const [offersSalesData, setOffersSalesData] = useState();
  const [paymentDrivers, setPaymentDrivers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState([]);
  const [topSourcesAndSinks, setTopSourcesAndSinks] = useState({
    sources: [],
    sinks: [],
  });
  const [filterViewType, setFilteredViewType] = useState("absolute");
  const [everFetchedBalanceViewTypes, setFetchedBalanceViewTypes] = useState({
    absolute: false,
    player: false,
    session: false,
  });

  const selectedForAction = useRef([]);
  const toggleSelectedForAction = useCallback(
    (id, avgProfile, type) => {
      const exists = selectedForAction.current.some((item) => item.id === id);
      selectedForAction.current = exists
        ? selectedForAction.current.filter((item) => item.id !== id)
        : [...selectedForAction.current, { id, type, profile: avgProfile }];
      onActionItemsChanged(selectedForAction.current);
    },
    [onActionItemsChanged]
  );
  const getQueryParams = useCallback(
    () => ({
      gameID: game.gameID,
      branch: branch,
      environment: environment,
      includeBranchInAnalytics: includeBranchInAnalytics,
      includeEnvironmentInAnalytics: includeEnvironmentInAnalytics,
      filterDate: [filterDate.startDate.toDate(), filterDate.endDate.toDate()],
      filterSegments: filterSegments.map((segment) => segment.segmentID),
    }),
    [
      game.gameID,
      branch,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    ]
  );
  const [dashboardSettings, setDashboardSettings] = useState({
    charts: [
      // Economy balance
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "Currency balance",
        metricName: "currencyBalance",
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
            // y1: {
            //   customTickFormatY: false,
            //   customTickFormatYType: "",
            //   tooltipText: " ",
            //   metricFormat: "",
            //   metricFormatPosition: "start",
            // },
          },
          fullWidth: true,
        },
        categoryField: "timestamp",
        datasetsConfigs: [
          {
            config: {
              type: "line",
              label: "Balance",
              yAxisID: "y",
              backgroundColor: "rgb(18, 218, 32)",
              borderColor: "rgb(18, 218, 32)",
              borderWidth: 3,
              pointRadius: 2,
              pointHoverRadius: 5,

              stack: "2",
            },
            valueField: "balance",
          },
          {
            config: {
              type: "bar",
              yAxisID: "y",
              label: "Sources",
              borderColor: "rgba(57, 167, 241, 1)",
              borderWidth: 1,
              backgroundColor: "rgba(57, 167, 241, 1)",
              stack: "1",
            },
            valueField: "totalSources",
          },
          {
            config: {
              type: "bar",
              label: "Sinks",
              yAxisID: "y",
              borderColor: "rgba(187, 55, 57, 1)",
              borderWidth: 1,
              backgroundColor: "rgba(187, 55, 57, 1)",
              stack: "1",
            },
            valueField: "totalSinks",
          },
        ],
      },
      // Days until first payment
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "Days until first payment",
        metricName: "daysUntilFirstPayment",
        data: {},
        chartSettings: {
          type: "line",
          showDelta: false,
          deltaFormat: "$",
          deltaFormatPosition: "start",
          showLegend: false,
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
        },
        categoryField: "day",
        datasetsConfigs: [
          {
            config: {
              type: "line",
              yAxisID: "y",
              label: "Players made first payment on this day:",
              borderColor: "#CD6F00",
              backgroundColor: "#CD6F00",
            },
            valueField: "players",
          },
        ],
      },
      // Main payment conversion funnel
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "Payment conversion",
        metricName: "paymentConversionFunnel",
        data: {
          data: [
            { players: 17000, share: 5 },
            { players: 15000, share: 68 },
            { players: 14000, share: 79 },
            { players: 13000, share: 67 },
            { players: 12000, share: 75 },
          ],
        },
        chartSettings: {
          type: "funnel",
          funnelColor: ["#64511F", "#1F4A60", "#CD6F00"],
          showDelta: false,
          deltaFormat: "$",
          deltaFormatPosition: "start",
          showLegend: false,
          ticks: {
            y: {
              customTickFormatY: false,
              customTickFormatYType: "",
              tooltipText: "",
              excludeValueFromTooltip: true,
              metricFormat: "",
              metricFormatPosition: "start",
            },
          },
          fullWidth: true,
        },
        categoryField: "share",
        datasetsConfigs: [
          {
            config: {
              type: "funnel",
              yAxisID: "y",
              label: "Players converted to this payment",
              borderColor: "#CD6F00",
              backgroundColor: "#CD6F00",
            },
            valueField: "share",
            secondaryValueField: "players",
          },
        ],
      },
      // Offer Sales
      {
        ...defaultChartObj,
        chartID: nanoid(),
        name: "Offer Sales",
        metricName: "offerSalesOverTime",
        data: {},
        chartSettings: {
          type: "line",
          showDelta: false,
          deltaFormat: "",
          deltaFormatPosition: "start",
          showLegend: true,
          ticks: {
            y: {
              customTickFormatY: false,
              customTickFormatYType: "",
              tooltipText: " sales",
              metricFormat: "",
              metricFormatPosition: "start",
            },
          },
          fullWidth: true,
        },
        categoryField: "timestamp",
        datasetsConfigs: [
          {
            config: {
              type: "line",
              label: "Total Sales",
              yAxisID: "y",
              backgroundColor: "rgb(75, 192, 192)",
              borderColor: "rgb(75, 192, 192)",
              borderWidth: 3,
              pointRadius: 2,
              pointHoverRadius: 5,
            },
            valueField: "totalSales",
          },
        ],
      },
    ],
  });

  const createOnColumnsChange = (setColumns) => (event) => {
    setColumns((prevColumns) =>
      prevColumns.map((column) =>
        column.field === event.colDef.field
          ? { ...column, width: event.colDef.width }
          : column
      )
    );
  };

  async function fetchOffersSales() {
    setIsLoading_OffersSales(true);
    try {
      const queryParams = getQueryParams();
      const response = await queryTopProductsDiscountAndSpend(queryParams);

      if (response.success) {
        const rawData = response.message.map((item) => ({
          offerID: item.offerID,
          offerName: item.offerName, //
          timestamp: item.timestamp,
          totalSales: parseFloat(item.totalSales),
          meanDiscount: parseFloat(item.meanDiscount),
          meanSpend: parseFloat(item.meanSpend),
          currency: item.currency,
        }));

        const offerMetadata = {};
        rawData.forEach((item) => {
          offerMetadata[item.offerID] = {
            currency: item.currency,
            name: item.offerName,
          };
        });

        const groupedData = {};
        rawData.forEach((item) => {
          if (!groupedData[item.timestamp]) {
            groupedData[item.timestamp] = { timestamp: item.timestamp };
          }
          groupedData[item.timestamp][`offer_${item.offerID}`] =
            item.totalSales;
        });

        const dataArray = Object.values(groupedData);

        const chartData = {
          data: dataArray,
          metadata: {
            offers: offerMetadata,
          },
        };

        console.log("Chart data:", chartData);

        const uniqueOffers = [...new Set(rawData.map((item) => item.offerID))];
        console.log("Unique offers:", uniqueOffers);

        const colors = chroma.scale("Set1").colors(uniqueOffers.length);
        const newDatasetsConfigs = uniqueOffers.map((offerID, index) => ({
          config: {
            type: "line",
            label: offerMetadata[offerID].name || `Offer ${offerID}`,
            yAxisID: "y",
            backgroundColor: colors[index],
            borderColor: colors[index],
            borderWidth: 3,
            pointRadius: 2,
            pointHoverRadius: 5,
          },
          valueField: `offer_${offerID}`,
          offerID: offerID,
        }));

        setDashboardSettings((prev) => ({
          ...prev,
          charts: prev.charts.map((chart) => {
            if (chart.metricName === "offerSalesOverTime") {
              return {
                ...chart,
                data: chartData,
                isError: false,
                datasetsConfigs: newDatasetsConfigs,
              };
            }
            return chart;
          }),
        }));
      }
    } catch (error) {
      console.error("Error fetching offers sales data:", error);
    } finally {
      setIsLoading_OffersSales(false);
    }
  }

  async function fetchCurrencies() {
    const resp = await getCurrencyEntities({
      gameID: game.gameID,
      branch: branch,
    });
    if (resp.success) {
      const iconsResp = await getEntityIcons({
        gameID: game.gameID,
        branch: branch,
        nodeIDs: resp.entities.map((e) => e.nodeID),
      });
      if (iconsResp.success) {
        const entitiesWithIcons = resp.entities.map((e) => ({
          ...e,
          icon: iconsResp.entityIcons.find((n) => n.nodeID === e.nodeID)?.icon,
        }));
        setCurrencies(entitiesWithIcons);
        setSelectedCurrencies(entitiesWithIcons.map((e) => e.nodeID));
      }
    }
  }

  async function fetchCurrencyBalance() {
    setIsLoading_CurrencyBalance(true);
    try {
      const queryParams = getQueryParams();
      const response = await queryInGameBalance({
        ...queryParams,
        viewType: filterViewType,
      });
      let newData = {};
      if (response.success) {
        const targetField = filterViewType;
        const allSinks = response.message.data.flatMap((item) =>
          item.currencies.flatMap((curr) =>
            curr[targetField].sink.map((sink) => sink.id)
          )
        );
        const allSources = response.message.data.flatMap((item) =>
          item.currencies.flatMap((curr) =>
            curr[targetField].source.map((source) => source.id)
          )
        );
        setAvailableSinks(Array.from(new Set(allSinks)));
        setAvailableSources(Array.from(new Set(allSources)));
        setFetchedBalanceViewTypes((prev) => ({
          ...prev,
          [filterViewType]: true,
        }));
        newData = response.message;
      }
      setDashboardSettings((prev) => ({
        ...prev,
        charts: prev.charts.map((chart) => {
          if (chart.metricName === "currencyBalance") {
            return {
              ...chart,
              data: newData,
              isError: !response.success,
              savedData: { [filterViewType]: newData },
            };
          }
          return chart;
        }),
      }));
    } catch (error) {
      console.error("Error fetching currency balance:", error);
    } finally {
      setIsLoading_CurrencyBalance(false);
    }
  }

  async function fetchTopProducts() {
    setIsLoading_TopProducts(true);
    try {
      const queryParams = getQueryParams();
      const offersSalesDataResp = await queryTopCurrencyProducts(queryParams);
      if (offersSalesDataResp?.success) {
        let tempData = offersSalesDataResp.message.map((offer) => ({
          id: shortid.generate(),
          ...offer,
        }));
        const nodeIDs = Array.from(
          new Set(tempData.map((of) => of.entityNodeID))
        );
        const tempEntityIcons = await getEntityIcons({
          gameID: game.gameID,
          branch,
          nodeIDs,
        });
        tempData = tempData.map((offer) => ({
          ...offer,
          entityIcon: tempEntityIcons.entityIcons?.find(
            (icon) => icon.nodeID === offer.entityNodeID
          )?.icon,
        }));
        setOffersSalesData(tempData);
      }
    } catch (error) {
      console.error("Error fetching top products:", error);
    } finally {
      setIsLoading_TopProducts(false);
    }
  }

  async function fetchTopSourcesAndSinks() {
    setIsLoading_TopSourcesAndSinks(true);
    try {
      const queryParams = getQueryParams();
      const response = await queryTopSourcesAndSinks(queryParams);
      if (response.success) {
        const tempSinks =
          response.message.sinks?.map((item) => ({
            id: shortid.generate(),
            ...item,
          })) || [];
        const tempSources =
          response.message.sources?.map((item) => ({
            id: shortid.generate(),
            ...item,
          })) || [];
        setTopSourcesAndSinks({ sinks: tempSinks, sources: tempSources });
      }
    } catch (error) {
      console.error("Error fetching top sources and sinks:", error);
    } finally {
      setIsLoading_TopSourcesAndSinks(false);
    }
  }

  async function fetchAnalyticsData() {
    if (isFetchingData.current) return;
    isFetchingData.current = true;
    try {
      await Promise.all([
        fetchCurrencies(),
        fetchCurrencyBalance(),
        fetchTopProducts(),
        fetchTopSourcesAndSinks(),
        fetchOffersSales(),
      ]);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      isFetchingData.current = false;
    }
  }

  async function fetchCurrencyBalancesViewTypes() {
    const queryParams = getQueryParams();
    try {
      const response = await queryInGameBalance({
        ...queryParams,
        viewType: filterViewType,
      });
      if (response.success) {
        const newData = response.message;
        const allSinks = response.message.data.flatMap((item) =>
          item.currencies.flatMap((curr) =>
            curr[filterViewType].sink.map((sink) => sink.id)
          )
        );
        const allSources = response.message.data.flatMap((item) =>
          item.currencies.flatMap((curr) =>
            curr[filterViewType].source.map((source) => source.id)
          )
        );
        setAvailableSinks(Array.from(new Set(allSinks)));
        setAvailableSources(Array.from(new Set(allSources)));
        setFetchedBalanceViewTypes((prev) => ({
          ...prev,
          [filterViewType]: true,
        }));
        setDashboardSettings((prev) => ({
          ...prev,
          charts: prev.charts.map((chart) => {
            if (chart.metricName === "currencyBalance") {
              return {
                ...chart,
                data: newData,
                isError: false,
                savedData: { ...chart.savedData, [filterViewType]: newData },
              };
            }
            return chart;
          }),
        }));
      }
    } catch (error) {
      console.error("Error fetching currency balances view types:", error);
    }
  }

  const lastDateFilter = useRef(null);
  const lastSegmentsFilter = useRef(null);
  const lastBalanceViewTypeFilter = useRef(null);

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

    if (!isEqual(lastSegmentsFilter.current, filterSegments)) {
      if (lastSegmentsFilter.current !== null) {
        hasChanged = true;
      }
      lastSegmentsFilter.current = filterSegments;
    }

    if (!isEqual(lastBalanceViewTypeFilter.current, filterViewType)) {
      if (lastBalanceViewTypeFilter.current !== null) {
        hasChanged = true;
      }
      lastBalanceViewTypeFilter.current = filterViewType;
    }

    if (hasChanged) {
      console.log("Filters changed. Fetching new data...");
      async function doFetch() {
        isFetchingData.current = false;
        await fetchAnalyticsData();
        await fetchCurrencyBalancesViewTypes();
      }
      doFetch();
    }
  }, [filterDate, filterSegments, branch]);
  useEffect(() => {
    let hasChanged = false;

    if (!filterDate.startDate || !filterDate.endDate) return;

    if (!isEqual(lastSegmentsFilter.current, filterSegments)) {
      if (lastSegmentsFilter.current !== null) {
        hasChanged = true;
      }
      lastSegmentsFilter.current = filterSegments;
    }

    if (!isEqual(lastBalanceViewTypeFilter.current, filterViewType)) {
      if (lastBalanceViewTypeFilter.current !== null) {
        hasChanged = true;
      }
      lastBalanceViewTypeFilter.current = filterViewType;
    }

    if (hasChanged) {
      console.log("Filters changed. Fetching new in-game query data...");
      async function doFetch() {
        await fetchCurrencyBalancesViewTypes();
      }
      doFetch();
    }
  }, [filterViewType, filterSegments]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
    fetchCurrencyBalancesViewTypes();
  }, [includeBranchInAnalytics, includeEnvironmentInAnalytics]);

  useEffect(() => {
    console.log(dashboardSettings);
  }, [dashboardSettings]);

  function formatValue(value, fixedAmount = 0) {
    // Format 1000 to 1 000

    const parsedValue = parseFloat(value).toFixed(fixedAmount).toString();

    const formattedDollars = parsedValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    const formattedValue = `${formattedDollars}`;

    return formattedValue;
  }

  function ActionItemSelector({ id, avgProfile, type }) {
    const [checked, setChecked] = useState(false);
    return (
      <Checkbox
        checked={checked}
        onClick={() => {
          toggleSelectedForAction(id, avgProfile, type);
          setChecked((prev) => !prev);
        }}
      />
    );
  }

  const [columns_offerSales, setColumns_offerSales] = useState([
    {
      field: "offerIcon",
      headerName: "Icon",
      headerAlign: "center",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className={sTable.icon}>
          {params.value !== "" && params.value !== undefined ? (
            <img
              src={params.value}
              alt="Offer icon"
              className={sTable.offerIcon}
            />
          ) : (
            <BlankOfferIcon />
          )}
        </div>
      ),
    },
    {
      field: "offerName",
      headerName: "Name",
      headerAlign: "center",
      width: "120",
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant={"body1"}
            color={"text.secondary"}
            sx={{
              whiteSpace: "wrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {params.value}
          </Typography>
        </div>
      ),
    },
    {
      field: "revenue",
      headerName: "Spend",
      headerAlign: "center",
      type: "number",
      width: 110,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {params.row.entityIcon !== "" &&
          params.row.entityIcon !== undefined ? (
            <img
              src={params.row.entityIcon}
              alt="Offer icon"
              className={sTable.priceItemIcon}
            />
          ) : (
            <BlankEntityIcon />
          )}
          <Typography
            variant={"body1"}
            color={`text.primary`}
            sx={{
              whiteSpace: "nowrap",
              ml: 1,
              fontSize: "14px",
              fontWeight: "bold",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {formatValue(params.value)}
          </Typography>
        </div>
      ),
    },
    {
      field: "sales",
      headerName: "Sales",
      headerAlign: "center",
      type: "number",
      width: 110,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant={"body1"}
            color={`text.primary`}
            sx={{
              whiteSpace: "nowrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {formatValue(params.value)}
          </Typography>
        </div>
      ),
    },
    {
      field: "shows",
      headerName: "Impressions",
      headerAlign: "center",
      type: "number",
      width: 110,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant={"body1"}
            color="text.primary"
            sx={{
              whiteSpace: "nowrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
            }}
          >
            {formatValue(params.value)}
          </Typography>
        </div>
      ),
    },
    {
      field: "meanSpend",
      headerName: "Mean. Spend",
      headerAlign: "center",
      type: "number",
      width: 160,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant={"body1"}
            color="text.primary"
            sx={{
              whiteSpace: "nowrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
            }}
          >
            {Number(params.value).toFixed(3)}
          </Typography>
        </div>
      ),
    },
    {
      field: "meanDiscount",
      headerName: "Mean. Discount",
      headerAlign: "center",
      type: "number",
      width: 160,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant={"body1"}
            color="text.primary"
            sx={{
              whiteSpace: "nowrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
            }}
          >
            {Number(params.value).toFixed(3) + "%"}
          </Typography>
        </div>
      ),
    },
    {
      field: "declineRate",
      headerName: "Conversion Rate (%)",
      headerAlign: "center",
      type: "number",
      width: 160,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant={"body1"}
            color="text.primary"
            sx={{
              whiteSpace: "nowrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
            }}
          >
            {Number(params.value).toFixed(3) + "%"}
          </Typography>
        </div>
      ),
    },
    {
      field: "avgProfile",
      headerName: "Avg. Customer Profile",
      renderHeader: () => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "end",
          }}
        >
          <Typography
            variant={"body1"}
            color={`text.primary`}
            sx={{
              whiteSpace: "nowrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            Avg. Customer Profile
          </Typography>

          <Tooltip
            title={`Full profile snapshot is taken on every payment action with
                offer. This is an average of all such snapshots just before the
                action.`}
            placement="top"
          >
            <IconButton sx={{ borderRadius: 5, cursor: "default !important" }}>
              <InfoSharpIcon color="primary" />
            </IconButton>
          </Tooltip>
        </div>
      ),
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => <AvgProfileRow params={params} />,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 70,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActionItemSelector
            id={params.row.id}
            avgProfile={params.row.avgProfile}
            type="offer"
          />
        </div>
      ),
    },
  ]);
  const [columns_topSources, setColumns_topSources] = useState([
    {
      field: "name",
      headerName: "Source",
      headerAlign: "center",
      width: 120,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant={"body1"}
            color={"text.secondary"}
            sx={{
              whiteSpace: "wrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {params.value}
          </Typography>
        </div>
      ),
    },
    {
      field: "mean",
      headerName: "Mean. income",
      headerAlign: "center",
      width: "120",
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {params.row.entityIcon !== "" &&
          params.row.entityIcon !== undefined ? (
            <img
              src={params.row.entityIcon}
              alt="Offer icon"
              className={sTable.priceItemIcon}
            />
          ) : (
            <BlankEntityIcon />
          )}
          <Typography
            variant={"body1"}
            color={"text.secondary"}
            sx={{
              whiteSpace: "wrap",
              ml: 1,
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {formatValue(params.value)}
          </Typography>
        </div>
      ),
    },
    {
      field: "total",
      headerName: "Total income",
      headerAlign: "center",
      type: "number",
      width: 140,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {params.row.entityIcon !== "" &&
          params.row.entityIcon !== undefined ? (
            <img
              src={params.row.entityIcon}
              alt="Offer icon"
              className={sTable.priceItemIcon}
            />
          ) : (
            <BlankEntityIcon />
          )}
          <Typography
            variant={"body1"}
            color={`text.primary`}
            sx={{
              whiteSpace: "nowrap",
              ml: 1,
              fontSize: "14px",
              fontWeight: "bold",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {params.value}
          </Typography>
        </div>
      ),
    },
    {
      field: "avgProfile",
      headerName: "Avg. Customer Profile",
      renderHeader: () => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "end",
          }}
        >
          <Typography
            variant={"body1"}
            color={`text.primary`}
            sx={{
              whiteSpace: "nowrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            Avg. Customer Profile
          </Typography>

          <Tooltip
            title={`Full profile snapshot is taken on every payment action with
                offer. This is an average of all such snapshots just before the
                action.`}
            placement="top"
          >
            <IconButton sx={{ borderRadius: 5, cursor: "default !important" }}>
              <InfoSharpIcon color="primary" />
            </IconButton>
          </Tooltip>
        </div>
      ),
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <AvgProfileRow params={params} totalField={"players"} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 50,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActionItemSelector
            id={params.row.name}
            avgProfile={params.row.avgProfile}
            type="economy_source"
          />
        </div>
      ),
    },
  ]);
  const [columns_topSinks, setColumns_topSinks] = useState([
    {
      field: "name",
      headerName: "Sink",
      headerAlign: "center",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant={"body1"}
            color={"text.secondary"}
            sx={{
              whiteSpace: "wrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {params.value}
          </Typography>
        </div>
      ),
    },
    {
      field: "mean",
      headerName: "Mean. spend",
      headerAlign: "center",
      width: "120",
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {params.row.entityIcon !== "" &&
          params.row.entityIcon !== undefined ? (
            <img
              src={params.row.entityIcon}
              alt="Offer icon"
              className={sTable.priceItemIcon}
            />
          ) : (
            <BlankEntityIcon />
          )}
          <Typography
            variant={"body1"}
            color={"text.secondary"}
            sx={{
              whiteSpace: "wrap",
              ml: 1,
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {formatValue(params.value)}
          </Typography>
        </div>
      ),
    },
    {
      field: "total",
      headerName: "Total spend",
      headerAlign: "center",
      type: "number",
      width: 110,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {params.row.entityIcon !== "" &&
          params.row.entityIcon !== undefined ? (
            <img
              src={params.row.entityIcon}
              alt="Offer icon"
              className={sTable.priceItemIcon}
            />
          ) : (
            <BlankEntityIcon />
          )}
          <Typography
            variant={"body1"}
            color={`text.primary`}
            sx={{
              whiteSpace: "nowrap",
              ml: 1,
              fontSize: "14px",
              fontWeight: "bold",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            {params.value}
          </Typography>
        </div>
      ),
    },
    {
      field: "avgProfile",
      headerName: "Avg. Customer Profile",
      renderHeader: () => (
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "end",
          }}
        >
          <Typography
            variant={"body1"}
            color={`text.primary`}
            sx={{
              whiteSpace: "nowrap",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            Avg. Customer Profile
          </Typography>

          <Tooltip
            title={`Full profile snapshot is taken on every payment action with
                offer. This is an average of all such snapshots just before the
                action.`}
            placement="top"
          >
            <IconButton sx={{ borderRadius: 5, cursor: "default !important" }}>
              <InfoSharpIcon color="primary" />
            </IconButton>
          </Tooltip>
        </div>
      ),
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <AvgProfileRow params={params} totalField={"players"} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 70,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActionItemSelector
            id={params.row.name}
            avgProfile={params.row.avgProfile}
            type="economy_sink"
          />
        </div>
      ),
    },
  ]);

  const tablesSettings = [
    {
      sx: { p: "15px", pr: 0, height: 600, width: "100%", mb: 7 },
      title: (
        <div
          style={{
            minHeight: "40px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Typography
            variant={"h6"}
            color={"text.secondary"}
            sx={{ fontSize: "18px", fontWeight: "regular", textAlign: "left" }}
          >
            Top products for in-game currency
          </Typography>
        </div>
      ),
      rowHeight: "auto",
      initialState: {
        pagination: {
          paginationModel: {
            pageSize: 5,
          },
        },
        sorting: {
          sortModel: [{ field: "revenue", sort: "desc" }],
        },
      },
      pageSizeOptions: [5],
    },
    {
      sx: { p: "15px", height: 600, width: "30%" },
      title: (
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Typography
            variant={"h6"}
            color={"text.secondary"}
            sx={{ fontSize: "18px", fontWeight: "regular", textAlign: "left" }}
          >
            Payment drivers for hard currency
          </Typography>

          <Tooltip
            title={
              <Typography
                variant={"body1"}
                color={"text.primary"}
                sx={{
                  fontSize: "13px",
                  fontWeight: "regular",
                  textAlign: "center",
                }}
              >
                If a player buys any offer containing a currency entity (for
                example, gems) in it's content, and then buys another offer
                using bought currency (for example, sword for gems), the latter
                offer is considered driver which led to the initial payment.
              </Typography>
            }
            placement="top"
          >
            <IconButton sx={{ borderRadius: 5, cursor: "default !important" }}>
              <InfoSharpIcon color="primary" />
            </IconButton>
          </Tooltip>
        </div>
      ),
      rowHeight: "auto",
      initialState: {
        pagination: {
          paginationModel: {
            pageSize: 5,
          },
        },
        sorting: {
          sortModel: [{ field: "chainedPayments", sort: "desc" }],
        },
      },
      pageSizeOptions: [5],
    },
    {
      sx: { p: "15px", height: 600, width: "50%" },
      title: (
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Typography
            variant={"h6"}
            color={"text.secondary"}
            sx={{ fontSize: "18px", fontWeight: "regular", textAlign: "left" }}
          >
            Top sources
          </Typography>
        </div>
      ),
      rowHeight: "auto",
      initialState: {
        pagination: {
          paginationModel: {
            pageSize: 5,
          },
        },
        sorting: {
          sortModel: [{ field: "chainedPayments", sort: "desc" }],
        },
      },
      mainProps: {
        autosizeOptions: {
          columns: ["name, mean, total"],
          includeOutliers: true,
        },
      },
      pageSizeOptions: [5],
    },
    {
      sx: { p: "15px", height: 600, width: "50%" },
      title: (
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Typography
            variant={"h6"}
            color={"text.secondary"}
            sx={{ fontSize: "18px", fontWeight: "regular", textAlign: "left" }}
          >
            Top sinks
          </Typography>
        </div>
      ),
      rowHeight: "auto",
      initialState: {
        pagination: {
          paginationModel: {
            pageSize: 5,
          },
        },
        sorting: {
          sortModel: [{ field: "chainedPayments", sort: "desc" }],
        },
      },
      mainProps: {
        autosizeOptions: {
          columns: ["name, mean, total"],
          includeOutliers: true,
        },
      },
      pageSizeOptions: [5],
    },
  ];

  function economyOffersTableFilter(tableData) {
    if (!tableData) return [];
    return selectedCurrencies.length
      ? tableData.filter((offer) =>
          selectedCurrencies.includes(offer.entityNodeID)
        )
      : tableData;
  }

  function CurrencyFilter() {
    const toggleCurrency = (nodeID) => {
      setSelectedCurrencies((prev) =>
        prev.includes(nodeID)
          ? prev.filter((id) => id !== nodeID)
          : [...prev, nodeID]
      );
    };

    return (
      <div
        className={s.currencyFilter}
        style={{ marginTop: "12px", marginLeft: "20px" }}
      >
        {currencies.map((curr) => (
          <Button
            key={curr.nodeID}
            onClick={() => toggleCurrency(curr.nodeID)}
            variant={
              selectedCurrencies.includes(curr.nodeID)
                ? "contained"
                : "outlined"
            }
            sx={{ marginRight: 1 }}
          >
            {curr.icon && (
              <img
                src={curr.icon}
                alt={curr.name}
                style={{ width: 30, marginRight: 8 }}
              />
            )}
            {curr.name}
          </Button>
        ))}
      </div>
    );
  }

  function economyFilter(chartObj) {
    if (!chartObj.data.data) return chartObj;
    if (!everFetchedBalanceViewTypes[filterViewType]) return chartObj;
    const tempChartObj = { ...chartObj, data: { ...chartObj.data } };
    const targetDataset = chartObj.savedData[filterViewType];
    tempChartObj.data.data = targetDataset.data.map((curr) => {
      const filteredSources = curr.currencies
        .filter((c) =>
          selectedCurrencies.length
            ? selectedCurrencies.includes(c.currencyNodeID)
            : true
        )
        .flatMap((c) => c[filterViewType].source)
        .filter((source) =>
          filterSources.length ? filterSources.includes(source.id) : true
        );
      const filteredSinks = curr.currencies
        .filter((c) =>
          selectedCurrencies.length
            ? selectedCurrencies.includes(c.currencyNodeID)
            : true
        )
        .flatMap((c) => c[filterViewType].sink)
        .filter((sink) =>
          filterSinks.length ? filterSinks.includes(sink.id) : true
        );
      const totalSources = filteredSources.reduce(
        (acc, source) => acc + source.value,
        0
      );
      const totalSinks = filteredSinks.reduce(
        (acc, sink) => acc - sink.value,
        0
      );
      return {
        ...curr,
        totalSources,
        totalSinks,
        balance: totalSources + totalSinks,
      };
    });
    return tempChartObj;
  }

  function economySourceSinksTableFilter(tableData) {
    if (!tableData) return [];
    return selectedCurrencies.length
      ? tableData.filter((row) =>
          selectedCurrencies.includes(row.currencyEntity)
        )
      : tableData;
  }

  // Create a filter function for the offer sales chart
  function offerSalesFilter(chartObj) {
    if (!chartObj.data.data || !chartObj.data.metadata) return chartObj;

    const tempChartObj = { ...chartObj };

    const filteredDatasetsConfigs = chartObj.datasetsConfigs.filter(
      (dataset) => {
        const offerID = dataset.offerID;
        if (!offerID || !chartObj.data.metadata.offers[offerID]) return true;

        const currency = chartObj.data.metadata.offers[offerID].currency;
        return (
          selectedCurrencies.length === 0 ||
          selectedCurrencies.includes(currency)
        );
      }
    );

    if (selectedCurrencies.length === 0) {
      tempChartObj.datasetsConfigs = filteredDatasetsConfigs;
      return tempChartObj;
    }

    const filteredOfferIDs = filteredDatasetsConfigs.map(
      (dataset) => dataset.offerID
    );

    tempChartObj.datasetsConfigs = filteredDatasetsConfigs;
    return tempChartObj;
  }

  function EconomyViewType() {
    return (
      <FormControl
        size="small"
        sx={{ ml: 2, flex: "1", maxWidth: 150, minHeight: 35 }}
      >
        <InputLabel id="viewTypeLabel" sx={{ fontSize: 12 }}>
          View type
        </InputLabel>
        <Select
          size="small"
          sx={{ borderRadius: "2rem", height: 35, fontSize: 12 }}
          labelId="viewTypeLabel"
          id="viewType"
          value={filterViewType}
          onChange={(e) => setFilteredViewType(e.target.value)}
          input={
            <OutlinedInput
              spellCheck={false}
              id="select-multiple-chip"
              label="viewType"
            />
          }
        >
          <MenuItem value={"absolute"}>Absolute</MenuItem>
          <MenuItem value={"session"}>Avg. per session</MenuItem>
          <MenuItem value={"player"}>Avg. per user</MenuItem>
        </Select>
      </FormControl>
    );
  }

  const [filterSources, setFilteredSources] = useState([]);
  const [availableSources, setAvailableSources] = useState([]);
  const [filterSinks, setFilteredSinks] = useState([]);
  const [availableSinks, setAvailableSinks] = useState([]);

  return (
    <div className={s.dashboardContent}>
      <Helmet>
        <title>{titles.d_ingamecurrency}</title>
      </Helmet>
      <div className={s.globalFilters}>
        <CurrencyFilter />
      </div>
      <LineChart
        isLoading={isLoading_CurrencyBalance}
        headerWidget={
          <div className={s.headerWidget}>
            <SourceFilter
              key="sourceFilter"
              filterSources={filterSources}
              setFilteredSources={setFilteredSources}
              availableSources={availableSources}
            />
            <SinkFilter
              key="sinkFilter"
              filterSinks={filterSinks}
              setFilteredSinks={setFilteredSinks}
              availableSinks={availableSinks}
            />
            <EconomyViewType key="viewTypeFilter" />
          </div>
        }
        chartObj={economyFilter(dashboardSettings.charts[0])}
        dateRange={filterDate}
        gameID={game.gameID}
        branch={branch}
      />
      <DataTable
        isLoading={isLoading_TopProducts}
        tableSettings={tablesSettings[0]}
        columns={columns_offerSales}
        rows={economyOffersTableFilter(offersSalesData)}
        onColumnsChange={createOnColumnsChange(setColumns_offerSales)}
      />
      <LineChart
        isLoading={isLoading_OffersSales}
        chartObj={offerSalesFilter(dashboardSettings.charts[3])}
        dateRange={filterDate}
        gameID={game.gameID}
        branch={branch}
      />
      <DataTable
        isLoading={isLoading_TopSourcesAndSinks}
        tableSettings={tablesSettings[2]}
        columns={columns_topSources}
        rows={economySourceSinksTableFilter(topSourcesAndSinks.sources)}
        onColumnsChange={createOnColumnsChange(setColumns_topSources)}
      />
      <DataTable
        isLoading={isLoading_TopSourcesAndSinks}
        tableSettings={tablesSettings[3]}
        columns={columns_topSinks}
        rows={economySourceSinksTableFilter(topSourcesAndSinks.sinks)}
        onColumnsChange={createOnColumnsChange(setColumns_topSinks)}
      />
    </div>
  );
};
function SourceFilter({ filterSources, setFilteredSources, availableSources }) {
  return (
    <FormControl
      size="small"
      sx={{ ml: 2, flex: "2", maxWidth: 300, minHeight: 35 }}
    >
      <InputLabel id="sourcesLabel" sx={{ fontSize: 12 }}>
        Sources
      </InputLabel>
      <Select
        size="small"
        sx={{ borderRadius: "2rem", height: 35, fontSize: 12 }}
        labelId="sourcesLabel"
        id="sources"
        multiple
        value={filterSources}
        onChange={(e) => setFilteredSources(e.target.value)}
        input={
          <OutlinedInput
            spellCheck={false}
            id="select-multiple-chip"
            label="sources"
          />
        }
        endAdornment={
          <Tooltip placement="top" title="Clear">
            <InputAdornment position="start">
              <Button
                onClick={() => setFilteredSources([])}
                sx={{ minWidth: "30px", width: "30px", marginRight: "15px" }}
              >
                <CloseIcon />
              </Button>
            </InputAdornment>
          </Tooltip>
        }
        renderValue={(selected) => (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.5,
              overflow: "hidden",
            }}
          >
            Showing {selected.length} source(s)
          </Box>
        )}
      >
        {availableSources.map((source) => (
          <MenuItem key={source} value={source}>
            {source}
            {filterSources.includes(source) ? (
              <RadioButtonCheckedIcon sx={{ ml: "auto", mr: 5 }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ ml: "auto", mr: 5 }} />
            )}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
function SinkFilter({ filterSinks, setFilteredSinks, availableSinks }) {
  return (
    <FormControl
      size="small"
      sx={{ ml: 2, flex: "2", maxWidth: 300, minHeight: 35 }}
    >
      <InputLabel id="sinksLabel" sx={{ fontSize: 12 }}>
        Sinks
      </InputLabel>
      <Select
        size="small"
        sx={{ borderRadius: "2rem", height: 35, fontSize: 12 }}
        labelId="sinksLabel"
        id="sinks"
        multiple
        value={filterSinks}
        onChange={(e) => setFilteredSinks(e.target.value)}
        input={
          <OutlinedInput
            spellCheck={false}
            id="select-multiple-chip"
            label="sinks"
          />
        }
        endAdornment={
          <Tooltip placement="top" title="Clear">
            <InputAdornment position="start">
              <Button
                onClick={() => setFilteredSinks([])}
                sx={{ minWidth: "30px", width: "30px", marginRight: "15px" }}
              >
                <CloseIcon />
              </Button>
            </InputAdornment>
          </Tooltip>
        }
        renderValue={(selected) => (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.5,
              overflow: "hidden",
            }}
          >
            Showing {selected.length} sink(s)
          </Box>
        )}
      >
        {availableSinks.map((sink) => (
          <MenuItem key={sink} value={sink}>
            {sink}
            {filterSinks.includes(sink) ? (
              <RadioButtonCheckedIcon sx={{ ml: "auto", mr: 5 }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ ml: "auto", mr: 5 }} />
            )}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default DashboardMon_InGameCurr;
