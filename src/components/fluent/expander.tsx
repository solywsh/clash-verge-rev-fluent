import {
  Button,
  makeStyles,
  mergeClasses,
  shorthands,
} from "@fluentui/react-components";
import { createContext, useContext, useState } from "react";
import { tokens } from "../../pages/_fluent_theme";
import { ChevronDownRegular } from "@fluentui/react-icons";

export interface ExpanderProps {
  children?: React.ReactNode;
  className?: string | { header?: string; content?: string; root?: string };
  canExpand?: boolean;
  content?: React.ReactNode;
  icon?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  defaultExpanded?: boolean;
  onClick?: () => void;
}

const useStyle = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    borderRadius: tokens.borderRadiusMedium,
    inlineSize: "100%",
    // background: tokens.surface1,
  },
  expandHeader: {
    borderRadius: tokens.borderRadiusMedium,
    background: tokens.surface1,
    display: "flex",
    alignItems: "center",
    fontSize: tokens.fontSizeBase300,
    paddingInlineStart: "16px",
    paddingBlock: "17px",
    padding: "8px",
    backgroundClip: "padding-box",
    border: `1px solid ${tokens.itemBorderColor1}`,
    color: tokens.colorNeutralForeground1,

    ":hover": {
      "--chevron-button-bg": tokens.overlay1Hover,
    },
  },
  expandContent: {
    // @ts-expect-error
    borderBlockStart: "none",
    borderRadius: tokens.borderRadiusSmall,
    borderStartStartRadius: tokens.borderRadiusNone,
    borderStartEndRadius: tokens.borderRadiusNone,
    opacity: 0,
    transform: "translateY(-20px)",
  },
  expanded: {},
  icon: {
    flex: "0 0 auto",
    inlineSize: "16px",
    blockSize: "16px",
    marginInlineEnd: "16px",
  },
  expandedHeader: {
    borderEndStartRadius: 0,
    borderEndEndRadius: 0,
  },
  expandedContent: {
    transform: "translateY(0)",
    opacity: 1,
    transition: `all ${tokens.durationFast} ${tokens.curveDecelerateMid}`,
  },
  chevronButton: {
    color: tokens.colorNeutralForeground2 + " !important",
    "& > .fui-Button__icon": {
      color: tokens.colorNeutralForeground2 + " !important",
    },
    background: "var(--chevron-button-bg)",
    ":hover": {
      background: "var(--chevron-button-bg)",
    },
  },
  chevronIcon: {
    transition: `${tokens.durationFast} ${tokens.curveEasyEase} transform`,
  },
  expandedChevronIcon: {
    transform: "rotate(-180deg)",
  },
  contentListItemRoot: {
    "&:last-child": {
      "--border-bottom-radius": tokens.borderRadiusMedium,
    },
  },
  contentListItemHeader: {
    borderRadius: tokens.borderRadiusNone,
    borderTop: "none",
    borderBottomLeftRadius: "var(--border-bottom-radius)",
    borderBottomRightRadius: "var(--border-bottom-radius)",
  },
  rightContainer: {
    flex: 1,
    display: "flex",
    justifyContent: "flex-end",
    marginLeft: "16px",
    gap: "8px",
  },
  pointer: {
    cursor: "pointer",
  },
});

const ListContext = createContext<null | boolean>(null);
export function ExpanderList(props: { children: React.ReactNode }) {
  return (
    <ListContext.Provider value={true}>{props.children}</ListContext.Provider>
  );
}

export function Expander(props: ExpanderProps) {
  const {
    children,
    canExpand = false,
    className: propClassName,
    icon,
    left,
    right,
    expanded,
    onExpandChange,
    defaultExpanded,
    onClick,
  } = props;
  const [isExpanded, setIsExpanded] = useState(expanded ?? defaultExpanded);
  const isControlled = expanded !== undefined;
  const realExpanded = expanded ?? isExpanded;

  const handleExpandChange = () => {
    if (!isControlled) {
      setIsExpanded((e) => !e);
    }
    onExpandChange?.(!realExpanded);
  };

  const classes = useStyle();
  const classNames =
    typeof propClassName === "string" ? { root: propClassName } : propClassName;

  const listContext = useContext(ListContext);
  const isChildOfList = listContext !== null;

  return (
    <div
      style={isChildOfList ? { background: "transparent" } : undefined}
      className={mergeClasses(
        classes.root,
        classNames?.root,
        isChildOfList && classes.contentListItemRoot,
      )}
    >
      <div
        className={mergeClasses(
          classes.expandHeader,
          realExpanded && classes.expandedHeader,
          classNames?.header,
          isChildOfList && classes.contentListItemHeader,
          canExpand && classes.pointer,
        )}
        onClick={canExpand ? handleExpandChange : onClick}
      >
        {icon ? <div className={classes.icon}>{icon}</div> : null}
        {left}
        <div className={classes.rightContainer}>
          {right}
          {canExpand ? (
            <Button
              appearance="subtle"
              icon={
                <ChevronDownRegular
                  className={mergeClasses(
                    classes.chevronIcon,
                    realExpanded && classes.expandedChevronIcon,
                  )}
                />
              }
              className={mergeClasses(classes.chevronButton)}
            />
          ) : null}
        </div>
      </div>
      <div
        className={mergeClasses(
          classes.expandContent,
          realExpanded && classes.expandedContent,
          classNames?.content,
        )}
      >
        {realExpanded && (
          <ListContext.Provider value={realExpanded ?? null}>
            {props.content}
          </ListContext.Provider>
        )}
      </div>
    </div>
  );
}
