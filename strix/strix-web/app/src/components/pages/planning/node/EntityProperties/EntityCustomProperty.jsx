import React, { useEffect, useState } from "react";
import s from "./css/entityCustomProperty.module.css";

import InputAdornment from "@mui/material/InputAdornment";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Input from "@mui/material/Input";
import FormHelperText from "@mui/material/FormHelperText";
import Box from "@mui/material/Box";

import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";

const EntityCustomProperty = ({
  ID,
  value,
  valueType,
  onAnyChange,
  isDuplicateError,
  onRemove,
}) => {
  const [propertyID, setPropertyID] = useState(ID ?? "");
  const [propertyValue, setPropertyValue] = useState(value ?? "");
  const [propertyValueType, setPropertyValueType] = useState(valueType ?? "");

  const [pendingRemove, setPendingRemove] = useState(false);

  function onChangeID(e) {
    setPropertyID(e.target.value ?? "");
    onAnyChangeCallback(e.target.value, propertyValue, propertyValueType);
  }
  function onChangeValue(e) {
    setPropertyValue(e.target.value ?? "");
    onAnyChangeCallback(propertyID, e.target.value, propertyValueType);
  }

  function onAnyChangeCallback(
    currentPropID,
    currentPropValue,
    currentPropValueType
  ) {
    onAnyChange({
      propertyID: currentPropID,
      value: currentPropValue,
      valueType: currentPropValueType,
    });
  }

  function callRemoveItem() {
    // On first click
    if (!pendingRemove) {
      setPendingRemove(true);
    } else {
      // On accept click
      onRemove();
    }
  }

  return (
    <div className={s.customPropertyItem}>
      <span className={s.label}>ID</span>
      <FormControl error={isDuplicateError} sx={{ m: 1 }} variant="standard">
        <Input
          spellCheck={false}
          id="customproperty"
          label="Value"
          onChange={onChangeID}
          value={propertyID}
        />
        {isDuplicateError && (
          <FormHelperText id="customproperty">
            IDs must be unique & not empty
          </FormHelperText>
        )}
      </FormControl>
      <span className={s.label}>Value</span>
      <FormControl sx={{ m: 1 }} variant="standard">
        <Input
          spellCheck={false}
          id="customproperty"
          label="Value"
          onChange={onChangeValue}
          value={propertyValue}
        />
      </FormControl>

      <Button
        onClick={callRemoveItem}
        onMouseLeave={() => setPendingRemove(false)}
        sx={{
          pt: "5px",
          ml: 1,
          height: "100%",
          minWidth: "30px",
          width: "70px",
          borderRadius: "2rem",

          "&": pendingRemove ? { bgcolor: "#b03333", color: "white" } : {},
          ":hover": pendingRemove
            ? { bgcolor: "#cf4040", color: "white" }
            : { bgcolor: "#b03333", color: "white" },
        }}
      >
        {pendingRemove ? <CheckIcon /> : <DeleteIcon />}
      </Button>
    </div>
  );
};

export default EntityCustomProperty;
