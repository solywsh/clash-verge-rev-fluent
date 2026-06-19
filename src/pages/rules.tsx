import useSWR from "swr";
import { useState, useMemo, useRef, useEffect } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { Box, Typography } from "@mui/material";
import {
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from "@fluentui/react-components";
import {
  AddRegular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
  MoreHorizontalRegular,
  DeleteRegular,
} from "@fluentui/react-icons";
import { getRules } from "@/services/api";
import {
  enhanceProfiles,
  readProfileFile,
  saveProfileFile,
} from "@/services/cmds";
import { useProfiles } from "@/hooks/use-profiles";
import { BaseEmpty, BasePage, Notice } from "@/components/base";
import RuleItem, { RULE_GRID_COLUMNS } from "@/components/rule/rule-item";
import { ProviderButton } from "@/components/rule/provider-button";
import { RulesEditorViewer } from "@/components/profile/rules-editor-viewer";
import { FluentBaseSearchBox as BaseSearchBox } from "@/components/base/base-search-box";
import {
  getRuleHitCount,
  useRuleHitVersion,
  ruleHitKey,
  pruneRuleHitCounts,
  clearRuleHitCounts,
} from "@/services/rule-hit-counter";
import {
  buildSourceRuleMap,
  runtimeRuleKey,
  sourceRuleToDisplay,
  parseRuleSeq,
  dumpRuleSeq,
} from "@/services/rule-source";
import { tokens } from "./_fluent_theme";
import { ScrollTopButton } from "@/components/layout/scroll-top-button";

type SortKey = "index" | "type" | "payload" | "proxy" | "usage";
type SortDir = "asc" | "desc";

// One row in the combined (active + disabled) list.
interface RuleRow {
  item: IRuleItem;
  no: number; // runtime config order; large sentinel for disabled-only rows
  runtime: boolean; // came from /rules (has a real No.)
  enabled: boolean; // checkbox state
  raw: string | null; // exact source string; null = not toggleable here
}

const RulesPage = () => {
  const { t } = useTranslation();
  const { data = [], mutate: mutateRules } = useSWR("getRules", getRules);
  const { current } = useProfiles();
  const [match, setMatch] = useState(() => (_: string) => true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("usage");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Re-render (and re-sort, when sorting by usage) as hit counts accumulate.
  const hitVersion = useRuleHitVersion();
  const usageDep = sortKey === "usage" ? hitVersion : 0;

  const rulesUid = current?.option?.rules;

  // Source rules of the active profile + its rule-sequence file. Used to map a
  // runtime rule back to its exact source string (for enable/disable) and to
  // know which rules are currently disabled.
  const { data: source } = useSWR(
    current?.uid ? ["rule-source", current.uid, rulesUid] : null,
    async () => {
      const baseRaw = await readProfileFile(current!.uid);
      const map = buildSourceRuleMap(baseRaw);
      const seq = rulesUid
        ? parseRuleSeq(await readProfileFile(rulesUid))
        : { prepend: [], append: [], delete: [] };
      return { map, seq };
    },
  );

  // The delete list is our optimistic source of truth for what's disabled; it's
  // seeded from the file and written back (debounced) on toggle.
  const [deleteList, setDeleteList] = useState<string[]>([]);
  useEffect(() => {
    if (source) setDeleteList(source.seq.delete);
  }, [source]);

  const canToggle = !!rulesUid && !!source;
  const deleteSet = useMemo(() => new Set(deleteList), [deleteList]);

  // Drop counts for rules that no longer exist so localStorage stays bounded.
  useEffect(() => {
    if (data.length) {
      pruneRuleHitCounts(
        new Set(data.map((item) => ruleHitKey(item.type, item.payload))),
      );
    }
  }, [data]);

  // Persist the delete list (debounced) and reactivate the profile so changes
  // take effect. Rapid toggles collapse into a single reactivation.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doSave = useLockFn(async (nextDelete: string[]) => {
    if (!rulesUid || !source) return;
    try {
      await saveProfileFile(
        rulesUid,
        dumpRuleSeq({
          prepend: source.seq.prepend,
          append: source.seq.append,
          delete: nextDelete,
        }),
      );
      await enhanceProfiles();
      await mutateRules();
    } catch (err: any) {
      Notice.error(err?.message || err?.toString());
    }
  });
  const scheduleSave = (nextDelete: string[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(nextDelete), 800);
  };

  // Build the combined list: active rules from /rules + currently-disabled
  // rules (which no longer appear in /rules) rendered back as dimmed rows.
  const combined = useMemo<RuleRow[]>(() => {
    const map = source?.map;
    const active: RuleRow[] = data.map((item, i) => {
      const raw =
        map?.get(runtimeRuleKey(item.type, item.payload, item.proxy)) ?? null;
      return {
        item,
        no: i + 1,
        runtime: true,
        enabled: raw ? !deleteSet.has(raw) : true,
        raw: canToggle ? raw : null,
      };
    });
    // Disabled rules that aren't in /rules anymore — show them dimmed.
    const presentRaws = new Set(
      active.map((r) => r.raw).filter((r): r is string => !!r),
    );
    const disabledExtra: RuleRow[] = deleteList
      .filter((raw) => !presentRaws.has(raw))
      .map((raw, i) => ({
        item: sourceRuleToDisplay(raw),
        no: data.length + i + 1,
        runtime: false,
        enabled: false,
        raw,
      }));
    return [...active, ...disabledExtra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, source, deleteSet, deleteList, canToggle]);

  const rules = useMemo(() => {
    const filtered = combined.filter(
      ({ item }) =>
        match(item.payload) || match(item.type) || match(item.proxy),
    );
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let r = 0;
      switch (sortKey) {
        case "index":
          r = a.no - b.no;
          break;
        case "type":
          r = a.item.type.localeCompare(b.item.type);
          break;
        case "payload":
          r = a.item.payload.localeCompare(b.item.payload);
          break;
        case "proxy":
          r = a.item.proxy.localeCompare(b.item.proxy);
          break;
        case "usage":
          r =
            getRuleHitCount(a.item.type, a.item.payload) -
            getRuleHitCount(b.item.type, b.item.payload);
          break;
      }
      // Stable tiebreak by original config order.
      if (r === 0) r = a.no - b.no;
      return r * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combined, match, sortKey, sortDir, usageDep]);

  const onToggleRule = (row: RuleRow) => {
    if (!canToggle) {
      Notice.error(t("No Profile Selected For Rule"));
      return;
    }
    if (!row.raw) {
      Notice.info(t("Cannot Toggle This Rule"));
      return;
    }
    setDeleteList((prev) => {
      const next = row.enabled
        ? [...prev, row.raw!]
        : prev.filter((s) => s !== row.raw);
      scheduleSave(next);
      return next;
    });
  };

  const scrollToTop = () => {
    virtuosoRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleScroll = (e: any) => {
    setShowScrollTop(e.target.scrollTop > 100);
  };

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Usage reads best high-to-low; text columns read best A-to-Z.
      setSortDir(key === "usage" ? "desc" : "asc");
    }
  };

  const onAddRule = () => {
    if (!current?.uid || !current?.option?.rules) {
      Notice.error(t("No Profile Selected For Rule"));
      return;
    }
    setEditorOpen(true);
  };

  const HeaderCell = ({
    col,
    label,
    align = "left",
  }: {
    col: SortKey;
    label: string;
    align?: "left" | "center" | "right";
  }) => (
    <Box
      onClick={() => onSort(col)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.25,
        justifyContent:
          align === "right"
            ? "flex-end"
            : align === "center"
              ? "center"
              : "flex-start",
        cursor: "pointer",
        userSelect: "none",
        color: sortKey === col ? "text.primary" : "text.secondary",
        "&:hover": { color: "text.primary" },
      }}
    >
      <Typography variant="caption" color="inherit">
        {label}
      </Typography>
      {sortKey === col &&
        (sortDir === "asc" ? (
          <ArrowSortUpRegular fontSize={14} />
        ) : (
          <ArrowSortDownRegular fontSize={14} />
        ))}
    </Box>
  );

  return (
    <BasePage
      full
      title={t("Rules")}
      contentStyle={{ height: "100%" }}
      header={
        <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          {/* The Fluent Input's min content width (text field + 3 icon
              buttons) is ~260px and it won't shrink below that on its own, so
              it used to overflow a narrower wrapper and collide with the
              buttons. Force min-width:0 on the input internals so it actually
              shrinks to the wrapper's flex basis. */}
          <Box
            sx={{
              display: "flex",
              flex: "0 1 260px",
              minWidth: 96,
              "& .fui-Input": { minWidth: 0, width: "100%" },
              "& .fui-Input input": { minWidth: 0 },
            }}
          >
            <BaseSearchBox onSearch={(match) => setMatch(() => match)} />
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <ProviderButton />
          </Box>
          <Button
            appearance="primary"
            icon={<AddRegular />}
            onClick={onAddRule}
            style={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {t("Add Rule")}
          </Button>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="subtle"
                icon={<MoreHorizontalRegular />}
                aria-label={t("More")}
                style={{ flexShrink: 0 }}
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={<DeleteRegular />}
                  onClick={() => {
                    clearRuleHitCounts();
                    Notice.success(t("Usage Count Cleared"), 1000);
                  }}
                >
                  {t("Clear Usage Count")}
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </Box>
      }
    >
      {editorOpen && current?.uid && (
        <RulesEditorViewer
          groupsUid={current.option?.groups ?? ""}
          mergeUid={current.option?.merge ?? ""}
          profileUid={current.uid}
          property={current.option?.rules ?? ""}
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSave={async () => {
            try {
              await enhanceProfiles();
              await mutateRules();
              Notice.success(t("Profile Reactivated"), 1000);
            } catch (err: any) {
              Notice.error(err?.message || err?.toString());
            }
          }}
        />
      )}

      <Box
        height="calc(100% - 10px)"
        sx={{
          margin: "10px",
          mx: "20px",
          borderRadius: "8px",
          bgcolor: tokens.surface1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Column header — uses the same grid template as each rule row and is
            click-to-sort. */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: RULE_GRID_COLUMNS,
            alignItems: "center",
            columnGap: 2,
            px: 2,
            py: 1,
            borderBottom: "1px solid var(--divider-color)",
            flexShrink: 0,
          }}
        >
          <span />
          <HeaderCell col="index" label={t("Rule No")} align="center" />
          <HeaderCell col="type" label={t("Rule Type")} />
          <HeaderCell col="payload" label={t("Rule Value")} />
          <HeaderCell col="proxy" label={t("Rule Policy")} />
          <HeaderCell col="usage" label={t("Rule Usage")} align="right" />
        </Box>

        <Box sx={{ flex: 1, position: "relative", minHeight: 0 }}>
          {rules.length > 0 ? (
            <>
              <Virtuoso
                ref={virtuosoRef}
                style={{ height: "100%" }}
                data={rules}
                itemContent={(_, row) => (
                  <RuleItem
                    index={row.runtime ? row.no : "—"}
                    value={row.item}
                    usage={getRuleHitCount(row.item.type, row.item.payload)}
                    enabled={row.enabled}
                    toggleable={!!row.raw}
                    toggleHint={t("Cannot Toggle This Rule")}
                    onToggle={() => onToggleRule(row)}
                  />
                )}
                followOutput={"smooth"}
                scrollerRef={(ref) => {
                  if (ref) ref.addEventListener("scroll", handleScroll);
                }}
              />
              <ScrollTopButton onClick={scrollToTop} show={showScrollTop} />
            </>
          ) : (
            <BaseEmpty />
          )}
        </Box>
      </Box>
    </BasePage>
  );
};

export default RulesPage;
