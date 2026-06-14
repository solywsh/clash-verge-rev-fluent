import {
  AccessTimeOutlined,
  CancelOutlined,
  CheckCircleOutlined,
  HelpOutlined,
  PendingOutlined,
  RefreshRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { useLockFn } from "ahooks";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BaseEmpty, BasePage } from "@/components/base";
import { Notice } from "@/components/base";
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

const UnlockPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

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

  const getStatusColor = (status: string): any => {
    if (status === "Yes") return "success";
    if (status === "No") return "error";
    if (status === "Soon") return "warning";
    if (status.includes("Failed")) return "error";
    if (status === "Completed") return "info";
    if (
      status === "Disallowed ISP" ||
      status === "Blocked" ||
      status === "Unsupported Country/Region"
    )
      return "error";
    return "default";
  };

  const getStatusIcon = (status: string) => {
    if (status === "Pending") return <PendingOutlined />;
    if (status === "Yes") return <CheckCircleOutlined />;
    if (status === "No") return <CancelOutlined />;
    if (status === "Soon") return <AccessTimeOutlined />;
    return <HelpOutlined />;
  };

  const getStatusBorderColor = (status: string) => {
    if (status === "Yes") return theme.palette.success.main;
    if (status === "No") return theme.palette.error.main;
    if (status === "Soon") return theme.palette.warning.main;
    if (status.includes("Failed")) return theme.palette.error.main;
    if (status === "Completed") return theme.palette.info.main;
    return theme.palette.divider;
  };

  return (
    <BasePage
      title={t("Unlock Test")}
      header={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            disabled={isCheckingAll}
            onClick={checkAllMedia}
            startIcon={
              isCheckingAll ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <RefreshRounded />
              )
            }
          >
            {isCheckingAll ? t("Testing") : t("Test All")}
          </Button>
        </Box>
      }
    >
      {unlockItems.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "50%",
          }}
        >
          <BaseEmpty />
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 1.5,
            p: 1,
          }}
        >
          {unlockItems.map((item) => (
            <Card
              key={item.name}
              variant="outlined"
              sx={{
                height: "100%",
                borderRadius: 2,
                borderLeft: `4px solid ${getStatusBorderColor(item.status)}`,
                backgroundColor: isDark ? "#282a36" : "#ffffff",
                display: "flex",
                flexDirection: "column",
                "&:hover": {
                  backgroundColor: isDark
                    ? alpha(theme.palette.primary.dark, 0.05)
                    : alpha(theme.palette.primary.light, 0.05),
                },
              }}
            >
              <Box sx={{ p: 1.3, flex: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, fontSize: "1rem" }}
                  >
                    {item.name}
                  </Typography>
                  <Tooltip title={t("Test")}>
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        disabled={
                          loadingItems.includes(item.name) || isCheckingAll
                        }
                        sx={{
                          minWidth: "32px",
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                        }}
                        onClick={() => checkSingleMedia(item.name)}
                      >
                        <RefreshRounded
                          sx={{
                            animation: loadingItems.includes(item.name)
                              ? "spin 1s linear infinite"
                              : "none",
                            "@keyframes spin": {
                              "0%": { transform: "rotate(0deg)" },
                              "100%": { transform: "rotate(360deg)" },
                            },
                          }}
                        />
                      </Button>
                    </span>
                  </Tooltip>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                    mt: 0.5,
                  }}
                >
                  <Chip
                    label={item.status}
                    color={getStatusColor(item.status)}
                    size="small"
                    icon={getStatusIcon(item.status)}
                    sx={{
                      fontWeight: item.status === "Pending" ? "normal" : "bold",
                    }}
                  />
                  {item.region && (
                    <Chip
                      label={item.region}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  )}
                </Box>
              </Box>

              <Divider
                sx={{
                  borderStyle: "dashed",
                  borderColor: alpha(theme.palette.divider, 0.2),
                  mx: 1,
                }}
              />

              <Box sx={{ px: 1.5, py: 0.2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    color: "text.secondary",
                    fontSize: "0.7rem",
                    textAlign: "right",
                  }}
                >
                  {item.check_time || "-- --"}
                </Typography>
              </Box>
            </Card>
          ))}
        </Box>
      )}
    </BasePage>
  );
};

export default UnlockPage;
