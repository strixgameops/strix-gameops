import React, { useState, useEffect, useRef } from "react";
import s from "../offerItem.module.css";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import AddIcon from "@mui/icons-material/Add";
import Tooltip from "@mui/material/Tooltip";

const AddEntity = ({
  onEntityAdded,
  onAmountChanged,
  offerStateContent,
  entities,
  disabledWidget = false,
}) => {
  // Add new entity to content
  const [newEntityAmount, setNewEntityAmount] = useState("1");
  const [currentNewEntityNodeID, setCurrentNewEntityNodeID] = useState("");
  const [currentSelectedEntity, setCurrentSelectedEntity] = useState();
  const [disableAddEntitySearchField, setDisableAddEntitySearchField] =
    useState(false);
  const [anchorEl_AddEntity, setAnchorEl_AddEntity] = React.useState(null);
  const open = Boolean(anchorEl_AddEntity);
  const showAddnewEntityPopover = (event) => {
    setAnchorEl_AddEntity(event.currentTarget);
  };

  function getEntitiesToAdd() {
    return entities
      .filter(
        (e) =>
          (offerStateContent.some((entity) => entity.nodeID === e.nodeID) ||
            e.entityBasic.isInAppPurchase === false) === false
      )
      .map((entity) => ({
        label: `${entity.name} (${entity.entityBasic.entityID})`,
        nodeID: entity.nodeID,
      }));
  }

  // Return formatted integer
  function handleIntegerInput(value) {
    if (value === undefined) return;
    // Real-world value input
    let currentInputValue = value;

    //   ,
    let sanitizedValue = currentInputValue.replace(/[^0-9]/g, "");

    return sanitizedValue;
  }

  return (
    <div>
      <Tooltip title="Add entity to content" disableInteractive>
        <Button
          onClick={showAddnewEntityPopover}
          key="addEntityButton"
          variant="outlined"
          sx={{
            width: "55px",
            minWidth: "55px",
            maxWidth: "55px",

            height: "55px",
            minHeight: "55px",
            maxHeight: "55px",

            opacity: 0.4,

            borderRadius: "3px",
            border: "1px solid #3b3b3b",
            // backgroundColor: "#222222",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            p: 1,
            m: 0,
            // "&:hover": {
            //   borderColor: "#dbdbdb",
            //   background: "none",
            //   opacity: 1,
            // },
            // color: "#e7e7e7",
          }}
        >
          <AddIcon />
        </Button>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl_AddEntity}
        onClose={(event) => {
          setAnchorEl_AddEntity(null);
          setNewEntityAmount("1");
          setCurrentNewEntityNodeID("");
          setDisableAddEntitySearchField(false);
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              overflow: "visible",
              backgroundImage: "none",
              backgroundColor: "var(--bg-color3)",
            },
          },
        }}
      >
        {entities && entities.length > 0 ? (
          getEntitiesToAdd().length > 0 ? (
            <div className={s.addNewEntityBody}>
              <Autocomplete
                disablePortal
                disabled={
                  disableAddEntitySearchField || getEntitiesToAdd().length === 0
                }
                id="addEntitySearch"
                onChange={(event, newValue) => {
                  // setDisableAddEntitySearchField(true)
                  setCurrentNewEntityNodeID(newValue.nodeID);
                  setCurrentSelectedEntity(newValue);
                }}
                options={getEntitiesToAdd()}
                sx={{ width: 300 }}
                renderInput={(params) => (
                  <TextField
                    spellCheck={false}
                    {...params}
                    label="Search entities"
                  />
                )}
              />
              <TextField
                spellCheck={false}
                id="entityAmount"
                fullWidth
                disabled={getEntitiesToAdd().length === 0}
                value={newEntityAmount}
                onChange={(e) => {
                  onAmountChanged(
                    currentNewEntityNodeID,
                    handleIntegerInput(e.target.value)
                  );
                  setNewEntityAmount(handleIntegerInput(e.target.value));
                }}
                label="Amount"
                variant="filled"
              />
              <Button
                disabled={
                  getEntitiesToAdd().length === 0 ||
                  newEntityAmount === "" ||
                  currentSelectedEntity === undefined
                }
                onClick={() =>
                  onEntityAdded(currentSelectedEntity, newEntityAmount)
                }
                sx={{ width: "50%" }}
                variant="outlined"
              >
                Add new
              </Button>
            </div>
          ) : (
            <div className={s.addNewEntityBody}>
              <div className={s.noEntities}>
                <p>No IAP entities found.</p>
              </div>
            </div>
          )
        ) : (
          <div className={s.addNewEntityBody}>
            <div className={s.noEntities}>
              <p>No entities found.</p>
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
};

export default AddEntity;
