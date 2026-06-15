import { forwardRef, useImperativeHandle, useState } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import {
  Input,
  Label,
  Select,
  Switch as FluentSwitch,
} from "@fluentui/react-components";
import { useVerge } from "@/hooks/use-verge";
import { BaseDialog, DialogRef, Notice } from "@/components/base";
import { FluentTooltipIcon } from "@/components/base/base-tooltip-icon";

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "5px 2px",
};

const labelGroupStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
};

export const MiscViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const { verge, patchVerge } = useVerge();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    appLogLevel: "info",
    autoCloseConnection: true,
    autoCheckUpdate: true,
    enableBuiltinEnhanced: true,
    proxyLayoutColumn: 6,
    defaultLatencyTest: "",
    autoLogClean: 0,
    defaultLatencyTimeout: 10000,
  });

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      setValues({
        appLogLevel: verge?.app_log_level ?? "info",
        autoCloseConnection: verge?.auto_close_connection ?? true,
        autoCheckUpdate: verge?.auto_check_update ?? true,
        enableBuiltinEnhanced: verge?.enable_builtin_enhanced ?? true,
        proxyLayoutColumn: verge?.proxy_layout_column || 6,
        defaultLatencyTest: verge?.default_latency_test || "",
        autoLogClean: verge?.auto_log_clean || 0,
        defaultLatencyTimeout: verge?.default_latency_timeout || 10000,
      });
    },
    close: () => setOpen(false),
  }));

  const onSave = useLockFn(async () => {
    try {
      await patchVerge({
        app_log_level: values.appLogLevel,
        auto_close_connection: values.autoCloseConnection,
        auto_check_update: values.autoCheckUpdate,
        enable_builtin_enhanced: values.enableBuiltinEnhanced,
        proxy_layout_column: values.proxyLayoutColumn,
        default_latency_test: values.defaultLatencyTest,
        default_latency_timeout: values.defaultLatencyTimeout,
        auto_log_clean: values.autoLogClean as any,
      });
      setOpen(false);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  return (
    <BaseDialog
      open={open}
      title={t("Miscellaneous")}
      contentSx={{ width: 450 }}
      okBtn={t("Save")}
      cancelBtn={t("Cancel")}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      onOk={onSave}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={rowStyle}>
          <Label>{t("App Log Level")}</Label>
          <Select
            style={{ width: 100 }}
            value={values.appLogLevel}
            onChange={(_, data) =>
              setValues((v) => ({ ...v, appLogLevel: data.value }))
            }
          >
            {["trace", "debug", "info", "warn", "error", "silent"].map((i) => (
              <option value={i} key={i}>
                {i[0].toUpperCase() + i.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </div>

        <div style={rowStyle}>
          <div style={labelGroupStyle}>
            <Label>{t("Auto Close Connections")}</Label>
            <FluentTooltipIcon title={t("Auto Close Connections Info")} />
          </div>
          <FluentSwitch
            checked={values.autoCloseConnection}
            onChange={(_, data) =>
              setValues((v) => ({ ...v, autoCloseConnection: data.checked }))
            }
          />
        </div>

        <div style={rowStyle}>
          <Label>{t("Auto Check Update")}</Label>
          <FluentSwitch
            checked={values.autoCheckUpdate}
            onChange={(_, data) =>
              setValues((v) => ({ ...v, autoCheckUpdate: data.checked }))
            }
          />
        </div>

        <div style={rowStyle}>
          <div style={labelGroupStyle}>
            <Label>{t("Enable Builtin Enhanced")}</Label>
            <FluentTooltipIcon title={t("Enable Builtin Enhanced Info")} />
          </div>
          <FluentSwitch
            checked={values.enableBuiltinEnhanced}
            onChange={(_, data) =>
              setValues((v) => ({ ...v, enableBuiltinEnhanced: data.checked }))
            }
          />
        </div>

        <div style={rowStyle}>
          <Label>{t("Proxy Layout Columns")}</Label>
          <Select
            style={{ width: 135 }}
            value={String(values.proxyLayoutColumn)}
            onChange={(_, data) =>
              setValues((v) => ({
                ...v,
                proxyLayoutColumn: Number(data.value),
              }))
            }
          >
            <option value={6} key={6}>
              {t("Auto Columns")}
            </option>
            {[1, 2, 3, 4, 5].map((i) => (
              <option value={i} key={i}>
                {i}
              </option>
            ))}
          </Select>
        </div>

        <div style={rowStyle}>
          <Label>{t("Auto Log Clean")}</Label>
          <Select
            style={{ width: 135 }}
            value={String(values.autoLogClean)}
            onChange={(_, data) =>
              setValues((v) => ({
                ...v,
                autoLogClean: Number(data.value),
              }))
            }
          >
            {[
              { key: t("Never Clean"), value: 0 },
              { key: t("Retain _n Days", { n: 7 }), value: 1 },
              { key: t("Retain _n Days", { n: 30 }), value: 2 },
              { key: t("Retain _n Days", { n: 90 }), value: 3 },
            ].map((i) => (
              <option key={i.value} value={i.value}>
                {i.key}
              </option>
            ))}
          </Select>
        </div>

        <div style={rowStyle}>
          <div style={labelGroupStyle}>
            <Label>{t("Default Latency Test")}</Label>
            <FluentTooltipIcon title={t("Default Latency Test Info")} />
          </div>
          <Input
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{ width: 250 }}
            value={values.defaultLatencyTest}
            placeholder="http://cp.cloudflare.com/generate_204"
            onChange={(_, data) =>
              setValues((v) => ({ ...v, defaultLatencyTest: data.value }))
            }
          />
        </div>

        <div style={rowStyle}>
          <Label>{t("Default Latency Timeout")}</Label>
          <Input
            autoComplete="new-password"
            type="number"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{ width: 250 }}
            value={String(values.defaultLatencyTimeout)}
            placeholder="10000"
            onChange={(_, data) =>
              setValues((v) => ({
                ...v,
                defaultLatencyTimeout: parseInt(data.value),
              }))
            }
            contentAfter={t("millis")}
          />
        </div>
      </div>
    </BaseDialog>
  );
});
