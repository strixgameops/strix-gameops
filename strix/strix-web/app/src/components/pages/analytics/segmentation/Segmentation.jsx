import React, { useEffect, useState } from "react";
import Navbar from "../../navbar/Navbar";
import useApi from "@strix/api";

import { useBranch, useGame } from "@strix/gameContext";
import SegmentItem from "./SegmentItem";
import s from "./css/segmentation.module.css";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";

import { Helmet } from "react-helmet";
import titles from "titles";

import ManageSearchSharpIcon from "@mui/icons-material/ManageSearchSharp";
import LeaderboardSharpIcon from "@mui/icons-material/LeaderboardSharp";
import BackpackIcon from "./backpack.svg?react";
import GroupAddSharpIcon from "@mui/icons-material/GroupAddSharp";
import { Tooltip, Typography } from "@mui/material";

import { DndProvider, useDrop } from "react-dnd";
import TemplateItemDraggable from "./TemplateItemDraggable";
import { CustomDragLayer } from "./CustomDragLayer";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import SearchWrapper from "shared/searchFramework/SearchWrapper.jsx";
import { uniq } from "lodash";
import GroupsIcon from "@mui/icons-material/Groups";
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);

const Segmentation = () => {
  const { game } = useGame();
  const theme = useTheme();
  const { branch, environment } = useBranch();
  const {
    getAllSegments,
    createNewSegment,
    countPlayersInWarehouse,
    getTemplatesForSegments,
    getAnalyticsEvents,
    removeSegmentByID,
    getABTestsShort,
    getFlowsShort,
  } = useApi();
  const [segments, setSegments] = useState([]);
  const [playersCount, setPlayersCount] = useState("");
  const [templateList, setTemplateList] = useState();
  const [abTests, setAbTests] = useState([]);
  const [flows, setFlows] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [filteredSegments, setFilteredSegments] = useState([]);
  const [filteredTemplateList_stat, setFilteredTemplateList_stat] = useState(
    []
  );
  const [filteredTemplateList_an, setFilteredTemplateList_an] = useState([]);
  const [filteredTemplateList_inv, setFilteredTemplateList_inv] = useState([]);
  async function fetchData() {
    // const getPlayersCount = async () => {
    //   const response = await countPlayersInWarehouse({
    //     gameID: game.gameID,
    //     branch: branch,
    //   });
    //   if (response.success) {
    //     setPlayersCount(response.playerCount);
    //   } else {
    //     setPlayersCount("N/A");
    //   }
    // };
    // getPlayersCount();

    setIsLoadingData(true);

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
              // Get value from event using templateEventTargetValueId
              const matchingValue = matchingEvent.values.find(
                (value) =>
                  value.uniqueID === template.templateEventTargetValueId
              );

              if (matchingValue) {
                // Update valueFormat in template
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
        setTemplateList("N/A");
      }
    };
    await getTemplatesList();

    const getSegments = async () => {
      const response = await getAllSegments({
        gameID: game.gameID,
        branch: branch,
      });

      let segments = response.segments;
      // Getting templates from the segment
      const findTemplateById = (templateId, templateArray) => {
        const arr = []
          .concat(templateArray.statistics)
          .concat(templateArray.inventory)
          .concat(templateArray.analytics)
          .concat(templateArray.segmentation);
        return arr.find((template) => template.templateID === templateId);
      };

      // Put info about existing templates in the segment
      const addFieldsToCondition = (condition, template) => {
        condition.templateName = template.templateName;
        condition.templateMethod = template.templateMethod;

        if (template.templateType) {
          condition.valueFormat = template.templateType;
        }
        if (template.valueFormat) {
          condition.valueFormat = template.valueFormat;
        }
        if (template.templateDefaultVariantType) {
          condition.valueFormat = template.templateDefaultVariantType;
        }

        return condition;
      };

      function recursivelyAddFieldsToConditions(conditions) {
        conditions.forEach((condition) => {
          if (!condition.conditions && !condition.conditionOperator) {
            const correspondingTemplate = findTemplateById(
              condition.conditionElementID,
              templates
            );
            condition = addFieldsToCondition(condition, correspondingTemplate);
          }
          if (condition.conditions) {
            recursivelyAddFieldsToConditions(condition.conditions);
          }
        });
      }

      segments = segments.map((segment) => {
        segment.segmentName = getIsAbTestSegment(segment)
          ? getAbTestSegmentName(segment)
          : getIsFlowSegment(segment) && !getIsFlowCaseSegment(segment)
            ? getFlowSegmentName(segment)
            : segment.segmentName;
        if (
          segment.segmentConditions &&
          segment.segmentConditions !== "" &&
          segment.segmentConditions.length > 0
        ) {
          const conditionsWithTemplatesInfo = segment.segmentConditions.map(
            (condition) => {
              if (condition.conditions) {
                recursivelyAddFieldsToConditions(condition.conditions);
              }
              return condition;
            }
          );
          segment.segmentConditions = conditionsWithTemplatesInfo;

          // Adding SID field to all blocks (brackets/condition.conditions), so we can later set it as key for react components

          segment.segmentConditions = segment.segmentConditions.map(
            (condition) => {
              function recursivelyAddSIDs(cond) {
                cond.sid = nanoid();
                if (cond.conditions) {
                  cond.conditions.forEach((conds) => {
                    if (conds.conditions) {
                      recursivelyAddSIDs(conds);
                    }
                  });
                }
              }
              if (condition.conditions) {
                recursivelyAddSIDs(condition);
              }
              return condition;
            }
          );
        } else {
          segment.segmentConditions = [];
        }
        return segment;
      });
      setSegments(segments);
    };
    getSegments();

    async function getAllABTests() {
      const res = await getABTestsShort({
        gameID: game.gameID,
        branch: branch,
      });
      if (res.success) {
        setAbTests(res.abTests);
      }
    }
    getAllABTests();

    async function getAllFlows() {
      const res = await getFlowsShort({
        gameID: game.gameID,
        branch: branch,
      });
      if (res.success) {
        setFlows(res.result);
      }
    }
    getAllFlows();

    setIsLoadingData(false);
  }
  useEffect(() => {
    fetchData();
  }, []);

  function getIsAbTestSegment(segment) {
    if (segment.segmentID.startsWith("abtest_")) {
      const testId = segment.segmentID.slice(7);
      return abTests.some((t) => t.id === testId);
    }
    return false;
  }
  function getAbTestSegmentName(segment) {
    if (segment.segmentID.startsWith("abtest_")) {
      const testId = segment.segmentID.slice(7);
      return abTests.find((t) => t.id === testId).name;
    }
    return false;
  }
  function getIsFlowSegment(segment) {
    if (segment.segmentID.startsWith("flow_")) {
      const flowSid = segment.segmentID.split("_")[1];
      return flows.some((flow) => flow.sid === flowSid);
    }
    return false;
  }
  function getIsFlowCaseSegment(segment) {
    if (
      segment.segmentID.startsWith("flow_") &&
      segment.segmentID.includes("_splitTest_")
    ) {
      const flowSid = segment.segmentID.split("_")[1];
      return flows.some((flow) => flow.sid === flowSid);
    }
    return false;
  }
  function getFlowSegmentName(segment) {
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

  async function handleRemoveSegment(segmentID) {
    setIsLoadingData(true);
    const response = await removeSegmentByID({
      gameID: game.gameID,
      branch: branch,
      segmentID,
    });
    if (response.success) {
      fetchData();
    }
    setIsLoadingData(false);
  }

  function addNewSegment() {
    const addSegment = async () => {
      setIsLoadingData(true);
      const response = await createNewSegment({
        gameID: game.gameID,
        branch: branch,
      });
      setSegments((prev) => [...prev, ...response.segments]);
      setIsLoadingData(false);
    };
    addSegment();
  }

  const [selectedCategory, setSelectedCategory] = useState("analytics");
  const [isDragging, setIsDragging] = useState(false);

  function onDragStateChange(newState) {
    setIsDragging(newState);
  }

  const [tabs, setTabs] = React.useState(0);
  const handleTabChange = (event, newValue) => {
    setTabs(newValue);
  };

  function filterSegments_regular(segments) {
    return (
      segments.filter(
        (s) =>
          !s.segmentID.startsWith("abtest_") && !s.segmentID.startsWith("flow_")
      ) || []
    );
  }
  function filterSegments_flows(segments) {
    return segments.filter((s) => s.segmentID.startsWith("flow_")) || [];
  }
  function filterSegments_abtests(segments) {
    return segments.filter((s) => s.segmentID.startsWith("abtest_")) || [];
  }

  return (
    <div className={s.mainContainer}>
      <Helmet>
        <title>{titles.segmentation}</title>
      </Helmet>

      <CustomDragLayer />

      <div className={s.templatesContainer}>
        <div className={s.upperbarButtons}>
          <Tooltip title="Analytics" disableInteractive>
            <Button
              sx={{
                width: selectedCategory === "analytics" ? "100%" : "0%",
                minWidth: "35px",
                p: "0.3rem 0px",
                transition: "all 0.3s",
              }}
              variant={
                selectedCategory === "analytics" ? "contained" : "outlined"
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

          <Tooltip title="Statistics" disableInteractive>
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

          <Tooltip title="Inventory" disableInteractive>
            <Button
              sx={{
                minWidth: "35px",
                width: selectedCategory === "inventory" ? "100%" : "0%",
                p: "0.3rem 0px",
                transition: "all 0.3s",
              }}
              variant={
                selectedCategory === "inventory" ? "contained" : "outlined"
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
                width: selectedCategory === "segmentation" ? "100%" : "0%",
                p: "0.3rem 0px",
                transition: "all 0.3s",
              }}
              variant={
                selectedCategory === "segmentation" ? "contained" : "outlined"
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

          {/* <Tooltip title="UA" disableInteractive>
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
              variant={selectedCategory === "ua" ? "contained" : "outlined"}
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
                return item.templateName.toLowerCase().indexOf(name) !== -1;
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
                return item.templateName.toLowerCase().indexOf(name) !== -1;
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
                return item.templateName.toLowerCase().indexOf(name) !== -1;
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

      <main className={s.segmentationContainer}>
        <Backdrop sx={{ color: "#fff", zIndex: 2 }} open={isLoadingData}>
          <CircularProgress color="inherit" />
        </Backdrop>

        {/* <div className={s.segmentStats}>
          <Typography variant="h6">Players total: {playersCount}</Typography>
          <Typography variant="h6">Segments: {segments.length}</Typography>
        </div> */}

        <Box
          sx={{ borderBottom: 1, borderColor: "divider", width: "100%", pl: 2 }}
        >
          <Tabs TabIndicatorProps={{}} value={tabs} onChange={handleTabChange}>
            <Tab
              label={`Regular (${filterSegments_regular(segments).length})`}
              {...allyProps(0)}
            />
            <Tab
              label={`Static (${filterSegments_regular(segments).filter((s) => s.isStaticSegment).length})`}
              {...allyProps(1)}
            />
            <Tab
              label={`Flows (${filterSegments_flows(segments).length})`}
              {...allyProps(2)}
            />
            <Tab
              label={`A/B tests (${filterSegments_abtests(segments).length})`}
              {...allyProps(3)}
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 2, pt: 4, display: "flex", alignItems: "center" }}>
          <SearchWrapper
            itemsToFilter={segments}
            segmentsEnabled={false}
            tagsEnabled={false}
            nameEnabled={true}
            possibleTags={[]}
            possibleSegments={[]}
            nameMatcher={(item, name) => {
              if (!item.segmentName) return false;
              return item.segmentName.toLowerCase().indexOf(name) !== -1;
            }}
            onItemsFiltered={(filtered) => {
              setFilteredSegments(filtered);
            }}
          />
          <Button
            sx={{
              m: 2,
              ml: 1,
              borderRadius: "2rem",
              minWidth: 100,
              minHeight: "45px",
            }}
            variant="contained"
            onClick={addNewSegment}
          >
            Add new segment
          </Button>
        </Box>

        <CustomTabPanel value={tabs} index={0}>
          <div className={s.segmentList}>
            {filterSegments_regular(filteredSegments).filter(
              (s) => !s.isStaticSegment
            ).length > 0 ? (
              filterSegments_regular(filteredSegments)
                .filter((s) => !s.isStaticSegment)
                .map((segment, index) => (
                  <SegmentItem
                    key={segment.segmentID}
                    segment={segment}
                    allSegments={segments}
                    isDragging={isDragging}
                    templates={templateList}
                    onRemove={handleRemoveSegment}
                    abTests={abTests}
                    flows={flows}
                  />
                ))
            ) : (
              <div></div>
            )}
          </div>
        </CustomTabPanel>
        <CustomTabPanel value={tabs} index={1}>
          <div className={s.segmentList}>
            {filterSegments_regular(filteredSegments).filter(
              (s) => s.isStaticSegment
            ).length > 0 ? (
              filterSegments_regular(filteredSegments)
                .filter((s) => s.isStaticSegment)
                .map((segment, index) => (
                  <SegmentItem
                    key={segment.segmentID}
                    segment={segment}
                    allSegments={segments}
                    isDragging={isDragging}
                    templates={templateList}
                    onRemove={handleRemoveSegment}
                    abTests={abTests}
                    flows={flows}
                  />
                ))
            ) : (
              <div></div>
            )}
          </div>
        </CustomTabPanel>
        <CustomTabPanel value={tabs} index={2}>
          <div className={s.segmentList}>
            {filterSegments_flows(filteredSegments).length > 0 ? (
              filterSegments_flows(filteredSegments).map((segment, index) => (
                <SegmentItem
                  key={segment.segmentID}
                  segment={segment}
                  allSegments={segments}
                  isDragging={isDragging}
                  templates={templateList}
                  onRemove={handleRemoveSegment}
                  abTests={abTests}
                  flows={flows}
                />
              ))
            ) : (
              <div></div>
            )}
          </div>
        </CustomTabPanel>
        <CustomTabPanel value={tabs} index={3}>
          <div className={s.segmentList}>
            {filterSegments_abtests(filteredSegments).length > 0 ? (
              filterSegments_abtests(filteredSegments).map((segment, index) => (
                <SegmentItem
                  key={segment.segmentID}
                  segment={segment}
                  allSegments={segments}
                  isDragging={isDragging}
                  templates={templateList}
                  onRemove={handleRemoveSegment}
                  abTests={abTests}
                  flows={flows}
                />
              ))
            ) : (
              <div></div>
            )}
          </div>
        </CustomTabPanel>
      </main>
    </div>
  );
};

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
      className={s.tabContent}
    >
      {value === index && <Box sx={{ p: 0, height: "100%" }}>{children}</Box>}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function allyProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

export default Segmentation;
