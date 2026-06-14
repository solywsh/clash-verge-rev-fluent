import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import useSWRSubscription from "swr/subscription";
import { useLockFn } from "ahooks";
import {
  Body1,
  Caption1,
  Button,
  Switch,
  makeStyles,
  Spinner,
  ProgressBar,
} from "@fluentui/react-components";
import dayjs from "dayjs";
import {
  ArrowUploadRegular,
  ArrowDownloadRegular,
  PlugConnectedRegular,
  ArrowSyncRegular,
  EyeRegular,
  EyeOffRegular,
} from "@fluentui/react-icons";
import { EnhancedCard } from "./enhanced-card";
import { tokens } from "../../pages/_fluent_theme";
import parseTraffic from "@/utils/parse-traffic";
import { createMihomoWs } from "@/utils/websocket";
import { getRules, getIpInfo, IpInfo, getClashConfig } from "@/services/api";
import {
  getAppUptime,
  getSystemInfo,
  getRunningMode,
  appIsAdmin,
  patchClashConfig,
} from "@/services/cmds";
import { closeAllConnections } from "tauri-plugin-mihomo-api";
import { useClash } from "@/hooks/use-clash";
import { useClashInfo } from "@/hooks/use-clash";
import { useVerge } from "@/hooks/use-verge";
import { useProfiles } from "@/hooks/use-profiles";
import { useVisibility } from "@/hooks/use-visibility";
import { version as appVersion } from "@root/package.json";

const useStyles = makeStyles({
  rows: { display: "flex", flexDirection: "column", gap: "8px" },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  label: { color: tokens.colorNeutralForeground3 },
  value: {
    color: tokens.colorNeutralForeground1,
    textAlign: "right",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "60%",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  stat: { display: "flex", flexDirection: "column", gap: "2px" },
  statValue: { fontWeight: 600 },
  modeRow: { display: "flex", gap: "8px" },
  // minWidth:0 lets the 3 buttons shrink below Fluent's default 96px min-width
  // so they share the card width evenly instead of overflowing on narrow cards.
  modeBtn: { flex: 1, minWidth: 0 },
});

const Row = ({ label, value }: { label: ReactNode; value: ReactNode }) => {
  const c = useStyles();
  return (
    <div className={c.row}>
      <Caption1 className={c.label}>{label}</Caption1>
      <Body1 className={c.value}>{value}</Body1>
    </div>
  );
};

const formatUptime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
};

// ---------------- Traffic stats ----------------
export const TrafficStatsCard = () => {
  const { t } = useTranslation();
  const c = useStyles();
  const { clashInfo } = useClashInfo();
  const pageVisible = useVisibility();

  const { data: traffic = { up: 0, down: 0 } } = useSWRSubscription<
    ITrafficItem,
    any,
    "home-traffic" | null
  >(
    clashInfo && pageVisible ? "home-traffic" : null,
    (_key, { next }) => {
      const s = createMihomoWs(
        { stream: "traffic" },
        {
          onmessage(event) {
            next(null, JSON.parse(event.data) as ITrafficItem);
          },
          onerror(err) {
            s.close();
            next(err, { up: 0, down: 0 });
          },
        },
      );
      return () => s.close();
    },
    { fallbackData: { up: 0, down: 0 }, keepPreviousData: true },
  );

  const { data: memory = { inuse: 0 } } = useSWRSubscription<
    { inuse: number },
    any,
    "home-memory" | null
  >(
    clashInfo && pageVisible ? "home-memory" : null,
    (_key, { next }) => {
      const s = createMihomoWs(
        { stream: "memory" },
        {
          onmessage(event) {
            next(null, JSON.parse(event.data) as { inuse: number });
          },
          onerror(err) {
            s.close();
            next(err, { inuse: 0 });
          },
        },
      );
      return () => s.close();
    },
    { fallbackData: { inuse: 0 }, keepPreviousData: true },
  );

  const { data: conn = { downloadTotal: 0, uploadTotal: 0, count: 0 } } =
    useSWRSubscription<
      { downloadTotal: number; uploadTotal: number; count: number },
      any,
      "home-connections" | null
    >(
      clashInfo && pageVisible ? "home-connections" : null,
      (_key, { next }) => {
        const s = createMihomoWs(
          { stream: "connections" },
          {
            onmessage(event) {
              const d = JSON.parse(event.data) as any;
              next(null, {
                downloadTotal: d.downloadTotal ?? 0,
                uploadTotal: d.uploadTotal ?? 0,
                count: d.connections?.length ?? 0,
              });
            },
            onerror(err) {
              s.close();
              next(err, { downloadTotal: 0, uploadTotal: 0, count: 0 });
            },
          },
        );
        return () => s.close();
      },
      {
        fallbackData: { downloadTotal: 0, uploadTotal: 0, count: 0 },
        keepPreviousData: true,
      },
    );

  const stat = (label: string, value: string, unit?: string) => (
    <div className={c.stat}>
      <Caption1 className={c.label}>{label}</Caption1>
      <Body1 className={c.statValue}>
        {value}
        {unit ? ` ${unit}` : ""}
      </Body1>
    </div>
  );

  const [up, upU] = parseTraffic(traffic.up);
  const [down, downU] = parseTraffic(traffic.down);
  const [mem, memU] = parseTraffic(memory.inuse);
  const [ulTotal, ulTotalU] = parseTraffic(conn.uploadTotal);
  const [dlTotal, dlTotalU] = parseTraffic(conn.downloadTotal);

  return (
    <EnhancedCard title={t("Traffic")} icon={<ArrowDownloadRegular />}>
      <div className={c.stats}>
        {stat(t("Upload"), up, `${upU}/s`)}
        {stat(t("Download"), down, `${downU}/s`)}
        {stat(t("Upload Total"), ulTotal, ulTotalU)}
        {stat(t("Download Total"), dlTotal, dlTotalU)}
        {stat(t("Active Connections"), String(conn.count))}
        {stat(t("Memory Usage"), mem, memU)}
      </div>
    </EnhancedCard>
  );
};

// ---------------- Clash info ----------------
export const ClashInfoCard = () => {
  const { t } = useTranslation();
  const { clash, version } = useClash();
  const { data: rules = [] } = useSWR("getRules", getRules);
  const { data: uptime = 0 } = useSWR("getAppUptime", getAppUptime, {
    refreshInterval: 1000,
  });

  return (
    <EnhancedCard title={t("Clash Info")} icon={<PlugConnectedRegular />}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Row label={t("Core Version")} value={version} />
        <Row label={t("Mixed Port")} value={clash?.["mixed-port"] ?? "-"} />
        <Row label={t("Rules")} value={rules.length} />
        <Row label={t("Uptime")} value={formatUptime(uptime)} />
      </div>
    </EnhancedCard>
  );
};

// ---------------- Clash mode ----------------
const MODES = ["rule", "global", "direct"] as const;
export const ClashModeCard = () => {
  const { t } = useTranslation();
  const c = useStyles();
  const { verge } = useVerge();
  // Read from the live core base config (same SWR key as the Proxies page),
  // so the selected state stays in sync and updates after switching.
  const { data: clashConfig, mutate: mutateClashConfig } = useSWR(
    "getClashConfig",
    getClashConfig,
  );
  const current = clashConfig?.mode?.toLowerCase() ?? "rule";

  const onChange = useLockFn(async (mode: string) => {
    if (mode === current) return;
    // Optimistic: highlight the picked mode immediately, don't wait for the IPC.
    mutateClashConfig({ ...(clashConfig as any), mode }, false);
    if (verge?.auto_close_connection) {
      closeAllConnections().catch(() => {});
    }
    try {
      await patchClashConfig({ mode });
    } finally {
      mutateClashConfig();
    }
  });

  return (
    <EnhancedCard title={t("Proxy Mode")} icon={<ArrowSyncRegular />}>
      <div className={c.modeRow}>
        {MODES.map((m) => (
          <Button
            key={m}
            className={c.modeBtn}
            appearance={current === m ? "primary" : "outline"}
            onClick={() => onChange(m)}
          >
            {t(m)}
          </Button>
        ))}
      </div>
    </EnhancedCard>
  );
};

// ---------------- Home profile ----------------
export const HomeProfileCard = () => {
  const { t } = useTranslation();
  const { profiles } = useProfiles();
  const current = profiles?.items?.find((p) => p.uid === profiles?.current);
  const extra = current?.extra;
  const used = extra ? extra.upload + extra.download : 0;
  const total = extra?.total ?? 0;
  const [usedStr, usedU] = parseTraffic(used);
  const [totalStr, totalU] = parseTraffic(total);
  const ratio = total > 0 ? Math.min(used / total, 1) : 0;
  const percent = total > 0 ? Math.round(ratio * 100) : 0;

  return (
    <EnhancedCard title={t("Current Profile")} icon={<ArrowSyncRegular />}>
      {current ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Row label={t("Name")} value={current.name ?? "-"} />
          {current.updated ? (
            <Row
              label={t("Update Time")}
              value={dayjs(current.updated * 1000).format("YYYY-MM-DD HH:mm")}
            />
          ) : null}
          {extra?.expire ? (
            <Row
              label={t("Expire Time")}
              value={dayjs(extra.expire * 1000).format("YYYY-MM-DD")}
            />
          ) : null}
          {total > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                marginTop: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                  {t("Traffic Usage")}
                </Caption1>
                <Caption1 style={{ color: tokens.colorNeutralForeground2 }}>
                  {`${usedStr}${usedU} / ${totalStr}${totalU} (${percent}%)`}
                </Caption1>
              </div>
              <ProgressBar
                value={ratio}
                color={
                  ratio >= 0.9 ? "error" : ratio >= 0.7 ? "warning" : "brand"
                }
                thickness="large"
              />
            </div>
          )}
        </div>
      ) : (
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          {t("No Profile")}
        </Caption1>
      )}
    </EnhancedCard>
  );
};

// ---------------- Proxy / TUN ----------------
export const ProxyTunCard = () => {
  const { t } = useTranslation();
  const c = useStyles();
  const { verge, patchVerge } = useVerge();

  const toggle = useLockFn(
    async (key: "enable_system_proxy" | "enable_tun_mode", v: boolean) => {
      await patchVerge({ [key]: v });
    },
  );

  return (
    <EnhancedCard title={t("Network")} icon={<PlugConnectedRegular />}>
      <div className={c.rows}>
        <div className={c.row}>
          <Caption1 className={c.label}>{t("System Proxy")}</Caption1>
          <Switch
            checked={verge?.enable_system_proxy ?? false}
            onChange={(_, d) => toggle("enable_system_proxy", d.checked)}
          />
        </div>
        <div className={c.row}>
          <Caption1 className={c.label}>{t("Tun Mode")}</Caption1>
          <Switch
            checked={verge?.enable_tun_mode ?? false}
            onChange={(_, d) => toggle("enable_tun_mode", d.checked)}
          />
        </div>
      </div>
    </EnhancedCard>
  );
};

// ---------------- IP info ----------------
const countryFlag = (code: string) => {
  if (!code || code.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65),
  );
};

export const IpInfoCard = () => {
  const { t } = useTranslation();
  const [showIp, setShowIp] = useState(false);
  const {
    data: ip,
    isLoading,
    mutate,
  } = useSWR<IpInfo>("getIpInfo", getIpInfo, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return (
    <EnhancedCard
      title={t("IP Information")}
      icon={<span>{ip ? countryFlag(ip.country_code) : "🌐"}</span>}
      action={
        <Button
          appearance="subtle"
          size="small"
          icon={<ArrowSyncRegular />}
          onClick={() => mutate()}
        />
      }
    >
      {isLoading ? (
        <Spinner size="tiny" />
      ) : ip ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
          >
            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
              IP
            </Caption1>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Body1>{showIp ? ip.ip : "••••••••"}</Body1>
              <Button
                appearance="subtle"
                size="small"
                icon={showIp ? <EyeOffRegular /> : <EyeRegular />}
                onClick={() => setShowIp((s) => !s)}
              />
            </span>
          </div>
          <Row label={t("Country")} value={`${ip.country || "-"}`} />
          <Row label={t("ISP")} value={ip.organization || "-"} />
          {ip.asn ? <Row label="ASN" value={`AS${ip.asn}`} /> : null}
          <Row
            label={t("Location")}
            value={[ip.city, ip.region].filter(Boolean).join(", ") || "-"}
          />
        </div>
      ) : (
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          {t("Failed to fetch")}
        </Caption1>
      )}
    </EnhancedCard>
  );
};

// ---------------- System info ----------------
export const SystemInfoCard = () => {
  const { t } = useTranslation();
  const { data: sysInfo = "" } = useSWR("getSystemInfo", getSystemInfo);
  const { data: runningMode = "" } = useSWR("getRunningMode", getRunningMode);
  const { data: isAdmin = false } = useSWR("appIsAdmin", appIsAdmin);

  // get_system_info returns "Key: Value" lines; parse them into a map and show
  // the useful fields (full OS version, arch, kernel) rather than the bare
  // "System Name: Windows" first line.
  const info: Record<string, string> = {};
  sysInfo.split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx > 0) info[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  const osVersion = info["System Version"] || info["System Name"] || "-";
  const arch = info["System Arch"] || "-";
  const kernel = info["System kernel Version"] || "";

  return (
    <EnhancedCard title={t("System Info")} icon={<PlugConnectedRegular />}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Row label={t("OS")} value={osVersion} />
        <Row label={t("Architecture")} value={arch} />
        {kernel ? <Row label={t("Kernel")} value={kernel} /> : null}
        <Row
          label={t("Running Mode")}
          value={isAdmin ? `${runningMode} (admin)` : runningMode || "-"}
        />
        <Row label={t("Verge Version")} value={`v${appVersion}`} />
      </div>
    </EnhancedCard>
  );
};
