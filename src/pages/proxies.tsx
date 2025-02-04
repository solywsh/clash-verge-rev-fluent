import useSWR from "swr";
import { useEffect } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { Box, Button, ButtonGroup } from "@mui/material";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from "@fluentui/react-components";
import { closeAllConnections, getClashConfig } from "@/services/api";
import { patchClashConfig } from "@/services/cmds";
import { useVerge } from "@/hooks/use-verge";
import { BasePage } from "@/components/base";
import { ProxyGroups } from "@/components/proxy/proxy-groups";
import { ProviderButton } from "@/components/proxy/provider-button";

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

          {/* <ButtonGroup size="small">
            {modeList.map((mode) => (
              <Button
                key={mode}
                variant={mode === curMode ? "contained" : "outlined"}
                onClick={() => onChangeMode(mode)}
                sx={{ textTransform: "capitalize" }}
              >
                {t(mode)}
              </Button>
            ))}
          </ButtonGroup> */}
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <MenuButton appearance="secondary">
                {t(curMode ?? "global")}
              </MenuButton>
            </MenuTrigger>
            <MenuPopover>
              <MenuList checkedValues={{ mode: [curMode ?? "global"] }}>
                {modeList.map((mode) => (
                  <MenuItemRadio
                    key={mode}
                    onClick={() => onChangeMode(mode)}
                    value={mode}
                    name="mode"
                  >
                    {t(mode)}
                  </MenuItemRadio>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
        </Box>
      }
    >
      <ProxyGroups mode={curMode!} />
    </BasePage>
  );
};

export default ProxyPage;
