import React from "react";
import { Box } from "@mui/material";
import OfferIconPlaceholder from "shared/icons/OfferIconPlaceholder";

export const trimStr = (str, maxLength) => {
  if (!str) return "";
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
};

export const getChangedItemIcon = (subjects, entities, offers) => {
  if (!subjects || subjects.length === 0) {
    return (
      <div style={{ width: "100%", height: "100%", padding: "2px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          set target change
        </Box>
      </div>
    );
  }

  const icons = subjects.map((subject, index) => {
    switch (subject.type) {
      case "entity":
        const entity = entities.find((e) => e.nodeID === subject.itemID);
        const entityIcon = entity?.entityBasic?.entityIcon;

        return (
          <div
            key={index}
            style={{ width: "100%", height: "100%", padding: "2px" }}
          >
            {entityIcon ? (
              <img
                src={entityIcon}
                alt="entity icon"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <EntityPlaceholderIcon
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            )}
          </div>
        );

      case "offer":
        const offer = offers.find((o) => o.offerID === subject.itemID);
        const offerIcon = offer?.offerIcon;

        return (
          <div
            key={index}
            style={{ width: "100%", height: "100%", padding: "2px" }}
          >
            {offerIcon ? (
              <img
                src={offerIcon}
                alt="offer icon"
                style={{
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          display: "block",
        }}
              />
            ) : (
              <OfferIconPlaceholder style={{ width: "100%", height: "100%" }} />
            )}
          </div>
        );

      default:
        return (
          <Box
            key={index}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            set target change
          </Box>
        );
    }
  });

  const gridSize = Math.ceil(Math.sqrt(icons.length));

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: subjects.length > 1 ? "grid" : "block",
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        gap: 0,
      }}
    >
      {icons}
    </Box>
  );
};

function EntityPlaceholderIcon({ style }) {
  return (
    <svg
      width="100"
      style={style}
      height="100"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask id="path-1-inside-1_102_201" fill="white">
        <rect width="120" height="120" rx="10" />
      </mask>
      <rect
        width="120"
        height="120"
        rx="10"
        fill="#1F4A60"
        stroke="#10738D"
        stroke-width="12"
        mask="url(#path-1-inside-1_102_201)"
      />
    </svg>
  );
}
