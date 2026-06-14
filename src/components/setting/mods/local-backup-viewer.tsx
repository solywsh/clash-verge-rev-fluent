import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  open as openDialog,
  save as saveDialog,
} from "@tauri-apps/plugin-dialog";
import {
  Button as FluentButton,
  Caption1,
  Body1,
} from "@fluentui/react-components";
import {
  DeleteRegular,
  ArrowDownloadRegular,
  ArrowUploadRegular,
  ArrowResetRegular,
  AddRegular,
} from "@fluentui/react-icons";
import { DialogRef, Notice } from "@/components/base";
import {
  createLocalBackup,
  listLocalBackup,
  deleteLocalBackup,
  restoreLocalBackup,
  importLocalBackup,
  exportLocalBackup,
} from "@/services/cmds";
import { Expander } from "../../fluent/expander";
import { tokens } from "../../../pages/_fluent_theme";

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const LocalBackupViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<ILocalBackupFile[]>([]);

  const refresh = useCallback(async () => {
    try {
      const list = await listLocalBackup();
      setFiles(list ?? []);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      void refresh();
    },
    close: () => setOpen(false),
  }));

  // Load list when rendered inline (canExpand content)
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreate = useLockFn(async () => {
    try {
      await createLocalBackup();
      Notice.success(t("Backup Created"), 1000);
      await refresh();
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  const onImport = useLockFn(async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "Backup", extensions: ["zip"] }],
      });
      if (typeof selected !== "string") return;
      await importLocalBackup(selected);
      Notice.success(t("Backup Imported"), 1000);
      await refresh();
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  const onExport = useLockFn(async (filename: string) => {
    try {
      const destination = await saveDialog({
        defaultPath: filename,
        filters: [{ name: "Backup", extensions: ["zip"] }],
      });
      if (!destination) return;
      await exportLocalBackup(filename, destination);
      Notice.success(t("Backup Exported"), 1000);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  const onRestore = useLockFn(async (filename: string) => {
    try {
      await restoreLocalBackup(filename);
      Notice.success(t("Backup Restored"), 1000);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  const onDelete = useLockFn(async (filename: string) => {
    try {
      await deleteLocalBackup(filename);
      await refresh();
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  return (
    <>
      <Expander
        left={t("Local Backup")}
        right={
          <>
            <FluentButton
              appearance="subtle"
              icon={<ArrowUploadRegular />}
              onClick={onImport}
            >
              {t("Import")}
            </FluentButton>
            <FluentButton
              appearance="primary"
              icon={<AddRegular />}
              onClick={onCreate}
            >
              {t("Create Backup")}
            </FluentButton>
          </>
        }
      />

      {files.length === 0 ? (
        <Caption1
          style={{
            display: "block",
            color: tokens.colorNeutralForeground3,
            padding: "8px",
          }}
        >
          {t("No Backups")}
        </Caption1>
      ) : (
        files.map((file) => (
          <Expander
            key={file.filename}
            left={
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Body1>{file.filename}</Body1>
                <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                  {`${dayjs(file.last_modified).format(
                    "YYYY-MM-DD HH:mm:ss",
                  )} · ${formatSize(file.content_length)}`}
                </Caption1>
              </div>
            }
            right={
              <>
                <FluentButton
                  appearance="subtle"
                  icon={<ArrowResetRegular />}
                  title={t("Restore")}
                  onClick={() => onRestore(file.filename)}
                />
                <FluentButton
                  appearance="subtle"
                  icon={<ArrowDownloadRegular />}
                  title={t("Export")}
                  onClick={() => onExport(file.filename)}
                />
                <FluentButton
                  appearance="subtle"
                  icon={<DeleteRegular />}
                  title={t("Delete")}
                  onClick={() => onDelete(file.filename)}
                />
              </>
            }
          />
        ))
      )}
    </>
  );
});
