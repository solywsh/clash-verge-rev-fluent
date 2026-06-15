import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Label,
  Select,
  Switch as FluentSwitch,
} from "@fluentui/react-components";
import { useVerge } from "@/hooks/use-verge";
import { BaseDialog, DialogRef, Notice } from "@/components/base";
import { GuardState } from "./guard-state";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { copyIconFile, getAppDir } from "@/services/cmds";
import { join } from "@tauri-apps/api/path";
import { exists } from "@tauri-apps/plugin-fs";
import getSystem from "@/utils/get-system";

const OS = getSystem();

export const LayoutViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const { verge, patchVerge, mutateVerge } = useVerge();

  const [open, setOpen] = useState(false);
  const [commonIcon, setCommonIcon] = useState("");
  const [sysproxyIcon, setSysproxyIcon] = useState("");
  const [tunIcon, setTunIcon] = useState("");

  useEffect(() => {
    initIconPath();
  }, []);

  async function initIconPath() {
    const appDir = await getAppDir();
    const icon_dir = await join(appDir, "icons");
    const common_icon_png = await join(icon_dir, "common.png");
    const common_icon_ico = await join(icon_dir, "common.ico");
    const sysproxy_icon_png = await join(icon_dir, "sysproxy.png");
    const sysproxy_icon_ico = await join(icon_dir, "sysproxy.ico");
    const tun_icon_png = await join(icon_dir, "tun.png");
    const tun_icon_ico = await join(icon_dir, "tun.ico");
    if (await exists(common_icon_ico)) {
      setCommonIcon(common_icon_ico);
    } else {
      setCommonIcon(common_icon_png);
    }
    if (await exists(sysproxy_icon_ico)) {
      setSysproxyIcon(sysproxy_icon_ico);
    } else {
      setSysproxyIcon(sysproxy_icon_png);
    }
    if (await exists(tun_icon_ico)) {
      setTunIcon(tun_icon_ico);
    } else {
      setTunIcon(tun_icon_png);
    }
  }

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  const onSwitchFormat = (_e: any, data: { checked: boolean }) => data.checked;
  const onError = (err: any) => {
    Notice.error(err.message || err.toString());
  };
  const onChangeData = (patch: Partial<IVergeConfig>) => {
    mutateVerge({ ...verge, ...patch }, false);
  };

  return (
    <BaseDialog
      open={open}
      title={t("Layout Setting")}
      contentSx={{ width: 450 }}
      disableOk
      cancelBtn={t("Close")}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={rowStyle}>
          <Label>{t("Traffic Graph")}</Label>
          <GuardState
            value={verge?.traffic_graph ?? true}
            valueProps="checked"
            onCatch={onError}
            onFormat={onSwitchFormat}
            onChange={(e) => onChangeData({ traffic_graph: e })}
            onGuard={(e) => patchVerge({ traffic_graph: e })}
          >
            <FluentSwitch />
          </GuardState>
        </div>

        <div style={rowStyle}>
          <Label>{t("Memory Usage")}</Label>
          <GuardState
            value={verge?.enable_memory_usage ?? true}
            valueProps="checked"
            onCatch={onError}
            onFormat={onSwitchFormat}
            onChange={(e) => onChangeData({ enable_memory_usage: e })}
            onGuard={(e) => patchVerge({ enable_memory_usage: e })}
          >
            <FluentSwitch />
          </GuardState>
        </div>

        <div style={rowStyle}>
          <Label>{t("Proxy Group Icon")}</Label>
          <GuardState
            value={verge?.enable_group_icon ?? true}
            valueProps="checked"
            onCatch={onError}
            onFormat={onSwitchFormat}
            onChange={(e) => onChangeData({ enable_group_icon: e })}
            onGuard={(e) => patchVerge({ enable_group_icon: e })}
          >
            <FluentSwitch />
          </GuardState>
        </div>

        <div style={rowStyle}>
          <Label>{t("Nav Icon")}</Label>
          <GuardState
            value={verge?.menu_icon ?? "monochrome"}
            onCatch={onError}
            onFormat={(_e: any, data: any) => data.value}
            onChange={(e) => onChangeData({ menu_icon: e })}
            onGuard={(e) => patchVerge({ menu_icon: e })}
          >
            <Select style={{ width: 140 }}>
              <option value="monochrome">{t("Monochrome")}</option>
              <option value="colorful">{t("Colorful")}</option>
              <option value="disable">{t("Disable")}</option>
            </Select>
          </GuardState>
        </div>

        {OS === "macos" && (
          <div style={rowStyle}>
            <Label>{t("Tray Icon")}</Label>
            <GuardState
              value={verge?.tray_icon ?? "monochrome"}
              onCatch={onError}
              onFormat={(_e: any, data: any) => data.value}
              onChange={(e) => onChangeData({ tray_icon: e })}
              onGuard={(e) => patchVerge({ tray_icon: e })}
            >
              <Select style={{ width: 140 }}>
                <option value="monochrome">{t("Monochrome")}</option>
                <option value="colorful">{t("Colorful")}</option>
              </Select>
            </GuardState>
          </div>
        )}
        {OS === "macos" && (
          <div style={rowStyle}>
            <Label>{t("Enable Tray Speed")}</Label>
            <GuardState
              value={verge?.enable_tray_speed ?? true}
              valueProps="checked"
              onCatch={onError}
              onFormat={onSwitchFormat}
              onChange={(e) => onChangeData({ enable_tray_speed: e })}
              onGuard={(e) => patchVerge({ enable_tray_speed: e })}
            >
              <FluentSwitch />
            </GuardState>
          </div>
        )}

        <div style={rowStyle}>
          <Label>{t("Common Tray Icon")}</Label>
          <Button
            appearance="outline"
            icon={
              verge?.common_tray_icon && commonIcon ? (
                <img height="20px" src={convertFileSrc(commonIcon)} />
              ) : undefined
            }
            onClick={async () => {
              if (verge?.common_tray_icon) {
                onChangeData({ common_tray_icon: false });
                patchVerge({ common_tray_icon: false });
              } else {
                const selected = await openDialog({
                  directory: false,
                  multiple: false,
                  filters: [
                    {
                      name: "Tray Icon Image",
                      extensions: ["png", "ico"],
                    },
                  ],
                });
                if (selected) {
                  await copyIconFile(`${selected}`, "common");
                  await initIconPath();
                  onChangeData({ common_tray_icon: true });
                  patchVerge({ common_tray_icon: true });
                }
              }
            }}
          >
            {verge?.common_tray_icon ? t("Clear") : t("Browse")}
          </Button>
        </div>

        <div style={rowStyle}>
          <Label>{t("System Proxy Tray Icon")}</Label>
          <Button
            appearance="outline"
            icon={
              verge?.sysproxy_tray_icon && sysproxyIcon ? (
                <img height="20px" src={convertFileSrc(sysproxyIcon)} />
              ) : undefined
            }
            onClick={async () => {
              if (verge?.sysproxy_tray_icon) {
                onChangeData({ sysproxy_tray_icon: false });
                patchVerge({ sysproxy_tray_icon: false });
              } else {
                const selected = await openDialog({
                  directory: false,
                  multiple: false,
                  filters: [
                    {
                      name: "Tray Icon Image",
                      extensions: ["png", "ico"],
                    },
                  ],
                });
                if (selected) {
                  await copyIconFile(`${selected}`, "sysproxy");
                  await initIconPath();
                  onChangeData({ sysproxy_tray_icon: true });
                  patchVerge({ sysproxy_tray_icon: true });
                }
              }
            }}
          >
            {verge?.sysproxy_tray_icon ? t("Clear") : t("Browse")}
          </Button>
        </div>

        <div style={rowStyle}>
          <Label>{t("Tun Tray Icon")}</Label>
          <Button
            appearance="outline"
            icon={
              verge?.tun_tray_icon && tunIcon ? (
                <img height="20px" src={convertFileSrc(tunIcon)} />
              ) : undefined
            }
            onClick={async () => {
              if (verge?.tun_tray_icon) {
                onChangeData({ tun_tray_icon: false });
                patchVerge({ tun_tray_icon: false });
              } else {
                const selected = await openDialog({
                  directory: false,
                  multiple: false,
                  filters: [
                    {
                      name: "Tun Icon Image",
                      extensions: ["png", "ico"],
                    },
                  ],
                });
                if (selected) {
                  await copyIconFile(`${selected}`, "tun");
                  await initIconPath();
                  onChangeData({ tun_tray_icon: true });
                  patchVerge({ tun_tray_icon: true });
                }
              }
            }}
          >
            {verge?.tun_tray_icon ? t("Clear") : t("Browse")}
          </Button>
        </div>
      </div>
    </BaseDialog>
  );
});

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "5px 2px",
};
