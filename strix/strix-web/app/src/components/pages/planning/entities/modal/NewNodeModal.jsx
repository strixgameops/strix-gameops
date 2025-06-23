import React, { useEffect, useState } from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import s from "./newNodeModal.module.css";

import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

import InputLabel from "@mui/material/InputLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Button from "@mui/material/Button";

import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

import EntityBasic from "./assets/entityBasic.svg?react";
import EntityCategory from "./assets/entityCat.svg?react";

import StrixStepper from "shared/stepper/StrixStepper.jsx";
import PropsBuilder from "shared/propsConfigurator/PropsBuilder.jsx";
import BulkAddEntities from "./BulkAddEntities.jsx";
import sb from "shared/table/tableStyling.module.css";

import useApi from "@strix/api";
import { useGame, useBranch } from "@strix/gameContext";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { styled } from "@mui/material/styles";

import Switch from "@mui/material/Switch";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import imageCompression from "browser-image-compression";
import shortid from "shortid";
import uuid from "react-uuid";
const NewNodeModal = ({
  dataTree,
  dataNodes,
  open,
  handleCloseParent,
  refetch,
}) => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { createEntity, createEntityBulk, cancelEntityCreation } = useApi();

  const [nodeID, setNodeID] = useState(uuid());

  // Basic page navigation & choices
  const [selectedType, setSelectedType] = useState("");
  const [page, setPage] = useState(0);
  const [isLoadingApply, setIsLoadingApply] = useState(false);
  const [isAddingBulk, setIsAddingBulk] = useState(false);

  const [parentNodesVariants, setParentNodesVariants] = useState([
    { label: "Root", nodeID: dataTree.ID, uniqueID: dataTree.uniqueID },
  ]);

  useEffect(() => {
    // console.log('Current data tree:', dataTree)
    function findCategoryNodes(tree, result = []) {
      if (tree.isCategory === true) {
        result.push({
          uniqueID: tree.uniqueID,
          nodeID: tree.ID,
          label: tree.Name,
        });
      }

      if (Array.isArray(tree.Subnodes)) {
        tree.Subnodes.forEach((subnode) => {
          findCategoryNodes(subnode, result);
        });
      }

      return result;
    }
    if (dataTree.Name) {
      const categoryNodes = findCategoryNodes(dataTree);
      setParentNodesVariants(categoryNodes);
    }
  }, [dataTree]);

  // PropsBuilder
  const [mainConfigs, setMainConfigs] = useState([
    // {
    //     name: 'Some config',
    //     id: 'someid',
    //     values: [
    //         {
    //             sid: 'AKDONIWADNIAWNNIO',
    //             valueID: 'somevalueID',
    //             type: 'sound',
    //             segments: [
    //                 {
    //                     'segmentID': 'everyone',
    //                     'value': 'value1',
    //                     'changed': false
    //                 }
    //             ]
    //         },
    //         {
    //             sid: '123123',
    //             valueID: 'someothervalueID',
    //             type: 'map',
    //             values: [
    //                     {
    //                         sid: 'AWDAWDADW!!!',
    //                         valueID: 'somevalueID_123',
    //                         type: 'string',
    //                         segments: [
    //                             {
    //                                 segmentID: 'everyone',
    //                                 value: 'value1',
    //                                 changed: false
    //                             }
    //                         ]
    //                     },
    //             ]
    //         }
    //     ]
    // },
  ]);
  const [inheritedConfigs, setInheritedConfigs] = useState([]);
  const [defaultInheritedConfigs, setDefaultInheritedConfigs] = useState([]);

  const [inheritedCategories, setInheritedCategories] = useState([]);

  // Category - Basic config
  const [categoryName, setCategoryName] = useState("");
  const [categoryID, setCategoryID] = useState("");
  const [categoryParent, setCategoryParent] = useState("");
  // Errors for required fields
  const [categoryNameError, setCategoryNameError] = useState(false);
  const [categoryIDError, setCategoryIDError] = useState(false);
  // Entity - Basic config
  const [entityIcon, setEntityIcon] = useState("");
  const [entityName, setEntityName] = useState("");
  const [entityID, setEntityID] = useState("");
  const [entityParent, setEntityParent] = useState("");
  const [entityIsCurrency, setEntityIsCurrency] = useState(false);
  const [entityIsInAppPurchase, setEntityIsInAppPurchase] = useState(false);
  const [entityRealValueBase, setEntityRealValueBase] = useState("");
  // Errors for required fields
  const [entityNameError, setEntityNameError] = useState(false);
  const [entityIDError, setEntityIDError] = useState(false);
  const [bulkEntitiesErrorRows, setBulkEntitiesErrorRows] = useState([]);
  const [bulkEntitiesErrorMessage, setBulkEntitiesErrorMessage] = useState("");

  const [bulkEntities, setBulkEntities] = useState([]);

  useEffect(() => {
    // Here we gather inherited configs
    if (dataNodes) {
      // Get parent category uniqueID
      let parentCategory;
      if (selectedType === "basic") {
        if (!entityParent) return;
        parentCategory = entityParent.uniqueID;
      } else if (selectedType === "category") {
        if (!categoryParent) return;
        parentCategory = categoryParent.uniqueID;
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
          console.log(nodeInData);

          gatherInheritedConfigs(nodeInData.entityCategory.parentCategory);
        }
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
              config.inheritedConfigs.forEach((overrideConfig) => {
                if (overrideConfig.configs !== "") {
                  const targetIndex = reversedNodeConfigs.findIndex(
                    (item) => item.nodeID === overrideConfig.nodeID
                  );
                  if (targetIndex !== -1) {
                    // Merge configs so that the original untouched values are kept, but the changed ones are overridden
                    reversedNodeConfigs[targetIndex].configs = Object.assign(
                      reversedNodeConfigs[targetIndex].configs,
                      overrideConfig.configs
                    );
                  }
                }
              });
            }
          }
        });

        console.log("Resolving inheritance:", reversedNodeConfigs);

        return reversedNodeConfigs.reverse();
      }
      gatherInheritedConfigs(parentCategory);

      setInheritedCategories(tempInheritedCategories);

      if (inheritedConfigs.length > 0) {
        inheritedConfigs = resolveInheritance(inheritedConfigs);
        setInheritedConfigs(inheritedConfigs);

        // Do this to prevent any changes from affecting default inherited configs variable
        let tempConfigs = JSON.stringify(inheritedConfigs);
        setDefaultInheritedConfigs(JSON.parse(tempConfigs));
        tempConfigs = "";
      }
    }
  }, [dataNodes, entityParent, categoryParent]);

  function handleNumberInput(e) {
    // Real-world value input
    let currentInputValue = e.target.value;

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

    setEntityRealValueBase(sanitizedValue);

    // ,
    const containsNonZero = sanitizedValue
      .split("")
      .some((char) => char !== "0" && char !== ".");

    if (
      dotCount > 1 ||
      sanitizedValue === "0" ||
      sanitizedValue === "" ||
      sanitizedValue === "0." ||
      !containsNonZero
    ) {
      setShowRealValueError(true);
    } else {
      setShowRealValueError(false);
    }
  }

  // Gathering info for backend
  function gatherEntityObj() {
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

    // Deep copying to prevent data change in another components
    let temp = JSON.parse(JSON.stringify(inheritedConfigs));

    // Clear inheritedConfigs fields from the array because we dont need them to be there
    function removeInheritedConfigs(configs) {
      let cleanedConfigs = configs;
      cleanedConfigs.forEach((config) => {
        delete config.inheritedConfigs;
      });
      return cleanedConfigs;
    }
    temp = removeInheritedConfigs(temp);

    // console.log('After removing inheritedConfigs:', temp)

    let filteredInheritedConfigs = temp;
    if (selectedType === "basic") {
      if (entityParent !== "") {
        filteredInheritedConfigs = filterInheritedConfigs(
          filteredInheritedConfigs
        );
      }
    } else if (selectedType === "category") {
      if (categoryParent !== "") {
        filteredInheritedConfigs = filterInheritedConfigs(
          filteredInheritedConfigs
        );
      }
    }

    // console.log('Filtered inherited configs:', filteredInheritedConfigs)

    let entityObj = {};
    if (selectedType === "basic") {
      entityObj = {
        entityName: entityName,
        entityBasic: {
          entityID: entityID,

          isCurrency: entityIsCurrency,
          isInAppPurchase: entityIsInAppPurchase,
          realValueBase: entityRealValueBase,

          entityIcon: entityIcon,

          mainConfigs: JSON.stringify(mainConfigs),
          parentCategory: entityParent?.uniqueID || "",
          inheritedCategories: inheritedCategories,
          inheritedConfigs: JSON.stringify(filteredInheritedConfigs),
        },
        groupName: "Main Group",
      };
    } else if (selectedType === "category") {
      entityObj = {
        entityName: categoryName,
        entityCategory: {
          categoryID: categoryID,
          mainConfigs: JSON.stringify(mainConfigs),
          parentCategory: categoryParent.uniqueID,
          inheritedCategories: inheritedCategories,
          inheritedConfigs: JSON.stringify(filteredInheritedConfigs),
        },
        groupName: "Main Group",
      };
    }

    // console.log('Gathered entityObj:', entityObj)
    return entityObj;
  }

  function addNewConfigLocally() {
    let id = selectedType === "basic" ? entityID : categoryID;
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
  function onBulkDataGet(data) {
    setBulkEntities(
      data.map((entity) => {
        return {
          nodeID: uuid(),
          entityName: entity.name,
          groupName: entity.groupName ? entity.groupName : "",
          entityBasic: {
            entityID: entity.id ? entity.id : "",
            parentCategory: entity.parentCategory
              ? entity.parentCategory.uniqueID
              : "",
            isCurrency: entity.currency ? entity.currency : false,
            isInAppPurchase: entity.iap ? entity.iap : false,
            entityIcon: entity.icon ? entity.icon : "",
            mainConfigs: "",
            inheritedCategories: "",
            inheritedConfigs: "",
          },
        };
      })
    );
  }

  useEffect(() => {
    // Handle bulk edit error showing

    // Remove all errors (need to restart the error handling)'[class*="_rowError_nvvfu_"]'
    let elementsWithClass = document.querySelectorAll(
      `[class*="${sb.rowError}"`
    );
    elementsWithClass.forEach((element) => {
      element.classList.remove(sb.rowError);
    });

    // Set errors on errored rows
    bulkEntitiesErrorRows.forEach((row) => {
      let elements = document.querySelectorAll(`[id^="row${row}_"]`);
      elements.forEach((element) => {
        element.classList.add(sb.rowError);
      });
    });
  }, [bulkEntitiesErrorRows]);

  // When we click on entity type on the first page
  function selectType(type) {
    setSelectedType(type);
    setPage(1);
  }

  // Displaying pages
  function getPage() {
    switch (page) {
      case 0:
        return (
          <div className={s.page}>
            {/* Entity type cards */}
            <div className={s.entityTypeCards}>
              <div className={s.typeCard} onClick={() => selectType("basic")}>
                <Typography
                  variant={"h3"}
                  color={"text.primary"}
                  sx={{
                    pt: "15px",
                    mb: "20px",
                    fontSize: "32px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  Basic
                </Typography>

                <div className={s.entityIcon}>
                  <EntityBasic />
                </div>

                <Typography
                  variant={"body1"}
                  color={"text.primary"}
                  sx={{
                    fontSize: "13px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  Used to configure any entity in your game: a sword, a
                  character, a game mechanic, anything.
                  <br />
                  Must be placed under a category.
                </Typography>

                <Typography
                  variant={"body1"}
                  color={"text.primary"}
                  sx={{
                    marginTop: "auto",
                    pb: "32px",
                    fontSize: "12px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  Inherits props from categories above. Additional props can
                  also be added.
                </Typography>
              </div>

              <div
                className={s.typeCard}
                onClick={() => selectType("category")}
              >
                <Typography
                  variant={"h3"}
                  color={"text.primary"}
                  sx={{
                    pt: "15px",
                    mb: "20px",
                    fontSize: "32px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  Category
                </Typography>

                <div className={s.entityIcon}>
                  <EntityCategory />
                </div>

                <Typography
                  variant={"body1"}
                  color={"text.primary"}
                  sx={{
                    fontSize: "13px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  Used to give meaning to basic entities. Can have properties
                  that basic entities will inherit.
                  <br></br>Categories can nest under other categories.
                </Typography>

                <Typography
                  variant={"body1"}
                  color={"text.primary"}
                  sx={{
                    marginTop: "auto",
                    pb: "32px",
                    fontSize: "12px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  Inherits props from categories above and can also override
                  them.
                </Typography>
              </div>
            </div>

            <div className={s.documentationLinks}>
              <a
                href="https://strixgameops.com/docs/feature/entities#Basic%20entities"
                target="_blank"
              >
                <Typography
                  variant={"body1"}
                  color={"text.grey"}
                  sx={{
                    width: "282px",
                    fontSize: "13px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  Documentation
                </Typography>
              </a>
              <a
                href="https://strixgameops.com/docs/feature/entities#Category%20entities"
                target="_blank"
              >
                <Typography
                  variant={"body1"}
                  color={"text.grey"}
                  sx={{
                    width: "282px",
                    fontSize: "13px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  Documentation
                </Typography>
              </a>
            </div>
          </div>
        );
      case 1:
        return getConfigurePage();
      case 2:
        return getAddConfigurePage();
      default:
        break;
    }
  }
  // Page where we do basic configurations (name, icons, etc)
  const fileInputRef = React.useRef(null);
  function getConfigurePage() {
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
            setEntityIcon(compressedImage, selectedFile.name);
          };
          reader.readAsDataURL(selectedFile);
        } catch (error) {}
      }
    };
    function clearImage() {
      setEntityIcon("", "");
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

    switch (selectedType) {
      case "basic":
        return (
          <div
            style={{
              display: "flex",
              justifyContent: isAddingBulk ? "center" : "flex-start",
            }}
            className={`${s.configContainer}`}
          >
            {isAddingBulk ? (
              <BulkAddEntities
                onDataChange={onBulkDataGet}
                parentNodesVariants={parentNodesVariants}
              />
            ) : (
              <div className={s.entityBasicConfig}>
                <div className={s.entityTwoSider}>
                  <div className={s.iconSettigns}>
                    <Box
                      sx={{
                        width: "100px",
                        height: "100px",
                        position: "relative",
                      }}
                    >
                      {entityIcon !== "" && entityIcon !== undefined && (
                        <Tooltip title="Remove image" placement="top">
                          <Button
                            onClick={clearImage}
                            sx={{
                              position: "absolute",
                              top: 0,
                              right: 0,
                              zIndex: 2,
                              minWidth: "30px",
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
                          "&": entityIcon && {
                            p: 0,
                            alignItems: "center",
                            justifyContent: "center",
                          },
                          "& .MuiButton-startIcon": entityIcon && {
                            display: "none",
                          },
                          borderRadius: "1rem",
                          height: "100%",
                          width: "100%",
                          fontSize: 14,
                          whiteSpace: "pre-wrap",
                          textTransform: "none",
                          mr: 2,
                          overflow: "hidden",
                        }}
                      >
                        {entityIcon !== "" && entityIcon !== undefined ? (
                          <div className={s.entityIconContainer}>
                            <div className={s.entityIconOverlay}></div>
                            <img
                              src={`${entityIcon}`}
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

                    <Tooltip
                      title={`You can upload an icon for this entity. It will be
                          displayed on the website. E.g., in analytics for this
                          entity or in overview card when you click on it.`}
                      placement="top"
                    >
                      <IconButton
                        sx={{ borderRadius: 5, cursor: "default !important" }}
                      >
                        <InfoSharpIcon color="primary" />
                      </IconButton>
                    </Tooltip>
                  </div>
                  <div className={s.entityRoleSettings}>
                    <FormGroup
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        width: "300px",
                      }}
                    >
                      <FormControlLabel
                        required
                        control={
                          <Switch
                            value={entityIsCurrency}
                            onChange={(e) =>
                              setEntityIsCurrency(e.target.checked)
                            }
                          />
                        }
                        label="Is currency"
                      />

                      <Tooltip
                        title={`Currency is a type of entity that is used to
                            represent a value in a game. It is used in Offers,
                            Inventory and other places where a value is needed.
                            It is also used in economy and monetization
                            analysis.`}
                        placement="right"
                      >
                        <IconButton
                          sx={{
                            height: "40px",
                            width: "40px",
                            borderRadius: 5,
                            cursor: "default !important",
                          }}
                        >
                          <InfoSharpIcon color="primary" />
                        </IconButton>
                      </Tooltip>
                    </FormGroup>
                    <FormGroup
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        width: "300px",
                      }}
                    >
                      <FormControlLabel
                        required
                        control={
                          <Switch
                            value={entityIsInAppPurchase}
                            onChange={(e) =>
                              setEntityIsInAppPurchase(e.target.checked)
                            }
                          />
                        }
                        label="Can be offer's content"
                      />

                      <Tooltip
                        title={`In-App Purchase is a type of entity that can be
                            bought in game for real money or in-game currency.
                            If checked, this entity will be available to be used
                            in Offers.`}
                        placement="right"
                      >
                        <IconButton
                          sx={{
                            height: "40px",
                            width: "40px",
                            borderRadius: 5,
                            cursor: "default !important",
                          }}
                        >
                          <InfoSharpIcon color="primary" />
                        </IconButton>
                      </Tooltip>
                    </FormGroup>
                    {/* {entityIsInAppPurchase && (
                        <Input spellCheck={false} 
                        onBlur={() => {
                            if (entityRealValueBase === '') {
                                setEntityRealValueBase('0')
                            }
                        }}
                        startAdornment={<InputAdornment position="start">$</InputAdornment>}
                        defaultValue="0" value={entityRealValueBase} onChange={handleNumberInput} label="Base value" />
                    )} */}
                  </div>
                </div>
                <FormControl error={entityNameError}>
                  <InputLabel>Entity name *</InputLabel>
                  <OutlinedInput
                    spellCheck={false}
                    fullWidth
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    required
                    label="Entity name"
                    defaultValue=""
                    endAdornment={
                      <InputAdornment position="end">
                        <Tooltip
                          title={`The name you will see on this website. It won't be
                              sent to the game.`}
                          placement="top"
                        >
                          <IconButton
                            sx={{
                              borderRadius: 5,
                              cursor: "default !important",
                            }}
                          >
                            <InfoSharpIcon color="primary" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    }
                  />
                  <FormHelperText>
                    {entityNameError && `This field is required`}
                  </FormHelperText>
                </FormControl>

                <FormControl error={entityIDError}>
                  <InputLabel>Entity ID *</InputLabel>
                  <OutlinedInput
                    spellCheck={false}
                    fullWidth
                    value={entityID}
                    onChange={(e) => setEntityID(e.target.value)}
                    required
                    label="Entity ID"
                    defaultValue=""
                    endAdornment={
                      <InputAdornment position="end">
                        <Tooltip
                          title={`ID that you would like to use in game code to
                              identify this entity.`}
                          placement="top"
                        >
                          <IconButton
                            sx={{
                              borderRadius: 5,
                              cursor: "default !important",
                            }}
                          >
                            <InfoSharpIcon color="primary" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    }
                  />

                  <FormHelperText>
                    {entityIDError && `This field is required`}
                  </FormHelperText>
                </FormControl>

                <FormControl
                  fullWidth
                  sx={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Autocomplete
                    disablePortal
                    autoComplete
                    value={entityParent}
                    onChange={(e, value) => setEntityParent(value)}
                    options={parentNodesVariants}
                    sx={{ width: 350 }}
                    renderInput={(params) => (
                      <TextField
                        spellCheck={false}
                        {...params}
                        label="Parent category"
                      />
                    )}
                  />
                  <Tooltip
                    title={`You can select a parent category for this entity. In
                        that case, all configs from it will be inherited by this
                        entity and you will be able to override them.`}
                    placement="top"
                  >
                    <IconButton
                      sx={{
                        height: "40px",
                        width: "40px",
                        borderRadius: 5,
                        cursor: "default !important",
                      }}
                    >
                      <InfoSharpIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                </FormControl>
              </div>
            )}
          </div>
        );
      case "category":
        return (
          <div className={s.configContainer}>
            <div className={s.catBasicConfig}>
              <FormControl error={categoryNameError}>
                <InputLabel>Category name *</InputLabel>
                <OutlinedInput
                  spellCheck={false}
                  fullWidth
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  label="Category name"
                  defaultValue=""
                  endAdornment={
                    <InputAdornment position="end">
                      <Tooltip
                        title={`The name you will see on this website. It won't be
                            sent to the game.`}
                        placement="top"
                      >
                        <IconButton>
                          <InfoSharpIcon color="primary" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  }
                />
                <FormHelperText>
                  {categoryNameError && `This field is required`}
                </FormHelperText>
              </FormControl>

              <FormControl error={categoryIDError}>
                <InputLabel>Category ID *</InputLabel>
                <OutlinedInput
                  spellCheck={false}
                  fullWidth
                  value={categoryID}
                  onChange={(e) => setCategoryID(e.target.value)}
                  required
                  label="Category ID"
                  defaultValue=""
                  endAdornment={
                    <InputAdornment position="end">
                      <Tooltip
                        title={`ID that you would like to use in game code to
                            identify this category.`}
                        placement="top"
                      >
                        <IconButton>
                          <InfoSharpIcon color="primary" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  }
                />

                <FormHelperText>
                  {categoryIDError && `This field is required`}
                </FormHelperText>
              </FormControl>

              <FormControl
                fullWidth
                sx={{ flexDirection: "row", alignItems: "center", gap: "5px" }}
              >
                <Autocomplete
                  disablePortal
                  value={categoryParent}
                  onChange={(e, value) => setCategoryParent(value)}
                  id="combo-box-demo"
                  options={parentNodesVariants}
                  sx={{ width: 350 }}
                  renderInput={(params) => (
                    <TextField
                      spellCheck={false}
                      {...params}
                      label="Parent category"
                    />
                  )}
                />
                <Tooltip
                  title={`If you would like to nest this category under another one,
                      select it here.
                      When you nest categories, their configs are inherited.`}
                  placement="top"
                >
                  <IconButton sx={{ height: "40px", width: "40px" }}>
                    <InfoSharpIcon color="primary" />
                  </IconButton>
                </Tooltip>
              </FormControl>
            </div>
          </div>
        );
      default:
        return <div></div>;
    }
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
        return prevConfigs.map((config) => {
          if (config.sid === newConfig.sid) {
            return newConfig;
          }
          return config;
        });
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
  }

  // Page where we do JSON configurations
  function getAddConfigurePage() {
    switch (selectedType) {
      case "basic":
        return (
          <div className={s.configContainer}>
            <div className={s.catAdditionalConfig}>
              <PropsBuilder
                nodeContent={{ nodeID: nodeID }} // we need this to create localization keys and game model functions links
                mainConfigs={mainConfigs}
                inheritedConfigs={inheritedConfigs}
                defaultInheritedConfigs={defaultInheritedConfigs}
                onMainConfigSaved={onMainConfigSaved}
                onInheritedConfigSaved={onInheritedConfigSaved}
                onConfigAdded={addNewConfigLocally}
                onConfigRemoved={onConfigRemoved}
                dataNodes={dataNodes}
                saveError={mainConfigSaveError}
              />
            </div>
          </div>
        );
      case "category":
        return (
          <div className={s.configContainer}>
            <div className={s.catAdditionalConfig}>
              <PropsBuilder
                nodeContent={{ nodeID: nodeID }} // we need this to create localization keys and game model functions links
                mainConfigs={mainConfigs}
                inheritedConfigs={inheritedConfigs}
                defaultInheritedConfigs={defaultInheritedConfigs}
                onMainConfigSaved={onMainConfigSaved}
                onInheritedConfigSaved={onInheritedConfigSaved}
                onConfigAdded={addNewConfigLocally}
                onConfigRemoved={onConfigRemoved}
                dataNodes={dataNodes}
                saveError={mainConfigSaveError}
              />
            </div>
          </div>
        );
      default:
        return <div></div>;
    }
  }

  // When we click on "apply" or "next" button
  async function applyConfig() {
    switch (page) {
      case 0:
        break;
      case 1:
        // Checking if all fields are filled
        let isErr = false;
        if (selectedType === "basic") {
          if (isAddingBulk) {
            // In bulk, we check for errors in required fields and put
            // the errorred values into the state.
            // Cells in table are errored if they have a value from the state array
            if (bulkEntities.length > 0) {
              let errors = bulkEntities
                .map((entity, rowIndex) => {
                  if (
                    entity.entityName === "" ||
                    entity.entityName === undefined
                  ) {
                    return rowIndex;
                  } else if (
                    entity.entityBasic === undefined ||
                    entity.entityBasic.entityID === "" ||
                    entity.entityBasic.entityID === undefined
                  ) {
                    return rowIndex;
                  }
                })
                .filter((index) => index !== undefined && index !== null);
              // console.log('Errors', errors)
              if (errors.length > 0) {
                setBulkEntitiesErrorMessage("Please fill all required fields");
                setBulkEntitiesErrorRows(errors);
                isErr = true;
              }
            } else if (bulkEntities.length === 0) {
              setBulkEntitiesErrorMessage("Please add at least one entity");
              isErr = true;
            }
            if (!isErr) {
              setIsLoadingApply(true);
              const response = await createEntityBulk({
                gameID: game.gameID,
                branch: branch,
                entityObjArray: bulkEntities,
              });
              setIsLoadingApply(false);
              handleCloseParent();
              refetch();
              break;
            }
          } else {
            // Single-edit mode, check for errors
            if (entityName === "") {
              setEntityNameError(true);
              isErr = true;
            }
            if (entityID === "") {
              setEntityIDError(true);
              isErr = true;
            }
            if (isErr) {
              break;
            }
            setEntityNameError(false);
            setEntityIDError(false);
          }
        } else if (selectedType === "category") {
          if (categoryName === "") {
            setCategoryNameError(true);
            isErr = true;
          }
          if (categoryID === "") {
            setCategoryIDError(true);
            isErr = true;
          }
          if (isErr) {
            break;
          }
          setCategoryNameError(false);
          setCategoryIDError(false);
        }
        setPage(2);
        break;
      case 2:
        // gatherEntityObj()
        setIsLoadingApply(true);
        const response = await createEntity({
          gameID: game.gameID,
          branch: branch,
          newNodeID: nodeID,
          entityObj: gatherEntityObj(),
        });
        setIsLoadingApply(false);
        handleCloseParent();
        refetch();
        break;
      default:
        break;
    }
  }

  // When we click on "back" button
  function prevPage() {
    setPage(page - 1);
  }

  // When we close the modal by clicking outside or when we end the process
  async function handleClose() {
    setPage(0);
    setSelectedType("");
    handleCloseParent();
    const resp = await cancelEntityCreation({
      gameID: game.gameID,
      branch: branch,
      nodeID: nodeID,
    });
  }

  // Show different button text depending on the page
  const getMainButtonText = () => {
    switch (page) {
      case 1:
        return "Next";
      default:
        return "Done";
    }
  };
  const newNodeModalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isAddingBulk ? 1100 : 800,
    height: 750,
    bgcolor: "var(--bg-color3)",
    border: "1px solid #625FF440",
    boxShadow: `0px 0px 5px 2px rgba(98, 95, 244, 0.2)`,
    overflow: "hidden",
    borderRadius: "2rem",

    display: "flex",
    flexDirection: "column",
  };
  return (
    <div>
      {/* Create new node modal */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
      >
        {/* Choosing entity type */}
        <Box sx={newNodeModalStyle}>
          <Typography
            variant={"h4"}
            color={"text.primary"}
            sx={{
              pt: "46px",
              mb: "15px",
              fontWeight: "regular",
              textAlign: "center",
            }}
          >
            Create entity
          </Typography>

          <div className={s.stepperBox}>
            <StrixStepper
              steps={
                isAddingBulk
                  ? ["Select type", "Basic bulk configuration"]
                  : [
                      "Select type",
                      "Basic configuration",
                      "Additional configuration",
                    ]
              }
              activeStep={page}
            />
          </div>

          {getPage()}

          {page > 0 && (
            <div className={s.footer}>
              {page === 1 && selectedType !== "category" && (
                <Button
                  variant="outlined"
                  sx={{ width: "130px", height: "auto", marginRight: "auto" }}
                  onClick={() => setIsAddingBulk(!isAddingBulk)}
                >
                  {!isAddingBulk ? "Add bulk" : "Add single"}
                </Button>
              )}
              {page === 2 && (
                <Typography
                  variant={"subtitle1"}
                  color={"text.grey"}
                  sx={{
                    pr: "0px",
                    fontSize: "14px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  You can configure this later
                </Typography>
              )}
              {bulkEntitiesErrorMessage !== "" && (
                <Typography
                  variant={"subtitle1"}
                  color={"#e57373"}
                  sx={{
                    pr: "0px",
                    fontSize: "14px",
                    fontWeight: "regular",
                    textAlign: "center",
                  }}
                >
                  {bulkEntitiesErrorMessage}
                </Typography>
              )}
              <Button
                disabled={isLoadingApply}
                sx={{ width: "90px" }}
                variant="text"
                onClick={prevPage}
              >
                back
              </Button>
              <Button
                disabled={isLoadingApply}
                sx={{ width: "150px" }}
                variant="contained"
                onClick={applyConfig}
              >
                {getMainButtonText()}
              </Button>
            </div>
          )}
        </Box>
      </Modal>
    </div>
  );
};

export default NewNodeModal;
