import React, { useEffect, useState, useRef, useCallback } from "react";
import s from "./universalProp.module.css";

import CloseIcon from "@mui/icons-material/Close";
import { styled } from "@mui/material/styles";
import { Button, Box } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Tooltip from "@mui/material/Tooltip";
import Waveform from "./AudioPlayer";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

function generatePreview(tooltip, valueValue, valueType, valueFileName) {
  switch (valueType) {
    case "image":
      return (
        <div
          className={
            tooltip
              ? s.fileInputTooltipPreviewContainer
              : s.fileInputPreviewContainer
          }
        >
          <img
            src={`${valueValue}`}
            className={tooltip && s.fileInputTooltipPreview}
          />
        </div>
      );
    case "video":
      return (
        <div
          className={
            tooltip
              ? s.fileInputTooltipPreviewContainer
              : s.fileInputPreviewContainer
          }
        >
          <video
            controls={tooltip}
            paused={!tooltip}
            className={tooltip && s.fileInputTooltipPreviewVideo}
            // style={{width: tooltip ? '100%' : '0px', height: tooltip ? '100%' : '0px'}}
          >
            <source src={`${valueValue}`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    case "sound":
      if (tooltip) {
        return (
          <div
            className={
              tooltip
                ? s.fileInputTooltipPreviewContainer
                : s.fileInputPreviewContainer
            }
          >
            <Waveform id="audio" audio={`${valueValue}`} />
          </div>
        );
      }
      return valueFileName.length > 5
        ? `${valueFileName.slice(0, 5)}...`
        : valueFileName;
    case "any file":
      if (tooltip) {
        return valueFileName;
      }
      return valueFileName.length > 5
        ? `${valueFileName.slice(0, 5)}...`
        : valueFileName;
  }
}
const FileValueInput = ({
  valueValue,
  valueFileName,
  valueType,
  currentFileTypes,

  // Callbacks
  handleChangeValue,
  setValueFileName,

  disabled = false,
}) => {
  const fileInputRef = React.useRef(null);

  const handleFileUpload = (e) => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64File = e.target.result;
          handleChangeValue(base64File, selectedFile.name);
          setValueFileName(selectedFile.name);
        };
        reader.readAsDataURL(selectedFile);
      } catch (error) {}
    }
  };
  function clearImage() {
    handleChangeValue("", "");
    setValueFileName("");
    fileInputRef.current.value = null;
  }

  return (
    <Box sx={{ width: "100%", height: "40px", position: "relative" }}>
      {!disabled && valueValue !== "" && valueValue !== undefined ? (
        <Tooltip title="Remove file" placement="top">
          <Button
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              clearImage();
            }}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              minWidth: "30px",
              zIndex: 2,
              mt: "auto",
              mb: "auto",
              height: "100%",
            }}
          >
            <CloseIcon />
          </Button>
        </Tooltip>
      ) : (
        <div></div>
      )}
      <Tooltip
        componentsProps={{
          tooltip: {
            sx: {
              display: valueValue !== "" ? "block" : "none",
            },
          },
        }}
        title={
          <div>
            {valueType !== "any file" ? valueFileName : ""}
            {generatePreview(true, valueValue, valueType, valueFileName)}
          </div>
        }
        placement="right"
      >
        <Button
          component="label"
          fullWidth
          variant="outlined"
          startIcon={
            valueValue !== "" && valueValue !== undefined ? (
              <div></div>
            ) : (
              <CloudUploadIcon />
            )
          }
          disabled={disabled}
          tabIndex={-1}
          sx={{
            borderRadius: "1rem",
            height: "100%",
            maxWidth: "100%",
            height: "100%",
            fontSize: 14,
            whiteSpace: "pre-wrap",
            textTransform: "none",
            overflow: "hidden",
          }}
        >
          {valueValue !== "" && valueValue !== undefined
            ? generatePreview(false, valueValue, valueType, valueFileName)
            : "Upload"}
          <VisuallyHiddenInput
            key={`${valueValue}`}
            onClick={handleFileUpload}
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={currentFileTypes}
          />
        </Button>
      </Tooltip>
    </Box>
  );
};
export default FileValueInput;
