import React, { useState, useEffect, useRef } from "react";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

import reservedEvents, {
  sessionEndEvent,
  sessionStartEvent,
  offerShownEvent,
  offerEvent,
  adEvent,
  designEvent,
  economyEvent,
  reportEvent,
  crashEvent,
  uiEvent,
} from "../tree/ReservedEventsList";

const SelectEvent = ({
  onEventAdded,
  onClose,
  open,
  events,
  anchorPos,

  designEvents,
}) => {
  function getEventsToAdd() {
    let eventsToAdd = events
      .map((event) => {
        let eventObj = reservedEvents.find((e) => e.id === event);
        let name = undefined;
        if (eventObj) {
          name = eventObj.name;
        }
        if (name === undefined) {
          name =
            designEvents.find((e) => e.id === event)?.name || "Unknown event";
        }
        return {
          label: `${name}`,
          id: event,
          filters: [],
        };
      })
      .filter((event) => {
        // Filter events we don't want to be available to add in funnel here
        if (event.id === "newSession") {
          return false;
        } else {
          return true;
        }
      });
    return eventsToAdd;
  }

  return (
    <div>
      <Popover
        open={open}
        anchorReference="anchorPosition"
        onClose={(event) => {
          onClose();
        }}
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
              p: 2,
              overflow: "visible",
            },
          },
        }}
      >
        {events && events.length > 0 ? (
          <div>
            <Autocomplete
              disablePortal
              disabled={getEventsToAdd().length === 0}
              id="addEventSearch"
              onChange={(event, newValue) => {
                onEventAdded(newValue.id);
                onClose();
              }}
              options={getEventsToAdd()}
              sx={{ width: 300 }}
              renderInput={(params) => (
                <TextField
                  spellCheck={false}
                  {...params}
                  label="Search events"
                />
              )}
            />
          </div>
        ) : (
          <div>
            <div>
              <p>No events found</p>
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
};

export default SelectEvent;
