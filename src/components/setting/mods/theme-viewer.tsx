import { forwardRef, useImperativeHandle, useState } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { Button, Input, Label } from "@fluentui/react-components";
import { useVerge } from "@/hooks/use-verge";
import { useThemeMode } from "@/services/states";
import { defaultTheme, defaultDarkTheme } from "@/pages/_theme";
import { BaseDialog, DialogRef, Notice } from "@/components/base";
import { EditorViewer } from "@/components/profile/editor-viewer";
import { EditRounded } from "@mui/icons-material";

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "5px 2px",
};

export const ThemeViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const { verge, patchVerge } = useVerge();
  const { theme_setting } = verge ?? {};
  const [theme, setTheme] = useState(theme_setting || {});

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      setTheme({ ...theme_setting });
    },
    close: () => setOpen(false),
  }));

  const handleChange = (field: keyof typeof theme) => (value: string) => {
    setTheme((t) => ({ ...t, [field]: value }));
  };

  const onSave = useLockFn(async () => {
    try {
      await patchVerge({ theme_setting: theme });
      setOpen(false);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  // default theme
  const mode = useThemeMode();
  const dt = mode === "light" ? defaultTheme : defaultDarkTheme;

  type ThemeKey = keyof typeof theme & keyof typeof defaultTheme;

  const renderItem = (label: string, key: ThemeKey) => {
    return (
      <div style={rowStyle}>
        <Label>{label}</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 18,
              display: "inline-block",
              background: theme[key] || dt[key],
            }}
          />
          <Input
            autoComplete="off"
            style={{ width: 135 }}
            value={theme[key] ?? ""}
            placeholder={dt[key]}
            onChange={(_, data) => handleChange(key)(data.value)}
            onKeyDown={(e) => e.key === "Enter" && onSave()}
          />
        </div>
      </div>
    );
  };

  return (
    <BaseDialog
      open={open}
      title={t("Theme Setting")}
      okBtn={t("Save")}
      cancelBtn={t("Cancel")}
      contentSx={{ width: 400, maxHeight: 505, overflow: "auto", pb: 0 }}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      onOk={onSave}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        {renderItem(t("Primary Color"), "primary_color")}
        {renderItem(t("Secondary Color"), "secondary_color")}
        {renderItem(t("Primary Text"), "primary_text")}
        {renderItem(t("Secondary Text"), "secondary_text")}
        {renderItem(t("Info Color"), "info_color")}
        {renderItem(t("Warning Color"), "warning_color")}
        {renderItem(t("Error Color"), "error_color")}
        {renderItem(t("Success Color"), "success_color")}

        <div style={rowStyle}>
          <Label>{t("Font Family")}</Label>
          <Input
            autoComplete="off"
            style={{ width: 135 }}
            value={theme.font_family ?? ""}
            onChange={(_, data) => handleChange("font_family")(data.value)}
            onKeyDown={(e) => e.key === "Enter" && onSave()}
          />
        </div>

        <div style={rowStyle}>
          <Label>{t("CSS Injection")}</Label>
          <Button
            icon={<EditRounded fontSize="inherit" />}
            onClick={() => {
              setEditorOpen(true);
            }}
          >
            {t("Edit")} CSS
          </Button>
          {editorOpen && (
            <EditorViewer
              open={true}
              title={`${t("Edit")} CSS`}
              initialData={Promise.resolve(theme.css_injection ?? "")}
              language="css"
              onSave={(_prev, curr) => {
                setTheme((prev) => ({ ...prev, css_injection: curr }));
              }}
              onClose={() => {
                setEditorOpen(false);
              }}
            />
          )}
        </div>
      </div>
    </BaseDialog>
  );
});
