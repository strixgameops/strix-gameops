import React, { useState, useEffect, useRef } from "react";
import s from "./chartBuilder.module.css";
import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import Collapse from "@mui/material/Collapse";

import { ExpandMore, ExpandLess } from "@mui/icons-material";

import ModalEventSearcher from "./eventSelectorSearch/ModalEventSearcher";
import EventSelectorChild from "./EventSelectorChild";

import { useGame, useBranch } from "@strix/gameContext";
import chroma from "chroma-js";
import shortid from "shortid";
import { DragDropContext } from "react-beautiful-dnd";
import { Droppable } from "react-beautiful-dnd";
import { Draggable } from "react-beautiful-dnd";
import { useThemeContext } from "@strix/themeContext";

const EventSelector = ({
  onEventsArrayChange,
  allAnalyticsEvents,
  events,
  allOffersNames,
  allCurrenciesNames,

  onEventSelected,
  selectedEvent,
}) => {
  const { game } = useGame();
  const { branch, environment } = useBranch();

  // Modal
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setEventToEdit();
  };

  const testEvents = [
    {
      queryMethod: "mostCommon",
      queryConditions: [],
      queryAnalyticEventID: "6616cb41cdceef241b8d3bef",
      queryEventTargetValueId: "661796f040fbc52be193240a",
      datasetConfig: {
        config: {
          type: "line",
          yAxisID: "y",
          label: "Some legend",
          stack: "",
          fill: false,
          borderColor: chroma(makeRandomColor(1)).hex(),
          borderWidth: 2,
          backgroundColor: chroma(makeRandomColor(1)).alpha(0.3).hex(),
        },
        valueField: "value",
      },
    },
    {
      queryMethod: "numberOfEvents",
      queryConditions: [],
      queryAnalyticEventID: "6616cb41cdceef241b8d3bef",
      axisID: "y",
      queryEventTargetValueId: "661796f040fbc52be193240b",
      datasetConfig: {
        config: {
          type: "line",
          yAxisID: "y",
          stack: "",
          fill: false,
          label: "Some legend",
          borderColor: chroma(makeRandomColor(2)).hex(),
          borderWidth: 2,
          backgroundColor: chroma(makeRandomColor(2)).alpha(0.3).hex(),
        },
        valueField: "value",
      },
    },
  ];
  // const [events, setEvents] = useState([])
  const [eventToEdit, setEventToEdit] = useState();

  function makeRandomColor(number) {
    const hue = number * 137.508; // use golden angle approximation
    return `hsl(${hue},100%,30%)`;
  }
  const { theme } = useThemeContext();

  function darkenColor(color) {
    if (!color) return color;
    return theme === "light" ? chroma(color).darken(1.5).hex() : color;
  }
  function onEventAdded(event) {
    console.log("Event added", event, allAnalyticsEvents);

    let labelData = `Value ${events.length + 1}`;
    if (allAnalyticsEvents.length > 0) {
      labelData = allAnalyticsEvents
        .find((e) => e.eventID === event.queryAnalyticEventID)
        ?.values?.find((v) => v.uniqueID === event.queryEventTargetValueId);
      labelData = labelData?.valueName;
    }

    let tempEvent = event;
    tempEvent = {
      metricUID: shortid.generate(),
      ...event,
      hidden: false,
      datasetConfig: {
        config: {
          type: "line",
          yAxisID: "y",
          stack: events.length + 1,
          label: `${labelData}`,
          fill: false,
          borderColor: darkenColor(
            chroma(makeRandomColor(events.length + 1)).hex()
          ),
          backgroundColor: darkenColor(
            chroma(makeRandomColor(events.length + 1))
              .alpha(0.3)
              .hex()
          ),
        },
        valueField: "value",
      },
      dimension: "absolute",
      categoryData: [],
      categoryField: "timestamp",
    };
    onEventsArrayChange([...events, tempEvent]);
    handleClose();
  }
  function onEventRemoved(event, index) {
    onEventsArrayChange((prevEvents) => {
      return prevEvents.filter((e, i) => i !== index);
    });
  }
  function onEventChanged(event, index) {
    let updArray = [...events];
    updArray[index] = {
      ...updArray[index],
      ...event
    };

    let labelData = `Value ${events.length + 1}`;
    if (allAnalyticsEvents.length > 0) {
      labelData = allAnalyticsEvents
        .find((e) => e.eventID === event.queryAnalyticEventID)
        ?.values?.find((v) => v.uniqueID === event.queryEventTargetValueId);
      labelData = labelData?.valueName;
    }
    updArray[index].datasetConfig.config.label = labelData;

    onEventsArrayChange(updArray);
    handleClose();
  }
  function openEventEditor(event, index) {
    setEventToEdit({ target: event, index: index });
    handleOpen();
  }

  function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    // Checking if stuff is ok to be moved and the guy didnt canceled drop or did it outside the container
    if (!destination) {
      return;
    }
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    // Changing positions of dragged segments
    if (destination.index !== events.length - 1) {
      onEventsArrayChange(
        moveArrayElement(events, source.index, destination.index)
      );

      // let updatedValues = selectedConfigParam.values;
      // updatedValues = moveArrayElement(updatedValues, source.index, destination.index)
    }
  }
  function moveArrayElement(array, source, destination) {
    const newArray = [...array];
    const [element] = newArray.splice(source, 1);
    newArray.splice(destination, 0, element);
    return newArray;
  }
  function sortByOrder(orderArray, targetArray) {
    const orderMap = new Map(orderArray.map((id, index) => [id, index]));

    return [...targetArray].sort((a, b) => {
      const orderA = orderMap.get(a.segmentID);
      const orderB = orderMap.get(b.segmentID);

      return orderA - orderB;
    });
  }

  return (
    <div className={s.eventSelector}>
      <Typography
        variant={"h4"}
        color={"text.secondary"}
        sx={{
          p: 1.5,
          pt: 2,
          pl: 3.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
          fontSize: "16px",
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        Events
      </Typography>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId={"eventlist"}>
          {(provided) => (
            <div
              className={s.eventsList}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {events.map((event, index) => (
                <Draggable
                  key={index}
                  draggableId={index.toString()}
                  index={index}
                >
                  {(provided) => (
                    <EventSelectorChild
                      provided={provided}
                      innerRef={provided.innerRef}
                      key={index}
                      event={event}
                      index={index}
                      openEventEditor={() => openEventEditor(event, index)}
                      onEventRemoved={onEventRemoved}
                      allAnalyticsEvents={allAnalyticsEvents}
                      onEventSelected={onEventSelected}
                      selectedEvent={selectedEvent}
                    />
                  )}
                </Draggable>
              ))}

              {provided.placeholder}

              <Button
                onClick={handleOpen}
                variant="text"
                sx={{ width: "130px", height: "35px", textTransform: "none" }}
              >
                + Add event
              </Button>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <ModalEventSearcher
        open={open}
        close={handleClose}
        onApply={onEventAdded}
        changeEvent={onEventChanged}
        allAnalyticsEvents={allAnalyticsEvents}
        eventToEdit={eventToEdit}
        allOffersNames={allOffersNames}
        allCurrenciesNames={allCurrenciesNames}
      />
    </div>
  );
};

export default EventSelector;
