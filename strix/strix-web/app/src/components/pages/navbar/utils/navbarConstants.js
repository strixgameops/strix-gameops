import React from "react";
// Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import SettingsIcon from "@mui/icons-material/Settings";
import ViewComfySharpIcon from "@mui/icons-material/ViewComfySharp";
import MultilineChartSharpIcon from "@mui/icons-material/MultilineChartSharp";
import AttachMoneySharpIcon from "@mui/icons-material/AttachMoneySharp";
import DiamondSharpIcon from "@mui/icons-material/DiamondSharp";
import PestControlSharpIcon from "@mui/icons-material/PestControlSharp";
import BackupTableSharpIcon from "@mui/icons-material/BackupTableSharp";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import RecentActorsSharpIcon from "@mui/icons-material/RecentActorsSharp";
import TroubleshootIcon from "@mui/icons-material/Troubleshoot";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";
import InsightsSharpIcon from "@mui/icons-material/InsightsSharp";
import StorageIcon from "@mui/icons-material/Storage";
import GroupIcon from "@mui/icons-material/Group";
import ScienceIcon from "@mui/icons-material/Science";
import WidgetsIcon from "@mui/icons-material/Widgets";
import FunctionsSharpIcon from "@mui/icons-material/FunctionsSharp";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SendSharpIcon from "@mui/icons-material/SendSharp";
import TranslateIcon from "@mui/icons-material/Translate";
import SegmentIcon from "@mui/icons-material/Segment";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import FlowIcon from "../icons/FlowIcon.jsx";

export const NAVBAR_CATEGORIES = {
  DASHBOARDS: "dashboards",
  ANALYSIS: "analysis",
  AUDIENCE: "audience",
  LIVEOPS: "liveops",
};

export const NAVBAR_ASPECTS = {
  ANALYTICS: "analytics",
  LIVEOPS: "liveops",
};

export const ANALYTICS_CATEGORIES = [
  {
    id: NAVBAR_CATEGORIES.DASHBOARDS,
    name: "Dashboards",
    icon: <ViewComfySharpIcon />,
    items: [
      {
        name: "Overview",
        path: "/dashboards/generalanalytics",
        icon: <MultilineChartSharpIcon />,
      },
      {
        name: "IAPs & Offers",
        path: "/dashboards/iap",
        icon: <AttachMoneySharpIcon />,
        enterpriseOnly: true,
      },
      {
        name: "In-Game Currency",
        path: "/dashboards/ingamecurrency",
        icon: <DiamondSharpIcon />,
      },
      {
        name: "Custom Dashboards",
        path: "/customdashboards",
        icon: <BackupTableSharpIcon />,
      },
    ],
  },
  {
    id: NAVBAR_CATEGORIES.ANALYSIS,
    name: "Analysis",
    icon: <QueryStatsIcon />,
    items: [
      {
        name: "Behavior Tree",
        path: "/behaviorTree",
        icon: <AccountTreeIcon />,
      },
      {
        name: "Profile Composition",
        path: "/profileComposition",
        icon: <RecentActorsSharpIcon />,
      },
      {
        name: "Retention",
        path: "/dashboards/retention",
        icon: <TroubleshootIcon />,
      },
      {
        name: "Clustering",
        path: "/clustering",
        icon: <BubbleChartIcon />,
        enterpriseOnly: true,
      },
      {
        name: "Explore Data",
        path: "/charts",
        icon: <InsightsSharpIcon />,
      },
    ],
  },
];

export const LIVEOPS_CATEGORIES = [
  {
    id: NAVBAR_CATEGORIES.AUDIENCE,
    name: "Audience",
    icon: <PersonSearchIcon />,
    items: [
      {
        name: "Player Warehouse",
        path: "/playerwarehouse",
        icon: <StorageIcon />,
      },
      {
        name: "Segmentation",
        path: "/segmentation",
        icon: <GroupIcon />,
      },
      {
        name: "A/B Testing",
        path: "/abtesting",
        icon: <ScienceIcon />,
      },
    ],
  },
  {
    id: NAVBAR_CATEGORIES.LIVEOPS,
    name: "LiveOps",
    icon: <SettingsIcon />,
    items: [
      {
        name: "Entities",
        path: "/entities",
        icon: <WidgetsIcon />,
        padding: 2,
      },
      {
        name: "Model",
        path: "/model",
        icon: <FunctionsSharpIcon />,
        padding: 2,
      },
      {
        name: "Offers",
        path: "/offers",
        icon: <LocalOfferIcon />,
      },
      {
        name: "Flows",
        path: "/flows",
        icon: <FlowIcon />,
        enterpriseOnly: true,
      },
      {
        name: "Game Events",
        path: "/gameevents",
        icon: <CalendarMonthIcon />,
      },
      {
        name: "Push Notifications",
        path: "/pushNotifications",
        icon: <SendSharpIcon />,
        padding: 2,
        enterpriseOnly: true,
      },
      {
        name: "Localization",
        path: "/localization",
        icon: <TranslateIcon />,
      },
      {
        name: "Analytic Events",
        path: "/allevents",
        icon: <SegmentIcon />,
      },
      {
        name: "Deployment",
        path: "/deployment",
        icon: <UnarchiveIcon />,
      },
    ],
  },
];

export const NAVIGATION_CONFIG = [
  ...ANALYTICS_CATEGORIES,
  ...LIVEOPS_CATEGORIES,
];