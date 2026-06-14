import { BaseDialog, DialogRef, Notice } from "@/components/base";
import { BaseFieldset } from "@/components/base/base-fieldset";
import { FluentTooltipIcon } from "@/components/base/base-tooltip-icon";
import { EditorViewer } from "@/components/profile/editor-viewer";
import { useVerge } from "@/hooks/use-verge";
import { getAutotemProxy, getSystemProxy } from "@/services/cmds";
import getSystem from "@/utils/get-system";
import { EditRounded } from "@mui/icons-material";
import {
  Button,
  Input,
  Label,
  Switch as FluentSwitch,
  Text,
  Textarea,
} from "@fluentui/react-components";
import { tokens } from "@/pages/_fluent_theme";
import { useLockFn } from "ahooks";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
const DEFAULT_PAC = `function FindProxyForURL(url, host) {
  return "PROXY 127.0.0.1:%mixed-port%; SOCKS5 127.0.0.1:%mixed-port%; DIRECT;";
}`;

/** NO_PROXY validation */

// *., cdn*., *, etc.
const domain_subdomain_part = String.raw`(?:[a-z0-9\-\*]+\.|\*)*`;
// .*, .cn, .moe, .co*, *
const domain_tld_part = String.raw`(?:\w{2,64}\*?|\*)`;
// *epicgames*, *skk.moe, *.skk.moe, skk.*, sponsor.cdn.skk.moe, *.*, etc.
// also matches 192.168.*, 10.*, 127.0.0.*, etc. (partial ipv4)
const rDomainSimple = domain_subdomain_part + domain_tld_part;

const ipv4_part = String.raw`\d{1,3}`;

const ipv6_part = "(?:[a-fA-F0-9:])+";

const rLocal = `localhost|<local>|localdomain`;

const getValidReg = (isWindows: boolean) => {
  // 127.0.0.1 (full ipv4)
  const rIPv4Unix = String.raw`(?:${ipv4_part}\.){3}${ipv4_part}(?:\/\d{1,2})?`;
  const rIPv4Windows = String.raw`(?:${ipv4_part}\.){3}${ipv4_part}`;

  const rIPv6Unix = String.raw`(?:${ipv6_part}:+)+${ipv6_part}(?:\/\d{1,3})?`;
  const rIPv6Windows = String.raw`(?:${ipv6_part}:+)+${ipv6_part}`;

  const rValidPart = `${rDomainSimple}|${
    isWindows ? rIPv4Windows : rIPv4Unix
  }|${isWindows ? rIPv6Windows : rIPv6Unix}|${rLocal}`;
  const separator = isWindows ? ";" : ",";
  const rValid = String.raw`^(${rValidPart})(?:${separator}\s?(${rValidPart}))*${separator}?$`;

  return new RegExp(rValid);
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "5px 2px",
};

export const SysproxyViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const isWindows = getSystem() === "windows";
  const validReg = useMemo(() => getValidReg(isWindows), [isWindows]);

  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const { verge, patchVerge } = useVerge();

  type SysProxy = Awaited<ReturnType<typeof getSystemProxy>>;
  const [sysproxy, setSysproxy] = useState<SysProxy>();

  type AutoProxy = Awaited<ReturnType<typeof getAutotemProxy>>;
  const [autoproxy, setAutoproxy] = useState<AutoProxy>();

  const {
    enable_system_proxy: enabled,
    proxy_auto_config,
    pac_file_content,
    enable_proxy_guard,
    use_default_bypass,
    system_proxy_bypass,
    proxy_guard_duration,
  } = verge ?? {};

  const [value, setValue] = useState({
    guard: enable_proxy_guard,
    bypass: system_proxy_bypass,
    duration: proxy_guard_duration ?? 10,
    use_default: use_default_bypass ?? true,
    pac: proxy_auto_config,
    pac_content: pac_file_content ?? DEFAULT_PAC,
  });

  const defaultBypass = () => {
    if (isWindows) {
      return "localhost;127.*;192.168.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;<local>";
    }
    if (getSystem() === "linux") {
      return "localhost,127.0.0.1,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,172.29.0.0/16,::1";
    }
    return "127.0.0.1,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,172.29.0.0/16,localhost,*.local,*.crashlytics.com,<local>";
  };

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      setValue({
        guard: enable_proxy_guard,
        bypass: system_proxy_bypass,
        duration: proxy_guard_duration ?? 10,
        use_default: use_default_bypass ?? true,
        pac: proxy_auto_config,
        pac_content: pac_file_content ?? DEFAULT_PAC,
      });
      getSystemProxy().then((p) => setSysproxy(p));
      getAutotemProxy().then((p) => setAutoproxy(p));
    },
    close: () => setOpen(false),
  }));

  const onSave = useLockFn(async () => {
    if (value.duration < 1) {
      Notice.error(t("Proxy Daemon Duration Cannot be Less than 1 Second"));
      return;
    }
    if (value.bypass && !validReg.test(value.bypass)) {
      Notice.error(t("Invalid Bypass Format"));
      return;
    }

    const patch: Partial<IVergeConfig> = {};

    if (value.guard !== enable_proxy_guard) {
      patch.enable_proxy_guard = value.guard;
    }
    if (value.duration !== proxy_guard_duration) {
      patch.proxy_guard_duration = value.duration;
    }
    if (value.bypass !== system_proxy_bypass) {
      patch.system_proxy_bypass = value.bypass;
    }

    if (value.pac !== proxy_auto_config) {
      patch.proxy_auto_config = value.pac;
    }
    if (value.use_default !== use_default_bypass) {
      patch.use_default_bypass = value.use_default;
    }
    if (value.pac_content !== pac_file_content) {
      patch.pac_file_content = value.pac_content;
    }

    try {
      await patchVerge(patch);
      setOpen(false);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  const bypassInvalid = value.bypass ? !validReg.test(value.bypass) : false;

  return (
    <BaseDialog
      open={open}
      title={t("System Proxy Setting")}
      contentSx={{ width: 450, maxHeight: 565 }}
      okBtn={t("Save")}
      cancelBtn={t("Cancel")}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      onOk={onSave}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <BaseFieldset label={t("Current System Proxy")} padding="15px 10px">
          <div style={{ display: "flex", marginTop: 4, gap: 8 }}>
            <Text style={{ flex: "none" }}>{t("Enable status")}</Text>
            <Text>
              {value.pac
                ? autoproxy?.enable
                  ? t("Enabled")
                  : t("Disabled")
                : sysproxy?.enable
                  ? t("Enabled")
                  : t("Disabled")}
            </Text>
          </div>
          {!value.pac && (
            <div style={{ display: "flex", marginTop: 4, gap: 8 }}>
              <Text style={{ flex: "none" }}>{t("Server Addr")}</Text>
              <Text>
                {sysproxy?.server ? sysproxy.server : t("Not available")}
              </Text>
            </div>
          )}
          {value.pac && (
            <div style={{ display: "flex", marginTop: 4, gap: 8 }}>
              <Text style={{ flex: "none" }}>{t("PAC URL")}</Text>
              <Text>{autoproxy?.url || "-"}</Text>
            </div>
          )}
        </BaseFieldset>

        <div style={rowStyle}>
          <Label>{t("Use PAC Mode")}</Label>
          <FluentSwitch
            disabled={!enabled}
            checked={!!value.pac}
            onChange={(_, data) =>
              setValue((v) => ({ ...v, pac: data.checked }))
            }
          />
        </div>

        <div style={rowStyle}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Label>{t("Proxy Guard")}</Label>
            <FluentTooltipIcon title={t("Proxy Guard Info")} />
          </div>
          <FluentSwitch
            disabled={!enabled}
            checked={!!value.guard}
            onChange={(_, data) =>
              setValue((v) => ({ ...v, guard: data.checked }))
            }
          />
        </div>

        <div style={rowStyle}>
          <Label>{t("Guard Duration")}</Label>
          <Input
            disabled={!enabled}
            style={{ width: 100 }}
            value={String(value.duration)}
            contentAfter={<span>s</span>}
            onChange={(_, data) => {
              setValue((v) => ({
                ...v,
                duration: +data.value.replace(/\D/, ""),
              }));
            }}
          />
        </div>

        {!value.pac && (
          <div style={rowStyle}>
            <Label>{t("Always use Default Bypass")}</Label>
            <FluentSwitch
              disabled={!enabled}
              checked={!!value.use_default}
              onChange={(_, data) =>
                setValue((v) => ({ ...v, use_default: data.checked }))
              }
            />
          </div>
        )}

        {!value.pac && !value.use_default && (
          <div style={{ padding: "5px 2px" }}>
            <Label style={{ display: "block", marginBottom: 4 }}>
              {t("Proxy Bypass")}
            </Label>
            <Textarea
              disabled={!enabled}
              rows={4}
              style={{
                width: "100%",
                ...(bypassInvalid
                  ? {
                      outline: `1px solid ${tokens.colorPaletteRedBorderActive}`,
                    }
                  : {}),
              }}
              value={value.bypass ?? ""}
              onChange={(_, data) => {
                setValue((v) => ({ ...v, bypass: data.value }));
              }}
            />
          </div>
        )}

        {!value.pac && value.use_default && (
          <div style={{ padding: "5px 2px" }}>
            <Label style={{ display: "block", marginBottom: 4 }}>
              {t("Bypass")}
            </Label>
            <Textarea
              disabled={true}
              rows={4}
              style={{ width: "100%" }}
              value={defaultBypass()}
            />
          </div>
        )}

        {value.pac && (
          <div style={{ ...rowStyle, alignItems: "start" }}>
            <Label style={{ padding: "3px 0" }}>
              {t("PAC Script Content")}
            </Label>
            <Button
              icon={<EditRounded fontSize="inherit" />}
              onClick={() => {
                setEditorOpen(true);
              }}
            >
              {t("Edit")} PAC
            </Button>
            {editorOpen && (
              <EditorViewer
                open={true}
                title={`${t("Edit")} PAC`}
                initialData={Promise.resolve(value.pac_content ?? "")}
                language="javascript"
                onSave={(_prev, curr) => {
                  let pac = DEFAULT_PAC;
                  if (curr && curr.trim().length > 0) {
                    pac = curr;
                  }
                  setValue((v) => ({ ...v, pac_content: pac }));
                }}
                onClose={() => setEditorOpen(false)}
              />
            )}
          </div>
        )}
      </div>
    </BaseDialog>
  );
});
