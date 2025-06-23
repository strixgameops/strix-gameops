import React, { useState, useEffect, useRef } from "react";
import s from "./chartBuilder.module.css";
import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import Collapse from "@mui/material/Collapse";
import DataArrayIcon from '@mui/icons-material/DataArray';
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

const ViewtypeSelector = ({ onDimensionSelected, selectedDimension }) => {
  return (
    <div className={s.categoriesList}>
      <div className={s.categoryItem}>
        <DataArrayIcon
          fontSize="small"
        />
        <Select
          value={selectedDimension}
          size="small"
          fullWidth
          onChange={(e) => onDimensionSelected(e.target.value)}
        >
          <MenuItem value={"absolute"}>Absolute</MenuItem>
          <MenuItem value={"session"}>Avg. per session</MenuItem>
          <MenuItem value={"player"}>Avg. per user</MenuItem>
        </Select>
      </div>
    </div>
  );
};

export default ViewtypeSelector;
