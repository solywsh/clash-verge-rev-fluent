import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import {
  Button as FluentButton,
  Input,
  Select,
  Caption1,
  Body1,
} from "@fluentui/react-components";
import { DeleteRegular } from "@fluentui/react-icons";
import { DialogRef, Notice } from "@/components/base";
import { useClash } from "@/hooks/use-clash";
import { getProxies } from "@/services/api";
import { isPortInUse } from "@/services/cmds";
import { Expander } from "../../fluent/expander";
import { tokens } from "../../../pages/_fluent_theme";

const isValidPort = (port: string) => {
  const n = Number(port);
  return Number.isInteger(n) && n > 0 && n < 65536;
};

const normalizeHost = (host: string) => host.trim();

const formatHostPort = (host: string, port: string) => {
  // IPv6 needs brackets
  return host.includes(":") ? `[${host}]:${port}` : `${host}:${port}`;
};

export const TunnelsViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const { clash, mutateClash, patchClash } = useClash();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    localAddr: "",
    localPort: "",
    targetAddr: "",
    targetPort: "",
    network: "tcp+udp",
    group: "",
    proxy: "",
  });
  const [draftTunnels, setDraftTunnels] = useState<ITunnelItem[]>([]);

  const { data: proxiesData } = useSWR(open ? "getProxies" : null, getProxies);

  const proxyGroups = useMemo(() => proxiesData?.groups ?? [], [proxiesData]);
  const groupNames = useMemo(
    () => proxyGroups.map((g) => g.name),
    [proxyGroups],
  );
  const proxyOptions = useMemo(() => {
    const group = proxyGroups.find((g) => g.name === values.group);
    return group?.all ?? [];
  }, [proxyGroups, values.group]);

  useImperativeHandle(ref, () => ({
    open: () => {
      setValues({
        localAddr: "",
        localPort: "",
        targetAddr: "",
        targetPort: "",
        network: "tcp+udp",
        group: "",
        proxy: "",
      });
      setDraftTunnels(clash?.tunnels ?? []);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  // Populate from clash when rendered inline (canExpand content)
  useEffect(() => {
    setDraftTunnels(clash?.tunnels ?? []);
  }, [clash?.tunnels]);

  const handleSave = async () => {
    try {
      await patchClash({ tunnels: draftTunnels });
      await mutateClash();
      Notice.success(t("Settings Applied"), 1000);
      setOpen(false);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  };

  const handleAdd = async () => {
    const { localAddr, localPort, targetAddr, targetPort, network, proxy } =
      values;
    if (!localAddr || !localPort || !targetAddr || !targetPort) {
      Notice.error(t("Tunnel Fields Incomplete"));
      return;
    }
    if (!isValidPort(localPort)) {
      Notice.error(t("Invalid Local Port"));
      return;
    }
    if (await isPortInUse(Number(localPort))) {
      Notice.error(`${t("Port In Use")}: ${localPort}`);
      return;
    }
    if (!isValidPort(targetPort)) {
      Notice.error(t("Invalid Target Port"));
      return;
    }
    const entry: ITunnelItem = {
      network: network === "tcp+udp" ? ["tcp", "udp"] : [network],
      address: formatHostPort(normalizeHost(localAddr), localPort),
      target: formatHostPort(normalizeHost(targetAddr), targetPort),
      ...(proxy ? { proxy } : {}),
    };
    setDraftTunnels((prev) => [...prev, entry]);
    setValues((v) => ({
      ...v,
      localAddr: "",
      localPort: "",
      targetAddr: "",
      targetPort: "",
      network: "tcp+udp",
    }));
  };

  const handleDelete = (index: number) => {
    setDraftTunnels((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {draftTunnels.length > 0 && (
        <>
          <Caption1
            style={{
              display: "block",
              color: tokens.colorNeutralForeground4,
              padding: "4px 8px",
            }}
          >
            {t("Existing Tunnels")}
          </Caption1>
          {draftTunnels.map((tunnel, index) => (
            <Expander
              key={`${tunnel.address}_${tunnel.target}_${index}`}
              left={
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <Body1>{`${tunnel.address} → ${tunnel.target}`}</Body1>
                  <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                    {`${tunnel.network.join(", ")} · ${
                      tunnel.proxy ?? t("Default")
                    }`}
                  </Caption1>
                </div>
              }
              right={
                <FluentButton
                  appearance="subtle"
                  icon={<DeleteRegular />}
                  onClick={() => handleDelete(index)}
                />
              }
            />
          ))}
        </>
      )}

      <Expander
        left={t("Protocol")}
        right={
          <Select
            value={values.network}
            onChange={(_, d) => setValues((v) => ({ ...v, network: d.value }))}
          >
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
            <option value="tcp+udp">TCP + UDP</option>
          </Select>
        }
      />
      <Expander
        left={t("Local Address")}
        right={
          <Input
            value={values.localAddr}
            placeholder="127.0.0.1"
            onChange={(e) =>
              setValues((v) => ({ ...v, localAddr: e.target.value }))
            }
          />
        }
      />
      <Expander
        left={t("Local Port")}
        right={
          <Input
            type="number"
            value={values.localPort}
            placeholder="6553"
            onChange={(e) =>
              setValues((v) => ({ ...v, localPort: e.target.value }))
            }
          />
        }
      />
      <Expander
        left={t("Target Address")}
        right={
          <Input
            value={values.targetAddr}
            placeholder="8.8.8.8"
            onChange={(e) =>
              setValues((v) => ({ ...v, targetAddr: e.target.value }))
            }
          />
        }
      />
      <Expander
        left={t("Target Port")}
        right={
          <Input
            type="number"
            value={values.targetPort}
            placeholder="53"
            onChange={(e) =>
              setValues((v) => ({ ...v, targetPort: e.target.value }))
            }
          />
        }
      />
      <Expander
        left={`${t("Proxy Group")} (${t("Optional")})`}
        right={
          <Select
            value={values.group}
            onChange={(_, d) => {
              const group = proxyGroups.find((g) => g.name === d.value);
              setValues((v) => ({
                ...v,
                group: d.value,
                proxy: group?.all?.[0]?.name ?? "",
              }));
            }}
          >
            <option value="">{t("Default")}</option>
            {groupNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        }
      />
      <Expander
        left={`${t("Proxy Node")} (${t("Optional")})`}
        right={
          <Select
            value={values.proxy}
            disabled={!values.group}
            onChange={(_, d) => setValues((v) => ({ ...v, proxy: d.value }))}
          >
            <option value="">{t("Default")}</option>
            {proxyOptions.map((node) => (
              <option key={node.name} value={node.name}>
                {node.name}
              </option>
            ))}
          </Select>
        }
      />

      <Expander
        right={
          <>
            <FluentButton onClick={handleAdd} style={{ marginBlock: 4 }}>
              {t("Add")}
            </FluentButton>
            <FluentButton
              appearance="primary"
              onClick={handleSave}
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
