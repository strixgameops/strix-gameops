import React, { useState, useEffect } from "react";
// import {usePopper} from "react-popper";
import { grey } from "./colors";
import ArrowUpIcon from "./img/ArrowUp";
import ArrowDownIcon from "./img/ArrowDown";
import ArrowLeftIcon from "./img/ArrowLeft";
import ArrowRightIcon from "./img/ArrowRight";
import TrashIcon from "./img/Trash";
import TextIcon from "./Text";
import MultiIcon from "./img/Multi";
import HashIcon from "./img/Hash";
import PlusIcon from "./img/Plus";
import { shortId } from "./utils";
import ToggleOnSharpIcon from "@mui/icons-material/ToggleOnSharp";
import PhotoSizeSelectActualOutlinedIcon from "@mui/icons-material/PhotoSizeSelectActualOutlined";
import Typography from "@mui/material/Typography";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";
import s from "./tableStyling.module.css";
import AudioFileOutlinedIcon from "@mui/icons-material/AudioFileOutlined";
import VideoFileOutlinedIcon from "@mui/icons-material/VideoFileOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";

import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import { Box } from "@mui/material";

export default function Header({
  column: { id, created, label, dataType, getResizerProps, getHeaderProps },
  setSortBy,
  dataDispatch,
  hiddenColumns,
  fixedColumns,
}) {
  const [expanded, setExpanded] = useState(created || false);
  //   const [referenceElement, setReferenceElement] = useState(null);
  //   const [popperElement, setPopperElement] = useState(null);
  const [inputRef, setInputRef] = useState(null);
  //   const {styles, attributes} = usePopper(referenceElement, popperElement, {
  //     placement: "bottom",
  //     strategy: "absolute"
  //   });

  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const [header, setHeader] = useState(label);
  const [typeReferenceElement, setTypeReferenceElement] = useState(null);
  const [typePopperElement, setTypePopperElement] = useState(null);
  const [showType, setShowType] = useState(false);
  const buttons = [
    {
      onClick: (e) => {
        dataDispatch({
          type: "update_column_header",
          columnId: id,
          label: header,
        });
        setSortBy([{ id: id, desc: false }]);
        setExpanded(false);
      },
      icon: <ArrowUpIcon />,
      label: "Sort ascending",
    },
    {
      onClick: (e) => {
        dataDispatch({
          type: "update_column_header",
          columnId: id,
          label: header,
        });
        setSortBy([{ id: id, desc: true }]);
        setExpanded(false);
      },
      icon: <ArrowDownIcon />,
      label: "Sort descending",
    },
    {
      onClick: (e) => {
        dataDispatch({
          type: "update_column_header",
          columnId: id,
          label: header,
        });
        dataDispatch({
          type: "add_column_to_left",
          columnId: id,
          focus: false,
        });
        setExpanded(false);
      },
      icon: <ArrowLeftIcon />,
      label: "Insert left",
    },
    {
      onClick: (e) => {
        dataDispatch({
          type: "update_column_header",
          columnId: id,
          label: header,
        });
        dataDispatch({
          type: "add_column_to_right",
          columnId: id,
          focus: false,
        });
        setExpanded(false);
      },
      icon: <ArrowRightIcon />,
      label: "Insert right",
    },
    {
      onClick: (e) => {
        dataDispatch({
          type: "update_column_header",
          columnId: id,
          label: header,
        });
        dataDispatch({ type: "delete_column", columnId: id });
        setExpanded(false);
      },
      icon: <TrashIcon />,
      label: "Delete",
    },
  ];

  const types = [
    {
      onClick: (e) => {
        dataDispatch({
          type: "update_column_type",
          columnId: id,
          dataType: "select",
        });
        setShowType(false);
        setExpanded(false);
      },
      icon: <MultiIcon />,
      label: "Select",
    },
    {
      onClick: (e) => {
        dataDispatch({
          type: "update_column_type",
          columnId: id,
          dataType: "text",
        });
        setShowType(false);
        setExpanded(false);
      },
      icon: <TextIcon />,
      label: "Text",
    },
    {
      onClick: (e) => {
        dataDispatch({
          type: "update_column_type",
          columnId: id,
          dataType: "number",
        });
        setShowType(false);
        setExpanded(false);
      },
      icon: <HashIcon />,
      label: "Number",
    },
  ];

  let propertyIcon;
  switch (dataType) {
    case "rowIndex":
      propertyIcon = <HashIcon />;
      break;
    case "number":
      propertyIcon = <HashIcon />;
      break;
    case "text":
    case "string":
    case "text-fake-visual":
      propertyIcon = <TextIcon />;
      break;
    case "localized-text":
      propertyIcon = (
        <img
          loading="lazy"
          width="20"
          srcSet={`https://flagcdn.com/w40/${id.split("|")[1].toLowerCase()}.png 2x`}
          src={`https://flagcdn.com/w20/${id.split("|")[1].toLowerCase()}.png`}
          alt=""
        />
      );
      break;
    case "select":
      propertyIcon = <MultiIcon />;
      break;
    case "bool":
    case "boolean":
      propertyIcon = (
        <ToggleOnSharpIcon sx={{ fontSize: 14, color: "#9e9e9e" }} />
      );
      break;
    case "icon":
    case "image":
      propertyIcon = (
        <PhotoSizeSelectActualOutlinedIcon
          sx={{ fontSize: 14, color: "#9e9e9e" }}
        />
      );
      break;
    case "video":
      propertyIcon = (
        <VideoFileOutlinedIcon sx={{ fontSize: 14, color: "#9e9e9e" }} />
      );
      break;
    case "sound":
      propertyIcon = (
        <AudioFileOutlinedIcon sx={{ fontSize: 14, color: "#9e9e9e" }} />
      );
      break;
    case "any file":
      propertyIcon = (
        <InsertDriveFileOutlinedIcon sx={{ fontSize: 14, color: "#9e9e9e" }} />
      );
      break;
    default:
      break;
  }

  useEffect(() => {
    if (created) {
      setExpanded(true);
    }
  }, [created]);

  useEffect(() => {
    setHeader(label);
  }, [label]);

  useEffect(() => {
    if (inputRef) {
      inputRef.focus();
      inputRef.select();
    }
  }, [inputRef]);

  //   const typePopper = usePopper(typeReferenceElement, typePopperElement, {
  //     placement: "right",
  //     strategy: "fixed"
  //   });

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      dataDispatch({
        type: "update_column_header",
        columnId: id,
        label: header,
      });
      setExpanded(false);
    }
  }

  function handleChange(e) {
    setHeader(e.target.value);
  }

  function handleBlur(e) {
    e.preventDefault();
    dataDispatch({ type: "update_column_header", columnId: id, label: header });
  }

  function isolateColumn() {
    dataDispatch({ type: "isolate_column", columnId: id });
  }

  const open = Boolean(anchorEl);
  switch (id) {
    case 999999:
      // "Add column" button
      return (
        <div
          {...getHeaderProps({ style: { display: "inline-block" } })}
          className={[s.th + " " + s.noselect]}
        >
          <div
            className={s.thContent}
            style={{ display: "flex", justifyContent: "center" }}
            onClick={(e) => {
              console.log("Adding column", id, "to", dataType);
              if (dataType === "addLanguage") {
                dataDispatch({
                  type: "add_language",
                  columnId: 999999,
                  focus: true,
                  event: e,
                });
              } else {
                dataDispatch({
                  type: "add_column_to_left",
                  columnId: 999999,
                  focus: true,
                });
              }
            }}
          >
            <span className={[s.svgIconSm + " " + s.svgGray]}>
              <PlusIcon />
            </span>
          </div>
        </div>
      );
    case 9999998:
      // "Delete column" buttom
      return (
        <div
          {...getHeaderProps({ style: { display: "inline-block" } })}
          className={[s.th + " " + s.noselect]}
        >
          <div
            className={s.thContent}
            style={{ display: "flex", justifyContent: "center" }}
          >
            <span className={[s.svgIconSm + " " + s.svgGray]}>
              <DeleteSharpIcon sx={{ fontSize: 14, color: "#9e9e9e" }} />
            </span>
            <Typography
              variant="body1"
              color={"text.secondary"}
              sx={{
                fontSize: "13px",
                fontWeight: "regular",
                textAlign: "center",
                paddingLeft: "10px",
                paddingRight: "10px",
              }}
            >
              {label}
            </Typography>
          </div>
        </div>
      );
    default:
      if (
        hiddenColumns &&
        hiddenColumns.includes(id) &&
        !fixedColumns.includes(id)
      ) {
        return <span></span>;
      }
      return (
        <>
          <div
            onClick={(e) => handleClick(e)}
            {...getHeaderProps({ style: { display: "inline-block" } })}
            className={`${s.th}  ${s.noselect}`}
            style={{
              ...getHeaderProps().style,
              flexGrow: hiddenColumns && hiddenColumns.length > 0 ? "0" : "0",
            }}
          >
            <div className={s.thContent}>
              <span
                className={[s.svgIcon + " " + s.svgGray + " " + s.iconMargin]}
              >
                {propertyIcon}
              </span>
              <Typography
                variant="body1"
                color={"text.secondary"}
                sx={{
                  fontSize: "13px",
                  fontWeight: "regular",
                  textAlign: "center",
                  paddingLeft: "10px",
                  paddingRight: "10px",
                }}
              >
                {label}
              </Typography>
            </div>
            <div {...getResizerProps()} className={s.resizer} />
          </div>

          <Popover
            id={id}
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", p: 1 }}>
              <Button
                onClick={() => {
                  dataDispatch({ type: "isolate_column", columnId: id });
                  handleClose();
                }}
                sx={{}}
              >
                Isolate
              </Button>

              <Button
                onClick={() => {
                  dataDispatch({ type: "hide_column", columnId: id });
                  handleClose();
                }}
                sx={{}}
              >
                Hide
              </Button>

              {dataType === "localized-text" && (
                <Button
                  onClick={() => {
                    dataDispatch({ type: "delete_column", columnId: id });
                    handleClose();
                  }}
                  sx={{}}
                >
                  Remove language
                </Button>
              )}
            </Box>
          </Popover>

          {/* {expanded && <div className={s.overlay} onClick={() => setExpanded(false)} />}
          {expanded && (
        <div>
          <div
            className={[s.bgWhite, s.shadow5, s.borderRadiusMd]}
            style={{
              width: 240
            }}>
            <div style={{paddingTop: "0.75rem", paddingLeft: "0.75rem", paddingRight: "0.75rem"}}>
              <div className={s.isFullwidth} style={{marginBottom: 12}}>
                <input
                  className={s.formInput}
                  ref={setInputRef}
                  type='text'
                  value={header}
                  style={{width: "100%"}}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <span className={[s.fontWeight600, s.fontSize75]} style={{textTransform: "uppercase", color: grey(500)}}>
                Property Type
              </span>
            </div>
            <div style={{padding: "4px 0px"}}>
              <button
                className={s.sortButton}
                type='button'
                onMouseEnter={() => setShowType(true)}
                onMouseLeave={() => setShowType(false)}
                ref={setTypeReferenceElement}>
                <span className={[s.svgIcon + ' ' + s.svgText + ' ' + s.iconMargin]}>{propertyIcon}</span>
                <span style={{textTransform: "capitalize"}}>{dataType}</span>
              </button>
              {showType && (
                <div
                  className={[s.shadow5, s.bgWhite, s.borderRadiusM]}
                  ref={setTypePopperElement}
                  onMouseEnter={() => setShowType(true)}
                  onMouseLeave={() => setShowType(false)}
                  {...typePopper.attributes.popper}
                  style={{
                    ...typePopper.styles.popper,
                    width: 200,
                    backgroundColor: "white",
                    zIndex: 4,
                    padding: "4px 0px"
                  }}>
                  {types.map((type) => (
                    <button className={s.sortButton} onClick={type.onClick}>
                      <span className={[s.svgIcon + ' ' + s.svgText + ' ' + s.iconMargin]}>{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              key={shortId()}
              style={{
                borderTop: `2px solid ${grey(200)}`,
                padding: "4px 0px"
              }}>
              {buttons.map((button) => (
                <button type='button' className={s.sortButton} onMouseDown={button.onClick}>
                  <span className={[s.svgIcon + ' ' + s.svgText + ' ' + s.iconMargin]}>{button.icon}</span>
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        </div>
          )} */}
        </>
      );
  }
}
