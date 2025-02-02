import { makeStyles, mergeClasses, Tab } from "@fluentui/react-components";
import { tokens } from "../../pages/_fluent_theme";
import { useVerge } from "../../hooks/use-verge";
import { useMatch, useResolvedPath } from "react-router-dom";

interface Props {
  to: string;
  children: string;
  icon: React.ReactNode[];
}
export const useListItemStyle = makeStyles({
  item: {
    columnGap: "12px !important",
    marginBottom: "4px !important",
    borderRadius: "4px !important",
    outline: "none !important",
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
      "&::before": {
        backgroundColor: "rgba(0, 0, 0, 0)",
      },
    },
  },
  selected: {
    backgroundColor: tokens.overlay1 + " !important",
  },
  iconOverride: {
    color: tokens.colorNeutralForeground1 + " !important",
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
      content={{ style: { fontWeight: "500" } }}
    >
      {children.replace(/\s/g, "")}
    </Tab>
  );
}
