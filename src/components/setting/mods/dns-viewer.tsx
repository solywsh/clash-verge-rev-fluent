import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import {
  Switch as FluentSwitch,
  Button as FluentButton,
  Input,
  Textarea,
  Select,
  Caption1,
} from "@fluentui/react-components";
import { DialogRef, Notice } from "@/components/base";
import { useClash } from "@/hooks/use-clash";
import {
  saveDnsConfig,
  validateDnsConfig,
  applyDnsConfig,
  checkDnsConfigExists,
  getDnsConfigContent,
} from "@/services/cmds";
import { Expander } from "../../fluent/expander";
import { tokens } from "../../../pages/_fluent_theme";
import yaml from "js-yaml";

type NameserverPolicy = Record<string, any>;

function parseNameserverPolicy(str: string): NameserverPolicy {
  const result: NameserverPolicy = {};
  if (!str) return result;
  const ruleRegex = /\s*([^=]+?)\s*=\s*([^,]+)(?:,|$)/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRegex.exec(str)) !== null) {
    const [, domainsPart, serversPart] = match;
    const servers = serversPart.split(";").map((s) => s.trim());
    result[domainsPart.trim()] = servers;
  }
  return result;
}

function formatNameserverPolicy(policy: unknown): string {
  if (!policy || typeof policy !== "object") return "";
  return Object.entries(policy as Record<string, unknown>)
    .map(([domain, servers]) => {
      const serversStr = Array.isArray(servers) ? servers.join(";") : servers;
      return `${domain}=${serversStr}`;
    })
    .join(", ");
}

function formatHosts(hosts: unknown): string {
  if (!hosts || typeof hosts !== "object") return "";
  return Object.entries(hosts as Record<string, unknown>)
    .map(([domain, value]) =>
      Array.isArray(value)
        ? `${domain}=${value.join(";")}`
        : `${domain}=${value}`,
    )
    .join(", ");
}

function parseHosts(str: string): NameserverPolicy {
  const result: NameserverPolicy = {};
  if (!str) return result;
  str.split(",").forEach((item) => {
    const parts = item.trim().split("=");
    if (parts.length < 2) return;
    const domain = parts[0].trim();
    const valueStr = parts.slice(1).join("=").trim();
    result[domain] = valueStr.includes(";")
      ? valueStr
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)
      : valueStr;
  });
  return result;
}

function parseList(str: string): string[] {
  if (!str?.trim()) return [];
  return str
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const DEFAULT_DNS_CONFIG = {
  enable: true,
  listen: ":53",
  "enhanced-mode": "fake-ip" as "fake-ip" | "redir-host",
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-filter-mode": "blacklist" as "blacklist" | "whitelist",
  "prefer-h3": false,
  "respect-rules": false,
  "use-hosts": false,
  "use-system-hosts": false,
  ipv6: true,
  "fake-ip-filter": [
    "*.lan",
    "*.local",
    "*.arpa",
    "time.*.com",
    "ntp.*.com",
    "+.market.xiaomi.com",
    "localhost.ptlogin2.qq.com",
    "*.msftncsi.com",
    "www.msftconnecttest.com",
  ],
  "default-nameserver": [
    "system",
    "223.6.6.6",
    "8.8.8.8",
    "2400:3200::1",
    "2001:4860:4860::8888",
  ],
  nameserver: [
    "8.8.8.8",
    "https://doh.pub/dns-query",
    "https://dns.alidns.com/dns-query",
  ],
  fallback: [] as string[],
  "proxy-server-nameserver": [
    "https://doh.pub/dns-query",
    "https://dns.alidns.com/dns-query",
    "tls://223.5.5.5",
  ],
  "direct-nameserver": [] as string[],
  "direct-nameserver-follow-policy": false,
  "fallback-filter": {
    geoip: true,
    "geoip-code": "CN",
    ipcidr: ["240.0.0.0/4", "0.0.0.0/32"],
    domain: ["+.google.com", "+.facebook.com", "+.youtube.com"],
  },
};

type DnsValues = {
  enable: boolean;
  listen: string;
  enhancedMode: "fake-ip" | "redir-host";
  fakeIpRange: string;
  fakeIpFilterMode: "blacklist" | "whitelist";
  preferH3: boolean;
  respectRules: boolean;
  useHosts: boolean;
  useSystemHosts: boolean;
  ipv6: boolean;
  fakeIpFilter: string;
  nameserver: string;
  fallback: string;
  defaultNameserver: string;
  proxyServerNameserver: string;
  directNameserver: string;
  directNameserverFollowPolicy: boolean;
  fallbackGeoip: boolean;
  fallbackGeoipCode: string;
  fallbackIpcidr: string;
  fallbackDomain: string;
  nameserverPolicy: string;
  hosts: string;
};

const defaultValues = (): DnsValues => ({
  enable: DEFAULT_DNS_CONFIG.enable,
  listen: DEFAULT_DNS_CONFIG.listen,
  enhancedMode: DEFAULT_DNS_CONFIG["enhanced-mode"],
  fakeIpRange: DEFAULT_DNS_CONFIG["fake-ip-range"],
  fakeIpFilterMode: DEFAULT_DNS_CONFIG["fake-ip-filter-mode"],
  preferH3: DEFAULT_DNS_CONFIG["prefer-h3"],
  respectRules: DEFAULT_DNS_CONFIG["respect-rules"],
  useHosts: DEFAULT_DNS_CONFIG["use-hosts"],
  useSystemHosts: DEFAULT_DNS_CONFIG["use-system-hosts"],
  ipv6: DEFAULT_DNS_CONFIG.ipv6,
  fakeIpFilter: DEFAULT_DNS_CONFIG["fake-ip-filter"].join(", "),
  defaultNameserver: DEFAULT_DNS_CONFIG["default-nameserver"].join(", "),
  nameserver: DEFAULT_DNS_CONFIG.nameserver.join(", "),
  fallback: DEFAULT_DNS_CONFIG.fallback.join(", "),
  proxyServerNameserver:
    DEFAULT_DNS_CONFIG["proxy-server-nameserver"].join(", "),
  directNameserver: DEFAULT_DNS_CONFIG["direct-nameserver"].join(", "),
  directNameserverFollowPolicy:
    DEFAULT_DNS_CONFIG["direct-nameserver-follow-policy"],
  fallbackGeoip: DEFAULT_DNS_CONFIG["fallback-filter"].geoip,
  fallbackGeoipCode: DEFAULT_DNS_CONFIG["fallback-filter"]["geoip-code"],
  fallbackIpcidr: DEFAULT_DNS_CONFIG["fallback-filter"].ipcidr.join(", "),
  fallbackDomain: DEFAULT_DNS_CONFIG["fallback-filter"].domain.join(", "),
  nameserverPolicy: "",
  hosts: "",
});

const valuesFromConfig = (config: any): DnsValues => {
  const d = config?.dns || {};
  const hostsConfig = config?.hosts || {};
  const enhancedMode = d["enhanced-mode"];
  const fakeIpFilterMode = d["fake-ip-filter-mode"];
  const dft = defaultValues();
  return {
    enable: d.enable ?? dft.enable,
    listen: d.listen ?? dft.listen,
    enhancedMode:
      enhancedMode === "fake-ip" || enhancedMode === "redir-host"
        ? enhancedMode
        : dft.enhancedMode,
    fakeIpRange: d["fake-ip-range"] ?? dft.fakeIpRange,
    fakeIpFilterMode:
      fakeIpFilterMode === "blacklist" || fakeIpFilterMode === "whitelist"
        ? fakeIpFilterMode
        : dft.fakeIpFilterMode,
    preferH3: d["prefer-h3"] ?? dft.preferH3,
    respectRules: d["respect-rules"] ?? dft.respectRules,
    useHosts: d["use-hosts"] ?? dft.useHosts,
    useSystemHosts: d["use-system-hosts"] ?? dft.useSystemHosts,
    ipv6: d.ipv6 ?? dft.ipv6,
    fakeIpFilter: d["fake-ip-filter"]?.join(", ") ?? dft.fakeIpFilter,
    nameserver: d.nameserver?.join(", ") ?? dft.nameserver,
    fallback: d.fallback?.join(", ") ?? dft.fallback,
    defaultNameserver:
      d["default-nameserver"]?.join(", ") ?? dft.defaultNameserver,
    proxyServerNameserver:
      d["proxy-server-nameserver"]?.join(", ") ?? dft.proxyServerNameserver,
    directNameserver:
      d["direct-nameserver"]?.join(", ") ?? dft.directNameserver,
    directNameserverFollowPolicy:
      d["direct-nameserver-follow-policy"] ?? dft.directNameserverFollowPolicy,
    fallbackGeoip: d["fallback-filter"]?.geoip ?? dft.fallbackGeoip,
    fallbackGeoipCode:
      d["fallback-filter"]?.["geoip-code"] ?? dft.fallbackGeoipCode,
    fallbackIpcidr:
      d["fallback-filter"]?.ipcidr?.join(", ") ?? dft.fallbackIpcidr,
    fallbackDomain:
      d["fallback-filter"]?.domain?.join(", ") ?? dft.fallbackDomain,
    nameserverPolicy: formatNameserverPolicy(d["nameserver-policy"]) || "",
    hosts: formatHosts(hostsConfig) || "",
  };
};

export const DnsViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const { clash, mutateClash } = useClash();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<DnsValues>(defaultValues);

  const loadConfig = useCallback(async () => {
    try {
      const exists = await checkDnsConfigExists();
      if (exists) {
        const content = await getDnsConfigContent();
        setValues(valuesFromConfig(yaml.load(content) as any));
      } else {
        setValues(defaultValues());
      }
    } catch (err) {
      setValues(defaultValues());
    }
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      void loadConfig();
    },
    close: () => setOpen(false),
  }));

  // Load existing DNS config when rendered inline (canExpand content)
  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const set = (patch: Partial<DnsValues>) =>
    setValues((v) => ({ ...v, ...patch }));

  const generateConfig = () => {
    const dnsConfig: any = {
      enable: values.enable,
      listen: values.listen,
      "enhanced-mode": values.enhancedMode,
      "fake-ip-range": values.fakeIpRange,
      "fake-ip-filter-mode": values.fakeIpFilterMode,
      "prefer-h3": values.preferH3,
      "respect-rules": values.respectRules,
      "use-hosts": values.useHosts,
      "use-system-hosts": values.useSystemHosts,
      ipv6: values.ipv6,
      "fake-ip-filter": parseList(values.fakeIpFilter),
      "default-nameserver": parseList(values.defaultNameserver),
      nameserver: parseList(values.nameserver),
      "direct-nameserver-follow-policy": values.directNameserverFollowPolicy,
      "fallback-filter": {
        geoip: values.fallbackGeoip,
        "geoip-code": values.fallbackGeoipCode,
        ipcidr: parseList(values.fallbackIpcidr),
        domain: parseList(values.fallbackDomain),
      },
      fallback: parseList(values.fallback),
      "proxy-server-nameserver": parseList(values.proxyServerNameserver),
      "direct-nameserver": parseList(values.directNameserver),
    };
    const policy = parseNameserverPolicy(values.nameserverPolicy);
    if (Object.keys(policy).length > 0) {
      dnsConfig["nameserver-policy"] = policy;
    }
    return dnsConfig;
  };

  const onSave = useLockFn(async () => {
    try {
      const config: Record<string, any> = { dns: generateConfig() };
      const hosts = parseHosts(values.hosts);
      if (Object.keys(hosts).length > 0) config.hosts = hosts;

      await saveDnsConfig(config);
      const validation = await validateDnsConfig();
      if (validation.status !== "valid") {
        Notice.error(
          `${t("DNS Config Error")}: ${validation.message || ""}`,
          5000,
        );
        return;
      }
      if (clash?.dns?.enable) {
        await applyDnsConfig(true);
        mutateClash();
      }
      Notice.success(t("DNS Settings Saved"), 1000);
      setOpen(false);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  const switchRow = (label: string, key: keyof DnsValues) => (
    <Expander
      left={t(label)}
      right={
        <FluentSwitch
          checked={values[key] as boolean}
          onChange={(_, c) => set({ [key]: c.checked } as Partial<DnsValues>)}
        />
      }
    />
  );

  const inputRow = (
    label: string,
    key: keyof DnsValues,
    placeholder?: string,
  ) => (
    <Expander
      left={t(label)}
      right={
        <Input
          autoComplete="off"
          spellCheck={false}
          value={values[key] as string}
          placeholder={placeholder}
          onChange={(e) => set({ [key]: e.target.value } as Partial<DnsValues>)}
        />
      }
    />
  );

  const textareaRow = (
    label: string,
    key: keyof DnsValues,
    placeholder?: string,
  ) => (
    <Expander
      left={t(label)}
      right={
        <Textarea
          spellCheck={false}
          style={{ width: 320 }}
          resize="vertical"
          value={values[key] as string}
          placeholder={placeholder}
          onChange={(e) => set({ [key]: e.target.value } as Partial<DnsValues>)}
        />
      }
    />
  );

  return (
    <>
      <Caption1
        style={{
          display: "block",
          color: tokens.colorPaletteYellowForeground1,
          padding: "4px 8px 8px",
          fontStyle: "italic",
        }}
      >
        {t("DNS Settings Warning")}
      </Caption1>

      {switchRow("Enable", "enable")}
      {inputRow("DNS Listen", "listen", ":53")}

      <Expander
        left={t("Enhanced Mode")}
        right={
          <Select
            value={values.enhancedMode}
            onChange={(_, d) =>
              set({ enhancedMode: d.value as DnsValues["enhancedMode"] })
            }
          >
            <option value="fake-ip">fake-ip</option>
            <option value="redir-host">redir-host</option>
          </Select>
        }
      />

      {inputRow("Fake IP Range", "fakeIpRange", "198.18.0.1/16")}

      <Expander
        left={t("Fake IP Filter Mode")}
        right={
          <Select
            value={values.fakeIpFilterMode}
            onChange={(_, d) =>
              set({
                fakeIpFilterMode: d.value as DnsValues["fakeIpFilterMode"],
              })
            }
          >
            <option value="blacklist">blacklist</option>
            <option value="whitelist">whitelist</option>
          </Select>
        }
      />

      {switchRow("IPv6", "ipv6")}
      {switchRow("Prefer H3", "preferH3")}
      {switchRow("Respect Rules", "respectRules")}
      {switchRow("Use Hosts", "useHosts")}
      {switchRow("Use System Hosts", "useSystemHosts")}
      {switchRow(
        "Direct Nameserver Follow Policy",
        "directNameserverFollowPolicy",
      )}

      {textareaRow(
        "Default Nameserver",
        "defaultNameserver",
        "system, 223.6.6.6, 8.8.8.8",
      )}
      {textareaRow(
        "Nameserver",
        "nameserver",
        "8.8.8.8, https://doh.pub/dns-query",
      )}
      {textareaRow("Fallback", "fallback", "https://dns.google/dns-query")}
      {textareaRow(
        "Proxy Server Nameserver",
        "proxyServerNameserver",
        "https://doh.pub/dns-query",
      )}
      {textareaRow(
        "Direct Nameserver",
        "directNameserver",
        "system, 223.6.6.6",
      )}
      {textareaRow("Fake IP Filter", "fakeIpFilter", "*.lan, *.local")}
      {textareaRow(
        "Nameserver Policy",
        "nameserverPolicy",
        "+.arpa=10.0.0.1, rule-set:cn=https://doh.pub/dns-query",
      )}

      {switchRow("Fallback Filter GeoIP", "fallbackGeoip")}
      {inputRow("GeoIP Code", "fallbackGeoipCode", "CN")}
      {textareaRow("Fallback IP CIDR", "fallbackIpcidr", "240.0.0.0/4")}
      {textareaRow("Fallback Domain", "fallbackDomain", "+.google.com")}
      {textareaRow(
        "Hosts",
        "hosts",
        "*.clash.dev=127.0.0.1, test.com=1.1.1.1;2.2.2.2",
      )}

      <Expander
        right={
          <>
            <FluentButton
              onClick={() => set(defaultValues())}
              style={{ marginBlock: 4 }}
            >
              {t("Reset to Default")}
            </FluentButton>
            <FluentButton
              appearance="primary"
              onClick={onSave}
              style={{ marginBlock: 4 }}
            >
              {t("Save")}
            </FluentButton>
          </>
        }
      />
    </>
  );
});
