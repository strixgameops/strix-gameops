import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { select, geoPath, geoMercator, min, max, scaleLinear } from "d3";
import useResizeObserver from "../utility/useResizeObserver";
import Chip from "@mui/material/Chip";

import s from "../css/revenueMapChart.module.css";
import Skeleton from "@mui/material/Skeleton";

// Details collapsible
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

// Table view
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";

import Tooltip from "@mui/material/Tooltip";

import * as data from "../utility/worldGeoData.world.geo.json";

const RevenueMapChart = ({ chartObj, dateRange, gameID, branch }) => {
  const svgRef = useRef();
  const wrapperRef = useRef();
  const dimensions = useResizeObserver(wrapperRef);
  const [selectedCountry, setSelectedCountry] = useState(null);

  const [selectedNetworks, setSelectedNetworks] = useState([]);

  // When we click on a country inside a map, we zoom in. But the problem is that small countries are zoomed too fast and they fit too tight.
  // For example, we don't want France to fit into the whole viewport, we would like to see France & a few neighbours.
  // For this, we may just play with .fitExtent inside d3, which we already doing. But then, upon static subtracting the extent,
  // the biggest countries being zoomed the wrong way. Because of their size they aren't zooming, but even zooming us out even futher than the default view zoom.
  // So we define here the biggest countries we don't want to mess zoom with. And we use this scales later in .fitExtent upon zooming
  const countryFitScale = [
    {
      name: "Russia",
      scale: 0,
    },
    {
      name: "United States",
      scale: 0,
    },
    {
      name: "Australia",
      scale: 0.5,
    },
    {
      name: "Canada",
      scale: 0,
    },
    {
      name: "Greenland",
      scale: 0,
    },
    {
      name: "Brazil",
      scale: 0.6,
    },
    {
      name: "China",
      scale: 0.6,
    },
  ];

  const [showNoDataError, setShowNoDataError] = useState([]);
  const [detailsOpened, setDetailsOpened] = useState(false);

  const [showSkeleton, setShowSkeleton] = useState(true);

  // We're using state variables for displaying data because otherwise the data in chart will blink every time it refetches
  const [updatedChartObj, setUpdatedChartObj] = useState();

  // Processed data of each network. It has the data of how much revenue all networks have per country.
  // Accessing any network is possible by something like "details[networkName][countryName]", where networkName is the network name but in lowercase and without spaces (use .toLowerCase().replace(/\s+/g, ''))
  const [details, setDetails] = useState();

  const availableNetworks = [
    "Admob",
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

  function toggleNetworkCategory(networkName) {
    setSelectedNetworks((prevCategories) =>
      prevCategories.includes(networkName)
        ? prevCategories.filter((category) => category !== networkName)
        : [...prevCategories, networkName]
    );
  }

  useEffect(() => {
    setSelectedNetworks(
      availableNetworks.map((network) =>
        network.toLowerCase().replace(/\s+/g, "")
      )
    );
  }, []);

  useEffect(() => {
    if (chartObj.data.data !== undefined && chartObj.data.data.length > 0) {
      setShowSkeleton(false);

      setDetails(getRevenueByNetwork());

      function calculateTotalRevenue(data) {
        data.forEach((country) => {
          const revenue = country.revenue;
          const totalRevenue = Object.values(revenue).reduce(
            (total, value) => total + value,
            0
          );
          country.totalRevenue = totalRevenue;
        });
        setUpdatedChartObj(chartObj);
      }
      calculateTotalRevenue(chartObj.data.data);
    } else {
      setShowSkeleton(true);
    }
  }, [chartObj]);

  function getRevenueByNetwork() {
    const revenueSumByNetworkAndCountry = {};
    if (chartObj.data.data === undefined || chartObj.data.data.length === 0)
      return;

    chartObj.data.data.forEach((item) => {
      const countryName = item.countryName;
      const revenue = item.revenue;

      //
      Object.keys(revenue).forEach((network) => {
        //       ,
        if (!revenueSumByNetworkAndCountry[network]) {
          revenueSumByNetworkAndCountry[network] = {};
        }

        //
        if (!revenueSumByNetworkAndCountry[network][countryName]) {
          revenueSumByNetworkAndCountry[network][countryName] = 0;
        }

        revenueSumByNetworkAndCountry[network][countryName] += revenue[network];
      });
    });
    return revenueSumByNetworkAndCountry;
  }

  useEffect(() => {
    const svg = select(svgRef.current);

    let minProp;
    let maxProp;
    if (chartObj.data.data !== undefined) {
      minProp = Math.min(
        ...chartObj.data.data.map((country) => country.totalRevenue)
      );
      maxProp = Math.max(
        ...chartObj.data.data.map((country) => country.totalRevenue)
      );
    }

    const colorScale = scaleLinear()
      .domain([minProp, maxProp])
      .range(["#323638", "lime"]);

    // use resized dimensions
    // but fall back to getBoundingClientRect, if no dimensions yet.
    const { width, height } =
      dimensions || wrapperRef.current.getBoundingClientRect();

    let fitScale;
    if (selectedCountry !== null) {
      let matchedCountry = countryFitScale.find(
        (c) => c.name === selectedCountry.properties.name
      );
      fitScale = matchedCountry ? matchedCountry.scale : 1;
    }
    // projects geo-coordinates on a 2D plane
    const projection = geoMercator()
      .fitExtent(
        [
          [0, selectedCountry && 100 * fitScale],
          [width, height - (selectedCountry && 100 * fitScale)],
        ],
        selectedCountry || data
      )
      .precision(100);

    // takes geojson data,
    // transforms that into the d attribute of a path element
    const pathGenerator = geoPath().projection(projection);

    // render each country
    svg
      .selectAll(`.${s.country}`)
      .data(data.features)
      .join("path")
      .on("click", (event, countryItem) => {
        setSelectedCountry(
          selectedCountry === countryItem ? null : countryItem
        );
      })
      // .on("mouseover", (event, countryItem) => {
      //   select(event.target).classed(s.countryHovered, true);
      // })
      // .on("mouseout", (event, countryItem) => {
      //   select(event.target).classed(s.countryHovered, false);
      // })
      .attr("class", `${s.country}`)
      .transition()
      .duration(900)
      .ease(d3.easeCubicInOut)
      .attr("fill", (countryItem) => {
        if (chartObj.data.data === undefined) return "#323638";
        const country = chartObj.data.data.find(
          (c) => c.countryName === countryItem.properties.name
        );
        return country ? colorScale(country.totalRevenue) : "#323638"; // If country found, give it a color. Otherwise gray
      })
      .attr("d", (countryItem) => pathGenerator(countryItem));

    // render text
    svg
      .selectAll(`.${s.countryDataLabel}`)
      .data([selectedCountry])
      .join("text")
      .text((countryItem) => {
        if (!countryItem) return "";
        if (chartObj.data.data === undefined) return "";
        const country = chartObj.data.data.find(
          (c) => c.countryName === countryItem.properties.name
        );
        return country
          ? `${country.countryName}: ${formatCurrency(country.totalRevenue).toLocaleString()}`
          : countryItem.properties.name;
      })
      .attr("class", `${s.countryDataLabel}`)
      .attr("x", 10)
      .attr("y", 25);
  }, [
    showSkeleton,
    data,
    dimensions,
    chartObj,
    dateRange,
    gameID,
    branch,
    selectedCountry,
  ]);

  function calculateTotalRevenue(countryName) {
    const countryData = updatedChartObj.data.data.find(
      (country) => country.countryName === countryName
    );
    if (countryData) {
      const totalRevenue = selectedNetworks.reduce((sum, network) => {
        return sum + (countryData.revenue[network] || 0);
      }, 0);

      return totalRevenue;
    } else {
      return 0;
    }
  }

  function formatCurrency(value) {
    let convertFromCents;

    if (value !== 0) {
      convertFromCents = parseFloat(value) / 100;
    } else {
      convertFromCents = 0;
    }
    //
    const parts = parseFloat(convertFromCents).toFixed(2).toString().split(".");
    const dollars = parts[0];
    const cents = parts[1];

    //
    const formattedDollars = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    //
    const formattedValue = `$${formattedDollars}.${cents}`;

    return formattedValue;
  }

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

  // console.log(chartObj.data)
  return (
    <div className={s.mapChartContainer}>
      <div className={s.mapChartBody}>
        <div className={s.mapChartContent}>
          <div className={s.mapChartHeader}>
            <div className={s.mapChartHeaderLabel}>
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
          </div>
          <div
            ref={wrapperRef}
            className={s.mapBody}
            style={{ marginBottom: "2rem" }}
          >
            {showSkeleton ? (
              <div className={s.LineChartSkeletonContainer}>
                <Skeleton animation="wave" variant="rectangle" />
              </div>
            ) : (
              <svg ref={svgRef} className={s.mapSvg}></svg>
            )}
          </div>
        </div>

        <div className={s.dataSection}>
          <div className={s.categoriesList}>
            {showSkeleton ? (
              <div className={s.LineChartSkeletonContainer}>
                <Skeleton
                  animation="wave"
                  variant="text"
                  sx={{ fontSize: "2rem", width: "200px" }}
                />
              </div>
            ) : (
              chartObj.data.data !== undefined && (
                <div>
                  {/* Make filtering chips so user can click and cut the data of unwanted ad network.
                  We only set here chips that are listen in data.networks response from server. So its crucial to enter them here on server-side or it wont draw here */}
                  {availableNetworks
                    .filter((adNetwork) =>
                      chartObj.data.networks.includes(
                        adNetwork.toLowerCase().replace(/\s+/g, "")
                      )
                    )
                    .map((adNetwork, index) => (
                      <Chip
                        size="small"
                        key={index}
                        color="success"
                        label={adNetwork}
                        sx={{ color: "white", marginRight: 1, marginBottom: 1 }}
                        variant={
                          selectedNetworks.includes(
                            adNetwork.toLowerCase().replace(/\s+/g, "")
                          )
                            ? "contained"
                            : "outlined"
                        }
                        onClick={(e) =>
                          toggleNetworkCategory(
                            adNetwork.toLowerCase().replace(/\s+/g, "")
                          )
                        }
                      />
                    ))}
                </div>
              )
            )}
          </div>
          <div className={s.dataList}>
            {showSkeleton ? (
              <div className={s.LineChartSkeletonContainer}>
                <Skeleton animation="wave" variant="rectangle" />
              </div>
            ) : (
              <div className={s.tableContainer}>
                <Paper
                  sx={{
                    overflow: "hidden",
                    backgroundColor: "rgba(0,0,0,0)",
                    backgroundImage: "none",
                  }}
                >
                  <TableContainer sx={{}}>
                    <Table size="small" aria-label="simple table">
                      <TableHead>
                        <StyledTableRow>
                          <StyledTableCell>Country</StyledTableCell>
                          <StyledTableCell
                            align="right"
                            sx={{ minWidth: "fit-content", whiteSpace: "pre" }}
                          >
                            Revenue
                          </StyledTableCell>
                        </StyledTableRow>
                      </TableHead>
                      <TableBody>
                        {updatedChartObj.data.data !== undefined && [
                          updatedChartObj.data.data
                            .sort(
                              (a, b) =>
                                calculateTotalRevenue(b.countryName) -
                                calculateTotalRevenue(a.countryName)
                            )
                            .slice(0, 5)
                            .map((countryItem) => (
                              <StyledTableRow
                                key={countryItem.countryName}
                                sx={{
                                  "&:last-child td, &:last-child th": {
                                    border: 0,
                                  },
                                }}
                              >
                                {/* Country name*/}
                                <StyledTableCell component="th" scope="row">
                                  {countryItem.countryName}
                                </StyledTableCell>
                                {/* Revenue */}
                                <StyledTableCell align="right">
                                  {formatCurrency(
                                    calculateTotalRevenue(
                                      countryItem.countryName
                                    )
                                  )}
                                </StyledTableCell>
                              </StyledTableRow>
                            )),
                          <StyledTableRow
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                            }}
                          >
                            <StyledTableCell component="th" scope="row">
                              ...and {updatedChartObj.data.data.length - 5} more
                            </StyledTableCell>
                          </StyledTableRow>,
                        ]}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Need to wrap collapsible so we can move expand button where we need */}
      <div className={s.collapsibleWrapper}>
        <div className={s.collapsibleButton}>
          <Button onClick={() => setDetailsOpened(!detailsOpened)}>
            details
            {detailsOpened ? <ExpandLess /> : <ExpandMore />}
          </Button>
        </div>
        <div className={s.collapsibleBody}>
          <Collapse in={detailsOpened}>
            {/* Generating details table */}
            {updatedChartObj !== undefined && details !== undefined && (
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Network</TableCell>

                      {/* Generate headers for all countried we have data for */}
                      {updatedChartObj.data.data.map((country) => (
                        <TableCell
                          align="right"
                          sx={{ minWidth: "fit-content", whiteSpace: "pre" }}
                        >
                          {country.countryName}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Here we iterate through all possible ad networks and generate a row with it's name if this network is present in our data.
                  ...It is made such way because we store lowercase and without-spaces network names, and using 'availableNetworks' variable is the only
                  ...way we can get nice network name. I.e. "admob" from data becomes "AdMob" from availableNetworks, "unityads" becomes "Unity Ads" */}
                    {availableNetworks
                      .filter(
                        (network) =>
                          updatedChartObj.data.networks.includes(
                            network.toLowerCase().replace(/\s+/g, "")
                          ) &&
                          selectedNetworks.includes(
                            network.toLowerCase().replace(/\s+/g, "")
                          )
                      )
                      .map((network, networkIndex) => (
                        <TableRow
                          key={network}
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                          }}
                        >
                          <TableCell component="th" scope="row">
                            {network}
                          </TableCell>

                          {/* Finding data for each country in each ad network, so i.e. we get how many revenue does AdMob have in each country */}
                          {updatedChartObj.data.data.map(
                            (countryObj, countryIndex) => (
                              <TableCell key={countryIndex} align="center">
                                {formatCurrency(
                                  details[
                                    network.toLowerCase().replace(/\s+/g, "")
                                  ][countryObj.countryName]
                                )}
                              </TableCell>
                            )
                          )}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Collapse>
        </div>
      </div>
    </div>
  );
};

export default RevenueMapChart;
