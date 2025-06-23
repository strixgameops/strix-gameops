import React, { useEffect, useState } from "react";
import ContentEditable from "react-contenteditable";
import Relationship from "./Relationship";
// import {usePopper} from "react-popper";
import { grey } from "./colors";
import PlusIcon from "./img/Plus";
import { randomColor } from "./utils";
import CloseIcon from "@mui/icons-material/Close";

import { Button, Box } from "@mui/material";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Switch from "@mui/material/Switch";
import Input from "@mui/material/Input";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";
import RemoveSharpIcon from "@mui/icons-material/RemoveSharp";

import s from "./tableStyling.module.css";
import imageCompression from "browser-image-compression";
import { useLocalizationTable } from "@strix/LocalizationContext";
import Popover from "@mui/material/Popover";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import AddIcon from "@mui/icons-material/Add";
export default function Cell({
  value: initialValue,
  row: { index },
  column: { id, dataType, options },
  dataDispatch,
  hiddenColumns,
  fixedColumns,
  filenames,
  gameModelFunctions
}) {
  const [localFileName, setLocalFileName] = useState("");
  const [value, setValue] = useState({ value: initialValue, update: false });
  const onChange = (e) => {
    switch (dataType) {
      case "number":
        setValue({ value: handleNumberInput(e.target.value), update: true });
        break;
      default:
        setValue({ value: e.target.value, update: true });
        break;
    }
  };
  const [showAdd, setShowAdd] = useState(false);
  const [addSelectRef, setAddSelectRef] = useState(null);
  var possibleLocalizationTags = [];
  if (useLocalizationTable()) {
    // Will only fire when we have this cell's table wrapped with a proper context
    var { possibleLocalizationTags } = useLocalizationTable();
  }
  const [tagDrawerOpen, setTagDrawerOpen] = useState(false);

  useEffect(() => {
    setValue({ value: initialValue, update: false });
  }, [initialValue]);

  useEffect(() => {
    if (value.update) {
      dataDispatch({
        type: "update_cell",
        columnId: id,
        rowIndex: index,
        value: value.value,
        fileName: value.fileName,
      });
    }
  }, [value, dataDispatch, id, index]);

  const fileTypesImage = [".png", ".jpg", ".svg"];
  const fileTypesVideo = [".mov", ".mp4", ".avi", ".webm"];
  const fileTypesSound = [".mp3", ".ogg", ".wav"];
  const fileTypesAny = [".*"];
  const [currentFileTypes, setCurrentFileTypes] = useState([]);
  useEffect(() => {
    if (dataType === "image" || dataType === "icon") {
      setCurrentFileTypes(fileTypesImage);
    } else if (dataType === "video") {
      setCurrentFileTypes(fileTypesVideo);
    } else if (dataType === "sound") {
      setCurrentFileTypes(fileTypesSound);
    } else {
      setCurrentFileTypes(fileTypesAny);
    }
  }, []);

  function getColor() {
    let match = options.find((option) => option.label === value.value);
    return (match && match.backgroundColor) || grey(300);
  }

  useEffect(() => {
    if (addSelectRef && showAdd) {
      addSelectRef.focus();
    }
  }, [addSelectRef, showAdd]);

  // For icon upload input
  const fileInputRef = React.useRef(null);
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
  const handleFileUpload = (e) => {
    fileInputRef.current.click();
  };
  const handleFileChange = (event, compress) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64File = e.target.result;
          if (compress) {
            const compressedFile = await compressImage(base64File);
            setValue({
              value: compressedFile,
              update: true,
              fileName: selectedFile.name,
            });
            setLocalFileName(selectedFile.name);
          } else {
            setValue({
              value: base64File,
              update: true,
              fileName: selectedFile.name,
            });
            setLocalFileName(selectedFile.name);
          }
        };
        reader.readAsDataURL(selectedFile);
      } catch (error) {}
    }
  };
  function clearImage() {
    setValue({ value: "", update: true, fileName: "" });
    setLocalFileName("");
    fileInputRef.current.value = null;
  }
  const compressImage = async (base64Image) => {
    // Decode base64 string
    const byteCharacters = atob(base64Image.split(",")[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    const blob = new Blob(byteArrays, { type: "image/png" });

    // Compress image
    const compressedImage = await imageCompression(blob, {
      maxWidthOrHeight: 250,
    });

    // Return base64 representation of compressed image
    return await blobToBase64(compressedImage);
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result;
        resolve(base64data);
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  };

  function handleNumberInput(value) {
    const tempValue = value;
    const validateNumber = new RegExp("^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$");

    // Only validate if value is not empty
    if (tempValue !== "") {
      if (validateNumber.test(tempValue)) {
        return tempValue;
      }
    } else {
      return tempValue;
    }
  }

  function handlePasteMultiline(e) {
    // Handle multiline paste
    const pastedText = e.clipboardData.getData("text");
    const lines = pastedText.split("\n");
    if (lines.length > 1) {
      e.preventDefault();
      lines.forEach((line, lineIndex) => {
        switch (dataType) {
          case "number":
            dataDispatch({
              type: "update_cell",
              columnId: id,
              rowIndex: index + lineIndex,
              value: handleNumberInput(line),
            });
            break;
          default:
            dataDispatch({
              type: "update_cell",
              columnId: id,
              rowIndex: index + lineIndex,
              value: line,
            });
            break;
        }
      });
    }
  }

  function getFilename() {
    if (localFileName !== "") {
      return localFileName;
    }

    if (filenames.find((filename) => filename.sid === id.split("|")[1])) {
      return filenames.find((filename) => filename.sid === id.split("|")[1])
        .fileName;
    }
    return "";
  }

  function getOfferLocalizedStringName() {
    if (value.value.split("|")[1] === "name") {
      return value.value.split("|").slice(1)[1] + ": Name";
    } else if (value.value.split("|")[1] === "desc") {
      return value.value.split("|").slice(1)[1] + ": Description";
    } else {
      return value.value.split("|")[1] + ": " + value.value.split("|")[0];
    }
  }

  function getModelFunctionName(id) {
    return gameModelFunctions.find(f => f.id === id)?.name || "Model Function Output"
  }


  let element;
  if (
    hiddenColumns &&
    hiddenColumns.includes(id) &&
    !fixedColumns.includes(id)
  ) {
    element = <div></div>;
    return element;
  }
  switch (dataType) {
    // Double "case" effects as ||
    case "string":
    case "text":
      element = (
        <Input
          spellCheck={false}
          value={(value.value && value.value.toString()) || ""}
          onPaste={handlePasteMultiline}
          onChange={onChange}
          onBlur={() => setValue((old) => ({ value: old.value, update: true }))}
          className={s.nakedInput}
          fullWidth
          sx={{
            ml: 0.7,
            mr: 0.7,
            p: 1,
            height: "100%",
            border: "none",
            "&::before": {
              border: "none !important",
            },
            "&::after": {
              border: "none",
            },
          }}
        />
      );
      break;
    case "text-fake-visual":
      element = (
        <Tooltip title={getOfferLocalizedStringName()} placement="top">
          <span>
            <Input
              disabled
              spellCheck={false}
              value={getOfferLocalizedStringName()}
              onPaste={handlePasteMultiline}
              onChange={onChange}
              onBlur={() =>
                setValue((old) => ({ value: old.value, update: true }))
              }
              className={s.nakedInput}
              sx={{
                ml: 0.7,
                mr: 0.7,
                p: 1,
                width: "100%",
                height: "100%",
                border: "none",
                "&::before": {
                  border: "none !important",
                },
                "&::after": {
                  border: "none",
                },
              }}
            />
          </span>
        </Tooltip>
      );
      break;

    case "number (derived)":
    case "boolean (derived)":
    case "string (derived)":
      element = (
        <Tooltip
          title={getModelFunctionName(value.value && value.value.toString()) || ""}
          placement="top"
        >
          <span>
            <Input
              disabled
              spellCheck={false}
              value={getModelFunctionName(value.value && value.value.toString()) || ""}
              className={s.nakedInput}
              sx={{
                ml: 0.7,
                mr: 0.7,
                p: 1,
                width: "100%",
                height: "100%",
                border: "none",
                "&::before": {
                  border: "none !important",
                },
                "&::after": {
                  border: "none",
                },
              }}
            />
          </span>
        </Tooltip>
      );
      break;
    case "localized-text":
      element = (
        <Input
          spellCheck={false}
          multiline
          value={(value.value && value.value.toString()) || ""}
          onPaste={handlePasteMultiline}
          onChange={onChange}
          onBlur={() => setValue((old) => ({ value: old.value, update: true }))}
          className={s.nakedInput}
          sx={{
            ml: 0.7,
            mr: 0.7,
            p: 1,
            width: "100%",
            height: "100%",
            border: "none",
            "&::before": {
              border: "none !important",
            },
            "&::after": {
              border: "none",
            },
          }}
        />
      );
      break;
    case "number":
      element = (
        <Input
          spellCheck={false}
          value={(value.value && value.value.toString()) || ""}
          onChange={onChange}
          onPaste={handlePasteMultiline}
          onBlur={() => setValue((old) => ({ value: old.value, update: true }))}
          className={s.nakedInput}
          sx={{
            ml: 0.7,
            mr: 0.7,
            border: "none",
            "&::before": {
              border: "none !important",
            },
            "&::after": {
              border: "none",
            },
          }}
        />
        // <ContentEditable
        //   html={(value.value && value.value.toString()) || " "}
        //   onChange={onChange}
        //   onBlur={() => setValue((old) => ({value: old.value, update: true}))}
        //   className={[s.dataInput + ' ' + s.textAlignRight + ' ' + s.numberInputAlign]}
        // />
      );
      break;
    case "select":
      element = (
        <Autocomplete
          fullWidth
          autoComplete
          value={value.value ? value.value : ""}
          onChange={(e, value) => setValue({ value: value, update: true })}
          options={options}
          sx={{
            height: "100%",
            maxHeight: "100%",
            p: 0,
            "& .MuiFormControl-root": {
              height: "100%",
              maxHeight: "100%",
            },
            "& .MuiFormControl-root .MuiInputBase-root": {
              height: "100%",
              maxHeight: "100%",
            },
            "& .MuiFormControl-root .MuiInputBase-root input": {
              height: "100%",
              maxHeight: "100%",
              mt: -1,
            },
            "& .MuiFormControl-root .MuiInputBase-root fieldset": {
              border: "none",
            },
          }}
          renderInput={(params) => <TextField spellCheck={false} {...params} />}
        />
        // <>
        //   <div
        //     ref={setSelectRef}
        //     className={[s.cellPadding + ' ' + s.dFlex + ' ' + s.cursorDefault + ' ' + s.alignItemsCenter + ' ' + s.flex1]}
        //     onClick={() => setShowSelect(true)}>
        //     {value.value && <Relationship value={value.value} backgroundColor={getColor()} />}
        //   </div>
        //   {showSelect && <div className={s.overlay} onClick={() => setShowSelect(false)} />}
        //   {showSelect && (
        //     <div
        //       className={[s.shadow5, s.bgWhite, s.borderRadiusMd]}
        //       ref={setSelectPop}
        //       {...attributes.popper}
        //       style={{
        //         ...styles.popper,
        //         zIndex: 4,
        //         minWidth: 200,
        //         maxWidth: 320,
        //         padding: "0.75rem"
        //       }}>
        //       <div className={[s.dFlex + ' ' + s.flexWrapWrap]} style={{marginTop: "-0.5rem"}}>
        //         {options.map((option) => (
        //           <div
        //             className={s.curcorPointer}
        //             style={{marginRight: "0.5rem", marginTop: "0.5rem"}}
        //             onClick={() => {
        //               setValue({value: option.label, update: true});
        //               setShowSelect(false);
        //             }}>
        //             <Relationship value={option.label} backgroundColor={option.backgroundColor} />
        //           </div>
        //         ))}
        //         {showAdd && (
        //           <div
        //             style={{
        //               marginRight: "0.5rem",
        //               marginTop: "0.5rem",
        //               width: 120,
        //               padding: "2px 4px",
        //               backgroundColor: grey(200),
        //               borderRadius: 4
        //             }}>
        //             <input
        //               type='text'
        //               className={s.optionInput}
        //               onBlur={handleOptionBlur}
        //               ref={setAddSelectRef}
        //               onKeyDown={handleOptionKeyDown}
        //             />
        //           </div>
        //         )}
        //         <div
        //           className={s.cursorPointer}
        //           style={{marginRight: "0.5rem", marginTop: "0.5rem"}}
        //           onClick={handleAddOption}>
        //           <Relationship
        //             value={
        //               <span className={[s.svgIconSm + ' ' + s.svgText]}>
        //                 <PlusIcon />
        //               </span>
        //             }
        //             backgroundColor={grey(200)}
        //           />
        //         </div>
        //       </div>
        //     </div>
        //   )}
        // </>
      );
      break;

    case "bool":
    case "boolean":
      element = (
        <div className={s.cellAlignCenter}>
          <Switch
            checked={value.value ? value.value : false}
            onChange={(e) => {
              setValue({ value: e.target.checked, update: true });
            }}
            color="primary"
            inputProps={{ "aria-label": "controlled" }}
          />
        </div>
      );
      break;

    case "icon":
      element = (
        <div className={s.iconSettigns}>
          <Box
            sx={{
              width: "180px",
              height:
                value.value !== "" && value.value !== undefined
                  ? "fit-content"
                  : "100%",
              maxHeight: "150px",
              position: "relative",
            }}
          >
            {value.value !== "" && value.value !== undefined && (
              <Tooltip title="Remove image" placement="top">
                <Button
                  onClick={clearImage}
                  sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    zIndex: 2,
                    minWidth: "30px",
                  }}
                >
                  <CloseIcon htmlColor={"#cbcbcb"} />
                </Button>
              </Tooltip>
            )}

            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              tabIndex={-1}
              sx={{
                textWrap: "nowrap",
                // backgroundColor: '#222222',
                border: "none",
                "&:hover": {
                  // backgroundColor: '#202020',
                  // borderColor: '#D3902A',
                  border: "none",
                },
                "&": {
                  textWrap: "nowrap",
                  p: 0,
                  alignItems: "center",
                  justifyContent: "center",
                },
                "& .MuiButton-startIcon": {
                  display: "none",
                },
                borderRadius: "1rem",
                height: "100%",
                width: "100%",
                fontSize: 12,
                textWrap: "nowrap",
                whiteSpace: "pre-wrap",
                textTransform: "none",

                overflow: "hidden",
              }}
            >
              {value.value !== "" && value.value !== undefined ? (
                <div className={s.iconContainer}>
                  <img src={`${value.value}`} className={s.icon} />
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    textAlign: "center",
                    alignItems: "center",
                    textWrap: "nowrap",
                  }}
                >
                  Upload icon
                </div>
              )}
              <VisuallyHiddenInput
                onClick={handleFileUpload}
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileChange(e, true)}
                accept={currentFileTypes}
              />
            </Button>
          </Box>
        </div>
      );
      break;
    case "image":
      element = (
        <div className={s.iconSettigns}>
          <Box
            sx={{
              width: "180px",
              height:
                value.value !== "" && value.value !== undefined
                  ? "fit-content"
                  : "100%",
              maxHeight: "150px",
              position: "relative",
            }}
          >
            {value.value !== "" && value.value !== undefined && (
              <Tooltip title="Remove image" placement="top">
                <Button
                  onClick={clearImage}
                  sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    zIndex: 2,
                    minWidth: "30px",
                  }}
                >
                  <CloseIcon htmlColor={"#cbcbcb"} />
                </Button>
              </Tooltip>
            )}

            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              tabIndex={-1}
              sx={{
                textWrap: "nowrap",
                // backgroundColor: '#222222',
                border: "none",
                "&:hover": {
                  // backgroundColor: '#202020',
                  // borderColor: '#D3902A',
                  border: "none",
                },
                "&": {
                  textWrap: "nowrap",
                  p: 0,
                  alignItems: "center",
                  justifyContent: "center",
                },
                "& .MuiButton-startIcon": {
                  display: "none",
                },
                borderRadius: "1rem",
                height: "100%",
                width: "100%",
                maxHeight: "150px",
                fontSize: 12,
                textWrap: "nowrap",
                whiteSpace: "pre-wrap",
                textTransform: "none",

                overflow: "hidden",
              }}
            >
              {value.value !== "" && value.value !== undefined ? (
                <div className={s.iconContainer}>
                  {/* <div className={s.offerIconOverlay}></div> */}
                  <img src={`${value.value}`} className={s.icon} />
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    textAlign: "center",
                    alignItems: "center",
                    textWrap: "nowrap",
                  }}
                >
                  Upload icon
                </div>
              )}
              <VisuallyHiddenInput
                onClick={handleFileUpload}
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={currentFileTypes}
              />
            </Button>
          </Box>
        </div>
      );
      break;

    case "removeRow":
      element = (
        <Button
          onClick={() => {
            dataDispatch({ type: "remove_row", rowIndex: index });
          }}
          sx={{
            textTransform: "none",
            width: "40px",
            height: "40px",
            minWidth: "20px",
          }}
        >
          <RemoveSharpIcon style={{ fontSize: "12px" }} />
        </Button>
      );
      break;
    case "rowIndex":
      element = <div className={s.cellAlignCenter}>{index + 1}</div>;
      break;
    case "tags": {
      const MAX_VISIBLE_TAGS = 6;
      const tags = value?.value || [];
      const visibleTags =
        tags.length > MAX_VISIBLE_TAGS ? tags.slice(0, MAX_VISIBLE_TAGS) : tags;
      const extraTagsCount = tags.length - MAX_VISIBLE_TAGS;

      element = (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.5,
            p: 1,
            alignItems: "center",
          }}
        >
          {visibleTags.map((tag) => (
            <Chip key={tag} label={tag} size="small" />
          ))}
          {extraTagsCount > 0 && (
            <Tooltip title={tags.slice(MAX_VISIBLE_TAGS).join(", ")}>
              <Chip label={`+${extraTagsCount}`} size="small" />
            </Tooltip>
          )}
          <Button
            onClick={(e) => setTagDrawerOpen(e.currentTarget)}
            sx={{
              textTransform: "none",
              width: "40px",
              height: "40px",
              minWidth: "20px",
            }}
          >
            <LocalOfferIcon style={{ fontSize: "14px" }} />
            <AddIcon style={{ fontSize: "14px" }} />
          </Button>
          <Popover
            anchorEl={tagDrawerOpen}
            open={Boolean(tagDrawerOpen)}
            onClose={() => setTagDrawerOpen(false)}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "center",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "center",
            }}
          >
            <Box sx={{ width: 300, p: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">Add tags</Typography>
                <IconButton onClick={() => setTagDrawerOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
                {possibleLocalizationTags.length > 0 ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {possibleLocalizationTags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        color={tags.includes(tag) ? "primary" : "default"}
                        onClick={() => {
                          if (tags.includes(tag)) {
                            setValue({
                              value: tags.filter((t) => t !== tag),
                              update: true,
                            });
                          } else {
                            setValue({
                              value: [...tags, tag],
                              update: true,
                            });
                          }
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No tags created yet
                  </Typography>
                )}
              </Paper>
            </Box>
          </Popover>
        </Box>
      );
      break;
    }

    case "video":
    case "sound":
    case "any file":
      element = (
        <div className={s.iconSettigns}>
          <Button
            component="label"
            variant="outlined"
            tabIndex={-1}
            sx={{
              textWrap: "nowrap",
              border: "none",
              "&:hover": {
                border: "none",
              },
              "&": {
                textWrap: "nowrap",
                p: 0,
                alignItems: "center",
                justifyContent: "center",
              },
              "& .MuiButton-startIcon": {
                display: "none",
              },
              borderRadius: "1rem",
              height:
                value.value !== "" && value.value !== undefined
                  ? "fit-content"
                  : "40px",
              width: "100%",
              maxHeight: "150px",
              height: "100%",
              fontSize: 12,
              textWrap: "nowrap",
              whiteSpace: "pre-wrap",
              textTransform: "none",

              overflow: "hidden",
            }}
          >
            {value.value !== "" && value.value !== undefined ? (
              <div className={s.iconContainer}>
                {/* <div className={s.offerIconOverlay}></div> */}
                {getFilename()}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  textAlign: "center",
                  alignItems: "center",
                  textWrap: "nowrap",
                }}
              >
                Upload {dataType}
              </div>
            )}
            <VisuallyHiddenInput
              onClick={handleFileUpload}
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={currentFileTypes}
            />
          </Button>
        </div>
      );
      break;
    default:
      element = <span></span>;
      break;
  }
  return element;
}
