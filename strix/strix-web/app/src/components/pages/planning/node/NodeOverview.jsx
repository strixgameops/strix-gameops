import React, { useEffect, useState, useRef, useCallback } from "react";
import s from "./css/node.module.css";

import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import CloseIcon from "@mui/icons-material/Close";

import { useLocation, useNavigate } from "react-router-dom";
import { useGame, useBranch } from "@strix/gameContext";

import useApi from "@strix/api";

// Entity card overview
import TextField from "@mui/material/TextField";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Input from "@mui/material/Input";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { styled } from "@mui/material/styles";
import InputLabel from "@mui/material/InputLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import BulkEditConfig from "./BulkConfigEdit/BulkEditConfig";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";

import _ from "lodash";
import RemoteConfig from "./RemoteConfig/RemoteConfig";
import CloseSharpIcon from "@mui/icons-material/CloseSharp";

import imageCompression from "browser-image-compression";

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

const Node = ({
  nodeContentDefault,
  open,

  onChangeDescription,
  onChangeTechDescription,

  dataTree,
  dataNodes,

  onNodeSaved,
  onClose,

  propagateLocalChanges,
}) => {
  const {
    getOffersByContentNodeID,
    getEntityIcon,
    saveEntityBasicInfo,
    saveEntityRoles,
    saveEntityIcon,
    saveEntityGroupName,
  } = useApi();
  const { game, branch, environment } = useGame();

  const [retriggerTimer, setRetriggerTimer] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const backgroundContainer = useRef(null);

  const [nodeConfig, setNodeConfig] = useState({});

  const [nodeContent, setNodeContent] = useState(nodeContentDefault);
  const [isCategory, setIsCategory] = useState(
    nodeContent.entityCategory ? true : false
  );
  const [allCategories, setAllCategories] = useState([]);

  const allSegments = ["everyone", "some users", "some other users"];
  const [currentSegment, setCurrentSegment] = useState("everyone");

  const [tabs, setTabs] = React.useState(0);
  const handleTabChange = (event, newValue) => {
    setTabs(newValue);

    switch (newValue) {
      case 1:
        getOffers();
        break;
      default:
        break;
    }
  };

  // For icon upload input
  const fileInputRef = React.useRef(null);

  const currOpenedNodeID = useRef(null);
  useEffect(() => {
    if (!nodeContent || !nodeContentDefault) {
      // Force close if we removed the node while it was opened
      onClose();
      return;
    }

    if (nodeContent.nodeID !== currOpenedNodeID.current) {
      // Reset tabs if we change opened node
      setTabs(0);
    }
    currOpenedNodeID.current = nodeContent.nodeID;

    if (nodeContentDefault.entityCategory) {
      setNodeConfig(nodeContentDefault.entityCategory);
      setIsCategory(true);
    } else if (nodeContentDefault.entityBasic) {
      setNodeConfig(nodeContentDefault.entityBasic);
      setIsCategory(false);
    }
    setNodeContent(nodeContentDefault);
  }, [nodeContentDefault]);
  useEffect(() => {
    if (!nodeContent || !nodeContentDefault) {
      // Force close if we removed the node while it was opened
      onClose();
      return;
    }

    if (nodeContent.entityCategory) {
      setNodeConfig(nodeContent.entityCategory);
      setIsCategory(true);
      getCategoryChildren();
    } else if (nodeContent.entityBasic) {
      setNodeConfig(nodeContent.entityBasic);
      setIsCategory(false);
    }
  }, []);

  function findNodeByID(node, targetNodeID) {
    if (node.ID === targetNodeID) {
      return node;
    }
    if (node.Subnodes === undefined) {
      return null;
    }
    for (const subnode of node.Subnodes) {
      const result = findNodeByID(subnode, targetNodeID);
      if (result) {
        return result;
      }
    }
    return null;
  }
  function findNodeBy_ID(node, targetNodeID) {
    if (node.uniqueID === targetNodeID) {
      return node;
    }
    for (const subnode of node.Subnodes) {
      const result = findNodeBy_ID(subnode, targetNodeID);
      if (result) {
        return result;
      }
    }
    return null;
  }
  const [inheritedCategories, setInheritedCategories] = useState([]);
  function getCategoryChildren() {
    console.log("dataTree", dataTree, "dataNodes", dataNodes);

    if (dataTree.Subnodes === undefined) return;
    const tempCategoryNode = findNodeByID(dataTree, nodeContent.nodeID);

    let allCategories = [];
    function gatherAllCategoryBasicChildren(node) {
      let tempCategory = dataNodes.find((n) => n.nodeID === node.ID);
      tempCategory.children = [];
      tempCategory.Subnodes = node.Subnodes;

      if (tempCategory.Subnodes !== undefined) {
        tempCategory.Subnodes.forEach((subnode) => {
          if (!subnode.isCategory || subnode.isCategory === false) {
            // Collect only basic entities
            let temp = dataNodes.find((n) => n.nodeID === subnode.ID);
            tempCategory.children.push(temp);
          } else {
            // If category, gather all children for it
            gatherAllCategoryBasicChildren(subnode);
          }
        });
      }
      allCategories.push(tempCategory);
      return;
    }
    // We want to get an array that looks like this: [cat1: {children: [child1, child2]}, cat2: {children: [child3, child4]}]
    // So its normalized categories instead of a tree structure
    gatherAllCategoryBasicChildren(tempCategoryNode);

    function validateInhConfig(str) {
      if (
        str === undefined ||
        str === "" ||
        str === "[]" ||
        Object.keys(JSON.parse(str)).length === 0
      )
        return false;
      return true;
    }

    let tempInheritedCategories = [];

    allCategories = allCategories.map((category) => ({
      ...category,
      children: category.children.map((child) => {
        let inhConfigs = [];

        inhConfigs = validateInhConfig(child.entityBasic.inheritedConfigs)
          ? JSON.parse(child.entityBasic.inheritedConfigs)
          : [];

        // Get child's inheritedCategories so we know which configs to grab
        let inhCategories = getInheritance(child.entityBasic.parentCategory);
        // Filter so we only get categories that are below the given category, so we don't change Root's inherited configs from
        // the children categories.
        inhCategories = inhCategories.filter((cat) =>
          allCategories.some((c) => c.nodeID === cat)
        );
        tempInheritedCategories = inhCategories;
        // console.log('inhCategories', inhCategories)

        // Merge inherited config with main config
        let tempInhConfigs = [];
        allCategories.forEach((category) => {
          if (inhCategories.includes(category.nodeID)) {
            // Get the category configs
            let categoryConfig = JSON.parse(
              category.entityCategory.mainConfigs
            );
            // console.log('Category config', categoryConfig)
            // Merge config so that the original untouched values are kept, but the changed ones are overridden
            if (
              inhConfigs.find((c) => c.nodeID === category.nodeID) &&
              inhConfigs.find((c) => c.nodeID === category.nodeID).configs !==
                ""
            ) {
              // console.log('Inherited configs for category', category.nodeID, 'is', inhConfigs.find(c => c.nodeID === category.nodeID).configs)
              // console.log('Marging configs', JSON.parse(category.entityCategory.mainConfigs), 'with', inhConfigs.find(c => c.nodeID === category.nodeID).configs)
              categoryConfig = _.merge(
                categoryConfig,
                inhConfigs.find((c) => c.nodeID === category.nodeID).configs
              );
            }

            tempInhConfigs.push({
              nodeID: category.nodeID,
              configs: categoryConfig,
            });
          }
        });
        // console.log('Inherited configs:', tempInhConfigs)
        child.entityBasic.inheritedConfigs = JSON.stringify(tempInhConfigs);

        console.log("Child with applied inhConf", child);
        return child;
      }),
    }));

    // console.log('ITERATIONS All categories after inhconf apply', allCategories)
    // console.log('ITERATIONS Inherited categories', tempInheritedCategories)

    setAllCategories(allCategories);

    setInheritedCategories(tempInheritedCategories);
  }

  function getInheritance(parentCategoryID, nodeInTree) {
    let tempCategories = [];
    getInheritanceRecursively(parentCategoryID);
    function getInheritanceRecursively(parentCategoryID) {
      let inheritedNodeID = findNodeBy_ID(dataTree, parentCategoryID);

      // Check if null. If so, it's Root
      if (inheritedNodeID === null) {
        if (dataTree.uniqueID === parentCategoryID) {
          inheritedNodeID = dataTree;
        }
      }
      inheritedNodeID = inheritedNodeID.ID;

      let inheritedNodeParentID = dataNodes.find(
        (n) => n.nodeID === inheritedNodeID
      ).entityCategory.parentCategory;

      // If this node is nested, go recursive until we hit the root
      tempCategories.push(inheritedNodeID);
      if (inheritedNodeParentID && inheritedNodeParentID !== "") {
        getInheritanceRecursively(inheritedNodeParentID);
      }
    }

    return tempCategories;
  }

  function backgroundClicked(e) {
    onClose();
  }

  useEffect(() => {
    onNodeSaved(nodeContent);
  }, [nodeContent]);

  useEffect(() => {
    if (isCategory) {
      // setTimeout(() => {
      getCategoryChildren();
      // }, 200);
    }
  }, [dataNodes, nodeContent]);

  const escFunction = useCallback((event) => {
    if (event.key === "Escape") {
      onClose();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", escFunction, false);

    return () => {
      document.removeEventListener("keydown", escFunction, false);
    };
  }, [escFunction]);

  let saveBasicInfoTimeout = null;
  let saveRolesTimeout = null;
  let saveIconTimeout = null;
  let saveGroupNameTimeout = null;
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
        isCategory: isCategory,
      });
    }, 1000);
  }
  function saveGroupName(gameID, branch, nodeID, groupName) {
    clearTimeout(saveGroupNameTimeout);
    saveGroupNameTimeout = setTimeout(async () => {
      if (!gameID) return;
      const response = await saveEntityGroupName({
        gameID: gameID,
        branch: branch,
        nodeID,
        groupName,
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

  function handleChangeName_basic(newName) {
    console.log("handleChangeName_basic", newName);
    setNodeContent({ ...nodeContent, name: newName });
    saveBasicInfo(
      game.gameID,
      branch,
      nodeContent.nodeID,
      nodeContent.entityBasic.entityID,
      newName
    );
  }
  function handleChangeCodeName_basic(newID) {
    setNodeContent({
      ...nodeContent,
      entityBasic: { ...nodeContent.entityBasic, entityID: newID },
    });
    saveBasicInfo(
      game.gameID,
      branch,
      nodeContent.nodeID,
      newID,
      nodeContent.name
    );
  }
  function handleChangeIcon_basic(newIcon) {
    setNodeContent({
      ...nodeContent,
      entityBasic: { ...nodeContent.entityBasic, entityIcon: newIcon },
    });
    saveIcon(game.gameID, branch, nodeContent.nodeID, newIcon);
  }
  function handleChangeIsCurrency_basic(bool) {
    setNodeContent({
      ...nodeContent,
      entityBasic: { ...nodeContent.entityBasic, isCurrency: bool },
    });
    saveRoles(
      game.gameID,
      branch,
      nodeContent.nodeID,
      bool,
      nodeContent.entityBasic.isInAppPurchase,
      nodeContent.entityBasic.realValueBase
    );
  }
  function handleChangeIsIAP_basic(bool) {
    setNodeContent({
      ...nodeContent,
      entityBasic: { ...nodeContent.entityBasic, isInAppPurchase: bool },
    });
    saveRoles(
      game.gameID,
      branch,
      nodeContent.nodeID,
      nodeContent.entityBasic.isCurrency,
      bool,
      nodeContent.entityBasic.realValueBase
    );
  }
  function handleChangeRealValue_basic(value) {
    setNodeContent({
      ...nodeContent,
      entityBasic: { ...nodeContent.entityBasic, realValueBase: value },
    });
    saveRoles(
      game.gameID,
      branch,
      nodeContent.nodeID,
      nodeContent.entityBasic.isCurrency,
      nodeContent.entityBasic.isInAppPurchase,
      value
    );
  }
  function handleNumberInput(value) {
    // Real-world value input
    let currentInputValue = value;

    if (currentInputValue === ".") {
      currentInputValue = "0.";
    }

    //   ,
    let sanitizedValue = currentInputValue.replace(/[^0-9.]/g, "");

    //
    let dotCount = sanitizedValue.split(".").length - 1;

    //   ,
    if (dotCount > 1) {
      sanitizedValue =
        sanitizedValue.split(".").slice(0, 2).join(".") +
        sanitizedValue.split(".").slice(2).join("");
    }

    //      ,
    if (
      sanitizedValue.startsWith("0") &&
      sanitizedValue.length > 1 &&
      sanitizedValue[1] !== "."
    ) {
      sanitizedValue = "0." + sanitizedValue.slice(1);
    }

    //
    dotCount = sanitizedValue.split(".").length - 1;

    handleChangeRealValue_basic(sanitizedValue);

    // ,
    const containsNonZero = sanitizedValue
      .split("")
      .some((char) => char !== "0" && char !== ".");
  }
  // For icon upload input
  const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
  });
  const handleFileUpload = (e) => {
    fileInputRef.current.click();
  };
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64File = e.target.result;
          const compressedImage = await compressImage(base64File);
          handleChangeIcon_basic(compressedImage);
        };
        reader.readAsDataURL(selectedFile);
      } catch (error) {}
    }
  };
  function clearImage() {
    handleChangeIcon_basic("");
    fileInputRef.current.value = null;
  }
  const compressImage = async (base64Image) => {
    // Decode base64 string
    const byteCharacters = atob(base64Image.split(",")[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    const blob = new Blob(byteArrays, { type: "image/png" });

    // Compress image
    const compressedImage = await imageCompression(blob, {
      maxWidthOrHeight: 250,
    });

    // Return base64 representation of compressed image
    return await blobToBase64(compressedImage);
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result;
        resolve(base64data);
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  };

  function handleChangeName_cat(newName) {
    setNodeContent({ ...nodeContent, name: newName });
    saveBasicInfo(
      game.gameID,
      branch,
      nodeContent.nodeID,
      nodeContent.entityCategory.categoryID,
      newName
    );
  }
  function handleChangeCodeName_cat(newID) {
    setNodeContent({
      ...nodeContent,
      entityCategory: { ...nodeContent.entityCategory, categoryID: newID },
    });
    saveBasicInfo(
      game.gameID,
      branch,
      nodeContent.nodeID,
      newID,
      nodeContent.name
    );
  }

  function handleChangeGroupName(newName) {
    setNodeContent({
      ...nodeContent,
      groupName: newName,
    });
    saveGroupName(game.gameID, branch, nodeContent.nodeID, newName);
  }

  const lastConfigRef_Main = useRef("");
  function handleChangeMainConfigs(newConfigs) {
    if (lastConfigRef_Main.current === JSON.stringify(newConfigs)) return;
    if (isCategory) {
      setNodeContent({
        ...nodeContent,
        entityCategory: {
          ...nodeContent.entityCategory,
          mainConfigs: newConfigs,
        },
      });
    } else {
      setNodeContent({
        ...nodeContent,
        entityBasic: { ...nodeContent.entityBasic, mainConfigs: newConfigs },
      });
    }
    lastConfigRef_Main.current = JSON.stringify(newConfigs);
  }
  const lastConfigRef_Inherited = useRef("");
  function handleChangeInheritedConfigs(newConfigs) {
    if (lastConfigRef_Inherited.current === JSON.stringify(newConfigs)) return;
    if (isCategory) {
      setNodeContent({
        ...nodeContent,
        entityCategory: {
          ...nodeContent.entityCategory,
          inheritedConfigs: newConfigs,
        },
      });
    } else {
      setNodeContent({
        ...nodeContent,
        entityBasic: {
          ...nodeContent.entityBasic,
          inheritedConfigs: newConfigs,
        },
      });
    }
    lastConfigRef_Inherited.current = JSON.stringify(newConfigs);
  }
  function onSelectedCategoryChange(newCategory) {
    setAllCategories((prevCategories) => {
      let newCategories = prevCategories.map((category) => {
        if (category.nodeID === newCategory.nodeID) {
          return newCategory;
        } else {
          return category;
        }
      });
      return newCategories;
    });
  }
  useEffect(() => {
    console.log("All categories changed", allCategories);
  }, [allCategories]);

  const [offers, setOffers] = useState([]);
  async function getOffers() {
    const response = await getOffersByContentNodeID({
      gameID: game.gameID,
      branch,
      nodeID: nodeContent.nodeID,
    });
    if (response.success) {
      let tempOffers = response.offers;
      if (tempOffers.length > 0) {
        await Promise.all(
          tempOffers.map(async (offer) => {
            if (offer.content.length > 0) {
              offer.content = await Promise.all(
                offer.content.map(async (contentItem) => {
                  let resp = await getEntityIcon({
                    gameID: game.gameID,
                    branch,
                    nodeID: contentItem.nodeID,
                  });
                  if (resp.success) {
                    return {
                      ...contentItem,
                      entityIcon: resp.entityIcon,
                    };
                  } else {
                    return contentItem;
                  }
                })
              );
              return offer;
            } else {
              return offer;
            }
          })
        );
      }
      setOffers(tempOffers);
    } else {
      setOffers([]);
    }
  }

  function trimStr(str, maxLength) {
    if (str === undefined || str === "") return "";
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
  }

  function openOffer(e) {
    // e.stopPropagation()
    setTimeout(() => {
      window.open("/offers", "_blank", "noreferrer");
    }, 100);
  }

  return (
    <Modal open={open} onClose={(e) => backgroundClicked(e)}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          height: "90%",
          overflowY: "auto",
          scrollbarWidth: "thin",
          borderRadius: "2rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className={s.editZone} ref={backgroundContainer}>
          {nodeContent.entityCategory ? (
            <div
              className={`${s.editorTabWrapper} ${tabs === 1 && s.editorTabEnlarged}`}
            >
              <div className={s.closeButton}>
                <Button
                  sx={{
                    minWidth: "50px",
                    height: "50px",
                  }}
                  variant="text"
                  onClick={() => onClose()}
                >
                  <CloseSharpIcon />
                </Button>
              </div>

              <div className={s.mainContainer}>
                <div className={s.title}>
                  <Typography
                    variant={"h4"}
                    sx={{
                      fontSize: "32px",
                      fontWeight: "regular",
                      textAlign: "center",
                    }}
                  >
                    Entity configuration
                  </Typography>
                </div>

                <div className={s.catNodeInfo}>
                  <TextField
                    spellCheck={false}
                    size="small"
                    value={nodeContent.name}
                    onChange={(e) => handleChangeName_cat(e.target.value)}
                    label="Name"
                    variant="outlined"
                  />

                  <TextField
                    spellCheck={false}
                    size="small"
                    value={nodeContent.entityCategory.categoryID}
                    onChange={(e) => handleChangeCodeName_cat(e.target.value)}
                    label="ID"
                    variant="outlined"
                  />

                  <TextField
                    spellCheck={false}
                    size="small"
                    value={nodeContent?.groupName || ""}
                    onChange={(e) => handleChangeGroupName(e.target.value)}
                    label="Group Name"
                    variant="outlined"
                  />
                </div>

                <div className={s.tabs}>
                  <Box
                    sx={{
                      borderBottom: 1,
                      borderColor: "divider",
                      backgroundColor: "var(--upperbar-bg-color)",
                      borderTopLeftRadius: "2rem",
                      borderTopRightRadius: "2rem",
                    }}
                  >
                    <Tabs
                      value={tabs}
                      onChange={handleTabChange}
                      aria-label="basic tabs example"
                    >
                      <Tab label="Remote config" {...allyProps(0)} />
                      <Tab label="Bulk config edit" {...allyProps(1)} />
                      {/* <Tab label="Analytics events" {...allyProps(2)} /> */}
                    </Tabs>
                  </Box>

                  <CustomTabPanel value={tabs} index={0}>
                    <div className={s.categoryConfigContainer}>
                      <RemoteConfig
                        onMainConfigChange={handleChangeMainConfigs}
                        onInheritedConfigChange={handleChangeInheritedConfigs}
                        nodeContent={nodeContent}
                        dataNodes={dataNodes}
                        dataTree={dataTree}
                      />
                    </div>
                  </CustomTabPanel>

                  <CustomTabPanel value={tabs} index={1}>
                    <BulkEditConfig
                      currentSegment={currentSegment}
                      categories={allCategories}
                      gameID={game.gameID}
                      branch={branch}
                      dataNodes={dataNodes}
                      dataTree={dataTree}
                      inheritedCategories={inheritedCategories}
                      onSelectedCategoryChange={onSelectedCategoryChange}
                      propagateLocalChanges={propagateLocalChanges}
                    />
                  </CustomTabPanel>

                  <CustomTabPanel value={tabs} index={2}>
                    Item Three
                  </CustomTabPanel>

                  {/* {tabs === 1 && (
                      <div className={s.bulkEditorSegmentsWidget}>
                          <FormControl sx={{ m: 1, minWidth: 120, maxWidth: 120 }} size="small">
                            <InputLabel sx={{fontSize: 12, pt: 0.6, zIndex: 2,}}>Segment</InputLabel>
                            <Select
                              value={currentSegment}
                              label="Segment"
                              onChange={(e) => setCurrentSegment(e.target.value)}
                              sx={{
                              maxHeight: '35px',
                              "& .MuiOutlinedInput-notchedOutline": { fontSize: "12px", zIndex: 2, },
                              fontSize: 12,
                              backgroundColor: '#151326',
                              '& .MuiOutlinedInput-root': {
                              },
                              zIndex: 1,
                              }}
                            >
                              {allSegments.map((segment, index) => (
                                <MenuItem key={index} value={segment}>{segment}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                      </div>
                      )} */}
                </div>
              </div>
            </div>
          ) : (
            <div className={s.editorTabWrapper}>
              <div className={s.closeButton}>
                <Button
                  sx={{
                    minWidth: "50px",
                    height: "50px",
                  }}
                  variant="text"
                  onClick={() => onClose()}
                >
                  <CloseSharpIcon />
                </Button>
              </div>

              <div className={s.mainContainer}>
                <div className={s.title}>
                  <Typography
                    variant={"h4"}
                    sx={{
                      fontSize: "32px",
                      fontWeight: "regular",
                      textAlign: "center",
                    }}
                  >
                    Entity configuration
                  </Typography>
                </div>

                <div className={s.nodeInfo}>
                  <div className={s.left}>
                    <div className={s.iconSettigns}>
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          position: "relative",
                        }}
                      >
                        {nodeContent.entityBasic.entityIcon !== "" &&
                          nodeContent.entityBasic.entityIcon !== undefined && (
                            <Tooltip title="Remove image" placement="top">
                              <Button
                                onClick={clearImage}
                                sx={{
                                  position: "absolute",
                                  top: 0,
                                  right: 0,
                                  zIndex: 2,
                                  minWidth: "30px",
                                  borderRadius: "1rem",
                                }}
                              >
                                <CloseIcon />
                              </Button>
                            </Tooltip>
                          )}

                        <Button
                          component="label"
                          variant="outlined"
                          startIcon={<CloudUploadIcon />}
                          tabIndex={-1}
                          sx={{
                            "&": nodeContent.entityBasic.entityIcon && {
                              p: 0,
                              alignItems: "center",
                              justifyContent: "center",
                            },
                            "& .MuiButton-startIcon": nodeContent.entityBasic
                              .entityIcon && {
                              display: "none",
                            },
                            borderRadius: "1rem",
                            height: "100%",
                            width: "100%",
                            fontSize: 14,
                            whiteSpace: "pre-wrap",
                            textTransform: "none",
                            overflow: "hidden",
                          }}
                        >
                          {nodeContent.entityBasic.entityIcon !== "" &&
                          nodeContent.entityBasic.entityIcon !== undefined ? (
                            <div className={s.entityIconContainer}>
                              <div className={s.entityIconOverlay}></div>
                              <img
                                src={`${nodeContent.entityBasic.entityIcon}`}
                                className={s.basicConfigEntityIcon}
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                textAlign: "center",
                                alignItems: "center",
                              }}
                            >
                              Upload
                              <br />
                              icon
                            </div>
                          )}
                          <VisuallyHiddenInput
                            onClick={handleFileUpload}
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept={[".png", ".jpg", ".svg", ".jpeg"]}
                          />
                        </Button>
                      </Box>
                    </div>
                  </div>

                  <div className={s.right}>
                    <TextField
                      spellCheck={false}
                      size="small"
                      value={nodeContent.name}
                      onChange={(e) => handleChangeName_basic(e.target.value)}
                      label="Name"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      spellCheck={false}
                      size="small"
                      value={nodeContent.entityBasic.entityID}
                      onChange={(e) =>
                        handleChangeCodeName_basic(e.target.value)
                      }
                      label="ID"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      spellCheck={false}
                      size="small"
                      value={nodeContent?.groupName || ""}
                      onChange={(e) => handleChangeGroupName(e.target.value)}
                      label="Group Name"
                      variant="outlined"
                    />

                    <div className={s.entityRoles}>
                      <FormGroup
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          width: "fit-content",
                        }}
                      >
                        <FormControlLabel
                          required
                          control={
                            <Switch
                              checked={nodeContent.entityBasic.isCurrency}
                              onChange={(e) =>
                                handleChangeIsCurrency_basic(e.target.checked)
                              }
                            />
                          }
                          label="Is currency"
                          sx={{ textWrap: "nowrap", whiteSpace: "nowrap" }}
                        />
                      </FormGroup>
                      <FormGroup
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          width: "210px",
                        }}
                      >
                        <FormControlLabel
                          required
                          control={
                            <Switch
                              checked={nodeContent.entityBasic.isInAppPurchase}
                              onChange={(e) =>
                                handleChangeIsIAP_basic(e.target.checked)
                              }
                            />
                          }
                          label="Can be offer's content"
                          sx={{ textWrap: "nowrap", whiteSpace: "nowrap" }}
                        />
                      </FormGroup>
                      {/* {nodeContent.entityBasic.isInAppPurchase && (
                    <Input spellCheck={false} 
                    onBlur={() => {
                        if (nodeContent.entityBasic.realValueBase === '') {
                          handleChangeRealValue_basic('0')
                        }
                    }}
                    startAdornment={<InputAdornment position="start">$</InputAdornment>}
                    value={nodeContent.entityBasic.realValueBase} 
                    onChange={(e) => handleNumberInput(e.target.value)} label="Base value" />
                )} */}
                    </div>
                  </div>
                </div>

                <div className={s.tabs}>
                  <Box
                    sx={{
                      borderBottom: 1,
                      borderColor: "divider",
                      backgroundColor: "var(--upperbar-bg-color)",
                      borderTopLeftRadius: "2rem",
                      borderTopRightRadius: "2rem",
                    }}
                  >
                    <Tabs
                      value={tabs}
                      onChange={handleTabChange}
                      aria-label="basic tabs example"
                    >
                      <Tab label="Remote config" {...allyProps(0)} />
                      {/* <Tab label="Analytics events" {...allyProps(1)} /> */}
                      {/* <Tab label="Offers" {...allyProps(2)} /> */}
                      {/* <Tab label="Localization" {...allyProps(4)} /> */}
                      {/* <Tab label="Inventory" {...allyProps(3)} disabled /> */}
                    </Tabs>
                  </Box>

                  <CustomTabPanel value={tabs} index={0}>
                    <div className={s.configContainer}>
                      <RemoteConfig
                        onMainConfigChange={handleChangeMainConfigs}
                        onInheritedConfigChange={handleChangeInheritedConfigs}
                        nodeContent={nodeContent}
                        dataNodes={dataNodes}
                        dataTree={dataTree}
                      />
                    </div>
                  </CustomTabPanel>

                  <CustomTabPanel value={tabs} index={1}>
                    <div className={s.offersList}>
                      {offers &&
                        offers.length > 0 &&
                        offers.map((offer, index) => (
                          <div
                            onClick={openOffer}
                            className={s.offerItem}
                            key={index}
                          >
                            <div className={s.icon}>
                              <img
                                src={offer.offerIcon}
                                alt="Offer icon"
                                className={s.offerIcon}
                              />
                            </div>

                            <Typography
                              variant={"h4"}
                              color={"text.secondary"}
                              sx={{
                                ml: 2,
                                whiteSpace: "nowrap",
                                fontSize: "22px",
                                fontWeight: "regular",
                                textAlign: "center",
                              }}
                            >
                              {offer.offerName}
                            </Typography>
                          </div>
                        ))}
                      {offers && offers.length === 0 && (
                        <div className={s.noOffers}>
                          <Typography
                            variant={"body1"}
                            color={"text.grey"}
                            sx={{
                              userSelect: "none",
                              fontSize: "24px",
                              fontWeight: "regular",
                              textAlign: "center",
                            }}
                          >
                            No offers found
                          </Typography>
                        </div>
                      )}
                    </div>
                  </CustomTabPanel>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* <div className={s.editorContainer}>
        </div> */}
      </Box>
    </Modal>
  );
};

export default Node;
