import React, { useState, useRef, useEffect, useMemo } from "react";

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Switch,
  FormControlLabel,
  FormGroup,
  Menu,
  MenuItem,
  Chip,
  Paper,
  MenuItem as SelectMenuItem,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Popover,
  InputAdornment,
  Autocomplete,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import Editor from "@monaco-editor/react";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CodeIcon from "@mui/icons-material/Code";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import FunctionsIcon from "@mui/icons-material/Functions";
import LinkIcon from "@mui/icons-material/Link";
import BugReportIcon from "@mui/icons-material/BugReport";
import { createSandbox } from "shared/sharedFunctions";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
hljs.registerLanguage("json", json);
function GameModelFunctions({
  card,
  segments,
  nodeData,
  offers,
  variables,
  selectedSegment,
  links,
  onClone,
  onDelete,
  onChange,
  onLinkChange,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [cardState, setCardState] = useState(card);
  const [cardMenuId, setCardMenuId] = useState(null);

  const [testResult, setTestResult] = useState(null);
  const [testDebug, setTestDebug] = useState(null);
  const [testError, setTestError] = useState(null);
  const [linkValues, setLinkValues] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);

  const [editorHeight, setEditorHeight] = useState("200px");

  // Create sandbox only once and store it in a ref
  const sandboxRef = useRef(null);

  // Initialize sandbox when component mounts
  useEffect(() => {
    sandboxRef.current = createSandbox(appendVariablesToCode(card.code));

    // Cleanup sandbox when component unmounts
    return () => {
      if (sandboxRef.current) {
        sandboxRef.current.cleanup();
      }
    };
  }, []);

  // Initialize linkValues with existing output paths if they exist
  const initiallySetLinks = useRef(false);
  useEffect(() => {
    if (initiallySetLinks.current === true) return;
    const initialValues = {};
    links.forEach((link) => {
      initialValues[link.valueSID + link.nodeID] = link.outputPath || "";
    });
    setLinkValues(initialValues);
    initiallySetLinks.current = true;
  }, [links]);

  // Update cardState when card prop changes
  useEffect(() => {
    setCardState(card);
  }, [card]);

  const handleMenuOpen = (event, cardId) => {
    setAnchorEl(event.currentTarget);
    setCardMenuId(cardId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCardMenuId(null);
  };

  const timeoutRef_Save = useRef(null);
  function changeCard(field, change) {
    clearTimeout(timeoutRef_Save.current);
    timeoutRef_Save.current = setTimeout(async () => {
      const updatedCard = { ...cardState, [field]: change };
      setCardState(updatedCard);
      onChange(updatedCard.functionID, { [field]: change });
    }, 1000);
  }

  const handleLinkChange = (linkObj, outputPath) => {
    setLinkValues((prev) => ({
      ...prev,
      [linkObj.valueSID + linkObj.nodeID]: outputPath,
    }));

    // Notify parent component about the change
    if (onLinkChange) {
      onLinkChange(
        linkObj.valueSID,
        linkObj.nodeID,
        linkObj.inheritedFromNodeID,
        outputPath
      );
    }
  };

  // Safely evaluate an output path without using eval or new Function
  function evaluateOutputPath(path, result) {
    if (!path || result === undefined || result === null) return null;

    try {
      // Direct array access pattern like "result[0]"
      const directArrayMatch = path.match(/^(\w+)\[(\d+)\]$/);
      if (directArrayMatch) {
        const [_, objName, index] = directArrayMatch;

        // If the path starts with "result" and is directly accessing an array
        if (objName === "result" && Array.isArray(result)) {
          const idx = parseInt(index, 10);
          if (idx >= 0 && idx < result.length) {
            return result[idx];
          }
        } else if (typeof result === "object" && result !== null) {
          // It might be accessing a property that contains an array
          const arr = result[objName];
          if (Array.isArray(arr)) {
            const idx = parseInt(index, 10);
            if (idx >= 0 && idx < arr.length) {
              return arr[idx];
            }
          }
        }
        return null;
      }

      // Direct property access like "result.property"
      if (path === "result") {
        return result;
      }

      if (path.startsWith("result.")) {
        path = path.substring(7); // Remove "result." prefix
      }

      // Split the path by dots to navigate through the object
      const pathParts = path.split(".");
      let currentValue = result;

      for (const part of pathParts) {
        // Handle array access like items[0]
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);

        if (arrayMatch) {
          // Handle array access
          const [_, propName, index] = arrayMatch;
          if (
            !currentValue[propName] ||
            !Array.isArray(currentValue[propName])
          ) {
            return null;
          }
          const idx = parseInt(index, 10);
          if (idx >= 0 && idx < currentValue[propName].length) {
            currentValue = currentValue[propName][idx];
          } else {
            return null;
          }
        } else {
          // Regular property access
          if (
            currentValue === null ||
            currentValue === undefined ||
            !(part in currentValue)
          ) {
            return null;
          }
          currentValue = currentValue[part];
        }
      }

      return currentValue;
    } catch (error) {
      console.error("Error evaluating output path:", error);
      return null;
    }
  }

  function appendVariablesToCode(code) {
    if (!variables || variables.length === 0) return code;

    let varsArray = variables.map((v) => {
      switch (v.variableType) {
        case "string":
          return `var ${v.variableName} = "${v.value}"`;
        case "number":
          return `var ${v.variableName} = ${v.value}`;
        case "boolean":
          return `var ${v.variableName} = ${v.value.toString().toLowerCase() === "true"}`;
        default:
          return `var ${v.variableName} = null`;
      }
    });

    return `
    ${varsArray.join(";\n")}

    ${code}
    `;
  }

  const testCode = async () => {
    setIsExecuting(true);
    setTestResult(null);
    setTestDebug(null);
    setTestError(null);
    const parent = document.querySelector("#functionsBody");
    const scrollPos = parent ? parent.scrollTop : 0;
    try {
      // Use the sandbox ref
      if (!sandboxRef.current) {
        sandboxRef.current = createSandbox(
          appendVariablesToCode(cardState.code)
        );
      }

      const { result, logs } = await sandboxRef.current.execute(
        undefined,
        undefined,
        appendVariablesToCode(cardState.code),
        false
      );

      setTestDebug(
        logs.map((l) => {
          return typeof l === "object" ? JSON.stringify(l, null, 2) : l;
        })
      );
      setTestResult(result);
    } catch (error) {
      console.error(error);
      setTestError(error.message);
      setIsExecuting(false);
      // Restore scroll position
      setTimeout(() => {
        if (parent) {
          parent.scrollTop = scrollPos;
        }
      }, 50);
    } finally {
      setIsExecuting(false);
      // Restore scroll position
      setTimeout(() => {
        if (parent) {
          parent.scrollTop = scrollPos;
        }
      }, 50);
    }
  };

  function getNodeName(nodeID) {
    let item = offers.find((o) => o.offerID === nodeID);
    if (item) {
      return item.offerName;
    }
    return nodeData.find((n) => n.nodeID === nodeID)?.name || "Unknown Node";
  }

  function isOfferLink(nodeID) {
    let item = offers.find((o) => o.offerID === nodeID);
    if (item) {
      return true;
    } else {
      return false;
    }
  }

  function getValueTypeIcon(valueType) {
    switch (valueType?.toLowerCase()) {
      case "string (derived)":
        return "Aa";
      case "number (derived)":
        return "123";
      case "boolean (derived)":
        return "0|1";
      case "priceamount": // offer
        return "Price Amount";
      default:
        return "?";
    }
  }
  function formatToHighlightJs(text) {
    try {
      return hljs.highlight(text, {
        language: "json",
      }).value;
    } catch (error) {
      return text;
    }
  }
  // Format the value based on its type for display
  const formatValue = (value, type) => {
    if (value === null || value === undefined) return "undefined";

    switch (type?.toLowerCase()) {
      case "string (derived)":
        return `"${value}"`;
      case "number (derived)":
        return Number.isNaN(Number(value)) ? "NaN" : value.toString();
      case "boolean (derived)":
        return value ? "true" : "false";
      case "priceamount": // offer
        return Number.isNaN(Number(value)) ? "NaN" : value.toString();
      default:
        return JSON.stringify(value);
    }
  };
  // Validate the value data type
  const validateValueType = (value, type) => {
    if (value === null || value === undefined) return null;

    switch (type?.toLowerCase()) {
      case "string (derived)":
        return typeof value === "string";
      case "number (derived)":
        return typeof value === "number";
      case "boolean (derived)":
        return typeof value === "boolean";
      case "priceamount": // offer
        return typeof value === "number" && Number.isInteger(value);
      default:
        return false;
    }
  };

  function getValueTypeErrorTooltip(value, type) {
    let check = validateValueType(value, type);

    switch (type?.toLowerCase()) {
      case "string (derived)":
        if (!check) {
          return `Wrong value type. Must be "string" type. Got value of "${typeof value}" type`;
        }
        break;
      case "number (derived)":
        if (!check) {
          return `Wrong value type. Must be "number" type. Got value of "${typeof value}" type`;
        }
        break;
      case "boolean (derived)":
        if (!check) {
          return `Wrong value type. Must be "boolean" type. Got value of "${typeof value}" type`;
        }
        break;
      case "priceamount": // offer
        if (!check) {
          return `Wrong value type. Must be "number" type and a whole number. Got value of "${typeof value}" type`;
        }
        break;
      default:
        return "";
    }
    return "Current value";
  }

  // Memoize the Editor component to prevent unnecessary re-renders
  const editorInstanceRef = useRef(null);
  const codeValueRef = useRef(cardState.code);
  const editorComponent = useMemo(
    () => {
      return (
        <Box sx={{ position: "relative" }}>
          <Editor
            height={editorHeight}
            defaultLanguage="javascript"
            value={cardState.code}
            onMount={(editor, monaco) => {
              editorInstanceRef.current = editor;
              editor.getDomNode().addEventListener("keydown", (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                  e.preventDefault();
                  editor.getAction("editor.action.formatDocument").run();
                }
              });
            }}
            onChange={(value) => {
              codeValueRef.current = value;
              changeCard("code", codeValueRef.current);
            }}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
            }}
          />
          <Tooltip title="Indent code" disableInteractive placement="top">
            <IconButton
              size="small"
              onClick={() => {
                if (editorInstanceRef.current) {
                  editorInstanceRef.current
                    .getAction("editor.action.formatDocument")
                    .run();
                }
              }}
              sx={{
                position: "absolute",
                top: 5,
                right: 60,
                bgcolor: "rgba(255,255,255,0.7)",
                zIndex: 4,
              }}
            >
              <CodeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title="Enlarge code editor"
            disableInteractive
            placement="top"
          >
            <IconButton
              size="small"
              onClick={() =>
                setEditorHeight(editorHeight === "200px" ? "600px" : "200px")
              }
              sx={{
                position: "absolute",
                top: 5,
                right: 25,
                bgcolor: "rgba(255,255,255,0.7)",
                zIndex: 4,
              }}
            >
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      );
    },
    [cardState.functionID, editorHeight] // Include editorHeight in dependency array
  );

  return (
    <>
      <Card key={cardState.functionID} sx={{ mb: 3, position: "relative" }}>
        <Backdrop
          sx={{
            color: "#fff",
            zIndex: (theme) => theme.zIndex.drawer + 1,
            position: "absolute",
          }}
          open={isExecuting}
        >
          <CircularProgress color="inherit" />
        </Backdrop>

        <CardHeader
          title={
            <TextField
              fullWidth
              variant="standard"
              value={cardState.name}
              onChange={(e) => {
                changeCard("name", e.target.value);
              }}
              InputProps={{
                disableUnderline: true,
                style: { fontSize: "1.25rem", fontWeight: 500 },
              }}
            />
          }
          subheader={
            <TextField
              fullWidth
              variant="standard"
              placeholder="Add a comment..."
              value={cardState.comment}
              onChange={(e) => {
                changeCard("comment", e.target.value);
              }}
              InputProps={{
                disableUnderline: true,
                style: {
                  color: "rgba(0, 0, 0, 0.6)",
                  fontSize: "0.875rem",
                },
              }}
            />
          }
          action={
            <>
              <Chip
                label={
                  segments.find((s) => s.segmentID === selectedSegment)
                    ?.segmentName || "Everyone"
                }
                size="small"
                color={selectedSegment === "everyone" ? "primary" : "secondary"}
                sx={{ mr: 1 }}
              />
              <IconButton
                onClick={(e) => handleMenuOpen(e, cardState.functionID)}
              >
                <MoreVertIcon />
              </IconButton>
            </>
          }
        />
        <CardContent>
          {editorComponent}

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<BugReportIcon />}
              onClick={testCode}
              disabled={isExecuting}
            >
              Test Function
            </Button>
          </Box>

          {testError && (
            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 1,
                bgcolor: "error.light",
                color: "error.contrastText",
                borderRadius: 1,
              }}
            >
              <Typography
                color="error.contrastText"
                variant="body2"
                component="pre"
                sx={{ whiteSpace: "pre-wrap", m: 0 }}
              >
                {testError}
              </Typography>
            </Paper>
          )}

          <Box
            sx={{
              mt: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <LinkIcon
                fontSize="small"
                sx={{ mr: 1, color: "text.secondary" }}
              />
              <Typography variant="subtitle2" color="text.secondary">
                Linked values:
              </Typography>
            </Box>

            {links.length > 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  mt: 1,
                  overflow: "hidden",
                  backgroundColor: "var(--game-model-link-bg-color)",
                }}
              >
                <List disablePadding dense>
                  {links.map((link, i) => (
                    <React.Fragment key={link.valueSID + link.nodeID || i}>
                      {i > 0 && <Divider />}
                      <ListItem
                        dense
                        sx={{
                          py: 1,
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          alignItems: { xs: "flex-start", sm: "center" },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            minWidth: { xs: "100%", sm: "50%" },
                            mb: { xs: 1, sm: 0 },
                          }}
                        >
                          <Tooltip title={`Node: ${getNodeName(link.nodeID)}`}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "medium", mr: 1 }}
                            >
                              {getNodeName(link.nodeID)}
                            </Typography>
                          </Tooltip>

                          {!isOfferLink(link.nodeID) && (
                            <Tooltip title={`Value ID: ${link.valueID}`}>
                              <Chip
                                size="small"
                                label={link.valueID}
                                sx={{ mr: 1 }}
                              />
                            </Tooltip>
                          )}

                          <Tooltip
                            title={
                              !isOfferLink(link.nodeID)
                                ? `Type: ${link.valueType || "unknown"}`
                                : ""
                            }
                          >
                            <Chip
                              size="small"
                              variant="outlined"
                              label={getValueTypeIcon(link.valueType)}
                            />
                          </Tooltip>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            flexGrow: 1,
                            width: { xs: "100%", sm: "auto" },
                          }}
                        >
                          <Tooltip
                            title={getValueTypeErrorTooltip(
                              evaluateOutputPath(
                                linkValues[link.valueSID + link.nodeID],
                                testResult
                              ),
                              link.valueType
                            )}
                          >
                            <Chip
                              size="small"
                              label={formatValue(
                                evaluateOutputPath(
                                  linkValues[link.valueSID + link.nodeID],
                                  testResult
                                ),
                                link.valueType
                              )}
                              color={
                                validateValueType(
                                  evaluateOutputPath(
                                    linkValues[link.valueSID + link.nodeID],
                                    testResult
                                  ),
                                  link.valueType
                                ) === null
                                  ? "default"
                                  : validateValueType(
                                        evaluateOutputPath(
                                          linkValues[
                                            link.valueSID + link.nodeID
                                          ],
                                          testResult
                                        ),
                                        link.valueType
                                      )
                                    ? "success"
                                    : "error"
                              }
                              variant="contained"
                            />
                          </Tooltip>
                          <TextField
                            size="small"
                            placeholder="result.value"
                            value={
                              linkValues[link.valueSID + link.nodeID] || ""
                            }
                            onChange={(e) =>
                              handleLinkChange(link, e.target.value)
                            }
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <FunctionsIcon fontSize="small" />
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              flexGrow: 1,
                              ml: 1,
                              "& .MuiInputBase-input": {
                                fontFamily: "monospace",
                              },
                            }}
                          />
                        </Box>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                No linked values yet
              </Typography>
            )}
          </Box>

          {testResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Test result:
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1,
                  mt: 0.5,
                  bgcolor: "grey.50",
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    whiteSpace: "pre-wrap",
                    m: 0,
                    fontFamily: "monospace",
                  }}
                >
                  {JSON.stringify(testResult, null, 2)}
                </Typography>
              </Paper>
            </Box>
          )}

          {testDebug && testDebug.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Console logs:
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1,
                  mt: 0.5,
                  bgcolor: "grey.50",
                  maxHeight: 150,
                  overflow: "auto",
                }}
              >
                {testDebug.map((t) => (
                  <Box>
                    <pre
                      dangerouslySetInnerHTML={{
                        __html: formatToHighlightJs(
                          typeof t === "object" ? JSON.stringify(t, null, 2) : t
                        ),
                      }}
                    />
                  </Box>
                ))}
              </Paper>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Card Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            onDelete(cardMenuId);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onClone(cardMenuId);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <FileCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clone</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export default GameModelFunctions;
