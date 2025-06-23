import React from "react";
import DatasetConfigurator from "./DatasetConfigurator";
import CategorySelector from "./CategorySelector";
import DimensionSelector from "./ViewtypeSelector";
import { Typography, IconButton, Tooltip } from "@mui/material";
import s from "./chartBuilder.module.css";
function EventConfig({
  chartObj,
  events,
  allAnalyticsEvents,
  onCategorySelected,
  onDimensionSelected,
  onEventChange,
  selectedEvent,
}) {
  function getSecondaryCategoryOptions() {
    if (events.length > 0) {
      const targetEvent = allAnalyticsEvents.find(
        (e) => e.eventID === events[0].queryAnalyticEventID
      );
      if (targetEvent && targetEvent.values.length > 0) {
        return targetEvent.values.map((v) => {
          return {
            id: v.uniqueID,
            name: v.valueName,
          };
        });
      }
    }
    return [];
  }
  return (
    <div className={s.categorySelector}>
      <Typography
        variant={"h4"}
        color={"text.secondary"}
        sx={{
          p: 0.5,
          pl: 1.5,
          mb: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
          fontSize: "16px",
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        Configuration{" "}
        {selectedEvent > -1 ? `- ${events[selectedEvent].eventName}` : ``}
      </Typography>

      {selectedEvent > -1 ? (
        <>
          <CategorySelector
            onCategorySelected={(cat) => onCategorySelected(selectedEvent, cat)}
            selectedCategory={events.find((e, i) => i === selectedEvent).categoryField}
            secondaryCategoryOptions={getSecondaryCategoryOptions()}
            events={events.filter((e, i) => i === selectedEvent)}
          />

          <DimensionSelector
            onDimensionSelected={(dim) =>
              onDimensionSelected(selectedEvent, dim)
            }
            selectedDimension={events.find((e, i) => i === selectedEvent).dimension}
          />

          <DatasetConfigurator
            allAnalyticsEvents={allAnalyticsEvents}
            onEventConfigChange={(event) => onEventChange(selectedEvent, event)}
            events={events.filter((e, i) => i === selectedEvent)}
          />
        </>
      ) : (
        <Typography
          variant={"subtitle1"}
          color={"text.grey"}
          sx={{
            userSelect: "none",
            width: "100%",
            fontSize: "24px",
            fontWeight: "regular",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          No selected event
        </Typography>
      )}
    </div>
  );
}

export default EventConfig;
