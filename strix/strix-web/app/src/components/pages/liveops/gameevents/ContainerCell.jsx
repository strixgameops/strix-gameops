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

import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import MuiTab from "@mui/material/Tab";
import Collapse from "@mui/material/Collapse";
import { styled } from "@mui/material/styles";

import useApi from "@strix/api";

import Autocomplete from "@mui/material/Autocomplete";
import RemoteConfig from "../../planning/node/RemoteConfig/RemoteConfig.jsx";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import OfferIconPlaceholder from "shared/icons/OfferIconPlaceholder.jsx";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";
import TrendingFlatSharpIcon from "@mui/icons-material/TrendingFlatSharp";

import AddEntity from "../../liveops/offers/addComponents/AddEntity";
import EntityItem from "../../liveops/offers/EntityItem";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";

import EventEditor from "./EventsEditor.jsx";
import NotesEditor from "./NotesEditor.jsx";
import { trimStr, getEmptyEventTemplate, clamp } from "./sharedFunctions.jsx";

export default function ContainerCell({
  className,
  children,
  onClick,
  durationsFillers = [],
  currentTimeFiller,
  isPreviousDay,
}) {
  const [fillers, setFillers] = useState(null);
  useEffect(() => {
    setFillers(
      durationsFillers.map((dur, index) => {
        const fillStyle = {
          position: "absolute",
          bottom: `${10 + index * 5}px`,
          left: `${dur.start}%`,
          width: `${dur.end - dur.start}%`,
          height: "5px",
          backgroundColor: chroma(dur.color).alpha(1),
        };
        return <div style={fillStyle} className={s.dateItemFiller}></div>;
      })
    );
  }, [durationsFillers]);
  function getCaret() {
    const caretFillStyle = {
      position: "absolute",
      bottom: `0px`,
      left: `${currentTimeFiller.end}%`,
      width: `1px`,
      height: "100%",
      transformOrigin: "100% 0%",
    };
    return <div style={caretFillStyle} className={s.dateItemCaret}></div>;
  }
  function getCaretFiller() {
    const caretFillStyle = {
      position: "absolute",
      bottom: `0px`,
      left: `0%`,
      width: `${!isPreviousDay ? currentTimeFiller.end : 100}%`,
      height: "100%",
    };
    return <div style={caretFillStyle} className={s.dateItemCaretFill}></div>;
  }
  return (
    <td
      className={`${className} ${currentTimeFiller ? s.currentDayBorder : ""}`}
      onClick={onClick}
    >
      {currentTimeFiller ? getCaret() : null}
      {currentTimeFiller ? getCaretFiller() : null}
      {isPreviousDay ? getCaretFiller() : null}
      {fillers}
      {children}
    </td>
  );
};