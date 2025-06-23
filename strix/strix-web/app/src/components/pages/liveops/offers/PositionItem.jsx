import React, { useState, useEffect, useRef } from "react";
import s from "./positionItem.module.css";

import { Collapse } from "@mui/material";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import EditSharpIcon from "@mui/icons-material/EditSharp";
import TextField from "@mui/material/TextField";
import MoreVertSharpIcon from "@mui/icons-material/MoreVertSharp";
import Input from "@mui/material/Input";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";

import { DragDropContext } from "react-beautiful-dnd";
import { Droppable } from "react-beautiful-dnd";
import { Draggable } from "react-beautiful-dnd";

import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import AddSharpIcon from "@mui/icons-material/AddSharp";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";

import PositionItemSegment from "./PositionItemSegment";

function PositionItem({
  item,
  segmentsList,
  offersList,
  onRemove,
  onClone,
  onUpdate,
}) {
  const [name, setName] = useState(item.positionName);
  const [codeName, setCodeName] = useState(item.positionCodeName);
  const [comment, setComment] = useState(item.comment);
  const [segments, setSegments] = useState(item.segments);

  // Settings
  const [settingsHovered, setSettingsHovered] = useState(false);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const settingsOpened = Boolean(settingsAnchorEl);
  const handleClickSettings = (e) => {
    setSettingsAnchorEl(e.currentTarget);
    setSettingsHovered(true);
  };
  const handleCloseSettings = () => {
    setSettingsHovered(false);
    setSettingsAnchorEl(null);
  };

  // Inputs
  const [inputIDFocused, setInputIDFocused] = useState(false);
  const inputIDRef = React.useRef();
  const [inputNameFocused, setInputNameFocused] = useState(false);
  const inputNameRef = React.useRef();
  // Using useEffect to set focus on input when renaming.
  // Using other methods will result in a bug with the input not being focused.
  useEffect(() => {
    if (inputIDFocused) {
      inputIDRef.current.focus();
    }
  }, [inputIDFocused]);
  function unfocusInputID(e, blur) {
    if ((e.keyCode !== 13) & !blur) return;
    setInputIDFocused(false);
    if (inputIDRef) {
      inputIDRef.current.blur();
    }
  }
  // Name input
  useEffect(() => {
    if (inputNameFocused) {
      inputNameRef.current.focus();
    }
  }, [inputNameFocused]);
  function unfocusInputName(e, blur) {
    if ((e.keyCode !== 13) & !blur) return;
    setInputNameFocused(false);
    if (inputNameRef) {
      inputNameRef.current.blur();
    }
  }

  function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    // Checking if stuff is ok to be moved and the guy didnt canceled drop or did it outside the container
    if (!destination) {
      return;
    }
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    // Changing positions of dragged segments
    if (destination.index !== segments.length - 1) {
      setSegments(moveArrayElement(segments, source.index, destination.index));
    }
  }
  function moveArrayElement(array, source, destination) {
    const newArray = [...array];
    const [element] = newArray.splice(source, 1);
    newArray.splice(destination, 0, element);
    return newArray;
  }

  const [anchorEl, setAnchorEl] = React.useState(null);
  const showAddNewPopover = (event) => {
    setAnchorEl(event.currentTarget);
  };
  function addNewSegment(segmentID) {
    setSegments([
      {
        segmentID: segmentID,
        offers: [],
      },
      ...segments,
    ]);
  }

  function removeSegment(index) {
    setSegments((prevSegments) => {
      return prevSegments.filter((segment, i) => i !== index);
    });
  }

  function addOfferToSegment(offerID, segmentID) {
    setSegments((prevSegments) => {
      return [
        ...prevSegments.map((segment) => {
          if (segment.segmentID === segmentID) {
            return {
              ...segment,
              offers: [...segment.offers, offerID],
            };
          }
          return segment;
        }),
      ];
    });
  }
  function removeOfferFromSegment(index, segmentID) {
    setSegments((prevSegments) => {
      return [
        ...prevSegments.map((segment) => {
          if (segment.segmentID === segmentID) {
            return {
              ...segment,
              offers: segment.offers.filter((offer, i) => i !== index),
            };
          }
          return segment;
        }),
      ];
    });
  }
  const initialUpdateSkip = React.useRef(true);
  const timeoutRef_Update = useRef(null);
  function savePositionedOffer() {
    if (initialUpdateSkip.current) {
      initialUpdateSkip.current = false;
      return;
    }
    clearTimeout(timeoutRef_Update.current);
    timeoutRef_Update.current = setTimeout(() => {
      onUpdate({
        ...item,
        segments: segments,
        comment: comment,
        positionCodeName: codeName,
        positionName: name,
      });
    }, 500);
  }

  useEffect(() => {
    savePositionedOffer();
  }, [segments, comment, codeName, name]);

  return (
    <div className={s.positionItem}>
      <div className={s.hat}>
        <div className={s.settings}>
          <IconButton sx={{ p: 0 }} onClick={(e) => handleClickSettings(e)}>
            <MoreVertSharpIcon sx={{ fontSize: 32 }} />
          </IconButton>
        </div>
        <Popover
          id={"simple-popover"}
          open={settingsOpened}
          anchorEl={settingsAnchorEl}
          onClose={handleCloseSettings}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Button sx={{ textTransform: "none" }}>
              <Typography
                onClick={() => onClone(item.positionID)}
                variant="subtitle1"
                color={"text.primary"}
              >
                Clone
              </Typography>
            </Button>
            <Button
              onClick={() => onRemove(item.positionID)}
              sx={{ textTransform: "none" }}
            >
              <Typography variant="subtitle1" color={"text.primary"}>
                Remove
              </Typography>
            </Button>
          </div>
        </Popover>

        <div className={s.id}>
          <Tooltip
            title="Offer ID that is called by game's code when you want to trigger it"
            placement="top"
          >
            <Input
              spellCheck={false}
              fullWidth
              inputRef={inputIDRef}
              value={codeName}
              onKeyDown={(e) => unfocusInputID(e)}
              onBlur={(e) => unfocusInputID(e, true)}
              onFocus={() => setInputIDFocused(true)}
              onSubmit={(e) => setCodeName(e.target.value)}
              onChange={(e) => setCodeName(e.target.value)}
              sx={{
                backgroundColor: inputIDFocused
                  ? "rgba(0,0,0,0.1)"
                  : "rgba(0,0,0,0.0)",

                "& .MuiInputBase-input": {
                  textAlign: "center",
                  fontSize: "13px",
                },
                "&.MuiInputBase-root::before": {
                  borderBottom: "none",
                },
                "&.MuiInputBase-root:hover::before": {
                  borderBottom: "1px solid #6E758E",
                },
                pl: 2,
                pr: 2,
              }}
            />
          </Tooltip>
        </div>
        <div className={s.name}>
          <Tooltip
            title="Position name that is displayed only on the website"
            placement="top"
          >
            <Input
              spellCheck={false}
              inputRef={inputNameRef}
              value={name}
              onKeyDown={(e) => unfocusInputName(e)}
              onBlur={(e) => unfocusInputName(e, true)}
              onFocus={() => setInputNameFocused(true)}
              onSubmit={(e) => setName(e.target.value)}
              onChange={(e) => setName(e.target.value)}
              sx={{
                width: "fit-content",
                backgroundColor: inputNameFocused
                  ? "rgba(0,0,0,0.1)"
                  : "rgba(0,0,0,0.0)",
                "& .MuiInputBase-input": {
                  textAlign: "start",
                  fontSize: "24px",
                  width: "fit-content",
                },
                "&.MuiInputBase-root::before": {
                  borderBottom: "none",
                },
                "&.MuiInputBase-root:hover::before": {
                  borderBottom: "1px solid #6E758E",
                },
              }}
            />
          </Tooltip>
        </div>
      </div>

      <div className={s.itemBody}>
        <div
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
          <div className={s.listName}>
            <Typography>Prioritized segments</Typography>
            <Tooltip
              title={`Player will get offers from the highest available segment. If player has no such segment, the list will go down until there will be found a segment that player has.`}
              placement="top"
            >
              <IconButton sx={{ borderRadius: 5 }}>
                <InfoSharpIcon color="primary" />
              </IconButton>
            </Tooltip>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId={"eventlist"}>
              {(provided) => (
                <div
                  className={s.segmentList}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {segments.map((segment, index) => (
                    <Draggable
                      key={index}
                      draggableId={index.toString()}
                      index={index}
                    >
                      {(provided) => (
                        <PositionItemSegment
                          offersList={offersList}
                          key={index}
                          index={index}
                          provided={provided}
                          segment={segment}
                          segmentsList={segmentsList}
                          onRemove={removeSegment}
                          onOfferAddToSegment={addOfferToSegment}
                          onOfferRemoveFromSegment={removeOfferFromSegment}
                        />
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}

                  <Button
                  variant="contained"
                    sx={{
                      ml: 5,
                      mt: 1,
                      textTransform: "none",
                      textAlign: "start",
                      justifyContent: "start",
                      width: "15%",
                    }}
                    onClick={showAddNewPopover}
                  >
                    <Typography
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      variant="subtitle1"
                      fontSize={14}
                    >
                      <AddSharpIcon sx={{ fontSize: 20 }} />
                      Add segment
                    </Typography>
                  </Button>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <div>
          <textarea
            className={s.comment}
            onChange={(e) => setComment(e.target.value)}
            value={comment}
            placeholder="Add comment"
          ></textarea>
        </div>
      </div>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Box className={s.popoverSegmentsListContainer}>
          <Box className={s.popoverSegmentsList}>
            {segments.length > 0 &&
            segmentsList
              .filter((segment) => segment.segmentID !== "everyone")
              .filter(
                (segment) =>
                  !segments.some((s) => s.segmentID === segment.segmentID)
              ).length > 0 ? (
              segmentsList
                .filter((segment) => segment.segmentID !== "everyone")
                .filter(
                  (segment) =>
                    !segments.some((s) => s.segmentID === segment.segmentID)
                )
                .map((segment) => (
                  <Button
                    onClick={() => addNewSegment(segment.segmentID)}
                    key={segment.segmentID}
                    sx={{
                      textTransform: "none",
                      textAlign: "start",
                      alignItems: "start",
                      color: "var(--text-primary-color)",
                    }}
                  >
                    {segment.segmentName}
                  </Button>
                ))
            ) : (
              <Typography>No segments</Typography>
            )}
          </Box>
        </Box>
      </Popover>
    </div>
  );
}

export default PositionItem;
