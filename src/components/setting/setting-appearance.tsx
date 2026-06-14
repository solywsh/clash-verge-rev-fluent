import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { Input } from "@mui/material";
import { copyClashEnv } from "@/services/cmds";
import { useVerge } from "@/hooks/use-verge";
import { DialogRef, Notice } from "@/components/base";
import { FluentSettingList, FluentSettingItem } from "./mods/setting-comp";
import { HotkeyViewer } from "./mods/hotkey-viewer";
import { MiscViewer } from "./mods/misc-viewer";
import { ThemeViewer } from "./mods/theme-viewer";
import { GuardState } from "./mods/guard-state";
import { LayoutViewer } from "./mods/layout-viewer";
import getSystem from "@/utils/get-system";
import { routers } from "@/pages/_routers";
import { languages } from "@/services/i18n";
import {
  Button as FluentButton,
  Menu,
  MenuButton,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from "@fluentui/react-components";
import { CopyRegular } from "@fluentui/react-icons";

interface Props {
  onError?: (err: Error) => void;
}

const OS = getSystem();

const languageOptions = Object.entries(languages).map(([code, _]) => {
  const labels: { [key: string]: string } = {
    en: "English",
    ru: "Русский",
    zh: "中文",
    fa: "فارسی",
    tt: "Татар",
    id: "Bahasa Indonesia",
    ar: "العربية",
  };
  return { code, label: labels[code] };
});

const SettingAppearance = ({ onError }: Props) => {
  const { t } = useTranslation();

  const { verge, patchVerge, mutateVerge } = useVerge();
  const {
    theme_mode,
    language,
    tray_event,
    env_type,
    startup_script,
    start_page,
  } = verge ?? {};
  const themeRef = useRef<DialogRef>(null);
  const layoutRef = useRef<DialogRef>(null);
  const miscRef = useRef<DialogRef>(null);
  const hotkeyRef = useRef<DialogRef>(null);

  const onChangeData = (patch: Partial<IVergeConfig>) => {
    mutateVerge({ ...verge, ...patch }, false);
  };

  const onCopyClashEnv = useCallback(async () => {
    await copyClashEnv();
    Notice.success(t("Copy Success"), 1000);
  }, []);

  const fluentGuardStateProps = {
    onFormat: (_: any, data: any) => data.checkedItems[0],
    onChangeProps: "onCheckedValueChange",
    valueProps: "checkedValues",
  } as const;

  return (
    <FluentSettingList title={t("Appearance & Behavior")}>
      <ThemeViewer ref={themeRef} />
      <MiscViewer ref={miscRef} />
      <LayoutViewer ref={layoutRef} />
      <HotkeyViewer ref={hotkeyRef} />

      <FluentSettingItem label={t("Language")}>
        <GuardState
          value={{ language: language ?? "en" }}
          onCatch={onError}
          {...fluentGuardStateProps}
          onChange={(e) => onChangeData({ language: e })}
          onGuard={(e) => patchVerge({ language: e })}
        >
          <Menu>
            <MenuTrigger>
              <MenuButton>
                {languageOptions.find((item) => item.code === language)?.label}
              </MenuButton>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {languageOptions.map(({ code, label }) => (
                  <MenuItemRadio name="language" value={code} key={code}>
                    {label}
                  </MenuItemRadio>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
        </GuardState>
      </FluentSettingItem>

      <FluentSettingItem label={t("Theme Mode")}>
        <GuardState
          value={{ theme: theme_mode ?? "system" }}
          onCatch={onError}
          {...fluentGuardStateProps}
          onChange={(e) => onChangeData({ theme_mode: e })}
          onGuard={(e) => patchVerge({ theme_mode: e })}
        >
          <Menu>
            <MenuTrigger>
              <MenuButton>
                {
                  {
                    light: t("theme.light"),
                    dark: t("theme.dark"),
                    system: t("theme.system"),
                  }[theme_mode ?? "system"]
                }
              </MenuButton>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItemRadio name="theme" value="light">
                  {t("theme.light")}
                </MenuItemRadio>
                <MenuItemRadio name="theme" value="dark">
                  {t("theme.dark")}
                </MenuItemRadio>
                <MenuItemRadio name="theme" value="system">
                  {t("theme.system")}
                </MenuItemRadio>
              </MenuList>
            </MenuPopover>
          </Menu>
        </GuardState>
      </FluentSettingItem>

      <FluentSettingItem
        onClick={() => themeRef.current?.open()}
        label={t("Theme Setting")}
      />

      <FluentSettingItem
        onClick={() => layoutRef.current?.open()}
        label={t("Layout Setting")}
      />

      {OS !== "linux" && (
        <FluentSettingItem label={t("Tray Click Event")}>
          <GuardState
            value={{ tray: tray_event ?? "main_window" }}
            onCatch={onError}
            {...fluentGuardStateProps}
            onChange={(e) => onChangeData({ tray_event: e })}
            onGuard={(e) => patchVerge({ tray_event: e })}
          >
            <Menu>
              <MenuTrigger>
                <MenuButton>
                  {
                    {
                      main_window: t("Show Main Window"),
                      system_proxy: t("System Proxy"),
                      tun_mode: t("Tun Mode"),
                      disable: t("Disable"),
                    }[tray_event ?? "main_window"]
                  }
                </MenuButton>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItemRadio name="tray" value="main_window">
                    {t("Show Main Window")}
                  </MenuItemRadio>
                  <MenuItemRadio name="tray" value="system_proxy">
                    {t("System Proxy")}
                  </MenuItemRadio>
                  <MenuItemRadio name="tray" value="tun_mode">
                    {t("Tun Mode")}
                  </MenuItemRadio>
                  <MenuItemRadio name="tray" value="disable">
                    {t("Disable")}
                  </MenuItemRadio>
                </MenuList>
              </MenuPopover>
            </Menu>
          </GuardState>
        </FluentSettingItem>
      )}

      <FluentSettingItem label={t("Copy Env Type")}>
        <GuardState
          value={{
            env_type: env_type ?? (OS === "windows" ? "powershell" : "bash"),
          }}
          onCatch={onError}
          {...fluentGuardStateProps}
          onChange={(e) => onChangeData({ env_type: e })}
          onGuard={(e) => patchVerge({ env_type: e })}
        >
          <Menu>
            <MenuTrigger>
              <MenuButton>{env_type}</MenuButton>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItemRadio name="env_type" value="bash">
                  bash
                </MenuItemRadio>
                <MenuItemRadio name="env_type" value="cmd">
                  cmd
                </MenuItemRadio>
                <MenuItemRadio name="env_type" value="powershell">
                  powershell
                </MenuItemRadio>
              </MenuList>
            </MenuPopover>
          </Menu>
        </GuardState>
        <FluentButton
          icon={<CopyRegular />}
          onClick={onCopyClashEnv}
          style={{ marginLeft: 12 }}
          className="fds"
        ></FluentButton>
      </FluentSettingItem>

      <FluentSettingItem label={t("Start Page")}>
        <GuardState
          value={{ start_page: start_page ?? "/" }}
          onCatch={onError}
          {...fluentGuardStateProps}
          onChange={(e) => onChangeData({ start_page: e })}
          onGuard={(e) => patchVerge({ start_page: e })}
        >
          <Menu>
            <MenuTrigger>
              <MenuButton>
                {t(
                  routers.find((item) => item.path === (start_page ?? "/"))!
                    .label,
                )}
              </MenuButton>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {routers.map((page: { label: string; path: string }) => {
                  return (
                    <MenuItemRadio
                      name="start_page"
                      value={page.path}
                      key={page.path}
                    >
                      {t(page.label)}
                    </MenuItemRadio>
                  );
                })}
              </MenuList>
            </MenuPopover>
          </Menu>
        </GuardState>
      </FluentSettingItem>

      <FluentSettingItem label={t("Startup Script")}>
        <GuardState
          value={startup_script ?? ""}
          onCatch={onError}
          onFormat={(e: any) => e.target.value}
          onChange={(e) => onChangeData({ startup_script: e })}
          onGuard={(e) => patchVerge({ startup_script: e })}
        >
          <Input
            value={startup_script}
            disabled
            sx={{ width: 230 }}
            endAdornment={
              <>
                <FluentButton
                  appearance="transparent"
                  onClick={async () => {
                    const selected = await open({
                      directory: false,
                      multiple: false,
                      filters: [
                        {
                          name: "Shell Script",
                          extensions: ["sh", "bat", "ps1"],
                        },
                      ],
                    });
                    if (selected) {
                      onChangeData({ startup_script: `${selected}` });
                      patchVerge({ startup_script: `${selected}` });
                    }
                  }}
                >
                  {t("Browse")}
                </FluentButton>
                {startup_script && (
                  <FluentButton
                    appearance="transparent"
                    onClick={async () => {
                      onChangeData({ startup_script: "" });
                      patchVerge({ startup_script: "" });
                    }}
                  >
                    {t("Clear")}
                  </FluentButton>
                )}
              </>
            }
          ></Input>
        </GuardState>
      </FluentSettingItem>

      <FluentSettingItem
        onClick={() => hotkeyRef.current?.open()}
        label={t("Hotkey Setting")}
      />

      <FluentSettingItem
        onClick={() => miscRef.current?.open()}
        label={t("Miscellaneous")}
      />
    </FluentSettingList>
  );
};

export default SettingAppearance;
