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
}: ItemProps & ExpanderProps) {
  const classes = useItemStyle();
  const canClick = !!onClick;

  const right = canClick ? (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
      <ChevronRightRegular
        style={{ fontSize: 20, marginRight: 5, marginLeft: 12 }}
      />
    </div>
  ) : (
    <div
      style={{ display: "flex", alignItems: "center" }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
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
      onClick={onClick}
    />
  );
}
