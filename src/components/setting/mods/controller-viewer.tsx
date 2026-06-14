import { forwardRef, useImperativeHandle, useState } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { Input, Label } from "@fluentui/react-components";
import { useClashInfo } from "@/hooks/use-clash";
import { BaseDialog, DialogRef, Notice } from "@/components/base";

export const ControllerViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const { clashInfo, patchInfo } = useClashInfo();

  const [controller, setController] = useState(clashInfo?.server || "");
  const [secret, setSecret] = useState(clashInfo?.secret || "");

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      setController(clashInfo?.server || "");
      setSecret(clashInfo?.secret || "");
    },
    close: () => setOpen(false),
  }));

  const onSave = useLockFn(async () => {
    try {
      await patchInfo({ "external-controller": controller, secret });
      Notice.success(t("External Controller Address Modified"), 1000);
      setOpen(false);
    } catch (err: any) {
      Notice.error(err.message || err.toString(), 4000);
    }
  });

  return (
    <BaseDialog
      open={open}
      title={t("External Controller")}
      contentSx={{ width: 400 }}
      okBtn={t("Save")}
      cancelBtn={t("Cancel")}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      onOk={onSave}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Label>{t("External Controller")}</Label>
          <Input
            autoComplete="new-password"
            style={{ width: 175 }}
            value={controller}
            placeholder="Required"
            onChange={(_, data) => setController(data.value)}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Label>{t("Core Secret")}</Label>
          <Input
            autoComplete="new-password"
            style={{ width: 175 }}
            value={secret}
            placeholder={t("Recommended")}
            onChange={(_, data) =>
              setSecret(data.value?.replace(/[^\x00-\x7F]/g, ""))
            }
          />
        </div>
      </div>
    </BaseDialog>
  );
});
