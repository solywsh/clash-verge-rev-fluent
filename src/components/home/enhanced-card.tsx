import { ReactNode } from "react";
import { makeStyles, Subtitle2 } from "@fluentui/react-components";
import { tokens } from "../../pages/_fluent_theme";

const useStyles = makeStyles({
  card: {
    display: "flex",
    flexDirection: "column",
    background: tokens.surface1,
    border: `1px solid ${tokens.itemBorderColor1}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: "16px",
    height: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  iconBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorBrandForeground1,
    background: tokens.colorBrandBackground2,
    flex: "0 0 auto",
  },
  title: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  action: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
});

interface Props {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export const EnhancedCard = (props: Props) => {
  const { title, icon, action, children, className } = props;
  const classes = useStyles();
  return (
    <div className={className ? `${classes.card} ${className}` : classes.card}>
      <div className={classes.header}>
        {icon ? <div className={classes.iconBox}>{icon}</div> : null}
        <Subtitle2 className={classes.title}>{title}</Subtitle2>
        {action ? <div className={classes.action}>{action}</div> : null}
      </div>
      <div className={classes.body}>{children}</div>
    </div>
  );
};

export default EnhancedCard;
