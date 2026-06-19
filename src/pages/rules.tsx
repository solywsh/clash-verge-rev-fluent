import useSWR from "swr";
import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { Box, Typography } from "@mui/material";
import { Button } from "@fluentui/react-components";
import {
  AddRegular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
} from "@fluentui/react-icons";
import { getRules } from "@/services/api";
import { enhanceProfiles } from "@/services/cmds";
import { useProfiles } from "@/hooks/use-profiles";
import { BaseEmpty, BasePage, Notice } from "@/components/base";
import RuleItem, { RULE_GRID_COLUMNS } from "@/components/rule/rule-item";
import { ProviderButton } from "@/components/rule/provider-button";
import { RulesEditorViewer } from "@/components/profile/rules-editor-viewer";
import { FluentBaseSearchBox as BaseSearchBox } from "@/components/base/base-search-box";
import {
  getRuleHitCount,
  useRuleHitVersion,
} from "@/services/rule-hit-counter";
import { tokens } from "./_fluent_theme";
import { ScrollTopButton } from "@/components/layout/scroll-top-button";

type SortKey = "index" | "type" | "payload" | "proxy" | "usage";
type SortDir = "asc" | "desc";

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

  // Keep each rule's original config position so the "No." column stays stable
  // even after sorting/filtering.
  const indexed = useMemo(
    () => data.map((item, i) => ({ item, no: i + 1 })),
    [data],
  );

  const rules = useMemo(() => {
    const filtered = indexed.filter(({ item }) => match(item.payload));
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
  }, [indexed, match, sortKey, sortDir, usageDep]);

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
          {/* Shrinkable so it can never overflow onto the buttons on narrow
              windows; the buttons themselves keep their intrinsic size. */}
          <Box sx={{ display: "flex", flex: "0 1 220px", minWidth: 96 }}>
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
                itemContent={(_, { item, no }) => (
                  <RuleItem
                    index={no}
                    value={item}
                    usage={getRuleHitCount(item.type, item.payload)}
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
