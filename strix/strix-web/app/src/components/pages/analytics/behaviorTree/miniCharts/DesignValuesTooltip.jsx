import React from "react";
import s from "./ttaStyle.module.css";
import Tooltip_DesignValuesDistributionChart from "./Tooltip_DesignValuesDistributionChart";

import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function DesignValuesTooltip({ data, valueObjects }) {
  const [currTab, setCurrTab] = React.useState(0);

  const handleChangeTab = (event, newValue) => {
    setCurrTab(newValue);
  };

  function trim(str, maxLength) {
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  }
  return (
    <div>
      <Box sx={{ width: "100%", maxWidth: "100%", }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", maxWidth: "600px", overflowX: "auto", scrollbarWidth: "thin" }}>
          <Tabs value={currTab} onChange={handleChangeTab} sx={{width: "fit-content"}}>
            {valueObjects.map((value, index) => (
              <Tab key={index} label={trim(value.valueName, 16)} />
            ))}
          </Tabs>
        </Box>
        {valueObjects.map((value, index) => (
          <CustomTabPanel value={currTab} index={index}>
            <Tooltip_DesignValuesDistributionChart
              data={data[valueObjects[index].valueID]}
              valueObj={value}
            />
          </CustomTabPanel>
        ))}
      </Box>
    </div>
  );
}

export default DesignValuesTooltip;
