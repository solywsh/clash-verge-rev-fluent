import { mutate } from "swr";
import { forwardRef, useImperativeHandle, useState } from "react";
import { BaseDialog, DialogRef, Notice } from "@/components/base";
import { useTranslation } from "react-i18next";
import { useVerge } from "@/hooks/use-verge";
import { useLockFn } from "ahooks";
import {
  SwitchAccessShortcutRounded,
  RestartAltRounded,
} from "@mui/icons-material";
import {
  Badge,
  Button,
  Caption1,
  Spinner,
  Text,
  makeStyles,
  mergeClasses,
} from "@fluentui/react-components";
import { tokens } from "@/pages/_fluent_theme";
import { changeClashCore, restartCore } from "@/services/cmds";
import { closeAllConnections, upgradeCore } from "@/services/api";

const VALID_CORE = [
  { name: "Mihomo", core: "verge-mihomo", chip: "Release Version" },
  { name: "Mihomo Alpha", core: "verge-mihomo-alpha", chip: "Alpha Version" },
];

const useStyles = makeStyles({
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderRadius: tokens.borderRadiusMedium,
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  rowSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
});

export const ClashCoreViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const classes = useStyles();

  const { verge, mutateVerge } = useVerge();

  const [open, setOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  const { clash_core = "verge-mihomo" } = verge ?? {};

  const onCoreChange = useLockFn(async (core: string) => {
    if (core === clash_core) return;

    try {
      closeAllConnections();
      await changeClashCore(core);
      mutateVerge();
      setTimeout(() => {
        mutate("getClashConfig");
        mutate("getVersion");
      }, 100);
      Notice.success(t("Switched to _clash Core", { core: `${core}` }), 1000);
    } catch (err: any) {
      Notice.error(err?.message || err.toString());
    }
  });

  const onRestart = useLockFn(async () => {
    try {
      await restartCore();
      Notice.success(t(`Clash Core Restarted`), 1000);
    } catch (err: any) {
      Notice.error(err?.message || err.toString());
    }
  });

  const onUpgrade = useLockFn(async () => {
    try {
      setUpgrading(true);
      await upgradeCore();
      setUpgrading(false);
      Notice.success(t(`Core Version Updated`), 1000);
    } catch (err: any) {
      setUpgrading(false);
      Notice.error(err?.response.data.message || err.toString());
    }
  });

  return (
    <BaseDialog
      open={open}
      title={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {t("Clash Core")}
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              appearance="primary"
              size="small"
              disabled={upgrading}
              icon={
                upgrading ? (
                  <Spinner size="tiny" />
                ) : (
                  <SwitchAccessShortcutRounded fontSize="inherit" />
                )
              }
              onClick={onUpgrade}
            >
              {t("Upgrade")}
            </Button>
            <Button
              appearance="primary"
              size="small"
              icon={<RestartAltRounded fontSize="inherit" />}
              onClick={onRestart}
            >
              {t("Restart")}
            </Button>
          </div>
        </div>
      }
      contentSx={{
        pb: 0,
        width: 400,
        height: 180,
        overflowY: "auto",
        userSelect: "text",
        marginTop: "-8px",
      }}
      disableOk
      cancelBtn={t("Close")}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {VALID_CORE.map((each) => (
          <div
            key={each.core}
            className={mergeClasses(
              classes.row,
              each.core === clash_core && classes.rowSelected,
            )}
            onClick={() => onCoreChange(each.core)}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Text>{each.name}</Text>
              <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                /{each.core}
              </Caption1>
            </div>
            <Badge
              appearance="tint"
              color={each.chip === "Alpha Version" ? "warning" : "brand"}
            >
              {t(`${each.chip}`)}
            </Badge>
          </div>
        ))}
      </div>
    </BaseDialog>
  );
});
