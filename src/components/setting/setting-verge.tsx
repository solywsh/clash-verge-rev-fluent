import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { Button, MenuItem, Select, Input, Typography } from "@mui/material";
import {
  exitApp,
  openAppDir,
  openCoreDir,
  openLogsDir,
  openDevTools,
  copyClashEnv,
  exportDiagnosticInfo,
} from "@/services/cmds";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import { useVerge } from "@/hooks/use-verge";
import { version } from "@root/package.json";
import { DialogRef, Notice } from "@/components/base";
import {
  SettingList,
  SettingItem,
  FluentSettingList,
  FluentSettingItem,
} from "./mods/setting-comp";
import { ThemeModeSwitch } from "./mods/theme-mode-switch";
import { ConfigViewer } from "./mods/config-viewer";
import { HotkeyViewer } from "./mods/hotkey-viewer";
import { MiscViewer } from "./mods/misc-viewer";
import { ThemeViewer } from "./mods/theme-viewer";
import { GuardState } from "./mods/guard-state";
import { LayoutViewer } from "./mods/layout-viewer";
import { UpdateViewer } from "./mods/update-viewer";
import { BackupViewer } from "./mods/backup-viewer";
import { LocalBackupViewer } from "./mods/local-backup-viewer";
import getSystem from "@/utils/get-system";
import { routers } from "@/pages/_routers";
import {
  FluentTooltipIcon,
  TooltipIcon,
} from "@/components/base/base-tooltip-icon";
import { ContentCopyRounded } from "@mui/icons-material";
import { languages } from "@/services/i18n";
import {
  Input as FluentInput,
  Button as FluentButton,
  Menu,
  MenuButton,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Body2,
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

const SettingVerge = ({ onError }: Props) => {
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
  const configRef = useRef<DialogRef>(null);
  const hotkeyRef = useRef<DialogRef>(null);
  const miscRef = useRef<DialogRef>(null);
  const themeRef = useRef<DialogRef>(null);
  const layoutRef = useRef<DialogRef>(null);
  const updateRef = useRef<DialogRef>(null);
  const backupRef = useRef<DialogRef>(null);
  const localBackupRef = useRef<DialogRef>(null);

  const onChangeData = (patch: Partial<IVergeConfig>) => {
    mutateVerge({ ...verge, ...patch }, false);
  };

  const onCheckUpdate = async () => {
    try {
      // const info = await checkUpdate();
      const info = null as any;
      if (!info?.available) {
        Notice.success(t("Currently on the Latest Version"));
      } else {
        updateRef.current?.open();
      }
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
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
    <FluentSettingList title={t("Verge Setting")}>
      <ThemeViewer ref={themeRef} />
      <ConfigViewer ref={configRef} />
      <HotkeyViewer ref={hotkeyRef} />
      <MiscViewer ref={miscRef} />
      <LayoutViewer ref={layoutRef} />
      <UpdateViewer ref={updateRef} />
      <BackupViewer ref={backupRef} />

      <FluentSettingItem label={t("Language")}>
        <GuardState
          // value={language ?? "en"}
          value={{ language: language ?? "en" }}
          onCatch={onError}
          // onFormat={(e: any) => e.target.value}
          {...fluentGuardStateProps}
          onChange={(e) => onChangeData({ language: e })}
          onGuard={(e) => patchVerge({ language: e })}
        >
          {/* <Select size="small" sx={{ width: 110, "> div": { py: "7.5px" } }}>
            {languageOptions.map(({ code, label }) => (
              <MenuItem key={code} value={code}>
                {label}
              </MenuItem>
            ))}
          </Select> */}
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

      {OS !== "linux" && (
        <FluentSettingItem label={t("Tray Click Event")}>
          <GuardState
            // value={tray_event ?? "main_window"}
            value={{ tray: tray_event ?? "main_window" }}
            onCatch={onError}
            // onFormat={(e: any) => e.target.value}
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

      <FluentSettingItem
        label={t("Copy Env Type")}
        // extra={
        //   <FluentTooltipIcon icon={ContentCopyRounded} onClick={onCopyClashEnv} />
        // }
      >
        <GuardState
          // value={env_type ?? (OS === "windows" ? "powershell" : "bash")}
          value={{
            env_type: env_type ?? (OS === "windows" ? "powershell" : "bash"),
          }}
          onCatch={onError}
          // onFormat={(e: any) => e.target.value}
          {...fluentGuardStateProps}
          onChange={(e) => onChangeData({ env_type: e })}
          onGuard={(e) => patchVerge({ env_type: e })}
        >
          {/* <Select size="small" sx={{ width: 140, "> div": { py: "7.5px" } }}>
            <MenuItem value="bash">Bash</MenuItem>
            <MenuItem value="cmd">CMD</MenuItem>
            <MenuItem value="nushell">Nushell</MenuItem>
            <MenuItem value="powershell">PowerShell</MenuItem>
          </Select> */}
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
          // value={start_page ?? "/"}
          value={{ start_page: start_page ?? "/" }}
          onCatch={onError}
          // onFormat={(e: any) => e.target.value}
          {...fluentGuardStateProps}
          onChange={(e) => onChangeData({ start_page: e })}
          onGuard={(e) => patchVerge({ start_page: e })}
        >
          {/* <Select size="small" sx={{ width: 140, "> div": { py: "7.5px" } }}>
            {routers.map((page: { label: string; path: string }) => {
              return <MenuItem value={page.path}>{t(page.label)}</MenuItem>;
            })}
          </Select> */}
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
        onClick={() => themeRef.current?.open()}
        label={t("Theme Setting")}
      />

      <FluentSettingItem
        onClick={() => layoutRef.current?.open()}
        label={t("Layout Setting")}
      />

      <FluentSettingItem
        onClick={() => miscRef.current?.open()}
        label={t("Miscellaneous")}
      />

      <FluentSettingItem
        onClick={() => hotkeyRef.current?.open()}
        label={t("Hotkey Setting")}
      />

      <FluentSettingItem
        label={t("Local Backup")}
        canExpand
        content={<LocalBackupViewer ref={localBackupRef} />}
      />

      <FluentSettingItem
        label={t("Export Diagnostic Info")}
        onClick={async () => {
          try {
            await exportDiagnosticInfo();
            Notice.success(t("Diagnostic Info Exported"), 1000);
          } catch (err: any) {
            Notice.error(err?.message || err?.toString());
          }
        }}
      />

      <FluentSettingItem
        onClick={() => backupRef.current?.open()}
        label={t("Backup Setting")}
        extra={
          <FluentTooltipIcon
            title={t("Backup Setting Info")}
            sx={{ opacity: "0.7" }}
          />
        }
      />

      <FluentSettingItem
        onClick={() => configRef.current?.open()}
        label={t("Runtime Config")}
      />

      <FluentSettingItem
        onClick={openAppDir}
        label={t("Open Conf Dir")}
        extra={
          <FluentTooltipIcon
            title={t("Open Conf Dir Info")}
            sx={{ opacity: "0.7" }}
          />
        }
      />

      <FluentSettingItem onClick={openCoreDir} label={t("Open Core Dir")} />

      <FluentSettingItem onClick={openLogsDir} label={t("Open Logs Dir")} />

      <FluentSettingItem
        onClick={onCheckUpdate}
        label={t("Check for Updates")}
      />

      <FluentSettingItem onClick={openDevTools} label={t("Open Dev Tools")} />

      <FluentSettingItem
        onClick={() => {
          exitApp();
        }}
        label={t("Exit")}
      />

      <div
        style={{
          paddingBlock: 32,
          paddingRight: 12,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Body2>v{version}</Body2>
      </div>
    </FluentSettingList>
  );
};

export default SettingVerge;
