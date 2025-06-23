import React, { useState, useRef, useEffect } from "react";
import PropsBuilder from "shared/propsConfigurator/PropsBuilder.jsx";
import { useGame, useBranch } from "@strix/gameContext";
import s from "./remoteConfig.module.css";
import shortid from "shortid";

import useApi from "@strix/api";
import { mergeSegmentValues } from "shared/remoteConfigHelper/configFunctions.jsx";

const RemoteConfig = ({
  nodeContent,

  onMainConfigChange,
  onInheritedConfigChange,
  getResultConfigs, // only used to retrieve ready to go configs from nodeContent, since sometimes we use RemoteConfig component to do that

  dataNodes,
  dataTree,

  preventSave = false,
  disableIDChanging = false,
  disableFieldRemoval = false,
  disableCreation = false,
  defaultCompareSegment,
  defaultCurrentSegment,
}) => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { saveEntityMainConfigs, saveEntityInheritedConfigs } = useApi();

  // PropsBuilder
  const [mainConfigs, setMainConfigs] = useState([]);
  const [inheritedConfigs, setInheritedConfigs] = useState([]);
  const [overrideConfigs, setOverrideConfigs] = useState([]);
  const [defaultInheritedConfigs, setDefaultInheritedConfigs] = useState([]);

  const [saveInProgress, setSaveInProgress] = useState(false);

  const [inheritedCategories, setInheritedCategories] = useState([]);

  const [selectedType, setSelectedType] = useState(
    nodeContent.entityCategory ? "category" : "basic"
  );
  useEffect(() => {
    setSelectedType(nodeContent.entityCategory ? "category" : "basic");
  }, [nodeContent]);

  // Get initial configs from nodeContent
  useEffect(() => {
    if (!nodeContent) return;
    if (selectedType === "category") {
      if (!nodeContent.entityCategory) return;
      setMainConfigs(
        nodeContent.entityCategory.mainConfigs !== ""
          ? JSON.parse(nodeContent.entityCategory.mainConfigs)
          : []
      );
      setOverrideConfigs(
        nodeContent.entityCategory.inheritedConfigs !== ""
          ? JSON.parse(nodeContent.entityCategory.inheritedConfigs)
          : []
      );
    } else if (selectedType === "basic") {
      if (!nodeContent.entityBasic) return;
      setMainConfigs(
        nodeContent.entityBasic.mainConfigs !== ""
          ? JSON.parse(nodeContent.entityBasic.mainConfigs)
          : []
      );
      setOverrideConfigs(
        nodeContent.entityBasic.inheritedConfigs !== ""
          ? JSON.parse(nodeContent.entityBasic.inheritedConfigs)
          : []
      );
    }
  }, [nodeContent]);

  // Get inheritedConfigs
  const nodeContentRef = React.useRef(null);
  const overrideConfigsRef = React.useRef(null);
  const dataNodesRef = React.useRef(null);
  useEffect(() => {
    // Here we gather inherited configs
    if (dataNodes) {
      // Get parent category uniqueID
      let parentCategory;
      if (selectedType === "basic") {
        if (!nodeContent.entityBasic) return;
        parentCategory = nodeContent.entityBasic.parentCategory;
      } else if (selectedType === "category") {
        if (!nodeContent.entityCategory) return;
        parentCategory = nodeContent.entityCategory.parentCategory;
      } else {
        // Means selectedType is empty
        return;
      }

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

      let inheritedConfigs = [];
      let tempInheritedCategories = [];
      function gatherInheritedConfigs(uniqueID) {
        // We do uniqueID search instead of nodeID in case we would want to have same multiple nodes in tree, and
        // their nodeID would be the same, but different uniqueID
        const nodeInTree = findNodeByID(dataTree, uniqueID);
        // If we couldn't find node in tree, we can't gather inherited configs, therefore we return
        if (nodeInTree === null) return;

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
        let values = configs.find((config) => config.sid === configSID);
        if (values !== undefined) {
          values = values.values;
        } else {
          return undefined;
        }
        // console.log('CONFIG: ', configs, 'Trying to find value with sid', sid, 'in values', values)
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
      let defConfig = [];
      function resolveInheritance(configs) {
        // Reverse, because we want to go from Root to the most specific category.
        // Going "Non-reversed" way, we would get wrong overrides, so we never want to do that.
        let reversedNodeConfigs = [...configs];
        reversedNodeConfigs.reverse();

        console.log(
          "Reversed node configs:",
          JSON.parse(JSON.stringify(reversedNodeConfigs))
        );

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
                  // console.log("reversedNodeConfigs:", reversedNodeConfigs, "overrideConfig", overrideConfig)

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
                      // console.log('CONFIG: ', conf.name, 'Got value from override:', overrideValueSegments)
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

                  let targetIndex = reversedNodeConfigs.findIndex(
                    (item) => item.nodeID === overrideConfig.nodeID
                  );
                  console.log(
                    "Pre-result",
                    JSON.parse(
                      JSON.stringify(reversedNodeConfigs[targetIndex].configs)
                    ),
                    JSON.parse(JSON.stringify(targetConfig.configs))
                  );
                  reversedNodeConfigs[targetIndex].configs = Object.assign(
                    reversedNodeConfigs[targetIndex].configs,
                    targetConfig.configs
                  );

                  console.log(
                    "Result",
                    JSON.parse(
                      JSON.stringify(reversedNodeConfigs[targetIndex].configs)
                    )
                  );
                }
              });
            }
          }
        });
        let tempOverrideConfigs = [...overrideConfigs];
        if (!tempOverrideConfigs) {
          tempOverrideConfigs =
            nodeContent.entityBasic.inheritedConfigs !== ""
              ? JSON.parse(nodeContent.entityBasic.inheritedConfigs)
              : [];
        }

        defConfig = JSON.parse(JSON.stringify(reversedNodeConfigs.reverse()));

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

              if (targetConfig === undefined) {
                console.log(
                  "No target config found for",
                  overrideConfig.nodeID
                );
                return;
              }

              targetConfig.configs.map((conf) => {
                // Iterating through all values on this config
                conf.values = conf.values.map((value) => {
                  // console.log('CONFIG: ', conf, conf.name, 'Iterating through value', value, overrideConfig.configs, conf.id)
                  const overrideValueSegments = findValueInConfig(
                    overrideConfig.configs,
                    conf.sid,
                    value.sid
                  );
                  // console.log('CONFIG: ', conf.name, 'Got value from override:', overrideValueSegments)
                  if (
                    !value.values &&
                    overrideValueSegments !== null &&
                    overrideValueSegments !== undefined
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

        // console.log('Resolving inheritance:', reversedNodeConfigs)

        return reversedNodeConfigs.reverse();
      }

      gatherInheritedConfigs(parentCategory);

      setInheritedCategories(tempInheritedCategories);

      if (inheritedConfigs.length > 0) {
        inheritedConfigs = resolveInheritance(inheritedConfigs);
        if (getResultConfigs) {
          getResultConfigs(mainConfigs, inheritedConfigs);
        }
        setInheritedConfigs(inheritedConfigs);
      }
      // Do this to prevent any changes from affecting default inherited configs variable
      let tempConfigs = JSON.stringify(defConfig);
      setDefaultInheritedConfigs(JSON.parse(tempConfigs));
      tempConfigs = "";
    }
  }, [dataNodes, overrideConfigs, nodeContent]);

  function addNewConfigLocally() {
    let id =
      selectedType === "basic"
        ? nodeContent.entityBasic.entityID
        : nodeContent.entityCategory.categoryID;
    const newConfig = {
      sid: shortid.generate(),
      id: `${id}-${mainConfigs.length + 1}`,
      values: [],
    };

    setMainConfigs([...mainConfigs, newConfig]);
  }
  function onConfigRemoved(sid) {
    setMainConfigs((prevConfigs) => {
      const index = prevConfigs.findIndex((config) => config.sid === sid);

      if (index !== -1) {
        const updatedConfigs = [...prevConfigs];
        updatedConfigs.splice(index, 1);
        return updatedConfigs;
      }

      return prevConfigs;
    });
  }

  const [mainConfigSaveError, setMainConfigSaveError] = useState(undefined);
  async function onMainConfigSaved(newConfig) {
    let doublesMessage = "";
    let valueIDMap = {};

    function recursivelyFindValue(object, valueIDMap) {
      if (object.valueID) {
        if (!valueIDMap[object.valueID]) {
          valueIDMap[object.valueID] = [];
        }
        valueIDMap[object.valueID].push(
          `${object.valueID} (${object.type})` || "Unnamed object"
        );
      }

      if (object.values) {
        for (let i = 0; i < object.values.length; i++) {
          recursivelyFindValue(object.values[i], valueIDMap);
        }
      }
    }

    newConfig.values.forEach((val) => {
      recursivelyFindValue(val, valueIDMap);
    });
    for (let [id, names] of Object.entries(valueIDMap)) {
      if (names.length > 1) {
        doublesMessage += `\nValue with ID "${id}" already exists: ${names.join(", ")}`;
      }
    }

    if (doublesMessage !== "") {
      setMainConfigSaveError(doublesMessage);
    } else {
      setMainConfigSaveError("");
      setMainConfigs((prevConfigs) => {
        let temp = prevConfigs.map((config) => {
          if (config.sid === newConfig.sid) {
            return newConfig;
          }
          return config;
        });
        saveMainConfig(
          game.gameID,
          branch,
          nodeContent.nodeID,
          JSON.stringify(temp)
        );
        onMainConfigChange(JSON.stringify(temp));
        return temp;
      });
    }
  }

  async function onInheritedConfigSaved(newConfig, nodeID) {
    let tempConfigs = [...inheritedConfigs];
    tempConfigs.forEach((config) => {
      if (config.nodeID === nodeID) {
        config.configs = config.configs.map((config) => {
          if (config.sid === newConfig.sid) {
            return newConfig;
          }
          return config;
        });
      }
    });
    setInheritedConfigs(tempConfigs);
    onInheritedConfigChange(JSON.stringify(tempConfigs));
    saveInheritedConfig(
      game.gameID,
      branch,
      nodeContent.nodeID,
      JSON.stringify(tempConfigs)
    );
  }

  const timeoutRef_MainConfig = useRef(null);
  const timeoutRef_InheritedConfig = useRef(null);
  // Save configs to backend
  function saveMainConfig(gameID, branch, nodeID, string) {
    clearTimeout(timeoutRef_MainConfig.current);
    timeoutRef_MainConfig.current = setTimeout(() => {
      saveMainConfigAsync(gameID, branch, nodeID, string);
    }, 300);
  }
  async function saveMainConfigAsync(gameID, branch, nodeID, string) {
    setSaveInProgress(true);

    if (!gameID || preventSave) {
      setSaveInProgress(false);
      return;
    }
    const response = await saveEntityMainConfigs({
      gameID: gameID,
      branch: branch,
      nodeID: nodeID,
      mainConfigs: string,
      isCategory: nodeContent.entityCategory ? true : false,
    });
    setSaveInProgress(false);
  }

  function saveInheritedConfig(gameID, branch, nodeID, string) {
    clearTimeout(timeoutRef_InheritedConfig.current);
    timeoutRef_InheritedConfig.current = setTimeout(() => {
      saveInheritedConfigAsync(gameID, branch, nodeID, string);
    }, 300);
  }
  async function saveInheritedConfigAsync(gameID, branch, nodeID, string) {
    setSaveInProgress(true);
    if (preventSave) {
      setSaveInProgress(false);
      return;
    }
    const response = await saveEntityInheritedConfigs({
      gameID: gameID,
      branch: branch,
      nodeID: nodeID,
      inheritedConfigs: string,
      isCategory: nodeContent.entityCategory ? true : false,
    });
    setSaveInProgress(false);
  }

  return (
    <div className={s.remoteConfigContainer}>
      <PropsBuilder
        nodeContent={nodeContent}
        mainConfigs={mainConfigs}
        inheritedConfigs={inheritedConfigs}
        defaultInheritedConfigs={defaultInheritedConfigs}
        onMainConfigSaved={onMainConfigSaved}
        onInheritedConfigSaved={onInheritedConfigSaved}
        onConfigAdded={addNewConfigLocally}
        onConfigRemoved={onConfigRemoved}
        dataNodes={dataNodes}
        saveInProgress={saveInProgress}
        saveError={mainConfigSaveError}
        disableIDChanging={disableIDChanging}
        disableFieldRemoval={disableFieldRemoval}
        disableCreation={disableCreation}
        defaultCompareSegment={defaultCompareSegment}
        defaultCurrentSegment={defaultCurrentSegment}
      />
    </div>
  );
};

export default RemoteConfig;
