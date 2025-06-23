import React, { useState, useCallback } from "react";
import {
  Button,
  IconButton,
  Popover,
  OutlinedInput,
  FormControl,
  InputLabel,
  Tooltip,
  Box,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EntityPlaceholderIcon from "./entityItemPlaceholder.svg?react";

const trimStr = (str, maxLength) => {
  if (str === undefined || str === "") return "";
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
};

function EntityItem({
  entity,
  onAmountChanged,
  onRemove,
  disabledWidget = false,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [entityHovered, setEntityHovered] = useState(false);
  const [number, setNumber] = useState(entity.amount || 1);

  const handleClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.keyCode === 13) {
        e.preventDefault();
        onAmountChanged(entity.nodeID, number);
        handleClose();
      }
    },
    [entity.nodeID, number, onAmountChanged, handleClose]
  );

  const handleRemove = useCallback(() => {
    onRemove(entity.nodeID);
  }, [entity.nodeID, onRemove]);

  const open = Boolean(anchorEl);

  if (!entity) {
    return null;
  }

  return (
    <Tooltip
      title={`${entity.name} (${entity.entityBasic?.entityID})`}
      placement="top"
    >
      <Box
        sx={{ position: "relative" }}
        onMouseEnter={() => setEntityHovered(true)}
        onMouseLeave={() => setEntityHovered(false)}
      >
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              sx: {
                p: 2,
                borderRadius: 2,
              },
            },
          }}
        >
          <FormControl>
            <InputLabel>Amount (Enter to apply)</InputLabel>
            <OutlinedInput
              type="number"
              onKeyDown={handleKeyDown}
              onChange={(e) => setNumber(e.target.value)}
              defaultValue={entity.amount}
              label="Amount (Enter to apply)"
              size="small"
            />
          </FormControl>
        </Popover>

        {entityHovered && !disabledWidget && (
          <IconButton
            sx={{
              position: "absolute",
              top: -8,
              right: -8,
              backgroundColor: "background.paper",
              zIndex: 1,
              "&:hover": { backgroundColor: "error.light" },
            }}
            size="small"
            onClick={handleRemove}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}

        <Button
          disabled={disabledWidget}
          onClick={handleClick}
          variant="outlined"
          sx={{
            width: 64,
            height: 64,
            minWidth: 64,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 1,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              top: 8,
              left: 0,
              right: 0,
              zIndex: 2,
              color: "white",
              textShadow: `
                2px 2px 0 #000000,
                2px -2px 0 #000000,
                -2px 2px 0 #000000,
                -2px -2px 0 #000000,
                2px 0px 0 #000000,
                0px 2px 0 #000000,
                -2px 0px 0 #000000,
                0px -2px 0 #000000,
                1px 1px 0px rgba(0, 0, 0, 0)`,
              fontWeight: "bold",
            }}
          >
            {trimStr(entity.amount.toString(), 7)}
          </Typography>

          {entity.entityBasic?.entityIcon ? (
            <Box
              component="img"
              src={entity.entityBasic.entityIcon}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <EntityPlaceholderIcon style={{ width: "100%", height: "100%" }} />
          )}
        </Button>
      </Box>
    </Tooltip>
  );
}

export default EntityItem;
