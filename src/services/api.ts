// Mihomo data layer.
//
// Historically this talked to the mihomo HTTP external controller via axios.
// Upstream v2.5.1 keeps the external controller OFF by default and exposes the
// core over an IPC socket/named-pipe through `tauri-plugin-mihomo`. This module
// now bridges to that plugin (`tauri-plugin-mihomo-api`) instead, keeping the
// same exported function names and return shapes so existing consumers and the
// frontend `I*` types are unaffected.
import {
  getVersion as mihomoGetVersion,
  getBaseConfig,
  updateGeo,
  upgradeCore as mihomoUpgradeCore,
  getRules as mihomoGetRules,
  delayProxyByName,
  selectNodeForGroup,
  getProxies as mihomoGetProxies,
  getProxyProviders as mihomoGetProxyProviders,
  getRuleProviders as mihomoGetRuleProviders,
  healthcheckProxyProvider,
  updateProxyProvider,
  updateRuleProvider,
  getConnections as mihomoGetConnections,
  closeConnection,
  closeAllConnections as mihomoCloseAllConnections,
  delayGroup,
} from "tauri-plugin-mihomo-api";

const DEFAULT_TEST_URL = "http://cp.cloudflare.com/generate_204";

/// Kept for backward compatibility. The mihomo plugin talks to the core over a
/// local IPC pipe, so there is no axios instance / controller endpoint to
/// (re)initialize anymore — this is now a no-op.
export const getAxios = async (_force: boolean = false) => {};

/// Get Version
export const getVersion = async () => {
  return (await mihomoGetVersion()) as {
    premium: boolean;
    meta?: boolean;
    version: string;
  };
};

/// Get current base configs
export const getClashConfig = async () => {
  return (await getBaseConfig()) as unknown as IConfigData;
};

/// Update geo data
export const updateGeoData = async () => {
  return updateGeo();
};

/// Upgrade clash core
export const upgradeCore = async () => {
  return mihomoUpgradeCore();
};

/// Get current rules
export const getRules = async () => {
  const response = await mihomoGetRules();
  return (response?.rules ?? []) as unknown as IRuleItem[];
};

/// Get Proxy delay
export const getProxyDelay = async (
  name: string,
  url?: string,
  timeout?: number,
) => {
  const result = await delayProxyByName(
    name,
    url || DEFAULT_TEST_URL,
    timeout || 10000,
  );
  return result as { delay: number };
};

/// Update the Proxy Choose
export const updateProxy = async (group: string, proxy: string) => {
  return selectNodeForGroup(group, proxy);
};

// get proxy
export const getProxiesInner = async () => {
  const response = await mihomoGetProxies();
  return (response?.proxies || {}) as Record<string, IProxyItem>;
};

/// Get the Proxy information
export const getProxies = async () => {
  const [proxyRecord, providerRecord] = await Promise.all([
    getProxiesInner(),
    getProxyProviders(),
  ]);
  // provider name map
  const providerMap = Object.fromEntries(
    Object.entries(providerRecord).flatMap(([provider, item]) =>
      item.proxies.map((p) => [p.name, { ...p, provider }]),
    ),
  );

  // compatible with proxy-providers
  const generateItem = (name: string) => {
    if (proxyRecord[name]) return proxyRecord[name];
    if (providerMap[name]) return providerMap[name];
    return {
      name,
      type: "unknown",
      udp: false,
      xudp: false,
      tfo: false,
      mptcp: false,
      smux: false,
      history: [],
    };
  };

  const { GLOBAL: global, DIRECT: direct, REJECT: reject } = proxyRecord;

  let groups: IProxyGroupItem[] = Object.values(proxyRecord).reduce<
    IProxyGroupItem[]
  >((acc, each) => {
    if (each.name !== "GLOBAL" && each.all) {
      acc.push({
        ...each,
        all: each.all!.map((item) => generateItem(item)),
      });
    }

    return acc;
  }, []);

  if (global?.all) {
    let globalGroups: IProxyGroupItem[] = global.all.reduce<IProxyGroupItem[]>(
      (acc, name) => {
        if (proxyRecord[name]?.all) {
          acc.push({
            ...proxyRecord[name],
            all: proxyRecord[name].all!.map((item) => generateItem(item)),
          });
        }
        return acc;
      },
      [],
    );

    let globalNames = new Set(globalGroups.map((each) => each.name));
    groups = groups
      .filter((group) => {
        return !globalNames.has(group.name);
      })
      .concat(globalGroups);
  }

  const proxies = [direct, reject].concat(
    Object.values(proxyRecord).filter(
      (p) => !p.all?.length && p.name !== "DIRECT" && p.name !== "REJECT",
    ),
  );

  const _global: IProxyGroupItem = {
    ...global,
    all: global?.all?.map((item) => generateItem(item)) || [],
  };

  return { global: _global, direct, groups, records: proxyRecord, proxies };
};

// get proxy providers
export const getProxyProviders = async () => {
  const response = await mihomoGetProxyProviders();

  const providers = (response.providers || {}) as Record<
    string,
    IProxyProviderItem
  >;

  return Object.fromEntries(
    Object.entries(providers).filter(([key, item]) => {
      const type = item.vehicleType.toLowerCase();
      return type === "http" || type === "file";
    }),
  );
};

export const getRuleProviders = async () => {
  const response = await mihomoGetRuleProviders();

  const providers = (response.providers || {}) as Record<
    string,
    IRuleProviderItem
  >;

  return Object.fromEntries(
    Object.entries(providers).filter(([key, item]) => {
      const type = item.vehicleType.toLowerCase();
      return type === "http" || type === "file";
    }),
  );
};

// proxy providers health check
export const providerHealthCheck = async (name: string) => {
  return healthcheckProxyProvider(name);
};

export const proxyProviderUpdate = async (name: string) => {
  return updateProxyProvider(name);
};

export const ruleProviderUpdate = async (name: string) => {
  return updateRuleProvider(name);
};

export const getConnections = async () => {
  const result = await mihomoGetConnections();
  return {
    ...result,
    connections: result.connections ?? [],
  } as unknown as IConnections;
};

// Close specific connection
export const deleteConnection = async (id: string) => {
  await closeConnection(id);
};

// Close all connections
export const closeAllConnections = async () => {
  await mihomoCloseAllConnections();
};

// Get Group Proxy Delays
export const getGroupProxyDelays = async (
  groupName: string,
  url?: string,
  timeout?: number,
) => {
  const result = await delayGroup(
    groupName,
    url || DEFAULT_TEST_URL,
    timeout || 10000,
  );
  return result as Record<string, number>;
};

// Is debug enabled
//
// The mihomo plugin does not expose the core's /debug endpoints, so the
// memory-GC debug affordance is disabled under the IPC data layer.
export const isDebugEnabled = async () => {
  return false;
};

// GC — no-op (see isDebugEnabled).
export const gc = async () => {};
