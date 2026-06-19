import { forwardRef, useImperativeHandle, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Body1Strong, Button, Tag } from "@fluentui/react-components";
import { EditRegular, DocumentBulletListRegular } from "@fluentui/react-icons";
import { readProfileFile, saveProfileFile } from "@/services/cmds";
import { BaseDialog, DialogRef } from "@/components/base";
import { EditorViewer } from "./editor-viewer";
import { LogViewer } from "./log-viewer";
import { tokens } from "@/pages/_fluent_theme";

interface Props {
  // Script chain logs, used to surface a runtime-error dot on the console.
  logInfo?: [string, string][];
  onSave?: (prev?: string, curr?: string) => void;
}

// Central place for the two global enhancement chains (Merge + Script), moved
// off the profiles list into a dedicated dialog so the list stays clean.
export const GlobalEnhanceViewer = forwardRef<DialogRef, Props>(
  ({ logInfo = [], onSave }, ref) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [mergeOpen, setMergeOpen] = useState(false);
    const [scriptOpen, setScriptOpen] = useState(false);
    const [logOpen, setLogOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
    }));

    const hasError = !!logInfo.find((e) => e[0] === "exception");

    const rowStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingBlock: 12,
    };

    return (
      <>
        <BaseDialog
          open={open}
          title={t("Global Enhancement")}
          okBtn={t("Close")}
          disableCancel
          contentSx={{ width: 420, pb: 1 }}
          onClose={() => setOpen(false)}
          onOk={() => setOpen(false)}
        >
          {/* Global Merge (YAML overlay applied to every profile) */}
          <div style={rowStyle}>
            <div style={{ minWidth: 0 }}>
              <Body1Strong>{t("Global Merge")}</Body1Strong>{" "}
              <Tag size="extra-small" appearance="outline">
                YAML
              </Tag>
            </div>
            <Button icon={<EditRegular />} onClick={() => setMergeOpen(true)}>
              {t("Edit File")}
            </Button>
          </div>

          {/* Global Script (JS run over every profile's final config) */}
          <div
            style={{
              ...rowStyle,
              borderTop: `1px solid ${tokens.itemBorderColor1}`,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <Body1Strong>{t("Global Script")}</Body1Strong>{" "}
              <Tag size="extra-small" appearance="outline">
                JS
              </Tag>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <Button
                  icon={<DocumentBulletListRegular />}
                  title={t("Script Console")}
                  onClick={() => setLogOpen(true)}
                />
                {hasError && (
                  <Badge
                    size="tiny"
                    color="danger"
                    style={{ position: "absolute", top: -2, right: -2 }}
                  />
                )}
              </div>
              <Button
                icon={<EditRegular />}
                onClick={() => setScriptOpen(true)}
              >
                {t("Edit File")}
              </Button>
            </div>
          </div>
        </BaseDialog>

        {mergeOpen && (
          <EditorViewer
            open
            title={t("Global Merge")}
            initialData={readProfileFile("Merge")}
            language="yaml"
            schema="clash"
            onSave={async (prev, curr) => {
              await saveProfileFile("Merge", curr ?? "");
              onSave?.(prev, curr);
            }}
            onClose={() => setMergeOpen(false)}
          />
        )}

        {scriptOpen && (
          <EditorViewer
            open
            title={t("Global Script")}
            initialData={readProfileFile("Script")}
            language="javascript"
            onSave={async (prev, curr) => {
              await saveProfileFile("Script", curr ?? "");
              onSave?.(prev, curr);
            }}
            onClose={() => setScriptOpen(false)}
          />
        )}

        {logOpen && (
          <LogViewer
            open={logOpen}
            logInfo={logInfo}
            onClose={() => setLogOpen(false)}
          />
        )}
      </>
    );
  },
);
