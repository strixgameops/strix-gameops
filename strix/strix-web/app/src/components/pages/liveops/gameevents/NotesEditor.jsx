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
import RemoteConfig from "../../planning/node/RemoteConfig/RemoteConfig";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import OfferIconPlaceholder from "shared/icons/OfferIconPlaceholder.jsx";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";
import TrendingFlatSharpIcon from "@mui/icons-material/TrendingFlatSharp";

import AddEntity from "../../liveops/offers/addComponents/AddEntity";
import EntityItem from "../../liveops/offers/EntityItem";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";

function NotesEditor({ notes, open, onClose, onNotesSaved, day }) {
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "50%",
    height: "fit-content",
    maxHeight: "90%",
    bgcolor: "var(--bg-color3)",
    border: "1px solid #625FF440",
    boxShadow: `0px 0px 5px 2px rgba(98, 95, 244, 0.2)`,

    overflow: "hidden",
    borderRadius: "2rem",
    display: "flex",
    flexDirection: "column",
  };

  const [notesState, setNotesState] = useState(notes ? notes : []);
  useEffect(() => {
    setNotesState(notes ? notes : []);
  }, [notes]);

  function changeNote(noteID, newText) {
    setNotesState((prev) => {
      return prev.map((n) => {
        if (n.id === noteID) {
          return { ...n, note: newText };
        } else {
          return n;
        }
      });
    });
  }
  function removeNote(noteID) {
    setNotesState(notesState.filter((n) => n.id !== noteID));
  }
  function addNote() {
    const n = {
      id: nanoid(),
      date: day ? dayjs.utc(day).format() : dayjs.utc().format(),
      note: "My text",
    };
    setNotesState([...notesState, n]);
  }

  function save() {
    onNotesSaved(notesState);
    onClose();
  }

  function dayFilter(n) {
    if (day) {
      return dayjs.utc(n.date).isSame(dayjs.utc(day), "day");
    } else {
      return true;
    }
  }

  function sortNotesByDays(notes) {
    return notes.sort((a, b) => {
      const dateA = dayjs.utc(a.date);
      const dateB = dayjs.utc(b.date);
      return dateA.isBefore(dateB) ? -1 : 1;
    });
  }
  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          onClose();
        }}
      >
        <Box sx={style}>
          <Box
            sx={{
              overflowY: "auto",
              overflowX: "hidden",
              scrollbarWidth: "thin",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                p: 4,
                pr: 0.3,
              }}
            >
              <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
                Notes{" "}
                {day ? `for ${dayjs.utc(day).format("MMMM DD YYYY")}` : ""}
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", mb: 2 }}>
                {sortNotesByDays(notesState.filter((n) => dayFilter(n))).map(
                  (n) => (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        mt: 2,
                        width: "100%",
                      }}
                    >
                      {day === null && (
                        <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                          {dayjs.utc(n.date).format("MMMM DD YYYY")}
                        </Typography>
                      )}
                      <Box
                        sx={{
                          display: "flex",
                          // flexDirection: "column",
                          width: "100%",
                        }}
                      >
                        <textarea
                          name="note"
                          className={`${s.noteTextArea}`}
                          onChange={(e) => changeNote(n.id, e.target.value)}
                          value={n.note}
                        ></textarea>
                        <Tooltip
                          title="Delete note"
                          disableInteractive
                          placement="right"
                        >
                          <Button
                            onClick={() => removeNote(n.id)}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <DeleteSharpIcon />
                          </Button>
                        </Tooltip>
                      </Box>
                    </Box>
                  )
                )}
              </Box>

              <Button
                onClick={addNote}
                sx={{
                  display: "flex",
                  maxWidth: 300,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                + Add new note
              </Button>

              <Button
                onClick={save}
                variant="contained"
                sx={{
                  mt: 3,

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Save and exit
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    </>
  );
}
export default NotesEditor;
