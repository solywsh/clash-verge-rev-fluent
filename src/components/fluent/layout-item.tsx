import { makeStyles, mergeClasses, Tab } from "@fluentui/react-components";
import { tokens } from "../../pages/_fluent_theme";
import { useVerge } from "../../hooks/use-verge";
import { useMatch, useResolvedPath } from "react-router-dom";

interface Props {
  to: string;
  children: string | null;
  icon: React.ReactNode[];
}
export const useListItemStyle = makeStyles({
  item: {
    columnGap: "12px !important",
    height: "36px",
    whiteSpace: "nowrap",
    marginBottom: "4px !important",
    borderRadius: "4px !important",
    outline: "none !important",
    "&::after": {
      backgroundColor: tokens.colorCompoundBrandStrokeHover + " !important",
    },
    "&:hover": {
      backgroundColor: tokens.overlay1 + " !important",
      "&::before": {
        backgroundColor: "rgba(0, 0, 0, 0)",
      },
      "& .fui-Tab__icon": {
        color: tokens.colorNeutralForeground1Hover + " !important",
      },
    },
    "&:active": {
      backgroundColor: tokens.overlay1Pressed + " !important",
      "& > span": {
        opacity: 0.8,
      },
      "&::before": {
        backgroundColor: "rgba(0, 0, 0, 0)",
      },
    },
  },
  selected: {
    backgroundColor: tokens.overlay1 + " !important",

    "&:hover": {
      backgroundColor: tokens.overlay1Pressed + " !important",
    },
  },
  iconOverride: {
    color: tokens.colorNeutralForeground1 + " !important",
  },
  content: {
    fontWeight: 400,
    color: tokens.colorNeutralForeground1Hover,
  },
});

export function FluentLayoutItem(props: Props) {
  const { to, children, icon } = props;
  const { verge } = useVerge();
  const resolved = useResolvedPath(to);
  const match = useMatch({ path: resolved.pathname, end: true });

  const classes = useListItemStyle();

  return (
    <Tab
      value={to}
      className={mergeClasses(classes.item, !!match && classes.selected)}
      icon={{
        children: icon[2] ?? (icon[0] as any),
        className: classes.iconOverride,
      }}
      content={{ className: classes.content }}
    >
      {children?.replace(/\s/g, "")}
    </Tab>
  );
}
