import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as d3 from "d3";
import s from "../css/behTree.module.css";
import shortid from "shortid";
import Backdrop from "@mui/material/Backdrop";
import chroma from "chroma-js";
import CircularProgress from "@mui/material/CircularProgress";
import { createRoot } from "react-dom/client";

// MUI
import { IconButton, Typography, Tooltip } from "@mui/material";
import MuiTooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import EntityPlaceholder from "../assets/entityItemPlaceholder.svg?react";

// Tooltip charts
import Tooltip_TimeToArriveDistributionChart from "../miniCharts/Tooltip_TimeToArriveDistributionChart";
import DesignValuesTooltip from "../miniCharts/DesignValuesTooltip";
import Tooltip_SingleDefaultDistributionChart from "../miniCharts/Tooltip_SingleDefaultDistributionChart";
import Tooltip_SingleTimeDistribution from "../miniCharts/Tooltip_SingleTimeDistribution";

import { useGame, useBranch } from "@strix/gameContext";
// Axios
import useApi from "@strix/api";

import reservedEvents, {
  sessionStartEvent,
  sessionEndEvent,
  offerEvent,
  offerShownEvent,
  economyEvent,
  adEvent,
  reportEvent,
  crashEvent,
  uiEvent,
  designEvent,
} from "./ReservedEventsList";

const BehaviorTree = ({
  data,
  settings,
  funnelEvents,
  onCorrelationDataGenerated,
  designEvents,
  isEconomyAnalysis,
  onProfileViewed,
}) => {
  const { getOffers, getEntityIcons, getEntitiesNames } = useApi();

  const { game } = useGame();
  const { branch, environment } = useBranch();

  const [longestSessionLength, setLongestSessionLength] = useState(0);
  const [currentDepth, setCurrentDepth] = useState(0);
  const [lastInteractionID, setLastInteractionID] = useState("");

  const [showLoading, setShowLoading] = useState(true);

  const container = useRef(null);
  const svgRef = useRef(null);
  const [currentZoomState, setCurrentZoomState] = useState(null);
  const [gElement, setGElement] = useState(null);

  const [width, setWidth] = useState("");
  const [height, setheight] = useState("");
  // Default scale for initial zoom
  const [scale, setScale] = useState(5);
  const zoomExtent = [0.01, 1];
  const [initialZoomDone, setInitialZoomDone] = useState(false);

  const [localSettings, setLocalSettings] = useState(settings);

  // Root node offset
  const [rootOffset, setRootOffset] = useState(isEconomyAnalysis ? 1600 : 500);
  useEffect(() => {
    setRootOffset(isEconomyAnalysis ? 1600 : 500);
  }, [isEconomyAnalysis]);

  const [treeData, setTreeData] = useState({});
  const [correlationData, setCorrelationData] = useState({});
  const [processedTreeData, setProcessedTreeData] = useState([]);
  const [alternativeDropoffData, setAlternativeDropoffData] = useState([]);
  const [rootNode, setRootNode] = useState({});

  const leafWidth = 350;
  const leafHeight = 60;

  const placeholderEntityIcon =
    "PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAxMjAgMTIwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8bWFzayBpZD0icGF0aC0xLWluc2lkZS0xXzEwMl8yMDEiIGZpbGw9IndoaXRlIj4KPHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIHJ4PSIxMCIvPgo8L21hc2s+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiByeD0iMTAiIGZpbGw9IiMxRjRBNjAiIHN0cm9rZT0iIzEwNzM4RCIgc3Ryb2tlLXdpZHRoPSIxNyIgbWFzaz0idXJsKCNwYXRoLTEtaW5zaWRlLTFfMTAyXzIwMSkiLz4KPC9zdmc+Cg==";

  const fetchingData = useRef(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [offers, setOffers] = useState([]);
  const [entityIcons, setEntityIcons] = useState([]);
  const [entitiesNames, setEntitiesNames] = useState([]);
  async function fetchData() {
    if (!fetchingData.current) {
      fetchingData.current = true;
      const resp = await getOffers({ gameID: game.gameID, branch: branch });
      if (resp.success) {
        setOffers(resp.offers);
      }
      let allEntities = resp.offers
        .map((o) => o.content.map((c) => c.nodeID))
        .reduce((acc, curr) => acc.concat(curr), []);
      if (allEntities && allEntities.length > 0) {
        allEntities = Array.from(new Set(allEntities));
        const icons = await getEntityIcons({
          gameID: game.gameID,
          branch: branch,
          nodeIDs: allEntities,
        });
        setEntityIcons(icons.entityIcons);

        const names = await getEntitiesNames({
          gameID: game.gameID,
          branch: branch,
          nodeIDs: allEntities,
        });
        if (names.success) {
          setEntitiesNames(names.entities);
        }
      }
      setDataFetched(true);
      fetchingData.current = false;
    }
  }

  const conditionallyMergeableEvents = [
    crashEvent,
    offerShownEvent,
    offerEvent,
    economyEvent,
    adEvent,
    reportEvent,
  ];

  function getStyle(node) {
    // Find style for the given event
    let style = reservedEvents.find((e) => e.id === node.data.id);
    if (style) {
      return style;
    } else {
      // If no style found, consider it as a custom event
      return designEvent;
    }
  }
  function getEventType(node) {
    // Find style for the given event
    let style = reservedEvents.find((e) => e.id === node.data.id);
    if (style) {
      return style.id;
    } else {
      // If no style found, consider it as a custom event
      return "designEvent";
    }
  }

  const localSettingsRef = React.useRef(localSettings);
  useEffect(() => {
    setLocalSettings(settings);
    localSettingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    // Ensure container is properly set
    if (!container.current) return;
    // Get the width and height after the component is rendered
    setWidth(container.current.clientWidth);
    setheight(container.current.clientHeight);
  }, []);

  function makeTreeData() {
    let tempTreeData = [];
    let tempData = JSON.parse(JSON.stringify(data));

    function filterSession(
      session, // Session to filter
      forceDropoff = false, // If we want to show dropoffs only
      forceConverted = false // If we want to show converted only
    ) {
      // Filter sessions by the funnel events
      let lastIndex = -1;
      for (const idObj of funnelEvents) {
        const index = session.findIndex((obj) => obj.id === idObj.id);

        // Filters come first. Also prevent filtering dropoffs (otherwise only converted sessions will be shown)
        if (
          index !== -1 &&
          localSettings.viewmode !== "dropoff" &&
          !forceDropoff
        ) {
          // Time filter
          let sessionLength =
            (new Date(session[session.length - 1].timestamp) -
              new Date(session[0].timestamp)) /
            1000;
          if (
            localSettings.maxSessionLength !== 0 &&
            sessionLength > localSettings.maxSessionLength
          ) {
            return false;
          }

          // Value filter
          if (idObj.filters.length > 0) {
            for (const filter of idObj.filters) {
              switch (filter.condition) {
                case "is":
                  if (session[index][filter.targetField] !== filter.value) {
                    return false;
                  }
                  break;
                case "is not":
                  if (session[index][filter.targetField] === filter.value) {
                    return false;
                  }
                  break;
                case "contains":
                  if (
                    session[index][filter.targetField].indexOf(filter.value) ===
                    -1
                  ) {
                    return false;
                  }
                  break;
                case "starts with":
                  if (
                    session[index][filter.targetField].indexOf(filter.value) !==
                    0
                  ) {
                    return false;
                  }
                  break;
                case "ends with":
                  if (
                    session[index][filter.targetField].indexOf(filter.value) !==
                    session[index][filter.targetField].length -
                      filter.value.length
                  ) {
                    return false;
                  }
                  break;
                case "=":
                  if (session[index][filter.targetField] !== filter.value) {
                    return false;
                  }
                  break;
                case "!=":
                  if (session[index][filter.targetField] === filter.value) {
                    return false;
                  }
                  break;
                case "<":
                  if (session[index][filter.targetField] >= filter.value) {
                    return false;
                  }
                  break;
                case "<=":
                  if (session[index][filter.targetField] > filter.value) {
                    return false;
                  }
                  break;
                case ">":
                  if (session[index][filter.targetField] <= filter.value) {
                    return false;
                  }
                  break;
                case ">=":
                  if (session[index][filter.targetField] < filter.value) {
                    return false;
                  }
                  break;
              }
            }
          }
        }

        // After filtering we want to consider if we want to show all events
        if (
          localSettings.viewmode === "all" &&
          !forceDropoff &&
          !forceConverted
        ) {
          return true;
        }

        // If we want to show not just any filtered events (e.g. "all" viewmode),
        // then we start checking if the session is good for the given funnel
        if (index === -1 || index <= lastIndex) {
          if (forceConverted) {
            return false;
          }

          // If ID is not found or the index is less than the lastIndex, return false
          if (localSettings.viewmode === "conversion" && !forceDropoff) {
            return false;
          }
          // Switch, if we want to show dropoffs only or all events
          if (localSettings.viewmode === "dropoff" || forceDropoff) {
            return true;
          }
        }
        lastIndex = index;
      }
      // If all IDs are found and in the correct order, return true
      //
      // Switch, if we want to show dropoffs only or all events
      if (localSettings.viewmode === "dropoff" || forceDropoff) {
        return false;
      }
      return true;
    }
    function mergeWithTree(tree, session) {
      let currDepth = 0;
      function mergeSessionWithTree(node, session) {
        function tryToPopulateValues(currentNode, newNode) {
          function makeValues(valueName) {
            if (newNode[valueName]) {
              // Checking if the value is not present at all (undefined)
              if (currentNode[valueName] === undefined) {
                // Define as an array and give the initial value
                currentNode[valueName] = [newNode[valueName]];
              } else {
                // Checking if it's an array already
                if (Array.isArray(currentNode[valueName])) {
                  // Checking if we are trying to push to the same node. If so, don't do this as this value already exists there
                  if (currentNode.sid !== newNode.sid) {
                    // If an array, push the new value
                    currentNode[valueName].push(newNode[valueName]);
                  }
                } else {
                  // If not an array, initialize it as an array and push the new value
                  currentNode[valueName] = [newNode[valueName]];
                }
              }
            }
          }

          makeValues("clientID");

          if (!reservedEvents.some((e) => e.id === newNode.id)) {
            // Populating designEvent values here
            const valueNames = designEvents
              .find((e) => e.id === newNode.id)
              ?.values.map((v) => v.valueID);
            if (!valueNames) {
              return;
            }
            for (let valueNum = 0; valueNum < valueNames.length; valueNum++) {
              makeValues(valueNames[valueNum]);
            }
          } else {
            switch (newNode.id) {
              case offerShownEvent.id:
                makeValues("price");
                break;

              case offerEvent.id:
                makeValues("price");
                break;

              case economyEvent.id:
                makeValues("amount");
                break;

              case adEvent.id:
                makeValues("timeSpent");
                break;

              case reportEvent.id:
                makeValues("message");
                break;
            }
          }

          addTime(currentNode, newNode);
        }
        function addTime(currentNode, newNode) {
          if (currentNode.time) {
            if (currentNode.sid !== newNode.sid)
              currentNode.time = currentNode.time.concat(newNode.time);
          } else {
            currentNode.time = [newNode.time];
          }
        }

        // At depth 0
        if (currDepth === 0) {
          if (!node.id || node.id !== session[currDepth].id) {
            tempTreeData = JSON.parse(JSON.stringify(session[currDepth]));
            tempTreeData.children = [];
            tempTreeData.occurency = 1;

            currDepth++;
            mergeSessionWithTree(tempTreeData, session);
          } else {
            tempTreeData.occurency++;

            currDepth++;
            mergeSessionWithTree(node, session);
          }
        }
        // At depth > 0
        else {
          // If there are no such session at the given depth, then return (this is the end of the list)
          if (session[currDepth] === undefined) return;

          let foundNode = node.children.find((child) => {
            // Search by id first
            if (child.id !== session[currDepth].id) return false;

            // If we don't need to do additional checks, go on
            if (
              !conditionallyMergeableEvents.some(
                (e) => e.id === session[currDepth].id
              )
            )
              return true;

            // Here we want to check if the event should be merged not just by the ID, but also by it's specific values
            // E.g. we want to merge only crashes with the same message, or offerShown by the offerID
            switch (session[currDepth].id) {
              case crashEvent.id:
                return child.message === session[currDepth].message;
              case offerEvent.id:
                return (
                  child.offerID === session[currDepth].offerID &&
                  child.price === session[currDepth].price
                );
              case offerShownEvent.id:
                return child.offerID === session[currDepth].offerID;
              case economyEvent.id:
                return (
                  child.currencyID === session[currDepth].currencyID &&
                  child.type === session[currDepth].type &&
                  child.origin === session[currDepth].origin
                );
              case adEvent.id:
                return (
                  child.adNetwork === session[currDepth].adNetwork &&
                  child.adType === session[currDepth].adType
                );
              case reportEvent.id:
                return (
                  child.reportID === session[currDepth].reportID &&
                  child.severity === session[currDepth].severity
                );
              default:
                return true;
            }
          });

          // If we didnt find the node in the given branch, we need to create it
          if (foundNode === undefined) {
            // Initializing children array
            let newNode = JSON.parse(JSON.stringify(session[currDepth]));
            newNode.occurency = 1;
            newNode.children = [];

            // Initial populating
            tryToPopulateValues(newNode, newNode);

            // Pushing the new node to the tree
            node.children.push(newNode);
            newNode = node.children.find(
              (child) => child.id === session[currDepth].id
            );

            // Another populating. This should not add the same values twice
            tryToPopulateValues(newNode, session[currDepth]);

            currDepth++;
            mergeSessionWithTree(newNode, session);
          }
          // If we found the node, we need to increment it's occurency and go forward
          else {
            foundNode.occurency++;

            tryToPopulateValues(foundNode, session[currDepth]);

            currDepth++;
            mergeSessionWithTree(foundNode, session);
          }
        }
      }
      mergeSessionWithTree(tree, session);
    }

    let tempData_Regular = JSON.parse(JSON.stringify(tempData)).filter(
      (session) => filterSession(session)
    );
    tempData_Regular.forEach((session, stepIndex) => {
      // Only do the splicing if we are not in "all" mode.
      if (localSettings.viewmode !== "all") {
        // Here we splice the sessions to the first event in the funnel, so
        // we don't start from the startSession everytime and only start from the event we are interested in
        if (funnelEvents.length > 0) {
          let targetIndex = session.findIndex(
            (event) => event.id === funnelEvents[0]
          );
          if (targetIndex !== -1) {
            session = session.slice(targetIndex);
          }
        }
      }

      if (session.length > longestSessionLength) {
        setLongestSessionLength(session.length);
      }
      mergeWithTree(tempTreeData, session);
    });

    console.log(JSON.parse(JSON.stringify(tempTreeData)));

    setTreeData(tempTreeData);

    tempTreeData = [];
    let tempData_Dropoff = JSON.parse(JSON.stringify(tempData)).filter(
      (session) => filterSession(session, true)
    );
    tempData_Dropoff.forEach((session, stepIndex) => {
      mergeWithTree(tempTreeData, session);
    });

    let tempData_Converted = JSON.parse(JSON.stringify(tempData)).filter(
      (session) => filterSession(session, false, true)
    );
    // console.log('iterating data', data, 'for calculating conversions', 'filtered:', tempData_Converted)

    if (tempData_Converted.length > 0 && tempData_Dropoff.length > 0) {
      // console.log('Making correlation of', tempData_Converted, tempData_Dropoff)
      const corr = calculateCorrelation(tempData_Converted, tempData_Dropoff);
      setCorrelationData(corr);
    }
    // console.log("Conversion data", tempTreeData);
    // console.log("Dropoff data", tempTreeData);
    setAlternativeDropoffData(tempTreeData);
  }

  useEffect(() => {
    onCorrelationDataGenerated(correlationData);
  }, [correlationData]);

  function calculateCorrelation(successfulSessions, failedSessions) {
    const successfulEvents = {};
    const failedEvents = {};

    // Counting unique events in successful sessions
    // {event1: 1, event2: 2, event3: 5}
    successfulSessions.forEach((session) => {
      const uniqueEvents = new Set(session.map((event) => event.id));
      uniqueEvents.forEach((eventId) => {
        successfulEvents[eventId] = successfulEvents[eventId]
          ? successfulEvents[eventId] + 1
          : 1;
      });
    });
    // Here we calculate the percentage (1-0) of how many success sessions have a certain event.
    // 1 means every session has this event, 0 means no session has this event
    Object.keys(successfulEvents).forEach((key) => {
      successfulEvents[key] = successfulEvents[key] / successfulSessions.length;
    });

    // Counting unique events in failed sessions
    // {event1: 1, event2: 2, event3: 5}
    failedSessions.forEach((session) => {
      const uniqueEvents = new Set(session.map((event) => event.id));
      uniqueEvents.forEach((eventId) => {
        failedEvents[eventId] = failedEvents[eventId]
          ? failedEvents[eventId] + 1
          : 1;
      });
    });
    // Here we calculate the percentage (1-0) of how many failed sessions have a certain event.
    // 1 means every session has this event, 0 means no session has this event
    Object.keys(failedEvents).forEach((key) => {
      failedEvents[key] = failedEvents[key] / failedSessions.length;
    });

    // Making correlation
    const correlation = {};
    Object.keys(successfulEvents).forEach((eventId) => {
      // Get event's share in successful sessions & failed sessions
      const totalSuccessfulSessions = successfulEvents[eventId];
      const totalFailedSessions = failedEvents[eventId] || 0;

      // Calculate correlation. Subtracting different "percentages" and see how much we have left
      // Negative correlation means that event is more present in failed sessions than in successful sessions
      const correlationIndicator =
        totalSuccessfulSessions - totalFailedSessions;
      correlation[eventId] = parseFloat(correlationIndicator.toFixed(2));
    });

    return correlation;
  }

  function countAllChildren(node, childrenArrayName = "children") {
    let counter = -1;
    function traverse(node) {
      counter++;
      if (node[childrenArrayName]) {
        node[childrenArrayName].forEach((child) => {
          traverse(child);
        });
      }
    }
    traverse(node);
    return counter;
  }

  async function onDataOrFunnelChange() {
    // Prevent initialization until we got the data
    async function init() {
      if (!fetchingData.current) {
        await fetchData();
      }
    }
    if (!dataFetched) {
      init();
    }
    if (dataFetched) {
      makeTreeData();
    }
  }
  useEffect(() => {
    if (!isEconomyAnalysis) {
      onDataOrFunnelChange();
    }
  }, [funnelEvents]);
  useEffect(() => {
    onDataOrFunnelChange();
  }, [data, funnelEvents, dataFetched]);

  function trim(str, maxLength) {
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  }

  function executeWithLoading(func) {
    let currDataLength = data.length;
    let duration = 0;

    // Set different duration if the data is too big and we woult like to show loading indicator
    if (currDataLength > 2000) {
      setShowLoading(true);
      duration = 500;
    } else if (currDataLength > 1200) {
      setShowLoading(true);
      duration = 100;
    } else if (currDataLength > 100) {
      duration = 0;
    }

    setTimeout(() => {
      try {
        func();
      } catch (error) {
        setShowLoading(false);
      }
      setShowLoading(false);
    }, duration);
  }

  const gElementRef = useRef();
  const gLinkRef = useRef();
  const gNodeRef = useRef();
  const rootNodeRef = useRef();
  const treeDataRef = useRef(treeData);
  const rootOffsetRef = useRef(rootOffset);
  useEffect(() => {
    rootOffsetRef.current = rootOffset;
  }, [rootOffset]);
  useEffect(() => {
    if (gLinkRef.current && gNodeRef.current) {
      gLinkRef.current.selectAll("*").remove();
      gNodeRef.current.selectAll("*").remove();
    }
    treeDataRef.current = treeData;
    drawTree();
  }, [width, height, treeData]);

  async function drawTree() {
    if (!dataFetched && !fetchingData.current) {
      await fetchData();
    } else {
      executeWithLoading(() => {
        Tree(treeDataRef.current, {
          label: (d) => d.id,
          path: (d) => d.sid,
          occurency: (d) => d.occurency,
          id: (d) => d.sid,
          width: width,
          height: height,
        });
      });

      function Tree(
        data,
        {
          // hierarchy (nested objects)
          children, // given a d in data, returns its children
          tree = d3.tree, // layout algorithm (typically d3.tree or d3.cluster)
          sort, // how to sort nodes prior to layout (e.g., (a, b) => d3.descending(a.height, b.height))
          label, // given a node d, returns the display name
          width = 640, // outer width, in pixels
          height, // outer height, in pixels
          padding = 0, // horizontal padding for first and last column
        } = {}
      ) {
        const dx = leafWidth + 300;
        const dy = leafHeight + 350;

        const svg = d3
          .select(svgRef.current)
          .attr("viewBox", [(-dy * padding) / 2, 0, width, height])
          .attr("width", width)
          .attr("height", height);

        // Giving a value to the gElement (main g element)
        let gElementLocal;
        if (!gElementRef.current) {
          let svgGrid = svg
            .append("rect")
            .attr("fill", "url(#grid)")
            .attr("width", "100%")
            .attr("height", "100%");
          gElementLocal = svg.append("g");
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

        // Convert hierarchical data to a d3 hierarchy
        let root = d3.hierarchy(treeDataRef.current, children);

        // Sort the nodes.
        if (sort != null) root.sort(sort);

        // Compute the layout.
        const treeObj = tree()
          .nodeSize([leafWidth, dx])
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

        root.x0 = dy / 2;
        root.y0 = 0;

        // Compute the default height.
        if (height === undefined) height = x1 - x0 + dx * 2;

        root.descendants().forEach((d, i) => {
          d.id = d.data.sid;

          d._children = d.children;

          // Hide if depth is too high
          if (d.depth > parseInt(localSettings.maxStep) - 2) d.children = null;

          if (d.children && d.children !== null) {
            // Hide if occurency is too low
            d.children = hideLowOccurrenceChildren(d);
            if (d.children.length === 0) d.children = null;
          }
        });
        function hideLowOccurrenceChildren(parentNode) {
          // console.log('Hiding low occurrence children', parentNode)
          // console.log('Filtering children', parentNode.children)
          return parentNode.children.filter((child) => {
            let temp = (child.data.occurency / parentNode.data.occurency) * 100;
            // console.log('Ocurrency', temp, '>=', localSettingsRef.current.minPlayers, temp >= localSettingsRef.current.minPlayers)
            return temp >= localSettingsRef.current.minPlayers;
          });
        }
        const duration = 350;

        if (data.length === 0) {
          gNode.selectAll("g.node").remove();
          gLink.selectAll("path").remove();
        } else {
          rootNodeRef.current = root;
          update(root);
        }

        function update(source) {
          root.descendants().forEach((d, i) => {
            if (d.children && d.children !== null) {
              // Hide if occurency is too low
              d.children = hideLowOccurrenceChildren(d);
              if (d.children.length === 0) d.children = null;
            }
          });
          let tree = treeObj(root);
          let nodes = tree.descendants();
          let links = tree.links();
          setRootNode(tree);
          // console.log("Updating tree", root);

          var node = gNode.selectAll("g.node").data(nodes, (d) => {
            return d.id;
          });

          var nodeEnter = node
            .enter()
            .append("g")
            .attr("transform", (d) => {
              if (localSettings.hiddenEvents.includes(d.data.id)) {
                return `translate(${source.y0 - 500},${source.x0})`;
              }
              if (d.data.id === sessionStartEvent.id && isEconomyAnalysis) {
                return `translate(${source.y0 - rootOffsetRef.current},${source.x0})`;
              }
              return `translate(${source.y0},${source.x0})`;
            })
            .attr("opacity", (d) => {
              if (localSettings.hiddenEvents.includes(d.data.id)) {
                return 0.0;
              }
              if (d.data.id === sessionStartEvent.id && isEconomyAnalysis) {
                return 0;
              }
              return 1;
            })
            .style("pointer-events", (d) => {
              if (localSettings.hiddenEvents.includes(d.data.id)) {
                return "none";
              }
              return "all";
            })
            .attr("class", (d) => `node`);

          // Main leaf node body
          nodeEnter
            .append("rect")
            .attr(
              "class",
              (d) =>
                `${s.leafBody} ${funnelEvents.includes(d.data.id) ? s.leafGlow : ""} node`
            )
            .attr("rx", 10)
            .attr("width", (d) => leafWidth)
            .attr("height", (d) => leafHeight)
            .attr("x", (d) => -leafWidth / 2)
            .attr("y", (d) => -leafHeight / 2)
            .on("click", toggleChildren);

          nodeEnter
            .append("foreignObject")
            .attr("x", leafWidth / 2 + 10)
            .attr("y", -leafHeight / 2 - 30)
            .attr("width", 100)
            .attr("height", 40)
            .each(function (d) {
              const container = document.createElement("div");
              this.appendChild(container);
              const root = createRoot(container);
              root.render(
                <IconButton
                  variant="contained"
                  size="small"
                  sx={{}}
                  onClick={() => handleEventAudienceView(d.data)}
                >
                  <PersonSearchIcon />
                </IconButton>,
                this
              );
            });
          function handleEventAudienceView(d) {
            onProfileViewed(d.clientID);
          }

          //
          // Additive leaf node body (values in design event, ad length in ad event, IAP in IAP event etc.)
          //

          //
          // Design event
          //
          function validateValueArray(arr) {
            return arr && arr !== null && arr.length > 0;
          }
          try {
            nodeEnter
              .filter(function (d, i) {
                return getEventType(d) === designEvent.id;
              })
              .append("g")
              .attr("class", (d) => `additiveNode`)
              .lower()
              .each(function (d) {
                const valuesObjects = designEvents.find(
                  (e) => e.id === d.data.id
                )?.values;
                if (!valuesObjects) {
                  return;
                }
                let val1 = valuesObjects[0];
                if (val1) {
                  val1 = d.data[val1.valueID];
                }
                let val2 = valuesObjects[1];
                if (val2) {
                  val2 = d.data[val2.valueID];
                }
                let val3 = valuesObjects[2];
                if (val3) {
                  val3 = d.data[val3.valueID];
                }

                if (!val1 && !val2 && !val3) {
                  return;
                }

                const baseHeight = leafHeight * 1.5;

                // Making rect for the main body
                d3.select(this)
                  .append("rect")
                  .attr("class", (d) => `${s.leafAdditiveBody}`)
                  .attr("rx", 10)
                  .attr("width", (d) => leafWidth)
                  .attr("height", (d) => baseHeight)
                  .attr("x", (d) => -leafWidth / 2)
                  .attr("y", (d) => leafHeight / 3 - 5)
                  .on("click", (event, d) => {
                    if (validateValueArray(val1)) {
                      toggleTooltip(event, d.data, "designEvent");
                    } else if (validateValueArray(val2)) {
                      toggleTooltip(event, d.data, "designEvent");
                    } else if (validateValueArray(val3)) {
                      toggleTooltip(event, d.data, "designEvent");
                    }
                  });

                // Making values text
                let values = 0;
                if (validateValueArray(val1)) {
                  makeValue(
                    designEvents.find((e) => e.id === d.data.id).values[0]
                      .valueName,
                    getMostCommonValue(
                      val1,
                      designEvents.find((e) => e.id === d.data.id).values[0]
                    ),
                    this
                  );
                  values++;
                }
                if (validateValueArray(val2)) {
                  makeValue(
                    designEvents.find((e) => e.id === d.data.id).values[1]
                      .valueName,
                    getMostCommonValue(
                      val2,
                      designEvents.find((e) => e.id === d.data.id).values[1]
                    ),
                    this
                  );
                  values++;
                }
                if (validateValueArray(val3)) {
                  makeValue(
                    designEvents.find((e) => e.id === d.data.id).values[2]
                      .valueName,
                    getMostCommonValue(
                      val3,
                      designEvents.find((e) => e.id === d.data.id).values[2]
                    ),
                    this
                  );
                  values++;
                }

                function formatValue(value, valueFormat) {
                  switch (valueFormat) {
                    case "money":
                      return `$${value}`;
                    case "percentile":
                      return `${value}%`;
                    default:
                      return value;
                  }
                }

                function getMostCommonValue(valuesArray, valueObj) {
                  const valuesCount = {};
                  valuesArray.forEach((value) => {
                    if (valuesCount[value] === undefined) {
                      valuesCount[value] = 1;
                    } else {
                      valuesCount[value] += 1;
                    }
                  });
                  let mostCommonValue = "";
                  let mostCommonCount = 0;
                  let totalCount = Object.keys(valuesCount)
                    .map((value) => valuesCount[value])
                    .reduce((acc, currentValue) => acc + currentValue, 0);

                  Object.keys(valuesCount).forEach((value) => {
                    if (valuesCount[value] > mostCommonCount) {
                      mostCommonValue = value;
                      mostCommonCount = valuesCount[value];
                    }
                  });

                  let formatted = formatValue(
                    mostCommonValue,
                    valueObj.valueFormat
                  );
                  return (
                    formatted +
                    "   (" +
                    ((mostCommonCount / totalCount) * 100).toFixed(2) +
                    "%)"
                  );
                }
                function makeValue(valueName, value, ref) {
                  d3.select(ref)
                    .append("text")
                    .attr("class", `${s.leafAdditiveText} ${s.noInteract}`)
                    .attr("x", 5)
                    .attr("y", values * 22)
                    .each(function (d) {
                      // Value name
                      d3.select(this)
                        .append("tspan")
                        .attr("class", (d) => `${s.regular}`)
                        .attr("dy", (d) => baseHeight / 2 + 5)
                        .attr("dx", (d) => -leafWidth / 2 + 5)
                        .text(valueName + ":");

                      // Value itself (the most popular)
                      d3.select(this)
                        .append("tspan")
                        .attr("class", (d) => `${s.bold}`)
                        .text(" " + value);
                    });
                }
              });
          } catch (error) {
            console.error(error);
          }

          //
          // Economy event
          //
          nodeEnter
            .filter(function (d, i) {
              return getEventType(d) === economyEvent.id;
            })
            .append("g")
            .attr("class", (d) => `additiveNode`)
            .lower()
            .each(function (d) {
              const baseHeight = leafHeight * 1.5;

              // Making rect for the main body
              d3.select(this)
                .append("rect")
                .attr("class", (d) => `${s.leafAdditiveBody}`)
                .attr("rx", 10)
                .attr("width", (d) => leafWidth)
                .attr("height", (d) => baseHeight)
                .attr("x", (d) => -leafWidth / 2)
                .attr("y", (d) => leafHeight / 3 - 5)
                .on("click", (event, d) => {
                  toggleTooltip(event, d.data, "economyEvent");
                });

              makeValue(getMostCommonValue(d.data.amount), this);

              function getMostCommonValue(valuesArray) {
                try {
                  const valuesCount = {};
                  valuesArray.forEach((value) => {
                    if (valuesCount[value] === undefined) {
                      valuesCount[value] = 1;
                    } else {
                      valuesCount[value] += 1;
                    }
                  });
                  let mostCommonValue = "";
                  let mostCommonCount = 0;
                  let totalCount = Object.keys(valuesCount)
                    .map((value) => valuesCount[value])
                    .reduce((acc, currentValue) => acc + currentValue, 0);

                  Object.keys(valuesCount).forEach((value) => {
                    if (valuesCount[value] > mostCommonCount) {
                      mostCommonValue = value;
                      mostCommonCount = valuesCount[value];
                    }
                  });
                  return (
                    mostCommonValue +
                    "   (" +
                    ((mostCommonCount / totalCount) * 100).toFixed(2) +
                    "%)"
                  );
                } catch (err) {
                  console.log("Error building tree: ", err);
                }
              }

              function makeValue(value, ref) {
                try {
                  let icon =
                    entityIcons.find((e) => e.nodeID === d.data.currencyID)
                      ?.icon || "";
                  if (!icon || icon === undefined || icon === "") {
                    icon = "data:image/svg+xml;base64," + placeholderEntityIcon;
                  }

                  d3.select(ref)
                    .append("image")
                    .attr("class", s.economyCurrencyIcon)
                    .attr("style", "pointer-events: none")
                    .attr("y", (d) => baseHeight / 2)
                    .attr("x", -leafWidth / 2 + 15)
                    .attr("href", icon);

                  d3.select(ref)
                    .append("text")
                    .attr("class", `${s.leafAdditiveText} ${s.noInteract}`)
                    .attr("x", 60)
                    .attr("y", 1 * 22)
                    .attr("dy", (d) => baseHeight / 2 + 5)
                    .attr("dx", (d) => -leafWidth / 2 + 5)
                    .each(function (d) {
                      let type = d.data.type;
                      // Value itself (the most popular and percent)
                      d3.select(this)
                        .append("tspan")
                        .attr(
                          "class",
                          (d) =>
                            `${s.regular} ${s.bold} ${type === "sink" ? s.negativeDelta : s.positiveDelta}`
                        )
                        .text(`${type === "sink" ? "-" : "+"}${value}`);

                      d3.select(this)
                        .append("tspan")
                        .attr("class", (d) => `${s.regular}`)
                        .text(" from ");

                      // Source
                      d3.select(this)
                        .append("tspan")
                        .attr("class", (d) => `${s.bold}`)
                        .text(trim(d.data.origin, 13));
                    });
                } catch (err) {
                  console.log("Error building design event values: ", err);
                }
              }
            });

          //
          // Ad event
          //
          function makeTimeString(time) {
            let hours = Math.floor(time / 3600);
            let minutes = Math.floor((time - hours * 3600) / 60);
            let seconds = time - hours * 3600 - minutes * 60;

            time = `${seconds}s`;
            if (minutes !== 0) {
              time = `${minutes}m ` + time;
            }
            if (hours !== 0) {
              time = `${hours}h ` + time;
            }
            return time;
          }
          nodeEnter
            .filter(function (d, i) {
              return getEventType(d) === adEvent.id;
            })
            .append("g")
            .attr("class", (d) => `additiveNode`)
            .lower()
            .each(function (d) {
              const baseHeight = leafHeight * 1.1;

              // Making rect for the main body
              d3.select(this)
                .append("rect")
                .attr("class", (d) => `${s.leafAdditiveBody}`)
                .attr("rx", 10)
                .attr("width", (d) => leafWidth)
                .attr("height", (d) => baseHeight)
                .attr("x", (d) => -leafWidth / 2)
                .attr("y", (d) => leafHeight / 3 - 5)
                .on("click", (event, d) => {
                  toggleTooltip(event, d.data, "adEvent");
                });

              makeValue(getMostCommonValue(d.data.timeSpent || [0]), this);

              function getMostCommonValue(valuesArray) {
                const valuesCount = {};
                valuesArray.forEach((value) => {
                  if (valuesCount[value] === undefined) {
                    valuesCount[value] = 1;
                  } else {
                    valuesCount[value] += 1;
                  }
                });
                let mostCommonValue = "";
                let mostCommonCount = 0;
                let totalCount = Object.keys(valuesCount)
                  .map((value) => valuesCount[value])
                  .reduce((acc, currentValue) => acc + currentValue, 0);

                Object.keys(valuesCount).forEach((value) => {
                  if (valuesCount[value] > mostCommonCount) {
                    mostCommonValue = value;
                    mostCommonCount = valuesCount[value];
                  }
                });
                return {
                  value: mostCommonValue,
                  percent: ((mostCommonCount / totalCount) * 100).toFixed(2),
                };
              }
              function makeValue(value, ref) {
                d3.select(ref)
                  .append("text")
                  .attr("class", `${s.leafAdditiveText} ${s.noInteract}`)
                  .attr("x", 10)
                  .attr("y", 1 * 22)
                  .attr("dy", (d) => baseHeight / 2 + 5)
                  .attr("dx", (d) => -leafWidth / 2 + 5)
                  .each(function (d) {
                    // Title
                    d3.select(this)
                      .append("tspan")
                      .attr("class", (d) => `${s.regular}`)
                      .text(`Time spent: `);

                    // Value itself (the most popular and percent)
                    d3.select(this)
                      .append("tspan")
                      .attr("class", (d) => `${s.regular} ${s.bold}`)
                      .text(
                        `${makeTimeString(value.value)} (${value.percent}%)`
                      );
                  });
              }
            });

          //
          // Offer shown event
          //
          try {
            nodeEnter
              .filter(function (d, i) {
                return getEventType(d) === offerShownEvent.id;
              })
              .append("g")
              .attr("class", (d) => `additiveNode`)
              .lower()
              .each(function (d) {
                const baseHeight = leafHeight * 2.7;
                const basePosY = leafHeight / 2 + 15;

                // Making rect for the main body
                d3.select(this)
                  .append("rect")
                  .attr("class", (d) => `${s.leafAdditiveBody}`)
                  .attr("style", "pointer-events: none")
                  .attr("rx", 10)
                  .attr("width", (d) => leafWidth)
                  .attr("height", (d) => baseHeight)
                  .attr("x", (d) => -leafWidth / 2)
                  .attr("y", (d) => leafHeight / 3 - 5);

                // Offer body
                d3.select(this)
                  .append("rect")
                  .attr("class", (d) => `${s.offerAdditiveBodyContainer}`)
                  .attr("style", "pointer-events: none")
                  .attr("rx", 10)
                  .attr("width", (d) => leafWidth / 1.2)
                  .attr("height", (d) => baseHeight / 1.4)
                  .attr("x", (d) => -leafWidth / 2.4)
                  .attr("y", (d) => basePosY);

                let offerName = offers.find(
                  (offer) => offer.offerID === d.data.offerID
                );
                if (!offerName) {
                  offerName = "Unknown offer";
                } else {
                  offerName = offerName.offerName;
                }

                // Offer title name
                d3.select(this)
                  .append("text")
                  .attr("style", "pointer-events: none")
                  .attr(
                    "class",
                    `${s.leafAdditiveText} ${s.bold} ${s.noInteract}`
                  )
                  .attr("x", 75)
                  .attr("y", 0)
                  .attr("dy", (d) => baseHeight / 2 - 13)
                  .attr("dx", (d) => -leafWidth / 2 + 5)
                  .text(trim(offerName, 26));

                makeOfferTitleIcon(this);
                makeOfferPrice(getMostCommonValue(d.data.price), this);
                makeOfferContent(this);

                function getMostCommonValue(valuesArray) {
                  const valuesCount = {};
                  valuesArray.forEach((value) => {
                    if (valuesCount[value] === undefined) {
                      valuesCount[value] = 1;
                    } else {
                      valuesCount[value] += 1;
                    }
                  });
                  let mostCommonValue = "";
                  let mostCommonCount = 0;
                  let totalCount = Object.keys(valuesCount)
                    .map((value) => valuesCount[value])
                    .reduce((acc, currentValue) => acc + currentValue, 0);

                  Object.keys(valuesCount).forEach((value) => {
                    if (valuesCount[value] > mostCommonCount) {
                      mostCommonValue = value;
                      mostCommonCount = valuesCount[value];
                    }
                  });
                  return mostCommonValue;
                }
                function makeOfferTitleIcon(ref) {
                  // Offer icon sub-body
                  d3.select(ref)
                    .append("rect")
                    .attr("class", (d) => `${s.offerAdditiveBodyContainer}`)
                    .attr("rx", 10)
                    .attr("style", "cursor: pointer")
                    .attr("width", (d) => leafWidth / 4.5)
                    .attr("height", (d) => baseHeight / 2)
                    .attr("x", (d) => -leafWidth / 2.4)
                    .attr("y", (d) => baseHeight / 2 - 1)
                    .on("click", (event, d) => {
                      window.open("/offers", "_blank", "noreferrer");
                    });

                  let icon = offers.find(
                    (offer) => offer.offerID === d.data.offerID
                  ).offerIcon;
                  if (icon === "") {
                    icon = "data:image/svg+xml;base64," + placeholderEntityIcon;
                  }
                  d3.select(ref)
                    .append("image")
                    .attr("class", s.economyCurrencyIcon)
                    .attr("style", "pointer-events: none")
                    .attr("y", (d) => baseHeight / 2 + 25)
                    .attr("x", -leafWidth / 2 + 48)
                    .attr("href", icon);

                  d3.select(ref)
                    .append("text")
                    .attr(
                      "class",
                      `${s.leafAdditiveText} ${s.regular} ${s.noInteract} ${s.small}`
                    )
                    .attr("style", "pointer-events: none")
                    .attr("x", 44)
                    .attr("y", 0)
                    .attr("dy", (d) => baseHeight / 2 + 18)
                    .attr("dx", (d) => -leafWidth / 2 + 5)
                    .text("Offer:");
                }
                function makeOfferPrice(value, ref) {
                  let isEntityCurrency =
                    offers.find((offer) => offer.offerID === d.data.offerID)
                      .offerPrice.targetCurrency === "entity";
                  let offset = 90;

                  let priceOffset = isEntityCurrency ? 20 : 30;
                  let priceValue = isEntityCurrency ? `${value}` : `$${value}`;

                  // Offer icon sub-body
                  d3.select(ref)
                    .append("rect")
                    .attr("class", (d) => `${s.offerAdditiveBodyContainer}`)
                    .attr("style", "cursor: pointer")
                    .attr("rx", 10)
                    .attr("width", (d) => leafWidth / 4.5)
                    .attr("height", (d) => baseHeight / 2)
                    .attr("x", (d) => -leafWidth / 2.4 + offset)
                    .attr("y", (d) => baseHeight / 2 - 1)
                    .on("click", (event, d) => {
                      toggleTooltip(event, d.data, "offerShownPricing");
                    });

                  d3.select(ref)
                    .append("text")
                    .attr(
                      "class",
                      `${s.leafAdditiveText} ${s.regular} ${s.noInteract} ${s.small}`
                    )
                    .attr("x", 44 + offset)
                    .attr("y", 0)
                    .attr("dy", (d) => baseHeight / 2 + 18)
                    .attr("dx", (d) => -leafWidth / 2 + 6)
                    .text("Price:");

                  d3.select(ref)
                    .append("text")
                    .attr(
                      "class",
                      `${s.leafAdditiveText} ${s.extraBold} ${s.noInteract} ${s.small} ${s.positiveDelta} ${s.large}`
                    )
                    .attr("x", 67 + offset)
                    .attr("y", priceOffset)
                    .attr("dy", (d) => baseHeight / 2 + 23)
                    .attr("dx", (d) => -leafWidth / 2)
                    .attr("text-anchor", "middle")
                    .text(priceValue);

                  if (isEntityCurrency) {
                    let icon = offers.find(
                      (offer) => offer.offerID === d.data.offerID
                    ).offerPrice.nodeID;
                    icon = entityIcons.find((e) => e.nodeID === icon).icon;
                    if (icon === "") {
                      icon =
                        "data:image/svg+xml;base64," + placeholderEntityIcon;
                    }
                    d3.select(ref)
                      .append("image")
                      .attr("class", s.entityCurrencyIcon)
                      .attr("style", "pointer-events: none")
                      .attr("y", (d) => baseHeight / 2 + 50)
                      .attr("x", -leafWidth / 2 + offset + 57)
                      .attr("href", icon);
                  }
                }
                function makeOfferContent(ref) {
                  let content = offers.find(
                    (offer) => offer.offerID === d.data.offerID
                  ).content;
                  let offset = 180;

                  // Offer icon sub-body
                  d3.select(ref)
                    .append("rect")
                    .attr("class", (d) => `${s.offerAdditiveBodyContainer}`)
                    .attr("style", "cursor: pointer")
                    .attr("rx", 10)
                    .attr("width", (d) => leafWidth / 3 - 5)
                    .attr("height", (d) => baseHeight / 2)
                    .attr("x", (d) => -leafWidth / 2.4 + offset)
                    .attr("y", (d) => baseHeight / 2 - 1)
                    .on("click", (event, d) => {
                      toggleTooltip(event, d.data, "offerContent");
                    });

                  d3.select(ref)
                    .append("text")
                    .attr(
                      "class",
                      `${s.leafAdditiveText} ${s.regular} ${s.noInteract} ${s.small}`
                    )
                    .attr("x", 52 + offset)
                    .attr("style", "pointer-events: none")
                    .attr("y", 0)
                    .attr("dy", (d) => baseHeight / 2 + 18)
                    .attr("dx", (d) => -leafWidth / 2 + 6)
                    .text("Content:");

                  d3.select(ref)
                    .append("text")
                    .attr(
                      "class",
                      `${s.leafAdditiveText} ${s.bold} ${s.noInteract} ${s.large}`
                    )
                    .attr("x", 78 + offset)
                    .attr("style", "pointer-events: none")
                    .attr("y", 0)
                    .attr("text-anchor", "middle")
                    .attr("dy", (d) => baseHeight / 2 + 50)
                    .attr("dx", (d) => -leafWidth / 2 + 6)
                    .text(`${content.length} items`);
                }
              });
          } catch (err) {
            console.log('Error building tree "Offer Shown event": ', err);
          }

          //
          // Offer purchased event
          //
          nodeEnter
            .filter(function (d, i) {
              return getEventType(d) === offerEvent.id;
            })
            .append("g")
            .attr("class", (d) => `additiveNode`)
            .lower()
            .each(function (d) {
              const baseHeight = leafHeight * 1.4;
              const basePosY = leafHeight / 2 + 10;

              // Making rect for the main body
              d3.select(this)
                .append("rect")
                .attr("class", (d) => `${s.leafAdditiveBody}`)
                // .attr("style", "pointer-events: none")
                .attr("rx", 10)
                .attr("width", (d) => leafWidth)
                .attr("height", (d) => baseHeight)
                .attr("x", (d) => -leafWidth / 2)
                .attr("y", (d) => leafHeight / 3 - 5)
                .on("click", (event, d) => {
                  toggleTooltip(event, d.data, "offerEvent");
                });

              // Offer body
              d3.select(this)
                .append("rect")
                .attr("class", (d) => `${s.offerAdditiveBodyContainer}`)
                .attr("style", "pointer-events: none")
                .attr("rx", 10)
                .attr("width", (d) => leafWidth / 1.2)
                .attr("height", (d) => baseHeight / 2)
                .attr("x", (d) => -leafWidth / 2.4)
                .attr("y", (d) => basePosY);

              let offerName = offers.find(
                (offer) => offer.offerID === d.data.offerID
              );
              if (!offerName) {
                offerName = "Unknown offer";
              } else {
                offerName = trim(offerName.offerName, 14);
              }

              // Offer name
              d3.select(this)
                .append("text")
                .attr("style", "pointer-events: none")
                .attr(
                  "class",
                  `${s.leafAdditiveText} ${s.bold} ${s.noInteract}`
                )
                .attr("x", 85)
                .attr("y", baseHeight / 2 + 25)
                .attr("dx", (d) => -leafWidth / 2 + 5)
                .text(trim(offerName, 26));

              makeOfferPrice(getMostCommonValue(d.data.price), this);

              // Offer icon
              let icon = offers.find(
                (offer) => offer.offerID === d.data.offerID
              ).offerIcon;
              if (icon === "") {
                icon = "data:image/svg+xml;base64," + placeholderEntityIcon;
              }
              d3.select(this)
                .append("image")
                .attr("class", s.offerPurchasedIcon)
                .attr("style", "pointer-events: none")
                .attr("y", (d) => baseHeight / 2 + 2)
                .attr("x", -leafWidth / 2 + 48)
                .attr("href", icon);

              function getMostCommonValue(valuesArray) {
                const valuesCount = {};
                valuesArray.forEach((value) => {
                  if (valuesCount[value] === undefined) {
                    valuesCount[value] = 1;
                  } else {
                    valuesCount[value] += 1;
                  }
                });
                let mostCommonValue = "";
                let mostCommonCount = 0;
                let totalCount = Object.keys(valuesCount)
                  .map((value) => valuesCount[value])
                  .reduce((acc, currentValue) => acc + currentValue, 0);

                Object.keys(valuesCount).forEach((value) => {
                  if (valuesCount[value] > mostCommonCount) {
                    mostCommonValue = value;
                    mostCommonCount = valuesCount[value];
                  }
                });
                return mostCommonValue;
              }
              function makeOfferPrice(value, ref) {
                let isEntityCurrency =
                  offers.find((offer) => offer.offerID === d.data.offerID)
                    .offerPrice.targetCurrency === "entity";

                let priceValue = isEntityCurrency ? `${value}` : `+$${value}`;

                d3.select(ref)
                  .append("text")
                  .attr(
                    "class",
                    `${s.leafAdditiveText} ${s.extraBold} ${s.noInteract} ${s.small} ${s.positiveDelta} ${s.large}`
                  )
                  .attr("x", 0)
                  .attr("y", 0)
                  .attr("dy", (d) => baseHeight / 2 + 27)
                  .attr(
                    "dx",
                    (d) => leafWidth / 2 - (isEntityCurrency ? 65 : 40)
                  )
                  .attr("text-anchor", "end")
                  .text(priceValue);

                if (isEntityCurrency) {
                  let icon = offers.find(
                    (offer) => offer.offerID === d.data.offerID
                  ).offerPrice.nodeID;
                  icon = entityIcons.find((e) => e.nodeID === icon).icon;
                  if (icon === "") {
                    icon = "data:image/svg+xml;base64," + placeholderEntityIcon;
                  }
                  d3.select(ref)
                    .append("image")
                    .attr("class", s.entityCurrencyIcon)
                    .attr("style", "pointer-events: none")
                    .attr("y", baseHeight / 2 + 8)
                    .attr("x", leafWidth / 2 - 60)
                    .attr("href", icon);
                }
              }
            });

          //
          // Crash event
          //
          nodeEnter
            .filter(function (d, i) {
              return getEventType(d) === crashEvent.id;
            })
            .append("g")
            .attr("class", (d) => `additiveNode`)
            .lower()
            .each(function (d) {
              const baseHeight = leafHeight * 1.1;

              // Making rect for the main body
              d3.select(this)
                .append("rect")
                .attr(
                  "class",
                  (d) => `${s.leafAdditiveBody} ${s.noInteractBody}`
                )
                .attr("rx", 10)
                .attr("width", (d) => leafWidth)
                .attr("height", (d) => baseHeight)
                .attr("x", (d) => -leafWidth / 2)
                .attr("y", (d) => leafHeight / 3 - 5);

              d3.select(this)
                .append("text")
                .attr("class", `${s.leafAdditiveText} ${s.noInteract}`)
                .attr("x", 10)
                .attr("y", 1 * 22)
                .attr("dy", (d) => baseHeight / 2 + 5)
                .attr("dx", (d) => -leafWidth / 2 + 5)
                .each(function (d) {
                  // Title
                  d3.select(this)
                    .append("tspan")
                    .attr("class", (d) => `${s.regular}`)
                    .text(`Crash ID: `);

                  // Value itself (the most popular and percent)
                  d3.select(this)
                    .append("tspan")
                    .attr("class", (d) => `${s.regular} ${s.bold}`)
                    .text(`${d.data.message}`);
                });
            });

          //
          // Report event
          //
          nodeEnter
            .filter(function (d, i) {
              return getEventType(d) === reportEvent.id;
            })
            .append("g")
            .attr("class", (d) => `additiveNode`)
            .lower()
            .each(function (d) {
              const baseHeight = leafHeight * 1.5;

              // Making rect for the main body
              d3.select(this)
                .append("rect")
                .attr("class", (d) => `${s.leafAdditiveBody}`)
                .attr("rx", 10)
                .attr("width", (d) => leafWidth)
                .attr("height", (d) => baseHeight)
                .attr("x", (d) => -leafWidth / 2)
                .attr("y", (d) => leafHeight / 3 - 15)
                .on("click", (event, d) => {
                  toggleTooltip(event, d.data, "reportEvent");
                });

              d3.select(this)
                .append("text")
                .attr("class", `${s.leafAdditiveText} ${s.noInteract}`)
                .attr("x", 10)
                .attr("y", 22)
                .attr("dy", (d) => baseHeight / 2 - 10)
                .attr("dx", (d) => -leafWidth / 2 + 5)
                .each(function (d) {
                  // Title
                  d3.select(this)
                    .append("tspan")
                    .attr("class", (d) => `${s.regular}`)
                    .text(`Report ID: `);

                  // Value itself (the most popular and percent)
                  d3.select(this)
                    .append("tspan")
                    .attr("class", (d) => `${s.regular}`)
                    .text(`${d.data.reportID}`);
                });

              function getMostCommonValue(valuesArray) {
                const valuesCount = {};
                valuesArray.forEach((value) => {
                  if (valuesCount[value] === undefined) {
                    valuesCount[value] = 1;
                  } else {
                    valuesCount[value] += 1;
                  }
                });
                let mostCommonValue = "";
                let mostCommonCount = 0;
                let totalCount = Object.keys(valuesCount)
                  .map((value) => valuesCount[value])
                  .reduce((acc, currentValue) => acc + currentValue, 0);

                Object.keys(valuesCount).forEach((value) => {
                  if (valuesCount[value] > mostCommonCount) {
                    mostCommonValue = value;
                    mostCommonCount = valuesCount[value];
                  }
                });
                return {
                  value: mostCommonValue,
                  percent: ((mostCommonCount / totalCount) * 100).toFixed(2),
                };
              }

              d3.select(this)
                .append("text")
                .attr("class", `${s.leafAdditiveText} ${s.noInteract}`)
                .attr("x", 10)
                .attr("y", 44)
                .attr("dy", (d) => baseHeight / 2 - 10)
                .attr("dx", (d) => -leafWidth / 2 + 5)
                .each(function (d) {
                  // Value itself (the most popular and percent)
                  d3.select(this)
                    .append("tspan")
                    .attr("class", (d) => `${s.regular} ${s.bold}`)
                    .text(
                      `${trim(getMostCommonValue(d.data.message).value, 31)}`
                    );
                  // Value itself (the most popular and percent)
                  d3.select(this)
                    .append("tspan")
                    .attr("class", (d) => `${s.regular}`)
                    .text(` (${getMostCommonValue(d.data.message).percent}%)`);
                });
            });

          // Node name text
          nodeEnter
            .append("text")
            .text((d) => {
              if (reservedEvents.some((e) => e.id === d.data.id)) {
                switch (d.data.id) {
                  case sessionStartEvent.id:
                    return reservedEvents.find((e) => e.id === d.data.id).name;
                  case sessionEndEvent.id:
                    return reservedEvents.find((e) => e.id === d.data.id).name;
                  case offerEvent.id:
                    return reservedEvents.find((e) => e.id === d.data.id).name;
                  case offerShownEvent.id:
                    return reservedEvents.find((e) => e.id === d.data.id).name;
                  case economyEvent.id:
                    let type = "";
                    switch (d.data.type) {
                      case "sink":
                        type = "Sink: ";
                        break;
                      case "source":
                        type = "Source: ";
                        break;
                    }
                    let name = entitiesNames.find(
                      (e) => e.nodeID === d.data.currencyID
                    ).name;
                    return type + name;
                  case adEvent.id:
                    let ad_prefix = reservedEvents.find(
                      (e) => e.id === d.data.id
                    ).name;
                    let ad_suffix = d.data.adType;
                    return ad_prefix + ": " + ad_suffix;
                  case reportEvent.id:
                    return reservedEvents.find((e) => e.id === d.data.id).name;
                  case crashEvent.id:
                    return reservedEvents.find((e) => e.id === d.data.id).name;
                  case uiEvent.id:
                    return reservedEvents.find((e) => e.id === d.data.id).name;
                }
              } else if (designEvents.some((e) => e.id === d.data.id)) {
                return designEvents.find((e) => e.id === d.data.id).name;
              }
              return trim(d.data.id, 16);
            })
            .attr("class", (d) => `${s.leafLabel} ${s.bold}`)
            .attr("dy", (d) => 4)
            .attr("dx", (d) => -leafWidth / 2 + getStyle(d).badgeWidth + 25)
            .attr("text-anchor", "start");

          // Node players count in percentage
          nodeEnter
            .append("text")
            .attr("class", (d) => s.leafPercentage)
            .attr("dy", (d) => 4)
            .attr("dx", (d) => leafWidth / 2 - 10)
            .attr("text-anchor", "end")
            .each(function (d) {
              d3.select(this)
                .append("tspan")
                .text((d) => {
                  if (d.parent) {
                    let percentage =
                      (
                        (d.data.occurency / d.parent.data.occurency) *
                        100
                      ).toFixed(2) + "%";
                    return `${percentage}`;
                  }
                  return "";
                })
                .attr("x", 0)
                .attr("y", -10);
              d3.select(this)
                .append("tspan")
                .attr("class", s.leafPlayerCount)
                .text((d) => {
                  return `${formatNumber(d.data.occurency)}`;
                })
                .attr("x", (d) => (d.depth === 0 ? 0 : leafWidth / 2 - 10))
                .attr("y", (d) => (d.depth === 0 ? 0 : 20));
            });

          // Node "time to arrive" text
          nodeEnter
            .append("text")
            .filter(function (d, i) {
              if (
                d.parent?.data?.id === sessionStartEvent.id &&
                isEconomyAnalysis
              ) {
                return false;
              }
              return true;
            })
            .attr("class", (d) => `${s.leafTimeCount}`)
            .attr("dy", (d) => -leafHeight / 5)
            .attr("dx", (d) => -leafWidth + 30)
            .attr("text-anchor", "middle")
            .on("click", (event, d) => toggleTooltip(event, d.data, "time"))
            .text((d) => {
              if (d.data.time === undefined || d.data.time.length === 0)
                return "";
              let time = median(d.data.time);
              let hours = Math.floor(time / 3600);
              let minutes = Math.floor((time - hours * 3600) / 60);
              let seconds = time - hours * 3600 - minutes * 60;

              time = `${seconds}s mean.`;
              if (minutes !== 0) {
                time = `${minutes}m ` + time;
              }
              if (hours !== 0) {
                time = `${hours}h ` + time;
              }
              return time;
            });

          function median(numbers) {
            const sorted = numbers.slice().sort((a, b) => a - b);

            const length = sorted.length;

            if (length % 2 === 0) {
              const middleIndex = length / 2;
              return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
            } else {
              const middleIndex = Math.floor(length / 2);
              return sorted[middleIndex];
            }
          }

          const badgeHeight = leafHeight / 2;
          const badgeOffsetLeft = 15;
          // Leaf badge body
          nodeEnter
            .append("rect")
            .attr("class", (d) => `${s.leafBadge}`)
            .attr("rx", 15)
            .attr("stroke", (d) => getStyle(d).borderColor)
            .attr("width", (d) => getStyle(d).badgeWidth)
            .attr("height", (d) => badgeHeight)
            .attr("x", (d) => -leafWidth / 2 + badgeOffsetLeft)
            .attr("y", (d) => -(badgeHeight / 2));
          // Leaf badge text
          nodeEnter
            .append("text")
            .text((d) => {
              return trim(getStyle(d).badgeText, 16);
            })
            .attr("class", (d) => s.leafBadgeLabel)
            .attr("dy", (d) => 4)
            .attr(
              "dx",
              (d) =>
                -leafWidth / 2 + badgeOffsetLeft + getStyle(d).badgeWidth / 2
            )
            .attr("text-anchor", "middle");

          // UPDATE
          const nodeUpdate = node
            .merge(nodeEnter)
            .transition()
            .ease(d3.easeCubic)
            .duration(duration)
            .attr("transform", (d) => {
              return `translate(${d.depth === 0 ? d.y - rootOffsetRef.current : d.y},${d.x})`;
            });

          // Children count if collapsed
          nodeUpdate.select(function (d) {
            const parentNode = d3.select(this);
            if (d.children) {
              parentNode.selectAll("text.childrenCount").remove();
            } else {
              parentNode.selectAll("text.childrenCount").remove();
              parentNode
                .append("text")
                .attr("class", (d) => `${s.leafChildrenCount} childrenCount`)
                .attr("dy", (d) => 4)
                .attr("dx", (d) => leafWidth / 2 + 15)
                .attr("text-anchor", "start")
                .text((d) => {
                  if (d._children) {
                    return "+" + countAllChildren(d, "_children");
                  }
                  return "";
                });
            }
            return this;
          });

          // Remove any exiting nodes
          var nodeExit = node
            .exit()
            .transition()
            .ease(d3.easeCubic)
            .duration(duration)
            .remove()
            .attr("transform", function (d) {
              let targetPosX =
                source.depth === 0
                  ? source.y - rootOffsetRef.current
                  : source.y;
              return "translate(" + targetPosX + "," + source.x + ")";
            });

          // ****************** links section ***************************
          // Update the links...
          var link = gLink.selectAll("path").data(links, function (d) {
            return d.target.id;
          });

          // Enter any new links at the parent's previous position.
          var linkEnter = link
            .enter()
            .append("path")
            .attr("class", s.leafLink)
            .attr("opacity", (d) => {
              if (localSettings.hiddenEvents.includes(d.target.data.id)) {
                if (
                  d.target.children === null ||
                  d.target.children.length === 0
                ) {
                  return `0`;
                }
              }
              if (
                d.source?.data?.id === sessionStartEvent.id &&
                isEconomyAnalysis
              ) {
                return 0;
              }
            })
            .attr("d", (d) => {
              const sourceNode = d.source;

              const deltaX = source.x0 - source.x0;
              const deltaY = source.y0 - source.y0;
              const sourcePaddingX = leafWidth / 2;
              const midY = (source.y0 - source.y0) / 3;

              // If a root node (start session event), do an offset since its slightly moved away from other nodes
              let offset = sourceNode.depth === 0 ? rootOffsetRef.current : 0;

              // 1. Starting point
              // 2. Midpoint - lower point (start of the elbow)
              // 3. Midpoint - upper point (end of the elbow)
              // 4. End point
              return `
                            M${source.y0 - offset},${source.x0}
                            L${source.y0},${source.x0}
                            V${source.x0}H${source.y0}`;
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
              if (targetNode === undefined) return;
              const deltaX = targetNode.x - sourceNode.x;
              const deltaY = targetNode.y - sourceNode.y;
              const sourcePaddingX = leafWidth / 2;
              const midY = (targetNode.y - sourceNode.y) / 3;

              // If a root node (start session event), do an offset since its slightly moved away from other nodes
              let offset = sourceNode.depth === 0 ? rootOffsetRef.current : 0;

              // 1. Starting point
              // 2. Midpoint - lower point (start of the elbow)
              // 3. Midpoint - upper point (end of the elbow)
              // 4. End point
              return `
                                M${sourceNode.y - offset},${sourceNode.x}
                                L${sourceNode.y + sourcePaddingX + midY},${sourceNode.x}
                                V${targetNode.x}H${targetNode.y}`;
            });

          // Transition exiting nodes to the parent's new position.
          const linkExit = link
            .exit()
            .transition()
            .ease(d3.easeCubic)
            .duration(duration)
            .remove()
            .attr("d", (d) => {
              const sourceNode = d.source;

              const deltaX = source.x - source.x;
              const deltaY = source.y - source.y;
              const sourcePaddingX = leafWidth / 2;
              const midY = (source.y - source.y) / 3;

              // If a root node (start session event), do an offset since its slightly moved away from other nodes
              let offset = sourceNode.depth === 0 ? rootOffsetRef.current : 0;

              // 1. Starting point
              // 2. Midpoint - lower point (start of the elbow)
              // 3. Midpoint - upper point (end of the elbow)
              // 4. End point
              return `
                            M${source.y + sourcePaddingX - offset},${source.x}
                            L${source.y + sourcePaddingX + midY},${source.x}
                            V${source.x}H${source.y}`;
            });

          // Store the old positions for transition.
          root.eachBefore((d) => {
            d.x0 = d.x;
            d.y0 = d.y;
          });

          // Saving current depth so we can properly draw the steps visualization, and also catch if we are enlarging the tree
          // (but we only catch the diff between depths, not if we actually opened any branch)
          tree.each((d) => {
            let tempDepth = d.depth;
            function traverse(d) {
              if (d.children) {
                d.children.forEach((child) => {
                  if (child.depth > tempDepth) {
                    tempDepth = child.depth;
                  }
                  traverse(child);
                });
              }
            }
            setCurrentDepth(tempDepth);
            traverse(d);
          });

          drawVisualizations(gElementLocal, tree);
          makeGlowingNodes();
        }

        // Toggle children on click.
        function toggleChildren(event, d) {
          if (!d._children) return;
          if (d.children) {
            if (event.shiftKey) {
              recursiveClose(d);
            } else {
              d.children = null;
            }
          } else {
            d.children = d._children;

            if (event.shiftKey) {
              recursiveOpen(d);
            } else {
              d.children = hideLowOccurrenceChildren(d);
              if (d.children.length === 0) d.children = null;
            }
          }
          recursiveFindAndUpdateNode(d);
          update(d);
          setLastInteractionID(shortid.generate());
        }
        function recursiveFindAndUpdateNode(node) {
          root.descendants().forEach((d, i) => {
            if (d.id === node.id) {
              d = node;
            }
          });
          rootNodeRef.current = root;
        }
        function recursiveClose(node) {
          if (node._children === undefined || node._children.length === 0)
            return;

          if (node.children) {
            node.children.forEach((child) => {
              recursiveClose(child);
            });
          }
          node.children = null;
        }
        function recursiveOpen(node) {
          const maxRecursiveOpen = 20;
          let currentOpenedAmount = 0;

          function recursiveOpen_iteration(node) {
            if (currentOpenedAmount >= maxRecursiveOpen) return;
            currentOpenedAmount = currentOpenedAmount + 1;

            if (node._children === undefined || node._children.length === 0)
              return;

            node.children = node._children;
            node.children = hideLowOccurrenceChildren(node);
            if (node.children.length === 0) node.children = null;

            if (node.children) {
              node.children.forEach((child) => {
                recursiveOpen_iteration(child);
              });
            }
          }
          recursiveOpen_iteration(node);
        }
        return svg.node();
      }
    }
  }

  function formatNumber(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function isDropoff(node) {
    function traverse(node) {
      const foundDropoff = findNodeByID(alternativeDropoffData, node.sid);
      if (foundDropoff) return true;

      if (node._children) {
        for (let i = 0; i < node._children.length; i++) {
          if (traverse(node._children[i])) {
            return true;
          }
        }
      }

      return false;
    }

    return traverse(node);
  }
  function findNodeByID(treeNode, targetSID) {
    function traverse(treeNode) {
      if (treeNode.sid === targetSID) {
        return treeNode;
      }
      if (treeNode.children) {
        for (let i = 0; i < treeNode.children.length; i++) {
          const result = traverse(treeNode.children[i]);
          if (result) {
            return result;
          }
        }
      }
    }
    return traverse(treeNode);
  }

  function makeGlowingNodes() {
    d3.selectAll(".node").each(function (d) {
      d3.select(this).classed(
        `${s.leafGlow}`,
        funnelEvents.some((e) => e.id === d.data.id)
      );
    });
  }

  function drawCorrelation(gElement, rootNode, settings) {
    if (settings.showCorrelation) {
      const correlation = d3
        .selectAll(".node")
        .append("g")
        .attr("class", "visualization filteringCorrelation")
        .lower();

      const corrRectsWidth = leafWidth * 1.3;
      const corrRectsHeight = leafHeight * 5;
      correlation
        .append("rect")
        .attr("rx", 0)
        .attr("class", (d) => `${s.correlationHighlight}`)
        .attr("width", (d) => corrRectsWidth)
        .attr("fill", (d) => {
          const correlationIndicator = correlationData[d.data.id];
          if (correlationIndicator > 0) {
            return chroma("#009900")
              .alpha(clamp(correlationIndicator, 0.1, 0.85))
              .hex();
          } else if (correlationIndicator < 0) {
            return chroma("#d42828")
              .alpha(clamp(correlationIndicator, 0.1, 0.85))
              .hex();
          } else {
            return chroma("#cbcbcb").alpha(0.2).hex();
          }
        })
        .attr("height", (d) => {
          if (d.data.id === offerShownEvent.id) {
            return corrRectsHeight * 1.2;
          }
          return corrRectsHeight;
        })
        .attr("x", (d) => -corrRectsWidth / 2)
        .attr("y", (d) => -corrRectsHeight / 2.2);
    }
  }
  function drawChurn(gElement, rootNode, settings) {
    if (settings.showChurn) {
      const churnPaths = gElement
        .selectAll(".filteringPaths")
        .data(() => {
          return rootNode.links();
        })
        .enter()
        .append("g")
        .attr("class", "visualization filteringPaths")
        .each(function (d) {
          const group = d3.select(this);

          // Calling heavy function only once
          const isTargetDropoff = isDropoff(d.target.data);
          // SOURCE COORDS
          const sourceY =
            d.source.depth === 0
              ? d.source.y - rootOffsetRef.current
              : d.source.y;
          const source = { x: d.source.x, y: sourceY };

          // TARGET COORDS
          const deltaX = d.target.y - d.source.y;
          const deltaY = d.target.x - d.source.x;
          const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const normX = deltaX / dist;
          const targetPaddingX = leafWidth;
          const flooredNorm = normX > 0 ? -1 : +1;
          const target = {
            x: d.target.x,
            y: d.target.y + targetPaddingX * flooredNorm,
          };
          if (isTargetDropoff) {
            group
              .append("text")
              .attr("class", `${s.churnLabel}`)
              .text((d) => {
                const sourceNode = d.source;
                const targetNode = d.target;
                const percDelta =
                  (targetNode.data.occurency / sourceNode.data.occurency) * 100;
                const churn = targetNode.data.occurency;

                // If the delta is 100%, we don't want to show the churn
                // We assume that we have shown the churn before, at the first event if this branch
                // And this "100%" churns are just leafs of it.
                if (percDelta === 100) return "";

                return `${percDelta.toFixed(2) + "%"}  (${churn})`;
              })
              .attr("x", (d) => {
                return target.y + leafWidth / 2 + 80;
              })
              .attr("y", (d) => {
                return target.x - leafHeight;
              });
          }
          group
            .append("path")
            .attr("class", `${s.churnLink}`)
            .each(function (d) {
              d3.select(this)
                .attr("d", (node) => {
                  const link = d3
                    .link(d3.curveBumpX)

                    // Start coords with offset
                    .source(function (d) {
                      return source;
                    })

                    // End coords with offset
                    .target(function (d) {
                      return target;
                    })

                    // The position of link itself as an object
                    .x((d) => {
                      const deltaX = node.target.y - d.y;
                      const deltaY = node.target.x - d.x;
                      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                      const normX = deltaX / dist;
                      const flooredNorm = normX > 0 ? -1 : +1;
                      return d.y + leafWidth / 2;
                    })
                    .y((d) => {
                      return d.x;
                    });
                  return link(node);
                })
                .style("stroke-width", () => {
                  if (isTargetDropoff) {
                    const sourceNode = d.source;
                    const targetNode = d.target;
                    let width = Math.abs(
                      (targetNode.data.occurency / sourceNode.data.occurency) *
                        100
                    );
                    // console.log(
                    //   sourceNode.data.occurency,
                    //   targetNode.data.occurency,
                    //   width
                    // );
                    width =
                      width === 0
                        ? 2
                        : normalizeToRange(width, 2, 100) * leafHeight;
                    return width;
                  }
                  return 5;
                })
                .style("stroke", () => {
                  const sourceNode = d.source;
                  const targetNode = d.target;
                  let percDelta = 0;

                  if (isTargetDropoff) {
                    percDelta = clamp(
                      (targetNode.data.occurency / sourceNode.data.occurency) *
                        100,
                      20,
                      90
                    );
                    return chroma("#d42828")
                      .alpha(normalizeToRange(percDelta, 0, 100))
                      .hex();
                  } else {
                    percDelta = clamp(
                      (targetNode.data.occurency / sourceNode.data.occurency) *
                        100,
                      20,
                      90
                    );
                    return chroma("#009900")
                      .alpha(normalizeToRange(percDelta, 5, 100))
                      .hex();
                  }
                });
            });
        });
    }
  }
  function drawSteps(gElement, rootNode, settings) {
    if (settings.showSteps) {
      let steps = [];

      for (let i = isEconomyAnalysis ? 1 : 0; i < currentDepth + 1; i++) {
        steps.push(i);
      }
      const stepNodes = gElement
        .selectAll(".filteringSteps")
        .data(steps)
        .enter()
        .append("g")
        .attr("class", "filteringSteps visualization")
        .attr(
          "transform",
          (d) =>
            `translate(${d === 0 ? -850 : (leafWidth + 300) * d - 260},${100})`
        );

      stepNodes
        .append("rect")
        .attr("rx", 0)
        .attr("class", (d) => `${s.step}`)
        .attr(
          "width",
          (d) => leafWidth + 180 + (d === 0 ? rootOffsetRef.current - 30 : 0)
        )
        .attr("height", (d) => 10000000000)
        .attr("x", (d) => 0)
        .attr("y", (d) => -1000000000);

      stepNodes
        .append("text")
        .text((d) => d + 1)
        .attr("class", `${s.stepLabel} stepLabel`)
        .attr(
          "dx",
          (d) => (leafWidth + 180 + (d === 0 ? rootOffsetRef.current : 0)) / 2
        )
        .attr("dy", (d) => -currentZoomState.y / currentZoomState.k)
        .style(
          "font-size",
          clamp(40 * (1 / currentZoomState.k), 10, 100) + "px"
        )
        .attr("text-anchor", "middle");
    }
  }

  function drawVisualizations(gElement, rootNode) {
    if (gElement) {
      gElement.selectAll(".visualization").remove();

      executeWithLoading(() => {
        drawSteps(gElement, rootNode, localSettings);
        drawChurn(gElement, rootNode, localSettings);
        drawCorrelation(gElement, rootNode, localSettings);
      });
    }
  }
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  function normalizeToRange(value, min, max) {
    return (value - min) / (max - min);
  }

  function correctStepLabels(gElement, transform) {
    if (gElement) {
      // Moving the "step" digit vertically as the user pans and zooms
      let textOffsetY =
        50 * normalizeToRange(transform.k, zoomExtent[0], zoomExtent[1]);
      gElement
        .selectAll(".stepLabel")
        .attr("dy", (d) => -transform.y / transform.k - textOffsetY)
        .style("font-size", clamp(40 / transform.k, 5, 100) + "px");
    }
  }

  //
  // Zoom
  //
  const zoom = d3.zoom().scaleExtent(zoomExtent).on("zoom", zoomed);
  function zoomed(event) {
    if (event) {
      setCurrentZoomState(event.transform);
      gElement.attr("transform", event.transform);
      correctStepLabels(gElement, event.transform);
    }
  }

  // Pan. Called either from the start of by the button
  function panToStartEvent() {
    const svgElement = svgRef.current;
    if (!gElement || !svgElement || !zoom) return;
    d3.select(svgElement)
      .transition()
      .duration(550)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(width - rootOffsetRef.current, height / 3)
          .scale(1)
      );
    gElement
      .transition()
      .duration(550)
      .attr(
        "transform",
        `translate(${width - rootOffsetRef.current},${height / 3})`
      );
  }

  const prevSettings = useRef(settings);
  useEffect(() => {
    drawVisualizations(gElement, rootNode);
    if (prevSettings.current.viewmode !== localSettings.viewmode) {
      makeTreeData();
    }
    if (prevSettings.current.maxStep !== localSettings.maxStep) {
      drawTree();
    }
    if (prevSettings.current.minPlayers !== localSettings.minPlayers) {
      drawTree();
    }
    if (prevSettings.current.panToStart !== localSettings.panToStart) {
      panToStartEvent();
    }
    if (
      prevSettings.current.hiddenEvents &&
      localSettings.hiddenEvents &&
      prevSettings.current.hiddenEvents.length !==
        localSettings.hiddenEvents.length
    ) {
      if (gLinkRef.current && gNodeRef.current) {
        gLinkRef.current.selectAll("*").remove();
        gNodeRef.current.selectAll("*").remove();
      }
      drawTree();
    }
    if (
      prevSettings.current.maxSessionLength !== localSettings.maxSessionLength
    ) {
      makeTreeData();
    }

    prevSettings.current = localSettings;
  }, [localSettings, currentDepth, lastInteractionID, rootNode]);

  const doOnceRef = React.useRef(false);
  useEffect(() => {
    if (gElement) {
      const tempWidth = container.current.clientWidth;
      const tempHeight = container.current.clientHeight;
      const zoomWidth = (tempWidth - scale * tempWidth) / 2;
      const zoomHeight = (tempHeight - scale * tempHeight) / 2;

      const svg = d3.select(svgRef.current);
      svg.call(zoom).on("dblclick.zoom", null);

      function initialZoom() {
        if (!doOnceRef.current) {
          doOnceRef.current = true;
          panToStartEvent();
        }
      }

      initialZoom();
    }
  }, [gElement, zoom]);

  const clickedLeafRef = React.useRef(null);
  const currentTooltipType = React.useRef("");

  // Time to arrive opening tooltip
  function toggleTooltip(event, node, tooltipType) {
    clickedLeafRef.current = node;
    currentTooltipType.current = tooltipType;
    if (open) {
      closeTooltip();
    } else {
      openTooltip(event);
    }
  }

  const [anchorPos, setAnchorPos] = React.useState(null);
  const [open, setOpen] = useState(false);
  function openTooltip(event) {
    setAnchorPos({
      top: event.clientY + 50,
      left: event.clientX,
    });
    setOpen(true);
  }
  const closeTooltip = () => {
    setOpen(false);
  };

  function getTooltipContent(node, type) {
    switch (type) {
      case "time":
        return <Tooltip_TimeToArriveDistributionChart data={node.time} />;
      case "designEvent":
        let tempValues = [];
        designEvents
          .find((e) => e.id === node.id)
          .values.forEach((v) => {
            tempValues.push(v);
          });
        return <DesignValuesTooltip data={node} valueObjects={tempValues} />;
      case "economyEvent":
        return (
          <Tooltip_SingleDefaultDistributionChart
            data={node.amount}
            subHeader={`Origin: ${node.origin}`}
            valueName={`Currency amount distribution`}
          />
        );
      case "adEvent":
        return (
          <Tooltip_SingleTimeDistribution
            data={node.timeSpent}
            valueName={"Time spent on watching ad"}
          />
        );
      case "offerShownPricing":
        return (
          <Tooltip_SingleDefaultDistributionChart
            data={node.price}
            valueName={"Price distribution"}
          />
        );
      case "offerEvent":
        return (
          <Tooltip_SingleDefaultDistributionChart
            data={node.price}
            valueName={"Price distribution"}
          />
        );
      case "offerContent":
        let entities = offers.find(
          (offer) => offer.offerID === node.offerID
        ).content;
        return (
          <div className={s.offerContentContainer}>
            {entities.map((value, index) => (
              <div key={index} className={s.contentItemContainer}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600 }}
                  className={s.name}
                >
                  {entitiesNames.find((e) => e.nodeID === value.nodeID).name}
                </Typography>
                {entityIcons.find((e) => e.nodeID === value.nodeID).icon !==
                "" ? (
                  <img
                    key={index}
                    src={
                      entityIcons.find((e) => e.nodeID === value.nodeID).icon
                    }
                    alt=""
                    className={s.icon}
                  />
                ) : (
                  <EntityPlaceholder className={s.noIcon} />
                )}
                <Typography variant="subtitle" className={s.amount}>
                  Amount: {value.amount}
                </Typography>
              </div>
            ))}
          </div>
        );
      case "reportEvent":
        return (
          <Tooltip_SingleDefaultDistributionChart
            data={node.message}
            valueName={"Message"}
          />
        );
      default:
        return <div></div>;
    }
  }

  useEffect(() => {
    if (!container.current || !svgRef.current) return;

    const updateSVGSize = () => {
      const { width, height } = container.current.getBoundingClientRect();
      const svg = d3.select(svgRef.current);
      svg
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", width)
        .attr("height", height);
    };

    updateSVGSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSVGSize();
    });
    resizeObserver.observe(container.current);

    window.addEventListener("resize", updateSVGSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSVGSize);
    };
  }, [svgRef.current, container.current]);
  return (
    <>
      {/* Using menu as a tooltip */}
      <Menu
        open={open}
        anchorReference="anchorPosition"
        onClose={closeTooltip}
        anchorPosition={anchorPos}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        slotProps={{
          paper: {
            sx: {
              backgroundImage: "none",
              backgroundColor: "var(--bg-color3)",
              p: 2,
              overflow: "hidden",
            },
          },
        }}
      >
        {getTooltipContent(clickedLeafRef.current, currentTooltipType.current)}
      </Menu>

      {/* Loading indicator */}
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={showLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Main tree area */}
      <div
        ref={container}
        style={{ width: "100%", height: "100%" }}
        id="behaviorTree"
      >
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
                strokeOpacity="0.35"
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
                strokeOpacity="0.35"
              />
            </pattern>
          </defs>
        </svg>
      </div>
    </>
  );
};

export default BehaviorTree;
