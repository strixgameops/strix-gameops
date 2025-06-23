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
    const [height, setHeight] = useState("");
    // Default scale for initial zoom
    const [scale, setScale] = useState(3);
    const [rootNode, setRootNode] = useState({});

    const [expandedNodes, setExpandedNodes] = useState([
      initialDataRaw.uniqueID,
    ]);
    const [visibleNodes, setVisibleNodes] = useState([
      { ID: "Root", Subnodes: [], Level: 0, isCategory: true },
    ]);

    const [nodeDataLocal, setNodeDataLocal] = useState(nodeData);

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

    // Getting all uniqueIDs of nodes in raw data
    const getAllIds = (combinedInitialRawData) => {
      const ids = [];

      const traverse = (node) => {
        if (node.uniqueID) {
          ids.push(node.uniqueID);
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
        if (node.uniqueID && node.Subnodes.length > 0) {
          ids.push(node.uniqueID);
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
      resetZoom();
    }, [initialDataRaw]);

    // Close context menu as user clicks on empty space (DEPRECATED)
    const handleCloseContextMenu = (event) => {};

    function resetZoom() {
      const svgElement = svgRef.current;
      if (!gElement || !svgElement || !zoomRef.current) return;
      d3.select(svgElement)
        .transition()
        .duration(550)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(0, 0).scale(1)
        );
    }

    // Finding the node by ID in raw data JSON from server.
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
    // Count children that a node has (must be node from rawData)
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
          if (expandedNodes.includes(subnode.uniqueID)) {
            //  child expanded nodes
            setExpandedNodes((prevExpandedNodes) =>
              prevExpandedNodes.filter((item) => item !== subnode.uniqueID)
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
    const gElementRef = useRef();
    const gLinkRef = useRef();
    const gNodeRef = useRef();
    const rootNodeRef = useRef();
    const dataRawRef = useRef(dataRaw);
    const zoomRef = useRef();

    useEffect(() => {
      // Ensure container is properly set
      if (!container.current) return;
      // Get the width and height after the component is rendered
      setWidth(container.current.clientWidth);
      setHeight(container.current.clientHeight);
    }, []);

    function drawTree() {
      if (width == 0 || height == 0) return;
      const svg = d3
        .select(svgRef.current)
        .attr("viewBox", [0, 0, width, height])
        .attr("width", width)
        .attr("height", height)
        .on("mousedown", handleCloseContextMenu);

      const zoom = d3.zoom().scaleExtent([0.1, 5]).on("zoom", zoomed);
      zoomRef.current = zoom;

      function zoomed(event) {
        setCurrentZoomState(event.transform);
        gElement.attr("transform", event.transform);
      }

      // const operation = doOnce(() => {
      //   svg.call(
      //     zoom.transform,
      //     d3.zoomIdentity.translate(zoomWidth, zoomHeight).scale(scale)
      //   );
      // });
      // operation();
      svg.call(zoom).on("dblclick.zoom", null);

      // Giving a value to the gElement (main g element)
      let gElementLocal;
      if (!gElementRef.current) {
        let svgGrid = svg
          .append("rect")
          .attr("fill", "url(#grid)")
          .attr("width", "100%")
          .attr("height", "100%");

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
        gElementLocal = svg.append("g");
        // .attr("transform", `translate(${width / 2}, ${height / 4})`);
        setGElement(gElementLocal);
        gElementRef.current = gElementLocal;
      } else {
        gElementLocal = gElement;
      }

      let gLink;
      let gNode;
      if (!gLinkRef.current) {
        gLink = gElementLocal.append("g");
        gLinkRef.current = gLink;
      } else {
        gLink = gLinkRef.current;
      }
      if (!gNodeRef.current) {
        gNode = gElementLocal.append("g");
        gNodeRef.current = gNode;
      } else {
        gNode = gNodeRef.current;
      }

      let root = d3.hierarchy(dataRaw, (d) => d.Subnodes);
      // Compute the layout.
      const treeObj = d3
        .tree()
        .nodeSize([nodeWidth + 70, nodeWidth + 100])
        .separation(function (a, b) {
          return a.parent == b.parent ? 1 : 2;
        });

      // Center the tree.
      let x0 = Infinity;
      let x1 = -x0;
      root.each((d) => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
      });
      root.x0 = width / 2;
      root.y0 = height / 4;

      console.log("visibleNodes:", visibleNodes);
      console.log("Data raw:", dataRaw);
      console.log("Expanded nodes:", expandedNodes);

      const duration = 350;

      if (!dataRaw) {
        gNode.selectAll("g.node").remove();
        gLink.selectAll("path").remove();
      } else {
        rootNodeRef.current = root;
        update(root);
      }

      function update(source) {
        root.descendants().forEach((d, i) => {
          d.id = d.data.ID;
        });
        let tree = treeObj(root);
        let nodes = tree.descendants();
        let links = tree.links();

        setRootNode(tree);

        console.log("Tree data:", root);

        //
        var node = gNode.selectAll("g.node").data(nodes, (d) => {
          return d.id;
        });
        var nodesEnter = node
          .enter()
          .append("g")
          .attr("transform", (d) => {
            return `translate(${source.x0 + width / 2},${source.y0 + height / 4})`;
          })
          .attr("class", (d) => `node`);

        nodesEnter
          .append("rect")
          .attr("rx", 3)
          .attr("class", (d) => {
            return d.data.ID === "Root"
              ? `${s.rootNode}`
              : d.data.isCategory
                ? `${s.entityCategoryNode}`
                : `${s.entityNode}`;
          })
          .attr("width", (d) =>
            d.data.ID === "Root" ? rootNodeWidth : nodeWidth
          )
          .attr("height", (d) =>
            d.data.ID === "Root" ? rootNodeWidth : nodeWidth
          )
          .attr(
            "x",
            (d) => -(d.data.ID === "Root" ? rootNodeWidth / 2 : nodeWidth / 2)
          )
          .attr(
            "y",
            (d) => -(d.data.ID === "Root" ? rootNodeWidth / 2 : nodeWidth / 2)
          )
          // If we would need to add this back, keep in mind we have to deal with "event" going as first arg, and not "d" actually.
          .on("click", (e, d) => handleNodeClick(d))
          .on("mousedown", (e, d) => handleContextMenu(e, d))
          .on("mouseover", (e, d) => {
            onHoverNode(d.data);
          })
          .on("mouseleave", (e, d) => onUnhoverNode(d.data));

        // Entity categories SVG icons
        nodesEnter
          .filter((d) => d.data.isCategory === true)
          .append("svg:image")
          .attr(
            "href",
            "data:image/svg+xml;base64," +
              "PHN2ZyB3aWR0aD0iNzUiIGhlaWdodD0iNzUiIHZpZXdCb3g9IjAgMCA3NSA3NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiByeD0iMiIgZmlsbD0iIzIwQTRBQyIvPgo8cmVjdCB4PSI0NSIgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiByeD0iMiIgZmlsbD0iIzIwQTRBQyIvPgo8cmVjdCB5PSI0NSIgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiByeD0iMiIgZmlsbD0iIzIwQTRBQyIvPgo8cmVjdCB4PSI0NSIgeT0iNDUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgcng9IjIiIGZpbGw9IiMyMEE0QUMiLz4KPC9zdmc+Cg=="
          )
          .attr("width", (d) => (d.data.ID === "Root" ? 35 : 16))
          .attr("height", (d) => (d.data.ID === "Root" ? 35 : 16))
          .attr("class", s.entityCategoryIcon)
          .attr("x", (d) =>
            d.data.ID === "Root" ? -rootNodeWidth / 2.9 : -nodeWidth / 3.2
          )
          .attr("y", (d) =>
            d.data.ID === "Root" ? -rootNodeWidth / 2.9 : -nodeWidth / 3.2
          );
        // Node name
        nodesEnter
          .append("text")
          .text((d) => {
            if (d.data.ID === "Root") return "Root";
            if (d.data.ID === "Uncategorized") return "";
            const name = nodeDataLocal.find(
              (node) => node.nodeID === d.data.ID
            )?.name;

            // Counting children
            const node = findNodeByID(dataRawRef.current, d.data.uniqueID);
            let count = "";
            // if (node) {
            //   count = countChildren(node);
            //   if (count === 0) {
            //     count = "";
            //   } else {
            //     count = `(${count})`;
            //   }
            // }
            if (count == "") {
            }
            return name;
            // return `${name} ${count}`;
          })
          .attr(
            "class",
            (d) =>
              `${d.data.ID === "Root" ? s.rootNodeLabel : s.nodeNameLabel} textLabel`
          )
          .attr("dy", (d) =>
            d.data.ID === "Root"
              ? -rootNodeWidth + rootNodeWidth / 3
              : -nodeWidth + nodeWidth / 4
          )
          .attr("text-anchor", "middle");

        // UPDATE
        const nodeUpdate = node
          .merge(nodesEnter)
          .transition()
          .ease(d3.easeCubic)
          .duration(duration)
          .attr("transform", (d) => {
            return `translate(${d.x + width / 2},${d.y + height / 4})`;
          });

        // Remove any exiting nodes
        var nodeExit = node
          .exit()
          .transition()
          .ease(d3.easeCubic)
          .duration(duration)
          .remove()
          .attr("transform", function (d) {
            return "translate(" + source.x + "," + source.y + ")";
          });

        function handleContextMenu(event, d) {
          // if (event.shiftKey) {
          //   handleNodeClick(d);
          //   return;
          // }
          if (d.data.ID === "Root") return;
          if (event.ctrlKey) {
            quickOpen(d.data.ID);
            return;
          }

          const node = findNodeByID(dataRawRef.current, d.data.uniqueID);
          if (node) {
            const count = countChildren(node);
            onContextMenuOpen(event, d.data, count);
          }
        }

        var link = gLink.selectAll("path").data(links, function (d) {
          return d.target.id;
        });

        // Enter any new links at the parent's previous position.
        var linkEnter = link
          .enter()
          .append("path")
          .attr("stroke", "#016776")
          .attr("stroke-opacity", 1)
          .attr("stroke-width", 0.7)
          .attr("fill", "none")
          .attr("class", s.link)
          .attr("d", (d) => {
            const sourceNode = source;
            const targetNode = d.target;

            const deltaX = targetNode.x0 - sourceNode.x0;
            const deltaY = targetNode.y0 - sourceNode.y0;
            const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            const sourcePaddingX =
              dataRawRef.current.uniqueID === d.source
                ? rootNodeWidth / 2
                : nodeWidth / 2;
            const sourcePaddingY =
              dataRawRef.current.uniqueID === d.source
                ? rootNodeWidth / 2
                : nodeWidth / 2;
            const targetPaddingX = nodeWidth / 2;
            const targetPaddingY = -nodeWidth / 2;

            const normX = deltaX / dist;
            const normY = deltaY / dist;

            if (normX === 0 || (normY === 0 && false)) {
              // If the link is perpendicular, use the simple path logic
              const sourceX = sourceNode.x0 + sourcePaddingX * normX;
              const sourceY = sourceNode.y0 + sourcePaddingY * normY;
              const targetX = targetNode.x0 - targetPaddingX * normX;
              const targetY = targetNode.y0 + targetPaddingY * normY;
              return `M${sourceX},${sourceY} L${targetX},${targetY}`;
            } else {
              const flooredNormX = normX > 0 ? 1 : -1;
              const flooredNormY = normY > 0 ? 1 : -1;

              // If the link is diagonal, build elbow-like path
              const sourceX = sourceNode.x0;
              const sourceY = sourceNode.y0 + sourcePaddingY * flooredNormY;

              const midX = sourceX + (targetNode.x0 - sourceNode.x0) / 3;
              const midY = sourceY + (targetNode.y0 - sourceNode.y0) / 3;

              const targetX = targetNode.x0;
              const targetY = targetNode.y0 + targetPaddingY * normY;

              // const startX = sourceNode.x0;
              const startX = sourceNode.x0;
              const startY = sourceNode.y0;

              const endX = targetNode.x0;
              const endY = targetNode.y0;

              // 1. Starting point
              // 2. Midpoint - lower point (start of the elbow)
              // 3. Midpoint - upper point (end of the elbow)
              // 4. End point
              // if (Math.abs(normY) > Math.abs(normX)) {
              return `
             M${sourceX + width / 2},${sourceY + height / 4}
             L${sourceX + width / 2},${midY + height / 4}
             L${targetX + width / 2},${midY + height / 4}
             V${targetY + height / 4}H${targetX + width / 2}`;
            }
            //  L${endX},${endY + targetPaddingY * flooredNormY}`;
          });

        // UPDATE
        link
          .merge(linkEnter)
          .transition()
          .ease(d3.easeCubic)
          .duration(duration)
          .attr("d", (d) => {
            const sourceNode = d.source;
            const targetNode = d.target;

            const deltaX = targetNode.x - sourceNode.x;
            const deltaY = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            const sourcePaddingX =
              dataRawRef.current.uniqueID === d.source
                ? rootNodeWidth / 2
                : nodeWidth / 2;
            const sourcePaddingY =
              dataRawRef.current.uniqueID === d.source
                ? rootNodeWidth / 2
                : nodeWidth / 2;
            const targetPaddingX = nodeWidth / 2;
            const targetPaddingY = -nodeWidth / 2;

            const normX = deltaX / dist;
            const normY = deltaY / dist;

            if (normX === 0 || (normY === 0 && false)) {
              // If the link is perpendicular, use the simple path logic
              const sourceX = sourceNode.x + sourcePaddingX * normX;
              const sourceY = sourceNode.y + sourcePaddingY * normY;
              const targetX = targetNode.x - targetPaddingX * normX;
              const targetY = targetNode.y + targetPaddingY * normY;
              return `M${sourceX + width / 2},${sourceY + height / 4} L${targetX + width / 2},${targetY + height / 4}`;
            } else {
              const flooredNormX = normX > 0 ? 1 : -1;
              const flooredNormY = normY > 0 ? 1 : -1;

              // If the link is diagonal, build elbow-like path
              const sourceX = sourceNode.x;
              const sourceY = sourceNode.y + sourcePaddingY * flooredNormY;

              const midX = sourceX + (targetNode.x - sourceNode.x) / 3;
              const midY = sourceY + (targetNode.y - sourceNode.y) / 3;

              const targetX = targetNode.x;
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
              return `
             M${sourceX + width / 2},${sourceY + height / 4}
             L${sourceX + width / 2},${midY + height / 4}
             L${targetX + width / 2},${midY + height / 4}
             V${targetY + height / 4}H${targetX + width / 2}`;
            }
            //  L${endX},${endY + targetPaddingY * flooredNormY}`;
          });

        // Transition exiting nodes to the parent's new position.
        const linkExit = link
          .exit()
          .transition()
          .ease(d3.easeCubic)
          .duration(duration)
          .remove();

        // Store the old positions for transition.
        root.eachBefore((d) => {
          d.x0 = d.x;
          d.y0 = d.y;
        });
      }
    }

    useEffect(() => {
      dataRawRef.current = dataRaw;
      drawTree();
    }, [width, height, gElement, dataRaw, visibleNodes]);

    // useEffect(() => {
    //   if (!gElement) return;
    //   gElement.selectAll(".textLabel").text((d) => {
    //     if (d.ID === "Root") return "Root";
    //     if (d.ID === "Uncategorized") return "";
    //     const name = nodeDataLocal.find((node) => node.nodeID === d.ID)?.name;

    //     // Counting children
    //     const node = findNodeByID(dataRaw, d.uniqueID);
    //     let count;
    //     if (node) {
    //       count = countChildren(node);
    //       if (count === 0) {
    //         count = "";
    //       } else {
    //         count = `(${count})`;
    //       }
    //     }
    //     if (count === "") {
    //       return name;
    //     }
    //     return `${name} ${count}`;
    //   });
    // }, [nodeDataLocal]);

    useImperativeHandle(ref, () => ({
      // Called from Entities on context menu item click
      handleContextMenuExpandClicked(d) {
        handleNodeClick(d);
      },
    }));

    // When node clicked
    function handleNodeClick(d) {
      if (findNodeByID(dataRawRef.current, d.data.uniqueID).Subnodes < 1)
        return;
      if (d.data.ID !== "Root") {
        if (expandedNodes.includes(d.data.uniqueID)) {
          // console.log('Removed node from expandedNodes:', d.ID)
          setExpandedNodes((prevExpandedNodes) =>
            prevExpandedNodes.filter((item) => item !== d.data.uniqueID)
          );
          clearExpandedNodes(dataRawRef.current, d.data.uniqueID);
        } else {
          setExpandedNodes((prevExpandedNodes) => [
            ...prevExpandedNodes,
            d.data.uniqueID,
          ]);
          // console.log('Added node to expandedNodes:', d.ID)
        }
      } else {
        setExpandedNodes([dataRawRef.current.uniqueID]);
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
        draggedNode = findNodeByID(dataRawRef.current, newNode.uniqueID);
        let affectedNodes = [];

        // Checking if the parent node is category
        if (!parentNode.isCategory) return;

        if (draggedNode) {
          affectedNodes = getAllIds(newNode);
        }
        // Checking if we aren't trying to add PARENT to the CHILD (must be impossible)
        if (affectedNodes.includes(parentNode.uniqueID)) return;

        // Checking if we aren't trying to add child to the same parent it has already
        let parentNodeInTree = findNodeByID(
          dataRawRef.current,
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

      // Below is the exact code needed to doublecheck if expandedNodes already have this uniqueID and prevent putting another same one
      if (!expandedNodes.includes(parentNode.uniqueID)) {
        setExpandedNodes((prevExpandedNodes) => {
          if (!prevExpandedNodes.includes(parentNode.uniqueID)) {
            return [...prevExpandedNodes, parentNode.uniqueID];
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
        draggedNode = findNodeByID(dataRawRef.current, item.uniqueID);
        if (draggedNode) {
          affectedNodes = getAllIds(draggedNode);
        }
      }

      // If we dragging mechanic, make gameplays glow and lower mechanics opacity
      gElement
        .selectAll(`.node`)
        .style("filter", (d) => {
          if (item) {
            let n = findNodeByID(dataRawRef.current, d.data.uniqueID);

            // Highlight only the nodes above the dragged node (so we don't highlight the dragged node itself or its children)
            // And make sure we don't highlight basic entities
            if (
              itemType === "node" &&
              item.ID !== d.data.ID &&
              !affectedNodes.includes(d.data.uniqueID) &&
              d.data.isCategory &&
              !n.Subnodes.some((subnode) => subnode.uniqueID === item.uniqueID)
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
