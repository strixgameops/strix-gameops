import React, {
  useState,
  useEffect,
  useRef,
  useReducer,
  useMemo,
  useCallback,
} from "react";
import { Helmet } from "react-helmet";
import titles from "titles";
import s from "./localization.module.css";


// MUI
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import MuiTab from "@mui/material/Tab";
import Collapse from "@mui/material/Collapse";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import { OutlinedInput } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import { styled } from "@mui/material/styles";
import Input from "@mui/material/Input";
import { useTheme } from "@mui/material/styles";
import GroupsSharpIcon from "@mui/icons-material/GroupsSharp";
import InputAdornment from "@mui/material/InputAdornment";
import FunctionsSharpIcon from "@mui/icons-material/FunctionsSharp";
import TurnedInSharpIcon from "@mui/icons-material/TurnedInSharp";
import Button from "@mui/material/Button";
import shortid from "shortid";
import { randomColor, shortId } from "shared/table/utils";

import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Popover from "@mui/material/Popover";
import { createFilterOptions } from "@mui/material/Autocomplete";
import Table from "shared/table/Table";

import languages from "./languages.js";

import useApi from "@strix/api";

import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import CategoryIcon from "@mui/icons-material/Category";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CloseIcon from "@mui/icons-material/Close";
import Divider from "@mui/material/Divider";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import Paper from "@mui/material/Paper";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";

import DeleteIcon from "@mui/icons-material/Delete";

import { useGame, useBranch } from "@strix/gameContext";
import _ from "lodash";
import { useLocation } from "react-router-dom";

import { useLocalizationTable } from "@strix/LocalizationContext";

function FolderCollapse(props) {
  <Collapse in={expanded} timeout="auto" unmountOnExit></Collapse>;
}
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

const Localization = () => {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const location = useLocation();
  const {
    updateLocalization,
    getLocalization,
    removeLocalizationItem,
    getOffersNames,
    getEntitiesNames,
    updateGameLocalizationSettingsTag,
    updateGameLocalizationSettingsPrefixGroup,
    getGameLocalizationSettings,
  } = useApi();

  const { setPossibleLocalizationTags } = useLocalizationTable();
  // Tabs
  const [tabs, setTabs] = React.useState(0);
  const handleTabChange = (event, newValue) => {
    setTabs(newValue);
  };

  const Tab = styled(MuiTab)(({ theme }) => ({
    // "&.Mui-selected": {
    //   color: theme.palette.liveops.offers,
    // },
  }));
  const [anchorEl, setAnchorEl] = React.useState(null);
  const showAddLanguagePopover = (event) => {
    setAnchorEl(event.target);
  };
  const closeAddLanguagePopover = () => {
    setAnchorEl(null);
  };
  function getLanguageByCode(code) {
    return languages.find((language) => language.code === code);
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [tagDrawerOpen, setTagDrawerOpen] = useState(false);
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [tags, setTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [groupByPrefix, setGroupByPrefix] = useState(false);
  const [filterMissingTranslations, setFilterMissingTranslations] =
    useState(false);

  useEffect(() => {
    setPossibleLocalizationTags(tags);
  }, [tags]);

  const [currentType, setCurrentType] = useState("custom");

  const openAddLanguagePopover = Boolean(anchorEl);

  const defaultColumns = [
    {
      id: "id",
      label: "Key",
      accessor: "id",
      minWidth: 100,
      dataType: "text",
      editable: true,
      options: [],
    },
    {
      id: getLanguageByCode("en").code + "|" + getLanguageByCode("en").flag,
      label: getLanguageByCode("en").englishName,
      accessor:
        getLanguageByCode("en").code + "|" + getLanguageByCode("en").flag,
      minWidth: 250,
      dataType: "localized-text",
      editable: true,
    },
    {
      id: 999999,
      width: 20,
      label: "+",
      disableResizing: true,
      dataType: "addLanguage",
    },
  ];

  const defaultColumn_Tags = {
    id: "tags",
    accessor: "tags",
    width: 150,
    label: "Tags",
    disableResizing: false,
    editable: true,
    dataType: "tags",
  };

  const defaultColumn_Key = {
    id: "id",
    label: "Key",
    accessor: "id",
    minWidth: 100,
    dataType: "text",
    editable: true,
    options: [],
  };
  const defaultColumn_AddLanguage = {
    id: 999999,
    width: 20,
    label: "+",
    disableResizing: true,
    dataType: "addLanguage",
  };
  const defaultColumn_RemoveLanguage = {
    id: 9999998,
    width: 100,
    label: "Remove",
    disableResizing: true,
    editable: true,
    dataType: "removeRow",
  };
  const fixedColumns = ["id", "tags", 999999, 9999998, "sid", "key", "index"];

  function makeStructuredData(data) {
    let structuredData = data.map((row) => {
      // Getting translation items
      let translationsObj = {};
      Object.keys(row).forEach((item) => {
        if (!fixedColumns.includes(item)) {
          const itemName = item.split("|")[0];
          const itemValue = row[item];

          if (itemValue !== undefined && itemName !== undefined) {
            if (itemValue !== "") {
              translationsObj[itemName] = row[item];
            }
          }
        }
      });

      // Constructing translation object
      // Also, if offers, cut the row.id and leave only the first 2 elements
      let key;
      if (currentType === "entities") {
        key = row.id.split("|")[0];
      } else if (currentType === "offers") {
        key = row.id.split("|")[0] + "|" + row.id.split("|")[1];
      } else {
        key = row.id;
      }
      return {
        sid: row.sid,
        key: key,
        tags: row.tags,
        translations: translationsObj,
      };
    });

    return structuredData;
  }

  const [pendingUpdates, setPendingUpdates] = useState([]);
  const debounceTimerRef = useRef(null);
  const debouncedUpdateRef = useRef(null);

  useEffect(() => {
    debouncedUpdateRef.current = _.debounce((updates) => {
      if (updates.length > 0) {
        console.log("Sending debounced updates:", updates);
        updateLocalization({
          gameID: game.gameID,
          branch,
          type: currentType,
          translationObjects: updates,
        });
      }
    }, 500);

    return () => {
      // Cancel any pending debounced calls on cleanup
      if (debouncedUpdateRef.current) {
        debouncedUpdateRef.current.flush();
      }
    };
  }, []);

  useEffect(() => {
    // Cleanup function to send any pending updates when unmounting
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);

        if (pendingUpdates.length > 0) {
          updateLocalization({
            gameID: game.gameID,
            branch,
            type: currentType,
            translationObjects: pendingUpdates,
          });
        }
      }
    };
  }, [pendingUpdates]);

  const [prevData, setPrevData] = useState([]);
  function saveData(newState) {
    let structuredData = makeStructuredData(newState.data);

    if (prevData.length === 0) {
      // It must be done at the start to setup the initial value
      setPrevData(structuredData);
      return;
    }

    let modifiedRows = [];
    function getChangedRows(prevData, newData) {
      newData.forEach((row) => {
        if (
          JSON.stringify(row) !==
          JSON.stringify(prevData.find((prevRow) => prevRow.key === row.key))
        ) {
          modifiedRows.push(row);
        }
      });
    }
    getChangedRows(prevData, structuredData);

    setPrevData(structuredData);

    // Only trigger update if there are modified rows
    if (modifiedRows.length > 0) {
      // Update the pending updates state
      setPendingUpdates((prev) => {
        // Create a new merged array with latest changes taking precedence
        const merged = [...prev];

        modifiedRows.forEach((newRow) => {
          const existingIndex = merged.findIndex(
            (row) => row.key === newRow.key
          );
          if (existingIndex >= 0) {
            merged[existingIndex] = newRow;
          } else {
            merged.push(newRow);
          }
        });

        // Call the debounced update function with the merged updates
        if (debouncedUpdateRef.current) {
          debouncedUpdateRef.current(merged);
        }

        return merged;
      });
    }
  }

  function reducer(state, action) {
    switch (action.type) {
      case "bulk_update_translation":
        const updatedData = state.data.map((row) => {
          if (action.selectedRows.includes(row.sid)) {
            return {
              ...row,
              [action.columnId]: action.value,
            };
          }
          return row;
        });

        const bulkStructuredData = makeStructuredData(updatedData);
        const bulkModifiedRows = bulkStructuredData.filter(
          (row) =>
            JSON.stringify(row) !==
            JSON.stringify(prevData.find((prevRow) => prevRow.key === row.key))
        );

        setPrevData(bulkStructuredData);

        if (bulkModifiedRows.length > 0) {
          updateLocalization({
            gameID: game.gameID,
            branch,
            type: currentType,
            translationObjects: bulkModifiedRows,
          });
        }

        return {
          ...state,
          skipReset: true,
          data: updatedData,
        };
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
          data: [
            ...state.data,
            {
              index: state.data.length + 1,
              sid: shortid.generate(),
            },
          ],
        };
      case "remove_row":
        removeLocalizationItem({
          gameID: game.gameID,
          branch,
          type: currentType,
          sid: state.data[action.rowIndex].sid,
        });
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
        saveData(tempState);
        return tempState;
      case "add_column_to_left":
        const leftIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        let leftId = action.language.code;
        return {
          ...state,
          skipReset: true,
          columns: [
            ...state.columns.slice(0, leftIndex),
            {
              id: leftId + "|" + action.language.flag,
              label: getLanguageByCode(leftId).englishName,
              accessor: leftId + "|" + action.language.flag,
              dataType: "localized-text",
              editable: true,
              created: action.focus && true,
              options: [],
            },
            ...state.columns.slice(leftIndex, state.columns.length),
          ],
        };
      case "add_language":
        showAddLanguagePopover(action.event);
        return state;
      case "add_column_to_right":
        const rightIndex = state.columns.findIndex(
          (column) => column.id === action.columnId
        );
        const rightId = action.languageCode;
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
      case "remove_tags":
        let stateWithoutTags = {
          ...state,
          data: state.data.map((row) => ({
            ...row,
            tags: row.tags.filter((tag) => tag !== action.tag),
          })),
        };
        saveData(stateWithoutTags);
        return stateWithoutTags;
      default:
        return state;
    }
  }
  const [state, dispatch] = useReducer(reducer, {
    columns: defaultColumns,
    data: [],
    skipReset: false,
  });
  useEffect(() => {
    dispatch({ type: "enable_reset" });
    console.log("Data", state);
  }, [state.data, state.columns]);

  const [offers, setOffers] = useState([]);
  async function fetchOffers() {
    const resp = await getOffersNames({ gameID: game.gameID, branch });
    if (resp.success) {
      setOffers(resp.offers);
    }
  }
  const [entities, setEntities] = useState([]);
  async function fetchEntities() {
    const resp = await getEntitiesNames({ gameID: game.gameID, branch });
    if (resp.success) {
      setEntities(resp.entities);
    }
  }

  useEffect(() => {
    switch (tabs) {
      case 0:
        setCurrentType("custom");
        break;
      case 1:
        fetchOffers();
        setCurrentType("offers");
        break;
      case 2:
        setCurrentType("entities");
        break;
    }
    onTabOpened();
  }, [tabs]);

  async function fetchLocalizationSettings() {
    const resp = await getGameLocalizationSettings({
      gameID: game.gameID,
      branch: branch,
    });
    if (resp.success) {
      setGroups(resp.result.prefixGroups);
      setTags(resp.result.tags);
    }
  }

  useEffect(() => {
    // Fetch at least once on the start so we dont get any async bugs when we try to open Offers tab
    async function fetch() {
      async function awaitFetch() {
        await Promise.all([
          fetchOffers(),
          fetchEntities(),
          fetchLocalizationSettings(),
        ]);
      }
      await awaitFetch();

      let params = new URLSearchParams(location.search);
      const tabNum = params.get("tab");
      if (tabNum) {
        setTabs(parseInt(tabNum));
      }
    }
    fetch();
  }, []);

  const [isLoadingData, setIsLoadingData] = useState(false);

  async function onTabOpened() {
    setIsLoadingData(true);

    let type = "";
    switch (tabs) {
      case 0:
        type = "custom";
        break;
      case 1:
        type = "offers";
        break;
      case 2:
        type = "entities";
        break;
    }
    const resp = await getLocalization({ gameID: game.gameID, branch, type });

    let usedLanguages = new Set();

    if (resp.success) {
      let localizationData = resp.localizations;
      localizationData = localizationData
        .map((localization) => {
          let tempData;

          // If localization item is inherited from another localization item, we need to get the key of the parent item
          // so it's easy way to continiously get the key without updating the localization data everytime for all children
          //
          // To find inherited key, we must combine our sid.split('|')[0] part with parent's nodeID, as all localization items' sids are just the same "SID|nodeID"
          let tempKey = localization.inheritedFrom
            ? localizationData.find(
                (l) =>
                  l.sid ===
                  `${localization.sid.split("|")[0]}|${localization.inheritedFrom}`
              )?.key
            : localization.key;

          if (tempKey === undefined && type === "entities") {
            console.log(
              "Item did not found it's inherited localization:",
              localization,
              `${localization.sid.split("|")[0]}|${localization.inheritedFrom}`
            );
            removeLocalizationItem({
              gameID: game.gameID,
              branch,
              type: type,
              sid: localization.sid,
            });
            return null;
          }

          if (type === "offers" && offers) {
            tempData = {
              sid: localization.sid,
              tags: localization.tags,
              id:
                localization.key +
                "|" +
                offers.find(
                  (offer) => offer.offerID === localization.key.split("|")[0]
                )?.offerName,
            };
          } else if (type === "entities" && entities) {
            tempData = {
              sid: localization.sid,
              tags: localization.tags,
              id:
                tempKey +
                "|" +
                entities.find(
                  (entity) => entity.nodeID === localization.sid.split("|")[1]
                )?.name,
            };
          } else {
            tempData = {
              sid: localization.sid,
              id: localization.key,
              tags: localization.tags,
            };
          }

          Object.keys(localization.translations).forEach((obj) => {
            usedLanguages.add(localization.translations[obj].code);
            const languageID =
              localization.translations[obj].code +
              "|" +
              getLanguageByCode(localization.translations[obj].code).flag;
            tempData[languageID] = localization.translations[obj].value;
          });
          return tempData;
        })
        .filter(Boolean);

      let columns = [];

      columns.push(defaultColumn_Tags);

      columns.push(defaultColumn_Key);

      usedLanguages.forEach((language) => {
        let lang = getLanguageByCode(language);
        columns.push({
          id: lang.code + "|" + lang.flag,
          label: getLanguageByCode(lang.code).englishName,
          accessor: lang.code + "|" + lang.flag,
          dataType: "localized-text",
          minWidth: 200,
          width: 300,
          maxWidth: 1000,
          editable: true,
          options: [],
        });
      });

      columns.push(defaultColumn_AddLanguage);

      if (type === "custom") {
        columns.push(defaultColumn_RemoveLanguage);
      } else {
        columns = columns.map((column) => {
          if (column.id === "id") {
            return {
              ...column,
              editable: false,
              minWidth: 250,
              dataType: "text-fake-visual",
            };
          }
          return column;
        });
      }

      setPrevData(makeStructuredData(localizationData));

      dispatch({
        type: "set_category",
        data: localizationData,
        columns: columns,
      });
    }

    setIsLoadingData(false);
  }

  async function addTotalTags(newTag) {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
      await updateGameLocalizationSettingsTag({
        gameID: game.gameID,
        branch: branch,
        tag: newTag,
        operation: "add",
      });
    }
  }
  async function removeTotalTag(tag) {
    if (tag && tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
      setSelectedTags(selectedTags.filter((t) => t !== tag));
      dispatch({ type: "remove_tags", tag: tag });
      await updateGameLocalizationSettingsTag({
        gameID: game.gameID,
        branch: branch,
        tag: tag,
        operation: "remove",
      });
    }
  }
  async function addPrefixGroup(newGroup) {
    if (newGroup && !groups.includes(newGroup)) {
      setGroups([...groups, newGroup]);
      setNewGroup("");
      updPrefixGroups();
    }
  }
  async function removePrefixGroup(group) {
    if (group && groups.includes(group)) {
      setGroups(groups.filter((t) => t !== group));
      setSelectedGroups(selectedGroups.filter((g) => g !== group));
      updPrefixGroups();
    }
  }

  async function setPrefixGroups(g) {
    setGroups(g);
    updPrefixGroups();
  }

  async function updPrefixGroups() {
    setTimeout(async () => {
      await updateGameLocalizationSettingsPrefixGroup({
        gameID: game.gameID,
        branch: branch,
        prefixGroups: groups,
      });
    }, 200);
  }

  const filterOptions = createFilterOptions({
    stringify: (option) => option.englishName + option.code,
  });

  const filteredData = useMemo(() => {
    // Return early if no filters are active.
    if (
      !searchTerm &&
      selectedTags.length === 0 &&
      selectedGroups.length === 0 &&
      !filterMissingTranslations
    ) {
      return state.data;
    }

    // Precompute values outside of the row iteration.
    const lowerSearchTerm = searchTerm ? searchTerm.toLowerCase() : "";
    const translationKeys = state.columns
      .map((c) => c.accessor)
      .filter(Boolean)
      .filter((key) => !fixedColumns.includes(key));

    const selectedTagsSet = new Set(selectedTags);
    const selectedGroupsSet = new Set(selectedGroups);

    return state.data.filter((row) => {
      // 1. Tags filter (cheapest check)
      if (selectedTagsSet.size > 0) {
        const rowTags = row.tags || [];
        let hasTag = false;
        for (let i = 0; i < rowTags.length; i++) {
          if (selectedTagsSet.has(rowTags[i])) {
            hasTag = true;
            break;
          }
        }
        if (!hasTag) return false;
      }

      // 2. Groups filter
      if (selectedGroupsSet.size > 0) {
        if (groupByPrefix) {
          if (typeof row.id !== "string") return false;
          let groupMatch = false;
          // Iterate over selected groups instead of a full array lookup.
          for (const group of selectedGroupsSet) {
            if (row.id.startsWith(group)) {
              groupMatch = true;
              break;
            }
          }
          if (!groupMatch) return false;
        } else {
          if (!selectedGroupsSet.has(row.group)) {
            return false;
          }
        }
      }

      // 3. Missing translations filter
      if (filterMissingTranslations) {
        let hasMissing = false;
        for (let i = 0; i < translationKeys.length; i++) {
          const key = translationKeys[i];
          if (row[key] === undefined || row[key] === "") {
            hasMissing = true;
            break;
          }
        }
        if (!hasMissing) return false;
      }

      // 4. Search filter (potentially the most expensive)
      if (lowerSearchTerm) {
        let found = false;
        // Instead of Object.values, loop over keys to avoid unnecessary array creation.
        for (const key in row) {
          const value = row[key];
          if (
            typeof value === "string" &&
            value.toLowerCase().includes(lowerSearchTerm)
          ) {
            found = true;
            break;
          }
        }
        if (!found) return false;
      }

      return true;
    });
  }, [
    state.data,
    state.columns,
    searchTerm,
    selectedTags,
    selectedGroups,
    groupByPrefix,
    filterMissingTranslations,
    fixedColumns,
  ]);

  const renderFilterDrawer = () => (
    <Popover
      anchor="right"
      open={Boolean(filterDrawerOpen)}
      anchorEl={filterDrawerOpen}
      onClose={() => setFilterDrawerOpen(false)}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
    >
      <Box sx={{ width: 300, p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">Filters</Typography>
          <IconButton onClick={() => setFilterDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Language Filter
        </Typography>
        {state.columns
          .filter((col) => col.dataType === "localized-text")
          .map((column) => {
            const languageCode = column.id.split("|")[0];
            const languageName =
              getLanguageByCode(languageCode)?.englishName || languageCode;

            return (
              <FormControlLabel
                key={column.id}
                control={
                  <Checkbox
                    checked={!state.hiddenColumns?.includes(column.id)}
                    onChange={() => {
                      if (state.hiddenColumns?.includes(column.id)) {
                        dispatch({ type: "show_column", columnId: column.id });
                      } else {
                        dispatch({ type: "hide_column", columnId: column.id });
                      }
                    }}
                  />
                }
                label={languageName}
              />
            );
          })}

        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => dispatch({ type: "show_all_columns" })}
          >
            Show All Languages
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Missing Translations
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              onChange={(e) => {
                setFilterMissingTranslations(e.target.checked);
              }}
            />
          }
          label="Show items with missing translations"
        />
      </Box>
    </Popover>
  );

  const renderTagDrawer = () => (
    <Popover
      anchor="right"
      open={Boolean(tagDrawerOpen)}
      anchorEl={tagDrawerOpen}
      onClose={() => setTagDrawerOpen(false)}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
    >
      <Box sx={{ width: 300, p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">Tags</Typography>
          <IconButton onClick={() => setTagDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: "flex", mb: 2 }}>
          <TextField
            size="small"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            label="New Tag"
            fullWidth
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            onClick={() => {
              addTotalTags(newTag);
            }}
          >
            Add
          </Button>
        </Box>

        <Typography variant="subtitle2" gutterBottom>
          Filter by Tags
        </Typography>
        <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
          {tags.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  color={selectedTags.includes(tag) ? "primary" : "default"}
                  onClick={() => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter((t) => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                  onDelete={() => {
                    removeTotalTag(tag);
                  }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No tags created yet
            </Typography>
          )}
        </Paper>
      </Box>
    </Popover>
  );

  const renderGroupDrawer = () => {
    const handleAutoDetectPrefixes = () => {
      // auto-detection logic
      const delimiters = [".", "_", "-", ":", "/"];
      const prefixes = new Set();
      const prefixCounts = new Map();

      // First pass: count occurrences of potential prefixes
      state.data.forEach((row) => {
        if (typeof row.id === "string" && row.id.trim()) {
          // Try different levels of nesting (1st level, 2nd level, etc.)
          for (const delimiter of delimiters) {
            if (row.id.includes(delimiter)) {
              // Get first-level prefix
              const [firstPrefix] = row.id.split(delimiter);
              if (firstPrefix) {
                prefixCounts.set(
                  firstPrefix,
                  (prefixCounts.get(firstPrefix) || 0) + 1
                );
              }

              // Get second-level prefix if available
              const parts = row.id.split(delimiter);
              if (parts.length > 2) {
                const secondLevelPrefix = parts.slice(0, 2).join(delimiter);
                prefixCounts.set(
                  secondLevelPrefix,
                  (prefixCounts.get(secondLevelPrefix) || 0) + 1
                );
              }
            }
          }

          // Also consider common patterns without delimiters (camelCase, PascalCase)
          const camelCaseMatch = row.id.match(/^([a-z]+)([A-Z])/);
          if (camelCaseMatch && camelCaseMatch[1]) {
            prefixCounts.set(
              camelCaseMatch[1],
              (prefixCounts.get(camelCaseMatch[1]) || 0) + 1
            );
          }
        }
      });

      // Filter prefix candidates by minimum occurrence (to avoid one-off prefixes)
      const minOccurrences = Math.max(2, Math.ceil(state.data.length * 0.05)); // At least 5% of keys or 2 occurrences

      prefixCounts.forEach((count, prefix) => {
        if (count >= minOccurrences) {
          prefixes.add(prefix);
        }
      });

      // Final filter: remove redundant prefixes (if a longer prefix is a superset of a shorter one)
      const prefixArray = Array.from(prefixes);
      const filteredPrefixes = prefixArray.filter((prefix) => {
        // Keep this prefix if no other prefix starts with it (plus a delimiter)
        return !prefixArray.some(
          (otherPrefix) =>
            otherPrefix !== prefix &&
            otherPrefix.startsWith(prefix) &&
            delimiters.some((d) => otherPrefix.charAt(prefix.length) === d)
        );
      });

      // Add the new prefixes to existing groups
      setPrefixGroups([...new Set([...groups, ...filteredPrefixes])]);

      // Select the most common groups automatically (top 5)
      const topGroups = Array.from(prefixCounts.entries())
        .filter(([prefix]) => filteredPrefixes.includes(prefix))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([prefix]) => prefix);

      setSelectedGroups([...new Set([...selectedGroups, ...topGroups])]);
    };

    return (
      <Popover
        anchor="right"
        open={Boolean(groupDrawerOpen)}
        anchorEl={groupDrawerOpen}
        onClose={() => setGroupDrawerOpen(false)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Groups</Typography>
            <IconButton onClick={() => setGroupDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <FormControlLabel
            control={
              <Checkbox
                checked={groupByPrefix}
                onChange={(e) => setGroupByPrefix(e.target.checked)}
              />
            }
            label="Group by key prefix"
          />

          {groupByPrefix && (
            <Box sx={{ display: "flex", mb: 2, mt: 1 }}>
              <TextField
                size="small"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                label="New Prefix Group"
                fullWidth
                sx={{ mr: 1 }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  addPrefixGroup(newGroup);
                }}
              >
                Add
              </Button>
            </Box>
          )}

          <List sx={{ maxHeight: 600 }}>
            {groupByPrefix ? (
              groups.length > 0 ? (
                groups.map((group) => (
                  <ListItem
                    sx={{ borderRadius: "2rem" }}
                    key={group}
                    button
                    selected={selectedGroups.includes(group)}
                    onClick={() => {
                      if (selectedGroups.includes(group)) {
                        setSelectedGroups(
                          selectedGroups.filter((g) => g !== group)
                        );
                      } else {
                        setSelectedGroups([...selectedGroups, group]);
                      }
                    }}
                  >
                    <ListItemIcon>
                      <CategoryIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={group}
                      secondary={`${
                        state.data.filter(
                          (row) =>
                            typeof row.id === "string" &&
                            row.id.startsWith(group)
                        ).length
                      } keys`}
                    />
                    <IconButton
                      size="small"
                      sx={{ zIndex: 2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removePrefixGroup(group);
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ p: 2 }}
                >
                  Add prefix groups to organize your keys
                </Typography>
              )
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                Enable "Group by key prefix" to create groups
              </Typography>
            )}
          </List>

          {groupByPrefix && (
            <Box
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}
            >
              <Button
                fullWidth
                variant="outlined"
                onClick={handleAutoDetectPrefixes}
                startIcon={<AutoFixHighIcon />}
              >
                Prefix Auto-Detection
              </Button>

              {groups.length > 0 && (
                <Button
                  fullWidth
                  variant="text"
                  color="error"
                  onClick={() => {
                    setPrefixGroups([]);
                    setSelectedGroups([]);
                  }}
                  startIcon={<DeleteIcon />}
                >
                  Clear All Prefixes
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Popover>
    );
  };

  return (
    <div className={s.mainContainer}>
      <Helmet>
        <title>{titles.lo_localization}</title>
      </Helmet>

      <Backdrop sx={{ color: "#fff", zIndex: 2 }} open={isLoadingData}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Popover
        open={openAddLanguagePopover}
        anchorEl={anchorEl}
        onClose={closeAddLanguagePopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              overflow: "visible",
            },
          },
        }}
      >
        <Autocomplete
          id="country-select-demo"
          sx={{ width: 300 }}
          options={languages.filter(
            (language) =>
              !state.columns.some(
                (column) =>
                  typeof column.id === "string" &&
                  column.id.split("|")[0] === language.code
              )
          )}
          onChange={(event, newValue) => {
            dispatch({
              type: "add_column_to_left",
              columnId: 999999,
              focus: true,
              language: newValue,
            });
            dispatch({
              type: "update_column_type",
              columnId: newValue.code + "|" + newValue.flag,
              language: newValue,
            });
            closeAddLanguagePopover();
          }}
          autoHighlight
          filterOptions={filterOptions}
          getOptionLabel={(option) => `${option.englishMame} (${option.code})`}
          renderOption={(props, option) => (
            <Box
              component="li"
              sx={{ "& > img": { mr: 2, flexShrink: 0 } }}
              {...props}
            >
              <img
                loading="lazy"
                width="20"
                srcSet={`https://flagcdn.com/w40/${option.flag.toLowerCase()}.png 2x`}
                src={`https://flagcdn.com/w20/${option.flag.toLowerCase()}.png`}
                alt=""
              />
              {option.englishName} ({option.code})
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              spellCheck={false}
              {...params}
              label="Choose a language"
              inputProps={{
                ...params.inputProps,
                autoComplete: "new-password", // disable autocomplete and autofill
              }}
            />
          )}
        />
      </Popover>

      <div className={s.navbarContainer}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", width: "100%" }}>
          <Tabs
            // TabIndicatorProps={{
            //   style: {
            //     backgroundColor: "#D97D54",
            //   },
            // }}
            value={tabs}
            onChange={handleTabChange}
            aria-label="localization navbar tabs"
          >
            <Tab label="custom" {...allyProps(0)} />
            <Tab label="offers" {...allyProps(1)} />
            <Tab label="entities" {...allyProps(2)} />
          </Tabs>
        </Box>
      </div>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 1,
          p: 2,
          bgcolor: "background.paper",
          borderRadius: 1,
        }}
      >
        <TextField
          variant="outlined"
          placeholder="Search keys..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ mr: 2, width: "300px" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm("")}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <Tooltip title="Filters">
          <IconButton onClick={(e) => setFilterDrawerOpen(e.currentTarget)}>
            <FilterListIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Tags">
          <IconButton onClick={(e) => setTagDrawerOpen(e.currentTarget)}>
            <LocalOfferIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Groups">
          <IconButton onClick={(e) => setGroupDrawerOpen(e.currentTarget)}>
            <CategoryIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {renderFilterDrawer()}
      {renderTagDrawer()}
      {renderGroupDrawer()}
      <div className={s.pageContent}>
        <CustomTabPanel value={tabs} index={0}>
          <div className={s.tableContainer}>
            <Table
              showPagination={true}
              columns={state.columns}
              data={filteredData}
              dispatch={dispatch}
              skipReset={state.skipReset}
              showAdd={true}
              hiddenColumns={state.hiddenColumns}
              fixedColumns={fixedColumns}
            />
          </div>
        </CustomTabPanel>

        <CustomTabPanel value={tabs} index={1}>
          <div className={s.tableContainer}>
            <Table
              showPagination={true}
              columns={state.columns}
              data={filteredData}
              dispatch={dispatch}
              skipReset={state.skipReset}
              showAdd={false}
              hiddenColumns={state.hiddenColumns}
              fixedColumns={fixedColumns}
            />
          </div>
        </CustomTabPanel>

        <CustomTabPanel value={tabs} index={2}>
          <div className={s.tableContainer}>
            <Table
              showPagination={true}
              columns={state.columns}
              data={filteredData}
              dispatch={dispatch}
              skipReset={state.skipReset}
              showAdd={false}
              hiddenColumns={state.hiddenColumns}
              fixedColumns={fixedColumns}
            />
          </div>
        </CustomTabPanel>
      </div>
    </div>
  );
};

export default Localization;
