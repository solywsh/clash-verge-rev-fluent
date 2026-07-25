import useSWR from "swr";
import { useEffect } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { Box } from "@mui/material";
import { Tab, TabList } from "@fluentui/react-components";
import { closeAllConnections, getClashConfig } from "@/services/api";
import { patchClashConfig } from "@/services/cmds";
import { useVerge } from "@/hooks/use-verge";
import { BasePage } from "@/components/base";
import { ProxyGroups } from "@/components/proxy/proxy-groups";
import { ProviderButton } from "@/components/proxy/provider-button";
import { resetCurrentGroupName } from "../components/proxy/proxy-render";

const ProxyPage = () => {
  const { t } = useTranslation();

  const { data: clashConfig, mutate: mutateClash } = useSWR(
    "getClashConfig",
    getClashConfig,
  );

  const { verge } = useVerge();

  const modeList = ["rule", "global", "direct"];

  const curMode = clashConfig?.mode?.toLowerCase();

  const onChangeMode = useLockFn(async (mode: string) => {
    // 断开连接
    if (mode !== curMode && verge?.auto_close_connection) {
      closeAllConnections();
    }
    await patchClashConfig({ mode });
    mutateClash();
  });

  useEffect(() => {
    if (curMode && !modeList.includes(curMode)) {
      onChangeMode("rule");
    }
  }, [curMode]);

  useEffect(() => () => resetCurrentGroupName(), []);

  return (
    <BasePage
      full
      // contentStyle={{ height: "100%" }}
      contentStyle={{
        height: "100%",
        // paddingInline: "12px",
        boxSizing: "border-box",
      }}
      title={t("Proxy Groups")}
      header={
        <Box display="flex" alignItems="center" gap={1}>
          <ProviderButton />

          <TabList
            selectedValue={curMode ?? "rule"}
            onTabSelect={(_, data) => onChangeMode(data.value as string)}
          >
            {modeList.map((mode) => (
              <Tab key={mode} value={mode}>
                {t(mode)}
              </Tab>
            ))}
          </TabList>
        </Box>
      }
    >
      <ProxyGroups mode={curMode!} />
    </BasePage>
  );
};

export default ProxyPage;
