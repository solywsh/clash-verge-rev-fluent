import { tokens } from "../../pages/_fluent_theme";
import { Expander } from "../fluent/expander";
import {
  makeStyles,
  mergeClasses,
  Subtitle1,
  Subtitle2,
  Title3,
} from "@fluentui/react-components";
import {
  alpha,
  Box,
  ListItemText,
  ListItemButton,
  Typography,
  styled,
} from "@mui/material";
import {
  ExpandLessRounded,
  ExpandMoreRounded,
  InboxRounded,
} from "@mui/icons-material";
import { HeadState } from "./use-head-state";
import { FluentProxyHead as ProxyHead } from "./proxy-head";
import { ProxyItem } from "./proxy-item";
import { ProxyItemMini } from "./proxy-item-mini";
import type { IRenderItem } from "./use-render-list";
import { useVerge } from "@/hooks/use-verge";
import { useThemeMode } from "@/services/states";
import { useEffect, useMemo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { downloadIconCache } from "@/services/cmds";

interface RenderProps {
  item: IRenderItem;
  indent: boolean;
  onLocation: (group: IProxyGroupItem) => void;
  onCheckAll: (groupName: string) => void;
  onHeadState: (groupName: string, patch: Partial<HeadState>) => void;
  onChangeProxy: (group: IProxyGroupItem, proxy: IProxyItem) => void;
  headState?: HeadState;
  index: number;
  renderList: IRenderItem[];
}

const useStyle = makeStyles({
  item: {
    marginTop: "8px",
  },
  noMargin: {
    marginTop: "0px",
  },
  showBg: {
    background: tokens.surface1,
  },
});

let currentGroupName = "";

export function resetCurrentGroupName() {
  currentGroupName = "";
}

export const ProxyRender = (props: RenderProps) => {
  const {
    indent,
    item,
    onLocation,
    onCheckAll,
    onHeadState,
    onChangeProxy,
    renderList,
    index,
  } = props;
  const { type, group, headState, proxy, proxyCol } = item;
  const { verge } = useVerge();
  const enable_group_icon = verge?.enable_group_icon ?? true;
  const mode = useThemeMode();
  const isDark = mode === "light" ? false : true;
  const itembackgroundcolor = isDark ? "#282A36" : "#ffffff";
  const [iconCachePath, setIconCachePath] = useState("");

  useEffect(() => {
    initIconCachePath();
  }, [group]);

  async function initIconCachePath() {
    if (group.icon && group.icon.trim().startsWith("http")) {
      const fileName =
        group.name.replaceAll(" ", "") + "-" + getFileName(group.icon);
      const iconPath = await downloadIconCache(group.icon, fileName);
      setIconCachePath(convertFileSrc(iconPath));
    }
  }

  function getFileName(url: string) {
    return url.substring(url.lastIndexOf("/") + 1);
  }

  const classes = useStyle();

  if (type === 0 && !group.hidden) {
    return (
      <Expander
        className={{
          root: mergeClasses(classes.item, index === 0 && classes.noMargin),
        }}
        canExpand
        defaultExpanded={headState?.open}
        onExpandChange={(expanded) => {
          currentGroupName = group.name;
          onHeadState(group.name, { open: expanded });
        }}
        // style={{
        //   background: tokens.surface2,
        //   border: `1px solid ${tokens.colorNeutralStroke3}`,
        //   height: "100%",
        //   margin: "8px 8px",
        //   borderRadius: "4px",
        // }}
        // onClick={() => onHeadState(group.name, { open: !headState?.open })}
        left={
          <>
            {enable_group_icon &&
              group.icon &&
              group.icon.trim().startsWith("http") && (
                <img
                  src={iconCachePath === "" ? group.icon : iconCachePath}
                  width="32px"
                  style={{ marginRight: "12px", borderRadius: "6px" }}
                />
              )}
            {enable_group_icon &&
              group.icon &&
              group.icon.trim().startsWith("data") && (
                <img
                  src={group.icon}
                  width="32px"
                  style={{ marginRight: "12px", borderRadius: "6px" }}
                />
              )}
            {enable_group_icon &&
              group.icon &&
              group.icon.trim().startsWith("<svg") && (
                <img
                  src={`data:image/svg+xml;base64,${btoa(group.icon)}`}
                  width="32px"
                />
              )}
            <ListItemText
              primary={<StyledPrimary>{group.name}</StyledPrimary>}
              secondary={
                <ListItemTextChild
                  sx={{
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    pt: "2px",
                  }}
                >
                  <Box sx={{ marginTop: "2px" }}>
                    <StyledTypeBox>{group.type}</StyledTypeBox>
                    <StyledSubtitle sx={{ color: "text.secondary" }}>
                      {group.now}
                    </StyledSubtitle>
                  </Box>
                </ListItemTextChild>
              }
              secondaryTypographyProps={{
                sx: { display: "flex", alignItems: "center", color: "#ccc" },
              }}
            />
          </>
        }
      >
        {/* {headState?.open ? <ExpandLessRounded /> : <ExpandMoreRounded />} */}
      </Expander>
    );
  }
  if (type === 1 && !group.hidden) {
    return (
      <ProxyHead
        sx={{
          pl: 2,
          pr: 3,
          mt: 0,
          pt: 1,
          bgcolor: tokens.surface1,
          border: `1px solid ${tokens.itemBorderColor1}`,
          borderTop: indent ? "none" : `1px solid ${tokens.itemBorderColor1}`,
          borderBottom: "none",
          ...(!indent
            ? {
                borderTopLeftRadius: "4px",
                borderTopRightRadius: "4px",
              }
            : {}),
        }}
        groupName={group.name}
        headState={headState!}
        onLocation={() => onLocation(group)}
        onCheckDelay={() => onCheckAll(group.name)}
        onHeadState={(p) => onHeadState(group.name, p)}
        // @ts-expect-error
        className={currentGroupName === group.name ? "curve-item-enter" : ""}
      />
    );
  }
  if (type === 2 && !group.hidden) {
    return (
      <ProxyItem
        group={group}
        proxy={proxy!}
        selected={group.now === proxy?.name}
        showType={headState?.showType}
        sx={{ py: 0, pl: 2, bgcolor: tokens.surface1 }}
        onClick={() => onChangeProxy(group, proxy!)}
        // @ts-expect-error
        className={currentGroupName === group.name ? "curve-item-enter" : ""}
      />
    );
  }
  if (type === 3 && !group.hidden) {
    return (
      <Box
        sx={{
          py: 2,
          pl: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: tokens.surface1,

          border: `1px solid ${tokens.itemBorderColor1}`,
          borderTop: "none",
          borderBottomLeftRadius: "4px",
          borderBottomRightRadius: "4px",
        }}
      >
        <InboxRounded sx={{ fontSize: "2.5em", color: "inherit" }} />
        <Typography sx={{ color: "inherit" }}>No Proxies</Typography>
      </Box>
    );
  }
  if (type === 4 && !group.hidden) {
    const proxyColItemsMemo = useMemo(() => {
      return proxyCol?.map((proxy) => (
        <ProxyItemMini
          key={item.key + proxy.name}
          group={group}
          proxy={proxy!}
          selected={group.now === proxy.name}
          showType={headState?.showType}
          onClick={() => onChangeProxy(group, proxy!)}
        />
      ));
    }, [proxyCol, group, headState]);
    return (
      <Box
        className={currentGroupName === group.name ? "curve-item-enter" : ""}
        sx={{
          height: 56,
          display: "grid",
          gap: 1,
          pt: "8px",
          pl: 2,
          pr: 2,
          pb: 1,
          gridTemplateColumns: `repeat(${item.col! || 2}, 1fr)`,
          bgcolor: tokens.surface1,
          border: `1px solid ${tokens.itemBorderColor1}`,
          borderTop: "none",
          borderBottom: "none",
          ...((renderList[index + 1]?.type ?? 0) === 0
            ? {
                borderBottom: `1px solid ${tokens.itemBorderColor1}`,
                borderBottomLeftRadius: "4px",
                borderBottomRightRadius: "4px",
              }
            : {}),
        }}
      >
        {proxyColItemsMemo}
      </Box>
    );
  }

  // return null;

  if (type === 0) {
    return (
      <ListItemButton
        dense
        style={{
          background: itembackgroundcolor,
          height: "100%",
          margin: "8px 8px",
          borderRadius: "8px",
        }}
        onClick={() => onHeadState(group.name, { open: !headState?.open })}
      >
        {enable_group_icon &&
          group.icon &&
          group.icon.trim().startsWith("http") && (
            <img
              src={iconCachePath === "" ? group.icon : iconCachePath}
              width="32px"
              style={{ marginRight: "12px", borderRadius: "6px" }}
            />
          )}
        {enable_group_icon &&
          group.icon &&
          group.icon.trim().startsWith("data") && (
            <img
              src={group.icon}
              width="32px"
              style={{ marginRight: "12px", borderRadius: "6px" }}
            />
          )}
        {enable_group_icon &&
          group.icon &&
          group.icon.trim().startsWith("<svg") && (
            <img
              src={`data:image/svg+xml;base64,${btoa(group.icon)}`}
              width="32px"
            />
          )}
        <ListItemText
          primary={<StyledPrimary>{group.name}</StyledPrimary>}
          secondary={
            <ListItemTextChild
              sx={{
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                pt: "2px",
              }}
            >
              <Box sx={{ marginTop: "2px" }}>
                <StyledTypeBox>{group.type}</StyledTypeBox>
                <StyledSubtitle sx={{ color: "text.secondary" }}>
                  {group.now}
                </StyledSubtitle>
              </Box>
            </ListItemTextChild>
          }
          secondaryTypographyProps={{
            sx: { display: "flex", alignItems: "center", color: "#ccc" },
          }}
        />
        {headState?.open ? <ExpandLessRounded /> : <ExpandMoreRounded />}
      </ListItemButton>
    );
  }

  if (type === 1) {
    return (
      <ProxyHead
        sx={{ pl: 2, pr: 3, mt: indent ? 1 : 0.5, mb: 1 }}
        url={group.testUrl}
        groupName={group.name}
        headState={headState!}
        onLocation={() => onLocation(group)}
        onCheckDelay={() => onCheckAll(group.name)}
        onHeadState={(p) => onHeadState(group.name, p)}
      />
    );
  }

  if (type === 2) {
    return (
      <ProxyItem
        group={group}
        proxy={proxy!}
        selected={group.now === proxy?.name}
        showType={headState?.showType}
        sx={{ py: 0, pl: 2 }}
        onClick={() => onChangeProxy(group, proxy!)}
      />
    );
  }

  if (type === 3) {
    return (
      <Box
        sx={{
          py: 2,
          pl: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <InboxRounded sx={{ fontSize: "2.5em", color: "inherit" }} />
        <Typography sx={{ color: "inherit" }}>No Proxies</Typography>
      </Box>
    );
  }

  if (type === 4) {
    const proxyColItemsMemo = useMemo(() => {
      return proxyCol?.map((proxy) => (
        <ProxyItemMini
          key={item.key + proxy.name}
          group={group}
          proxy={proxy!}
          selected={group.now === proxy.name}
          showType={headState?.showType}
          onClick={() => onChangeProxy(group, proxy!)}
        />
      ));
    }, [proxyCol, group, headState]);
    return (
      <Box
        sx={{
          height: 56,
          display: "grid",
          gap: 1,
          pl: 2,
          pr: 2,
          pb: 1,
          gridTemplateColumns: `repeat(${item.col! || 2}, 1fr)`,
        }}
      >
        {proxyColItemsMemo}
      </Box>
    );
  }

  return null;
};

const StyledPrimary = styled(Subtitle1)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const StyledSubtitle = styled("span")`
  font-size: 13px;
  overflow: hidden;
  color: text.secondary;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ListItemTextChild = styled("span")`
  display: block;
`;

const StyledTypeBox = styled(ListItemTextChild)(({ theme }) => ({
  display: "inline-block",
  border: "1px solid #ccc",
  // borderColor: alpha(theme.palette.primary.main, 0.5),
  // color: alpha(theme.palette.primary.main, 0.8),
  borderColor: tokens.colorNeutralStroke1,
  color: tokens.colorNeutralForeground4,
  borderRadius: 4,
  fontSize: 10,
  padding: "0 4px",
  lineHeight: 1.5,
  marginRight: "8px",
}));
