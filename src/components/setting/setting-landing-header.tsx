import useSWR from "swr";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLockFn } from "ahooks";
import {
  Body1Strong,
  Caption1,
  Button,
  Spinner,
  makeStyles,
} from "@fluentui/react-components";
import {
  ArrowSyncRegular,
  CheckmarkCircleFilled,
  ArrowDownloadRegular,
} from "@fluentui/react-icons";
import { checkUpdateThrottled } from "@/services/update-check";
import { version as appVersion } from "@root/package.json";
import { getSystemInfo, getRunningMode, appIsAdmin } from "@/services/cmds";
import { DialogRef, Notice } from "@/components/base";
import { UpdateViewer } from "./mods/update-viewer";
import { tokens } from "@/pages/_fluent_theme";
import LogoSvg from "@/assets/image/logo.svg?react";

const useStyles = makeStyles({
  card: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    paddingInline: "20px",
    paddingBlock: "18px",
    marginBottom: "10px",
    borderRadius: tokens.borderRadiusLarge,
    background: tokens.surface1,
    border: `1px solid ${tokens.itemBorderColor1}`,
  },
  logo: {
    flex: "0 0 auto",
    inlineSize: "48px",
    blockSize: "48px",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
    flex: 1,
  },
  title: {
    color: tokens.colorNeutralForeground1,
  },
  summary: {
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  right: {
    flex: "0 0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "6px",
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  upToDate: {
    color: tokens.colorPaletteGreenForeground1,
  },
  available: {
    color: tokens.colorBrandForeground1,
  },
  spin: {
    animationName: {
      from: { transform: "rotate(0deg)" },
      to: { transform: "rotate(360deg)" },
    },
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  },
});

export const SettingLandingHeader = () => {
  const { t } = useTranslation();
  const classes = useStyles();

  const updateRef = useRef<DialogRef>(null);

  // Reuse the same SWR keys as the home page / update viewer so the data is
  // shared from cache instead of triggering duplicate IPC / network calls.
  const { data: sysInfo = "" } = useSWR("getSystemInfo", getSystemInfo);
  const { data: runningMode = "" } = useSWR("getRunningMode", getRunningMode);
  const { data: isAdmin = false } = useSWR("appIsAdmin", appIsAdmin);
  const {
    data: updateInfo,
    isValidating: validating,
    mutate: recheckUpdate,
  } = useSWR("checkUpdate", () => checkUpdateThrottled(), {
    errorRetryCount: 2,
    revalidateIfStale: false,
    focusThrottleInterval: 36e5, // 1 hour
  });

  // SWR's isValidating only flips during a revalidation; the manual check
  // mutates the cache directly (revalidate: false), so track it separately to
  // keep the refresh icon spinning while it runs.
  const [manualChecking, setManualChecking] = useState(false);
  const checking = validating || manualChecking;

  // get_system_info returns "Key: Value" lines; pull out the OS version.
  const info: Record<string, string> = {};
  sysInfo.split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx > 0) info[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  const osVersion = info["System Version"] || info["System Name"] || "";

  const summary = [osVersion, isAdmin ? `${runningMode} (admin)` : runningMode]
    .filter(Boolean)
    .join("  ·  ");

  const updateAvailable = !!updateInfo?.available;

  const onCheckUpdate = useLockFn(async () => {
    setManualChecking(true);
    try {
      // Manual check bypasses the cooldown and writes the result back into the
      // shared SWR cache (without an extra revalidation).
      const info = await recheckUpdate(checkUpdateThrottled(true), {
        revalidate: false,
      });
      if (info?.available) {
        updateRef.current?.open();
      } else {
        Notice.success(t("Currently on the Latest Version"));
      }
    } catch (err: any) {
      Notice.error(err?.message || err?.toString());
    } finally {
      setManualChecking(false);
    }
  });

  return (
    <div className={classes.card}>
      <UpdateViewer ref={updateRef} />

      <LogoSvg className={classes.logo} />

      <div className={classes.body}>
        <Body1Strong className={classes.title}>Clash Verge Rev</Body1Strong>
        <Caption1 className={classes.summary}>
          {`v${appVersion}${summary ? `  ·  ${summary}` : ""}`}
        </Caption1>
        <Caption1 className={classes.status}>
          {checking ? (
            <>
              <Spinner size="extra-tiny" />
              <span>{t("Checking for Updates")}</span>
            </>
          ) : updateAvailable ? (
            <span className={classes.available}>
              {`${t("Update Available")} · v${updateInfo?.version}`}
            </span>
          ) : (
            <>
              <CheckmarkCircleFilled className={classes.upToDate} />
              <span>{t("Currently on the Latest Version")}</span>
            </>
          )}
        </Caption1>
      </div>

      <div className={classes.right}>
        {updateAvailable ? (
          <Button
            appearance="primary"
            icon={<ArrowDownloadRegular />}
            onClick={() => updateRef.current?.open()}
          >
            {t("Update")}
          </Button>
        ) : (
          <Button
            icon={
              <ArrowSyncRegular
                className={checking ? classes.spin : undefined}
              />
            }
            disabled={checking}
            onClick={onCheckUpdate}
          >
            {t("Check for Updates")}
          </Button>
        )}
      </div>
    </div>
  );
};
