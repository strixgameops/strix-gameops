import React, { useState, useCallback, useMemo } from "react";
import { Button, Typography, Popover, Divider, Box } from "@mui/material";
import UnfoldMore from "@mui/icons-material/UnfoldMore";
import ElementItem from "./ElementItem.jsx";
import s from "../../dashboard.module.css";
import sTable from "../css/offersSalesAndProfileDataTable.module.css";

const getShare = (profileItem, maxProp, withPercentage = true) => {
  if (!maxProp || profileItem.players === 0) {
    return withPercentage ? "0%" : 0;
  }
  const share = (profileItem.players / maxProp) * 100;
  return withPercentage ? `${share.toFixed(2)}%` : share;
};

const sortProfiles = (data, maxNumberForShare) => {
  return [...data]
    .map((profile) => ({
      ...profile,
      share: getShare(profile, maxNumberForShare, false),
    }))
    .sort((a, b) => b.share - a.share);
};

const AvgProfileRow = React.memo(({ params, totalField = "sales" }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleButtonClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const open = Boolean(anchorEl);
  const totalValue = params.row[totalField];

  const sortedProfiles = useMemo(() => {
    if (!params.value || params.value.length === 0) return [];
    return sortProfiles(params.value, parseInt(totalValue));
  }, [params.value, totalValue]);

  const visibleProfiles = useMemo(() => 
    sortedProfiles.slice(0, 15), 
    [sortedProfiles]
  );

  if (!params.value || params.value.length === 0) {
    return <div className={sTable.avgProfileTable} />;
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <div className={sTable.avgProfileTable}>
        <div 
          className={sTable.innerProfilesContainer}
          style={{ paddingRight: "25px" }}
        >
          {visibleProfiles.map((profile) => (
            <ElementItem
              key={profile.name}
              tooltipContent={profile.subProfiles}
              s={sTable}
              profile={{
                ...profile,
                share: getShare(profile, parseInt(totalValue), false),
              }}
              colored={true}
              scaleMin={0}
              scaleMax={20}
            />
          ))}
        </div>
        
        <Button
          variant="outlined"
          onClick={handleButtonClick}
          sx={{
            position: "absolute",
            right: 0,
            top: 0,
            height: "100%",
            minWidth: 20,
            width: 20,
            textTransform: "none",
            zIndex: 1,
          }}
        >
          <UnfoldMore />
        </Button>
      </div>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: "center",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "center",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            mt: -1,
            ml: -1,
            backgroundColor: "var(--bg-color3)",
            maxWidth: 560,
          },
        }}
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column" }}>
          <Typography variant="h6">Avg. Customer Profile</Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {sortedProfiles.map((profile) => (
              <ElementItem
                key={profile.name}
                tooltipContent={profile.subProfiles}
                s={sTable}
                profile={{
                  ...profile,
                  share: getShare(profile, parseInt(totalValue), false),
                }}
                colored={true}
                scaleMin={0}
                scaleMax={20}
              />
            ))}
          </Box>
        </Box>
      </Popover>
    </Box>
  );
});

export default AvgProfileRow;