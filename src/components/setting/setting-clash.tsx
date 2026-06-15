import { useRef, useState, useEffect } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { TextField, Select, MenuItem, Typography } from "@mui/material";
import {
  SettingsRounded,
  ShuffleRounded,
  LanRounded,
} from "@mui/icons-material";
import {
  Menu,
  MenuButton,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Switch as FluentSwitch,
  MenuItem as FluentMenuItem,
  MenuItemRadio,
  makeStyles,
  Tooltip,
  Button,
  Caption1,
  Body2,
  Input,
} from "@fluentui/react-components";
import { DialogRef, Notice, Switch } from "@/components/base";
import { useClash, useClashInfo } from "@/hooks/use-clash";
import { GuardState } from "./mods/guard-state";
import { WebUIViewer } from "./mods/web-ui-viewer";
import { ClashPortViewer } from "./mods/clash-port-viewer";
import { ControllerViewer } from "./mods/controller-viewer";
import {
  SettingList,
  SettingItem,
  FluentSettingItem,
  FluentSettingList,
  FluentSettingGroup,
} from "./mods/setting-comp";
import { useSettingSystemStyle } from "./setting-system";
import {
  ConnectedRegular,
  SettingsRegular,
  WifiSettingsRegular,
  NumberSymbolRegular,
  TopSpeedRegular,
  TextBulletListLtrRegular,
  PlugConnectedRegular,
  ServerRegular,
  GlobeSearchRegular,
  FlowRegular,
  GlobeShieldRegular,
  WindowRegular,
  CubeRegular,
  WrenchRegular,
  MapRegular,
} from "@fluentui/react-icons";
import { ClashCoreViewer } from "./mods/clash-core-viewer";
import { invoke_uwp_tool } from "@/services/cmds";
import getSystem from "@/utils/get-system";
import { useVerge } from "@/hooks/use-verge";
import { updateGeoData } from "@/services/api";
import {
  TooltipIcon,
  FluentTooltipIcon,
} from "@/components/base/base-tooltip-icon";
import { NetworkInterfaceViewer } from "./mods/network-interface-viewer";
import { DnsViewer, buildDefaultDnsConfig } from "./mods/dns-viewer";
import {
  checkDnsConfigExists,
  saveDnsConfig,
  applyDnsConfig,
} from "@/services/cmds";
import { TunnelsViewer } from "./mods/tunnels-viewer";
import { HeaderConfiguration } from "./mods/external-controller-cors";

const useStyles = makeStyles({
  expander: {
    height: "72px",
  },
});

const isWIN = getSystem() === "windows";

interface Props {
  onError: (err: Error) => void;
  hideTitle?: boolean;
}

const SettingClash = ({ onError, hideTitle }: Props) => {
  const { t } = useTranslation();

  const { clash, version, mutateClash, patchClash } = useClash();
  const { verge, mutateVerge, patchVerge } = useVerge();
  const { clashInfo, patchInfo } = useClashInfo();

  const {
    ipv6,
    "allow-lan": allowLan,
    "log-level": logLevel,
    "unified-delay": unifiedDelay,
  } = clash ?? {};

  const { enable_random_port = false, verge_mixed_port } = verge ?? {};

  // Quick mixed-port editor surfaced next to the Port Config expander arrow,
  // so the most common port can be changed without opening the expander.
  const [mixedPort, setMixedPort] = useState(
    verge_mixed_port ?? clashInfo?.mixed_port ?? 7897,
  );
  useEffect(() => {
    if (verge_mixed_port) setMixedPort(verge_mixed_port);
  }, [verge_mixed_port]);

  // Quick "DNS Overwrite" master switch surfaced next to the expander arrow.
  // Self-contained (does not depend on the DnsViewer being mounted/expanded):
  // seeds a default DNS config file on first enable, flips the master
  // `enable_dns_settings` flag, and applies/reverts immediately.
  const toggleDnsOverwrite = async (enable: boolean) => {
    if (enable) {
      const exists = await checkDnsConfigExists();
      if (!exists) await saveDnsConfig(buildDefaultDnsConfig(true));
    }
    await patchVerge({ enable_dns_settings: enable });
    await applyDnsConfig(enable);
    mutateClash();
  };

  const saveMixedPort = useLockFn(async () => {
    if (mixedPort === (verge_mixed_port ?? clashInfo?.mixed_port)) return;
    if (mixedPort < 1 || mixedPort > 65535) {
      Notice.error(t("Port Conflict"), 3000);
      setMixedPort(verge_mixed_port ?? clashInfo?.mixed_port ?? 7897);
      return;
    }
    try {
      await patchInfo({ "mixed-port": mixedPort });
      await patchVerge({ verge_mixed_port: mixedPort });
      Notice.success(t("Clash Port Modified"), 1000);
    } catch (err: any) {
      Notice.error(err.message || err.toString(), 4000);
    }
  });

  const webRef = useRef<DialogRef>(null);
  const portRef = useRef<DialogRef>(null);
  const ctrlRef = useRef<DialogRef>(null);
  const coreRef = useRef<DialogRef>(null);
  const networkRef = useRef<DialogRef>(null);
  const dnsRef = useRef<DialogRef>(null);
  const tunnelRef = useRef<DialogRef>(null);
  const corsRef = useRef<DialogRef>(null);

  const onSwitchFormat = (_e: any, data: { checked: boolean }) => data.checked;
  const onChangeData = (patch: Partial<IConfigData>) => {
    mutateClash((old) => ({ ...(old! || {}), ...patch }), false);
  };
  const onChangeVerge = (patch: Partial<IVergeConfig>) => {
    mutateVerge({ ...verge, ...patch }, false);
  };
  const onUpdateGeo = async () => {
    try {
      await updateGeoData();
      Notice.success(t("GeoData Updated"));
    } catch (err: any) {
      Notice.error(err?.response.data.message || err.toString());
    }
  };

  const classes = useStyles();
  const settingsClasses = useSettingSystemStyle();

  return (
    <FluentSettingList title={hideTitle ? undefined : t("Clash Setting")}>
      <WebUIViewer ref={webRef} />
      {/* <ClashPortViewer ref={portRef} /> */}
      <ControllerViewer ref={ctrlRef} />
      <ClashCoreViewer ref={coreRef} />
      <NetworkInterfaceViewer ref={networkRef} />

      {/* <SettingItem
        label={t("Allow Lan")}
        extra={
          <TooltipIcon
            title={t("Network Interface")}
            color={"inherit"}
            icon={LanRounded}
            onClick={() => {
              networkRef.current?.open();
            }}
          />
        }
      >
        <GuardState
          value={allowLan ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ "allow-lan": e })}
          onGuard={(e) => patchClash({ "allow-lan": e })}
        >
          <Switch edge="end" />
        </GuardState>
      </SettingItem> */}

      <FluentSettingGroup title={t("group.ports_network")} first />

      <FluentSettingItem icon={<WifiSettingsRegular />} label={t("Allow Lan")}>
        <Button
          icon={<ConnectedRegular />}
          appearance="subtle"
          onClick={() => networkRef.current?.open()}
          title={t("Network Interface")}
        />
        <GuardState
          value={allowLan ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ "allow-lan": e })}
          onGuard={(e) => patchClash({ "allow-lan": e })}
        >
          <FluentSwitch />
        </GuardState>
      </FluentSettingItem>

      <FluentSettingItem icon={<NumberSymbolRegular />} label={t("IPv6")}>
        <GuardState
          value={ipv6 ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ ipv6: e })}
          onGuard={(e) => patchClash({ ipv6: e })}
        >
          <FluentSwitch />
        </GuardState>
      </FluentSettingItem>

      <FluentSettingItem
        icon={<PlugConnectedRegular />}
        label={t("Port Config")}
        canExpand
        content={<ClashPortViewer ref={portRef} />}
      >
        <Input
          autoComplete="new-password"
          style={{ width: 110 }}
          value={String(mixedPort)}
          disabled={enable_random_port}
          title={t("Mixed Port")}
          onChange={(_, data) =>
            setMixedPort(+data.value.replace(/\D+/g, "").slice(0, 5))
          }
          onBlur={saveMixedPort}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </FluentSettingItem>

      <FluentSettingItem
        icon={<GlobeSearchRegular />}
        label={t("DNS Overwrite")}
        canExpand
        content={<DnsViewer ref={dnsRef} />}
      >
        <GuardState
          value={verge?.enable_dns_settings ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeVerge({ enable_dns_settings: e })}
          onGuard={(e) => toggleDnsOverwrite(e)}
        >
          <FluentSwitch />
        </GuardState>
      </FluentSettingItem>

      <FluentSettingItem
        icon={<FlowRegular />}
        label={t("Tunnels")}
        canExpand
        content={<TunnelsViewer ref={tunnelRef} />}
      />

      <FluentSettingGroup title={t("group.external_control")} />

      <FluentSettingItem
        icon={<ServerRegular />}
        onClick={() => ctrlRef.current?.open()}
        label={t("External")}
        actionLabel={t("Change")}
      />

      <FluentSettingItem
        icon={<GlobeShieldRegular />}
        label={t("External Controller CORS")}
        canExpand
        content={<HeaderConfiguration ref={corsRef} />}
      />

      <FluentSettingItem
        icon={<WindowRegular />}
        onClick={() => webRef.current?.open()}
        label={t("Web UI")}
        actionLabel={t("Change")}
      />

      <FluentSettingGroup title={t("group.core_data")} />

      <FluentSettingItem
        icon={<TopSpeedRegular />}
        label={t("Unified Delay")}
        secondary={t("Unified Delay Info")}
      >
        <GuardState
          value={unifiedDelay ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ "unified-delay": e })}
          onGuard={(e) => patchClash({ "unified-delay": e })}
        >
          <FluentSwitch />
        </GuardState>
      </FluentSettingItem>

      <FluentSettingItem
        icon={<TextBulletListLtrRegular />}
        label={t("Log Level")}
        secondary={t("Log Level Info")}
      >
        <GuardState
          value={{
            level: [logLevel === "warn" ? "warning" : (logLevel ?? "info")],
          }}
          onCatch={onError}
          onFormat={(_, data) => data.checkedItems[0]}
          onChange={(e) => onChangeData({ "log-level": e })}
          onGuard={(e) => patchClash({ "log-level": e })}
          onChangeProps="onCheckedValueChange"
          valueProps="checkedValues"
        >
          <Menu>
            <MenuTrigger>
              <MenuButton>{logLevel}</MenuButton>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItemRadio name="level" value="debug">
                  Debug
                </MenuItemRadio>
                <MenuItemRadio name="level" value="info">
                  Info
                </MenuItemRadio>
                <MenuItemRadio name="level" value="warning">
                  Warn
                </MenuItemRadio>
                <MenuItemRadio name="level" value="error">
                  Error
                </MenuItemRadio>
                <MenuItemRadio name="level" value="silent">
                  Silent
                </MenuItemRadio>
              </MenuList>
            </MenuPopover>
          </Menu>
        </GuardState>
      </FluentSettingItem>

      <FluentSettingItem
        icon={<CubeRegular />}
        label={t("Clash Core")}
        onClick={() => coreRef.current?.open()}
        actionLabel={t("Change")}
      >
        <Body2>{version}</Body2>
      </FluentSettingItem>

      {isWIN && (
        <FluentSettingItem
          icon={<WrenchRegular />}
          onClick={invoke_uwp_tool}
          label={t("Open UWP tool")}
          secondary={t("Open UWP tool Info")}
          actionLabel={t("Open")}
        />
      )}

      <FluentSettingItem
        icon={<MapRegular />}
        onClick={onUpdateGeo}
        label={t("Update GeoData")}
        actionLabel={t("Update")}
      />
    </FluentSettingList>
  );
};

export default SettingClash;
