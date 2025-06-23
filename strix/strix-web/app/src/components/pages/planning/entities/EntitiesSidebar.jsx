import React, { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { TreeView } from "@mui/x-tree-view";
import { TreeItem } from "@mui/x-tree-view";
import uuid from "react-uuid";
import { useRef } from "react";
import { useGame, useBranch } from "@strix/gameContext";

import useApi from "@strix/api";

import ListNodeItem from "./ListNodeItem";
import { useDrag } from "react-dnd";

import TextField from "@mui/material/TextField";
import { uniq } from "lodash";

import {
  filterTree,
  expandFilteredNodes,
  getIDsExpandFilter,
} from "./treeFiltering/filterTreeUtil";
import Button from "@mui/material/Button";
import styles from "./css/entitiesSidebar.module.css";
import NewNodeModal from "./modal/NewNodeModal.jsx";
import shortid from "shortid";
import AddSharpIcon from "@mui/icons-material/AddSharp";
import ExpandSharpIcon from "@mui/icons-material/ExpandSharp";
import { useThemeContext } from "@strix/themeContext";
import { Typography, Tooltip } from "@mui/material";
import FolderOpenSharpIcon from "@mui/icons-material/FolderOpenSharp";

import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { OutlinedInput } from "@mui/material";
import { InputAdornment } from "@mui/material";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import { DndProvider, useDrop } from "react-dnd";
import { useDragLayer } from "react-dnd";

const EntitiesSidebar = ({
  dataTree,
  dataNodes,
  onNodeOpened,
  onDragStart,
  askReFetchData,
  onNodeRemoved,
  onAddNewNode,

  onEntityFiltersChange,
}) => {
  const { theme } = useThemeContext();

  const { game } = useGame();
  const { branch, environment } = useBranch();

  const { removePlanningNode } = useApi();

  const [currentDataTree, setCurrentDataTree] = useState(dataTree);
  const dataTreeRef = useRef(dataTree);
  const [currentDataNodes, setCurrentDataNodes] = useState(dataNodes);
  const dataNodesRef = useRef(dataNodes);

  const [showNewNodeModal, setShowNewNodeModal] = useState(false);

  const [processedData, setProcessedData] = useState();

  const [expanded, setExpanded] = useState([]);
  const [selected, setSelected] = useState([]);
  const [subjectData, setSubjectData] = useState();
  const [selectedSingleItem, setSelectedSingleItem] = useState("");

  const [groupFilter, setGroupFilter] = useState([]);
  const [allEntityGroups, setAllEntityGroups] = useState([]);
  const [nameFilter, setNameFilter] = useState("");

  const hoveredNodeRef = useRef(null);

  function onHoverNode(node) {
    hoveredNodeRef.current = node;
  }
  function onUnhoverNode() {
    hoveredNodeRef.current = {};
  }
  const getAllIds = (node) => {
    // Getting all uniqueIDs of nodes' children
    const ids = [];

    const traverse = (node) => {
      if (node.uniqueID) {
        ids.push(node.uniqueID);
      }

      if (node.Subnodes) {
        node.Subnodes.forEach((subnode) => traverse(subnode));
      }
    };

    traverse(node);

    return ids;
  };
  const [{ item, itemType }, drop] = useDrop(() => ({
    accept: "node",
    drop: (item, monitor) =>
      transientAddNewNodeToTree(item, hoveredNodeRef.current),
    collect: (monitor) => ({
      itemType: monitor.getItemType(),
      item: monitor.getItem(),
    }),
  }));
  async function transientAddNewNodeToTree(newNode, parentNode) {
    let draggedNode;

    // Check if we aren't trying to add the same node to itself
    if (newNode.ID === parentNode.ID) return;
    if (newNode) {
      draggedNode = findNodeByUniqueID(dataTreeRef.current, newNode.uniqueID);
      let affectedNodes = [];
      // Checking if the parent node is category
      if (!parentNode.isCategory) return;

      if (draggedNode) {
        affectedNodes = getAllIds(newNode);
      }
      // Checking if we aren't trying to add PARENT to the CHILD (must be impossible)
      if (affectedNodes.includes(parentNode.uniqueID)) return;

      // Checking if we aren't trying to add child to the same parent it has already
      let parentNodeInTree = findNodeByUniqueID(
        dataTreeRef.current,
        parentNode.uniqueID
      );
      if (
        parentNodeInTree.Subnodes.some(
          (subnode) => subnode.uniqueID === newNode.uniqueID
        )
      ) {
        return;
      }
    }
    // Also set 'true' to 'addOperation' if draggedNode is null, as it means we are trying to add new node to the tree
    await onAddNewNode({
      newNode: newNode,
      parentNode: parentNode,
      addOperation: draggedNode === null,
    });
  }

  const { isDragging } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));

  useEffect(() => {
    // get all possible groups
    const allGroups = uniq(
      dataNodes.map((node) => node.groupName).filter(Boolean)
    );
    setAllEntityGroups(allGroups || []);
  }, [dataNodes]);

  // Need to compare actual nodes with tree data. If no node found in tree, put it to uncategorized tree
  function findNodeByID(node, targetNodeID) {
    if (node.ID === targetNodeID) {
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
  function findNodeByUniqueID(node, targetNodeID) {
    if (node.uniqueID === targetNodeID) {
      return node;
    }
    for (const subnode of node.Subnodes) {
      const result = findNodeByUniqueID(subnode, targetNodeID);
      if (result) {
        return result;
      }
    }
    return null;
  }

  // Refs to make sure we don't accidentally open node while we want to drag
  const mouseWentOffOnce = useRef(false);
  const openNodeIsHanging = useRef(false);
  const handleClick = (e, nodeID) => {
    if (mouseWentOffOnce.current === false) {
      if (nodeID !== "Uncategorized") {
        onNodeOpened(nodeID);
      }
    }
  };

  // Process dataRaw and form processedData for further filtering
  function processDataRaw(dataTreeList, dataNodesList) {
    let processedData = dataTreeList.Subnodes ? [...dataTreeList.Subnodes] : [];

    const idToNameMap = {};
    const idToCategoryMap = {};
    const idToGroupNameMap = {};
    function addNameToTree(tree, nodeList) {
      //  nodeID to name
      nodeList.forEach((item) => {
        idToNameMap[item.nodeID] = item.name;
        idToCategoryMap[item.nodeID] = item.entityCategory ? true : false;
        idToGroupNameMap[item.nodeID] = item.groupName;
      });

      const traverseTree = (node) => {
        if (node.ID === "Uncategorized" || node.ID === "Root") {
          node.Name = node.ID;
        } else {
          node.Name = idToNameMap[node.ID];
          node.isCategory = idToCategoryMap[node.ID];
          node.groupName = idToGroupNameMap[node.ID];
        }

        node.Subnodes.forEach((subnode) => {
          traverseTree(subnode);
        });
      };

      traverseTree(tree);

      return tree;
    }
    processedData = addNameToTree(dataTreeList, dataNodesList);

    const addToRootUncategorized = (nodeID, name, uniqueID, isCategory) => {
      const root = processedData;
      if (root) {
        const uncategorizedNode = root.Subnodes.find(
          (node) => node.ID === "Uncategorized"
        );

        if (uncategorizedNode) {
          // If Uncat node exists, just put a node into Subnodes of it
          uncategorizedNode.Subnodes.push({
            ID: nodeID,
            Name: name,
            isCategory: isCategory,
            Subnodes: [],
            uniqueID: uniqueID,
          });
        } else {
          // If Uncat node doesnt exist, add it and put node inside Subnodes
          root.Subnodes.push({
            ID: "Uncategorized",
            Name: "Uncategorized",
            Subnodes: [
              {
                ID: nodeID,
                Name: name,
                Subnodes: [],
                uniqueID: uniqueID,
                isCategory: isCategory,
              },
            ],
            uniqueID: "Uncategorized",
          });
        }
      }
    };
    dataNodesList.forEach((item) => {
      const existingNode = findNodeByID(processedData, item.nodeID);
      if (!existingNode) {
        addToRootUncategorized(
          item.nodeID,
          item.name,
          item.uniqueID,
          idToCategoryMap[item.nodeID]
        );
      }
    });
    return processedData;
  }

  useEffect(() => {
    if (currentDataNodes && currentDataNodes.length > 0) {
      const result = processDataRaw(currentDataTree, currentDataNodes);
      setProcessedData(JSON.parse(JSON.stringify(result)));
    } else {
      setProcessedData();
    }
  }, [currentDataNodes, currentDataTree]);

  useEffect(() => {
    setSubjectData(() => processedData);
  }, [processedData]);

  const [treeItems, setTreeItems] = useState([]);
  useEffect(() => {
    if (subjectData !== undefined) {
      // Make a timeout or else it will get a weird bug with Subnodes array.
      // In populateTreeList() it will pass an object with i.e. 5 Subnodes, but the renderNode and map function will only handle 4 for some reason.
      // And if you do console.log of passing object, in the developer tools you will see 4 Subnodes on a preview, but once you expand the list, its 5. I dunno man it seems sussy
      // setTimeout(() => {
      //   const newTreeItems = populateTreeList(subjectData);
      //   setTreeItems(newTreeItems);
      // }, 1000);
    }
  }, [subjectData]);

  useEffect(() => {
    if (dataNodes) {
      // Deep copy to prevent data change in another components
      setCurrentDataNodes(JSON.parse(JSON.stringify(dataNodes)));
      dataNodesRef.current = JSON.parse(JSON.stringify(dataNodes));
    }
  }, [dataNodes]);
  useEffect(() => {
    // Deep copy to prevent data change in another components
    setCurrentDataTree(JSON.parse(JSON.stringify(dataTree)));
    dataTreeRef.current = JSON.parse(JSON.stringify(dataTree));
  }, [dataTree]);

  async function callRemoveNode(nodeID) {
    const res = await removePlanningNode({
      gameID: game.gameID,
      branch: branch,
      nodeID: nodeID,
    });
    askReFetchData();
    onNodeRemoved(nodeID);
  }

  function populateTreeList(subjectData) {
    const tempTreeItems = [];
    const renderNode = (node, defaultColor, defAlpha) => {
      let alpha = defAlpha + 0.2;
      const treeItem = (
        <TreeItem
          // onMouseEnter={() => }
          // onMouseLeave={() => }
          className={styles.nodeItem}
          key={node.uniqueID}
          nodeId={node.uniqueID}
          sx={{
            backgroundColor: `rgba(${defaultColor.r}, ${defaultColor.g}, ${defaultColor.b}, ${alpha})`,
          }}
          label={
            <ListNodeItem
              onMouseEnter={() => {
                if (!openNodeIsHanging.current) {
                  mouseWentOffOnce.current = false;
                }
                onHoverNode(node);
              }}
              onMouseLeave={() => {
                mouseWentOffOnce.current = true;
                onUnhoverNode();
              }}
              onMouseDown={() => {
                openNodeIsHanging.current = true;
              }}
              onMouseUp={() => {
                openNodeIsHanging.current = false;
              }}
              handleClick={handleClick}
              node={node}
              onRemove={callRemoveNode}
            ></ListNodeItem>
          }
        >
          {node.Subnodes &&
            node.Subnodes.length > 0 &&
            node.Subnodes.map((n) =>
              renderNode(n, defaultColor, defAlpha + 0.1)
            )}
        </TreeItem>
      );
      return treeItem;
    };
    const defaultColor =
      theme !== "light" ? { r: 0, g: 0, b: 10 } : { r: 255, g: 255, b: 255 };
    const uncategorizedItem = subjectData.Subnodes.find(
      (node) => node.ID === "Uncategorized"
    );
    if (uncategorizedItem) {
      tempTreeItems.push(renderNode(uncategorizedItem, defaultColor, 0));
    }

    subjectData.Subnodes.forEach((node) => {
      if (node.ID !== "Uncategorized") {
        tempTreeItems.push(renderNode(node, defaultColor, 0));
      } else {
      }
    });

    return tempTreeItems.length > 0 ? (
      tempTreeItems
    ) : (
      <Typography sx={{ textAlign: "center", p: 4, userSelect: "none" }}>
        No nodes found
      </Typography>
    );
  }

  const enableNewNodeModal = (e) => {
    setShowNewNodeModal(true);
  };

  const disableNewNodeModal = () => {
    setShowNewNodeModal(false);
  };

  useEffect(() => {
    // First check if there is any data to filter
    if (subjectData) {
      const value = nameFilter;
      const filter = value.trim();
      let expandedTemp = expanded;
      if (!filter && groupFilter.length === 0) {
        setSubjectData(() => processedData);
        onEntityFiltersChange([]);
        setExpanded([]);
        onEntityFiltersChange({ nameFilter: "", groupFilter: [] });
        return;
      }

      let filtered = filterTree(processedData, filter, groupFilter);
      filtered = expandFilteredNodes(filtered, filter, groupFilter);
      if (filtered && filtered.Subnodes) {
        expandedTemp = [];
        expandedTemp.push(...getIDsExpandFilter(filtered));
      }
      setExpanded(uniq(expandedTemp));
      setSubjectData(filtered);
      onEntityFiltersChange({ nameFilter: filter, groupFilter: groupFilter });
    }
  }, [nameFilter, groupFilter, dataNodes]);

  const handleToggle = (event, nodeIds) => {
    let expandedTemp = expanded;
    expandedTemp = nodeIds;
    setExpanded(expandedTemp);
  };

  const handleSelect = (event, nodeIds) => {
    setSelected(nodeIds);
    // When false (default) is a string this takes single string.
    if (!Array.isArray(nodeIds)) {
      setSelectedSingleItem(nodeIds);
    }
    // TODO: When `multiSelect` is true this takes an array of strings
  };

  function expandAllNodes() {
    let tempExpanded = new Set();
    getAllNodeIDs(subjectData, tempExpanded);

    // ,   setExpanded      tempExpanded
    const isAlreadyExpanded = [...tempExpanded].some((id) =>
      expanded.includes(id)
    );

    //  setExpanded      ,   ,
    if (isAlreadyExpanded) {
      setExpanded([]);
    } else {
      setExpanded([...tempExpanded]);
    }
  }
  function toggleGroupFilter(groups) {
    setGroupFilter(groups);
  }

  function getAllNodeIDs(node, idSet) {
    idSet.add(node.uniqueID);

    if (node.Subnodes && node.Subnodes.length > 0) {
      for (const subnode of node.Subnodes) {
        getAllNodeIDs(subnode, idSet);
      }
    }
  }
  return (
    <div className={styles.sidebarBody}>
      <NewNodeModal
        refetch={askReFetchData}
        dataTree={currentDataTree}
        dataNodes={currentDataNodes}
        open={showNewNodeModal}
        handleCloseParent={disableNewNodeModal}
        key={shortid.generate()}
      />

      <div className={styles.searchFilters}>
        {/* <div className={styles.searchContainer}>
              <TextField spellCheck={false} label="Search by name" onKeyUp={onFilterMouseUp} fullWidth size='small'
              sx={{
                '& .MuiInputBase-input': {
                  borderRadius: "2rem",
                }
                }}/>
            </div> */}
        <div className={styles.buttonsContainer}>
          <Tooltip title="Add new entity" disableInteractive>
            <Button
              sx={{
                ml: 2,
                minWidth: "40px",
                width: "40px",
                height: "30px",
                mr: 2,
              }}
              onClick={enableNewNodeModal}
            >
              <AddSharpIcon />
            </Button>
          </Tooltip>

          <TextField
            spellCheck={false}
            label="Name"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            fullWidth
            size="small"
            sx={{
              "& .MuiInputBase-input": {
                borderRadius: "2rem",
              },
              mr: 1,
            }}
          />
          <FormControl size="small" fullWidth sx={{ width: "70%" }}>
            <InputLabel id="groups" sx={{ fontSize: 16 }}>
              Groups
            </InputLabel>
            <Select
              size="small"
              sx={{ fontSize: 16 }}
              labelId="groups"
              id="groups"
              multiple
              value={groupFilter}
              onChange={(e) => {
                toggleGroupFilter(e.target.value);
              }}
              input={
                <OutlinedInput
                  spellCheck={false}
                  id="select-multiple-chip"
                  label="groups"
                />
              }
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 0.5 }}>
                  {selected.length} groups
                </Box>
              )}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 48 * 4.5 + 8,
                    width: 250,
                  },
                },
              }}
            >
              {allEntityGroups.length === 0 && (
                <Typography
                  color="text.disabled"
                  sx={{ pointerEvents: "none", p: 1 }}
                >
                  No groups found
                </Typography>
              )}
              {allEntityGroups.map((group) => (
                <MenuItem key={group} value={group}>
                  {group}
                  {groupFilter.includes(group) ? (
                    <RadioButtonCheckedIcon sx={{ ml: "auto" }} />
                  ) : (
                    <RadioButtonUncheckedIcon sx={{ ml: "auto" }} />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            sx={{
              ml: "auto",
              mr: 2,
            }}
            onClick={expandAllNodes}
          >
            <ExpandSharpIcon sx={{ fontSize: 22 }} />
          </Button>
        </div>
      </div>
      <div className={styles.nodeList}>
        {subjectData ? (
          <TreeView
            aria-label="node list sidebar"
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            expanded={expanded}
            selected={selected}
            onNodeToggle={handleToggle}
            onNodeSelect={handleSelect}
            ref={drop}
            // children={populateTreeList(subjectData)}
          >
            {populateTreeList(subjectData)}
          </TreeView>
        ) : (
          <div className={styles.noNodesPlaceholder}>
            Press + to add new node
          </div>
        )}
      </div>
      {/* {showNewNodeInput && (
        <input style={{ position: 'absolute', top: newNodeInputPosition.y, left: newNodeInputPosition.x }}
          ref={newNodeInputRef}
          type="text"
          value={newNodeInputValue}
          onChange={(e) => setNewNodeInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(e)}
          onBlur={handleInputBlur}
        />
      )} */}
    </div>
  );
};

export default EntitiesSidebar;
