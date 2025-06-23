import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { select, geoPath, geoMercator, scaleLinear } from "d3";
import useResizeObserver from "../utility/useResizeObserver";
import Skeleton from "@mui/material/Skeleton";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

// Details collapsible
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

// Table view (  ,  )
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";

//
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";

import * as data from "../utility/worldGeoData.world.geo.json";

import s from "../css/installsMapChart.module.css";

const InstallsMapChart = ({ chartObj, dateRange, gameID, branch }) => {
  const svgRef = useRef();
  const wrapperRef = useRef();
  const dimensions = useResizeObserver(wrapperRef);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  //
  const countryFitScale = [
    { name: "Russia", scale: 0 },
    { name: "United States", scale: 0 },
    { name: "Australia", scale: 0.5 },
    { name: "Canada", scale: 0 },
    { name: "Greenland", scale: 0 },
    { name: "Brazil", scale: 0.6 },
    { name: "China", scale: 0.6 },
  ];

  const [showNoDataError, setShowNoDataError] = useState([false]);
  const [detailsOpened, setDetailsOpened] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [updatedChartObj, setUpdatedChartObj] = useState();

  //
  // sortColumn   "installs", "d1", "d3", "d7", "country"  "none" ( )
  const [sortColumn, setSortColumn] = useState("installs");
  // sortDirection: "asc"  "desc".  sortColumn === "none"   .
  const [sortDirection, setSortDirection] = useState("desc");

  const handleSort = (column) => {
    if (column === "country") {
      if (sortColumn === "country") {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else if (sortDirection === "desc") {
          setSortColumn("none");
          setSortDirection("");
        } else {
          setSortColumn("country");
          setSortDirection("asc");
        }
      } else {
        setSortColumn("country");
        setSortDirection("asc");
      }
    } else {
      if (sortColumn === column) {
        setSortDirection(sortDirection === "desc" ? "asc" : "desc");
      } else {
        setSortColumn(column);
        setSortDirection("desc");
      }
    }
  };

  useEffect(() => {
    if (chartObj.data.data !== undefined && chartObj.data.data.length > 0) {
      setShowSkeleton(false);
      setShowNoDataError(false);
      chartObj.data.data.forEach((country) => {
        country.totalInstalls = country.installs;
      });
      setUpdatedChartObj(chartObj);
    } else {
      setShowSkeleton(true);
      setShowNoDataError(true);
    }
  }, [chartObj]);

  useEffect(() => {
    const svg = select(svgRef.current);

    const minProp = chartObj.data.data
      ? Math.min(...chartObj.data.data.map((country) => country.totalInstalls))
      : 0;
    const maxProp = chartObj.data.data
      ? Math.max(...chartObj.data.data.map((country) => country.totalInstalls))
      : 0;

    //    "#422400"  "#CD6F00"   .
    const colorScale = scaleLinear()
      .domain([minProp, maxProp])
      .range(["#422400", "#CD6F00"]);

    const { width, height } =
      dimensions || wrapperRef.current.getBoundingClientRect();

    let fitScale;
    if (selectedCountry !== null) {
      let matchedCountry = countryFitScale.find(
        (c) => c.name === selectedCountry.properties.name
      );
      fitScale = matchedCountry ? matchedCountry.scale : 1;
    }

    const projection = geoMercator()
      .fitExtent(
        [
          [0, selectedCountry && 100 * fitScale],
          [width, height - (selectedCountry && 100 * fitScale)],
        ],
        selectedCountry || data
      )
      .precision(100);

    const pathGenerator = geoPath().projection(projection);

    svg
      .selectAll(`.${s.country}`)
      .data(data.features)
      .join("path")
      .on("click", (event, countryItem) => {
        setSelectedCountry(
          selectedCountry === countryItem ? null : countryItem
        );
      })
      .on("mouseover", (event, countryItem) => {
        if (!chartObj.data.data) return;
        const countryData = chartObj.data.data.find(
          (c) => c.countryName === countryItem.properties.name
        );
        setHoveredCountry({
          country: countryItem,
          data: countryData,
        });
        setTooltipPosition({ x: event.pageX, y: event.pageY });
      })
      .on("mouseout", () => {
        setHoveredCountry(null);
      })
      .attr("class", `${s.country}`)
      .transition()
      .duration(900)
      .ease(d3.easeCubicInOut)
      .attr("fill", (countryItem) => {
        if (chartObj.data.data === undefined) return "#696868";
        const country = chartObj.data.data.find(
          (c) => c.countryName === countryItem.properties.name
        );
        //     installs  0,
        if (!country || country.totalInstalls === 0) return "#696868";
        return colorScale(country.totalInstalls);
      })
      .attr("d", (countryItem) => pathGenerator(countryItem));
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

  function calculateTotalInstalls(countryName) {
    const countryData = updatedChartObj?.data?.data?.find(
      (country) => country.countryName === countryName
    );
    return countryData ? countryData.totalInstalls : 0;
  }

  function getRetentionValue(countryName, day) {
    const countryData = updatedChartObj?.data?.data?.find(
      (country) => country.countryName === countryName
    );
    if (
      countryData &&
      countryData.retention &&
      countryData.retention[day] !== undefined
    ) {
      return String(countryData.retention[day]);
    }
    return "N/A";
  }

  //
  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: "none",
      color: theme.palette.common.black,
      cursor: "pointer",
      fontSize: "14px",
      padding: "12px",
      textAlign: "center",
    },
    [`&.${tableCellClasses.body}`]: {
      fontSize: 14,
      padding: "12px",
      textAlign: "center",
    },
  }));

  const StyledTableRow = styled(TableRow)(({ theme }) => ({
    "&:nth-of-type(odd)": {
      backgroundColor: "#f9f9f9",
    },
    "&:nth-of-type(even)": {
      backgroundColor: "#ffffff",
    },
    "&:hover": {
      backgroundColor: "rgba(104, 87, 143, 0.1)",
    },
  }));

  let sortedData = [];
  if (updatedChartObj?.data?.data) {
    if (sortColumn === "none") {
      sortedData = updatedChartObj.data.data.slice();
    } else {
      sortedData = updatedChartObj.data.data.slice().sort((a, b) => {
        let aVal, bVal;
        switch (sortColumn) {
          case "installs":
            aVal = a.totalInstalls;
            bVal = b.totalInstalls;
            break;
          case "d1":
            aVal = a.retention?.d1 ? parseFloat(a.retention.d1) : 0;
            bVal = b.retention?.d1 ? parseFloat(b.retention.d1) : 0;
            break;
          case "d3":
            aVal = a.retention?.d3 ? parseFloat(a.retention.d3) : 0;
            bVal = b.retention?.d3 ? parseFloat(b.retention.d3) : 0;
            break;
          case "d7":
            aVal = a.retention?.d7 ? parseFloat(a.retention.d7) : 0;
            bVal = b.retention?.d7 ? parseFloat(b.retention.d7) : 0;
            break;
          case "country":
            aVal = a.countryName.toLowerCase();
            bVal = b.countryName.toLowerCase();
            if (aVal < bVal) return sortDirection === "desc" ? 1 : -1;
            if (aVal > bVal) return sortDirection === "desc" ? -1 : 1;
            return 0;
          default:
            aVal = a.totalInstalls;
            bVal = b.totalInstalls;
        }
        return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
      });
    }
  }

  let finalSortedData = sortedData;
  if (selectedCountry) {
    const selectedCountryName = selectedCountry.properties.name;
    finalSortedData = sortedData.filter(
      (item) => item.countryName !== selectedCountryName
    );
    const selectedRow = updatedChartObj.data.data.find(
      (item) => item.countryName === selectedCountryName
    );
    if (selectedRow) {
      finalSortedData.unshift(selectedRow);
    }
  }

  return (
    <div className={s.mapChartContainer} style={{ position: "relative" }}>
      {/*  Backdrop     */}
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: 2000,
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          borderRadius: "20px",
        }}
        open={showSkeleton}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

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
              <>
                <svg ref={svgRef} className={s.mapSvg}></svg>
                {hoveredCountry && (
                  <div
                    className={s.tooltip}
                    style={{
                      left: tooltipPosition.x + 15,
                      top: tooltipPosition.y - 20,
                    }}
                  >
                    {hoveredCountry.data ? (
                      <>
                        <div className={s.tooltipHeader}>
                          {hoveredCountry.country.properties.name}
                        </div>
                        <div className={s.tooltipContent}>
                          <div>
                            Installs: {hoveredCountry.data.totalInstalls}
                          </div>
                          <div>
                            D1:{" "}
                            {getRetentionValue(
                              hoveredCountry.country.properties.name,
                              "d1"
                            )}
                          </div>
                          <div>
                            D3:{" "}
                            {getRetentionValue(
                              hoveredCountry.country.properties.name,
                              "d3"
                            )}
                          </div>
                          <div>
                            D7:{" "}
                            {getRetentionValue(
                              hoveredCountry.country.properties.name,
                              "d7"
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className={s.tooltipHeader}>
                        {hoveredCountry.country.properties.name}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className={s.dataSection}>
          <div className={s.dataList}>
            <div className={s.tableContainer} style={{ marginRight: "10px" }}>
              <Paper
                sx={{
                  overflow: "hidden",
                  border: "1px solid rgba(98, 95, 244, 0.2)",
                  borderBottomLeftRadius: "1rem",
                  borderBottomRightRadius: "1rem",
                  boxShadow: "0px 5px 10px 2px rgba(34, 60, 80, 0.2)",
                }}
              >
                <TableContainer
                  sx={{
                    maxHeight: 300,
                    backgroundColor: "#fff",
                    overflow: "auto",
                    "&::-webkit-scrollbar": { width: "0.4em" },
                    "&::-webkit-scrollbar-track": { background: "#f1f1f1" },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "#888",
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                      background: "#555",
                    },
                  }}
                >
                  <Table size="small" aria-label="simple table" stickyHeader>
                    <TableHead>
                      <StyledTableRow>
                        <StyledTableCell onClick={() => handleSort("country")}>
                          Country{" "}
                          {sortColumn === "country"
                            ? sortDirection === "asc"
                              ? "↑"
                              : sortDirection === "desc"
                                ? "↓"
                                : ""
                            : ""}
                        </StyledTableCell>
                        <StyledTableCell
                          align="right"
                          onClick={() => handleSort("installs")}
                        >
                          <Tooltip
                            title="Number of installations for the selected period."
                            placement="top"
                          >
                            <IconButton
                              sx={{
                                borderRadius: 5,
                                cursor: "default !important",
                              }}
                            >
                              <InfoSharpIcon color="primary" />
                            </IconButton>
                          </Tooltip>
                          Installs{" "}
                          {sortColumn === "installs" &&
                            (sortDirection === "desc" ? "↓" : "↑")}
                        </StyledTableCell>
                        <StyledTableCell
                          align="right"
                          onClick={() => handleSort("d1")}
                        >
                          <Tooltip
                            title="Percentage retained from the initial date. (D1, D3, D7)."
                            placement="top"
                          >
                            <IconButton
                              sx={{
                                borderRadius: 5,
                                cursor: "default !important",
                              }}
                            >
                              <InfoSharpIcon color="primary" />
                            </IconButton>
                          </Tooltip>
                          D1{" "}
                          {sortColumn === "d1" &&
                            (sortDirection === "desc" ? "↓" : "↑")}
                        </StyledTableCell>
                        <StyledTableCell
                          align="right"
                          onClick={() => handleSort("d3")}
                        >
                          D3{" "}
                          {sortColumn === "d3" &&
                            (sortDirection === "desc" ? "↓" : "↑")}
                        </StyledTableCell>
                        <StyledTableCell
                          align="right"
                          onClick={() => handleSort("d7")}
                        >
                          D7{" "}
                          {sortColumn === "d7" &&
                            (sortDirection === "desc" ? "↓" : "↑")}
                        </StyledTableCell>
                      </StyledTableRow>
                    </TableHead>
                    <TableBody>
                      {finalSortedData.map((countryItem) => {
                        const isSelected =
                          selectedCountry &&
                          countryItem.countryName ===
                            selectedCountry.properties.name;
                        return (
                          <StyledTableRow
                            key={countryItem.countryName}
                            style={
                              isSelected
                                ? {
                                    backgroundColor: "#CD6F00",
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 1,
                                  }
                                : {}
                            }
                            sx={{
                              "&:last-child td, &:last-child th": {
                                border: 0,
                              },
                            }}
                          >
                            <StyledTableCell component="th" scope="row">
                              {countryItem.countryName}
                            </StyledTableCell>
                            <StyledTableCell align="right">
                              {calculateTotalInstalls(countryItem.countryName)}
                            </StyledTableCell>
                            <StyledTableCell align="right">
                              {getRetentionValue(countryItem.countryName, "d1")}
                            </StyledTableCell>
                            <StyledTableCell align="right">
                              {getRetentionValue(countryItem.countryName, "d3")}
                            </StyledTableCell>
                            <StyledTableCell align="right">
                              {getRetentionValue(countryItem.countryName, "d7")}
                            </StyledTableCell>
                          </StyledTableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </div>
            {showNoDataError && (
              <div className={s.noDataLabel} key="noDataLabel">
                {chartObj.chartSettings.customNoDataLabel}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallsMapChart;
