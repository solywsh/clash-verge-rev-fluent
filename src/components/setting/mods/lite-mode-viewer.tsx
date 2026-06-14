import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import {
  Switch as FluentSwitch,
  Button as FluentButton,
  Input,
} from "@fluentui/react-components";
import { DialogRef, Notice } from "@/components/base";
import { useVerge } from "@/hooks/use-verge";
import { entryLightweightMode } from "@/services/cmds";
import { Expander } from "../../fluent/expander";
import { FluentTooltipIcon } from "@/components/base/base-tooltip-icon";

export const LiteModeViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const { verge, patchVerge } = useVerge();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    autoEnterLiteMode: false,
    autoEnterLiteModeDelay: 10,
  });

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      setValues({
        autoEnterLiteMode: verge?.enable_auto_light_weight_mode ?? false,
        autoEnterLiteModeDelay: verge?.auto_light_weight_minutes ?? 10,
      });
    },
    close: () => setOpen(false),
  }));

  // Populate from verge when rendered inline (canExpand content)
  useEffect(() => {
    setValues({
      autoEnterLiteMode: verge?.enable_auto_light_weight_mode ?? false,
      autoEnterLiteModeDelay: verge?.auto_light_weight_minutes ?? 10,
    });
  }, [verge?.enable_auto_light_weight_mode, verge?.auto_light_weight_minutes]);

  const onSave = useLockFn(async () => {
    try {
      await patchVerge({
        enable_auto_light_weight_mode: values.autoEnterLiteMode,
        auto_light_weight_minutes: values.autoEnterLiteModeDelay,
      });
      Notice.success(t("Settings Applied"), 1000);
      setOpen(false);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  return (
    <>
      <Expander
        left={t("Enter LightWeight Mode Now")}
        right={
          <FluentButton
            appearance="primary"
            onClick={async () => {
              try {
                await entryLightweightMode();
              } catch (err: any) {
                Notice.error(err.message || err.toString());
              }
            }}
          >
            {t("Enable")}
          </FluentButton>
        }
      />

      <Expander
        left={t("Auto Enter LightWeight Mode")}
        right={
          <>
            <FluentTooltipIcon title={t("Auto Enter LightWeight Mode Info")} />
            <FluentSwitch
              checked={values.autoEnterLiteMode}
              onChange={(_, c) =>
                setValues((v) => ({ ...v, autoEnterLiteMode: c.checked }))
              }
            />
          </>
        }
      />

      {values.autoEnterLiteMode && (
        <Expander
          left={t("Auto Enter LightWeight Mode Delay")}
          right={
            <Input
              type="number"
              autoComplete="off"
              value={values.autoEnterLiteModeDelay + ""}
              contentAfter={t("mins")}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  autoEnterLiteModeDelay: parseInt(e.target.value) || 1,
                }))
              }
            />
          }
        />
      )}

      <Expander
        right={
          <FluentButton
            appearance="primary"
            onClick={onSave}
            style={{ marginBlock: 4 }}
          >
            {t("Save")}
          </FluentButton>
        }
      />
    </>
  );
});
