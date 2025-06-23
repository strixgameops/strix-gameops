import React, { useState, useEffect, useRef } from "react";
import s from "./portableSegmentBuilder.module.css";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";

import { Box } from "@mui/material";
import ButtonGroup from "@mui/material/ButtonGroup";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import TextField from "@mui/material/TextField";
import DistributionChartWithHighlights from "./DistributionChartWithHighlights.jsx";
import TemplateItemDraggable from "./TemplateItemDraggable";
import { CustomDragLayer } from "./CustomDragLayer";
import { Tooltip } from "@mui/material";
import { DndProvider, useDrop } from "react-dnd";

import ManageSearchSharpIcon from "@mui/icons-material/ManageSearchSharp";
import LeaderboardSharpIcon from "@mui/icons-material/LeaderboardSharp";
import BackpackIcon from "./backpack.svg?react";
import GroupAddSharpIcon from "@mui/icons-material/GroupAddSharp";

import LoadingButton from "@mui/lab/LoadingButton";
import SearchWrapper from "shared/searchFramework/SearchWrapper.jsx";

import SegmentItem from "../../pages/analytics/segmentation/SegmentItem.jsx";
import { useAlert } from "@strix/alertsContext";

import shortid from "shortid";
import useApi from "@strix/api";
import SelectableElementItem from "./SelectableElementItem.jsx";
import { useBranch, useGame } from "@strix/gameContext";
import GroupsIcon from "@mui/icons-material/Groups";
import { uniq } from "lodash";

import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);

function PortableSegmentBuilder({
  profiles,
  open,
  close,
  selectedClientIDs = [],
}) {
  const {
    getAllSegments,
    getTemplatesForSegments,
    createNewSegment,
    getAnalyticsEvents,
    setSegmentName,
    setSegmentConditions,
    recalculateSegmentSize,
    buildStaticSegmentFromClientIDs,
  } = useApi();
  const { triggerAlert } = useAlert();

  const { game } = useGame();
  const { branch, environment } = useBranch();
  const [templateList, setTemplateList] = useState();
  const [segments, setSegments] = useState();

  const [mergedProfiles, setMergedProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState({});

  const [currentConditions, setCurrentConditions] = useState([]);
  const [shouldConsumeClick, setShouldConsumeClick] = useState(true);
  const [segmentName, setCurrentSegmentName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("analytics");
  const selectedCategoryRef = useRef(selectedCategory);
  selectedCategoryRef.current = selectedCategory;
  const [isDragging, setIsDragging] = useState(false);

  const [isCollapsingNumbers, setIsCollapsingNumbers] = useState(false);
  const [collapseNumbersFactor, setCollapseNumbersFactor] = useState(5);

  const [filteredTemplateList_stat, setFilteredTemplateList_stat] = useState(
    []
  );
  const [filteredTemplateList_an, setFilteredTemplateList_an] = useState([]);
  const [filteredTemplateList_inv, setFilteredTemplateList_inv] = useState([]);

  const [currentSegment, setCurrentSegment] = useState({
    segmentID: "someid",
    segmentName: "some name",
    segmentComment: "some comment",
    segmentConditions: [],
    segmentPlayerCount: 100000,
    usedTemplateIDs: [],
  });

  function onDragStateChange(newState) {
    setIsDragging(newState);
  }

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "90%",
    height: "95%",
    bgcolor: "var(--bg-color3)",
    border: "1px solid #625FF440",
    boxShadow: `0px 0px 5px 2px rgba(98, 95, 244, 0.2)`,
    overflow: "hidden",

    borderRadius: "2rem",

    display: "flex",
    flexDirection: "column",
  };

  useEffect(() => {
    if (!profiles) return;
    let tempProfiles = [];
    profiles.forEach((p) => {
      p.forEach((element) => {
        if (
          tempProfiles.some((prof) => prof.templateID === element.templateID)
        ) {
          tempProfiles = tempProfiles.map((item) => {
            if (item.templateID === element.templateID) {
              item = mergeElements(element, item);
            }
            return item;
          });
        } else {
          tempProfiles.push(element);
        }
      });
    });
    setMergedProfiles(tempProfiles);
    if (tempProfiles.length > 1) {
      setSelectedProfile(tempProfiles[0]);
    }
    function mergeElements(obj1, obj2) {
      //  Map   subProfiles
      const subProfileMap = new Map();

      //    subProfiles  Map
      function addSubProfiles(subProfiles) {
        subProfiles.forEach((sub) => {
          if (subProfileMap.has(sub.value)) {
            subProfileMap.set(
              sub.value,
              subProfileMap.get(sub.value) + sub.players
            );
          } else {
            subProfileMap.set(sub.value, sub.players);
          }
        });
      }

      //  subProfiles
      addSubProfiles(obj1.subProfiles);
      addSubProfiles(obj2.subProfiles);

      //    `value`
      addSubProfiles([{ value: obj1.value, players: obj1.players }]);
      addSubProfiles([{ value: obj2.value, players: obj2.players }]);

      //  Map    subProfiles
      const mergedSubProfiles = Array.from(
        subProfileMap,
        ([value, players]) => ({ value, players })
      );

      //    value (   )
      const mainValue = mergedSubProfiles.reduce(
        (prev, current) => (current.players > prev.players ? current : prev),
        { players: 0 }
      );

      //   value  subProfiles,
      const filteredSubProfiles = mergedSubProfiles.filter(
        (sub) => sub.value !== mainValue.value
      );

      //
      return {
        name: obj1.name, // ,
        value: mainValue.value,
        templateID: obj1.templateID, // ,  templateID
        players: mainValue.players,
        subProfiles: filteredSubProfiles,
      };
    }
    if (!open) {
      setCurrentConditions([]);
    }
  }, [open, profiles]);

  useEffect(() => {
    let templates;
    const getTemplatesList = async () => {
      const response = await getTemplatesForSegments({
        gameID: game.gameID,
        branch: branch,
      });

      if (response.success) {
        // Analytics templates
        // Assing valueFormats to analytics templates
        const templateAnalyticEventIDs = response.templates.analytics
          .map((template) => template.templateAnalyticEventID)
          .filter(Boolean);
        let events = [];
        if (templateAnalyticEventIDs.length > 0) {
          events = await getAnalyticsEvents({
            gameID: game.gameID,
            branch: branch,
            eventIDs: templateAnalyticEventIDs,
          });
          if (events.success) {
            events = events.events;
          }
        }

        templates = response.templates;
        const updatedTemplates = response.templates.analytics.map(
          (template) => {
            //
            const matchingEvent = events.find(
              (event) => event.eventID === template.templateAnalyticEventID
            );

            if (matchingEvent) {
              //      templateEventTargetValueId
              const matchingValue = matchingEvent.values.find(
                (value) =>
                  value.uniqueID === template.templateEventTargetValueId
              );

              if (matchingValue) {
                //  valueFormat
                template.valueFormat = matchingValue.valueFormat;
              }
            }

            return template;
          }
        );
        templates.analytics = updatedTemplates;
        templates.segmentation = [
          {
            templateID: "inSegment",
            templateName: "In segment",
            templateType: "segment",
          },
          {
            templateID: "notInSegment",
            templateName: "Not in segment",
            templateType: "segment",
          },
        ];
        setTemplateList(templates);
      } else {
        setTemplateList();
      }
    };
    getTemplatesList();

    async function getSegments() {
      const response = await getAllSegments({
        gameID: game.gameID,
        branch: branch,
      });
      if (response.success) {
        setSegments(response.segments);
      }
    }
    getSegments();
  }, []);

  const [processedChartData, setProcessedChartData] = useState([]);
  const [filteredChartData, setFilteredChartData] = useState([]);

  useEffect(() => {
    // console.log(
    //   "Current conditions",
    //   currentConditions,
    //   selectedProfile,
    //   processedChartData
    // );

    let selectedData = [];
    function recursivelyGetAffectedValues(conditions) {
      conditions.forEach((conds) => {
        if (conds.conditionElementID === selectedProfile.templateID) {
          processedChartData.forEach((i) => {
            if (checkCondition(conds, i)) {
              selectedData.push(i);
            }
          });
        }
        if (conds.conditions) {
          recursivelyGetAffectedValues(conds.conditions);
        }
      });
      // console.log("Result selected data:", selectedData);
    }
    setFilteredChartData(selectedData);
    recursivelyGetAffectedValues(currentConditions);
    function checkCondition(condition, valueToCheck) {
      let conditionalValue = condition.conditionValue;
      let conditionalSecondaryValue = condition.conditionSecondaryValue;
      switch (condition.condition) {
        // Int/floats only
        case "=":
          valueToCheck = parseFloat(valueToCheck);
          conditionalValue = parseFloat(conditionalValue);
          if (conditionalValue === valueToCheck) {
            return true;
          } else {
            return false;
          }
          break;

        case "!=":
          valueToCheck = parseFloat(valueToCheck);
          conditionalValue = parseFloat(conditionalValue);
          if (conditionalValue !== valueToCheck) {
            return true;
          } else {
            return false;
          }
          break;

        case ">":
          valueToCheck = parseFloat(valueToCheck);
          conditionalValue = parseFloat(conditionalValue);
          if (valueToCheck > conditionalValue) {
            return true;
          } else {
            return false;
          }
          break;

        case "<":
          valueToCheck = parseFloat(valueToCheck);
          conditionalValue = parseFloat(conditionalValue);
          if (valueToCheck < conditionalValue) {
            return true;
          } else {
            return false;
          }
          break;

        case ">=":
          valueToCheck = parseFloat(valueToCheck);
          conditionalValue = parseFloat(conditionalValue);
          if (valueToCheck >= conditionalValue) {
            return true;
          } else {
            return false;
          }
          break;

        case "<=":
          valueToCheck = parseFloat(valueToCheck);
          conditionalValue = parseFloat(conditionalValue);
          if (valueToCheck <= conditionalValue) {
            return true;
          } else {
            return false;
          }
          break;

        case "range":
          valueToCheck = parseFloat(valueToCheck);
          conditionalValue = parseFloat(conditionalValue);
          if (
            valueToCheck >= conditionalValue &&
            valueToCheck <= conditionalSecondaryValue
          ) {
            return true;
          } else {
            return false;
          }
          break;

        // String only
        case "is":
          valueToCheck = valueToCheck.toString().toLowerCase();
          conditionalValue = conditionalValue.toString().toLowerCase();
          if (valueToCheck === conditionalValue) {
            return true;
          } else {
            return false;
          }
          break;

        // Array only (least/mostCommon template method values)
        case "includes":
          if (valueToCheck.toString().includes(conditionalValue)) {
            return true;
          } else {
            return false;
          }
          break;

        case "notIncludes":
          if (!valueToCheck.toString().includes(conditionalValue)) {
            return true;
          } else {
            return false;
          }
          break;

        case "isNot":
          valueToCheck = valueToCheck.toString();
          conditionalValue = conditionalValue.toString();
          if (valueToCheck !== conditionalValue) {
            return true;
          } else {
            return false;
          }
          break;

        case "date":
          if (
            new Date(valueToCheck) >= new Date(conditionalValue) &&
            new Date(valueToCheck) <= new Date(conditionalSecondaryValue)
          ) {
            return true;
          } else {
            return false;
          }
          break;

        default:
          break;
      }
    }
  }, [currentConditions, selectedProfile, processedChartData]);

  const [isSavingSegment, setIsSavingSegment] = useState(false);
  async function saveSegment() {
    setIsSavingSegment(true);
    const response = await createNewSegment({
      gameID: game.gameID,
      branch: branch,
    });
    if (response.success) {
      const newSegment = response.segments[response.segments.length - 1];
      const response2 = await setSegmentName({
        gameID: game.gameID,
        branch: branch,
        segmentID: newSegment.segmentID,
        newName: currentSegment.segmentName,
      });
      const response3 = await setSegmentConditions({
        gameID: game.gameID,
        branch: branch,
        segmentID: newSegment.segmentID,
        segmentConditions: currentConditions,
      });
      try {
        const response4 = await recalculateSegmentSize({
          gameID: game.gameID,
          branch: branch,
          environment: environment,
          segmentID: newSegment.segmentID,
        });
      } catch (error) {
        // dont do anything
      }
      triggerAlert(
        `Segment was saved successfully! You can view it in "Segmentation"`
      );
    }
    setIsSavingSegment(false);
    close();
  }
  async function saveSegmentStatic() {
    setIsSavingSegment(true);
    const response = await buildStaticSegmentFromClientIDs({
      gameID: game.gameID,
      branch: branch,
      environment: environment,
      newSegmentName: currentSegment.segmentName,
      clientIDs: selectedClientIDs,
    });
    if (response.success) {
      triggerAlert(
        `Segment was saved successfully! You can view it in "Segmentation"`
      );
    }
    setIsSavingSegment(false);
    close();
  }

  function selectAllCurrentProfile() {
    let newConditions;
    if (processedChartData.every((d) => !isNaN(d))) {
      newConditions = [
        {
          conditions: [
            {
              conditionElementID: selectedProfile.templateID,
              condition: "range",
              conditionValue: processedChartData[0],
              conditionSecondaryValue:
                processedChartData[processedChartData.length - 1],
              valueFormat: "float",
              templateName: selectedProfile.name,
            },
          ],
        },
      ];
    } else if (
      processedChartData.length === 2 &&
      processedChartData[0] === "True" &&
      processedChartData[1] === "False"
    ) {
      newConditions = [
        {
          conditions: [
            {
              conditionElementID: selectedProfile.templateID,
              condition: "is",
              conditionValue: "true",
              conditionSecondaryValue: undefined,
              valueFormat: "bool",
              templateName: selectedProfile.name,
            },
            {
              conditionOperator: "or",
            },
            {
              conditionElementID: selectedProfile.templateID,
              condition: "is",
              conditionValue: "false",
              conditionSecondaryValue: undefined,
              valueFormat: "bool",
              templateName: selectedProfile.name,
            },
          ],
        },
      ];
    } else if (
      processedChartData.every(
        (d) => new Date(d) instanceof Date && !isNaN(new Date(d).getTime())
      )
    ) {
      function findMinMaxDates(datesArray) {
        if (datesArray.length === 0) {
          return { minDate: null, maxDate: null };
        }

        return datesArray.reduce(
          (acc, date) => {
            const currentDate = new Date(date);

            if (currentDate < acc.minDate) {
              acc.minDate = currentDate;
            }

            if (currentDate > acc.maxDate) {
              acc.maxDate = currentDate;
            }

            return acc;
          },
          {
            minDate: new Date(datesArray[0]),
            maxDate: new Date(datesArray[0]),
          }
        );
      }

      const { minDate, maxDate } = findMinMaxDates(processedChartData);
      // console.log("Target minmax dates:", minDate, maxDate);
      newConditions = [
        {
          conditions: [
            {
              conditionElementID: selectedProfile.templateID,
              condition: "date",
              conditionValue: minDate.toISOString(),
              conditionSecondaryValue: maxDate.toISOString(),
              valueFormat: "date",
              templateName: selectedProfile.name,
            },
          ],
        },
      ];
    } else {
      newConditions = [
        {
          conditions: processedChartData.map((d) => {
            return {
              conditionElementID: selectedProfile.templateID,
              condition: "is",
              conditionValue: d,
              conditionSecondaryValue: undefined,
              valueFormat: "string",
              templateName: selectedProfile.name,
            };
          }),
        },
      ];

      newConditions[0].conditions = newConditions[0].conditions.reduce(
        (acc, condition, index) => {
          if (index > 0) {
            acc.push({ conditionOperator: "or" });
          }
          acc.push(condition);
          return acc;
        },
        []
      );
    }

    if (currentSegment.segmentConditions.length > 0) {
      newConditions = [{ conditionOperator: "or" }, ...newConditions];
    }
    let newCurrentSegment = {
      ...currentSegment,
      segmentConditions: [
        ...currentSegment.segmentConditions,
        ...newConditions,
      ],
    };
    // setCurrentConditions([...currentConditions, ...newConditions])
    setCurrentSegment({ ...newCurrentSegment });
  }

  const [resetKey, setResetKey] = useState("");
  useEffect(() => {
    setResetKey(shortid());
  }, []);
  return (
    <Modal
      key={resetKey}
      open={open}
      onClose={() => close()}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <Box
          sx={{
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "thin",
            p: 4,
          }}
        >
          <Typography
            sx={{ mb: 4 }}
            id="modal-modal-title"
            variant="h6"
            component="h2"
          >
            Segment builder for selected audience
          </Typography>

          <Box
            sx={{
              display: "flex",
              mb: 1,
              alignContent: "center",
              justifyContent: "space-between",
            }}
          >
            <TextField
              sx={{ m: 2, ml: 0, mb: 4, width: "30%" }}
              size="small"
              spellCheck={false}
              id="modal-modal-title"
              value={segmentName}
              onChange={(e) => {
                setCurrentSegmentName(e.target.value);
                setCurrentSegment({
                  ...currentSegment,
                  segmentName: e.target.value,
                });
              }}
              label="New segment name"
              variant="outlined"
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <Tooltip
                title="Save all selected audience into static segment. Please note that static segment cannot have any conditions"
                disableInteractive
              >
                <LoadingButton
                  disabled={
                    !selectedClientIDs || selectedClientIDs.length === 0
                  }
                  onClick={() => {
                    saveSegmentStatic();
                  }}
                  loading={isSavingSegment}
                  variant="contained"
                  sx={{ height: "45px" }}
                >
                  Save as static ({selectedClientIDs.length} players)
                </LoadingButton>
              </Tooltip>
              <LoadingButton
                onClick={() => {
                  saveSegment();
                }}
                loading={isSavingSegment}
                variant="contained"
                sx={{ height: "45px" }}
              >
                Save segment
              </LoadingButton>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              mb: 2,
              border: "1px solid #2a2964",
              borderRadius: "2rem",
              overflow: "hidden",
              p: 1,
              backgroundColor: "var(--bg-color3)",
            }}
          >
            <DistributionChartWithHighlights
              onCollapseEnabled={(enabled) => setIsCollapsingNumbers(enabled)}
              onCollapseValueChange={(v) => setCollapseNumbersFactor(v)}
              data={[
                {
                  value: selectedProfile.value,
                  players: selectedProfile.players,
                },
                ...(selectedProfile?.subProfiles || []),
              ]}
              selectedData={filteredChartData}
              valueName={selectedProfile.name}
              onDataProcessed={(data) =>
                setProcessedChartData(JSON.parse(JSON.stringify(data)))
              }
              chartHeader={
                <Button
                  onClick={() => selectAllCurrentProfile()}
                  variant="outlined"
                  sx={{ height: "35px", m: 1, ml: 5 }}
                >
                  Select all
                </Button>
              }
            />

            <Box className={s.avgProfileTable}>
              {mergedProfiles.map((profile) => (
                <SelectableElementItem
                  isSelected={profile.templateID === selectedProfile.templateID}
                  colored={true}
                  scaleMin={0}
                  scaleMax={20}
                  profile={profile}
                  key={profile.templateID}
                  onSelect={(p) => {
                    if (p.templateID === selectedProfile.templateID) {
                      setSelectedProfile({});
                    } else {
                      setSelectedProfile(p);
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          <div className={s.builderContainer}>
            <CustomDragLayer />
            <div className={s.templatesContainer}>
              <div className={s.upperbarButtons}>
                <Tooltip title="Analytics">
                  <Button
                    sx={{
                      width: selectedCategory === "analytics" ? "100%" : "0%",
                      minWidth: "35px",
                      p: "0.3rem 0px",
                      transition: "all 0.3s",
                    }}
                    variant={
                      selectedCategory === "analytics"
                        ? "contained"
                        : "outlined"
                    }
                    onClick={() => setSelectedCategory("analytics")}
                  >
                    {selectedCategory === "analytics" ? (
                      "Analytics"
                    ) : (
                      <ManageSearchSharpIcon />
                    )}
                  </Button>
                </Tooltip>

                <Tooltip title="Statistics">
                  <Button
                    sx={{
                      minWidth: "35px",
                      width: selectedCategory === "liveops" ? "100%" : "0%",
                      p: "0.3rem 0px",
                      transition: "all 0.3s",
                    }}
                    variant={
                      selectedCategory === "liveops" ? "contained" : "outlined"
                    }
                    onClick={() => setSelectedCategory("liveops")}
                  >
                    {selectedCategory === "liveops" ? (
                      "Statistics"
                    ) : (
                      <LeaderboardSharpIcon />
                    )}
                  </Button>
                </Tooltip>

                <Tooltip title="Inventory">
                  <Button
                    sx={{
                      minWidth: "35px",
                      width: selectedCategory === "inventory" ? "100%" : "0%",
                      p: "0.3rem 0px",
                      transition: "all 0.3s",
                    }}
                    variant={
                      selectedCategory === "inventory"
                        ? "contained"
                        : "outlined"
                    }
                    onClick={() => setSelectedCategory("inventory")}
                  >
                    {selectedCategory === "inventory" ? (
                      "Inventory"
                    ) : (
                      <BackpackIcon />
                    )}
                  </Button>
                </Tooltip>

                <Tooltip title="Segmentation" disableInteractive>
                  <Button
                    sx={{
                      minWidth: "35px",
                      width:
                        selectedCategory === "segmentation" ? "100%" : "0%",
                      p: "0.3rem 0px",
                      transition: "all 0.3s",
                    }}
                    variant={
                      selectedCategory === "segmentation"
                        ? "contained"
                        : "outlined"
                    }
                    onClick={() => setSelectedCategory("segmentation")}
                  >
                    {selectedCategory === "segmentation" ? (
                      "Segmentation"
                    ) : (
                      <GroupsIcon />
                    )}
                  </Button>
                </Tooltip>

                {/* <Tooltip title="UA">
                  <Button
                    disabled
                    sx={{
                      minWidth: "35px",
                      width: selectedCategory === "ua" ? "100%" : "0%",
                      p: "0.3rem 0px",
                      borderRight: "none",
                      transition: "all 0.3s",
                      "&:hover": {
                        borderRight: "none",
                      },
                    }}
                    variant={
                      selectedCategory === "ua" ? "contained" : "outlined"
                    }
                    onClick={() => setSelectedCategory("ua")}
                  >
                    {selectedCategory === "ua" ? "UA" : <GroupAddSharpIcon />}
                  </Button>
                </Tooltip> */}
              </div>
              <div className={s.templatesList}>
                {selectedCategory === "analytics" && (
                  <SearchWrapper
                    itemsToFilter={templateList?.analytics || []}
                    segmentsEnabled={false}
                    tagsEnabled={false}
                    nameEnabled={true}
                    possibleTags={[]}
                    possibleSegments={[]}
                    nameMatcher={(item, name) => {
                      return (
                        item.templateName.toLowerCase().indexOf(name) !== -1
                      );
                    }}
                    onItemsFiltered={(filtered) => {
                      setFilteredTemplateList_an(filtered);
                    }}
                  />
                )}
                {filteredTemplateList_an &&
                  selectedCategory === "analytics" &&
                  filteredTemplateList_an &&
                  filteredTemplateList_an.length > 0 &&
                  filteredTemplateList_an.map((template, index) => (
                    <TemplateItemDraggable
                      type="analytics"
                      onDragStateChange={onDragStateChange}
                      key={index}
                      template={template}
                    />
                  ))}

                {selectedCategory === "liveops" && (
                  <SearchWrapper
                    itemsToFilter={templateList?.statistics || []}
                    segmentsEnabled={false}
                    tagsEnabled={false}
                    nameEnabled={true}
                    possibleTags={[]}
                    possibleSegments={[]}
                    nameMatcher={(item, name) => {
                      return (
                        item.templateName.toLowerCase().indexOf(name) !== -1
                      );
                    }}
                    onItemsFiltered={(filtered) => {
                      setFilteredTemplateList_stat(filtered);
                    }}
                  />
                )}
                {filteredTemplateList_stat &&
                  selectedCategory === "liveops" &&
                  filteredTemplateList_stat &&
                  filteredTemplateList_stat.length > 0 &&
                  filteredTemplateList_stat.map((template, index) => (
                    <TemplateItemDraggable
                      type="statistics"
                      onDragStateChange={onDragStateChange}
                      key={index}
                      template={template}
                    />
                  ))}

                {selectedCategory === "inventory" && (
                  <SearchWrapper
                    itemsToFilter={templateList?.inventory || []}
                    segmentsEnabled={false}
                    tagsEnabled={false}
                    nameEnabled={true}
                    possibleTags={[]}
                    possibleSegments={[]}
                    nameMatcher={(item, name) => {
                      return (
                        item.templateName.toLowerCase().indexOf(name) !== -1
                      );
                    }}
                    onItemsFiltered={(filtered) => {
                      setFilteredTemplateList_inv(filtered);
                    }}
                    groupsEnabled={true}
                    possibleGroups={uniq(
                      templateList?.inventory.map((i) => i.groupName) || []
                    ).filter(Boolean)}
                    groupMatcher={(item, groups) => {
                      if (!item.groupName) return false;
                      return groups.includes(item.groupName);
                    }}
                  />
                )}
                {filteredTemplateList_inv &&
                  selectedCategory === "inventory" &&
                  filteredTemplateList_inv &&
                  filteredTemplateList_inv.length > 0 &&
                  filteredTemplateList_inv.map((template, index) => (
                    <TemplateItemDraggable
                      type="inventory"
                      onDragStateChange={onDragStateChange}
                      key={index}
                      template={template}
                    />
                  ))}

                {templateList?.segmentation &&
                  selectedCategory === "segmentation" &&
                  templateList.segmentation &&
                  templateList.segmentation.length > 0 &&
                  templateList.segmentation.map((template, index) => (
                    <TemplateItemDraggable
                      type="segmentation"
                      onDragStateChange={onDragStateChange}
                      key={index}
                      template={template}
                    />
                  ))}
              </div>
            </div>
            <SegmentItem
              key={"currentSegment.segmentID"}
              segment={currentSegment}
              isDragging={isDragging}
              allSegments={segments}
              templates={templateList}
              onRemove={() => {}}
              abTests={[]}
              modalBuilderMode={true}
              onConditionsChange={(conds, segment) => {
                setCurrentConditions(JSON.parse(JSON.stringify(conds)));
                setCurrentSegment({ ...segment, segmentConditions: conds });
              }}
            />
          </div>
        </Box>
      </Box>
    </Modal>
  );
}

export default PortableSegmentBuilder;
