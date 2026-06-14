import { forwardRef, useImperativeHandle, useState } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { useClash } from "@/hooks/use-clash";
import { DialogRef, Notice } from "@/components/base";
import { FluentModeSwitch } from "./stack-mode-switch";
import { Expander } from "../../fluent/expander";
import { enhanceProfiles } from "@/services/cmds";
import {
  Switch as FluentSwitch,
  Button as FluentButton,
  Input,
} from "@fluentui/react-components";

export const TunViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();

  const { clash, mutateClash, patchClash } = useClash();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    stack: "mixed",
    device: "Mihomo",
    autoRoute: true,
    autoDetectInterface: true,
    dnsHijack: ["any:53"],
    strictRoute: false,
    mtu: 1500,
  });

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      setValues({
        stack: clash?.tun.stack ?? "mixed",
        device: clash?.tun.device ?? "Mihomo",
        autoRoute: clash?.tun["auto-route"] ?? true,
        autoDetectInterface: clash?.tun["auto-detect-interface"] ?? true,
        dnsHijack: clash?.tun["dns-hijack"] ?? ["any:53"],
        strictRoute: clash?.tun["strict-route"] ?? false,
        mtu: clash?.tun.mtu ?? 1500,
      });
    },
    close: () => setOpen(false),
  }));

  const onSave = useLockFn(async () => {
    try {
      let tun = {
        stack: values.stack,
        device: values.device === "" ? "Mihomo" : values.device,
        "auto-route": values.autoRoute,
        "auto-detect-interface": values.autoDetectInterface,
        "dns-hijack": values.dnsHijack[0] === "" ? [] : values.dnsHijack,
        "strict-route": values.strictRoute,
        mtu: values.mtu ?? 1500,
      };
      await patchClash({ tun });
      await mutateClash(
        (old) => ({
          ...(old! || {}),
          tun,
        }),
        false,
      );
      try {
        await enhanceProfiles();
        Notice.success(t("Settings Applied"), 1000);
      } catch (err: any) {
        Notice.error(err.message || err.toString(), 3000);
      }
      setOpen(false);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  return (
    <>
      <Expander
        left={t("Stack")}
        right={
          <FluentModeSwitch
            value={values.stack}
            onChange={(value) => {
              setValues((v) => ({
                ...v,
                stack: value,
              }));
            }}
          />
        }
      ></Expander>

      <Expander
        left={t("Device")}
        right={
          <Input
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={values.device}
            placeholder="Mihomo"
            onChange={(_, data) =>
              setValues((v) => ({ ...v, device: data.value }))
            }
          />
        }
      ></Expander>

      <Expander
        left={t("Auto Route")}
        right={
          <FluentSwitch
            checked={values.autoRoute}
            onChange={(_, c) =>
              setValues((v) => ({ ...v, autoRoute: c.checked }))
            }
          />
        }
      ></Expander>

      <Expander
        left={t("Strict Route")}
        right={
          <FluentSwitch
            checked={values.strictRoute}
            onChange={(_, c) =>
              setValues((v) => ({ ...v, strictRoute: c.checked }))
            }
          />
        }
      ></Expander>

      <Expander
        left={t("Auto Detect Interface")}
        right={
          <FluentSwitch
            checked={values.autoDetectInterface}
            onChange={(_, c) =>
              setValues((v) => ({ ...v, autoDetectInterface: c.checked }))
            }
          />
        }
      ></Expander>

      <Expander
        left={t("DNS Hijack")}
        right={
          <Input
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={values.dnsHijack.join(",")}
            placeholder="Please use , to separate multiple DNS servers"
            onChange={(_, data) =>
              setValues((v) => ({ ...v, dnsHijack: data.value.split(",") }))
            }
          />
        }
      ></Expander>

      <Expander
        left={t("MTU")}
        right={
          <Input
            autoComplete="new-password"
            type="number"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={values.mtu + ""}
            placeholder="1500"
            onChange={(_, data) =>
              setValues((v) => ({
                ...v,
                mtu: parseInt(data.value),
              }))
            }
          />
        }
      ></Expander>

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
      ></Expander>
    </>
  );
});
