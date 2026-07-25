import {
  BroadActivityFeedRegular,
  GroupListRegular,
  NetworkCheckRegular,
  PlugConnectedRegular,
  SettingsRegular,
  TextAlignLeftRegular,
  HomeRegular,
} from '@fluentui/react-icons'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import ForkRightRoundedIcon from '@mui/icons-material/ForkRightRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import SubjectRoundedIcon from '@mui/icons-material/SubjectRounded'
import WifiRoundedIcon from '@mui/icons-material/WifiRounded'

import ConnectionsSvg from '@/assets/image/itemicon/connections.svg?react'
import LogsSvg from '@/assets/image/itemicon/logs.svg?react'
import ProfilesSvg from '@/assets/image/itemicon/profiles.svg?react'
import ProxiesSvg from '@/assets/image/itemicon/proxies.svg?react'
import RulesSvg from '@/assets/image/itemicon/rules.svg?react'
import SettingsSvg from '@/assets/image/itemicon/settings.svg?react'
import { BaseErrorBoundary } from '@/components/base'

import ConnectionsPage from './connections'
import HomePage from './home'
import LogsPage from './logs'
import ProfilesPage from './profiles'
import ProxiesPage from './proxies'
import RulesPage from './rules'
import SettingsPage from './settings'

export const routers = [
  {
    label: 'Label-Home',
    path: '/',
    icon: [
      <HomeRoundedIcon key="mui" />,
      <HomeRegular key="svg" />,
      <HomeRegular key="fluent" />,
    ],
    element: <HomePage />,
  },
  {
    label: 'Label-Proxies',
    path: '/proxies',
    icon: [
      <WifiRoundedIcon key="mui" />,
      <ProxiesSvg key="svg" />,
      <NetworkCheckRegular key="fluent" />,
    ],
    element: <ProxiesPage />,
  },
  {
    label: 'Label-Profiles',
    path: '/profile',
    icon: [
      <DnsRoundedIcon key="mui" />,
      <ProfilesSvg key="svg" />,
      <BroadActivityFeedRegular key="fluent" />,
    ],
    element: <ProfilesPage />,
  },
  {
    label: 'Label-Connections',
    path: '/connections',
    icon: [
      <LanguageRoundedIcon key="mui" />,
      <ConnectionsSvg key="svg" />,
      <PlugConnectedRegular key="fluent" />,
    ],
    element: <ConnectionsPage />,
  },
  {
    label: 'Label-Rules',
    path: '/rules',
    icon: [
      <ForkRightRoundedIcon key="mui" />,
      <RulesSvg key="svg" />,
      <GroupListRegular key="fluent" />,
    ],
    element: <RulesPage />,
  },
  {
    label: 'Label-Logs',
    path: '/logs',
    icon: [
      <SubjectRoundedIcon key="mui" />,
      <LogsSvg key="svg" />,
      <TextAlignLeftRegular key="fluent" />,
    ],
    element: <LogsPage />,
  },
  {
    label: 'Label-Settings',
    path: '/settings',
    icon: [
      <SettingsRoundedIcon key="mui" />,
      <SettingsSvg key="svg" />,
      <SettingsRegular key="fluent" />,
    ],
    element: <SettingsPage />,
  },
].map((router) => ({
  ...router,
  element: (
    <BaseErrorBoundary key={router.label}>{router.element}</BaseErrorBoundary>
  ),
}))
