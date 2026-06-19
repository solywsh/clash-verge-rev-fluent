import { useState } from "react";
import { ButtonGroup } from "@mui/material";
import {
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
  Body1Strong,
  Caption1,
  makeStyles,
} from "@fluentui/react-components";
import {
  ChevronRightRegular,
  DesktopRegular,
  CubeRegular,
  PaintBrushRegular,
  WrenchRegular,
} from "@fluentui/react-icons";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { BasePage, Notice } from "@/components/base";
import { GitHub } from "@mui/icons-material";
import { openWebUrl } from "@/services/cmds";
import SettingAppearance from "@/components/setting/setting-appearance";
import SettingMaintenance from "@/components/setting/setting-maintenance";
import SettingClash from "@/components/setting/setting-clash";
import SettingSystem from "@/components/setting/setting-system";
import { SettingLandingHeader } from "@/components/setting/setting-landing-header";
import { tokens } from "@/pages/_fluent_theme";

const useStyles = makeStyles({
  cardGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    paddingBottom: "48px",
  },
  detail: {
    paddingBottom: "48px",
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    paddingInline: "20px",
    paddingBlock: "18px",
    borderRadius: tokens.borderRadiusLarge,
    background: tokens.surface1,
    border: `1px solid ${tokens.itemBorderColor1}`,
    cursor: "pointer",
    textAlign: "left",
    transition: `background-color ${tokens.durationFast} ${tokens.curveEasyEase}`,
    ":hover": {
      background: tokens.overlay1Hover,
    },
    ":active": {
      background: tokens.overlay1Pressed,
    },
  },
  cardIcon: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "40px",
    blockSize: "40px",
    fontSize: "24px",
    borderRadius: tokens.borderRadiusMedium,
    background: tokens.overlay1Hover,
    color: tokens.colorBrandForeground1,
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
    flex: 1,
  },
  cardTitle: {
    color: tokens.colorNeutralForeground1,
  },
  cardDesc: {
    color: tokens.colorNeutralForeground3,
  },
  cardChevron: {
    flex: "0 0 auto",
    fontSize: "18px",
    color: tokens.colorNeutralForeground3,
  },
  breadcrumb: {
    marginBottom: "12px",
  },
});

type CategoryKey = "system" | "clash" | "appearance" | "maintenance";

const SettingPage = () => {
  const { t } = useTranslation();
  const classes = useStyles();
  const [active, setActive] = useState<CategoryKey | null>(null);

  const onError = (err: any) => {
    Notice.error(err?.message || err.toString());
  };

  const toGithubRepo = useLockFn(() => {
    return openWebUrl("https://github.com/solywsh/clash-verge-rev-fluent");
  });

  const categories = [
    {
      key: "system" as const,
      label: t("System Setting"),
      desc: t("System Setting Desc"),
      icon: <DesktopRegular />,
      render: () => <SettingSystem onError={onError} hideTitle />,
    },
    {
      key: "clash" as const,
      label: t("Clash Setting"),
      desc: t("Clash Setting Desc"),
      icon: <CubeRegular />,
      render: () => <SettingClash onError={onError} hideTitle />,
    },
    {
      key: "appearance" as const,
      label: t("Appearance & Behavior"),
      desc: t("Appearance & Behavior Desc"),
      icon: <PaintBrushRegular />,
      render: () => <SettingAppearance onError={onError} hideTitle />,
    },
    {
      key: "maintenance" as const,
      label: t("Maintenance"),
      desc: t("Maintenance Desc"),
      icon: <WrenchRegular />,
      render: () => <SettingMaintenance onError={onError} hideTitle />,
    },
  ];

  const current = categories.find((c) => c.key === active);

  return (
    <BasePage
      title={t("Settings")}
      header={
        <ButtonGroup variant="contained" aria-label="Basic button group">
          <Button
            icon={<GitHub fontSize="inherit" />}
            title={t("Github Repo")}
            onClick={toGithubRepo}
            appearance="subtle"
          />
        </ButtonGroup>
      }
    >
      {current ? (
        <div className={classes.detail}>
          <Breadcrumb className={classes.breadcrumb} aria-label="settings path">
            <BreadcrumbItem>
              <BreadcrumbButton onClick={() => setActive(null)}>
                {t("Settings")}
              </BreadcrumbButton>
            </BreadcrumbItem>
            <BreadcrumbDivider />
            <BreadcrumbItem>
              <BreadcrumbButton current>{current.label}</BreadcrumbButton>
            </BreadcrumbItem>
          </Breadcrumb>
          {current.render()}
        </div>
      ) : (
        <div className={classes.cardGrid}>
          <SettingLandingHeader />
          {categories.map((c) => (
            <div
              key={c.key}
              role="button"
              tabIndex={0}
              className={classes.card}
              onClick={() => setActive(c.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setActive(c.key);
              }}
            >
              <div className={classes.cardIcon}>{c.icon}</div>
              <div className={classes.cardBody}>
                <Body1Strong className={classes.cardTitle}>
                  {c.label}
                </Body1Strong>
                <Caption1 className={classes.cardDesc}>{c.desc}</Caption1>
              </div>
              <ChevronRightRegular className={classes.cardChevron} />
            </div>
          ))}
        </div>
      )}
    </BasePage>
  );
};

export default SettingPage;
