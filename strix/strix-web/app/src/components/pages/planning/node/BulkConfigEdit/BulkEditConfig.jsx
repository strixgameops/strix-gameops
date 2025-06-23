import React, { useState, useEffect, useReducer } from "react";
import "shared/table/tableStyling.module.css";
import makeData from "shared/table/makeData";
import Table from "shared/table/Table";
import { randomColor, shortId } from "shared/table/utils";
import { grey } from "shared/table/colors";
import s from "./bulkEditConfig.module.css";
import TopicSharpIcon from "@mui/icons-material/TopicSharp";
import Typography from "@mui/material/Typography";
import ExpandLessSharpIcon from "@mui/icons-material/ExpandLessSharp";
import Button from "@mui/material/Button";
import { useTheme } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import shortid from "shortid";

// For saving
import CircularProgress from "@mui/material/CircularProgress";
import ErrorIcon from "@mui/icons-material/Error";
import SaveIcon from "@mui/icons-material/Save";
import Tooltip from "@mui/material/Tooltip";
import { red } from "@mui/material/colors";

import _, { result } from "lodash";

import useApi from "@strix/api";
import { mergeSegmentValues } from "shared/remoteConfigHelper/configFunctions";

const BulkEditConfig = ({
  onDataChange,
  categories,
  currentSegment,
  gameID,
  branch,

  dataNodes,
  dataTree,

  inheritedCategories,

  onSelectedCategoryChange,

  propagateLocalChanges,
}) => {
  let lastFileNameInserted = "";
  const {
    saveEntityInheritedConfigs,
    saveEntityBasicInfo,
    saveEntityRoles,
    saveEntityIcon,
    getBalanceModel,
  } = useApi();
  const [prevData, setPrevData] = useState([]);

  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState({});
  const [defaultValuesMap, setDefaultValuesMap] = useState([]);

  const [saveInProgress, setSaveInProgress] = useState(false);

  let saveBasicInfoTimeout = null;
  let saveRolesTimeout = null;
  let saveIconTimeout = null;
  function saveBasicInfo(gameID, branch, nodeID, entityID, nodeName) {
    clearTimeout(saveBasicInfoTimeout);
    saveBasicInfoTimeout = setTimeout(async () => {
      if (!gameID) return;
      const response = await saveEntityBasicInfo({
        gameID: gameID,
        branch: branch,
        nodeID: nodeID,
        entityID: entityID,
        nodeName: nodeName,
        isCategory: false,
      });
    }, 1000);
  }
  function saveRoles(
    gameID,
    branch,
    nodeID,
    isCurrency,
    isInAppPurchase,
    realValueBase
  ) {
    clearTimeout(saveRolesTimeout);
    saveRolesTimeout = setTimeout(async () => {
      if (!gameID) return;
      console.log(
        gameID,
        branch,
        nodeID,
        isCurrency,
        isInAppPurchase,
        realValueBase
      );
      const response = await saveEntityRoles({
        gameID: gameID,
        branch: branch,
        nodeID: nodeID,
        isCurrency: isCurrency,
        isInAppPurchase: isInAppPurchase,
        realValueBase: realValueBase,
      });
    }, 1000);
  }
  function saveIcon(gameID, branch, nodeID, entityIcon) {
    clearTimeout(saveIconTimeout);
    saveIconTimeout = setTimeout(async () => {
      if (!gameID) return;
      const response = await saveEntityIcon({
        gameID: gameID,
        branch: branch,
        nodeID: nodeID,
        entityIcon: entityIcon,
      });
    }, 1000);
  }

  function findAndUpdateValue(
    config,
    valueID,
    segmentID,
    newValue,
    changeType,
    valueFileName,
    subChangeType
  ) {
    if (!config) return false;

    let found = false;

    config.forEach((value) => {
      // If found value, update it
      console.log("Found and changing value", value);
      if (value.sid === valueID) {
        found = true;
        switch (changeType) {
          case "value":
            if (
              value.type === "image" ||
              value.type === "video" ||
              value.type === "sound" ||
              value.type === "any file"
            ) {
              function setSegmentedValue() {
                let segmentFound = false;
                // For file-related values we also set a file name field
                value.segments.forEach((segment) => {
                  if (segment.segmentID === segmentID) {
                    segment.value = newValue;
                    segment.valueFileName = valueFileName;
                    // if (currentConfigIsInherited) {
                    if (true) {
                      segment.changed = true;
                    } else {
                      segment.changed = false;
                    }
                    segmentFound = true;
                  }
                });
                if (!segmentFound) {
                  const newSegment = {
                    segmentID: segmentID,
                    value: newValue,
                    valueFileName: valueFileName,
                  };

                  // if (currentConfigIsInherited) {
                  if (true) {
                    newSegment.changed = true;
                  } else {
                    newSegment.changed = false;
                  }

                  value.segments.push(newSegment);
                }
              }

              // When we switch types from "map" to other type, we need to set "segments" field.
              // This is because "segments" field is not always present in "map" type,
              // because it has "values" field instead of "segments" field.
              if (value.segments) {
                setSegmentedValue();
              } else {
                value.segments = [];
                delete value.values;
                setSegmentedValue();
              }
            } else {
              function setSegmentedValue() {
                // For non-file values. Only set the value
                let segmentFound = false;
                value.segments.forEach((segment) => {
                  if (segment.segmentID === segmentID) {
                    segment.value = newValue;
                    // if (currentConfigIsInherited) {
                    if (true) {
                      // If the field was changed by a reset, we need to keep "changed" false
                      if (subChangeType == "reset") {
                        segment.changed = false;
                      } else {
                        segment.changed = true;
                      }
                    } else {
                      segment.changed = false;
                    }
                    segmentFound = true;
                  }
                });
                if (!segmentFound) {
                  const newSegment = {
                    segmentID: segmentID,
                    value: newValue,
                    valueFileName: valueFileName,
                  };

                  // if (currentConfigIsInherited) {
                  if (true) {
                    // If the field was changed by a reset, we need to keep "changed" false
                    if (subChangeType == "reset") {
                      newSegment.changed = false;
                    } else {
                      newSegment.changed = true;
                    }
                  } else {
                    newSegment.changed = false;
                  }

                  value.segments.push(newSegment);
                }
              }

              // When we switch types from "map" to other type, we need to set "segments" field and remove "values".
              // This is because "segments" field is not always present in "map" type,
              // because it has "values" field instead of "segments" field.
              if (value.segments) {
                setSegmentedValue();
              } else {
                value.segments = [];
                delete value.values;
                setSegmentedValue();
              }
            }

            return found;
          case "type":
            value.type = newValue;
            if (newValue === "map") {
              delete value.segments;
            }
            return found;
          case "id":
            value.valueID = newValue;
            return found;
          case "delete":
            config.splice(config.indexOf(value), 1);
            return found;
          case "mapAdd":
            if (!value.values) {
              value.values = [];
            }

            value.values.push({
              valueID: value.valueID + value.values.length + 1,
              sid: shortid.generate(),
              type: "string",
              segments: [
                {
                  segmentID: "everyone",
                  value: "value1",
                },
              ],
            });
            return found;
        }
      }

      // If map, go through it's values and search for the right one
      if (value.type === "map" && Array.isArray(value.values)) {
        return findAndUpdateValue(
          value.values,
          valueID,
          segmentID,
          newValue,
          changeType,
          valueFileName,
          subChangeType
        );
      }
    });
  }

  let saveInheritedConfigTimeout = null;
  async function saveInheritedConfig(gameID, branch, nodeID, string) {
    clearTimeout(saveInheritedConfigTimeout);
    setSaveInProgress(true);

    saveInheritedConfigTimeout = setTimeout(async () => {
      const response = await saveEntityInheritedConfigs({
        gameID: gameID,
        branch: branch,
        nodeID: nodeID,
        inheritedConfigs: string,
        isCategory: false,
      });
      propagateLocalChanges(nodeID, string);
      setSaveInProgress(false);
    }, 500);
  }

  function processEntitiesAndSave(newData, filename) {
    let changedEntities = [];
    function getChangedEntities(prevData, newData) {
      newData.forEach((newEntity) => {
        if (
          JSON.stringify(newEntity) !==
          JSON.stringify(
            prevData.find(
              (prevEntity) => prevEntity.nodeID === newEntity.nodeID
            )
          )
        ) {
          changedEntities.push(newEntity);
        }
      });
    }
    getChangedEntities(prevData, newData);
    console.log("Changed entities", changedEntities);
    console.log("New data", newData);
    console.log("Prev data", prevData);

    if (prevData.length === 0) {
      setPrevData(newData);
      return;
    }

    // Get modified values by diffing prevData and newData.
    // We need to get value's SID and value, and then put this exact value to the exact SID in the inherited config
    let modifiedObjects = [];
    changedEntities.forEach((changedEntity) => {
      // Get modified values by diffing prevData and newData.
      console.log("Changed entity", changedEntity);
      let prevObj = prevData.find(
        (prevEntity) => prevEntity.nodeID === changedEntity.nodeID
      );
      console.log(
        "prevObj:",
        prevData.find(
          (prevEntity) => prevEntity.nodeID === changedEntity.nodeID
        )
      );

      if (prevObj === undefined) return;

      // Here we divide the logic, because we want to save inherited configs and basic info separately.
      // If basic info, just do the save. If config, do the config stuff.
      const basicInfoSIDs = ["id", "name", "iap", "currency", "icon"];

      const prevKeys = Object.keys(prevObj);
      for (let key of prevKeys) {
        if (prevObj[key] !== changedEntity[key]) {
          if (basicInfoSIDs.includes(key)) {
            modifiedObjects.push({
              nodeID: changedEntity.nodeID,
              sid: key,
              value: changedEntity[key],
            });
          } else {
            modifiedObjects.push({
              nodeID: key.split("|")[0],
              sid: key.split("|").slice(1)[0],
              value: changedEntity[key],
            });
          }

          break;
        }
      }
      if (modifiedObjects.length === 0) return;
      console.log("Modified objects", modifiedObjects);

      let entityAsNode = selectedCategory.children.find(
        (child) => child.nodeID === changedEntity.nodeID
      );
      console.log("Entity as node", JSON.parse(JSON.stringify(entityAsNode)));
      console.log("Selected category", selectedCategory);

      console.log(
        "Is basic info objects",
        modifiedObjects.some((object) => basicInfoSIDs.includes(object.sid))
      );

      if (
        modifiedObjects.some((object) => basicInfoSIDs.includes(object.sid))
      ) {
        modifiedObjects.forEach((object) => {
          console.log("Saving basic info", object);
          switch (object.sid) {
            case "id":
              saveBasicInfo(
                gameID,
                branch,
                changedEntity.nodeID,
                changedEntity.id,
                changedEntity.name
              );
              break;
            case "name":
              saveBasicInfo(
                gameID,
                branch,
                changedEntity.nodeID,
                changedEntity.id,
                changedEntity.name
              );
              break;
            case "iap":
              saveRoles(
                gameID,
                branch,
                changedEntity.nodeID,
                changedEntity.currency,
                changedEntity.iap,
                ""
              );
              break;
            case "currency":
              saveRoles(
                gameID,
                branch,
                changedEntity.nodeID,
                changedEntity.currency,
                changedEntity.iap,
                ""
              );
              break;
            case "icon":
              saveIcon(
                gameID,
                branch,
                changedEntity.nodeID,
                changedEntity.icon
              );
              break;
          }
        });
        setSelectedCategory({
          ...selectedCategory,
          children: selectedCategory.children.map((child) => {
            if (child.nodeID === changedEntity.nodeID) {
              return {
                ...child,
                name: changedEntity.name,
                entityBasic: {
                  ...child.entityBasic,
                  entityID: changedEntity.id,
                  isInAppPurchase: changedEntity.iap,
                  isCurrency: changedEntity.currency,
                  entityIcon: changedEntity.icon,
                },
              };
            } else {
              return child;
            }
          }),
        });

        return;
      }

      // Get inherited config
      let inhConfigs = JSON.parse(entityAsNode.entityBasic.inheritedConfigs);
      inhConfigs = inhConfigs.map((conf) => {
        console.log("Iterating inh config", JSON.parse(JSON.stringify(conf)));
        if (conf.nodeID === selectedCategory.nodeID) {
          conf.configs = _.mergeWith(
            JSON.parse(selectedCategory.entityCategory.mainConfigs),
            inhConfigs.find(
              (config) => config.nodeID === selectedCategory.nodeID
            ).configs,
            customizer
          );

          function customizer(objValue, srcValue) {
            if (objValue && objValue.segments) {
              console.log(
                "Customizer",
                JSON.parse(JSON.stringify(objValue)),
                JSON.parse(JSON.stringify(srcValue))
              );
              let mergedSegments = objValue.segments.map((segment) => {
                let modifiedValue = srcValue.segments.find(
                  (s) => s.segmentID === segment.segmentID
                );
                if (modifiedValue && modifiedValue.changed == true) {
                  segment.value = modifiedValue.value;
                  segment.changed = true;
                } else {
                  segment.changed = false;
                }
                return segment;
              });
              console.log(
                "Customizer: Merged array",
                JSON.parse(JSON.stringify(mergedSegments))
              );
              return { ...objValue, segments: mergedSegments };
              // Merge objects with the same sid only
              // let result =  _.uniqBy([...objValue, ...srcValue], 'sid');
              // return result;
            }
          }
          // conf.configs = _.merge
          //   (
          //     JSON.parse(selectedCategory.entityCategory.mainConfigs),
          //     inhConfigs.find(config => config.nodeID === selectedCategory.nodeID).configs
          //   )
          console.log(
            "Merged configs",
            JSON.parse(selectedCategory.entityCategory.mainConfigs),
            "with",
            inhConfigs.find(
              (config) => config.nodeID === selectedCategory.nodeID
            ).configs
          );
        }
        return conf;
      });

      console.log(
        "Customizer: Inherited configs BEFORE EDITING",
        JSON.parse(JSON.stringify(inhConfigs))
      );

      modifiedObjects.forEach((object) => {
        inhConfigs.map((config) => {
          if (config.nodeID === object.nodeID) {
            config.configs = config.configs.map((conf) => {
              console.log(
                "findAndUpdateValue:",
                object.sid,
                object.value,
                filename
              );
              findAndUpdateValue(
                conf.values,
                object.sid,
                currentSegment,
                object.value,
                "value",
                filename
              );
              // if (success == false) {

              //   findAndUpdateValue(conf.values, object.sid, currentSegment, object.value, 'value', filename)
              // }
              return conf;
            });
          }
          return config;
        });
      });
      console.log(
        "Inherited configs AFTER EDITING",
        JSON.parse(JSON.stringify(inhConfigs))
      );

      // Save new inherited configs, but clear them first from the unchanged values
      let cleanInhConfigs = JSON.parse(JSON.stringify(inhConfigs));
      // Now we wanna filter inherited configs and remove all segments or even values that are not changed.
      // Later we merge it with the original configs when we need to get the whole info.
      // This step if solely for the sake of saving space in the backend.
      function filterInheritedConfigs(configs) {
        return configs.map((node) => {
          if (Array.isArray(node.configs)) {
            node.configs.forEach((config) => {
              if (Array.isArray(config.values)) {
                function clearSegmentsInValue(values) {
                  // console.log('Clearing segments in value:', values)
                  values = values.filter((value) => {
                    // If regular value
                    if (Array.isArray(value.segments)) {
                      if (value.type !== "map") {
                        // Filter segments that are not changed
                        value.segments = value.segments.filter(
                          (segment) =>
                            segment.changed !== false &&
                            segment.changed !== undefined
                        );
                        if (value.segments.length === 0) {
                          // console.log('Removing value because it has no changed segments:', value)
                          return false; // If segments are empty, we can remove value
                        }
                      }
                    }
                    // If map
                    if (Array.isArray(value.values)) {
                      // console.log('Clearing segments in map value:', value)
                      // Go recursively through values
                      value.values = clearSegmentsInValue(value.values);
                    }
                    // console.log('Value that passed filter:', value)
                    return true;
                  });
                  if (Array.isArray(values)) {
                    console.log("Clearing changed field from values:", values);
                    // Removing "changed" field from all values' segments as we dont need it anymore
                    values.forEach((value) => {
                      if (value.segments && value.segments.length > 0) {
                        value.segments.forEach((segment) => {
                          if (segment.changed !== true) {
                            console.log(
                              "Removing changed field from segment:",
                              segment
                            );
                            delete segment.changed;
                            console.log(
                              "Segment after removing changed field:",
                              segment
                            );
                          }
                        });
                      }
                    });
                  }
                  return values;
                }
                config.values = clearSegmentsInValue(config.values);
                if (config.values === undefined) {
                  config.values = [];
                }
              }
            });
          }
          return node;
        });
      }
      filterInheritedConfigs(cleanInhConfigs);

      // // Clear inheritedConfigs fields from the array because we dont need them to be there
      function removeInheritedConfigs(configs) {
        let cleanedConfigs = configs;
        cleanedConfigs.forEach((config) => {
          delete config.inheritedConfigs;
        });
        return cleanedConfigs;
      }
      removeInheritedConfigs(cleanInhConfigs);
      console.log("Saving result cleaned config:", cleanInhConfigs);
      saveInheritedConfig(
        gameID,
        branch,
        entityAsNode.nodeID,
        JSON.stringify(cleanInhConfigs)
      );
      setSelectedCategory({
        ...selectedCategory,
        children: selectedCategory.children.map((child) => {
          if (child.nodeID === changedEntity.nodeID) {
            return {
              ...child,
              entityBasic: {
                ...child.entityBasic,
                inheritedConfigs: JSON.stringify(inhConfigs),
              },
            };
          } else {
            return child;
          }
        }),
      });
    });
    setPrevData(newData);
  }

  function reducer(state, action) {
    switch (action.type) {
      case "add_option_to_column":
        const optionIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, optionIndex),
            {
              ...state.columns[optionIndex],
              options: [
                ...state.columns[optionIndex].options,
                {
                  label: action.option,
                  backgroundColor: action.backgroundColor,
                },
              ],
            },
            ...state.columns.slice(optionIndex + 1, state.columns.length),
          ],
        };
      case "add_row":
        return {
          ...state,
          skipReset: true,
          data: [...state.data, { index: state.data.length + 1 }],
        };
      case "remove_row":
        return {
          ...state,
          skipReset: true,
          data: state.data.filter((row, index) => index !== action.rowIndex),
        };
      case "update_column_type":
        const typeIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        switch (action.dataType) {
          case "number":
            if (state.columns[typeIndex].dataType === "number") {
              return state;
            } else {
              return {
                ...state,
                columns: [
                  ...state.columns.slice(0, typeIndex),
                  { ...state.columns[typeIndex], dataType: action.dataType },
                  ...state.columns.slice(typeIndex + 1, state.columns.length),
                ],
                data: state.data.map((row) => ({
                  ...row,
                  [action.columnId]: isNaN(row[action.columnId])
                    ? ""
                    : Number.parseInt(row[action.columnId]),
                })),
              };
            }
          case "select":
            if (state.columns[typeIndex].dataType === "select") {
              return {
                ...state,
                columns: [
                  ...state.columns.slice(0, typeIndex),
                  { ...state.columns[typeIndex], dataType: action.dataType },
                  ...state.columns.slice(typeIndex + 1, state.columns.length),
                ],
                skipReset: true,
              };
            } else {
              let options = [];
              state.data.forEach((row) => {
                if (row[action.columnId]) {
                  options.push({
                    label: row[action.columnId],
                    backgroundColor: randomColor(),
                  });
                }
              });
              return {
                ...state,
                columns: [
                  ...state.columns.slice(0, typeIndex),
                  {
                    ...state.columns[typeIndex],
                    dataType: action.dataType,
                    options: [...state.columns[typeIndex].options, ...options],
                  },
                  ...state.columns.slice(typeIndex + 1, state.columns.length),
                ],
                skipReset: true,
              };
            }
          case "text":
            if (state.columns[typeIndex].dataType === "text") {
              return state;
            } else if (state.columns[typeIndex].dataType === "select") {
              return {
                ...state,
                skipReset: true,
                columns: [
                  ...state.columns.slice(0, typeIndex),
                  { ...state.columns[typeIndex], dataType: action.dataType },
                  ...state.columns.slice(typeIndex + 1, state.columns.length),
                ],
              };
            } else {
              return {
                ...state,
                skipReset: true,
                columns: [
                  ...state.columns.slice(0, typeIndex),
                  { ...state.columns[typeIndex], dataType: action.dataType },
                  ...state.columns.slice(typeIndex + 1, state.columns.length),
                ],
                data: state.data.map((row) => ({
                  ...row,
                  [action.columnId]: row[action.columnId] + "",
                })),
              };
            }
          default:
            return state;
        }
      case "update_column_header":
        const index = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, index),
            { ...state.columns[index], label: action.label },
            ...state.columns.slice(index + 1, state.columns.length),
          ],
        };
      case "update_cell":
        console.log("Action", action);
        if (action.fileName !== undefined) {
          lastFileNameInserted = action.fileName;
        }
        let tempState = {
          ...state,
          skipReset: true,
          data: state.data.map((row, index) => {
            if (index === action.rowIndex) {
              return {
                ...state.data[action.rowIndex],
                [action.columnId]: action.value,
              };
            }
            return row;
          }),
        };
        processEntitiesAndSave(tempState.data, action.fileName);
        return tempState;
      case "add_column_to_left":
        const leftIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        let leftId = shortId();
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, leftIndex),
            {
              id: leftId,
              label: "Column",
              accessor: leftId,
              dataType: "text",
              created: action.focus && true,
              options: [],
            },
            ...state.columns.slice(leftIndex, state.columns.length),
          ],
        };
      case "add_column_to_right":
        const rightIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        const rightId = shortId();
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, rightIndex + 1),
            {
              id: rightId,
              label: "Column",
              accessor: rightId,
              dataType: "text",
              created: action.focus && true,
              options: [],
            },
            ...state.columns.slice(rightIndex + 1, state.columns.length),
          ],
        };
      case "delete_column":
        const deleteIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, deleteIndex),
            ...state.columns.slice(deleteIndex + 1, state.columns.length),
          ],
        };
      case "enable_reset":
        return {
          ...state,
          skipReset: false,
        };
      case "set_category":
        return {
          ...state,
          data: action.data,
          columns: action.columns,
        };
      case "hide_column":
        if (!state.hiddenColumns) {
          state.hiddenColumns = [];
        }
        return {
          ...state,
          hiddenColumns: [...state.hiddenColumns, action.columnId],
        };
      case "isolate_column":
        state.hiddenColumns = [];
        return {
          ...state,
          hiddenColumns: state.columns
            .map((column) => {
              if (column.id === action.columnId) {
                return undefined;
              } else {
                return column.id;
              }
            })
            .filter((column) => column !== undefined),
        };
      case "show_column":
        return {
          ...state,
          hiddenColumns: state.hiddenColumns.filter(
            (column) => column !== action.columnId
          ),
        };
      case "show_all_columns":
        return {
          ...state,
          hiddenColumns: [],
        };
      default:
        return state;
    }
  }

  const defaultColumns = [
    {
      id: "id",
      label: "ID *",
      accessor: "id",
      minWidth: 100,
      dataType: "text",
      editable: true,
      options: [],
    },
    {
      id: "name",
      label: "Name *",
      accessor: "name",
      minWidth: 100,
      dataType: "text",
      editable: true,
      options: [],
    },
    {
      id: "icon",
      label: "Icon",
      accessor: "icon",
      width: 130,
      dataType: "icon",
      editable: true,
      options: [],
    },
    {
      id: "iap",
      label: "Is Content",
      accessor: "iap",
      dataType: "bool",
      editable: true,
      width: 90,
      options: [],
    },
    {
      id: "currency",
      label: "Is Currency",
      accessor: "currency",
      dataType: "bool",
      editable: true,
      width: 130,
      options: [],
    },
  ];

  const [state, dispatch] = useReducer(reducer, {
    columns: defaultColumns,
    data: [],
    skipReset: false,
  });

  useEffect(() => {
    dispatch({ type: "enable_reset" });
    console.log("Data", state.data);
  }, [state.data, state.columns]);
  console.log("Categories", categories);

  function getInheritedConfigs() {
    function findNodeByID(node, targetNodeID) {
      if (node.uniqueID === targetNodeID) {
        return node;
      }
      for (const subnode of node.Subnodes) {
        const result = findNodeByID(subnode, targetNodeID);
        if (result) {
          return result;
        }
      }
      return null;
    }
    function findNodeByNodeID(node, targetNodeID) {
      if (node.ID === targetNodeID) {
        return node;
      }
      for (const subnode of node.Subnodes) {
        const result = findNodeByNodeID(subnode, targetNodeID);
        if (result) {
          return result;
        }
      }
      return null;
    }
    let inheritedConfigs = [];
    let tempInheritedCategories = [];
    function gatherInheritedConfigs(uniqueID) {
      // We do uniqueID search instead of nodeID in case we would want to have same multiple nodes in tree, and
      // their nodeID would be the same, but different uniqueID
      console.log("Gathering inherited configs for", uniqueID, "in", dataTree);
      const nodeInTree = findNodeByID(dataTree, uniqueID);
      const nodeInData = dataNodes.find(
        (node) => node.nodeID === nodeInTree.ID
      );
      tempInheritedCategories.push(nodeInData.nodeID);
      inheritedConfigs.push({
        nodeID: nodeInData.nodeID,
        configs:
          nodeInData.entityCategory.mainConfigs !== ""
            ? JSON.parse(nodeInData.entityCategory.mainConfigs)
            : [],
        inheritedConfigs:
          nodeInData.entityCategory.inheritedConfigs !== ""
            ? JSON.parse(nodeInData.entityCategory.inheritedConfigs)
            : [],
      });

      // If the category we found has another parent category, we need to gather inherited configs from it too.
      // And do it recursively until there is no parent category (should be the root)
      if (
        nodeInData.entityCategory.parentCategory &&
        nodeInData.entityCategory.parentCategory !== ""
      ) {
        gatherInheritedConfigs(nodeInData.entityCategory.parentCategory);
      }
    }
    function findValueInConfig(configs, configSID, sid) {
      let values = configs.find((config) => config.sid === configSID).values;
      // console.log('CONFIG: ', configID, 'Trying to find value with sid', sid, 'in values', values)
      function cycleValues(values) {
        for (let value of values) {
          // console.log('CONFIG: ', configID, 'Iterating value', value, 'to find value with sid', sid);
          if (value.sid === sid) {
            // console.log('CONFIG: ', configID, 'Found value with sid', sid, 'in value', value);
            return value.segments;
          }
          if (value.values !== undefined) {
            let result = cycleValues(value.values);
            if (result !== null) {
              return result;
            }
          }
        }
        return null;
      }
      const result = cycleValues(values);
      return result;
    }

    // Here we merge original configs from nodes with their overrides from entities below,
    // so the changed values replace the original ones & we get the final overall config.
    function resolveInheritance(configs) {
      // Reverse, because we want to go from Root to the most specific category.
      // Going "Non-reversed" way, we would get wrong overrides, so we never want to do that.
      let reversedNodeConfigs = [...configs];
      reversedNodeConfigs.reverse();

      reversedNodeConfigs.forEach((config) => {
        // Iterating through all current configs
        if (config) {
          // Checking if there is any override configs on this entity
          if (config.inheritedConfigs !== "") {
            // If any override configs are present, do the override to the original configs
            //
            // The logic behind this as we want to override only the values that are present in the original configs.
            // Otherwise we would desync both configs, as inheritedConfig would have already-non-existent values, and
            // they could be appended to the original config, which we never want to happen.
            //
            config.inheritedConfigs.forEach((overrideConfig) => {
              if (
                Boolean(overrideConfig.configs) &&
                overrideConfig.configs.length > 0
              ) {
                // Iterating through all configs on this entity
                let targetConfig = reversedNodeConfigs.find(
                  (item) => item.nodeID === overrideConfig.nodeID
                );

                // console.log(
                //   "Target config",
                //   JSON.parse(
                //     JSON.stringify(targetConfig),
                //     "override config",
                //     JSON.parse(JSON.stringify(overrideConfig))
                //   )
                // );

                targetConfig.configs.map((conf) => {
                  // Iterating through all values on this config
                  conf.values = conf.values.map((value) => {
                    console.log(
                      "CONFIG: ",
                      conf,
                      "Iterating through value",
                      value,
                      "Override config:",
                      overrideConfig
                    );
                    const overrideValueSegments = findValueInConfig(
                      overrideConfig.configs,
                      conf.sid,
                      value.sid
                    );
                    console.log(
                      "CONFIG: ",
                      conf.id,
                      "Got value from override:",
                      overrideValueSegments,
                      "Value:",
                      value
                    );
                    if (
                      overrideValueSegments !== null &&
                      overrideValueSegments !== undefined &&
                      overrideValueSegments.length > 0 &&
                      !value.values
                    ) {
                      // Merge value so that the original untouched values are kept, but the changed ones are overridden
                      value.segments = mergeSegmentValues(
                        value.segments,
                        overrideValueSegments
                      );
                    }
                    if (value.values) {
                      value.values = value.values.map((subVal) => {
                        // console.log('CONFIG: ', conf.name, 'Iterating through subvalue', subVal)
                        const overrideSubValueSegments = findValueInConfig(
                          overrideConfig.configs,
                          conf.sid,
                          subVal.sid
                        );
                        // console.log('CONFIG: ', conf.name, 'Got value from override:', overrideSubValueSegments)
                        if (
                          overrideSubValueSegments !== null &&
                          overrideSubValueSegments !== undefined &&
                          overrideSubValueSegments.length > 0
                        ) {
                          // Merge value so that the original untouched values are kept, but the changed ones are overridden
                          subVal.segments = mergeSegmentValues(
                            subVal.segments,
                            overrideSubValueSegments
                          );
                        }
                        return subVal;
                      });
                    }
                    // console.log('CONFIG: ', conf.name, 'RESULT VALUE AFTER ITERATING:', value)
                    return value;
                  });

                  // console.log('CONFIG: ', conf.name, 'RESULT CONFIG AFTER ITERATING:', conf, 'AT TARGETCONFIG:', targetConfig.configs)

                  return conf;
                });
                // console.log('Pre-result', JSON.parse(JSON.stringify(targetConfig.configs)))

                let targetIndex = reversedNodeConfigs.findIndex(
                  (item) => item.nodeID === overrideConfig.nodeID
                );
                reversedNodeConfigs[targetIndex].configs = Object.assign(
                  reversedNodeConfigs[targetIndex].configs,
                  targetConfig.configs
                );

                // console.log('Result', reversedNodeConfigs[targetIndex].configs)
              }
            });
          }
        }
      });
      let tempOverrideConfigs =
        selectedCategory.entityCategory.inheritedConfigs !== ""
          ? JSON.parse(selectedCategory.entityCategory.inheritedConfigs)
          : undefined;
      if (!tempOverrideConfigs) {
        tempOverrideConfigs =
          selectedCategory.entityCategory.inheritedConfigs !== ""
            ? JSON.parse(selectedCategory.entityCategory.inheritedConfigs)
            : [];
      }
      // Now we finally apply the inheritedConfigs of this exact current entity to all parents we can
      if (tempOverrideConfigs !== "") {
        tempOverrideConfigs.forEach((overrideConfig) => {
          if (
            overrideConfig.configs !== "" &&
            overrideConfig.configs.length > 0
          ) {
            // Iterating through all configs on this entity
            let targetConfig = reversedNodeConfigs.find(
              (item) => item.nodeID === overrideConfig.nodeID
            );

            // console.log('Target config', JSON.parse(JSON.stringify(targetConfig), 'override config', JSON.parse(JSON.stringify(overrideConfig))))
            targetConfig.configs.map((conf) => {
              // Iterating through all values on this config
              conf.values = conf.values.map((value) => {
                // console.log('CONFIG: ', conf.name, 'Iterating through value', value)
                const overrideValueSegments = findValueInConfig(
                  overrideConfig.configs,
                  conf.sid,
                  value.sid
                );
                console.log(
                  "CONFIG: ",
                  conf,
                  "Value:",
                  value,
                  "Got value from override:",
                  overrideValueSegments
                );
                if (
                  !value.values &&
                  overrideValueSegments !== null &&
                  overrideValueSegments !== undefined &&
                  overrideValueSegments.length > 0
                ) {
                  // Merge value so that the original untouched values are kept, but the changed ones are overridden
                  value.segments = mergeSegmentValues(
                    value.segments,
                    overrideValueSegments
                  );
                }
                if (value.values) {
                  value.values = value.values.map((subVal) => {
                    // console.log('CONFIG: ', conf.name, 'Iterating through subvalue', subVal)
                    const overrideSubValueSegments = findValueInConfig(
                      overrideConfig.configs,
                      conf.sid,
                      subVal.sid
                    );
                    // console.log('CONFIG: ', conf.name, 'Got value from override:', overrideSubValueSegments)
                    if (
                      overrideSubValueSegments !== null &&
                      overrideSubValueSegments !== undefined
                    ) {
                      // Merge value so that the original untouched values are kept, but the changed ones are overridden
                      subVal.segments = mergeSegmentValues(
                        subVal.segments,
                        overrideSubValueSegments
                      );
                    }
                    return subVal;
                  });
                }
                // console.log('CONFIG: ', conf.name, 'RESULT VALUE AFTER ITERATING:', value)
                return value;
              });
              // console.log('CONFIG: ', conf.name, 'RESULT CONFIG AFTER ITERATING:', conf, 'AT TARGETCONFIG:', targetConfig.configs)

              return conf;
            });
            // console.log('Pre-result', JSON.parse(JSON.stringify(targetConfig.configs)))

            let targetIndex = reversedNodeConfigs.findIndex(
              (item) => item.nodeID === overrideConfig.nodeID
            );
            reversedNodeConfigs[targetIndex].configs = Object.assign(
              reversedNodeConfigs[targetIndex].configs,
              targetConfig.configs
            );

            // console.log('Result', reversedNodeConfigs[targetIndex].configs)
          }
        });
      }

      console.log("Resolving inheritance:", reversedNodeConfigs);

      return reversedNodeConfigs.reverse();
    }
    console.log(
      "Inherited inheritedCategories:",
      inheritedCategories,
      dataTree
    );
    const closestParent = findNodeByNodeID(dataTree, inheritedCategories[0]);
    console.log("Closest parent", closestParent);
    gatherInheritedConfigs(closestParent.uniqueID);

    if (inheritedConfigs.length > 0) {
      inheritedConfigs = resolveInheritance(inheritedConfigs);
    }
    return inheritedConfigs;
  }

  useEffect(() => {
    // console.log('Selected category', selectedCategory)
    if (
      selectedCategory.children === 0 ||
      selectedCategory.children === undefined
    ) {
      return;
    }

    let columns = defaultColumns;

    // Here we merge mainConfigs of the selected category and the inheritedConfigs of it
    let configs = [];
    // JSON.parse(selectedCategory.entityCategory.mainConfigs)
    let gatheredInhConfigs = [];

    // console.log('ITERATIONS Configs before all merges', JSON.parse(JSON.stringify(configs)))
    // console.log('ITERATIONS Inh categories', inheritedCategories)

    if (inheritedCategories.length > 0) {
      gatheredInhConfigs = getInheritedConfigs();
      gatheredInhConfigs = gatheredInhConfigs.filter((config) => {
        if (config.nodeID === selectedCategory.nodeID) {
          return true;
        } else if (inheritedCategories.includes(config.nodeID)) {
          return true;
        }
        return false;
      });
      // console.log('gatheredConfigs', gatheredInhConfigs, 'for categories', inheritedCategories)
    }
    if (gatheredInhConfigs.length > 0) {
      let tempMainConfigs = {
        nodeID: selectedCategory.nodeID,
        configs:
          JSON.parse(selectedCategory.entityCategory.mainConfigs) !== ""
            ? JSON.parse(selectedCategory.entityCategory.mainConfigs)
            : [],
      };
      // console.log('gatheredInhConfigs flatMap', gatheredInhConfigs)
      configs = configs.concat(tempMainConfigs, gatheredInhConfigs);
    }
    console.log(
      "ITERATIONS Configs after all merges",
      JSON.parse(JSON.stringify(configs))
    );

    // Populating columns with config values
    let tempDefValues = [];
    configs.forEach((config) => {
      // console.log('ITERATIONS', config)
      config.configs.forEach((conf) => {
        conf.values.forEach((value) => {
          function pushColumn(value) {
            if (
              columns.some(
                (column) => column.id === config.nodeID + "|" + value.sid
              )
            )
              return;
            columns.push({
              id: config.nodeID + "|" + value.sid,
              label: value.valueID,
              accessor: config.nodeID + "|" + value.sid,
              minWidth: 130,
              dataType: value.type,
              editable: true,
              options: [],
            });
            let segmentedValue = value.segments.find(
              (segment) => segment.segmentID === currentSegment
            );

            if (segmentedValue) {
              tempDefValues.push({
                nodeID: config.nodeID,
                sid: value.sid,
                value: segmentedValue.value,
              });
            }
          }

          if (value.type === "map") {
            value.values.forEach((subValue) => {
              if (subValue.type !== "localized text") {
                pushColumn(subValue);
              }
            });
          } else if (value.type === "localized text") {
          } else {
            pushColumn(value);
          }
        });
      });
      // console.log('Default values map', tempDefValues)
    });
    setDefaultValuesMap(tempDefValues);

    // console.log('Columns', columns)

    let tempFilenames = [];

    let children = selectedCategory.children.map((child) => {
      // console.log('Child', child)
      let childConfigs = {};
      if (child.entityBasic.inheritedConfigs !== "") {
        childConfigs = JSON.parse(child.entityBasic.inheritedConfigs);
      }

      let tempChild = {
        nodeID: child.nodeID,
        id: child.entityBasic.entityID,
        name: child.name,
        icon: child.entityBasic.entityIcon,
        iap: child.entityBasic.isInAppPurchase,
        currency: child.entityBasic.isCurrency,
      };

      // Assign additional fields to the cell data in format {sid: value}
      // Unlike from PropsBuilder we won't do "changed" bool, but we will check each value if it differs from default value
      // at the end of the editing process
      //
      // But we also get and set here all changed inherited values
      // console.log('Child configs before merging:', JSON.parse(JSON.stringify(childConfigs)))
      // let tempConfigs = []
      // if (Object.keys(childConfigs).length !== 0) {
      //   if (childConfigs.find(config => config.nodeID === selectedCategory.nodeID)) {

      //     childConfigs = childConfigs.map(config => {
      //       console.log('Found config', config)
      //       if (configs.find(c => c.nodeID === config.nodeID)) {
      //         console.log('Merging config', configs.find(c => c.nodeID === config.nodeID).configs, 'with', config.configs)
      //         config.configs = _.merge(configs.find(c => c.nodeID === config.nodeID).configs, config.configs)
      //         return config
      //       } else {
      //         return config
      //       }
      //     })

      //   }
      //   tempConfigs = childConfigs.find(config => config.nodeID === selectedCategory.nodeID)
      // } else {
      //   tempConfigs = {
      //     nodeID: selectedCategory.nodeID,
      //     configs: selectedCategory.entityCategory.mainConfigs !== ''
      //     ? JSON.parse(selectedCategory.entityCategory.mainConfigs)
      //     : [],
      //   }
      // }

      // console.log('Child configs after merging:', JSON.parse(JSON.stringify(tempConfigs)))
      tempDefValues.map((defValue) => {
        // Do check if configs exist at all
        if (Object.keys(childConfigs).length !== 0) {
          // Get inherited config from the child for this exact current category that is opened in the bulk editor
          let tempValue;
          let tempNodeID;

          childConfigs.forEach((config) => {
            // console.log('Found configs', config)
            config.configs.forEach((conf) => {
              let foundValue = findConfigValue(
                conf.values,
                defValue.sid,
                currentSegment
              );
              // console.log('Searching for inh config value:', defValue.sid, 'default:', defValue.value, 'found:', foundValue)
              if (foundValue.found) {
                tempValue = foundValue;
                tempNodeID = config.nodeID;

                if (foundValue.valueFileName) {
                  tempFilenames.push({
                    nodeID: config.nodeID,
                    sid: defValue.sid,
                    fileName: foundValue.valueFileName,
                  });
                }
              }
            });
          });

          if (tempValue && tempValue.found) {
            return (tempChild[tempNodeID + "|" + defValue.sid] =
              tempValue.value);
          } else {
            return (tempChild[defValue.nodeID + "|" + defValue.sid] =
              defValue.value);
          }
        } else {
          return (tempChild[defValue.nodeID + "|" + defValue.sid] =
            defValue.value);
        }
      });

      return tempChild;
    });
    // console.log('Children', children)

    // console.log('Set filenames', tempFilenames)
    setFilenames(tempFilenames);

    dispatch({ type: "set_category", data: children, columns: columns });
    setPrevData(children);
  }, [selectedCategory, currentSegment, categories, dataNodes, dataTree]);

  const [filenames, setFilenames] = useState([]);

  useEffect(() => {
    console.log("New selected category", selectedCategory);
    onSelectedCategoryChange(selectedCategory);
  }, [selectedCategory]);

  function findConfigValue(config, valueID, segmentID) {
    if (!config) return false;

    for (let value of config) {
      // If found value, update it
      if (value.sid === valueID) {
        if (
          value.type === "image" ||
          value.type === "video" ||
          value.type === "sound"
        ) {
          let segmentFound = false;
          for (let segment of value.segments) {
            if (segment.segmentID === segmentID) {
              segmentFound = true;
              return {
                found: true,
                value: segment.value,
                valueFileName: segment.valueFileName,
              };
            }
          }
          if (!segmentFound) {
            return {
              found: false,
              value: "",
              valueFileName: "",
            };
          }
        } else {
          let segmentFound = false;
          for (let segment of value.segments) {
            if (segment.segmentID === segmentID) {
              segmentFound = true;
              return { found: true, value: segment.value };
            }
          }
          if (!segmentFound) {
            return { found: false, value: "" };
          }
        }
      }

      // If map, go through its values and search for the right one
      if (value.type === "map" && Array.isArray(value.values)) {
        let result = findConfigValue(value.values, valueID, segmentID);
        if (result) return result; // Return early if result is found
      }
    }

    return false; // Return false if value is not found
  }

  function trimStr(str, maxLength) {
    if (str === undefined || str === "") return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  }

  function BtnCategory({ category, isSelected }) {
    return (
      <Button
        fullWidth
        variant={isSelected ? "contained" : "outlined"}
        sx={{
          borderRadius: "1rem",
          // backgroundColor: isSelected ? '#3e4173' : '#22263f',
          // '&:hover': {
          //     backgroundColor: isSelected ? '#676cbf' : '#2A2C4D'
          // },
          // '&& .MuiTouchRipple-child': {
          //     backgroundColor: isSelected ? theme.palette.primary.dark : theme.palette.primary.light,
          // },
          justifyContent: "start",
        }}
        onClick={() => setSelectedCategory(category)}
      >
        <div className={s.btnConfig}>
          <Typography
            variant={"subtitle1"}
            // color={isSelected ? "text.primary" : "text.grey"}
            sx={{
              whiteSpace: "pre-wrap",
              textTransform: "none",
              fontSize: "14px",
              fontWeight: "regular",
              textAlign: "start",
            }}
          >
            {trimStr(category.name, 25)}
          </Typography>

          {isSelected ? (
            <div className={s.btnArrowIcon}>
              <ExpandLessSharpIcon
                sx={{ fontSize: 23, ml: "auto", transform: "rotate(90deg)" }}
                htmlColor={"#b8b8b8"}
              />
            </div>
          ) : (
            <div className={s.btnArrowIcon}></div>
          )}
        </div>
      </Button>
    );
  }

  const fixedColumns = ["id", "name"];

  const [gameModelFunctions, setGameModelFunctions] = useState([]);
  useEffect(() => {
    async function fetchFunctions() {
      const resp = await getBalanceModel({
        gameID,
        branch,
        specificTypes: ["functions"],
      });
      setGameModelFunctions(
        resp.result.functions
          ? resp.result.functions.map((f) => ({
              name: f.name,
              id: f.functionID,
            }))
          : []
      );
    }
    fetchFunctions();
  }, []);

  return (
    <div className={s.mainContainer}>
      <div className={s.sidebar}>
        <div className={s.header}>
          <TopicSharpIcon htmlColor={"#6E758E"} />
          <Typography
            variant={"body1"}
            color={"text.grey"}
            sx={{ fontSize: "18px", fontWeight: "regular", textAlign: "start" }}
          >
            Categories
          </Typography>

          <div className={s.saveContainer}>
            {saveInProgress ? (
              <CircularProgress size={20} color="success" />
            ) : (
              <Tooltip
                title={<Typography fontSize={15}>Config is saved</Typography>}
              >
                <SaveIcon color="success" />
              </Tooltip>
            )}
          </div>
        </div>

        <div className={s.configs}>
          {categories
            .filter((category) => category.children.length > 0)
            .map((category, index) => (
              <BtnCategory
                key={index}
                category={category}
                isSelected={selectedCategory.nodeID === category.nodeID}
              />
            ))}
        </div>
      </div>

      <div className={s.tableContainer}>
        <Table
          showPagination={false}
          columns={state.columns}
          data={state.data}
          dispatch={dispatch}
          skipReset={state.skipReset}
          showAdd={false}
          hiddenColumns={state.hiddenColumns}
          fixedColumns={fixedColumns}
          filenames={filenames}
          gameModelFunctions={gameModelFunctions}
        />
      </div>
    </div>
  );
};

export default BulkEditConfig;
