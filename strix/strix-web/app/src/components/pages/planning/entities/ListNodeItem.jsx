import React, { memo, useState, useMemo, useEffect, useRef } from "react";
import { useDrag } from "react-dnd";
import s from "./css/nodesListItems.module.css";
import { getEmptyImage } from "react-dnd-html5-backend";

import NodeItemVisualComp from "./NodeItemVisualComp";

import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
function getStyles(left, top, isDragging) {
  return {
    opacity: isDragging ? 0 : 1,
    height: isDragging ? 0 : "",
    cursor: isDragging ? "grabbing" : "grab",
  };
}

const ListNodeItem = memo(function DraggableBox({
  handleClick,
  node,
  onRemove,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
}) {
  const [nodeItem, setNodeItem] = useState(node);
  useEffect(() => {
    setNodeItem(node);
  }, [node]);

  const [pendingRemove, setPendingRemove] = useState(false);
  const [itemHovered, setItemHovered] = useState(false);

  const anchorEl = useRef(null);
  const [openLastRemovalAccept, setOpenLastRemovalAccept] = useState(false);

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: "node",
      item: node,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [node]
  );

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, []);
  useEffect(() => {
    if (isDragging) {
      document.body.classList.add("grabbing");
    } else {
      document.body.classList.remove("grabbing");
    }

    return () => {
      document.body.classList.remove("grabbing");
    };
  }, [isDragging]);

  function callRemoveItem() {
    // On first click
    if (!pendingRemove) {
      setPendingRemove(true);
    } else {
      // On accept click
      setOpenLastRemovalAccept(true);
    }
  }
  function finalAccept() {
    // When user clicks on final popover accept
    onRemove(node.ID);
    setOpenLastRemovalAccept(false);
  }
  const handleClosePopover = () => {
    setOpenLastRemovalAccept(false);
  };

  return (
    <>
      <Popover
        id={node.ID}
        open={openLastRemovalAccept}
        anchorEl={anchorEl.current}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              backgroundImage: "none",
              backgroundColor: "var(--bg-color3)",
              p: 2,
              overflow: "hidden",
            },
          },
        }}
      >
        <ol className={s.warningText}>
          <Typography sx={{ p: 2 }}>
            Are you sure you want to delete this entity?
            <br />
            This will destroy all dependencies.
            <br />
            This action cannot be undone!
          </Typography>
        </ol>
        <Button onClick={finalAccept} sx={{ m: 1 }} variant="text">
          Delete
        </Button>
        <Button onClick={handleClosePopover} sx={{ m: 1 }} variant="contained">
          Cancel
        </Button>
      </Popover>
      <div
        style={getStyles(isDragging)}
        ref={node.ID === "Uncategorized" ? null : drag}
        onClick={(event) => event.stopPropagation()}
        onMouseEnter={() => setItemHovered(true)}
        onMouseLeave={() => setItemHovered(false)}
      >
        <div
          ref={anchorEl}
          onClick={(e) => handleClick(e, nodeItem.ID)}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
        >
          <NodeItemVisualComp
            item={nodeItem}
            isUncategorized={node.ID === "Uncategorized"}
            isCategory={node.isCategory}
          />
        </div>

        {node.ID !== "Uncategorized" && (
          <div
            className={`${s.removeButton} ${itemHovered && s.removeButtonShow}`}
          >
            <Button
              onClick={callRemoveItem}
              onMouseLeave={() => setPendingRemove(false)}
              sx={{
                pt: "5px",
                ml: 1,
                height: "100%",
                minWidth: "30px",
                width: "45px",
                borderRadius: "2rem",

                "&": pendingRemove
                  ? { bgcolor: "#b03333", color: "white" }
                  : {},
                ":hover": pendingRemove
                  ? { bgcolor: "#cf4040", color: "white" }
                  : { bgcolor: "#b03333", color: "white" },
              }}
            >
              {pendingRemove ? <CheckIcon /> : <DeleteIcon />}
            </Button>
          </div>
        )}
      </div>
    </>
  );
});

export default ListNodeItem;
