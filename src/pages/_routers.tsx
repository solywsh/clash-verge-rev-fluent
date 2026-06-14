import LogsPage from "./logs";
import ProxiesPage from "./proxies";
import TestPage from "./test";
import ProfilesPage from "./profiles";
import SettingsPage from "./settings";
import ConnectionsPage from "./connections";
import RulesPage from "./rules";
import UnlockPage from "./unlock";
import HomePage from "./home";
import { BaseErrorBoundary } from "@/components/base";

import ProxiesSvg from "@/assets/image/itemicon/proxies.svg?react";
import ProfilesSvg from "@/assets/image/itemicon/profiles.svg?react";
import ConnectionsSvg from "@/assets/image/itemicon/connections.svg?react";
import RulesSvg from "@/assets/image/itemicon/rules.svg?react";
import LogsSvg from "@/assets/image/itemicon/logs.svg?react";
import TestSvg from "@/assets/image/itemicon/test.svg?react";
import SettingsSvg from "@/assets/image/itemicon/settings.svg?react";

import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import ForkRightRoundedIcon from "@mui/icons-material/ForkRightRounded";
import SubjectRoundedIcon from "@mui/icons-material/SubjectRounded";
import WifiTetheringRoundedIcon from "@mui/icons-material/WifiTetheringRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";

import {
  BroadActivityFeedRegular,
  GroupListRegular,
  NetworkCheckRegular,
  PlugConnectedRegular,
  Settings16Regular,
  SettingsRegular,
  TextAlignLeftRegular,
  TopSpeedRegular,
  LockOpenRegular,
  HomeRegular,
} from "@fluentui/react-icons";

export const routers = [
  {
    label: "Label-Home",
    path: "/",
    icon: [<HomeRoundedIcon />, <HomeRegular />, <HomeRegular />],
    element: <HomePage />,
  },
  {
    label: "Label-Proxies",
    path: "/proxies",
    icon: [<WifiRoundedIcon />, <ProxiesSvg />, <NetworkCheckRegular />],
    element: <ProxiesPage />,
  },
  {
    label: "Label-Profiles",
    path: "/profile",
    icon: [<DnsRoundedIcon />, <ProfilesSvg />, <BroadActivityFeedRegular />],
    element: <ProfilesPage />,
  },
  {
    label: "Label-Connections",
    path: "/connections",
    icon: [
      <LanguageRoundedIcon />,
      <ConnectionsSvg />,
      <PlugConnectedRegular />,
    ],
    element: <ConnectionsPage />,
  },
  {
    label: "Label-Rules",
    path: "/rules",
    icon: [<ForkRightRoundedIcon />, <RulesSvg />, <GroupListRegular />],
    element: <RulesPage />,
  },
  {
    label: "Label-Logs",
    path: "/logs",
    icon: [<SubjectRoundedIcon />, <LogsSvg />, <TextAlignLeftRegular />],
    element: <LogsPage />,
  },
  {
    label: "Label-Test",
    path: "/test",
    icon: [<WifiTetheringRoundedIcon />, <TestSvg />, <TopSpeedRegular />],
    element: <TestPage />,
  },
  {
    label: "Label-Unlock",
    path: "/unlock",
    icon: [<LockOpenRoundedIcon />, <LockOpenRegular />, <LockOpenRegular />],
    element: <UnlockPage />,
  },
  {
    label: "Label-Settings",
    path: "/settings",
    icon: [<SettingsRoundedIcon />, <SettingsSvg />, <SettingsRegular />],
    element: <SettingsPage />,
  },
].map((router) => ({
  ...router,
  element: (
    <BaseErrorBoundary key={router.label}>{router.element}</BaseErrorBoundary>
  ),
}));
