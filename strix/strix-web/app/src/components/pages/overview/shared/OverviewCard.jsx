import React, { memo, useState, useCallback, useMemo } from "react";
import {
  Button,
  IconButton,
  Popover,
  Stack,
  Typography,
  Skeleton,
} from "@mui/material";
import { Settings as SettingsIcon, Add as AddIcon } from "@mui/icons-material";
import { useGame } from "@strix/gameContext";
import ChartWidget from "./ChartWidget";
import styles from "../css/gameCards.module.css";

const OverviewCard = memo(
  ({
    type = "game", // 'game', 'studio', 'create', 'skeleton'
    item,
    index,
    mode,
    isSelected,
    onSelect,
    onOpen,
    onSettings,
    onRemove,
    analyticsData,
    onChartRendered,
    isAuthority,
  }) => {
    const [isSettingsHovered, setIsSettingsHovered] = useState(false);

    const chartConfigs = useMemo(() => {
      if (type !== "game" && type !== "studio") return [];

      const baseId = item?.[type === "game" ? "gameID" : "studioID"];
      return [
        {
          chartID: `${baseId}_1`,
          name: type === "game" ? "WAU" : "MAU",
          metricName: "dau",
          format: "",
          formatPosition: "start",
          chartType: "sparkline",
          showDelta: true,
        },
        {
          chartID: `${baseId}_2`,
          name: "Gross",
          metricName: "revenue",
          format: "$",
          formatPosition: "start",
          chartType: "sparkline",
          showDelta: true,
        },
      ];
    }, [type, item]);

    const handleCardClick = useCallback(() => {
      if (isSettingsHovered || type === "create" || type === "skeleton") return;

      if (onSelect) {
        onSelect(index, item);
      }
    }, [isSettingsHovered, type, onSelect, index, item]);

    const handleOpenSettings = useCallback(() => {
      if (onSettings) {
        onSettings(item[type === "game" ? "gameID" : "studioID"]);
      }
    }, [onSettings, item, type]);

    const handleOpenClick = useCallback(
      (event) => {
        event.stopPropagation();
        if (onOpen) {
          if (type === "create") {
            switch (mode) {
              case "studio":
                onOpen("studioID");
                break;
              case "game":
                onOpen("gameID");
                break;
            }
          } else {
            onOpen(item[type === "game" ? "gameID" : "studioID"]);
          }
        }
      },
      [onOpen, item, type]
    );

    const isPendingRemoval = useMemo(() => {
      if (!item?.scheduledDeletionDate) return false;
      return new Date(item.scheduledDeletionDate) > new Date();
    }, [item?.scheduledDeletionDate]);

    const cardBackground = useMemo(() => {
      if (!item) return {};
      const iconUrl = item[type === "game" ? "gameIcon" : "studioIcon"];
      return iconUrl
        ? {
            background: `url(${iconUrl}) no-repeat center center`,
            backgroundSize: "cover",
          }
        : {};
    }, [item, type]);

    const selectedClass = isSelected
      ? styles.cardSelected
      : styles.cardUnselected;

    if (type === "skeleton") {
      return (
        <div
          className={`${styles.overviewCard} ${selectedClass}`}
          style={{ marginLeft: 15 }}
        >
          <div className={styles.overviewCardContent}>
            <div
              className={styles.cardIconContainer}
              style={{ width: "100%", height: "100%" }}
            >
              <Skeleton
                animation="wave"
                sx={{ height: "100%", pb: 5, width: "100%" }}
                variant="rectangular"
              />
            </div>
          </div>
          <div className={styles.cardAnalytics}>
            <Skeleton
              animation="wave"
              sx={{ height: "25px", width: "89%", mb: 1 }}
              variant="rectangular"
            />
            <Skeleton
              animation="wave"
              sx={{ height: "25px", width: "89%", mb: 1 }}
              variant="rectangular"
            />
          </div>
        </div>
      );
    }

    if (type === "create") {
      return (
        <div className={`${styles.overviewCard} ${styles.createCard}`}>
          <div className={styles.createCardInner}>
            <Button
              onClick={handleOpenClick}
              sx={{
                backgroundColor: "none",
                borderRadius: "2rem",
                height: "100%",
                textTransform: "none",
                fontWeight: 400,
              }}
              fullWidth
            >
              <AddIcon sx={{ fontSize: 80, opacity: 0.4 }} />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Button
        sx={{
          backgroundColor: "none",
          borderRadius: "2rem",
          "&:hover": {
            backgroundColor: "#4e4bda30",
          },
          "&& .MuiTouchRipple-child": {
            backgroundColor: "white",
          },
          padding: "0px",
          margin: "10px",
          height: "fit-content",
          textTransform: "none",
          fontSize: "22px",
          color: "#e7e7e7",
          fontFamily: "Arial,Arial,sans-serif",
          fontWeight: 400,
        }}
        onClick={(e) => e.preventDefault()}
      >
        <div
          className={`${styles.overviewCard} ${selectedClass}`}
          style={cardBackground}
          onClick={handleCardClick}
        >
          {isPendingRemoval && (
            <div className={styles.cardOverlayNotify}>
              <Typography
                sx={{
                  width: "100%",
                  textAlign: "center",
                  fontWeight: "semibold",
                  pl: 3,
                }}
              >
                PENDING REMOVAL
              </Typography>
            </div>
          )}

          <div className={styles.overviewCardSettings}>
            <div
              className={styles.cardSettingsButton}
              onClick={handleOpenSettings}
              onMouseEnter={() => setIsSettingsHovered(true)}
              onMouseLeave={() => setIsSettingsHovered(false)}
            >
              <IconButton
                sx={{
                  borderRadius: "2rem",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  "&:hover": { backgroundColor: "rgba(0,0,0,0.5)" },
                }}
                size="medium"
              >
                <SettingsIcon sx={{ color: "white" }} />
              </IconButton>
            </div>
          </div>

          <div className={styles.overviewCardContent}>
            <div className={styles.cardAnalytics}>
              {chartConfigs.map((config, idx) => (
                <ChartWidget
                  key={config.chartID}
                  config={config}
                  analyticsData={analyticsData}
                  onRendered={() => onChartRendered?.(index)}
                  variant="card"
                />
              ))}
            </div>

            {type === "studio" && (
              <Button
                onClick={handleOpenClick}
                sx={{
                  height: "80px",
                  ml: "60px",
                  mr: "60px",
                  mb: "20px",
                  color: "#cbcbcb",
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontSize: "16px",
                    fontWeight: "regular",
                    textAlign: "center",
                    color: "#e7e7e7",
                  }}
                >
                  View
                </Typography>
              </Button>
            )}

            <h2 className={styles.cardName}>
              {item?.[type === "game" ? "gameName" : "studioName"]}
            </h2>
          </div>
        </div>
      </Button>
    );
  }
);

OverviewCard.displayName = "OverviewCard";

export default OverviewCard;
