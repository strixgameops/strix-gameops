import React from "react";
import s from "./css/segmentItem.module.css";
import { useEffect, useState } from "react";
import {
  Typography,
  Box,
  IconButton,
  Button,
  Checkbox,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
} from "@mui/material";

import { DndProvider, useDrop } from "react-dnd";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveIcon from "@mui/icons-material/Remove";
import CheckIcon from "@mui/icons-material/Check";
import DatePicker from "shared/datePicker/DatePickerWidget.jsx";

import dayjs from "dayjs";
import SegmentsPicker from "shared/segmentsWidget/SegmentsPickerWidget.jsx";

import shortid from "shortid";

import useApi from "@strix/api";
import { useBranch, useGame } from "@strix/gameContext";

function SegmentItem_LogicBlock({
  block,
  index,
  isDragging,
  allSegments,
  onBlockChange,
  onBlockRemove,
  templates,
}) {
  const { getAnalyticsEvent } = useApi();

  const { game } = useGame();
  const { branch, environment } = useBranch();
  const [pendingRemove, setPendingRemove] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(block);
  useEffect(() => {
    onBlockChange(currentBlock, index);
  }, [currentBlock]);

  function getTemplateName(templateID) {
    if (templateID === undefined) {
      return "";
    }
    let name = templates.analytics.find(
      (t) => t.templateID === templateID
    )?.templateName;
    if (name === undefined) {
      name = templates.statistics.find(
        (t) => t.templateID === templateID
      )?.templateName;
    }
    if (name === undefined) {
      name = templates.inventory.find(
        (t) => t.templateID === templateID
      )?.templateName;
    }
    if (name === undefined) {
      name = templates.segmentation.find(
        (t) => t.templateID === templateID
      )?.templateName;
    }
    return name;
  }

  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: ["analytics", "statistics", "inventory", "segmentation"],
    drop: (item, monitor) => addTemplateToConditions(item, monitor),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));
  function addTemplateToConditions(template, dropVariables) {
    console.log("Adding template", template);

    if (!dropVariables.canDrop()) return;
    switch (dropVariables.getItemType()) {
      case "analytics":
        addTemplateAnalytics();
        break;
      case "statistics":
        addTemplateStatistics();
        break;
      case "inventory":
        addTemplateInventory();
        break;
      case "segmentation":
        addTemplateSegmentation();
        break;
      default:
        break;
    }
    async function addTemplateSegmentation() {
      setCurrentBlock((prevElement) => {
        let updatedArray = prevElement.conditions;

        if (prevElement.conditions.length > 0) {
          updatedArray = [
            ...updatedArray,
            {
              conditionOperator: "and",
            },
          ];
        }

        updatedArray = [
          ...updatedArray,
          {
            conditionElementID: template.templateID,
            condition: template.templateID, // templateID is kinda the condition too
            conditionValue: [],
            conditionSecondaryValue: "",
            valueFormat: "segment",
            templateName: template.templateName,
          },
        ];

        return {
          ...prevElement,
          conditions: updatedArray,
        };
      });
    }
    async function addTemplateInventory() {
      setCurrentBlock((prevElement) => {
        let updatedArray = prevElement.conditions;

        if (prevElement.conditions.length > 0) {
          updatedArray = [
            ...updatedArray,
            {
              conditionOperator: "and",
            },
          ];
        }

        updatedArray = [
          ...updatedArray,
          {
            conditionElementID: template.templateID,
            condition: "",
            conditionValue: "",
            conditionSecondaryValue: "",
            valueFormat: "integer",
            templateName: template.templateName,
          },
        ];

        return {
          ...prevElement,
          conditions: updatedArray,
        };
      });
    }
    async function addTemplateStatistics() {
      setCurrentBlock((prevElement) => {
        let updatedArray = prevElement.conditions;

        if (prevElement.conditions.length > 0) {
          updatedArray = [
            ...updatedArray,
            {
              conditionOperator: "and",
            },
          ];
        }

        updatedArray = [
          ...updatedArray,
          {
            conditionElementID: template.templateID,
            condition: "",
            conditionValue: "",
            conditionSecondaryValue: "",
            valueFormat: template.templateType,
            templateName: template.templateName,
          },
        ];

        return {
          ...prevElement,
          conditions: updatedArray,
        };
      });
    }

    async function addTemplateAnalytics() {
      let response;
      let valueFormat;
      let valueName;
      if (!template.templateDefaultVariantType) {
        response = await getAnalyticsEvent({
          gameID: game.gameID,
          branch: branch,
          eventID: template.templateAnalyticEventID,
        });
        valueFormat = response.values.find(
          (value) => value.uniqueID === template.templateEventTargetValueId
        ).valueFormat;
        valueName = response.values.find(
          (value) => value.uniqueID === template.templateEventTargetValueId
        ).valueName;
      } else {
        valueFormat = template.templateDefaultVariantType;
        valueName = template.templateName;
      }

      setCurrentBlock((prevElement) => {
        let updatedArray = prevElement.conditions;

        if (prevElement.conditions.length > 0) {
          updatedArray = [
            ...updatedArray,
            {
              conditionOperator: "and",
            },
          ];
        }

        updatedArray = [
          ...updatedArray,
          {
            conditionElementID: template.templateID,
            condition: valueFormat === "date" ? valueFormat : "",
            conditionValue: "",
            conditionSecondaryValue: "",
            valueFormat: valueFormat,
            valueName: valueName,
            templateName: template.templateName,
            templateMethod: template.templateMethod,
          },
        ];


        return {
          ...prevElement,
          conditions: updatedArray,
        };
      });
    }
  }
  function addNewSubBlock() {
    setCurrentBlock((prevElement) => {
      let updatedArray = prevElement.conditions;

      if (prevElement.conditions.length > 0) {
        updatedArray = [
          ...updatedArray,
          {
            conditionOperator: "and",
          },
        ];
      }
      updatedArray = [
        ...updatedArray,
        {
          conditions: [],
        },
      ];
      return {
        ...prevElement,
        conditions: updatedArray,
      };
    });
  }
  function removeBlock(index) {
    setCurrentBlock((prevElement) => {
      let updatedArray = prevElement.conditions;

      if (updatedArray.length === 1) {
        updatedArray = updatedArray.filter((block, i) => i !== index);
      } else {
        updatedArray = updatedArray.filter((block, i) => i !== index);
        if (index === 0) {
          updatedArray = updatedArray.filter((block, i) => i !== index);
        } else {
          updatedArray = updatedArray.filter((block, i) => i !== index - 1);
        }
      }
      return {
        ...prevElement,
        conditions: updatedArray,
      };
    });
  }

  function onSelectTemplateCondition(conditionString, valueIndex) {
    setCurrentBlock((prevElement) => ({
      ...prevElement,
      conditions: prevElement.conditions.map((condition, i) =>
        i === valueIndex
          ? {
              ...condition,
              condition:
                // Set conditionEnabled as if we tried to do something like "conditionEnabled: !conditionEnabled"
                conditionString.target.value,
            }
          : condition
      ),
    }));
  }
  function onElementConditionValueChange(value, valueFormat, conditionIndex) {
    let inputValue = value;

    let targetEventValue = valueFormat;

    // console.log(targetEvent.values[valueIndex])
    // Format values based on their type
    //
    // Format value as integer
    if (targetEventValue === "integer") {
      // Remove all non-numeric symbols
      inputValue = inputValue.replace(/[^0-9]/g, "");

      // Remove leading zeros
      inputValue = inputValue.replace(/^0+/, "");
    }
    // Format value as float if we're dealing with floats or money value type
    if (targetEventValue === "float" || targetEventValue === "money") {
      // Remove all NaN symbols
      inputValue = handleFloatInput(inputValue);
    }
    // Format value as percentile
    if (targetEventValue === "percentile") {
      // Remove all non-numeric symbols
      inputValue = inputValue.replace(/[^0-9]/g, "");

      // Remove leading zeros
      inputValue = inputValue.replace(/^0+/, "");

      // Ensure the value is a number
      const numericValue = parseInt(inputValue, 10);

      // Clamp the value between 0 and 100
      inputValue = Math.min(100, Math.max(0, numericValue));
    }

    setCurrentBlock((prevElement) => ({
      ...prevElement,
      conditions: prevElement.conditions.map((condition, i) =>
        i === conditionIndex
          ? { ...condition, conditionValue: inputValue }
          : condition
      ),
    }));
  }
  function onElementConditionSecondaryValueChange(
    value,
    valueFormat,
    valueIndex
  ) {
    let inputValue = value;

    let targetEventValue = valueFormat;

    // console.log(targetEvent.values[valueIndex])
    // Format values based on their type
    //
    // Format value as integer
    if (targetEventValue === "integer") {
      // Remove all non-numeric symbols
      inputValue = inputValue.replace(/[^0-9]/g, "");

      // Remove leading zeros
      inputValue = inputValue.replace(/^0+/, "");
    }
    // Format value as float if we're dealing with floats or money value type
    if (targetEventValue === "float" || targetEventValue === "money") {
      // Remove all NaN symbols
      inputValue = handleFloatInput(inputValue);
    }
    // Format value as percentile
    if (targetEventValue === "percentile") {
      // Remove all non-numeric symbols
      inputValue = inputValue.replace(/[^0-9]/g, "");

      // Remove leading zeros
      inputValue = inputValue.replace(/^0+/, "");

      // Ensure the value is a number
      const numericValue = parseInt(inputValue, 10);

      // Clamp the value between 0 and 100
      inputValue = Math.min(100, Math.max(0, numericValue));
    }

    console.log(inputValue);

    setCurrentBlock((prevElement) => ({
      ...prevElement,
      conditions: prevElement.conditions.map((condition, i) =>
        i === valueIndex
          ? { ...condition, conditionSecondaryValue: inputValue }
          : condition
      ),
    }));
  }
  function onChangeConditionOperator(e, index) {
    setCurrentBlock((prevElement) => ({
      ...currentBlock,
      conditions: currentBlock.conditions.map((condition, i) =>
        i === index
          ? {
              ...condition,
              conditionOperator: e.target.value,
            }
          : condition
      ),
    }));
  }
  const removeTemplateFromConditions = (indexToRemove) => {
    if (indexToRemove === 0) {
      setCurrentBlock((prevElement) => {
        if (prevElement.conditions.length === 1) {
          // Clearing condition only in case if it is the only element in the array
          const updatedArrayWithoutCondition = prevElement.conditions.filter(
            (_, index) => index !== indexToRemove
          );
          return {
            ...prevElement,
            conditions: updatedArrayWithoutCondition,
          };
        } else {
          // Clearing operator first because it is higher
          const updatedArrayWithoutOperator = prevElement.conditions.filter(
            (_, index) => index !== indexToRemove + 1
          );
          const updatedArrayWithoutCondition =
            updatedArrayWithoutOperator.filter(
              (_, index) => index !== indexToRemove
            );
          return {
            ...prevElement,
            conditions: updatedArrayWithoutCondition,
          };
        }
      });
    } else {
      setCurrentBlock((prevElement) => {
        const updatedArrayWithoutCondition = prevElement.conditions.filter(
          (_, index) => index !== indexToRemove
        );
        const updatedArrayWithoutOperator = updatedArrayWithoutCondition.filter(
          (_, index) => index !== indexToRemove - 1
        );
        return {
          ...prevElement,
          conditions: updatedArrayWithoutOperator,
        };
      });
    }
  };

  function handleFloatInput(value) {
    // Real-world value input
    let currentInputValue = value;
    if (currentInputValue === "") {
      return "";
    }

    if (currentInputValue === ".") {
      currentInputValue = "0.";
    }

    let sanitizedValue = currentInputValue.replace(/[^0-9.]/g, "");

    let dotCount = sanitizedValue.split(".").length - 1;

    if (dotCount > 1) {
      sanitizedValue =
        sanitizedValue.split(".").slice(0, 2).join(".") +
        sanitizedValue.split(".").slice(2).join("");
    }

    if (
      sanitizedValue.startsWith("0") &&
      sanitizedValue.length > 1 &&
      sanitizedValue[1] !== "."
    ) {
      sanitizedValue = "0." + sanitizedValue.slice(1);
    }

    dotCount = sanitizedValue.split(".").length - 1;

    return sanitizedValue;
  }

  function callRemoveItem() {
    // On first click
    if (!pendingRemove) {
      setPendingRemove(true);
    } else {
      // On accept click
      onBlockRemove(index);
    }
  }
  function handleSubBlockChange(newBlock, index) {
    setCurrentBlock((prevElement) => {
      const updatedArray = prevElement.conditions;
      updatedArray[index] = newBlock;
      return {
        ...prevElement,
        conditions: updatedArray,
      };
    });
  }

  function getTemplateValueField(condition, index) {
    // console.log(
    //   "Got condition",
    //   JSON.parse(JSON.stringify(condition)),
    //   JSON.parse(JSON.stringify(currentBlock.conditions[index]?.conditionValue))
    // );
    switch (condition.valueFormat) {
      case "segment":
        return (
          <SegmentsPicker
            segments={allSegments}
            currentSegments={allSegments.filter((s) =>
              condition.conditionValue?.includes(s.segmentID)
            )}
            onStateChange={(segments) =>
              onElementConditionValueChange(
                segments.map((s) => s.segmentID),
                condition.valueFormat,
                index
              )
            }
          />
        );
      case "date":
        return (
          <DatePicker
            index={index}
            customSX={{
              minHeight: 40,
              maxHeight: 40,
            }}
            skipInitialize={true}
            filterStateOverride={[
              dayjs.utc(condition.conditionValue || dayjs.utc()).toISOString(),
              dayjs
                .utc(condition.conditionSecondaryValue || dayjs.utc())
                .toISOString(),
            ]}
            onStateChange={(value) => {
              if (value[0]) {
                onElementConditionValueChange(
                  value[0],
                  condition.valueFormat,
                  index
                );
              }
              if (value[1]) {
                onElementConditionSecondaryValueChange(
                  value[1],
                  condition.valueFormat,
                  index
                );
              }
            }}
          />
        );
      case "bool":
        return (
          <Select
            sx={{
              "& .MuiSelect-select": {
                paddingRight: "0px !important",
              },
            }}
            fullWidth
            disabled={currentBlock.conditions[index]?.condition === ""}
            value={currentBlock.conditions[index]?.conditionValue || ""}
            endAdornment={
              <InputAdornment position="end" sx={{ pr: 2 }}>
                {(() => {
                  switch (condition.valueFormat) {
                    case "money":
                      return "$";
                    case "string":
                      return "str";
                    case "integer":
                      return "123";
                    case "float":
                      return "1.23";
                    case "percentile":
                      return "%";
                    case "bool":
                      return "bool";
                    default:
                      return "";
                  }
                })()}
              </InputAdornment>
            }
            onChange={(e) =>
              onElementConditionValueChange(
                e.target.value,
                condition.valueFormat,
                index
              )
            }
          >
            <MenuItem value={"true"}>True</MenuItem>
            <MenuItem value={"false"}>False</MenuItem>
          </Select>
        );

      default:
        return (
          <OutlinedInput
            spellCheck={false}
            sx={{
              "& .MuiSelect-select": {
                paddingRight: "0px !important",
              },
            }}
            value={currentBlock.conditions[index]?.conditionValue || ""}
            onChange={(e) =>
              onElementConditionValueChange(
                e.target.value,
                condition.valueFormat,
                index
              )
            }
            endAdornment={
              <InputAdornment position="end">
                {(() => {
                  switch (condition.valueFormat) {
                    case "money":
                      return "$";
                    case "string":
                      return "str";
                    case "integer":
                      return "123";
                    case "float":
                      return "1.23";
                    case "percentile":
                      return "%";
                    case "bool":
                      return "bool";
                    default:
                      return "";
                  }
                })()}
              </InputAdornment>
            }
            aria-describedby="outlined-weight-helper-text"
            inputProps={{
              "aria-label": "weight",
            }}
          />
        );
    }
  }

  return (
    <div
      className={`${s.logicBlockBody} ${isDragging ? s.logicBlockBodyDragging : ""} ${isOver ? s.logicBlockDragOver : ""}`}
      ref={drop}
    >
      {currentBlock.conditions?.length === 0 && (
        <div className={s.noConditions}>
          <Typography>Drop elements here</Typography>
        </div>
      )}
      {currentBlock.conditions?.map((condition, index) =>
        // Handling sub-blocks
        condition.conditions ? (
          <SegmentItem_LogicBlock
            key={condition.sid}
            block={condition}
            index={index}
            isDragging={isDragging}
            onBlockChange={handleSubBlockChange}
            onBlockRemove={removeBlock}
            templates={templates}
          />
        ) : // Handling operators
        condition.conditionOperator === "and" ||
          condition.conditionOperator === "or" ? (
          <div key={index} className={s.operatorContainer}>
            <Box sx={{ p: 0 }}>
              <FormControl size="small" sx={{ m: 2, minWidth: "100px" }}>
                <Select
                  value={
                    currentBlock.conditions[index]?.conditionOperator || ""
                  }
                  onChange={(e) => onChangeConditionOperator(e, index)}
                >
                  <MenuItem key="and" value={"and"}>
                    AND
                  </MenuItem>
                  <MenuItem key="or" value={"or"}>
                    OR
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          </div>
        ) : (
          <Box
            key={index}
            sx={{
              p: 0,
              paddingBottom: "0",
              maxWidth: "100%",
              maxHeight: "100px",
            }}
          >
            <div className={s.valueContainer} key={index}>
              {/* Template name */}
              <TextField
                spellCheck={false}
                value={
                  getTemplateName(
                    currentBlock.conditions[index]?.conditionElementID
                  ) || ""
                }
                size="small"
                // Don't use "disabled" prop, otherwise it will make the field clickable
                // and we won't be able to open the segment if we click while the cursor is on it
                sx={{
                  "&": {
                    pointerEvents: "none !important",
                  },
                  "& label": {
                    pointerEvents: "none !important",
                  },
                  m: 1,
                  width: "40%",
                  maxWidth: "max-content",
                  maxHeight: "100px",
                }}
                label="Element Name"
              ></TextField>
              {/* Condition field */}
              {condition.valueFormat !== "date" &&
                condition.valueFormat !== "segment" && (
                  <FormControl size="small" sx={{ m: 1, width: "25%" }}>
                    <InputLabel id="demo-simple-select-small-label">
                      Condition
                    </InputLabel>
                    <Select
                      id="demo-simple-select-autowidth"
                      value={currentBlock.conditions[index]?.condition || ""}
                      onChange={(e) => onSelectTemplateCondition(e, index)}
                      label="Condition"
                    >
                      {[
                        condition.valueFormat === "integer" && [
                          <MenuItem
                            className="dropdown-option"
                            key="equal"
                            value={"="}
                          >
                            Is Equal (=)
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="notEqual"
                            value={"!="}
                          >
                            Is Not Equal (!=)
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="moreThan"
                            value={">"}
                          >
                            More than ({">"})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="lessThan"
                            value={"<"}
                          >
                            Less than ({"<"})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="moreThanOrEqual"
                            value={">="}
                          >
                            More than or Equal to ({">="})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="lessThanOrEqual"
                            value={"<="}
                          >
                            Less than or Equal to ({"<="})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="inrange"
                            value={"range"}
                          >
                            In Range
                          </MenuItem>,
                        ],
                        condition.valueFormat === "string" && [
                          <MenuItem
                            className="dropdown-option"
                            key="is"
                            value={"is"}
                          >
                            Is
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="isNot"
                            value={"isNot"}
                          >
                            Is Not
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="includes"
                            value={"includes"}
                          >
                            Includes
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="notIncludes"
                            value={"notIncludes"}
                          >
                            Not Includes
                          </MenuItem>,
                        ],
                        condition.valueFormat === "bool" && [
                          <MenuItem
                            className="dropdown-option"
                            key="is"
                            value={"is"}
                          >
                            Is
                          </MenuItem>,
                        ],
                        condition.valueFormat === "float" && [
                          <MenuItem
                            className="dropdown-option"
                            key="equal"
                            value={"="}
                          >
                            Is Equal (=)
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="notEqual"
                            value={"!="}
                          >
                            Is Not Equal (!=)
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="moreThan"
                            value={">"}
                          >
                            More than ({">"})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="lessThan"
                            value={"<"}
                          >
                            Less than ({"<"})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="moreThanOrEqual"
                            value={">="}
                          >
                            More than or Equal to ({">="})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="lessThanOrEqual"
                            value={"<="}
                          >
                            Less than or Equal to ({"<="})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="inrange"
                            value={"range"}
                          >
                            In Range
                          </MenuItem>,
                        ],
                        condition.valueFormat === "percentile" && [
                          <MenuItem
                            className="dropdown-option"
                            key="equal"
                            value={"="}
                          >
                            Is Equal (=)
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="notEqual"
                            value={"!="}
                          >
                            Is Not Equal (!=)
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="moreThan"
                            value={">"}
                          >
                            More than ({">"})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="lessThan"
                            value={"<"}
                          >
                            Less than ({"<"})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="moreThanOrEqual"
                            value={">="}
                          >
                            More than or Equal to ({">="})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="lessThanOrEqual"
                            value={"<="}
                          >
                            Less than or Equal to ({"<="})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="inrange"
                            value={"range"}
                          >
                            In Range
                          </MenuItem>,
                        ],
                        condition.valueFormat === "money" && [
                          <MenuItem
                            className="dropdown-option"
                            key="equal"
                            value={"="}
                          >
                            Is Equal (=)
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="notEqual"
                            value={"!="}
                          >
                            Is Not Equal (!=)
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="moreThan"
                            value={">"}
                          >
                            More than ({">"})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="lessThan"
                            value={"<"}
                          >
                            Less than ({"<"})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="moreThanOrEqual"
                            value={">="}
                          >
                            More than or Equal to ({">="})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="lessThanOrEqual"
                            value={"<="}
                          >
                            Less than or Equal to ({"<="})
                          </MenuItem>,
                          <MenuItem
                            className="dropdown-option"
                            key="inrange"
                            value={"range"}
                          >
                            In Range
                          </MenuItem>,
                        ],
                      ]}
                    </Select>
                  </FormControl>
                )}
              {/* Value field */}
              <FormControl
                size="small"
                sx={{
                  m: 1,
                  width: "220px",
                  opacity:
                    currentBlock.conditions[index]?.condition === "" &&
                    condition.valueFormat !== "date"
                      ? 0.5
                      : 1,
                }}
                variant="outlined"
                disabled={currentBlock.conditions[index]?.condition === ""}
              >
                {getTemplateValueField(condition, index)}
              </FormControl>
              {/* Double value field if value is range */}
              {currentBlock.conditions[index]?.condition === "range" && (
                <div className={s.rangeHyphen}>—</div>
              )}
              {currentBlock.conditions[index]?.condition === "range" && (
                <FormControl
                  size="small"
                  sx={{ m: 1, width: "25ch" }}
                  variant="outlined"
                  disabled={currentBlock.conditions[index]?.condition === ""}
                >
                  <OutlinedInput
                    spellCheck={false}
                    id="outlined-adornment-weight"
                    value={
                      currentBlock.conditions[index]?.conditionSecondaryValue ||
                      ""
                    }
                    onChange={(e) =>
                      onElementConditionSecondaryValueChange(
                        e.target.value,
                        condition.valueFormat,
                        index
                      )
                    }
                    endAdornment={
                      <InputAdornment position="end">
                        {(() => {
                          switch (condition.valueFormat) {
                            case "money":
                              return "$";
                            case "string":
                              return "str";
                            case "integer":
                              return "123";
                            case "float":
                              return "1.23";
                            case "percentile":
                              return "%";
                            case "bool":
                              return "bool";
                            default:
                              return "";
                          }
                        })()}
                      </InputAdornment>
                    }
                    aria-describedby="outlined-weight-helper-text"
                    inputProps={{
                      "aria-label": "weight",
                    }}
                  />
                </FormControl>
              )}
              <IconButton
                key={shortid.generate()}
                aria-label="delete"
                size="small"
                onClick={() => removeTemplateFromConditions(index)}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
            </div>
          </Box>
        )
      )}

      <IconButton
        key={shortid.generate()}
        sx={{ position: "absolute", top: "5px", right: "5px" }}
        aria-label="delete"
        size="small"
        onClick={() => callRemoveItem()}
        onMouseLeave={() => setPendingRemove(false)}
      >
        {pendingRemove ? (
          <CheckIcon fontSize="small" />
        ) : (
          <DeleteIcon fontSize="small" />
        )}
      </IconButton>

      <Button
        variant="text"
        onClick={() => addNewSubBlock()}
        sx={{ width: "95%", height: "35px", marginTop: 2, fontSize: "12px" }}
      >
        + new block
      </Button>
    </div>
  );
}

export default SegmentItem_LogicBlock;
