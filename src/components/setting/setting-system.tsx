import useSWR from "swr";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { SettingsRounded } from "@mui/icons-material";
import { useVerge } from "@/hooks/use-verge";
import { DialogRef, Notice, Switch } from "@/components/base";
import {
  SettingList,
  SettingItem,
  FluentSettingItem,
  FluentSettingList,
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
import { InfoRegular, SettingsRegular } from "@fluentui/react-icons";
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
}

const SettingSystem = ({ onError }: Props) => {
  const { t } = useTranslation();

  const { verge, mutateVerge, patchVerge } = useVerge();

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
    <FluentSettingList title={t("System Setting")}>
      <SysproxyViewer ref={sysproxyRef} />
      {/* <TunViewer ref={tunRef} /> */}

      <FluentSettingItem
        label={t("Tun Mode")}
        // extra={
        //   <TooltipIcon
        //     title={t("Tun Mode Info")}
        //     icon={SettingsRounded}
        //     onClick={() => tunRef.current?.open()}
        //   />
        // }
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
            return patchVerge({ enable_tun_mode: e });
          }}
        >
          <FluentSwitch />
        </GuardState>
      </FluentSettingItem>
      <FluentSettingItem
        label={t("System Proxy")}
        extra={<FluentTooltipIcon title={t("System Proxy Info")} />}
        // extra={
        //   <>
        //     <TooltipIcon
        //       title={t("System Proxy Info")}
        //       icon={SettingsRounded}
        //       onClick={() => sysproxyRef.current?.open()}
        //     />
        //   </>
        // }
        onClick={() => sysproxyRef.current?.open()}
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

      <FluentSettingItem label={t("Auto Launch")}>
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
        label={t("Silent Start")}
        extra={<FluentTooltipIcon title={t("Silent Start Info")} />}
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
        label={t("LightWeight Mode")}
        extra={<FluentTooltipIcon title={t("LightWeight Mode Info")} />}
        canExpand
        content={<LiteModeViewer ref={liteModeRef} />}
      />
    </FluentSettingList>
  );
};

export default SettingSystem;
