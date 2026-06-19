import useSWR from "swr";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { SettingsRounded } from "@mui/icons-material";
import { useVerge } from "@/hooks/use-verge";
import {
  isServiceAvailable,
  installService,
  uninstallService,
  reinstallService,
} from "@/services/cmds";
import { DialogRef, Notice, Switch } from "@/components/base";
import {
  SettingList,
  SettingItem,
  FluentSettingItem,
  FluentSettingList,
  FluentSettingGroup,
} from "./mods/setting-comp";
import { GuardState } from "./mods/guard-state";
import { SysproxyViewer } from "./mods/sysproxy-viewer";
import { TunViewer } from "./mods/tun-viewer";
import { LiteModeViewer } from "./mods/lite-mode-viewer";
import {
  FluentTooltipIcon,
  TooltipIcon,
} from "@/components/base/base-tooltip-icon";
import { Expander } from "../fluent/expander";
import {
  Button,
  Caption1,
  Caption2,
  makeStyles,
  Switch as FluentSwitch,
  Tooltip,
} from "@fluentui/react-components";
import {
  InfoRegular,
  SettingsRegular,
  ShieldRegular,
  GlobeRegular,
  GlobeArrowForwardRegular,
  PowerRegular,
  EyeOffRegular,
  WeatherMoonRegular,
} from "@fluentui/react-icons";
import { tokens } from "../../pages/_fluent_theme";

const useStyle = makeStyles({
  expander: {
    paddingBlock: "16px",
  },
  caption: {
    display: "block",
    color: tokens.colorNeutralForeground4,
    paddingBottom: "3px",
  },
});

export { useStyle as useSettingSystemStyle };

interface Props {
  onError?: (err: Error) => void;
  hideTitle?: boolean;
}

const SettingSystem = ({ onError, hideTitle }: Props) => {
  const { t } = useTranslation();

  const { verge, mutateVerge, patchVerge } = useVerge();

  // Service status: the command resolves to true when reachable and rejects when
  // not, so treat any error as "not installed".
  const {
    data: serviceData,
    error: serviceError,
    mutate: mutateServiceStatus,
  } = useSWR("isServiceAvailable", isServiceAvailable, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const serviceAvailable = serviceData === true && !serviceError;

  const runServiceAction = async (fn: () => Promise<void>) => {
    try {
      await fn();
      await mutateServiceStatus();
      Notice.success(t("Service Operation Success"), 1500);
    } catch (err: any) {
      Notice.error(err?.message ?? err?.toString() ?? String(err), 4000);
    }
  };

  const sysproxyRef = useRef<DialogRef>(null);
  const tunRef = useRef<DialogRef>(null);
  const liteModeRef = useRef<DialogRef>(null);

  const {
    enable_tun_mode,
    enable_auto_launch,
    enable_silent_start,
    enable_system_proxy,
  } = verge ?? {};

  // const onSwitchFormat = (_e: any, value: boolean) => value;
  const onSwitchFormat = (_e: any, { checked: value }: { checked: boolean }) =>
    value;
  const onChangeData = (patch: Partial<IVergeConfig>) => {
    mutateVerge({ ...verge, ...patch }, false);
  };

  const classes = useStyle();

  return (
    <FluentSettingList title={hideTitle ? undefined : t("System Setting")}>
      <SysproxyViewer ref={sysproxyRef} />
      {/* <TunViewer ref={tunRef} /> */}

      <FluentSettingGroup title={t("group.proxy_service")} first />

      <FluentSettingItem
        icon={<ShieldRegular />}
        label={t("Service Mode")}
        secondary={t("Service Mode Info")}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Caption1
            style={{
              whiteSpace: "nowrap",
              color: serviceAvailable
                ? tokens.colorPaletteGreenForeground1
                : tokens.colorNeutralForeground4,
            }}
          >
            {serviceAvailable
              ? t("Service Installed")
              : t("Service Not Installed")}
          </Caption1>
          {serviceAvailable ? (
            <>
              <Button
                size="small"
                style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                onClick={() => runServiceAction(reinstallService)}
              >
                {t("Reinstall Service")}
              </Button>
              <Button
                size="small"
                style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                onClick={() => runServiceAction(uninstallService)}
              >
                {t("Uninstall Service")}
              </Button>
            </>
          ) : (
            <Button
              size="small"
              appearance="primary"
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
              onClick={() => runServiceAction(installService)}
            >
              {t("Install Service")}
            </Button>
          )}
        </div>
      </FluentSettingItem>

      <FluentSettingItem
        icon={<GlobeRegular />}
        label={t("Tun Mode")}
        secondary={t("Tun Mode Info")}
        canExpand
        content={<TunViewer ref={tunRef} />}
      >
        <GuardState
          value={enable_tun_mode ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => {
            onChangeData({ enable_tun_mode: e });
          }}
          onGuard={(e) => {
            // Block enabling TUN until the privileged service is installed
            // (no silent auto-install). Rejecting reverts the switch.
            if (e && !serviceAvailable) {
              return Promise.reject(new Error(t("Tun Mode Service Required")));
            }
            return patchVerge({ enable_tun_mode: e });
          }}
        >
          <FluentSwitch />
        </GuardState>
      </FluentSettingItem>
      <FluentSettingItem
        icon={<GlobeArrowForwardRegular />}
        label={t("System Proxy")}
        secondary={t("System Proxy Info")}
        onClick={() => sysproxyRef.current?.open()}
        actionLabel={t("Change")}
      >
        <GuardState
          value={enable_system_proxy ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ enable_system_proxy: e })}
          onGuard={(e) => patchVerge({ enable_system_proxy: e })}
        >
          <FluentSwitch />
        </GuardState>
      </FluentSettingItem>

      <FluentSettingGroup title={t("group.startup")} />

      <FluentSettingItem icon={<PowerRegular />} label={t("Auto Launch")}>
        <GuardState
          value={enable_auto_launch ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ enable_auto_launch: e })}
          onGuard={(e) => patchVerge({ enable_auto_launch: e })}
        >
          <FluentSwitch />
        </GuardState>
      </FluentSettingItem>

      <FluentSettingItem
        icon={<EyeOffRegular />}
        label={t("Silent Start")}
        secondary={t("Silent Start Info")}
      >
        <GuardState
          value={enable_silent_start ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ enable_silent_start: e })}
          onGuard={(e) => patchVerge({ enable_silent_start: e })}
        >
          <FluentSwitch />
        </GuardState>
      </FluentSettingItem>

      <FluentSettingItem
        icon={<WeatherMoonRegular />}
        label={t("LightWeight Mode")}
        secondary={t("LightWeight Mode Info")}
        canExpand
        content={<LiteModeViewer ref={liteModeRef} />}
      />
    </FluentSettingList>
  );
};

export default SettingSystem;
