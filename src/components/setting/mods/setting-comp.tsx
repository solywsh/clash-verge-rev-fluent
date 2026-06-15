import React, { ReactNode, useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
} from "@mui/material";
import { ChevronRightRounded } from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Body2,
  Button,
  Caption1,
  makeStyles,
  mergeClasses,
} from "@fluentui/react-components";
import { Expander, ExpanderProps } from "../../fluent/expander";
import { tokens } from "../../../pages/_fluent_theme";
import { ChevronRightRegular } from "@fluentui/react-icons";
import isAsyncFunction from "@/utils/is-async-function";

interface ItemProps {
  label: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
  secondary?: ReactNode;
  onClick?: () => void | Promise<any>;
  // When set, the onClick is surfaced as an explicit action button with this
  // label (e.g. "更改" for a dialog, "打开" for an action) instead of a `>`
  // chevron. The `>` chevron is reserved for true page navigation only.
  actionLabel?: ReactNode;
  actionAppearance?: "primary" | "secondary" | "subtle" | "outline";
}

export const SettingItem: React.FC<ItemProps> = (props) => {
  const { label, extra, children, secondary, onClick } = props;
  const clickable = !!onClick;

  const primary = (
    <Box sx={{ display: "flex", alignItems: "center", fontSize: "14px" }}>
      <span>{label}</span>
      {extra ? extra : null}
    </Box>
  );

  const [isLoading, setIsLoading] = useState(false);
  const handleClick = () => {
    if (onClick) {
      if (isAsyncFunction(onClick)) {
        setIsLoading(true);
        onClick()!.finally(() => setIsLoading(false));
      } else {
        onClick();
      }
    }
  };

  return clickable ? (
    <ListItem disablePadding>
      <ListItemButton onClick={handleClick} disabled={isLoading}>
        <ListItemText primary={primary} secondary={secondary} />
        {isLoading ? (
          <CircularProgress color="inherit" size={20} />
        ) : (
          <ChevronRightRounded />
        )}
      </ListItemButton>
    </ListItem>
  ) : (
    <ListItem sx={{ pt: "5px", pb: "5px" }}>
      <ListItemText primary={primary} secondary={secondary} />
      {children}
    </ListItem>
  );
};

export const SettingList: React.FC<{
  title: string;
  children: ReactNode;
}> = (props) => (
  <List>
    <ListSubheader
      sx={[
        { background: "transparent", fontSize: "16px", fontWeight: "700" },
        ({ palette }) => {
          return {
            color: palette.text.primary,
          };
        },
      ]}
      disableSticky
    >
      {props.title}
    </ListSubheader>

    {props.children}
  </List>
);

const useStyle = makeStyles({
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginTop: "8px",
  },
  titleWrap: {
    marginBottom: "8px",
  },
});

export function FluentSettingList({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const { listContainer, titleWrap } = useStyle();
  return (
    <div>
      {title ? <Body2 className={titleWrap}>{title}</Body2> : null}
      <div className={listContainer}>{children}</div>
    </div>
  );
}

const useGroupStyle = makeStyles({
  groupHeader: {
    marginTop: "18px",
    marginBottom: "2px",
    paddingInlineStart: "4px",
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  first: {
    marginTop: "2px",
  },
});

// A small section subheading used inside a settings detail page to group
// related items (Windows 11 style), staying on the same scrolling page.
export function FluentSettingGroup({
  title,
  first,
}: {
  title: ReactNode;
  first?: boolean;
}) {
  const classes = useGroupStyle();
  return (
    <Body2
      className={mergeClasses(classes.groupHeader, first && classes.first)}
    >
      {title}
    </Body2>
  );
}

const useItemStyle = makeStyles({
  header: {
    paddingBlock: "14px",
  },
  canClick: {
    cursor: "pointer",
    transition: `background-color ${tokens.durationFast} ${tokens.curveEasyEase}`,
    ":hover": {
      background: tokens.overlay1Hover,
    },
    ":active": {
      background: tokens.overlay1Pressed,
    },
  },
  titleBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    minWidth: 0,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: tokens.colorNeutralForeground1,
  },
  description: {
    color: tokens.colorNeutralForeground3,
    paddingRight: "8px",
  },
});

export function FluentSettingItem({
  label,
  extra,
  children,
  secondary,
  onClick,
  canExpand,
  content,
  icon,
  actionLabel,
  actionAppearance,
}: ItemProps & ExpanderProps) {
  const classes = useItemStyle();
  // Three interaction shapes:
  //  - canExpand → inline expander (down chevron, handled by Expander)
  //  - onClick + actionLabel → explicit action button (dialog / side-effect)
  //  - onClick alone → legacy whole-row navigation with a `>` chevron
  const hasAction = !!onClick && !!actionLabel && !canExpand;
  const canClick = !!onClick && !actionLabel && !canExpand;

  const right = (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        {hasAction ? (
          <Button
            appearance={actionAppearance ?? "secondary"}
            onClick={() => onClick?.()}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
      {canClick ? (
        <ChevronRightRegular style={{ fontSize: 20, marginLeft: 4 }} />
      ) : null}
    </div>
  );

  const left = (
    <div className={classes.titleBlock}>
      <div className={classes.titleRow}>
        <span>{label}</span>
        {extra}
      </div>
      {secondary ? (
        <Caption1 className={classes.description}>{secondary}</Caption1>
      ) : null}
    </div>
  );

  return (
    <Expander
      content={content}
      icon={icon}
      left={left}
      right={right}
      className={{
        header: mergeClasses(classes.header, canClick && classes.canClick),
      }}
      canExpand={canExpand}
      onClick={canClick ? onClick : undefined}
    />
  );
}
