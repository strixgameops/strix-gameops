import React, { useState, useEffect, useRef } from "react";
import Collapse from "@mui/material/Collapse";
import { Typography } from "@mui/material";
import s from "../css/avgCustomProfile.module.css";
import Button from "@mui/material/Button";
import ElementItem from "../profileAnalytics/ElementItem";

import LineChart from "../LineChart";

import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import Tooltip from "@mui/material/Tooltip";

const AvgCustomerProfile = ({
  profile,
  isLoading,
}) => {

  function getShare(profileItem, maxProp, withPercentage = true) {
    if (profileItem.players === 0 || maxProp === 0)
      return withPercentage ? "0%" : 0;

    let res = (
      ((profileItem.players / profileItem.sampleSize) * maxProp) / maxProp *
     100
   );
    return withPercentage ? `${res}%` : res;
  }

  function sortProfiles(data, maxNumberForShare) {
    let sortedData = [...data];
    sortedData = sortedData.map((profile) => ({
      ...profile,
      share: getShare(profile, maxNumberForShare, false),
    }));
    sortedData = sortedData.sort((a, b) => b.share - a.share);
    return sortedData;
  }


  useEffect(() => {
    if (profile?.arpu && profile?.arppu) {
      setDashboardSettings((prevDashboards) => {
        return {
          ...prevDashboards,
          charts: prevDashboards.charts.map((chart) => {
            if (chart.metricName === "arppu") {
              return {
                ...chart,
                data: {
                  data: profile.arppu,
                  granularity: "day",
                },
              };
            }
            if (chart.metricName === "arpu") {
              return {
                ...chart,
                data: {
                  data: profile.arpu,
                  granularity: "day",
                },
              };
            }
            return chart;
          }),
        };
      });
    }
  }, [profile?.arpu, profile?.arppu]);

  return (
    <div className={s.mainBody}>
      <Typography
          variant={"h6"}
          color={"text.secondary"}
          sx={{
            pt: 1.5,
            pb: 1.5,
            mr: 3,
            pl: 2,
            fontSize: "18px",
            fontWeight: "regular",
            textAlign: "left",
            borderBottom: "1px solid rgba(98, 95, 244, 0.2)"
          }}
        >
          Average paying user profile
        </Typography>

      <Backdrop
        sx={{ color: "#fff", zIndex: 2, position: "absolute", borderRadius: "1rem" }}
        open={isLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <div className={s.avgProfileTable}>
          {profile &&
            sortProfiles(profile.avgProfile, profile.totalPlayers).map(
              (prof, index) => {
                return (
                  <ElementItem
                    tooltipContent={prof.subProfiles}
                    key={index}
                    profile={prof}
                    s={s}
                  />
                );
              }
            )}
        </div>
    </div>
  );
};

export default AvgCustomerProfile;
