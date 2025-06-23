import React, { useEffect, useRef, useState } from "react";
import s from "./css/segmentItem.module.css";
import InputBase from "@mui/material/InputBase";
import { DndProvider, useDrop } from "react-dnd";

import useApi from "@strix/api";

import { useBranch, useGame } from "@strix/gameContext";
import Button from "@mui/material/Button";
import LoadingButton from "@mui/lab/LoadingButton";
import ButtonGroup from "@mui/material/ButtonGroup";
import Box from "@mui/material/Box";
import TemplateItemDraggable from "./TemplateItemDraggable";
import { CustomDragLayer } from "./CustomDragLayer";

import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import ErrorIcon from "@mui/icons-material/Error";
import { red } from "@mui/material/colors";
import SaveIcon from "@mui/icons-material/Save";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Popover from "@mui/material/Popover";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import SegmentItem_LogicBlock from "./SegmentItem_LogicBlock";

import { useAlert } from "@strix/alertsContext";
import CheckIcon from "@mui/icons-material/Check";

import { customAlphabet } from "nanoid";
import { useTheme } from "@mui/material/styles";
const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);

const SegmentItem = ({
  segment,
  allSegments,
  templates,
  onRemove,
  isDragging,
  abTests,
  flows,
  modalBuilderMode,
  onConditionsChange,
}) => {
  const theme = useTheme();
  const { triggerAlert } = useAlert();
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const {
    setSegmentName,
    setSegmentComment,
    getAnalyticsEvent,
    setSegmentConditions,
    refreshSegmentPlayerCount,
    recalculateSegmentSize,
  } = useApi();
  const [currentSegment, setCurrentSegment] = useState(segment);
  const [shouldConsumeClick, setShouldConsumeClick] =
    useState(!modalBuilderMode); // true if default mode, false if we're from segment builder modal
  const [segmentName, setCurrentSegmentName] = useState(segment.segmentName);
  const [segmentComment, setCurrentSegmentComment] = useState(
    segment.segmentComment
  );
  const [isDefaultSegment, setIsDefaultSegment] = useState(
    segment.segmentID === "everyone"
  );
  const [selectedCategory, setSelectedCategory] = useState("analytics");
  const selectedCategoryRef = useRef(selectedCategory);
  selectedCategoryRef.current = selectedCategory;

  const [commentHidden, setCommentHidden] = useState(false);
  const [showCommentCollapse, setShowCommentCollapse] = useState(false);
  const [recalculatingSize, setRecalculatingSize] = useState(false);

  const [blockRecalcButton, setBlockRecalcButton] = useState(false);

  const [pendingRemove, setPendingRemove] = useState(false);
  const anchorEl = useRef(null);
  const [openLastRemovalAccept, setOpenLastRemovalAccept] = useState(false);

  // Needed to prevent user from recalculating segment size if there are no changes were made to it.
  // If a guy wants to refresh player counter, he should refresh the page
  const [segmentRecalculationBlock, setSegmentRecalculationBlock] =
    useState(false);

  useEffect(() => {
    setIsDefaultSegment(segment.segmentID === "everyone");
    setCurrentSegment(segment);
  }, [segment]);

  function onOpenEditor(e) {
    if (
      isDefaultSegment ||
      modalBuilderMode ||
      getIsAbTestSegment() ||
      getIsFlowSegment()
    )
      return;
    if (shouldConsumeClick) {
      setShouldConsumeClick(false);
      e.stopPropagation();
    }
  }
  function onCloseEditor() {
    setShouldConsumeClick(true);
  }
  async function onSegmentNameChange(e) {
    setCurrentSegmentName(e.target.value);
    const response = await setSegmentName({
      gameID: game.gameID,
      branch: branch,
      segmentID: currentSegment.segmentID,
      newName: e.target.value,
    });
  }
  async function onSegmentCommentChange(e) {
    setCurrentSegmentComment(e.target.value);
    const response = await setSegmentComment({
      gameID: game.gameID,
      branch: branch,
      segmentID: currentSegment.segmentID,
      newComment: e.target.value,
    });
  }
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: "node",
    drop: (item, monitor) => addTemplateToConditions(item, monitor),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  function addTemplateToConditions(template, dropVariables) {
    if (!dropVariables.canDrop()) return;
    let category = selectedCategoryRef.current;
    switch (category) {
      case "analytics":
        addTemplateAnalytics();
        break;
      case "liveops":
        addTemplateStatistics();
        break;
      default:
        break;
    }
    async function addTemplateStatistics() {
      setCurrentSegment((prevElement) => {
        let updatedArray = prevElement.segmentConditions;

        if (prevElement.segmentConditions.length > 0) {
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
          segmentConditions: updatedArray,
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

      setCurrentSegment((prevElement) => {
        let updatedArray = prevElement.segmentConditions;

        if (prevElement.segmentConditions.length > 0) {
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
            valueFormat: valueFormat,
            valueName: valueName,
            templateName: template.templateName,
            templateMethod: template.templateMethod,
          },
        ];

        return {
          ...prevElement,
          segmentConditions: updatedArray,
        };
      });
    }
  }

  const [segmentIsValidForSaving, setSegmentIsValidForSaving] = useState(true);
  const [savingInProcess, setSavingInProcess] = useState(false);

  function validateSegmentConditions(segment) {
    let failed = false;
    if (segment.segmentConditions.length === 0) return true;
    for (const condition of segment.segmentConditions) {
      if (condition.conditionOperator) {
        // Skip operators
        continue;
      }
      failed = traverse(condition);
      if (failed) {
        return false;
      }

      function traverse(condition) {
        if (condition.conditions.length === 0) return true;
        for (const subCondition of condition.conditions) {
          // console.log("Traversing subcondition", subCondition);
          if (subCondition.conditions) {
            // Sub-blocks
            // console.log("Sub-block", subCondition);
            return traverse(subCondition);
          } else {
            // Regular fields
            if (subCondition.conditionOperator) {
              // Skip operators
              continue;
            }
            if (
              subCondition.condition === "" &&
              subCondition.valueFormat !== "date"
            ) {
              // Check if condition is set. Dates have no conditions and are always treated as ranges (though their condition string is empty)
              return true;
            }
            if (subCondition.conditionValue === "") {
              // Check if value is set
              return true;
            }
            if (
              subCondition.conditionSecondaryValue === "" &&
              subCondition.condition === "range"
            ) {
              // If range, check if both values are set
              return true;
            }
          }
        }
        return false;
      }
    }
    return true;
  }

  const segmentPrevVersionRef = useRef(JSON.stringify(currentSegment));

  let saveTimer = null;

  async function saveSegment() {
    setSavingInProcess(true);

    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await setSegmentConditions({
        gameID: game.gameID,
        branch: branch,
        segmentID: currentSegment.segmentID,
        segmentConditions: currentSegment.segmentConditions,
      });
      setSavingInProcess(false);
      setSegmentRecalculationBlock(false);
    }, 1000);
  }

  useEffect(() => {
    if (segmentPrevVersionRef.current !== JSON.stringify(currentSegment)) {
      segmentPrevVersionRef.current = JSON.stringify(currentSegment);

      const isValid = validateSegmentConditions(currentSegment);
      setSegmentIsValidForSaving(isValid);
      if (modalBuilderMode) {
        onConditionsChange(currentSegment.segmentConditions, currentSegment);
      } else {
        if (isValid) {
          saveSegment();
        }
      }
    }

    // Block or unblock recalc button if there is something ever to recalc
    setBlockRecalcButton(currentSegment.segmentConditions.length === 0);
  }, [currentSegment]);

  const removeTemplateFromConditions = (indexToRemove) => {
    if (indexToRemove === 0) {
      setCurrentSegment((prevElement) => {
        if (prevElement.segmentConditions.length === 1) {
          // Clearing condition only in case if it is the only element in the array
          const updatedArrayWithoutCondition =
            prevElement.segmentConditions.filter(
              (_, index) => index !== indexToRemove
            );
          return {
            ...prevElement,
            segmentConditions: updatedArrayWithoutCondition,
          };
        } else {
          // Clearing operator first because it is higher
          const updatedArrayWithoutOperator =
            prevElement.segmentConditions.filter(
              (_, index) => index !== indexToRemove + 1
            );
          console.log(indexToRemove, prevElement);
          const updatedArrayWithoutCondition =
            updatedArrayWithoutOperator.filter(
              (_, index) => index !== indexToRemove
            );
          return {
            ...prevElement,
            segmentConditions: updatedArrayWithoutCondition,
          };
        }
      });
    } else {
      setCurrentSegment((prevElement) => {
        const updatedArrayWithoutCondition =
          prevElement.segmentConditions.filter(
            (_, index) => index !== indexToRemove
          );
        const updatedArrayWithoutOperator = updatedArrayWithoutCondition.filter(
          (_, index) => index !== indexToRemove - 1
        );
        return {
          ...prevElement,
          segmentConditions: updatedArrayWithoutOperator,
        };
      });
    }
  };
  function onChangeConditionOperator(e, index) {
    console.log("Changing operator", e.target.value, index, currentSegment);
    setCurrentSegment((prevElement) => ({
      ...currentSegment,
      segmentConditions: currentSegment.segmentConditions.map((condition, i) =>
        i === index
          ? {
              ...condition,
              conditionOperator: e.target.value,
            }
          : condition
      ),
    }));
  }

  const toggleCommentCollapse = () => {
    setCommentHidden(!commentHidden);
  };

  async function callRecalculateSegmentSize() {
    // setSegmentRecalculationBlock(true);

    setRecalculatingSize(true);

    try {
      const response = await recalculateSegmentSize({
        gameID: game.gameID,
        branch: branch,
        segmentID: currentSegment.segmentID,
      });
      if (response.success) {
        triggerAlert(response.message);
      }
      setRecalculatingSize(false);
    } catch (error) {
      setRecalculatingSize(false);
    }
    setRecalculatingSize(false);
  }

  function callRemoveItem(e) {
    // On first click
    if (!pendingRemove) {
      setPendingRemove(true);
    } else {
      // On accept click
      setOpenLastRemovalAccept(true);
    }
  }
  async function finalAccept() {
    // When user clicks on final popover accept
    onRemove(currentSegment.segmentID);
    handleClosePopover();
  }
  const handleClosePopover = () => {
    setOpenLastRemovalAccept(false);
  };

  function addNewBlock() {
    setCurrentSegment((prevElement) => {
      let updatedArray = prevElement.segmentConditions;

      if (prevElement.segmentConditions.length > 0) {
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
          sid: nanoid(),
        },
      ];
      return {
        ...prevElement,
        segmentConditions: updatedArray,
      };
    });
  }
  function saveBlock(block, index) {
    setCurrentSegment((prevElement) => {
      let updatedArray = prevElement.segmentConditions;
      updatedArray[index] = block;
      return {
        ...prevElement,
        segmentConditions: updatedArray,
      };
    });
  }

  function getIsAbTestSegment() {
    if (segment.segmentID.startsWith("abtest_")) {
      const testId = segment.segmentID.slice(7);
      return abTests.some((t) => t.id === testId);
    }
    return false;
  }
  function getAbTestSegmentName() {
    if (segment.segmentID.startsWith("abtest_")) {
      const testId = segment.segmentID.slice(7);
      return abTests.find((t) => t.id === testId).name;
    }
    return false;
  }
  function getIsFlowSegment() {
    if (segment.segmentID.startsWith("flow_")) {
      const flowSid = segment.segmentID.split("_")[1];
      return flows.some((flow) => flow.sid === flowSid);
    }
    return false;
  }
  function getIsFlowCaseSegment() {
    if (
      segment.segmentID.startsWith("flow_") &&
      segment.segmentID.includes("_splitTest_")
    ) {
      const flowSid = segment.segmentID.split("_")[1];
      return flows.some((flow) => flow.sid === flowSid);
    }
    return false;
  }
  function getFlowSegmentName() {
    if (segment.segmentID.startsWith("flow_")) {
      const flowSid = segment.segmentID.slice(5);
      let flowName = "";
      flows.map((flow) => {
        if (flow.sid === flowSid) {
          flowName = flow.sid === flowSid ? flow.name : null;
        }
      });
      return flowName;
    }
    return false;
  }

  return (
    <div
      className={`${s.relationContainer} ${!shouldConsumeClick ? s.relationContainerEnlarged : ""} ${isDefaultSegment && s.defaultSegmentContainer}`}
      style={modalBuilderMode ? { padding: 0, height: "440px" } : {}}
    >
      <div className={s.relationInnerContainer}>
        <div className={s.leftSide}>
          {!modalBuilderMode && (
            <div className={`${isDefaultSegment ? s.disabledName : s.name}`}>
              <InputBase
                fullWidth
                sx={{
                  maxWidth: "100%",
                  ml: 1,
                  flex: 0.5,
                }}
                placeholder="Segment name"
                onChange={(e) => {
                  if (!getIsAbTestSegment() && !getIsFlowSegment()) {
                    onSegmentNameChange(e);
                  }
                }}
                value={
                  getIsAbTestSegment()
                    ? getAbTestSegmentName()
                    : getIsFlowSegment() && !getIsFlowCaseSegment()
                      ? getFlowSegmentName()
                      : segmentName
                }
                disabled={
                  getIsAbTestSegment() || isDefaultSegment || getIsFlowSegment()
                }
              />
              <span className={s.playerCounter}>
                Players: {currentSegment.segmentPlayerCount || "0"}
                {/* {!isDefaultSegment &&
                  !getIsAbTestSegment() &&
                  !getIsFlowSegment() && (
                    <Tooltip
                      disableInteractive
                      title={"Recalculate segment's size for all players"}
                      placement="top"
                    >
                      <LoadingButton
                        sx={{ marginLeft: 4, minWidth: 20 }}
                        onClick={callRecalculateSegmentSize}
                        size="small"
                        loading={recalculatingSize}
                        loadingIndicator="Loading…"
                        variant="text"
                        disabled={
                          segmentRecalculationBlock || blockRecalcButton
                        }
                      >
                        <RefreshIcon />
                      </LoadingButton>
                    </Tooltip>
                  )} */}
              </span>
              {!isDefaultSegment &&
                !shouldConsumeClick &&
                !getIsAbTestSegment() &&
                !getIsFlowSegment() && (
                  <div className={s.saveContainer}>
                    {savingInProcess ? (
                      <CircularProgress size={20} color="success" />
                    ) : segmentIsValidForSaving ? (
                      <Tooltip
                        title={
                          <Typography fontSize={15}>
                            Segment is saved
                          </Typography>
                        }
                      >
                        <SaveIcon color="success" />
                      </Tooltip>
                    ) : (
                      <Tooltip
                        title={
                          <Typography fontSize={15}>
                            Segment can't be saved if there are unfilled
                            conditions. Fill all inputs or remove unnecessary
                            conditions to save segment
                          </Typography>
                        }
                      >
                        <ErrorIcon sx={{ color: red[400] }} />
                      </Tooltip>
                    )}
                  </div>
                )}
              {!isDefaultSegment &&
                !getIsAbTestSegment() &&
                !getIsFlowSegment() && (
                  <div className={`${s.removeButton}`} ref={anchorEl}>
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
          )}
          <div className={s.bodyContainer}>
            <div
              className={`${s.container} ${shouldConsumeClick ? s.pointerCursor : ""}`}
              onClick={onOpenEditor}
            >
              {/* Making another nested container here, otherwise it will
                       calculate wrong height */}
              <div
                className={`${s.svgContainer} ${shouldConsumeClick ? s.preventClick : ""}`}
              >
                {/* Set either placeholder or actual info depending on if its "Everyone" segment */}
                {isDefaultSegment ? (
                  // Everyone segment
                  <div className={s.segmentInnerBodyPreview}>
                    <div className={s.defaultSegmentPlaceholder}>
                      Default segment which includes all players
                    </div>
                  </div>
                ) : getIsAbTestSegment() ? (
                  // AB test segment
                  <div className={s.segmentInnerBodyPreview}>
                    <div className={s.defaultSegmentPlaceholder}>
                      Auto-created A/B testing group segment
                    </div>
                  </div>
                ) : getIsFlowSegment() ? (
                  // Flow segment
                  <div className={s.segmentInnerBodyPreview}>
                    <div className={s.defaultSegmentPlaceholder}>
                      Auto-created flow audience segment
                    </div>
                  </div>
                ) : segment.isStaticSegment ? (
                  // Static segment
                  <div className={s.segmentInnerBodyPreview}>
                    <div className={s.defaultSegmentPlaceholder}>
                      Static segment
                    </div>
                  </div>
                ) : (
                  // Other segments
                  <div className={`${s.segmentInnerBody}`}>
                    <div
                      className={`${s.conditionViewContainer} ${shouldConsumeClick ? s.notExpanded : ""}`}
                      // ref={drop}
                    >
                      <div className={s.conditionList}>
                        {currentSegment.segmentConditions.map((block, index) =>
                          block.conditionOperator === "and" ||
                          block.conditionOperator === "or" ? (
                            <div
                              key={block.sid}
                              className={s.operatorContainer}
                            >
                              <Box sx={{ p: 0 }}>
                                <FormControl
                                  size="small"
                                  sx={{ m: 1, minWidth: "100px" }}
                                >
                                  <Select
                                    value={
                                      currentSegment.segmentConditions[index]
                                        ?.conditionOperator || ""
                                    }
                                    onChange={(e) =>
                                      onChangeConditionOperator(e, index)
                                    }
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
                            <SegmentItem_LogicBlock
                              key={block.sid}
                              block={block}
                              index={index}
                              allSegments={allSegments}
                              isDragging={isDragging}
                              onBlockChange={saveBlock}
                              onBlockRemove={removeTemplateFromConditions}
                              templates={templates}
                            />
                          )
                        )}

                        {!shouldConsumeClick && (
                          <Button
                            onClick={() => addNewBlock()}
                            sx={{ width: "95%", height: "35px", marginTop: 2 }}
                          >
                            + new block
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {!shouldConsumeClick && !modalBuilderMode && (
            <div
              onClick={onCloseEditor}
              className={`${s.collapseContainer} ${shouldConsumeClick ? "" : s.collapseEnabled}`}
            >
              Collapse
            </div>
          )}
        </div>

        {!isDefaultSegment && !modalBuilderMode && (
          <div
            className={`${s.rightSide} ${commentHidden ? s.rightSideCollapsed : ""}`}
          >
            <div
              className={`${s.comment}`}
              onMouseEnter={() => setShowCommentCollapse(true)}
              onMouseLeave={() => setShowCommentCollapse(false)}
            >
              <textarea
                name="comment"
                style={{ color: theme.palette.text.primary }}
                className={`${s.commentTextArea} ${commentHidden ? s.commentTextAreaHidden : ""}`}
                onChange={onSegmentCommentChange}
                value={segmentComment}
              ></textarea>

              {
                // (showCommentCollapse || commentHidden)
                true && (
                  <div
                    className={s.commentCollapseInner}
                    onClick={toggleCommentCollapse}
                  >
                    {commentHidden ? (
                      <ExpandLess
                        htmlColor={"#e7e7e7"}
                        sx={{ transform: "rotate(-90deg)" }}
                      />
                    ) : (
                      <ExpandLess
                        htmlColor={"#e7e7e7"}
                        sx={{ transform: "rotate(90deg)" }}
                      />
                    )}
                  </div>
                )
              }
            </div>
          </div>
        )}
      </div>
      <Popover
        id={segment.segmentID}
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
              p: 2,
              overflow: "visible",
            },
          },
        }}
      >
        <Typography sx={{ mb: 1 }}>
          Are you sure you want to delete this segment? <br />
          This action cannot be undone.
        </Typography>
        <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
          <Button sx={{ color: "error.primary" }} onClick={finalAccept}>
            Delete
          </Button>
          <Button
            variant="contained"
            sx={{ ml: "auto" }}
            onClick={handleClosePopover}
          >
            Cancel
          </Button>
        </div>
      </Popover>
    </div>
  );
};

export default SegmentItem;
