import React from "react";
import s from "./positionItem.module.css";

import { Collapse, Popover } from "@mui/material";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";

import AddSharpIcon from "@mui/icons-material/AddSharp";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import BlankOfferIcon from "shared/icons/OfferIconPlaceholder.jsx";

import ExpandLessSharp from "@mui/icons-material/ExpandLessSharp";
import ExpandMoreSharp from "@mui/icons-material/ExpandMoreSharp";

function PositionItemSegment({
  provided,
  segment,
  segmentsList,
  onRemove,
  index,
  offersList,
  onOfferAddToSegment,
  onOfferRemoveFromSegment,
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const [anchorEl, setAnchorEl] = React.useState(null);

  function trim(str, len) {
    if (str === undefined || str === "") return "";
    return str.length > len ? `${str.slice(0, len)}...` : str;
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={s.segmentItem}
    >
      <Typography sx={{ width: "20px" }} variant="h6" color={"text.secondary"}>
        {index + 1}
      </Typography>

      <div
        // Prevent dragging of "everyone" segment
        {...provided.draggableProps}
        ref={provided.innerRef}
        className={s.innerBody}
      >
        <div className={s.innerColumn}>
          <div className={s.headerRow}>
            {segment.segmentID !== "everyone" && (
              <Button
                {...provided.dragHandleProps}
                sx={{
                  p: 0,
                  height: "45px",
                  width: "50px",
                  minWidth: "30px",
                }}
              >
                <DragIndicatorIcon />
              </Button>
            )}
            <Button
              onClick={() => setExpanded(!expanded)}
              sx={{
                p: 0,
                pl: 4,
                textTransform: "none",
                textAlign: "start",
                display: "flex",
                alignItems: "center",
                justifyContent: "start",
                height: "45px",
                width: "100%",
              }}
              fullWidth
            >
              <Typography>
                {
                  segmentsList.find((s) => s.segmentID === segment.segmentID)
                    ?.segmentName
                }
              </Typography>
              <Typography
                variant="body2"
                color={"text.secondary"}
                sx={{ pl: 4, mr: "auto" }}
              >
                {segment.offers.length} offers
              </Typography>
              {expanded ? (
                <ExpandLessSharp sx={{ mr: 2 }} />
              ) : (
                <ExpandMoreSharp sx={{ mr: 2 }} />
              )}
            </Button>

            {segment.segmentID !== "everyone" && isHovered && (
              <Button
                onClick={() => onRemove(index)}
                sx={{
                  p: 0,
                  height: "45px",
                  minHeight: "45px",
                  width: "50px",
                  minWidth: "50px",
                }}
              >
                <DeleteSharpIcon />
              </Button>
            )}
          </div>

          <Collapse
            sx={{ width: "100%" }}
            in={expanded}
            timeout="auto"
            unmountOnExit
          >
            <div className={s.offersList}>
              {segment.offers.length > 0 &&
                segment.offers.map((offerID, index) => (
                  <Button
                    onClick={() =>
                      onOfferRemoveFromSegment(index, segment.segmentID)
                    }
                    sx={{
                      p: 0,
                      minWidth: "150px",
                      width: "150px",
                      height: "150px",
                      alignItems: "center",
                      justifyContent: "start",
                      textTransform: "none",
                      borderRadius: "1rem",

                      //   backgroundColor: "#694f2a36",
                      //   "&:hover": {
                      //     backgroundColor: "#694f2a70",
                      //   },
                      //   "& .MuiTouchRipple-child": {
                      //     backgroundColor: "#694f2a",
                      //   },
                    }}
                    key={index}
                    className={s.compactOfferItem}
                  >
                    <Tooltip title={"Click to remove offer"} disableInteractive>
                      <div className={s.offerItem}>
                        <div className={s.icon}>
                          {offersList.find((o) => o.offerID === offerID)
                            ?.offerIcon === "" ? (
                            <BlankOfferIcon />
                          ) : (
                            <img
                              src={
                                offersList.find((o) => o.offerID === offerID)
                                  ?.offerIcon
                              }
                              alt="Offer icon"
                              className={s.icon}
                            />
                          )}
                        </div>
                        <Typography
                          sx={{
                            width: "100%",
                            textAlign: "center",
                            pl: 1,
                            pr: 1,
                          }}
                        >
                          {trim(
                            offersList.find((o) => o.offerID === offerID)?.offerName,
                            15
                          )}
                        </Typography>
                      </div>
                    </Tooltip>
                  </Button>
                ))}
              <div key={index} className={s.offerItemAddNew}>
                <Tooltip title="Add offer" disableInteractive>
                  <Button
                    variant="outlined"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{
                      borderRadius: "1rem",
                      height: "100%",
                      width: "100%",
                      //   backgroundColor: "#694f2a10",
                      //   "&:hover": {
                      //     backgroundColor: "#694f2a70",
                      //   },
                      //   "& .MuiTouchRipple-child": {
                      //     backgroundColor: "#694f2a",
                      //   },
                    }}
                  >
                    <AddSharpIcon sx={{ fontSize: 30 }} />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </Collapse>
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
          <Box className={s.popoverOffersListContainer}>
            <Box className={s.popoverOffersList}>
              {offersList.length > 0 ? (
                offersList.map((offer, index) => (
                  <Button
                    onClick={() =>
                      onOfferAddToSegment(offer.offerID, segment.segmentID)
                    }
                    sx={{
                      p: 4,
                      minWidth: "330px",
                      alignItems: "center",
                      justifyContent: "start",
                      textTransform: "none",
                    }}
                    key={index}
                    className={s.compactOfferItem}
                  >
                    {offer.offerIcon === "" ? (
                      <BlankOfferIcon />
                    ) : (
                      <img
                        src={offer.offerIcon}
                        alt="Offer icon"
                        className={s.icon}
                      />
                    )}

                    <Typography>{offer.offerName}</Typography>
                  </Button>
                ))
              ) : (
                <Typography>No offers</Typography>
              )}
            </Box>
          </Box>
        </Popover>
      </div>
    </div>
  );
}

export default PositionItemSegment;
