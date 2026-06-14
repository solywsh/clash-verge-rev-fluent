import {
  AccessTimeOutlined,
  CancelOutlined,
  CheckCircleOutlined,
  HelpOutlined,
  PendingOutlined,
  RefreshRounded,
} from "@mui/icons-material";
import {
  Badge,
  Button,
  Caption1,
  Spinner,
  Subtitle2,
  Tooltip,
  makeStyles,
} from "@fluentui/react-components";
import { tokens } from "@/pages/_fluent_theme";
import { useLockFn } from "ahooks";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BaseEmpty, BasePage, Notice } from "@/components/base";
import { getUnlockItems, checkMediaUnlock } from "@/services/cmds";

const UNLOCK_RESULTS_STORAGE_KEY = "clash_verge_unlock_results";
const UNLOCK_RESULTS_TIME_KEY = "clash_verge_unlock_time";

const normalizeUnlockName = (name: string) => name.trim().toLowerCase();
const getStatusPriority = (status: string) => (status === "Pending" ? 0 : 1);

const mergeOptionalFields = (
  preferred: IUnlockItem,
  fallback: IUnlockItem,
) => ({
  ...preferred,
  region: preferred.region ?? fallback.region,
  check_time: preferred.check_time ?? fallback.check_time,
});

const dedupeUnlockItems = (items: IUnlockItem[]) => {
  const map = new Map<string, IUnlockItem>();
  items.forEach((item) => {
    const key = normalizeUnlockName(item.name);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      return;
    }
    const existingPriority = getStatusPriority(existing.status);
    const itemPriority = getStatusPriority(item.status);
    if (itemPriority >= existingPriority) {
      map.set(key, mergeOptionalFields(item, existing));
    } else {
      map.set(key, mergeOptionalFields(existing, item));
    }
  });
  return Array.from(map.values());
};

const useStyles = makeStyles({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "12px",
    padding: "8px",
  },
  empty: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "50%",
  },
  card: {
    ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  spin: {
    animationName: {
      "0%": { transform: "rotate(0deg)" },
      "100%": { transform: "rotate(360deg)" },
    },
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  },
});

type BadgeColor = Parameters<typeof Badge>[0]["color"];

const UnlockPage = () => {
  const { t } = useTranslation();
  const classes = useStyles();

  const [unlockItems, setUnlockItems] = useState<IUnlockItem[]>([]);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);

  const sortItemsByName = useCallback(
    (items: IUnlockItem[]) =>
      [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const saveResultsToStorage = useCallback(
    (items: IUnlockItem[], time: string | null) => {
      try {
        localStorage.setItem(UNLOCK_RESULTS_STORAGE_KEY, JSON.stringify(items));
        if (time) localStorage.setItem(UNLOCK_RESULTS_TIME_KEY, time);
      } catch (err) {
        console.error("Failed to save results to storage:", err);
      }
    },
    [],
  );

  const loadResultsFromStorage = useCallback((): {
    items: IUnlockItem[] | null;
    time: string | null;
  } => {
    try {
      const itemsJson = localStorage.getItem(UNLOCK_RESULTS_STORAGE_KEY);
      const time = localStorage.getItem(UNLOCK_RESULTS_TIME_KEY);
      if (itemsJson) {
        return {
          items: dedupeUnlockItems(JSON.parse(itemsJson) as IUnlockItem[]),
          time,
        };
      }
    } catch (err) {
      console.error("Failed to load results from storage:", err);
    }
    return { items: null, time: null };
  }, []);

  const mergeUnlockItems = useCallback(
    (defaults: IUnlockItem[], existing?: IUnlockItem[] | null) => {
      if (!existing || existing.length === 0) return defaults;
      const normalizedExisting = dedupeUnlockItems(existing);
      const existingMap = new Map(
        normalizedExisting.map((item) => [
          normalizeUnlockName(item.name),
          item,
        ]),
      );
      const merged = defaults.map((item) => {
        const matched = existingMap.get(normalizeUnlockName(item.name));
        return matched ? { ...matched, name: item.name } : item;
      });
      const mergedNames = new Set(
        merged.map((item) => normalizeUnlockName(item.name)),
      );
      normalizedExisting.forEach((item) => {
        if (!mergedNames.has(normalizeUnlockName(item.name))) merged.push(item);
      });
      return merged;
    },
    [],
  );

  const loadUnlockItems = useCallback(
    async (
      existingItems: IUnlockItem[] | null = null,
      existingTime: string | null = null,
    ) => {
      try {
        const defaultItems = await getUnlockItems();
        const sortedItems = sortItemsByName(
          mergeUnlockItems(defaultItems, existingItems),
        );
        setUnlockItems(sortedItems);
        saveResultsToStorage(
          sortedItems,
          existingItems && existingItems.length > 0 ? existingTime : null,
        );
      } catch (err) {
        console.error("Failed to get unlock items:", err);
      }
    },
    [mergeUnlockItems, saveResultsToStorage, sortItemsByName],
  );

  useEffect(() => {
    void (async () => {
      const { items: storedItems, time: storedTime } = loadResultsFromStorage();
      if (storedItems && storedItems.length > 0) {
        setUnlockItems(sortItemsByName(storedItems));
        await loadUnlockItems(storedItems, storedTime);
      } else {
        await loadUnlockItems();
      }
    })();
  }, [loadUnlockItems, loadResultsFromStorage, sortItemsByName]);

  const checkAllMedia = useLockFn(async () => {
    try {
      setIsCheckingAll(true);
      const result = await checkMediaUnlock();
      const sortedItems = sortItemsByName(dedupeUnlockItems(result));
      setUnlockItems(sortedItems);
      saveResultsToStorage(sortedItems, new Date().toLocaleString());
    } catch (err: any) {
      Notice.error(err?.message || err?.toString() || t("Unlock Test Failed"));
      console.error("Failed to check media unlock:", err);
    } finally {
      setIsCheckingAll(false);
    }
  });

  const checkSingleMedia = useLockFn(async (name: string) => {
    try {
      setLoadingItems((prev) => [...prev, name]);
      const result = dedupeUnlockItems(await checkMediaUnlock());
      const normalizedName = normalizeUnlockName(name);
      const targetItem = result.find(
        (item) => normalizeUnlockName(item.name) === normalizedName,
      );
      if (targetItem) {
        const updatedItems = sortItemsByName(
          dedupeUnlockItems(
            unlockItems.map((item) =>
              normalizeUnlockName(item.name) === normalizedName
                ? targetItem
                : item,
            ),
          ),
        );
        setUnlockItems(updatedItems);
        saveResultsToStorage(updatedItems, new Date().toLocaleString());
      }
    } catch (err: any) {
      Notice.error(err?.message || err?.toString() || t("Unlock Test Failed"));
      console.error(`Failed to check ${name}:`, err);
    } finally {
      setLoadingItems((prev) => prev.filter((item) => item !== name));
    }
  });

  const getStatusColor = (status: string): BadgeColor => {
    if (status === "Yes") return "success";
    if (status === "No") return "danger";
    if (status === "Soon") return "warning";
    if (status.includes("Failed")) return "danger";
    if (status === "Completed") return "informative";
    if (
      status === "Disallowed ISP" ||
      status === "Blocked" ||
      status === "Unsupported Country/Region"
    )
      return "danger";
    return "subtle";
  };

  const getStatusIcon = (status: string) => {
    if (status === "Pending") return <PendingOutlined fontSize="inherit" />;
    if (status === "Yes") return <CheckCircleOutlined fontSize="inherit" />;
    if (status === "No") return <CancelOutlined fontSize="inherit" />;
    if (status === "Soon") return <AccessTimeOutlined fontSize="inherit" />;
    return <HelpOutlined fontSize="inherit" />;
  };

  const getStatusBorderColor = (status: string) => {
    if (status === "Yes") return tokens.colorStatusSuccessForeground1;
    if (status === "No") return tokens.colorStatusDangerForeground1;
    if (status === "Soon") return tokens.colorStatusWarningForeground1;
    if (status.includes("Failed")) return tokens.colorStatusDangerForeground1;
    if (status === "Completed") return tokens.colorBrandForeground1;
    return tokens.colorNeutralStroke1;
  };

  return (
    <BasePage
      title={t("Unlock Test")}
      header={
        <Button
          appearance="primary"
          size="small"
          disabled={isCheckingAll}
          onClick={checkAllMedia}
          icon={isCheckingAll ? <Spinner size="tiny" /> : <RefreshRounded />}
        >
          {isCheckingAll ? t("Testing") : t("Test All")}
        </Button>
      }
    >
      {unlockItems.length === 0 ? (
        <div className={classes.empty}>
          <BaseEmpty />
        </div>
      ) : (
        <div className={classes.grid}>
          {unlockItems.map((item) => (
            <div
              key={item.name}
              className={classes.card}
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                borderRadius: tokens.borderRadiusLarge,
                border: `1px solid ${tokens.colorNeutralStroke2}`,
                borderLeft: `4px solid ${getStatusBorderColor(item.status)}`,
                backgroundColor: tokens.colorNeutralBackground1,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "10px 12px", flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Subtitle2>{item.name}</Subtitle2>
                  <Tooltip content={t("Test")} relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      shape="circular"
                      disabled={
                        loadingItems.includes(item.name) || isCheckingAll
                      }
                      icon={
                        <RefreshRounded
                          className={
                            loadingItems.includes(item.name)
                              ? classes.spin
                              : undefined
                          }
                        />
                      }
                      onClick={() => checkSingleMedia(item.name)}
                    />
                  </Tooltip>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 6,
                  }}
                >
                  <Badge
                    appearance="tint"
                    color={getStatusColor(item.status)}
                    icon={getStatusIcon(item.status)}
                  >
                    {item.status}
                  </Badge>
                  {item.region && (
                    <Badge appearance="outline" color="informative">
                      {item.region}
                    </Badge>
                  )}
                </div>
              </div>

              <div
                style={{
                  borderTop: `1px dashed ${tokens.colorNeutralStroke2}`,
                  margin: "0 10px",
                }}
              />

              <div style={{ padding: "2px 12px" }}>
                <Caption1
                  style={{
                    display: "block",
                    color: tokens.colorNeutralForeground3,
                    textAlign: "right",
                  }}
                >
                  {item.check_time || "-- --"}
                </Caption1>
              </div>
            </div>
          ))}
        </div>
      )}
    </BasePage>
  );
};

export default UnlockPage;
