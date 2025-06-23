import React, { useRef, useState, useEffect } from "react";
import Navbar from "../../navbar/Navbar.jsx";
import EntityTree from "./EntitiesTree.jsx";
import EntitiesSidebar from "./EntitiesSidebar.jsx";
import EntityContextMenu from "./EntityContextMenu.jsx";
import Node from "../node/NodeOverview.jsx";
import { useGame, useBranch } from "@strix/gameContext";

import useApi from "@strix/api";

import { useNavigate } from "react-router-dom";
import { useLocation, useParams } from "react-router-dom";

import { CustomDragLayer } from "./CustomDragLayer.jsx";

import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import LMBIcon from "./LMBicon.svg?react";
import styles from "./css/entities.module.css";
import { useAlert } from "@strix/alertsContext";

import { filterTree } from "./treeFiltering/filterTreeUtil";

import titles from "titles";

const Entities = () => {
  const { game, branch, environment } = useGame();
  const { triggerAlert } = useAlert();

  const {
    getNodeTree,
    getPlanningNodes,
    getNode,
    moveNodeInTree,
    addChildNodeInTree,
    removeNodeFromTree,
    getABTests,
  } = useApi();
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [contextMenuTargetNode, setContextMenuTargetNode] = useState();
  const [isRootNode, setIsRootNode] = useState(false);

  const [nodeOpened, setNodeOpened] = useState(false);
  const [treeData, setTreeData] = useState({});
  const [nodeData, setNodeData] = useState({});
  const [abTests, setAbTests] = useState([]);

  const [hoveredNode, setHoveredNode] = useState({});

  const [openedNode, setOpenedNode] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const entityTreeRef = useRef();

  const [dataLoading, setDataLoading] = useState(true);
  const [otherLoading, setOtherLoading] = useState(false);

  const [entityFilters, setEntityFilters] = useState({
    nameFilter: "",
    groupFilter: [],
  });

  function remakeSiteTitle() {
    if (openedNode !== "") {
      document.title = `Entity: ${openedNode.name}`;
    } else {
      document.title = titles.entity;
    }
  }
  remakeSiteTitle();

  useEffect(() => {
    remakeSiteTitle();
  }, [openedNode]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const nodeDataResponse = await getPlanningNodes({
        gameID: game.gameID,
        branch: branch,
        planningType: "entity",
      });
      setNodeData(nodeDataResponse.nodes);
      // console.log('Fetch nodes data:', nodeDataResponse.nodes)
    } catch (err) {
      if (err.response.data.error === "Game not found") {
        navigate("/overview");
      }
      console.log(err);
    }
    try {
      const treeDataResponse = await getNodeTree({
        gameID: game.gameID,
        branch: branch,
        planningType: "entity",
      });
      setTreeData(treeDataResponse.nodes[0]);
    } catch (err) {
      console.log(err);
    }

    const respABTests = await getABTests({
      gameID: game.gameID,
      branch: branch,
    });
    if (respABTests.success) {
      setAbTests(respABTests.abTests);
    }

    setDataLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [contextMenuAnchorEl, setContextMenuAnchorEl] = useState(null);
  const [currentContextMenuNode, setCurrentContextMenuNode] = useState();
  const [
    currentContextMenuNodeChildrenCount,
    setCurrentContextMenuNodeChildrenCount,
  ] = useState(0);
  const contextMenuOpen = Boolean(contextMenuAnchorEl);

  const handleContextMenu = (event, node, childrenCount) => {
    if (node.ID === "Root") {
      setContextMenuAnchorEl(null);
      setCurrentContextMenuNode();
    } else {
      setContextMenuAnchorEl(event.currentTarget);
      setCurrentContextMenuNode(node);
      setCurrentContextMenuNodeChildrenCount(childrenCount);
    }
  };

  const handleMenuItemClick = (menuItem) => {
    closeContextMenu();

    if (isRootNode === false) {
      switch (menuItem) {
        case 0:
          // Calling EntitiesTree function to expand node
          entityTreeRef.current.handleContextMenuExpandClicked(
            currentContextMenuNode
          );
          break;
        case 1:
          openNode(currentContextMenuNode.ID);
          break;
        case 2:
          // Using uniqueID for tree nodes because we want it to be unique since there can be more than 1 node in tree with same nodeID
          onRemoveNodeFromTree(
            currentContextMenuNode.uniqueID,
            currentContextMenuNode.ID
          );
          break;
        default:
      }
    }
  };

  function tryToCloseNode(nodeID) {
    if (openedNode.nodeID === nodeID) {
      closeNode();
    }
  }

  const closeNode = () => {
    setNodeOpened(false);
    setOpenedNode("");
    remakeSiteTitle();
  };

  const [isLoading, setIsLoading] = useState(false);
  const openNode = async (nodeID) => {
    try {
      setIsLoading(true);
      const response = await getNode({
        gameID: game.gameID,
        branch: branch,
        nodeID: nodeID,
      });
      setOpenedNode(response);
      setNodeOpened(true);
      setIsLoading(false);
    } catch (err) {
      console.log(err);
    }
  };
  const onRemoveNodeFromTree = async (uniqueID, nodeID) => {
    // Test if deleted node is being tested
    const test = abTests.find((t) =>
      t.subject.some((s) => s.itemID === nodeID)
    );
    if (test) {
      triggerAlert(
        `Cannot remove node because of ongoing AB test "${test.name}". Stop & remove the test first.`,
        "error"
      );
      return;
    }

    if (abTests.length > 0) {
      let check = [];
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
      const targetNode = findNodeByID(treeData, uniqueID);
      function traverseChildrenForAbTest(node) {
        node.Subnodes.forEach((subnode) => {
          const t = abTests.find((t) =>
            t.subject.some((s) => s.itemID === subnode.ID)
          );
          if (t) {
            check.push(t);
          } else {
            traverseChildrenForAbTest(subnode);
          }
        });
      }
      traverseChildrenForAbTest(targetNode);
      if (check.length > 0) {
        triggerAlert(
          `Cannot remove node because it's children have an ongoing AB tests: ${check.map((t) => `"${t.name}"`).join(", ")}. Stop & remove tests first.`,
          "error"
        );
        return;
      }
    }

    try {
      const response = await removeNodeFromTree({
        gameID: game.gameID,
        branch: branch,
        planningType: "entity",
        nodeID: uniqueID,
      });
      fetchData();
    } catch (error) {
      console.log(error);
    }
  };
  function closeContextMenu() {
    setContextMenuAnchorEl(null);
    setCurrentContextMenuNode();
  }
  const onDragStart = (e, nodeID) => {};

  const lastSavedNodeContent = useRef(null);
  function saveOpenedNodeLocally(nodeContent) {
    // preventing infinite loop
    if (lastSavedNodeContent.current !== JSON.stringify(nodeContent)) {
      lastSavedNodeContent.current = JSON.stringify(nodeContent);
    } else {
      return;
    }

    setOpenedNode(nodeContent);
    let temp = nodeData.map((dataItem) =>
      dataItem.nodeID === nodeContent.nodeID ? nodeContent : dataItem
    );
    setNodeData(temp);
  }

  // Called from the BulkEditConfig component to apply made changes of the Inherited configs to the local data,
  // otherwise we won't see the changes after switching to the node until we refresh the page
  function propagateLocalChanges(nodeID, string) {
    let temp = nodeData.map((dataItem) =>
      dataItem.nodeID === nodeID
        ? {
            ...dataItem,
            entityBasic: { ...dataItem.entityBasic, inheritedConfigs: string },
          }
        : dataItem
    );
    console.log("Propagating local changes", temp);
    setNodeData(temp);
  }

  async function addNewNode({ newNode, parentNode, addOperation }) {
    // console.log('Trying to send', newNode, 'to', parentNode, 'with ID of', parentNode.uniqueID)
    setOtherLoading(true);
    if (parentNode.uniqueID !== undefined) {
      try {
        if (addOperation) {
          const response = await addChildNodeInTree({
            gameID: game.gameID,
            branch: branch,
            planningType: "entity",
            parentId: parentNode.uniqueID,
            newNode: newNode,
          });
        } else {
          // Test if deleted node is being tested
          const test = abTests.find((t) =>
            t.subject.some((s) => s.itemID === newNode.ID)
          );
          if (test) {
            triggerAlert(
              `Cannot move node because of ongoing AB test "${test.name}". Stop & remove the test first.`,
              "error"
            );
            return;
          }

          if (abTests.length > 0) {
            let check = [];
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
            const targetNode = findNodeByID(treeData, newNode.uniqueID);
            function traverseChildrenForAbTest(node) {
              node.Subnodes.forEach((subnode) => {
                const t = abTests.find((t) =>
                  t.subject.some((s) => s.itemID === subnode.ID)
                );
                if (t) {
                  check.push(t);
                } else {
                  traverseChildrenForAbTest(subnode);
                }
              });
            }
            traverseChildrenForAbTest(targetNode);
            if (check.length > 0) {
              triggerAlert(
                `Cannot move node because it's children have an ongoing AB tests: ${check.map((t) => `"${t.name}"`).join(", ")}. Stop & remove tests first.`,
                "error"
              );
              return;
            }
          }
          const response = await moveNodeInTree({
            gameID: game.gameID,
            branch: branch,
            planningType: "entity",
            nodeToMove: newNode,
            destinationID: parentNode.uniqueID,
          });
        }
        // console.log('D&D data outgoing:', {gameID: game.gameID, branch: branch, planningType: 'entity', nodeToMove: newNode.ID, destinationID: parentNode.uniqueID})
        await fetchData();
      } catch (error) {
        setOtherLoading(false);
      }
    }
    setOtherLoading(false);
  }

  if (treeData.ID === undefined || !nodeData) {
    if (nodeData) {
      return (
        <Backdrop sx={{ color: "#fff", zIndex: 2 }} open={true}>
          <CircularProgress color="inherit" />
        </Backdrop>
      );
    }
  }

  function onEntityFiltersChange(nodes) {
    setEntityFilters(nodes);
  }
  function applyEntityFilter(tree) {
    if (entityFilters.nameFilter || entityFilters.groupFilter.length > 0) {
      let processedData = tree.Subnodes ? [...tree.Subnodes] : [];

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
      processedData = addNameToTree(tree, nodeData);
      let filtered = filterTree(
        processedData,
        entityFilters.nameFilter,
        entityFilters.groupFilter
      );
      return filtered;
    }
    return tree;
  }

  return (
    <div className={styles.main}>
      <Backdrop sx={{ color: "#fff", zIndex: 2 }} open={isLoading}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <div className={styles.containersColumn}>
        <CustomDragLayer />
        <div className={styles.containers}>
          <aside className={styles.sidebarRight}>
            <EntitiesSidebar
              dataTree={treeData}
              dataNodes={nodeData}
              onNodeOpened={openNode}
              onAddNewNode={addNewNode}
              onDragStart={onDragStart}
              askReFetchData={fetchData}
              onNodeRemoved={tryToCloseNode}
              onEntityFiltersChange={onEntityFiltersChange}
            />
          </aside>
          <div className={styles.workspace}>
            {nodeOpened ? (
              <main className={styles.nodeContainer}>
                <Node
                  open={nodeOpened}
                  nodeContentDefault={openedNode}
                  dataNodes={nodeData}
                  dataTree={treeData}
                  onNodeSaved={saveOpenedNodeLocally}
                  onClose={closeNode}
                  propagateLocalChanges={propagateLocalChanges}
                />
              </main>
            ) : (
              <div></div>
            )}
            <main className={styles.treeContainer}>
              <EntityTree
                ref={entityTreeRef}
                onAddNewNode={addNewNode}
                initialDataRaw={applyEntityFilter(treeData)}
                nodeData={nodeData}
                onContextMenuOpen={handleContextMenu}
                quickOpen={(nodeID) => openNode(nodeID)}
              />
              <Backdrop
                sx={{
                  position: "absolute",
                  color: "#fff",
                  zIndex: (theme) => theme.zIndex.drawer + 1,
                }}
                open={dataLoading || otherLoading}
              >
                <CircularProgress color="inherit" />
              </Backdrop>
            </main>
          </div>
        </div>
      </div>

      <Popover
        id={"nodeContextMenu"}
        open={contextMenuOpen}
        anchorEl={contextMenuAnchorEl}
        onClose={closeContextMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Stack spacing={0} sx={{ p: 1 }}>
          {/* {currentContextMenuNodeChildrenCount > 0 && (
            <Button
              sx={{
                color: "#cbcbcb",
                height: "50px",
                display: "flex",
                alignItems: "center",
              }}
              aria-describedby={"expand node"}
              variant="text"
              onClick={() => handleMenuItemClick(0)}
            >
              Show/hide children
              <div className={styles.controlsHint}>
                Shift + <LMBIcon className={styles.LMBIcon} />
              </div>
            </Button>
          )} */}
          <Button
            sx={{
              height: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            aria-describedby={"open node"}
            variant="text"
            onClick={() => handleMenuItemClick(1)}
          >
            Open node
            <div className={styles.controlsHint}>
              ctrl + <LMBIcon className={styles.LMBIcon} />
            </div>
          </Button>
          <Button
            sx={{
              height: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            aria-describedby={"remove node"}
            variant="text"
            onClick={() => handleMenuItemClick(2)}
          >
            Remove from tree
          </Button>
        </Stack>
      </Popover>

      {/* <EntityContextMenu
      x={contextMenuPosition.x}
      y={contextMenuPosition.y}
      isVisible={contextMenuVisible}
      onMenuItemClick={handleMenuItemClick}
      isRootNode={isRootNode}
      targetNode={contextMenuTargetNode}
      /> */}
    </div>
  );
};

export default Entities;
