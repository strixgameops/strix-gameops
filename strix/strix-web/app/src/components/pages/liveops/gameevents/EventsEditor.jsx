import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Helmet } from "react-helmet";
import titles from "titles";
import dayjs from "dayjs";
import utc from "dayjs-plugin-utc";
import s from "./css/gameevents.module.css";

import shortid from "shortid";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import { useGame, useBranch } from "@strix/gameContext";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import { useTheme } from "@mui/material/styles";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import ArrowBackIosNewSharpIcon from "@mui/icons-material/ArrowBackIosNewSharp";
import AddSharpIcon from "@mui/icons-material/AddSharp";
import TodaySharpIcon from "@mui/icons-material/TodaySharp";
import EditSharpIcon from "@mui/icons-material/EditSharp";
import EventNoteSharpIcon from "@mui/icons-material/EventNoteSharp";
import Modal from "@mui/material/Modal";
import DatePicker from "shared/datePicker/DatePickerWidget.jsx";
import Paper from "@mui/material/Paper";

import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import { useEffectOnce } from "react-use";
import CollapsibleSection from "./CollapsibleSection";
import { useAlert } from "@strix/alertsContext";
import PauseSharpIcon from "@mui/icons-material/PauseSharp";
import FormatColorFillIcon from "@mui/icons-material/FormatColorFill";
import { MuiColorInput } from "mui-color-input";
import chroma from "chroma-js";
import { customAlphabet } from "nanoid";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoOutlinedIcon from "@mui/icons-material/Info";

import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import MuiTab from "@mui/material/Tab";
import Collapse from "@mui/material/Collapse";
import { styled } from "@mui/material/styles";

import useApi from "@strix/api";

import Autocomplete from "@mui/material/Autocomplete";
import RemoteConfig from "../../planning/node/RemoteConfig/RemoteConfig";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import OfferIconPlaceholder from "shared/icons/OfferIconPlaceholder.jsx";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";
import TrendingFlatSharpIcon from "@mui/icons-material/TrendingFlatSharp";

import SetPrice from "../../liveops/offers/addComponents/SetPrice";
import AddEntity from "../../liveops/offers/addComponents/AddEntity";
import EntityItem from "../../liveops/offers/EntityItem";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";

function EventEditor({
  event,
  onChange,
  onRemove,
  open,
  onClose,
  nodeData,
  treeData,
  segmentsList,

  //
  entities,
  gameModelFunctions,
  offersList,
  pricing,
  exchangeRates,
  exchangeRates_USD,
  allEntitiesNames,
}) {
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "95%",
    height: "fit-content",
    maxHeight: "90%",
    bgcolor: "var(--bg-color3)",
    border: "1px solid #625FF440",
    boxShadow: `0px 0px 5px 2px rgba(98, 95, 244, 0.2)`,
    overflowY: "auto",
    scrollbarWidth: "thin",

    borderRadius: "2rem",

    display: "flex",
    flexDirection: "column",
    p: 4,
    pr: 0.3,
  };

  const confirmStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "30%",
    height: "fit-content",
    maxHeight: "90%",
    bgcolor: "var(--bg-color3)",
    border: "1px solid #625FF440",
    boxShadow: `0px 0px 5px 2px rgba(98, 95, 244, 0.2)`,
    scrollbarWidth: "thin",
    borderRadius: "2rem",

    display: "flex",
    flexDirection: "column",
    p: 4,
  };

  const {
    getEntitiesNames,
    getNode,
    removeEntityFromGameEvent,
    getEntitiesByNodeIDs,
  } = useApi();

  const { game } = useGame();
  const { branch, environment } = useBranch();

  const [durationError, setDurationError] = useState(false);
  const [startingTimeError, setStartingTimeError] = useState(false);
  const [startingTime_Hours, setStartingTime_Hours] = useState("");
  const [startingTime_Minutes, setStartingTime_Minutes] = useState("");
  const [eventState, setEventState] = useState(event);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const [selectedEntities, setSelectedEntities] = useState([]);
  const [targetEntity, setTargetEntity] = useState(undefined);

  const [selectedOffers, setSelectedOffers] = useState([]);
  const [targetOffer, setTargetOffer] = useState(undefined);
  const [nodeContents, setNodeContents] = useState({});
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  const lastConfigRef_Main = useRef({});
  const lastConfigRef_Inherited = useRef({});
  const [entitiesNames, setEntitiesNames] = useState([]);

  useEffect(() => {
    setEventState(event);
    if (event) {
      setStartingTime_Hours(event.startingTime.slice(0, 2));
      setStartingTime_Minutes(event.startingTime.slice(2, 5));
      setSelectedEntities(event.selectedEntities);
      setSelectedOffers(
        offersList
          .map((o) => {
            // Combine default offers with changed
            let changed = event.selectedOffers.find(
              (of) => of.offerID === o.offerID
            );
            if (changed) {
              return { ...o, ...changed };
            } else {
              return null;
            }
          })
          .filter(Boolean)
      );
      // Do this code, otherwise errors persist on reopen
      setDurationError(event.duration === "");
      setStartingTimeError(
        event.startingTime === "" || event.startingTime.length < 4
      );
      setTargetEntity(undefined);
    }
  }, [event]);
  useEffect(() => {
    fetchEntities();
  }, [nodeData, open]);

  useEffect(() => {
    if (selectedEntities.length > 0) {
      selectedEntities.forEach((nodeID) => {
        if (!nodeContents || !nodeContents[nodeID]) {
          fetchNodeContent(nodeID);
        }
      });
    }
  }, [selectedEntities]);

  function setEventStartDate(newDate) {
    setEventState({ ...eventState, startingDate: newDate });
  }
  function setEventIsRecurring(bool) {
    setEventState({ ...eventState, isRecurring: bool });
  }
  function setEventIsPaused(bool) {
    setEventState({ ...eventState, isPaused: bool });
  }
  function setEventRecurEveryN(number) {
    setEventState({ ...eventState, recurEveryN: number });
  }
  function setEventRecurEveryType(type) {
    setEventState({ ...eventState, recurEveryType: type });
  }
  function toggleRecurringWeekDay(day) {
    if (!eventState.recurWeekly_recurOnWeekDay) {
      setEventState({ ...eventState, recurWeekly_recurOnWeekDay: [day] });
      return;
    }
    let newDays = eventState.recurWeekly_recurOnWeekDay.includes(day)
      ? eventState.recurWeekly_recurOnWeekDay.filter((d) => d !== day)
      : [...eventState.recurWeekly_recurOnWeekDay, day];
    setEventState({ ...eventState, recurWeekly_recurOnWeekDay: newDays });
  }

  function getOrdinalNumber(num) {
    switch (num) {
      case 1:
        return "1st";
      case 2:
        return "2nd";
      case 3:
        return "3rd";
      default:
        return `${num}th`;
    }
  }
  function getFullWeekDayName(day) {
    switch (day) {
      case "Sun":
        return "Sunday";
      case "Mon":
        return "Monday";
      case "Tue":
        return "Tuesday";
      case "Wed":
        return "Wednesday";
      case "Thu":
        return "Thursday";
      case "Fri":
        return "Friday";
      case "Sat":
        return "Saturday";
    }
  }
  function getRecurringTextResult() {
    if (eventState.isRecurring) {
      switch (eventState.recurEveryType) {
        case "days":
          return `Event will repeat every ${eventState.recurEveryN} ${eventState.recurEveryType}`;
        case "weeks":
          return `Event will repeat every ${eventState.recurEveryN} ${eventState.recurEveryType} on ${eventState.recurWeekly_recurOnWeekDay.map((d) => getFullWeekDayName(d)).join(", ")}`;
        case "months":
          if (eventState.recurMonthly_ConfigNum === 0) {
            return `Event will repeat every ${eventState.recurEveryN} ${eventState.recurEveryType} on the 
              ${getOrdinalNumber(eventState.recurMonthly_recurOnDayNum)} day`;
          } else if (eventState.recurMonthly_ConfigNum === 1) {
            return `Event will repeat every ${eventState.recurEveryN} ${eventState.recurEveryType} on the 
              ${getOrdinalNumber(eventState.recurMonthly_recurOnWeekNum)} ${getFullWeekDayName(eventState.recurMonthly_recurOnWeekDay)}`;
          }
        case "years":
          if (eventState.recurYearly_ConfigNum === 0) {
            return `Event will repeat every ${eventState.recurEveryN} ${eventState.recurEveryType} on ${eventState.recurYearly_recurOnMonth} 
              ${getOrdinalNumber(eventState.recurYearly_recurOnDayNum)}`;
          } else if (eventState.recurYearly_ConfigNum === 1) {
            return `Event will repeat every ${eventState.recurEveryN} ${eventState.recurEveryType} on the 
              ${getOrdinalNumber(eventState.recurYearly_recurOnWeekNum)} ${getFullWeekDayName(eventState.recurYearly_recurOnWeekDay)}
              of ${eventState.recurYearly_recurOnMonth} `;
          }
      }
    }
    return ``;
  }

  function setEventYearlyConfigNum(num) {
    setEventState({ ...eventState, recurYearly_ConfigNum: num });
  }
  function setEventYearlyRecurDayNum(num) {
    setEventState({ ...eventState, recurYearly_recurOnDayNum: num });
  }
  function setEventYearlyRecurMonth(month) {
    setEventState({ ...eventState, recurYearly_recurOnMonth: month });
  }
  function setEventYearlyRecurWeekDay(day) {
    setEventState({ ...eventState, recurYearly_recurOnWeekDay: day });
  }
  function setEventYearlyRecurWeekNum(num) {
    setEventState({ ...eventState, recurYearly_recurOnWeekNum: num });
  }
  function setEventMonthlyConfigNum(num) {
    setEventState({ ...eventState, recurMonthly_ConfigNum: num });
  }
  function setEventMonthlyRecurDayNum(num) {
    setEventState({ ...eventState, recurMonthly_recurOnDayNum: num });
  }
  function setEventMonthlyRecurWeekDay(day) {
    setEventState({ ...eventState, recurMonthly_recurOnWeekDay: day });
  }
  function setEventMonthlyRecurWeekNum(num) {
    setEventState({ ...eventState, recurMonthly_recurOnWeekNum: num });
  }
  function setEventStartTime(time) {
    setEventState({ ...eventState, startingTime: time.slice(0, 4) });
  }
  function setEventDuration(d) {
    setEventState({ ...eventState, duration: d });
  }

  function setEventChipColor(hex) {
    setEventState({ ...eventState, chipColor: hex });
  }

  function setEventName(newName) {
    setEventState({ ...eventState, name: newName });
  }

  function setEventComment(newComment) {
    setEventState({ ...eventState, comment: newComment });
  }

  function isSameObject(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  function saveEvent() {
    if (eventState.duration === "") {
      setDurationError(true);
      return;
    }
    if (eventState.startingTime === "" || eventState.startingTime.length < 4) {
      setStartingTimeError(true);
      return;
    }
    if (
      parseInt(eventState.startingTime.slice(0, 2)) > 23 ||
      parseInt(eventState.startingTime.slice(2, 5)) > 59
    ) {
      setStartingTimeError(true);
      return;
    }
    let t = eventState;
    if (selectedOffers && selectedOffers.length > 0) {
      t.selectedOffers = selectedOffers
        .map((o) => {
          let obj = {
            offerID: o.offerID,
            content: isSameObject(getOfferEntityContent(o.offerID), o.content)
              ? undefined
              : o.content,
            offerIcon: isSameObject(getOfferIcon(o.offerID, true), o.offerIcon)
              ? undefined
              : o.offerIcon,
            offerPrice: isSameObject(
              getOfferPriceObject(o.offerID),
              o.offerPrice
            )
              ? undefined
              : o.offerPrice,
          };
          if (!obj.content && !obj.offerIcon && !obj.offerPrice) {
            return undefined;
          } else {
            return obj;
          }
        })
        .filter(Boolean);
    }
    onChange(t);
    closeEditor();
  }
  function closeEditor() {
    setTargetOffer(undefined);
    setTargetEntity(undefined);
    onClose();
  }

  function finalRemoveAccept() {
    onRemove(eventState);
    setRemoveConfirmOpen(false);
    closeEditor();
  }

  function handleTimeUnitIntegerInput(timeStr, type) {
    let res = timeStr;
    function isZeroNType(str) {
      if (str.length === 2) {
        if (str[0] === "0") {
          return true;
        }
      }
      return false;
    }
    switch (type) {
      case "hour":
        if (isZeroNType(res)) {
          return res;
        } else {
          res = clamp(handleIntegerInput(res), 0, 23);
        }
        break;
      case "minute":
        if (isZeroNType(res)) {
          return res;
        } else {
          res = clamp(handleIntegerInput(res), 0, 59);
        }
        break;
    }
    return res;
  }

  async function fetchEntities() {
    if (allEntitiesNames) {
      setEntitiesNames(
        allEntitiesNames.filter((e) => {
          if (nodeData) {
            const foundEntity = nodeData.find((n) => n.nodeID === e.nodeID);
            return (
              e.nodeID !== "Root" && foundEntity && !foundEntity.entityCategory
            );
          } else {
            return true;
          }
        })
      );
    }
  }

  async function fetchNodeContent(nodeID) {
    setIsFetchingConfig(true);
    const response = await getNode({
      gameID: game.gameID,
      branch: branch,
      nodeID: nodeID,
    });
    setNodeContents((prev) => {
      prev[nodeID] = response;
      return prev;
    });
    setIsFetchingConfig(false);
  }

  function handleChangeMainConfigs(newConfigs) {
    if (lastConfigRef_Main.current[targetEntity] === JSON.stringify(newConfigs))
      return;
    setNodeContents((prev) => {
      prev[targetEntity] = {
        ...prev[targetEntity],
        entityBasic: {
          ...prev[targetEntity]?.entityBasic,
          mainConfigs: newConfigs,
        },
      };
    });
    lastConfigRef_Main.current[targetEntity] = JSON.stringify(newConfigs);
  }

  function handleChangeInheritedConfigs(newConfigs) {
    if (
      lastConfigRef_Inherited.current[targetEntity] ===
      JSON.stringify(newConfigs)
    )
      return;
    setNodeContents((prev) => {
      prev[targetEntity] = {
        ...prev[targetEntity],
        entityBasic: {
          ...prev[targetEntity]?.entityBasic,
          inheritedConfigs: newConfigs,
        },
      };
      return prev;
    });
    lastConfigRef_Inherited.current[targetEntity] = JSON.stringify(newConfigs);
  }
  function toggleSegmentsWhitelist(newArray) {
    setEventState({ ...eventState, segmentsWhitelist: newArray });
  }
  function toggleSegmentsBlacklist(newArray) {
    setEventState({ ...eventState, segmentsBlacklist: newArray });
  }
  function addSelectedEntity(nodeID) {
    let newArr = [...selectedEntities];
    if (!newArr.includes(nodeID)) {
      newArr = [...newArr, nodeID];
      setSelectedEntities(newArr);
      setEventState({ ...eventState, selectedEntities: newArr });
    }
  }
  function removeSelectedEntity(nodeID) {
    let newArr = [...selectedEntities];
    if (newArr.includes(nodeID)) {
      newArr = newArr.filter((o) => o !== nodeID);
      setSelectedEntities(newArr);
      setEventState({ ...eventState, selectedEntities: newArr });
      setTargetEntity(undefined);
      handleEntityRemove(nodeID);

      setNodeContents((prev) => {
        delete prev[targetEntity];
        return prev;
      });
    }
  }
  async function handleEntityRemove(nodeID) {
    await removeEntityFromGameEvent({
      gameID: game.gameID,
      branch: branch,
      eventID: eventState.id,
      nodeID: nodeID,
    });
  }

  function addSelectedOffer(offer) {
    let newArr = [...selectedOffers];
    if (!newArr.some((o) => o.offerID === offer.offerID)) {
      newArr = [...newArr, offer];
      setSelectedOffers(newArr);
      setEventState({ ...eventState, selectedOffers: newArr });
    }
  }
  function removeSelectedOffer(offer) {
    let newArr = [...selectedOffers];
    if (newArr.some((o) => o.offerID === offer.offerID)) {
      newArr = newArr.filter((o) => o.offerID !== offer.offerID);
      setSelectedOffers(newArr);
      setEventState({ ...eventState, selectedOffers: newArr });
      setTargetOffer(undefined);
    }
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

  // Tabs
  const [tabs, setTabs] = React.useState(0);
  const handleTabChange = (event, newValue) => {
    setTabs(newValue);
  };

  const Tab = styled(MuiTab)(({ theme }) => ({
    "&.Mui-selected": {
      // color: theme.palette.liveops.offers,
    },
  }));

  function getOfferIcon(offerID, getRawIcon) {
    let icon = offersList.find((offer) => offer.offerID === offerID)?.offerIcon;
    if (getRawIcon) {
      return icon;
    }
    if (icon === undefined || icon === "") {
      return <OfferIconPlaceholder />;
    }
    return <img src={`${icon}`} />;
  }
  function getOfferPriceObject(offerID) {
    let price = offersList.find(
      (offer) => offer.offerID === offerID
    )?.offerPrice;
    if (price === undefined || price === "") {
      return undefined;
    }
    return price;
  }
  function getOfferEntityContent(offerID) {
    let content = offersList.find(
      (offer) => offer.offerID === offerID
    )?.content;
    if (content === undefined || content === "") {
      return [];
    }
    return content;
  }

  function getChangedOfferIcon(offerID) {
    const offer = selectedOffers.find((o) => o.offerID === offerID);
    if (offer) {
      return offer.offerIcon;
    } else {
      return "";
    }
  }
  function getChangedOfferPriceObject(offerID) {
    const offer = selectedOffers.find((o) => o.offerID === offerID);
    if (offer) {
      return offer.offerPrice;
    } else {
      return undefined;
    }
  }
  function getChangedOfferContent(offerID) {
    const offer = selectedOffers.find((o) => o.offerID === offerID);
    if (offer) {
      return offer.content;
    } else {
      return [];
    }
  }

  function setChangedOfferIcon(offerID, newIcon) {
    setSelectedOffers((prev) => {
      prev = prev.map((offer) => {
        if (offer.offerID === offerID) {
          return { ...offer, offerIcon: newIcon };
        }
        return offer;
      });
      return JSON.parse(JSON.stringify(prev));
    });
    // setEventState((prev) => {
    //   const offers = prev.selectedOffers.map((offer) => {
    //     if (offer.offerID === offerID) {
    //       return { ...offer, offerIcon: newIcon };
    //     }
    //     return offer;
    //   });
    //   return { ...prev, selectedOffers: offers };
    // });
  }

  function setChangedOfferContent(offerID, newContent) {
    setSelectedOffers((prev) => {
      prev = prev.map((offer) => {
        if (offer.offerID === offerID) {
          return { ...offer, content: newContent };
        }
        return offer;
      });
      return JSON.parse(JSON.stringify(prev));
    });

    // setEventState((prev) => {
    //   const offers = prev.selectedOffers.map((offer) => {
    //     if (offer.offerID === offerID) {
    //       return { ...offer, content: newContent,
    //       };
    //     }
    //     return offer;
    //   });
    //   return { ...prev, selectedOffers: offers };
    // });
  }
  function addEntityToChangedOfferContent(offerID, newEntity, amount) {
    setSelectedOffers((prev) => {
      prev = prev.map((offer) => {
        if (offer.offerID === offerID) {
          return {
            ...offer,
            content: [
              ...offer.content,
              {
                nodeID: newEntity.nodeID,
                amount: clamp(
                  handleIntegerInput(amount),
                  1,
                  Number.MAX_SAFE_INTEGER
                ),
              },
            ],
          };
        }
        return offer;
      });
      return JSON.parse(JSON.stringify(prev));
    });

    // setEventState((prev) => {
    //   const offers = prev.selectedOffers.map((offer) => {
    //     if (offer.offerID === offerID) {
    //       return { ...offer, content: [...offer.content,
    //         {
    //           nodeID: newEntity.nodeID,
    //           amount: clamp(handleIntegerInput(amount), 1, Number.MAX_SAFE_INTEGER),
    //         },
    //       ],
    //       };
    //     }
    //     return offer;
    //   });
    //   return { ...prev, selectedOffers: offers };
    // });
  }
  function removeEntityFromChangedOfferContent(offerID, nodeID) {
    setSelectedOffers((prev) => {
      prev = prev.map((offer) => {
        if (offer.offerID === offerID) {
          return {
            ...offer,
            content: offer.content.filter((entity) => entity.nodeID !== nodeID),
          };
        }
        return offer;
      });
      return JSON.parse(JSON.stringify(prev));
    });

    // setEventState((prev) => {
    //   const offers = prev.selectedOffers.map((offer) => {
    //     if (offer.offerID === offerID) {
    //       return { ...offer, content: offer.content.filter(entity => entity.nodeID !== nodeID) };
    //     }
    //     return offer;
    //   });
    //   return { ...prev, selectedOffers: offers };
    // });
  }
  function setEntityAmountToChangedOfferContent(offerID, nodeID, amount) {
    setSelectedOffers((prev) => {
      prev = prev.map((offer) => {
        if (offer.offerID === offerID) {
          const t = offer.content.map((n) => {
            if (n.nodeID === nodeID) {
              return {
                ...n,
                amount: clamp(
                  handleIntegerInput(amount),
                  1,
                  Number.MAX_SAFE_INTEGER
                ),
              };
            } else {
              return n;
            }
          });
          return { ...offer, content: t };
        }
        return offer;
      });
      return JSON.parse(JSON.stringify(prev));
    });
    // setEventState((prev) => {
    //   const offers = prev.selectedOffers.map((offer) => {
    //     if (offer.offerID === offerID) {
    //       const t = offer.content.map(n => {
    //         if (n.nodeID === nodeID) {

    //           return ({...n,
    //             amount: clamp(
    //               handleIntegerInput(amount),
    //               1,
    //               Number.MAX_SAFE_INTEGER
    //             ),})
    //         } else {
    //           return n;
    //         }
    //       })
    //       return { ...offer, content: t, };
    //     }
    //     return offer;
    //   });
    //   return { ...prev, selectedOffers: offers };
    // });
  }
  function setChangedOfferPriceObject(offerID, newPrice) {
    setSelectedOffers((prev) => {
      prev = prev.map((offer) => {
        if (offer.offerID === offerID) {
          return { ...offer, offerPrice: newPrice };
        }
        return offer;
      });
      console.log("price obj:", prev);
      return JSON.parse(JSON.stringify(prev));
    });

    // setEventState((prev) => {
    //   const offers = prev.selectedOffers.map((offer) => {
    //     if (offer.offerID === offerID) {
    //       return { ...offer, offerPrice: newPrice };
    //     }
    //     return offer;
    //   });
    //   return { ...prev, selectedOffers: offers };
    // });
  }

  // For icon upload input
  const fileInputRef = React.useRef(null);
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
          setChangedOfferIcon(targetOffer, base64File);
        };
        reader.readAsDataURL(selectedFile);
      } catch (error) {}
    }
  };
  function clearImage() {
    setChangedOfferIcon(targetOffer, undefined);
    fileInputRef.current.value = null;
  }
  // useEffect(() => {
  //   console.log("changed:", selectedOffers);
  // }, [selectedOffers]);
  if (!eventState) {
    return null;
  }
  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          closeEditor();
        }}
      >
        <Box sx={style}>
          <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
            Event editor
          </Typography>

          <Box sx={{ display: "flex", mb: 3, gap: 3, width: "100%" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <Box sx={{ display: "flex", mb: 5, alignItems: "center" }}>
                <Typography sx={{ mr: 2 }}>Name</Typography>
                <TextField
                  sx={{ width: "300px", mr: 1 }}
                  variant="standard"
                  value={eventState?.name}
                  onChange={(e) => setEventName(e.target.value)}
                  error={eventState?.name === ""}
                />
              </Box>

              <Box sx={{ display: "flex", mb: 3, alignItems: "center" }}>
                <Typography sx={{ mr: 1 }}>Starting date</Typography>
                <DatePicker
                  filterStateOverride={[dayjs.utc(eventState?.startingDate)]}
                  onStateChange={(newDates) => {
                    setEventStartDate(newDates);
                  }}
                  isSingleDate
                />
                <Typography sx={{ ml: 2, mr: 2 }}>Starting time</Typography>
                <TextField
                  sx={{ width: "20px", mr: 1 }}
                  variant="standard"
                  value={startingTime_Hours}
                  onChange={(e) => {
                    setEventStartTime(
                      `${handleTimeUnitIntegerInput(e.target.value, "hour")}${startingTime_Minutes}`
                    );
                    setStartingTime_Hours(
                      handleTimeUnitIntegerInput(e.target.value, "hour")
                    );
                  }}
                  error={startingTimeError}
                />
                <Typography sx={{ mr: 1 }}>:</Typography>
                <TextField
                  sx={{ width: "20px", mr: 1 }}
                  variant="standard"
                  value={startingTime_Minutes}
                  onChange={(e) => {
                    setEventStartTime(
                      `${startingTime_Hours}${handleTimeUnitIntegerInput(e.target.value, "minute")}`
                    );
                    setStartingTime_Minutes(
                      handleTimeUnitIntegerInput(e.target.value, "minute")
                    );
                  }}
                  error={startingTimeError}
                />
                <Typography sx={{ ml: 1, mr: 2 }}>UTC</Typography>
              </Box>
              <Box sx={{ display: "flex", mb: 3, alignItems: "center" }}>
                <Typography sx={{ mr: 2 }}>Duration (minutes)</Typography>
                <TextField
                  sx={{ width: "100px", mr: 1 }}
                  variant="standard"
                  value={eventState?.duration}
                  onChange={(e) =>
                    setEventDuration(
                      handleIntegerInput(e.target.value.slice(0, 10))
                    )
                  }
                  error={durationError}
                />
                <Typography color="text.grey" sx={{ mr: 2 }}>
                  {(eventState?.duration / 60).toFixed(1)} hours
                </Typography>
              </Box>

              <Box sx={{ display: "flex", mb: 3, alignItems: "center" }}>
                <Typography sx={{ mr: 1 }}>Deactivate</Typography>
                <RecurringCheckbox
                  initialState={eventState?.isPaused || false}
                  onCheck={setEventIsPaused}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  mb: eventState?.isRecurring ? 3 : 0,
                  alignItems: "center",
                }}
              >
                <Typography sx={{ mr: 1 }}>Recurring</Typography>
                <RecurringCheckbox
                  initialState={eventState?.isRecurring || false}
                  onCheck={setEventIsRecurring}
                />
              </Box>

              {eventState?.isRecurring && (
                <CollapsibleSection name="Recurrence options">
                  <Box sx={{ display: "flex", mb: 3, alignItems: "center" }}>
                    <Typography sx={{ mr: 1 }}>Repeat every</Typography>
                    <TextField
                      sx={{ width: "50px", mr: 1 }}
                      variant="standard"
                      value={eventState?.recurEveryN}
                      onChange={(e) =>
                        setEventRecurEveryN(handleIntegerInput(e.target.value))
                      }
                    />
                    <FormControl sx={{ width: 130 }} size="small">
                      <Select
                        defaultValue="days"
                        value={eventState?.recurEveryType}
                        onChange={(e) => setEventRecurEveryType(e.target.value)}
                      >
                        <MenuItem value={"days"}>Days</MenuItem>
                        <MenuItem value={"weeks"}>Weeks</MenuItem>
                        <MenuItem value={"months"}>Months</MenuItem>
                        <MenuItem value={"years"}>Years</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  {eventState?.recurEveryType === "weeks" && (
                    <Box sx={{ display: "flex", mb: 3, alignItems: "center" }}>
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                        (d) => (
                          <Button
                            onClick={(e) => toggleRecurringWeekDay(d)}
                            variant={
                              eventState?.recurWeekly_recurOnWeekDay?.includes(
                                d
                              )
                                ? "contained"
                                : "outlined"
                            }
                            sx={{ minWidth: 0, width: 50, height: 50 }}
                          >
                            {d}
                          </Button>
                        )
                      )}
                    </Box>
                  )}
                  {eventState?.recurEveryType === "months" && (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", mb: 3 }}
                    >
                      <ToggleableContainer
                        currentNum={eventState?.recurMonthly_ConfigNum}
                        num={0}
                        onSet={setEventMonthlyConfigNum}
                        children={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              opacity:
                                eventState.recurMonthly_ConfigNum === 0
                                  ? 1
                                  : 0.4,
                              pointerEvents:
                                eventState.recurMonthly_ConfigNum === 0
                                  ? "all"
                                  : "none",
                            }}
                          >
                            <Typography sx={{ mr: 1 }}>On day</Typography>
                            <TextField
                              sx={{ width: "50px", mr: 1 }}
                              variant="standard"
                              value={eventState?.recurMonthly_recurOnDayNum}
                              onChange={(e) =>
                                setEventMonthlyRecurDayNum(
                                  parseInt(e.target.value)
                                )
                              }
                            />
                          </Box>
                        }
                      />
                      <ToggleableContainer
                        currentNum={eventState?.recurMonthly_ConfigNum}
                        num={1}
                        onSet={setEventMonthlyConfigNum}
                        children={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              opacity:
                                eventState.recurMonthly_ConfigNum === 1
                                  ? 1
                                  : 0.4,
                              pointerEvents:
                                eventState.recurMonthly_ConfigNum === 1
                                  ? "all"
                                  : "none",
                            }}
                          >
                            <Typography sx={{ mr: 1 }}>On the</Typography>
                            <FormControl
                              sx={{ width: "80px", mr: 1 }}
                              size="small"
                            >
                              <Select
                                defaultValue="days"
                                value={eventState?.recurMonthly_recurOnWeekNum}
                                onChange={(e) =>
                                  setEventMonthlyRecurWeekNum(e.target.value)
                                }
                              >
                                <MenuItem value={1}>1st</MenuItem>
                                <MenuItem value={2}>2nd</MenuItem>
                                <MenuItem value={3}>3rd</MenuItem>
                                <MenuItem value={4}>4th</MenuItem>
                                <MenuItem value={5}>5th</MenuItem>
                              </Select>
                            </FormControl>
                            {[
                              "Mon",
                              "Tue",
                              "Wed",
                              "Thu",
                              "Fri",
                              "Sat",
                              "Sun",
                            ].map((d) => (
                              <Button
                                onClick={(e) => setEventMonthlyRecurWeekDay(d)}
                                variant={
                                  eventState?.recurMonthly_recurOnWeekDay === d
                                    ? "contained"
                                    : "outlined"
                                }
                                sx={{ minWidth: 0, width: 50, height: 50 }}
                              >
                                {d}
                              </Button>
                            ))}
                          </Box>
                        }
                      />
                    </Box>
                  )}
                  {eventState?.recurEveryType === "years" && (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", mb: 3 }}
                    >
                      <ToggleableContainer
                        currentNum={eventState?.recurYearly_ConfigNum}
                        num={0}
                        onSet={setEventYearlyConfigNum}
                        children={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              opacity:
                                eventState.recurYearly_ConfigNum === 0
                                  ? 1
                                  : 0.4,
                              pointerEvents:
                                eventState.recurYearly_ConfigNum === 0
                                  ? "all"
                                  : "none",
                            }}
                          >
                            <Typography sx={{ mr: 1 }}>On</Typography>
                            <FormControl
                              sx={{ width: 140, mr: 1 }}
                              size="small"
                            >
                              <Select
                                defaultValue="January"
                                value={eventState?.recurYearly_recurMonth}
                                onChange={(e) =>
                                  setEventYearlyRecurMonth(e.target.value)
                                }
                              >
                                {getAllMonths().map((m, i) => (
                                  <MenuItem value={m} key={i}>
                                    {m}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <TextField
                              sx={{ width: "50px", mr: 1 }}
                              variant="standard"
                              value={eventState?.recurYearly_recurOnDayNum}
                              onChange={(e) =>
                                setEventYearlyRecurDayNum(
                                  handleIntegerInput(e.target.value)
                                )
                              }
                            />
                          </Box>
                        }
                      />
                      <ToggleableContainer
                        currentNum={eventState?.recurYearly_ConfigNum}
                        num={1}
                        onSet={setEventYearlyConfigNum}
                        children={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              opacity:
                                eventState.recurYearly_ConfigNum === 1
                                  ? 1
                                  : 0.4,
                              pointerEvents:
                                eventState.recurYearly_ConfigNum === 1
                                  ? "all"
                                  : "none",
                            }}
                          >
                            <Typography sx={{ mr: 1 }}>On the</Typography>
                            <FormControl
                              sx={{ width: "80px", mr: 1 }}
                              size="small"
                            >
                              <Select
                                defaultValue="days"
                                value={eventState?.recurYearly_recurOnWeekNum}
                                onChange={(e) =>
                                  setEventYearlyRecurWeekNum(e.target.value)
                                }
                              >
                                <MenuItem value={1}>1st</MenuItem>
                                <MenuItem value={2}>2nd</MenuItem>
                                <MenuItem value={3}>3rd</MenuItem>
                                <MenuItem value={4}>4th</MenuItem>
                                <MenuItem value={5}>5th</MenuItem>
                              </Select>
                            </FormControl>
                            {[
                              "Mon",
                              "Tue",
                              "Wed",
                              "Thu",
                              "Fri",
                              "Sat",
                              "Sun",
                            ].map((d) => (
                              <Button
                                onClick={(e) => setEventYearlyRecurWeekDay(d)}
                                variant={
                                  eventState?.recurYearly_recurOnWeekDay === d
                                    ? "contained"
                                    : "outlined"
                                }
                                sx={{ minWidth: 0, width: 50, height: 50 }}
                              >
                                {d}
                              </Button>
                            ))}
                            <Typography sx={{ mr: 1, ml: 1 }}>of</Typography>
                            <FormControl
                              sx={{ width: 140, mr: 1 }}
                              size="small"
                            >
                              <Select
                                defaultValue="January"
                                value={eventState?.recurYearly_recurMonth}
                                onChange={(e) =>
                                  setEventYearlyRecurMonth(e.target.value)
                                }
                              >
                                {getAllMonths().map((m, i) => (
                                  <MenuItem value={m} key={i}>
                                    {m}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                        }
                      />
                    </Box>
                  )}
                  <Typography sx={{ mt: 1 }} color="text.secondary">
                    {getRecurringTextResult()}
                  </Typography>
                </CollapsibleSection>
              )}

              <Box sx={{ display: "flex", mb: 3, mt: 3, alignItems: "center" }}>
                <Typography sx={{ mr: 1 }}>Chip color</Typography>
                <FormatColorFillIcon
                  fontSize="small"
                  sx={{
                    mr: 1,
                  }}
                />
                <MuiColorInput
                  sx={{
                    width: "140px",
                  }}
                  size="small"
                  format="hex"
                  isAlphaHidden
                  value={eventState?.chipColor}
                  onChange={(e) => {
                    setEventChipColor(e);
                  }}
                />
              </Box>

              <FormControl size="small" sx={{ width: "45%", minHeight: 55 }}>
                <InputLabel sx={{ fontSize: 14 }}>
                  Segments whitelist
                </InputLabel>
                <Select
                  size="small"
                  sx={{ borderRadius: "2rem", fontSize: 14 }}
                  value={eventState?.segmentsWhitelist}
                  onChange={(e) => {
                    toggleSegmentsWhitelist(e.target.value);
                  }}
                  multiple
                  input={
                    <OutlinedInput
                      spellCheck={false}
                      id="selectmultiplechip"
                      label="Segments whitelist"
                    />
                  }
                >
                  {segmentsList
                    .filter(
                      (e) =>
                        !e.segmentID.startsWith("flow_") &&
                        !e.segmentID.startsWith("abtest_")
                    )
                    .map((e) => (
                      <MenuItem value={e.segmentID}>{e.segmentName}</MenuItem>
                    ))}
                </Select>
              </FormControl>
              <FormControl
                size="small"
                sx={{ width: "45%", minHeight: 55, mb: 3 }}
              >
                <InputLabel sx={{ fontSize: 14 }}>
                  Segments blacklist
                </InputLabel>
                <Select
                  size="small"
                  sx={{ borderRadius: "2rem", fontSize: 14 }}
                  value={eventState?.segmentsBlacklist}
                  onChange={(e) => {
                    toggleSegmentsBlacklist(e.target.value);
                  }}
                  multiple
                  input={
                    <OutlinedInput
                      spellCheck={false}
                      id="selectmultiplechip"
                      label="Segments blacklist"
                    />
                  }
                >
                  {segmentsList
                    .filter(
                      (e) =>
                        !e.segmentID.startsWith("flow_") &&
                        !e.segmentID.startsWith("abtest_")
                    )
                    .map((e) => (
                      <MenuItem value={e.segmentID}>{e.segmentName}</MenuItem>
                    ))}
                </Select>
              </FormControl>

              <Box sx={{ display: "flex", mb: 3, alignItems: "center" }}>
                <Button
                  variant="contained"
                  sx={{ width: "120px", mr: 2 }}
                  onClick={() => saveEvent()}
                >
                  Save
                </Button>
                <Button variant="text" onClick={() => closeEditor()}>
                  Cancel
                </Button>
                <Button
                  sx={{ ml: "auto" }}
                  variant="outlined"
                  onClick={() => {
                    setRemoveConfirmOpen(true);
                  }}
                >
                  Delete event
                </Button>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                height: "fit-content",
              }}
            >
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  width: "100%",
                  backgroundColor: "var(--upperbar-bg-color)",
                  borderTopLeftRadius: "2rem",
                  borderTopRightRadius: "2rem",
                }}
              >
                <Tabs
                  TabIndicatorProps={{}}
                  value={tabs}
                  onChange={handleTabChange}
                >
                  <Tab
                    label={`entities (${eventState.selectedEntities.length})`}
                  />
                  <Tab label={`offers (${eventState.selectedOffers.length})`} />
                </Tabs>
              </Box>

              <CustomTabPanel value={tabs} index={0}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "var(--navbar-bg-color)",
                    height: "100%",
                    border: "1px solid rgba(97, 95, 244, 0.3)",
                    borderBottomLeftRadius: "2rem",
                    borderBottomRightRadius: "2rem",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      p: 2,
                      borderBottom: "1px solid rgba(97, 95, 244, 0.2)",
                    }}
                  >
                    <Autocomplete
                      id="addEntitySearch"
                      value={undefined}
                      onChange={(e, newValue) => {
                        addSelectedEntity(newValue.nodeID);
                        setTargetEntity(newValue.nodeID);
                      }}
                      options={entitiesNames
                        .filter(
                          (e) =>
                            !eventState?.selectedEntities.includes(e.nodeID)
                        )
                        .map((e) => ({
                          label: e.name,
                          nodeID: e.nodeID,
                        }))}
                      sx={{ width: "100%" }}
                      renderInput={(params) => (
                        <TextField
                          spellCheck={false}
                          {...params}
                          label="Search & add entities"
                          variant="outlined"
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    mr: 1,
                                    color: "text.secondary",
                                  }}
                                >
                                  <SearchIcon fontSize="small" />
                                </Box>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Box>

                  <div
                    className={s.gameEventItemsAndConfig}
                    style={{ display: "flex", height: "calc(100% - 80px)" }}
                  >
                    <div
                      className={s.gameEventItemsListContainer}
                      style={{
                        width: "230px",
                        borderRight: "1px solid rgba(97, 95, 244, 0.2)",
                        padding: "12px",
                        overflow: "auto",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 1.5,
                          fontWeight: 600,
                          color: "text.secondary",
                        }}
                      >
                        Selected Entities
                      </Typography>
                      <div
                        className={s.gameEventItemsList}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {eventState.selectedEntities.map((nodeID) => (
                          <Tooltip
                            placement="left"
                            title={
                              entitiesNames.find((e) => e.nodeID === nodeID)
                                ?.name || "Undefined"
                            }
                            disableInteractive
                            key={nodeID}
                          >
                            <div
                              className={s.gameEventItem}
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              <Button
                                variant={
                                  targetEntity === nodeID
                                    ? "contained"
                                    : "outlined"
                                }
                                onClick={() => setTargetEntity(nodeID)}
                                sx={{
                                  pl: 2,
                                  textTransform: "none",
                                  justifyContent: "flex-start",
                                  width: "100%",
                                  borderRadius: "1rem",
                                  transition: "all 0.2s",
                                  fontSize: "0.875rem",
                                  fontWeight:
                                    targetEntity === nodeID ? 600 : 400,
                                  backgroundColor:
                                    targetEntity === nodeID
                                      ? "primary.main"
                                      : "transparent",
                                  "&:hover": {
                                    backgroundColor:
                                      targetEntity === nodeID
                                        ? "primary.dark"
                                        : "rgba(97, 95, 244, 0.08)",
                                  },
                                }}
                              >
                                {trimStr(
                                  entitiesNames.find((e) => e.nodeID === nodeID)
                                    ?.name || "",
                                  17
                                )}
                              </Button>
                              {targetEntity === nodeID && (
                                <Tooltip
                                  placement="bottom-start"
                                  title={"Remove from event"}
                                  disableInteractive
                                >
                                  <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => removeSelectedEntity(nodeID)}
                                    sx={{
                                      width: "30px",
                                      minWidth: "30px",
                                      ml: 0.5,
                                      color: "error.main",
                                      "&:hover": {
                                        backgroundColor:
                                          "rgba(211, 47, 47, 0.08)",
                                      },
                                    }}
                                  >
                                    <CloseIcon fontSize="small" />
                                  </Button>
                                </Tooltip>
                              )}
                            </div>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    <Box
                      sx={{
                        flex: 1,
                        overflow: "hidden",
                        overflowY: "auto",
                        scrollbarWidth: "thin",
                        scrollbarColor: "var(--scrollbar-color)",
                      }}
                    >
                      {targetEntity &&
                      nodeContents &&
                      nodeContents[targetEntity] ? (
                        <Box sx={{ height: "100%", width: "100%" }}>
                          <RemoteConfig
                            onMainConfigChange={handleChangeMainConfigs}
                            onInheritedConfigChange={
                              handleChangeInheritedConfigs
                            }
                            nodeContent={nodeContents[targetEntity]}
                            dataNodes={nodeData}
                            dataTree={treeData}
                            preventSave={false}
                            disableIDChanging={true}
                            disableFieldRemoval={true}
                            disableCreation={true}
                            defaultCompareSegment={`everyone`}
                            defaultCurrentSegment={`gameevent_${eventState.id}`}
                          />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            height: "100%",
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 4,
                            color: "text.secondary",
                          }}
                        >
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: "50%",
                              backgroundColor: "rgba(97, 95, 244, 0.08)",
                              mb: 2,
                            }}
                          >
                            <SettingsIcon
                              sx={{ fontSize: 48, color: "primary.main" }}
                            />
                          </Box>
                          <Typography
                            color="text.secondary"
                            variant="h5"
                            fontWeight={500}
                            sx={{ mb: 1 }}
                          >
                            Select entity to edit config
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="body2"
                            textAlign="center"
                          >
                            Choose an entity from the list on the left or add a
                            new one using the search bar above
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </div>

                  <Box
                    sx={{
                      padding: 2,
                      borderTop: "1px solid rgba(97, 95, 244, 0.2)",
                      backgroundColor: "rgba(97, 95, 244, 0.03)",
                    }}
                  >
                    <Typography
                      color="text.secondary"
                      fontSize="0.75rem"
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <InfoOutlinedIcon sx={{ fontSize: "0.9rem", mr: 0.5 }} />
                      Changes to entities configurations apply without save and
                      will not revert when "Cancel" is pressed.
                    </Typography>
                  </Box>

                  <Backdrop
                    sx={{
                      position: "absolute",
                      color: "#fff",
                      zIndex: (theme) => theme.zIndex.drawer + 1,
                    }}
                    open={isFetchingConfig}
                  >
                    <CircularProgress color="inherit" />
                  </Backdrop>
                </Box>
              </CustomTabPanel>

              <CustomTabPanel value={tabs} index={1}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "var(--navbar-bg-color)",
                    height: "100%",
                    border: "1px solid rgba(97, 95, 244, 0.3)",
                    borderBottomLeftRadius: "2rem",
                    borderBottomRightRadius: "2rem",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      p: 2,
                      borderBottom: "1px solid rgba(97, 95, 244, 0.2)",
                    }}
                  >
                    <Autocomplete
                      id="addOfferSearch"
                      value={undefined}
                      onChange={(e, newValue) => {
                        addSelectedOffer(newValue.offer);
                        setTargetOffer(newValue.offerID);
                      }}
                      options={offersList
                        .filter(
                          (o) =>
                            !eventState?.selectedOffers.some(
                              (of) => of.offerID === o.offerID
                            )
                        )
                        .map((e) => ({
                          label: e.offerName,
                          offer: e,
                        }))}
                      sx={{ width: "100%" }}
                      renderInput={(params) => (
                        <TextField
                          spellCheck={false}
                          {...params}
                          label="Search & add offers"
                          variant="outlined"
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    mr: 1,
                                    color: "text.secondary",
                                  }}
                                >
                                  <SearchIcon fontSize="small" />
                                </Box>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Box>

                  <div
                    className={s.gameEventItemsAndConfig}
                    style={{ display: "flex", height: "calc(100% - 80px)" }}
                  >
                    <div
                      className={s.gameEventItemsListContainer}
                      style={{
                        width: "230px",
                        borderRight: "1px solid rgba(97, 95, 244, 0.2)",
                        padding: "12px",
                        overflow: "auto",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 1.5,
                          fontWeight: 600,
                          color: "text.secondary",
                        }}
                      >
                        Selected Offers
                      </Typography>
                      <div
                        className={s.gameEventItemsList}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {eventState.selectedOffers.map((offer) => (
                          <Tooltip
                            placement="left"
                            title={
                              offersList.find(
                                (e) => e.offerID === offer.offerID
                              )?.offerName || "Undefined"
                            }
                            disableInteractive
                            key={offer.offerID}
                          >
                            <div
                              className={s.gameEventItem}
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              <Button
                                variant={
                                  targetOffer === offer.offerID
                                    ? "contained"
                                    : "outlined"
                                }
                                onClick={() => setTargetOffer(offer.offerID)}
                                sx={{
                                  pl: 2,
                                  textTransform: "none",
                                  justifyContent: "flex-start",
                                  width: "100%",
                                  borderRadius: "1rem",
                                  transition: "all 0.2s",
                                  fontSize: "0.875rem",
                                  fontWeight:
                                    targetOffer === offer.offerID ? 600 : 400,
                                  backgroundColor:
                                    targetOffer === offer.offerID
                                      ? "primary.main"
                                      : "transparent",
                                  "&:hover": {
                                    backgroundColor:
                                      targetOffer === offer.offerID
                                        ? "primary.dark"
                                        : "rgba(97, 95, 244, 0.08)",
                                  },
                                }}
                              >
                                {trimStr(
                                  offersList.find(
                                    (o) => o.offerID === offer.offerID
                                  )?.offerName || "",
                                  15
                                )}
                              </Button>
                              {targetOffer === offer.offerID && (
                                <Tooltip
                                  placement="bottom-start"
                                  title={"Remove from event"}
                                  disableInteractive
                                >
                                  <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => removeSelectedOffer(offer)}
                                    sx={{
                                      width: "30px",
                                      minWidth: "30px",
                                      ml: 0.5,
                                      color: "error.main",
                                      "&:hover": {
                                        backgroundColor:
                                          "rgba(211, 47, 47, 0.08)",
                                      },
                                    }}
                                  >
                                    <CloseIcon fontSize="small" />
                                  </Button>
                                </Tooltip>
                              )}
                            </div>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    <Box
                      sx={{
                        flex: 1,
                        overflow: "hidden",
                        overflowY: "auto",
                        scrollbarWidth: "thin",
                        scrollbarColor: "var(--scrollbar-color)",
                        padding: 2,
                      }}
                    >
                      {targetOffer ? (
                        <div className={s.offerTargetChange}>
                          <Typography
                            variant="h6"
                            sx={{ mb: 3, fontWeight: 600 }}
                          >
                            {offersList.find((o) => o.offerID === targetOffer)
                              ?.offerName || "Offer Editor"}
                          </Typography>

                          <Paper
                            sx={{
                              p: 2,
                              mb: 3,
                              borderRadius: "2rem",
                              backgroundColor: "var(--regular-card-bg-color)",
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{ mb: 2, fontWeight: 500 }}
                            >
                              Icon
                            </Typography>
                            <div
                              className={`${s.changeBody}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "24px",
                              }}
                            >
                              <div
                                className={s.currentOfferIcon}
                                style={{
                                  padding: "12px",
                                  border: "1px solid rgba(0,0,0,0.12)",
                                  borderRadius: "8px",
                                }}
                              >
                                {getOfferIcon(targetOffer)}
                              </div>

                              <div className={s.changeDivider}>
                                <TrendingFlatSharpIcon
                                  fontSize="large"
                                  color="action"
                                />
                              </div>

                              <div className={s.iconSettings}>
                                <Box
                                  sx={{
                                    width: "180px",
                                    height: "160px",
                                    position: "relative",
                                  }}
                                >
                                  {getChangedOfferIcon(targetOffer) !== "" &&
                                    getChangedOfferIcon(targetOffer) !==
                                      undefined && (
                                      <Tooltip
                                        title="Remove image"
                                        placement="top"
                                      >
                                        <Button
                                          onClick={() => {
                                            setChangedOfferIcon(
                                              targetOffer,
                                              ""
                                            );
                                          }}
                                          color="error"
                                          sx={{
                                            position: "absolute",
                                            top: 0,
                                            right: 0,
                                            zIndex: 2,
                                            minWidth: "30px",
                                            borderRadius: "50%",
                                            p: 0.5,
                                          }}
                                        >
                                          <CloseIcon fontSize="small" />
                                        </Button>
                                      </Tooltip>
                                    )}

                                  <Button
                                    component="label"
                                    variant="outlined"
                                    startIcon={
                                      getChangedOfferIcon(targetOffer) ? (
                                        <CloudUploadIcon />
                                      ) : null
                                    }
                                    tabIndex={-1}
                                    sx={{
                                      "&": getChangedOfferIcon(targetOffer) && {
                                        p: 0,
                                        alignItems: "center",
                                        justifyContent: "center",
                                      },
                                      "& .MuiButton-startIcon":
                                        getChangedOfferIcon(targetOffer) && {
                                          display: "none",
                                        },
                                      borderRadius: "8px",
                                      height: "100%",
                                      width: "100%",
                                      fontSize: 14,
                                      whiteSpace: "pre-wrap",
                                      textTransform: "none",
                                      overflow: "hidden",
                                      border:
                                        "1px dashed rgba(97, 95, 244, 0.4)",
                                      "&:hover": {
                                        border:
                                          "1px dashed rgba(97, 95, 244, 0.8)",
                                      },
                                    }}
                                  >
                                    {getChangedOfferIcon(targetOffer) !== "" &&
                                    getChangedOfferIcon(targetOffer) !==
                                      undefined ? (
                                      <div className={s.offerIconContainer}>
                                        <div
                                          className={s.offerIconOverlay}
                                        ></div>
                                        <img
                                          src={`${getChangedOfferIcon(targetOffer)}`}
                                          className={s.offerIcon}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "contain",
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className={s.currentOfferIcon}>
                                        {getOfferIcon(targetOffer)}
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
                          </Paper>

                          <Paper
                            sx={{
                              p: 2,
                              mb: 3,
                              borderRadius: "2rem",
                              backgroundColor: "var(--regular-card-bg-color)",
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{ mb: 2, fontWeight: 500 }}
                            >
                              Price
                            </Typography>
                            <div
                              className={`${s.changeBody}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "24px",
                              }}
                            >
                              <div className={s.changeItem} style={{ flex: 1 }}>
                                <Box
                                  sx={{
                                    border: "1px solid rgba(0,0,0,0.12)",
                                    borderRadius: "8px",
                                    p: 1.5,
                                  }}
                                >
                                  <SetPrice
                                    gameModelFunctions={gameModelFunctions}
                                    onPriceChanged={(priceObj) =>
                                      setChangedOfferPriceObject(
                                        targetOffer,
                                        priceObj
                                      )
                                    }
                                    entities={entities}
                                    disabledWidget
                                    offerStatePrice={getOfferPriceObject(
                                      targetOffer
                                    )}
                                    defaultBorders={true}
                                    pricing={pricing}
                                    exchangeRates_USD={exchangeRates_USD}
                                    exchangeRates={exchangeRates}
                                  />
                                </Box>
                              </div>

                              <div className={s.changeDivider}>
                                <TrendingFlatSharpIcon
                                  fontSize="large"
                                  color="action"
                                />
                              </div>

                              <div className={s.price} style={{ flex: 1 }}>
                                {getChangedOfferPriceObject(targetOffer) && (
                                  <Box
                                    sx={{
                                      border:
                                        "1px solid rgba(97, 95, 244, 0.4)",
                                      borderRadius: "8px",
                                      p: 1.5,
                                    }}
                                  >
                                    <SetPrice
                                      onPriceChanged={(priceObj) =>
                                        setChangedOfferPriceObject(
                                          targetOffer,
                                          priceObj
                                        )
                                      }
                                      entities={entities}
                                      pricing={pricing}
                                      onClose={() => {}}
                                      offerStatePrice={
                                        getChangedOfferPriceObject(targetOffer)
                                          .targetCurrency == "money"
                                          ? {
                                              targetCurrency:
                                                getChangedOfferPriceObject(
                                                  targetOffer
                                                ).targetCurrency,
                                              pricingTemplateAsku:
                                                getChangedOfferPriceObject(
                                                  targetOffer
                                                ).pricingTemplateAsku,
                                            }
                                          : {
                                              targetCurrency:
                                                getChangedOfferPriceObject(
                                                  targetOffer
                                                ).targetCurrency,
                                              nodeID:
                                                getChangedOfferPriceObject(
                                                  targetOffer
                                                ).nodeID,
                                              amount:
                                                getChangedOfferPriceObject(
                                                  targetOffer
                                                ).amount,
                                            }
                                      }
                                      defaultBorders={true}
                                      exchangeRates={exchangeRates}
                                      exchangeRates_USD={exchangeRates_USD}
                                    />
                                  </Box>
                                )}
                              </div>
                            </div>
                          </Paper>

                          <Paper
                            sx={{
                              p: 2,
                              mb: 2,
                              borderRadius: "2rem",
                              backgroundColor: "var(--regular-card-bg-color)",
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{ mb: 2, fontWeight: 500 }}
                            >
                              Content
                            </Typography>
                            <div
                              className={`${s.changeBody}`}
                              style={{ display: "flex", gap: "24px" }}
                            >
                              <div
                                className={s.contentBody}
                                style={{ flex: 1 }}
                              >
                                {getOfferEntityContent(targetOffer).map(
                                  (entity) => (
                                    <EntityItem
                                      key={entity.nodeID}
                                      entity={{
                                        ...entities.find(
                                          (e) => e.nodeID === entity.nodeID
                                        ),
                                        amount: entity.amount,
                                      }}
                                      disabledWidget={true}
                                    />
                                  )
                                )}
                              </div>

                              <div
                                className={s.changeDivider}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <TrendingFlatSharpIcon
                                  fontSize="large"
                                  color="action"
                                />
                              </div>

                              <div
                                className={s.contentBody}
                                style={{ flex: 1 }}
                              >
                                {getChangedOfferContent(targetOffer)
                                  ? getChangedOfferContent(targetOffer).map(
                                      (entity) => (
                                        <EntityItem
                                          key={entity.nodeID}
                                          entity={{
                                            ...entities.find(
                                              (e) => e.nodeID === entity.nodeID
                                            ),
                                            amount: entity.amount,
                                          }}
                                          onRemove={(id) =>
                                            removeEntityFromChangedOfferContent(
                                              targetOffer,
                                              id
                                            )
                                          }
                                          onAmountChanged={(e, a) =>
                                            setEntityAmountToChangedOfferContent(
                                              targetOffer,
                                              e,
                                              a
                                            )
                                          }
                                        />
                                      )
                                    )
                                  : getOfferEntityContent(targetOffer).map(
                                      (entity) => (
                                        <EntityItem
                                          key={entity.nodeID}
                                          entity={{
                                            ...entities.find(
                                              (e) => e.nodeID === entity.nodeID
                                            ),
                                            amount: entity.amount,
                                          }}
                                          onRemove={(id) =>
                                            removeEntityFromChangedOfferContent(
                                              targetOffer,
                                              id
                                            )
                                          }
                                          onAmountChanged={(e, a) =>
                                            setEntityAmountToChangedOfferContent(
                                              targetOffer,
                                              e,
                                              a
                                            )
                                          }
                                        />
                                      )
                                    )}

                                <Box sx={{ mt: 0 }}>
                                  <AddEntity
                                    onEntityAdded={(e, a) =>
                                      addEntityToChangedOfferContent(
                                        targetOffer,
                                        e,
                                        a
                                      )
                                    }
                                    onAmountChanged={(e, a) =>
                                      setEntityAmountToChangedOfferContent(
                                        targetOffer,
                                        e,
                                        a
                                      )
                                    }
                                    entities={entities}
                                    offerStateContent={
                                      !getChangedOfferContent(targetOffer)
                                        ? []
                                        : getChangedOfferContent(targetOffer)
                                    }
                                  />
                                </Box>
                              </div>
                            </div>
                          </Paper>
                        </div>
                      ) : (
                        <Box
                          sx={{
                            height: "100%",
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 4,
                            color: "text.secondary",
                          }}
                        >
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: "50%",
                              backgroundColor: "rgba(97, 95, 244, 0.08)",
                              mb: 2,
                            }}
                          >
                            <EditIcon
                              sx={{ fontSize: 48, color: "primary.main" }}
                            />
                          </Box>
                          <Typography
                            color="text.secondary"
                            variant="h5"
                            fontWeight={500}
                            sx={{ mb: 1 }}
                          >
                            Select an offer to edit
                          </Typography>
                          <Typography
                            color="text.secondary"
                            variant="body2"
                            textAlign="center"
                          >
                            Choose an offer from the list on the left or add a
                            new one using the search bar above
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </div>
                </Box>
              </CustomTabPanel>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  mt: 2,
                }}
              >
                <Typography sx={{ mb: 1 }}>Note</Typography>
                <textarea
                  name="comment"
                  className={`${s.commentTextArea}`}
                  onChange={(e) => setEventComment(e.target.value)}
                  value={eventState.comment}
                ></textarea>
              </Box>
            </Box>
          </Box>
        </Box>
      </Modal>
      <Modal
        open={removeConfirmOpen}
        onClose={() => {
          setRemoveConfirmOpen(false);
        }}
      >
        <Box sx={confirmStyle}>
          <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
            Remove event "{eventState.name}"
          </Typography>
          <Typography sx={{ mb: 3 }}>
            Are you sure you want to delete this event? <br />
            This action cannot be undone.
          </Typography>
          <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
            <Button sx={{ color: "error.light" }} onClick={finalRemoveAccept}>
              Delete
            </Button>
            <Button
              variant="contained"
              sx={{ ml: "auto" }}
              onClick={() => {
                setRemoveConfirmOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </Box>
      </Modal>
    </>
  );
}

function RecurringCheckbox({ initialState = false, onCheck }) {
  const [checked, setChecked] = useState(initialState);
  return (
    <Checkbox
      checked={checked}
      onClick={(e) => {
        onCheck(!checked);
        setChecked(!checked);
      }}
    />
  );
}

function handleIntegerInput(value) {
  if (value === undefined) return;
  let currentInputValue = value;
  let sanitizedValue = currentInputValue.replace(/[^0-9]/g, "");
  if (sanitizedValue.length > 1 && sanitizedValue[0] === "0") {
    return 0;
  }
  return sanitizedValue;
}
function getAllMonths() {
  return [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
}
function trimStr(str, maxLength) {
  if (str === undefined || str === "") return "";
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
}
function ToggleableContainer({ currentNum, num, children, onSet }) {
  const [checked, setChecked] = useState(currentNum === num);
  useEffect(() => {
    setChecked(currentNum === num);
  }, [currentNum]);
  return (
    <Box sx={{ display: "flex", mb: 3, alignItems: "center" }}>
      <Checkbox
        checked={checked}
        onClick={(e) => {
          onSet(num);
        }}
      />
      {children}
    </Box>
  );
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
export default EventEditor;
