import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as d3 from "d3";
import s from "./css/entityTree.module.css";
import { throttle } from "lodash";

import { DndProvider, useDrop } from "react-dnd";

const EntityTree = forwardRef(
  (
    { onAddNewNode, initialDataRaw, nodeData, onContextMenuOpen, quickOpen },
    ref
  ) => {
    const svgRef = useRef();
    const [currentZoomState, setCurrentZoomState] = useState(null);
    const [gElement, setGElement] = useState(null);

    const container = useRef(null);
    const [width, setWidth] = useState("");
    const [height, setheight] = useState("");
    // Default scale for initial zoom
    const [scale, setScale] = useState(3);

    const [expandedNodes, setExpandedNodes] = useState([initialDataRaw._id]);
    const [visibleNodes, setVisibleNodes] = useState([
      { ID: "Root", Subnodes: [], Level: 0, isCategory: true },
    ]);

    const [nodeDataLocal, setNodeDataLocal] = useState(nodeData);

    const [data, setData] = useState("");

    useEffect(() => {
      if (nodeData !== "" && nodeData !== undefined) {
        setNodeDataLocal(JSON.parse(JSON.stringify(nodeData)));
      }
    }, [nodeData]);

    // First things first, we make sure there are no "Uncategorized" things in our array.
    // This is because sidebar component generates it and it somehow gets here and I dont wanna do deep copy
    let initialDataRawSubnodesCleared;
    if (initialDataRaw.Subnodes !== undefined) {
      initialDataRawSubnodesCleared = initialDataRaw.Subnodes.filter(
        (subnode) => subnode.ID !== "Uncategorized"
      );
    }
    let combinedInitialRawData = JSON.parse(JSON.stringify(initialDataRaw));
    combinedInitialRawData.Subnodes = JSON.parse(
      JSON.stringify(initialDataRawSubnodesCleared)
    );
    const [dataRaw, setDataRaw] = useState(combinedInitialRawData);

    const [initialZoomDone, setInitialZoomDone] = useState(false);

    const [rootNodeWidth, setRootNodeWidth] = useState(50);
    const [nodeWidth, setNodeWidth] = useState(25);

    const hoveredNodeRef = useRef(null);
    const hoveredNode = hoveredNodeRef.current;

    // Getting all _ids of nodes in raw data
    const getAllIds = (combinedInitialRawData) => {
      const ids = [];

      const traverse = (node) => {
        if (node._id) {
          ids.push(node._id);
        }

        if (node.Subnodes) {
          node.Subnodes.forEach((subnode) => traverse(subnode));
        }
      };

      traverse(combinedInitialRawData);

      return ids;
    };

    const getAllIdsForInitialExpand = (combinedInitialRawData) => {
      const ids = [];

      const traverse = (node) => {
        if (node._id && node.Subnodes.length > 0) {
          ids.push(node._id);
        }

        if (node.Subnodes) {
          node.Subnodes.forEach((subnode) => traverse(subnode));
        }
      };

      traverse(combinedInitialRawData);

      return ids;
    };

    useEffect(() => {
      let initialDataRawSubnodesCleared;
      if (initialDataRaw.Subnodes !== undefined) {
        initialDataRawSubnodesCleared = initialDataRaw.Subnodes.filter(
          (subnode) => subnode.ID !== "Uncategorized"
        );
      }
      let combinedInitialRawData = JSON.parse(JSON.stringify(initialDataRaw));
      combinedInitialRawData.Subnodes = JSON.parse(
        JSON.stringify(initialDataRawSubnodesCleared)
      );
      setDataRaw(JSON.parse(JSON.stringify(combinedInitialRawData)));
      setExpandedNodes(getAllIdsForInitialExpand(combinedInitialRawData));
    }, [initialDataRaw]);

    // Close context menu as user clicks on empty space (DEPRECATED)
    const handleCloseContextMenu = (event) => {};

    // Finding the node by ID in raw data JSON from server.
    function findNodeByID(node, targetNodeID) {
      if (node._id === targetNodeID) {
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
    //       (   rawData).
    function countChildren(node) {
      let count = node.Subnodes.length;

      if (count === 0) {
        return count;
      }

      for (const subnode of node.Subnodes) {
        count += countChildren(subnode);
      }

      return count;
    }
    // After we click and unexpand any node, we want to undo expand on its children too
    function clearExpandedNodes(node, targetNodeID) {
      const nodeToStartFrom = findNodeByID(node, targetNodeID);
      // console.log('Node to start from:', nodeToStartFrom, 'searched by ', node, targetNodeID);

      function cycleExpandedNodes(nodeToStartFrom) {
        for (const subnode of nodeToStartFrom.Subnodes) {
          if (expandedNodes.includes(subnode._id)) {
            //  child expanded nodes
            setExpandedNodes((prevExpandedNodes) =>
              prevExpandedNodes.filter((item) => item !== subnode._id)
            );
          }
          cycleExpandedNodes(subnode);
        }
      }
      cycleExpandedNodes(nodeToStartFrom);
    }
    // DoOnce function for initial zoom
    function doOnce(callback) {
      return function () {
        if (!initialZoomDone) {
          callback.apply(this, arguments);
          setInitialZoomDone(true);
        }
      };
    }

    const prevExpandedNodes = useRef("");
    const prevDataRaw = useRef("");
    useEffect(() => {
      if (
        prevDataRaw === JSON.stringify(dataRaw) &&
        prevExpandedNodes === JSON.stringify(expandedNodes)
      ) {
        return;
      } else {
        prevDataRaw.current = JSON.stringify(dataRaw) || "";
        prevExpandedNodes.current = JSON.stringify(expandedNodes) || "";
      }

      // console.log('Initial rawData:', dataRaw)
      if (expandedNodes.length === 0) {
        setExpandedNodes(getAllIdsForInitialExpand(dataRaw));
      }

      //    dataRaw
      function addLevelInfo(node, level) {
        node.level = level;
        node.Subnodes.forEach((subnode) => {
          addLevelInfo(subnode, level + 1);
        });
      }
      if (dataRaw.Subnodes && dataRaw.Subnodes.length > 0) {
        addLevelInfo(dataRaw, 0);
      }
      // console.log('Leveled rawData:', dataRaw)

      let tempVisibleNodes = [
        {
          ID: dataRaw.ID,
          Subnodes: [],
          Level: 0,
          _id: dataRaw._id,
          isCategory: true,
        },
      ];

      const links = [];
      function processNodes(dataRaw, expandedNodes, visibleNodes) {
        if (expandedNodes.includes(dataRaw._id)) {
          // console.log("Processing node:", dataRaw);

          for (const subnode of dataRaw.Subnodes) {
            // console.log("Subnode:", subnode);
            if (!tempVisibleNodes.some((node) => node._id === subnode._id)) {
              const newVisibleNode = {
                ID: subnode.ID,
                Subnodes: [],
                Level: subnode.level,
                _id: subnode._id,
                isCategory: subnode.isCategory,
              };
              tempVisibleNodes.push(newVisibleNode);

              const rootIndex = tempVisibleNodes.findIndex(
                (node) => node._id === dataRaw._id
              );
              tempVisibleNodes[rootIndex].Subnodes.push(subnode._id);
            }
            // Checking if the link isnt already in the array
            if (
              !links.some(
                (link) =>
                  link.source === dataRaw._id && link.target === subnode._id
              )
            ) {
              links.push({ source: dataRaw._id, target: subnode._id });
            }
            processNodes(subnode, expandedNodes, visibleNodes);
          }
          // } else {
        }
      }
      if (dataRaw.Subnodes && dataRaw.Subnodes.length > 0) {
        processNodes(dataRaw, expandedNodes, visibleNodes);
      }

      setData({
        nodes: tempVisibleNodes,
        links: links,
      });

      setVisibleNodes(tempVisibleNodes);
      // console.log("visibleNodes:", tempVisibleNodes, 'data:', {nodes: visibleNodes, links: links});
    }, [dataRaw, expandedNodes]);

    useEffect(() => {
      // Ensure container is properly set
      if (!container.current) return;

      // Get the width and height after the component is rendered
      setWidth(container.current.clientWidth);
      const tempWidth = container.current.clientWidth;
      setheight(container.current.clientHeight);
      const tempHeight = container.current.clientHeight;
    }, []);

    useEffect(() => {
      //  SVG
      const tempWidth = container.current.clientWidth;
      const tempHeight = container.current.clientHeight;
      const zoomWidth = (tempWidth - scale * tempWidth) / 2;
      const zoomHeight = (tempHeight - scale * tempHeight) / 2;

      const svg = d3
        .select(svgRef.current)
        .attr("viewBox", [0, 0, width, height])
        .on("mousedown", handleCloseContextMenu);

      if (!gElement) {
        // Create <g> element if there are none. But before we do, create a filter for glow effect & grid
        let svgGrid = svg
          .append("rect")
          .attr("fill", "url(#grid)")
          .attr("width", "100%")
          .attr("height", "100%");
        // Making filter container for glowing effect on dragging nodes
        let filter = svg
          .append("filter")
          .attr("id", "glow")
          .attr("x", "-50%")
          .attr("y", "-50%")
          .attr("width", "200%")
          .attr("height", "200%");

        // Making blur
        filter
          .append("feGaussianBlur")
          .attr("stdDeviation", "2")
          .attr("result", "coloredBlur");

        // Making color
        filter
          .append("feFlood")
          .attr("flood-color", "#02baff")
          .attr("result", "color");

        // Combining color and blur
        filter
          .append("feComposite")
          .attr("in", "color")
          .attr("in2", "coloredBlur")
          .attr("operator", "in")
          .attr("result", "colorBlur");

        // Merging into glowing effect
        var feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "colorBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");
        //  <g>
        setGElement(svg.append("g"));
        // console.log(" gElement,  ");
      } else {
        // if (!data || !data.Subnodes || data.Subnodes.length === 0) return

        const zoom = d3.zoom().scaleExtent([0.1, 5]).on("zoom", zoomed);

        function zoomed(event) {
          //
          setCurrentZoomState(event.transform);
          gElement.attr("transform", event.transform);
        }

        const operation = doOnce(() => {
          svg.call(
            zoom.transform,
            d3.zoomIdentity.translate(zoomWidth, zoomHeight).scale(scale)
          );
        });
        operation();
        svg.call(zoom).on("dblclick.zoom", null);

        //       "Root"
        data.nodes.find((node) => node.Level === 0).x = width / 2;
        data.nodes.find((node) => node.Level === 0).y = height / 2;

        data.nodes = data.nodes.map((node, index) => {
          return { ...node, index };
        });
        //   1
        let nodesLeft = {};
        let nodesTop = {};
        let nodesRight = {};
        let nodesBottom = {};
        let queueDirections = "bottom";
        data.nodes
          .filter((node) => node.Level === 1)
          .forEach((node) => {
            if (queueDirections === "bottom") {
              node.rootDirection = "bottom";
              nodesBottom[node._id] = node;
              queueDirections = "left";
            } else if (queueDirections === "left") {
              node.rootDirection = "left";
              nodesLeft[node._id] = node;
              queueDirections = "top";
            } else if (queueDirections === "top") {
              node.rootDirection = "top";
              nodesTop[node._id] = node;
              queueDirections = "right";
            } else if (queueDirections === "right") {
              node.rootDirection = "right";
              nodesRight[node._id] = node;
              queueDirections = "bottom";
            }
          });

        //             :
        //  :    ,  ,  ,  ,
        data.nodes
          .filter((node) => node.Level === 1)
          .forEach((node) => {
            // console.log('iterating node1:', node)

            const rootX = data.nodes.find((node) => node.Level === 0).x;
            const rootY = data.nodes.find((node) => node.Level === 0).y;

            function divideIndexByLength(index, length) {
              // If there is only 1 item on the side, return 0.5 or else it will result in wrong placement
              if (length === 1) {
                return 0.5;
              }
              if (index === 0 && length === 0) {
                // Dont know if it even pass this condition but in case it does, return 0.5
                return 0.5;
              } else {
                // If there are more than 1 item on the side, return normal calculation
                return index / (length - 1);
              }
            }
            // Instead of children' getDirectionCount, historically we do have arrays for each side, so take them
            const childrenLengthOnTop = Object.keys(nodesTop).length;
            const childrenLengthOnBottom = Object.keys(nodesBottom).length;
            const childrenLengthOnLeft = Object.keys(nodesLeft).length;
            const childrenLengthOnRight = Object.keys(nodesRight).length;
            // console.log(childrenLengthOnTop, childrenLengthOnBottom, childrenLengthOnLeft, childrenLengthOnRight)

            const nodesDistanceScale = 0.3;
            const nodesMarginScale = 1;
            // console.log('iterating node3:', node)

            // Calculating element position on top & bottom
            const rootTopOffset =
              rootY - (25 * childrenLengthOnTop) / nodesDistanceScale;
            const rootBottomOffset =
              rootY + (25 * childrenLengthOnBottom) / nodesDistanceScale;
            const rootTopLeft =
              rootX - (nodeWidth * childrenLengthOnTop) / nodesMarginScale;
            const rootTopRight =
              rootX + (nodeWidth * childrenLengthOnTop) / nodesMarginScale;
            const rootBottomLeft =
              rootX - (nodeWidth * childrenLengthOnBottom) / nodesMarginScale;
            const rootBottomRight =
              rootX + (nodeWidth * childrenLengthOnBottom) / nodesMarginScale;
            let rootTopPoints =
              rootTopLeft +
              divideIndexByLength(
                Object.values(nodesTop).indexOf(node),
                Object.keys(nodesTop).length
              ) *
                (rootTopRight - rootTopLeft);
            let rootBottomPoints =
              rootBottomLeft +
              divideIndexByLength(
                Object.values(nodesBottom).indexOf(node),
                Object.keys(nodesBottom).length
              ) *
                (rootBottomRight - rootBottomLeft);
            // console.log('iterating node4:', node)
            // console.log('Searching:', Object.values(nodesBottom).indexOf(node))
            // console.log(rootBottomLeft, '+', (divideIndexByLength(Object.values(nodesBottom).indexOf(node), Object.keys(nodesBottom).length) ), '*', rootBottomRight, '-', rootBottomLeft)

            // Calculating element position on left & right
            const rootRightOffset =
              rootX + (25 * childrenLengthOnRight) / nodesDistanceScale;
            const rootLeftOffset =
              rootX - (25 * childrenLengthOnLeft) / nodesDistanceScale;
            const rootRightTop =
              rootY - (nodeWidth * childrenLengthOnRight) / nodesMarginScale;
            const rootRightBottom =
              rootY + (nodeWidth * childrenLengthOnRight) / nodesMarginScale;
            const rootLeftTop =
              rootY - (nodeWidth * childrenLengthOnLeft) / nodesMarginScale;
            const rootLeftBottom =
              rootY + (nodeWidth * childrenLengthOnLeft) / nodesMarginScale;
            let rootRightPoints =
              rootRightTop +
              divideIndexByLength(
                Object.values(nodesRight).indexOf(node),
                Object.keys(nodesRight).length
              ) *
                (rootRightBottom - rootRightTop);
            let rootLeftPoints =
              rootLeftTop +
              divideIndexByLength(
                Object.values(nodesLeft).indexOf(node),
                Object.keys(nodesLeft).length
              ) *
                (rootLeftBottom - rootLeftTop);

            if (nodesBottom.hasOwnProperty(node._id)) {
              node.x = rootBottomPoints;
              node.y = rootBottomOffset;
            } else if (nodesLeft.hasOwnProperty(node._id)) {
              node.x = rootLeftOffset;
              node.y = rootLeftPoints;
            } else if (nodesTop.hasOwnProperty(node._id)) {
              node.x = rootTopPoints;
              node.y = rootTopOffset;
            } else if (nodesRight.hasOwnProperty(node._id)) {
              node.x = rootRightOffset;
              node.y = rootRightPoints;
            }
          });
        //   child-  2   ( - 0,  - 1,  - 2)
        data.nodes
          .filter(
            (node) => expandedNodes.includes(node._id) && node.Level === 1
          )
          .forEach((parentNode) => {
            //             .
            //  ,         .
            //
            let possibleDirections = ["top", "bottom", "left", "right"];

            if (parentNode.rootDirection === "bottom") {
              possibleDirections = ["bottom", "left", "right"];
            } else if (parentNode.rootDirection === "top") {
              possibleDirections = ["top", "left", "right"];
            } else if (parentNode.rootDirection === "left") {
              possibleDirections = ["left", "top", "bottom"];
            } else if (parentNode.rootDirection === "right") {
              possibleDirections = ["right", "bottom", "top"];
            }

            let currentIndex = 0;
            let directionCount = {}; //

            let nodesLeft = [];
            let nodesTop = [];
            let nodesRight = [];
            let nodesBottom = [];

            function getNextDirection() {
              const direction = possibleDirections[currentIndex];
              currentIndex = (currentIndex + 1) % possibleDirections.length;
              incrementDirectionCount(direction);
              return [direction, getDirectionCount(direction)];
            }

            function incrementDirectionCount(direction) {
              if (!directionCount[direction]) {
                directionCount[direction] = 1;
              } else {
                directionCount[direction]++;
              }
            }

            function getDirectionCount(direction) {
              return directionCount[direction] || 0;
            }

            //      parent-   .
            //
            data.nodes
              .filter((node) => parentNode.Subnodes.includes(node._id))
              .forEach((childNode) => {
                childNode.rootDirection = parentNode.rootDirection;
                const nextDirectionObject = getNextDirection();
                childNode.relativeDirection = nextDirectionObject[0];
                childNode.relativeDirectionIndex = nextDirectionObject[1] - 1;

                //
                function addIDsRecursively(node, array) {
                  if (node && node._id) {
                    array.push(node._id);
                  }

                  if (node.Subnodes && node.Subnodes.length > 0) {
                    for (const childNode of node.Subnodes) {
                      addIDsRecursively(childNode, array);
                    }
                  }
                }

                if (childNode.relativeDirection === "bottom") {
                  addIDsRecursively(
                    findNodeByID(dataRaw, childNode._id),
                    nodesBottom
                  );
                } else if (childNode.relativeDirection === "left") {
                  addIDsRecursively(
                    findNodeByID(dataRaw, childNode._id),
                    nodesLeft
                  );
                } else if (childNode.relativeDirection === "top") {
                  addIDsRecursively(
                    findNodeByID(dataRaw, childNode._id),
                    nodesTop
                  );
                } else if (childNode.relativeDirection === "right") {
                  addIDsRecursively(
                    findNodeByID(dataRaw, childNode._id),
                    nodesRight
                  );
                }
              });
            //
            data.nodes
              .filter((node) => parentNode.Subnodes.includes(node._id))
              .forEach((childNode) => {
                //   root-
                const rootX = data.nodes.find((node) => node.Level === 0).x;
                const rootY = data.nodes.find((node) => node.Level === 0).y;
                //   parent-
                const parentNode = data.nodes.find((node) =>
                  node.Subnodes.some((subnodeID) => subnodeID === childNode._id)
                );
                const parentNodeX = parentNode.x;
                const parentNodeY = parentNode.y;
                const nextDirectionName = childNode.relativeDirection;
                const nextDirectionIndex = childNode.relativeDirectionIndex;

                //
                const parentNodesDistanceScale = 0.5;
                const parentNodesMarginScale = 1.5;
                //
                //    /
                //   Math.max           50 .
                //
                const parentTopOffset =
                  parentNodeY -
                  Math.max(50, 25 * getDirectionCount(nextDirectionName)) /
                    parentNodesDistanceScale;
                const parentBottomOffset =
                  parentNodeY +
                  Math.max(50, 25 * getDirectionCount(nextDirectionName)) /
                    parentNodesDistanceScale;
                const parentTopLeft =
                  parentNodeX -
                  (nodeWidth * getDirectionCount(nextDirectionName)) /
                    parentNodesMarginScale;
                const parentTopRight =
                  parentNodeX +
                  (nodeWidth * getDirectionCount(nextDirectionName)) /
                    parentNodesMarginScale;

                function divideIndexByLength() {
                  if (
                    nextDirectionIndex === 0 &&
                    getDirectionCount(nextDirectionName) - 1 === 0
                  ) {
                    return 0.5;
                  } else {
                    return (
                      nextDirectionIndex /
                      (getDirectionCount(nextDirectionName) - 1)
                    );
                  }
                }
                let parentTopPoints =
                  parentTopLeft +
                  divideIndexByLength() * (parentTopRight - parentTopLeft);
                let parentBottomPoints =
                  parentTopLeft +
                  divideIndexByLength() * (parentTopRight - parentTopLeft);
                //
                //
                //   Math.max           50 .
                //
                const parentRightOffset =
                  parentNodeX +
                  Math.max(50, 25 * getDirectionCount(nextDirectionName)) /
                    parentNodesDistanceScale;
                const parentLeftOffset =
                  parentNodeX -
                  Math.max(50, 25 * getDirectionCount(nextDirectionName)) /
                    parentNodesDistanceScale;
                const parentRightTop =
                  parentNodeY -
                  (nodeWidth * getDirectionCount(nextDirectionName)) /
                    parentNodesMarginScale;
                const parentRightBottom =
                  parentNodeY +
                  (nodeWidth * getDirectionCount(nextDirectionName)) /
                    parentNodesMarginScale;
                let parentRightPoints =
                  parentRightTop +
                  divideIndexByLength() * (parentRightBottom - parentRightTop);
                let parentLeftPoints =
                  parentRightTop +
                  divideIndexByLength() * (parentRightBottom - parentRightTop);

                if (childNode.relativeDirection === "bottom") {
                  childNode.x = parentBottomPoints;
                  childNode.y = parentBottomOffset;
                } else if (childNode.relativeDirection === "left") {
                  childNode.x = parentLeftOffset;
                  childNode.y = parentLeftPoints;
                } else if (childNode.relativeDirection === "top") {
                  childNode.x = parentTopPoints;
                  childNode.y = parentTopOffset;
                } else if (childNode.relativeDirection === "right") {
                  childNode.x = parentRightOffset;
                  childNode.y = parentRightPoints;
                }
              });
          });

        //   child-  >2   ( - 0,  - 1,  - 2,  3...4...5...6  )
        data.nodes
          .filter((node) => expandedNodes.includes(node._id) && node.Level >= 2)
          .forEach((parentNode) => {
            const childNodesCount = parentNode.Subnodes.length;
            //      parent-   .
            //
            data.nodes
              .filter((node) => parentNode.Subnodes.includes(node._id))
              .forEach((childNode, index) => {
                childNode.relativeDirection = parentNode.relativeDirection;
                childNode.relativeDirectionIndex = index;
                childNode.rootDirection = parentNode.rootDirection;
              });
            //
            data.nodes
              .filter((node) => parentNode.Subnodes.includes(node._id))
              .forEach((childNode) => {
                // console.log('Processing child node:', childNode)
                //   root-
                const rootX = data.nodes.find((node) => node.Level === 0).x;
                const rootY = data.nodes.find((node) => node.Level === 0).y;
                //   parent-
                const parentNode = data.nodes.find((node) =>
                  node.Subnodes.some((subnodeID) => subnodeID === childNode._id)
                );
                const parentNodeX = parentNode.x;
                const parentNodeY = parentNode.y;

                const nextDirectionName = childNode.relativeDirection;
                const nextDirectionIndex = childNode.relativeDirectionIndex;

                const parentNodesDistanceScale = 1.1;
                const parentNodesMarginScale = 1;

                //    /
                const parentTopOffset =
                  parentNodeY - 100 / parentNodesDistanceScale;
                const parentBottomOffset =
                  parentNodeY + 100 / parentNodesDistanceScale;
                const parentTopLeft =
                  parentNodeX - (45 * childNodesCount) / parentNodesMarginScale;
                const parentTopRight =
                  parentNodeX + (45 * childNodesCount) / parentNodesMarginScale;

                function divideIndexByLength() {
                  if (nextDirectionIndex === 0 && childNodesCount - 1 === 0) {
                    return 0.5;
                  } else {
                    return nextDirectionIndex / (childNodesCount - 1);
                  }
                }
                let parentTopPoints =
                  parentTopLeft +
                  divideIndexByLength() * (parentTopRight - parentTopLeft);
                let parentBottomPoints =
                  parentTopLeft +
                  divideIndexByLength() * (parentTopRight - parentTopLeft);

                //
                const parentRightOffset =
                  parentNodeX +
                  (100 * childNodesCount) / parentNodesDistanceScale;
                const parentLeftOffset =
                  parentNodeX -
                  (100 * childNodesCount) / parentNodesDistanceScale;
                const parentRightTop =
                  parentNodeY - (25 * childNodesCount) / parentNodesMarginScale;
                const parentRightBottom =
                  parentNodeY + (25 * childNodesCount) / parentNodesMarginScale;
                let parentRightPoints =
                  parentRightTop +
                  divideIndexByLength() * (parentRightBottom - parentRightTop);
                let parentLeftPoints =
                  parentRightTop +
                  divideIndexByLength() * (parentRightBottom - parentRightTop);

                if (childNode.relativeDirection === "bottom") {
                  childNode.x = parentBottomPoints;
                  childNode.y = parentBottomOffset;
                } else if (childNode.relativeDirection === "left") {
                  childNode.x = parentLeftOffset;
                  childNode.y = parentLeftPoints;
                } else if (childNode.relativeDirection === "top") {
                  childNode.x = parentTopPoints;
                  childNode.y = parentTopOffset;
                } else if (childNode.relativeDirection === "right") {
                  childNode.x = parentRightOffset;
                  childNode.y = parentRightPoints;
                }
              });
          });

        function findNodesRecursively(node) {
          const foundNodes = [];
          const matchingNode = data.nodes.find(
            (dataNode) => dataNode._id === node._id
          );
          if (matchingNode) {
            foundNodes.push(matchingNode);
          }

          if (node.Subnodes && node.Subnodes.length > 0) {
            for (const subnode of node.Subnodes) {
              foundNodes.push(...findNodesRecursively(subnode));
            }
          }

          return foundNodes;
        }
        function findNodesRecursivelyForBoundingBox(node, firstNode) {
          const foundNodes = [];

          const matchingNode = data.nodes.find(
            (dataNode) => dataNode._id === node._id
          );
          if (
            matchingNode &&
            (!expandedNodes.includes(node._id) || firstNode === "true")
          ) {
            foundNodes.push(matchingNode);
            if (node.Subnodes && node.Subnodes.length > 0) {
              for (const subnode of node.Subnodes) {
                foundNodes.push(
                  ...findNodesRecursivelyForBoundingBox(subnode, "false")
                );
              }
            }
          }

          return foundNodes;
        }

        function flattenNodes(nodesList) {
          const flattenedNodes = [];

          function flattenRecursively(node) {
            if (typeof node === "string") {
              //   -   ,
              return;
            }

            //  Subnodes
            node.Subnodes = [];

            flattenedNodes.push(node);

            if (node.Subnodes && node.Subnodes.length > 0) {
              for (const subnode of node.Subnodes) {
                flattenRecursively(subnode);
              }
            }
          }

          for (const node of nodesList) {
            if (typeof node === "string") {
              //   -   ,
              continue;
            }

            flattenRecursively(node);
          }

          return flattenedNodes;
        }

        function calculateBoundingRect(items) {
          if (items.length === 0) {
            return null;
          }

          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;

          for (const item of items) {
            if (isNaN(item.y) || isNaN(item.x)) continue;
            minX = Math.min(minX, item.x - 30);
            minY = Math.min(minY, item.y - 30);
            maxX = Math.max(maxX, item.x + 30);
            maxY = Math.max(maxY, item.y + 30);
          }

          const width = maxX - minX;
          const height = maxY - minY;

          return {
            minX,
            minY,
            maxX,
            maxY,
            width,
            height,
          };
        }
        // Branches -  ,
        // subBranches - ,         expandedNodes
        let branches = [];
        let subBranches = [];

        function recalculateBranches() {
          branches = [];
          subBranches = [];
          // console.log('Recalculating branches', dataRaw)
          if (!dataRaw || !dataRaw.Subnodes || dataRaw.Subnodes.length === 0)
            return;
          dataRaw.Subnodes.forEach((subnode) => {
            // console.log('Subnode:', nodeDataLocal.find(n => n.nodeID === subnode.ID).name)
            // console.log('', findNodesRecursively(subnode))
            // console.log('', flattenNodes(findNodesRecursively(subnode)))

            const boundingRect = calculateBoundingRect(
              flattenNodes(findNodesRecursively(subnode))
            );

            if (boundingRect) {
              boundingRect._id = subnode._id;
              branches.push(boundingRect);
            }
            // console.log('boundingRect:', boundingRect)
          });
          // console.log('Data before branching:', data)
          expandedNodes.forEach((_id) => {
            if (_id !== undefined) {
              // console.log('Iterating through:', _id)
              let iteratingNode =
                data.nodes.find((node) => node._id === _id)?.Level > 1;
              if (iteratingNode) {
                const boundingRect = calculateBoundingRect(
                  flattenNodes(
                    findNodesRecursivelyForBoundingBox(
                      findNodeByID(dataRaw, _id),
                      "true"
                    )
                  )
                );
                boundingRect._id = _id;
                subBranches.push(boundingRect);
              }
            }
          });
        }

        function findIntersectingRectangles(rectangles) {
          const results = [];
          for (let i = 0; i < rectangles.length; i++) {
            for (let j = i + 1; j < rectangles.length; j++) {
              const rect1 = rectangles[i];
              const rect2 = rectangles[j];

              const minX = Math.max(rect1.minX, rect2.minX);
              const minY = Math.max(rect1.minY, rect2.minY);
              const maxX = Math.min(rect1.maxX, rect2.maxX);
              const maxY = Math.min(rect1.maxY, rect2.maxY);

              const overlapX = maxX - minX;
              const overlapY = maxY - minY;

              if (overlapX > 0 && overlapY > 0) {
                const overlapArea = overlapX * overlapY;
                const leftOverlap = rect2.minX - rect1.minX;
                const rightOverlap = rect1.maxX - rect2.maxX;
                const topOverlap = rect2.minY - rect1.minY;
                const bottomOverlap = rect1.maxY - rect2.maxY;

                results.push({
                  intersectRect: [i, j],
                  output: {
                    rect1,
                    rect2,
                    overlapX,
                    overlapY,
                    overlapArea,
                    leftOverlap,
                    rightOverlap,
                    topOverlap,
                    bottomOverlap,
                  },
                });
              }
            }
          }

          return results;
        }

        //         0  1,  2,1     1,0.5
        function normalizeMultipliers(multipliers) {
          if (Math.abs(multipliers[0]) > Math.abs(multipliers[1])) {
            return [
              multipliers[0] > 0 ? 1 : -1,
              multipliers[1] / Math.abs(multipliers[0]),
            ];
          } else {
            return [
              multipliers[0] / Math.abs(multipliers[1]),
              multipliers[1] > 0 ? 1 : -1,
            ];
          }
        }
        // ,  ""  ""
        //   [1.5, 2].          .
        //      ,   .
        function compareObjects(object1, object2, nodeWidth, rootNodeWidth) {
          //
          const verticalDifference =
            object1.y + nodeWidth / 2 - (object2.y + rootNodeWidth / 2);
          const horizontalDifference =
            object1.x + nodeWidth / 2 - (object2.x + rootNodeWidth / 2);

          //
          const verticalMultiplier = verticalDifference / nodeWidth;
          const horizontalMultiplier = horizontalDifference / nodeWidth;

          const normalizedMultipliers = normalizeMultipliers([
            verticalMultiplier,
            horizontalMultiplier,
          ]);

          return normalizedMultipliers;
        }

        recalculateBranches();
        let intersectingRectangles = findIntersectingRectangles(branches);
        // console.log('Intersect rectangles:', intersectingRectangles, 'for', branches);

        function escapeOverlapMainBranches() {
          intersectingRectangles.forEach((intersect, index) => {
            // console.log('DEBUG: Iterating intersect:', intersect)

            if (intersectingRectangles.length > 0) {
              const multipliers = compareObjects(
                data.nodes.find(
                  (node) =>
                    node._id ===
                    data.nodes[0].Subnodes[intersect.intersectRect[0]]
                ),
                data.nodes[0],
                nodeWidth,
                rootNodeWidth
              );
              // console.log('DEBUG: Multipliers:', multipliers);

              const branchRootNode = data.nodes.find(
                (node) =>
                  node._id ===
                  data.nodes[0].Subnodes[intersect.intersectRect[0]]
              );
              const branchNodes = flattenNodes(
                findNodesRecursively(findNodeByID(dataRaw, branchRootNode._id))
              );

              // console.log('Main Branch intersects:',
              // findNodeByID(dataRaw, intersect.output.rect1._id).Name,
              // findNodeByID(dataRaw, intersect.output.rect2._id).Name,
              // );

              // console.log('branchNodes:', branchNodes, branchRootNode);

              branchNodes.forEach((item) => {
                // -
                //    Math.round        ,
                //   -  .    ,           1   0.1.
                //     "0.1"      "1"  "-1".
                item.x = item.x + 25 * Math.round(multipliers[1]);
                item.y = item.y + 25 * Math.round(multipliers[0]);
                // console.log('Fixing node', 'coordinates:', item.x, item.y, 'Multipliers:', Math.round(multipliers[1]), Math.round(multipliers[0]))
              });
            }
            //     ,
            recalculateBranches();
            intersectingRectangles = findIntersectingRectangles(branches);
            if (intersectingRectangles.length > 0) {
              // console.log('DEBUG: Still intersecting, recurse. IntRect array:', intersectingRectangles)
              escapeOverlapMainBranches();
            }
            // console.log('DEBUG: No intersection found, bye bye')
          });
        }

        function escapeOverlapSubBranches() {
          //          >1
          recalculateBranches();
          intersectingRectangles = findIntersectingRectangles(subBranches);
          // console.log('0', intersectingRectangles)
          intersectingRectangles.forEach((intersect, index) => {
            if (intersectingRectangles.length > 0) {
              // console.log('SubBranch intersect:', intersect);
              let branchRootNode = data.nodes.find(
                (node) => node._id === intersect.output.rect1._id
              );
              // console.log('SubBranch intersect nodeToFix:', branchRootNode);
              let branchNodes;

              //    ,
              const firstRootNode = data.nodes.find(
                (node) => node._id === intersect.output.rect1._id
              );
              const secondRootNode = data.nodes.find(
                (node) => node._id === intersect.output.rect2._id
              );
              if (branchRootNode.rootDirection === "bottom") {
                //  Y-       (.. ).
                const firstRectRootNodeY = firstRootNode.y;
                const secondRectRootNodeY = secondRootNode.y;

                if (firstRectRootNodeY > secondRectRootNodeY) {
                  branchRootNode = firstRootNode;
                } else if (secondRectRootNodeY > firstRectRootNodeY) {
                  branchRootNode = secondRootNode;
                }
              } else if (branchRootNode.rootDirection === "left") {
                //  X-       (.. ).
                const firstRectRootNodeX = firstRootNode.x;
                const secondRectRootNodeX = secondRootNode.x;

                if (firstRectRootNodeX > secondRectRootNodeX) {
                  branchRootNode = secondRootNode;
                } else if (secondRectRootNodeX > firstRectRootNodeX) {
                  branchRootNode = firstRootNode;
                }
              } else if (branchRootNode.rootDirection === "right") {
                //  X-       (.. ).
                const firstRectRootNodeX = firstRootNode.x;
                const secondRectRootNodeX = secondRootNode.x;

                if (firstRectRootNodeX > secondRectRootNodeX) {
                  branchRootNode = firstRootNode;
                } else if (secondRectRootNodeX > firstRectRootNodeX) {
                  branchRootNode = secondRootNode;
                }
              } else if (branchRootNode.rootDirection === "top") {
                //  Y-       (.. ).
                const firstRectRootNodeY = firstRootNode.y;
                const secondRectRootNodeY = secondRootNode.y;

                if (firstRectRootNodeY > secondRectRootNodeY) {
                  branchRootNode = secondRootNode;
                } else if (secondRectRootNodeY > firstRectRootNodeY) {
                  branchRootNode = firstRootNode;
                }
              }

              //   rectangle       ,     ,
              // Calculate the first node
              const nodeInDataRaw = findNodeByID(dataRaw, firstRootNode._id);
              // Calculate if first node has the second node as a child
              const nodeAsChild = findNodeByID(
                nodeInDataRaw,
                secondRootNode._id
              );
              // visibleNodes.find(node => node._id === firstRootNode._id);
              // If first node has second as a child, set branchRootNode as a second.
              if (nodeAsChild) {
                // console.log('DEBUG: Node', secondRootNode, 'is child of', branchRootNode);
                branchRootNode = secondRootNode;
                // console.log('DEBUG: New root node to fix is', branchRootNode);
              }

              //    data.nodes  -   Subnodes,      visibleNodes
              const tempParentID = visibleNodes.find((node) =>
                node.Subnodes.some(
                  (subnodeID) => subnodeID === branchRootNode._id
                )
              )._id;
              const parentOfBranchRootNode = data.nodes.find(
                (node) => node._id === tempParentID
              );

              //     rectangle
              branchNodes = flattenNodes(
                findNodesRecursively(findNodeByID(dataRaw, branchRootNode._id))
              );

              // console.log('DEBUG: Branch root node (AKA clicked node)', branchRootNode);
              // console.log('DEBUG: Parent of root node (AKA parent of clicked node)', parentOfBranchRootNode);

              const multipliers = compareObjects(
                branchRootNode,
                parentOfBranchRootNode,
                nodeWidth,
                nodeWidth
              );
              // console.log('DEBUG: Multipliers:', multipliers, 'arguments:', 'nodewidth:', nodeWidth);

              // console.log('DEBUG: Collected array of children to move away:', branchNodes);
              branchNodes.forEach((item) => {
                // -
                item.x = item.x + 25 * multipliers[1];
                item.y = item.y + 25 * multipliers[0];
                data.nodes[
                  data.nodes.findIndex((node) => node._id === item._id)
                ] = item;
                // console.log('DEBUG: Moved child away, XY coords are:', item.x, item.y);
              });
            }
          });
          recalculateBranches();
          intersectingRectangles = findIntersectingRectangles(subBranches);
          // console.log('DEBUG: Intersect rectangles:', intersectingRectangles);
          if (intersectingRectangles.length > 0) {
            // console.log('DEBUG: Still intersecting, recurse. IntRect array:', intersectingRectangles)
            escapeOverlapSubBranches();
          }
          // console.log('DEBUG: No intersection found, bye bye')
        }
        escapeOverlapMainBranches();
        escapeOverlapSubBranches();

        intersectingRectangles = findIntersectingRectangles(branches);
        escapeOverlapMainBranches();

        function debugDraw(branches) {
          branches.forEach((branch) => {
            const centerX = (branch.minX + branch.maxX) / 2 - branch.width / 2;
            const centerY = (branch.minY + branch.maxY) / 2 - branch.height / 2;
            const debugBox = gElement
              .append("rect")
              .attr("x", centerX)
              .attr("y", centerY)
              .attr("width", branch.width)
              .attr("height", branch.height)
              .style("fill", "red")
              .style("opacity", 0.5);
          });
          subBranches.forEach((branch) => {
            const centerX = (branch.minX + branch.maxX) / 2 - branch.width / 2;
            const centerY = (branch.minY + branch.maxY) / 2 - branch.height / 2;
            const debugBox = gElement
              .append("rect")
              .attr("x", centerX)
              .attr("y", centerY)
              .attr("width", branch.width)
              .attr("height", branch.height)
              .style("fill", "orange")
              .style("opacity", 0.5);
          });
        }
        // debugDraw(branches);

        // console.log('Branches:', branches);
        // console.log('visibleNodes:', visibleNodes);
        // console.log('The data:', data);
        // console.log('Nodes data:', nodeData);
        // console.log('Expanded nodes:', expandedNodes);

        const links = gElement
          .selectAll(".link")
          .data(data.links)
          .enter()
          .append("path")
          .attr("stroke", "#016776")
          .attr("stroke-opacity", 1)
          .attr("stroke-width", 0.7)
          .attr("fill", "none")
          .attr("class", s.link)
          .attr("d", (d) => {
            const sourceNode = data.nodes.find((node) => node._id === d.source);
            const targetNode = data.nodes.find((node) => node._id === d.target);

            const deltaX = targetNode.x - sourceNode.x;
            const deltaY = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            const sourcePaddingX =
              dataRaw._id === d.source ? rootNodeWidth / 2 : nodeWidth / 2;
            const sourcePaddingY =
              dataRaw._id === d.source ? rootNodeWidth / 2 : nodeWidth / 2;
            const targetPaddingX = nodeWidth / 2;
            const targetPaddingY = -nodeWidth / 2;

            const normX = deltaX / dist;
            const normY = deltaY / dist;

            if (normX === 0 || normY === 0) {
              // If the link is perpendicular, use the simple path logic
              const sourceX = sourceNode.x + sourcePaddingX * normX;
              const sourceY = sourceNode.y + sourcePaddingY * normY;
              const targetX = targetNode.x - targetPaddingX * normX;
              const targetY = targetNode.y + targetPaddingY * normY;

              return `M${sourceX},${sourceY} L${targetX},${targetY}`;
            } else {
              const flooredNormX = normX > 0 ? 1 : -1;
              const flooredNormY = normY > 0 ? 1 : -1;

              // If the link is diagonal, build elbow-like path
              const sourceX = sourceNode.x + sourcePaddingX * normX;
              const sourceY = sourceNode.y + sourcePaddingY * flooredNormY;

              const midX = sourceX + (targetNode.x - sourceNode.x) / 3;
              const midY = sourceY + (targetNode.y - sourceNode.y) / 3;

              const targetX = targetNode.x - targetPaddingX * normX;
              const targetY = targetNode.y + targetPaddingY * normY;

              // const startX = sourceNode.x;
              const startX = sourceNode.x;
              const startY = sourceNode.y;

              const endX = targetNode.x;
              const endY = targetNode.y;

              // 1. Starting point
              // 2. Midpoint - lower point (start of the elbow)
              // 3. Midpoint - upper point (end of the elbow)
              // 4. End point
              // if (Math.abs(normY) > Math.abs(normX)) {
              if (
                targetNode.relativeDirection === "bottom" ||
                targetNode.relativeDirection === "top"
              ) {
                return `
         M${sourceX - sourcePaddingX * normX},${startY + sourcePaddingY * flooredNormY}
         L${sourceX - sourcePaddingX * normX},${midY} 
         L${endX},${midY}
         L${endX},${endY + targetPaddingY * flooredNormY}`;
                //  L${targetX+(targetPaddingX)*flooredNorm},${endY}`;
              } else {
                return `
         M${sourceX},${startY}
         L${midX},${startY} 
         L${midX},${endY} 
         L${targetX},${endY}`;
              }
            }
          });

        const nodes = gElement
          .selectAll(".node")
          .data(data.nodes)
          .enter()
          .append("g")
          .attr("class", "node")
          .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

        //
        nodes
          .append("rect")
          .attr("rx", 3)
          .attr("class", (d) =>
            d.ID === "Root"
              ? `${s.rootNode}`
              : d.isCategory
                ? `${s.entityCategoryNode}`
                : `${s.entityNode}`
          )
          .attr("width", (d) => (d.ID === "Root" ? rootNodeWidth : nodeWidth))
          .attr("height", (d) => (d.ID === "Root" ? rootNodeWidth : nodeWidth))
          .attr(
            "x",
            (d) => -(d.ID === "Root" ? rootNodeWidth / 2 : nodeWidth / 2)
          )
          .attr(
            "y",
            (d) => -(d.ID === "Root" ? rootNodeWidth / 2 : nodeWidth / 2)
          )
          // If we would need to add this back, keep in mind we have to deal with "event" going as first arg, and not "d" actually.
          // .on("click", d => handleNodeClick(d))
          .on("mousedown", (e, d) => handleContextMenu(e, d))
          .on("mouseover", (d) => onHoverNode(d.target.__data__))
          .on("mouseleave", (d) => onUnhoverNode(d.target.__data__));

        // Entity categories SVG icons
        nodes
          .filter((d) => d.isCategory === true)
          .append("svg:image")
          .attr(
            "href",
            "data:image/svg+xml;base64," +
              "PHN2ZyB3aWR0aD0iNzUiIGhlaWdodD0iNzUiIHZpZXdCb3g9IjAgMCA3NSA3NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiByeD0iMiIgZmlsbD0iIzIwQTRBQyIvPgo8cmVjdCB4PSI0NSIgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiByeD0iMiIgZmlsbD0iIzIwQTRBQyIvPgo8cmVjdCB5PSI0NSIgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiByeD0iMiIgZmlsbD0iIzIwQTRBQyIvPgo8cmVjdCB4PSI0NSIgeT0iNDUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgcng9IjIiIGZpbGw9IiMyMEE0QUMiLz4KPC9zdmc+Cg=="
          )
          .attr("width", (d) => (d.ID === "Root" ? 35 : 16))
          .attr("height", (d) => (d.ID === "Root" ? 35 : 16))
          .attr("class", s.entityCategoryIcon)
          .attr("x", (d) =>
            d.ID === "Root" ? -rootNodeWidth / 2.9 : -nodeWidth / 3.2
          )
          .attr("y", (d) =>
            d.ID === "Root" ? -rootNodeWidth / 2.9 : -nodeWidth / 3.2
          );
        // Node name
        nodes
          .append("text")
          .text((d) => {
            if (d.ID === "Root") return "Root";
            if (d.ID === "Uncategorized") return "";
            const name = nodeDataLocal.find(
              (node) => node.nodeID === d.ID
            )?.name;

            // Counting children
            const node = findNodeByID(dataRaw, d._id);
            let count;
            if (node) {
              count = countChildren(node);
              if (count === 0) {
                count = "";
              } else {
                count = `(${count})`;
              }
            }
            if (count === "") {
              return name;
            }
            return `${name} ${count}`;
          })
          .attr(
            "class",
            (d) =>
              `${d.ID === "Root" ? s.rootNodeLabel : s.nodeNameLabel} textLabel`
          )
          .attr("dy", (d) =>
            d.ID === "Root"
              ? -rootNodeWidth + rootNodeWidth / 3
              : -nodeWidth + nodeWidth / 4
          )
          .attr("text-anchor", "middle");

        function handleContextMenu(event, d) {
          if (event.shiftKey) {
            handleNodeClick(d);
            return;
          }
          if (event.ctrlKey) {
            quickOpen(d.ID);
            return;
          }

          const node = findNodeByID(dataRaw, d._id);
          if (node) {
            const count = countChildren(node);
            onContextMenuOpen(event, d, count);
          }
        }

        return () => {
          gElement.selectAll("*").remove();
        };
      }
    }, [width, height, gElement, data, visibleNodes]);

    useEffect(() => {
      if (!gElement) return;
      gElement.selectAll(".textLabel").text((d) => {
        if (d.ID === "Root") return "Root";
        if (d.ID === "Uncategorized") return "";
        const name = nodeDataLocal.find((node) => node.nodeID === d.ID)?.name;

        // Counting children
        const node = findNodeByID(dataRaw, d._id);
        let count;
        if (node) {
          count = countChildren(node);
          if (count === 0) {
            count = "";
          } else {
            count = `(${count})`;
          }
        }
        if (count === "") {
          return name;
        }
        return `${name} ${count}`;
      });
    }, [nodeDataLocal]);

    useImperativeHandle(ref, () => ({
      // Called from Entities on context menu item click
      handleContextMenuExpandClicked(d) {
        handleNodeClick(d);
      },
    }));

    //
    function handleNodeClick(d) {
      if (findNodeByID(dataRaw, d._id).Subnodes < 1) return;
      if (d.ID !== "Root") {
        if (expandedNodes.includes(d._id)) {
          // console.log('Removed node from expandedNodes:', d.ID)
          setExpandedNodes((prevExpandedNodes) =>
            prevExpandedNodes.filter((item) => item !== d._id)
          );
          clearExpandedNodes(dataRaw, d._id);
        } else {
          setExpandedNodes((prevExpandedNodes) => [
            ...prevExpandedNodes,
            d._id,
          ]);
          // console.log('Added node to expandedNodes:', d.ID)
        }
      } else {
        setExpandedNodes([dataRaw._id]);
      }
    }

    function onHoverNode(node) {
      hoveredNodeRef.current = node;
    }
    function onUnhoverNode() {
      hoveredNodeRef.current = {};
    }
    async function transientAddNewNodeToTree(newNode, parentNode) {
      let draggedNode;
      if (newNode) {
        draggedNode = findNodeByID(dataRaw, newNode._id);
        let affectedNodes = [];
        if (draggedNode) {
          affectedNodes = getAllIds(parentNode);
        }

        // Checking if the parent node is category
        if (!parentNode.isCategory) return;

        // Checking if we aren't trying to add PARENT to the CHILD (must be impossible)
        if (affectedNodes.includes(newNode._id)) return;

        // Checking if we aren't trying to add child to the same parent it has already
        let parentNodeInTree = findNodeByID(dataRaw, parentNode._id);
        if (
          parentNodeInTree.Subnodes.some(
            (subnode) => subnode._id === newNode._id
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

      // Below is the exact code needed to doublecheck if expandedNodes already have this _id and prevent putting another same one
      if (!expandedNodes.includes(parentNode._id)) {
        setExpandedNodes((prevExpandedNodes) => {
          if (!prevExpandedNodes.includes(parentNode._id)) {
            return [...prevExpandedNodes, parentNode._id];
          } else {
            return prevExpandedNodes;
          }
        });
      }
    }

    useEffect(() => {
      if (currentZoomState) {
        const svg = d3.select(svgRef.current);
        svg.attr("viewBox", [0, 0, width, height]);
      }
    }, [currentZoomState, width, height, container, visibleNodes]);

    const [{ item, itemType }, drop] = useDrop(() => ({
      accept: "node",
      drop: (item, monitor) =>
        transientAddNewNodeToTree(item, hoveredNodeRef.current),
      collect: (monitor) => ({
        itemType: monitor.getItemType(),
        item: monitor.getItem(),
      }),
    }));

    useEffect(() => {
      if (gElement === null) return;

      let draggedNode = {};
      let affectedNodes = [];
      if (item) {
        draggedNode = findNodeByID(dataRaw, item._id);
        if (draggedNode) {
          affectedNodes = getAllIds(draggedNode);
        }
      }

      // If we dragging mechanic, make gameplays glow and lower mechanics opacity
      gElement
        .selectAll(`.node`)
        .style("filter", (d) => {
          if (item) {
            let n = findNodeByID(dataRaw, d._id);

            // Highlight only the nodes above the dragged node (so we don't highlight the dragged node itself or its children)
            // And make sure we don't highlight basic entities
            if (
              itemType === "node" &&
              item.ID !== d.ID &&
              !affectedNodes.includes(d._id) &&
              d.isCategory &&
              !n.Subnodes.some((subnode) => subnode._id === item._id)
            ) {
              return "url(#glow)";
            } else {
              return "";
            }
          } else {
            return "";
          }
        })
        .classed(s.entityNodeHover, itemType === "node" ? true : false);

      // gElement
      // .selectAll(`.${s.mechanicNode}`)
      // .classed(s.mechanicNodeDisabled, itemType === 'mechanic');
    }, [itemType]);

    return (
      <div ref={container} style={{ width: "100%", height: "100%" }}>
        <div ref={drop} style={{ width: "100%", height: "100%" }}>
          <svg ref={svgRef}>
            <defs>
              <pattern
                id="smallGrid"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke="var(--d3-grid-color)"
                  strokeWidth="0.5"
                />
              </pattern>
              <pattern
                id="grid"
                width="100"
                height="100"
                patternUnits="userSpaceOnUse"
              >
                <rect width="100" height="100" fill="url(#smallGrid)" />
                <path
                  d="M 100 0 L 0 0 0 100"
                  fill="none"
                  stroke="var(--d3-grid-color)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
          </svg>
        </div>
      </div>
    );
  }
);

export default EntityTree;
