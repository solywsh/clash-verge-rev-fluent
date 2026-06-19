import useSWR from "swr";
import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { Box, Typography } from "@mui/material";
import { Button } from "@fluentui/react-components";
import { AddRegular } from "@fluentui/react-icons";
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

const RulesPage = () => {
  const { t } = useTranslation();
  const { data = [], mutate: mutateRules } = useSWR("getRules", getRules);
  const { current } = useProfiles();
  const [match, setMatch] = useState(() => (_: string) => true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  // Subscribe to cumulative hit-count updates; counts are read per-row below.
  useRuleHitVersion();

  const rules = useMemo(() => {
    return data.filter((item) => match(item.payload));
  }, [data, match]);

  const scrollToTop = () => {
    virtuosoRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleScroll = (e: any) => {
    setShowScrollTop(e.target.scrollTop > 100);
  };

  const onAddRule = () => {
    if (!current?.uid || !current?.option?.rules) {
      Notice.error(t("No Profile Selected For Rule"));
      return;
    }
    setEditorOpen(true);
  };

  return (
    <BasePage
      full
      title={t("Rules")}
      contentStyle={{ height: "100%" }}
      header={
        <Box display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 240 }}>
            <BaseSearchBox onSearch={(match) => setMatch(() => match)} />
          </Box>
          <ProviderButton />
          <Button
            appearance="primary"
            icon={<AddRegular />}
            onClick={onAddRule}
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
        {/* Column header — uses the same grid template as each rule row. */}
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
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: "center" }}
          >
            {t("Rule No")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("Rule Type")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("Rule Value")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("Rule Policy")}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: "right" }}
          >
            {t("Rule Usage")}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, position: "relative", minHeight: 0 }}>
          {rules.length > 0 ? (
            <>
              <Virtuoso
                ref={virtuosoRef}
                style={{ height: "100%" }}
                data={rules}
                itemContent={(index, item) => (
                  <RuleItem
                    index={index + 1}
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
