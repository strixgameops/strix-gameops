import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./css/entities.css";

const ForceDirectedGraph = ({ dataRaw }) => {
  const svgRef = useRef();
  const [currentZoomState, setCurrentZoomState] = useState(null);
  const [gElement, setGElement] = useState(null);

  const container = useRef(null); //   parent-
  const [width, setWidth] = useState("");
  const [height, setheight] = useState("");
  // Default scale for initial zoom
  const [scale, setScale] = useState(3);

  const [visibleNodes, setVisibleNodes] = useState(["Root"]);
  const [expandedNodes, setExpandedNodes] = useState(["Root"]);

  const [data, setData] = useState("");

  const [initialZoomDone, setInitialZoomDone] = useState(false);

  // Finding the node by ID in raw data JSON from server. Used to help clear expandedNodes
  function findNodeByID(node, targetNodeID) {
    if (node.ID === targetNodeID) {
      console.log("1:", node);
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
  // After we click and expand any node, we want to undo expand on its children too
  function clearExpandedNodes(node, targetNodeID) {
    const nodeToStartFrom = findNodeByID(node, targetNodeID);
    console.log("Node to start from:", nodeToStartFrom);

    function cycleExpandedNodes(nodeToStartFrom) {
      console.log("123");
      for (const subnode of nodeToStartFrom.Subnodes) {
        if (expandedNodes.includes(subnode.ID)) {
          //  child expanded nodes
          setExpandedNodes((prevExpandedNodes) =>
            prevExpandedNodes.filter((item) => item !== subnode.ID)
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

  useEffect(() => {
    setVisibleNodes(["Root"]);
    const links = [];
    function processNodes(dataRaw, expandedNodes, visibleNodes) {
      if (expandedNodes.includes(dataRaw.ID)) {
        console.log("Processing node:", dataRaw);

        for (const subnode of dataRaw.Subnodes) {
          console.log("Subnode:", subnode);
          if (!visibleNodes.includes(subnode.ID)) {
            visibleNodes.push(subnode.ID);
          }
          // ,         links
          if (
            !links.some(
              (link) => link.source === dataRaw.ID && link.target === subnode.ID
            )
          ) {
            links.push({ source: dataRaw.ID, target: subnode.ID });
          }
          processNodes(subnode, expandedNodes, visibleNodes);
        }
      } else {
      }
    }
    processNodes(dataRaw, expandedNodes, visibleNodes);

    const visibleNodesObjectArray = visibleNodes.map((id) => ({ ID: id }));
    // console.log("Visible Nodes (Object Array):", visibleNodesObjectArray);
    // console.log("Visible Nodes:", visibleNodes);

    setData({ nodes: visibleNodesObjectArray, links: links });
    console.log("Current data:", {
      nodes: visibleNodesObjectArray,
      links: links,
    });
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
      .attr("viewBox", [0, 0, width, height]);
    // .call(zoom.transform, transformDef);

    if (!gElement) {
      //  <g>
      setGElement(svg.append("g"));
      console.log(" gElement,  ");
    } else {
      const zoom = d3.zoom().scaleExtent([2, 5]).on("zoom", zoomed);

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
      svg.call(zoom);

      //
      function handleNodeClick(event, d) {
        console.log("Clicked node:", d);
        if (d.ID != "Root") {
          if (expandedNodes.includes(d.ID)) {
            console.log("Removed node from expandedNodes:", d.ID);
            setExpandedNodes((prevExpandedNodes) =>
              prevExpandedNodes.filter((item) => item !== d.ID)
            );
            clearExpandedNodes(dataRaw, d.ID);
          } else {
            setExpandedNodes((prevExpandedNodes) => [
              ...prevExpandedNodes,
              d.ID,
            ]);
            console.log("Added node to expandedNodes:", d.ID);
          }
        }
      }

      const simulation = d3
        .forceSimulation(data.nodes)
        .force(
          "link",
          d3
            .forceLink(data.links)
            .id((d) => d.ID)
            .distance(50)
        )
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX())
        .force("y", d3.forceY());

      //
      const link = gElement
        .selectAll(".link")
        .data(data.links)
        .enter()
        .append("line")
        .attr("stroke", "#000")
        .attr("stroke-opacity", 1)
        .attr("stroke-width", (d) => Math.sqrt(d.value))
        .attr("class", "link");

      //
      const node = gElement
        .selectAll(".node")
        // .data(data.nodes.filter(d => visibleNodes.includes(d.ID)))
        .data(data.nodes)
        .enter()
        .append("rect")
        .attr("class", "node")
        // .attr("r", 5)
        .attr("width", 10)
        .attr("height", 10)
        .attr("x", (d) => d.x - 5) //      x
        .attr("y", (d) => d.y - 5) //      y
        .on("click", handleNodeClick);

      //
      simulation.on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        node.attr("x", (d) => d.x - 5).attr("y", (d) => d.y - 5);
        // node.attr("cx", d => d.x).attr("cy", d => d.y);
      });

      //    ,
      return () => {
        simulation.stop();
        gElement.selectAll("*").remove();
      };
    }
  }, [width, height, gElement, data, visibleNodes]);

  useEffect(() => {
    if (currentZoomState) {
      const svg = d3.select(svgRef.current);
      //   viewBox
      svg.attr("viewBox", [0, 0, width, height]);
    }
  }, [currentZoomState, width, height, container, visibleNodes]);

  return (
    <div ref={container} style={{ width: "100%", height: "100%" }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default ForceDirectedGraph;
