import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { select, geoPath, geoMercator, min, max, scaleLinear } from "d3";
import useResizeObserver from "../utility/useResizeObserver";
import Chip from "@mui/material/Chip";

import s from "../css/usersMapChart.module.css";
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

const UsersMapChart = ({ chartObj, dateRange, gameID, branch }) => {
  const svgRef = useRef();
  const wrapperRef = useRef();
  const dimensions = useResizeObserver(wrapperRef);
  const [selectedCountry, setSelectedCountry] = useState(null);

  const [selectedNetworks, setSelectedNetworks] = useState([]);

  const [selectedRetentionDay, setSelectedRetentionDay] = useState("");

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

  // [
  //   "Admob": {
  //     "Russia": {
  //         installs: 2
  //       },
  //       "Russia": {
  //         installs: 2
  //       },
  //   }

  // ]

  const [showNoDataError, setShowNoDataError] = useState([]);
  const [detailsOpened, setDetailsOpened] = useState(false);

  const [showSkeleton, setShowSkeleton] = useState(true);

  // We're using state variables for displaying data because otherwise the data in chart will blink every time it refetches
  const [updatedChartObj, setUpdatedChartObj] = useState();

  // Processed data of each network. It has the data of how much installs all networks have per country.
  // Accessing any network is possible by something like "details[networkName][countryName]", where networkName is the network name but in lowercase and without spaces (use .toLowerCase().replace(/\s+/g, ''))
  const [details, setDetails] = useState();
  const [retentionDetails, setRetentionDetails] = useState();

  const availableNetworks = [
    "Organic",
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

      setDetails(getInstallsByNetwork());
      setRetentionDetails(getRetentionByNetwork());

      function calculateTotalInstalls(data) {
        data.forEach((country) => {
          const installs = country.installs;
          const totalInstalls = Object.values(installs).reduce(
            (total, value) => total + value,
            0
          );
          country.totalInstalls = totalInstalls;
        });
        setUpdatedChartObj(chartObj);
      }
      calculateTotalInstalls(chartObj.data.data);
    } else {
      setShowSkeleton(true);
    }
  }, [chartObj]);

  function getInstallsByNetwork() {
    const installSumByNetworkAndCountry = {};
    if (chartObj.data.data === undefined || chartObj.data.data.length === 0)
      return;

    chartObj.data.data.forEach((item) => {
      const countryName = item.countryName;
      const installs = item.installs;

      //
      Object.keys(installs).forEach((network) => {
        //       ,
        if (!installSumByNetworkAndCountry[network]) {
          installSumByNetworkAndCountry[network] = {};
        }

        //
        if (!installSumByNetworkAndCountry[network][countryName]) {
          installSumByNetworkAndCountry[network][countryName] = 0;
        }

        installSumByNetworkAndCountry[network][countryName] +=
          installs[network];
      });
    });
    return installSumByNetworkAndCountry;
  }
  function getRetentionByNetwork() {
    const retentionSumByNetworkAndCountry = {};
    if (chartObj.data.data === undefined || chartObj.data.data.length === 0)
      return;

    chartObj.data.data.forEach((item) => {
      const countryName = item.countryName;
      const retention = item.retention;

      //
      Object.keys(retention).forEach((network) => {
        //       ,
        if (!retentionSumByNetworkAndCountry[network]) {
          retentionSumByNetworkAndCountry[network] = {};
        }
        if (!retentionSumByNetworkAndCountry[network][countryName]) {
          retentionSumByNetworkAndCountry[network][countryName] = {
            d1: 0,
            d3: 0,
            d7: 0,
          };
        }

        ["d1", "d3", "d7"].forEach((day) => {
          if (retention[network] && retention[network][day]) {
            retentionSumByNetworkAndCountry[network][countryName][day] +=
              retention[network][day];
          }
        });
      });
    });
    return retentionSumByNetworkAndCountry;
  }

  function getTotalRetention(networks, country, day) {
    let totalRetention = 0;

    networks.forEach((network) => {
      if (
        retentionDetails[network] &&
        retentionDetails[network][country] &&
        retentionDetails[network][country][day]
      ) {
        totalRetention += retentionDetails[network][country][day];
      }
    });

    if (isNaN(totalRetention)) {
      return 0;
    } else {
      return totalRetention;
    }
  }

  useEffect(() => {
    const svg = select(svgRef.current);

    let minProp;
    let maxProp;
    if (chartObj.data.data !== undefined) {
      // If user clicked on D1-D7 button, color map accordingly to their retention data
      if (selectedRetentionDay !== "") {
        minProp = Math.min(
          ...chartObj.data.data.map((country) =>
            getTotalRetention(
              selectedNetworks,
              country.countryName,
              selectedRetentionDay
            )
          )
        );
        maxProp = Math.max(
          ...chartObj.data.data.map((country) =>
            getTotalRetention(
              selectedNetworks,
              country.countryName,
              selectedRetentionDay
            )
          )
        );
      } else {
        minProp = Math.min(
          ...chartObj.data.data.map((country) => country.totalInstalls)
        );
        maxProp = Math.max(
          ...chartObj.data.data.map((country) => country.totalInstalls)
        );
      }
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

        if (selectedRetentionDay !== "") {
          return country
            ? colorScale(
                getTotalRetention(
                  selectedNetworks,
                  countryItem.properties.name,
                  selectedRetentionDay
                )
              )
            : "#323638";
        } else {
          return country ? colorScale(country.totalInstalls) : "#323638"; // If country found, give it a color. Otherwise gray
        }
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

        // Return retention data if we've selected retention as viewmode
        if (selectedRetentionDay === "") {
          return country
            ? `${country.countryName}: ${country.totalInstalls.toLocaleString()}`
            : countryItem.properties.name;
        } else {
          return country
            ? `${country.countryName}: ${getTotalRetention(selectedNetworks, country.countryName, selectedRetentionDay)}`
            : countryItem.properties.name;
        }
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
    selectedRetentionDay,
  ]);

  function calculateTotalInstalls(countryName) {
    const countryData = updatedChartObj.data.data.find(
      (country) => country.countryName === countryName
    );
    if (countryData) {
      const totalInstalls = selectedNetworks.reduce((sum, network) => {
        return sum + (countryData.installs[network] || 0);
      }, 0);

      return totalInstalls;
    } else {
      return 0;
    }
  }

  function safelyDivide(num1, num2) {
    if (num1 === 0 || num2 === 0) {
      return 0;
    } else {
      return num1 / num2;
    }
  }

  function setRetentionViewmode(day) {
    if (day === selectedRetentionDay) {
      setSelectedRetentionDay("");
    } else {
      setSelectedRetentionDay(day);
    }
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
              [
                chartObj.data.data !== undefined && (
                  <div className={s.networkChipsContainer}>
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
                          sx={{
                            color: "white",
                            marginRight: 1,
                            marginBottom: 1,
                          }}
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
                ),
              ]
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
                            New Users
                          </StyledTableCell>

                          <StyledTableCell
                            align="right"
                            sx={{ minWidth: "fit-content", whiteSpace: "pre" }}
                          >
                            <Tooltip
                              title="Switch map viewmode"
                              placement="bottom"
                              disableInteractive
                            >
                              <Button
                                variant={
                                  selectedRetentionDay === "d1"
                                    ? "contained"
                                    : "text"
                                }
                                sx={{ borderRadius: 0 }}
                                onClick={() => setRetentionViewmode("d1")}
                              >
                                D1
                              </Button>
                            </Tooltip>
                          </StyledTableCell>

                          <StyledTableCell
                            align="right"
                            sx={{ minWidth: "fit-content", whiteSpace: "pre" }}
                          >
                            <Tooltip
                              title="Switch map viewmode"
                              placement="bottom"
                              disableInteractive
                            >
                              <Button
                                variant={
                                  selectedRetentionDay === "d3"
                                    ? "contained"
                                    : "text"
                                }
                                sx={{ borderRadius: 0 }}
                                onClick={() => setRetentionViewmode("d3")}
                              >
                                D3
                              </Button>
                            </Tooltip>
                          </StyledTableCell>

                          <StyledTableCell
                            align="right"
                            sx={{ minWidth: "fit-content", whiteSpace: "pre" }}
                          >
                            <Tooltip
                              title="Switch map viewmode"
                              placement="bottom"
                              disableInteractive
                            >
                              <Button
                                variant={
                                  selectedRetentionDay === "d7"
                                    ? "contained"
                                    : "text"
                                }
                                sx={{ borderRadius: 0 }}
                                onClick={() => setRetentionViewmode("d7")}
                              >
                                D7
                              </Button>
                            </Tooltip>
                          </StyledTableCell>
                        </StyledTableRow>
                      </TableHead>
                      <TableBody>
                        {updatedChartObj.data.data !== undefined && [
                          updatedChartObj.data.data
                            .sort(
                              (a, b) =>
                                calculateTotalInstalls(b.countryName) -
                                calculateTotalInstalls(a.countryName)
                            )
                            .slice(0, 6)
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
                                {/* Installs */}
                                <StyledTableCell align="right">
                                  {calculateTotalInstalls(
                                    countryItem.countryName
                                  )}
                                </StyledTableCell>

                                {/* D1-D7 retention */}
                                <StyledTableCell align="right">
                                  <Tooltip
                                    title={
                                      getTotalRetention(
                                        selectedNetworks,
                                        countryItem.countryName,
                                        "d1"
                                      ) + " users"
                                    }
                                    placement="right-start"
                                  >
                                    {(
                                      safelyDivide(
                                        getTotalRetention(
                                          selectedNetworks,
                                          countryItem.countryName,
                                          "d1"
                                        ),
                                        calculateTotalInstalls(
                                          countryItem.countryName
                                        )
                                      ) * 100
                                    ).toFixed(2) + "%"}
                                  </Tooltip>
                                </StyledTableCell>

                                <StyledTableCell align="right">
                                  <Tooltip
                                    title={
                                      getTotalRetention(
                                        selectedNetworks,
                                        countryItem.countryName,
                                        "d1"
                                      ) + " users"
                                    }
                                    placement="right-start"
                                  >
                                    {(
                                      safelyDivide(
                                        getTotalRetention(
                                          selectedNetworks,
                                          countryItem.countryName,
                                          "d3"
                                        ),
                                        calculateTotalInstalls(
                                          countryItem.countryName
                                        )
                                      ) * 100
                                    ).toFixed(2) + "%"}
                                  </Tooltip>
                                </StyledTableCell>

                                <StyledTableCell align="right">
                                  <Tooltip
                                    title={
                                      getTotalRetention(
                                        selectedNetworks,
                                        countryItem.countryName,
                                        "d1"
                                      ) + " users"
                                    }
                                    placement="right-start"
                                  >
                                    {(
                                      safelyDivide(
                                        getTotalRetention(
                                          selectedNetworks,
                                          countryItem.countryName,
                                          "d7"
                                        ),
                                        calculateTotalInstalls(
                                          countryItem.countryName
                                        )
                                      ) * 100
                                    ).toFixed(2) + "%"}
                                  </Tooltip>
                                </StyledTableCell>
                              </StyledTableRow>
                            )),
                          <StyledTableRow
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                            }}
                          >
                            <StyledTableCell component="th" scope="row">
                              ...and {updatedChartObj.data.data.length - 6} more
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
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
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

                          {/* Finding data for each country in each ad network, so i.e. we get how many installs does AdMob have in each country */}
                          {updatedChartObj.data.data.map(
                            (countryObj, countryIndex) => (
                              <TableCell key={countryIndex} align="right">
                                {/* Making a div inside a table cell to center the content inside it. Not messing up with TableCell itself so we dont break things */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {details[
                                    network.toLowerCase().replace(/\s+/g, "")
                                  ][countryObj.countryName] || 0}
                                </div>
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

export default UsersMapChart;
