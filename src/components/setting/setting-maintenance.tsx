import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  exitApp,
  openAppDir,
  openCoreDir,
  openLogsDir,
  openDevTools,
  exportDiagnosticInfo,
} from "@/services/cmds";
import { version } from "@root/package.json";
import { DialogRef, Notice } from "@/components/base";
import { FluentSettingList, FluentSettingItem } from "./mods/setting-comp";
import { ConfigViewer } from "./mods/config-viewer";
import { UpdateViewer } from "./mods/update-viewer";
import { BackupViewer } from "./mods/backup-viewer";
import { LocalBackupViewer } from "./mods/local-backup-viewer";
import { FluentTooltipIcon } from "@/components/base/base-tooltip-icon";
import { Body2 } from "@fluentui/react-components";

interface Props {
  onError?: (err: Error) => void;
}

const SettingMaintenance = ({ onError }: Props) => {
  const { t } = useTranslation();

  const configRef = useRef<DialogRef>(null);
  const updateRef = useRef<DialogRef>(null);
  const backupRef = useRef<DialogRef>(null);
  const localBackupRef = useRef<DialogRef>(null);

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

  return (
    <FluentSettingList title={t("Maintenance")}>
      <ConfigViewer ref={configRef} />
      <UpdateViewer ref={updateRef} />
      <BackupViewer ref={backupRef} />

      <FluentSettingItem
        label={t("Local Backup")}
        canExpand
        content={<LocalBackupViewer ref={localBackupRef} />}
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

export default SettingMaintenance;
