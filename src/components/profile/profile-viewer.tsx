import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Field,
  Input,
  Label,
  Switch as FluentSwitch,
  Tab,
  TabList,
  Textarea,
} from "@fluentui/react-components";
import { createProfile, patchProfile } from "@/services/cmds";
import { BaseDialog, Notice } from "@/components/base";
import { version } from "@root/package.json";
import { FileInput } from "./file-input";

interface Props {
  onChange: () => void;
}

export interface ProfileViewerRef {
  create: () => void;
  edit: (item: IProfileItem) => void;
}

// Default auto-update interval: 1 day.
const DEFAULT_INTERVAL = 1440;

// A label-left / control-right row used for the inline switches.
const switchRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

// create or edit the profile
// remote / local
export const ProfileViewer = forwardRef<ProfileViewerRef, Props>(
  (props, ref) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [openType, setOpenType] = useState<"new" | "edit">("new");
    const [loading, setLoading] = useState(false);

    // file input
    const fileDataRef = useRef<string | null>(null);

    const { control, watch, register, ...formIns } = useForm<IProfileItem>({
      defaultValues: {
        type: "remote",
        name: "",
        desc: "",
        url: "",
        option: {
          with_proxy: false,
          self_proxy: false,
          update_interval: DEFAULT_INTERVAL,
        },
      },
    });

    useImperativeHandle(ref, () => ({
      create: () => {
        setOpenType("new");
        setOpen(true);
      },
      edit: (item) => {
        if (item) {
          Object.entries(item).forEach(([key, value]) => {
            formIns.setValue(key as any, value);
          });
        }
        setOpenType("edit");
        setOpen(true);
      },
    }));

    const selfProxy = watch("option.self_proxy");
    const withProxy = watch("option.with_proxy");

    useEffect(() => {
      if (selfProxy) formIns.setValue("option.with_proxy", false);
    }, [selfProxy]);

    useEffect(() => {
      if (withProxy) formIns.setValue("option.self_proxy", false);
    }, [withProxy]);

    const handleOk = useLockFn(
      formIns.handleSubmit(async (form) => {
        setLoading(true);
        try {
          if (!form.type) throw new Error("`Type` should not be null");
          if (form.type === "remote" && !form.url) {
            throw new Error("The URL should not be null");
          }

          // update_interval > 0 means auto-update is on; 0 / empty means off,
          // so drop the field entirely in that case.
          if (form.option?.update_interval) {
            form.option.update_interval = +form.option.update_interval;
          } else {
            delete form.option?.update_interval;
          }
          if (form.option?.user_agent === "") {
            delete form.option.user_agent;
          }
          const name = form.name || `${form.type} file`;
          const item = { ...form, name };

          // 创建
          if (openType === "new") {
            await createProfile(item, fileDataRef.current);
          }
          // 编辑
          else {
            if (!form.uid) throw new Error("UID not found");
            await patchProfile(form.uid, item);
          }
          setOpen(false);
          setLoading(false);
          setTimeout(() => formIns.reset(), 500);
          fileDataRef.current = null;
          props.onChange();
        } catch (err: any) {
          Notice.error(err.message || err.toString());
          setLoading(false);
        }
      }),
    );

    const handleClose = () => {
      setOpen(false);
      fileDataRef.current = null;
      setTimeout(() => formIns.reset(), 500);
    };

    const formType = watch("type");
    const isRemote = formType === "remote";
    const isLocal = formType === "local";

    // Auto-update toggle is derived from update_interval (>0 = on).
    const updateInterval = Number(watch("option.update_interval")) || 0;
    const autoUpdate = updateInterval > 0;

    return (
      <BaseDialog
        open={open}
        title={openType === "new" ? t("Create Profile") : t("Edit Profile")}
        contentSx={{ width: 360, pb: 0, maxHeight: "80%" }}
        okBtn={t("Save")}
        cancelBtn={t("Cancel")}
        onClose={handleClose}
        onCancel={handleClose}
        onOk={handleOk}
        loading={loading}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Remote / Local switch as Fluent Tabs (i18n). Locked while editing,
              since a profile's type can't change after creation. */}
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <TabList
                selectedValue={field.value ?? "remote"}
                onTabSelect={(_, data) => field.onChange(data.value)}
              >
                {(openType === "new" || field.value === "remote") && (
                  <Tab value="remote" disabled={openType === "edit"}>
                    {t("Remote")}
                  </Tab>
                )}
                {(openType === "new" || field.value === "local") && (
                  <Tab value="local" disabled={openType === "edit"}>
                    {t("Local")}
                  </Tab>
                )}
              </TabList>
            )}
          />

          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Field label={t("Name")}>
                <Input
                  value={field.value ?? ""}
                  onChange={(_, data) => field.onChange(data.value)}
                />
              </Field>
            )}
          />

          <Controller
            name="desc"
            control={control}
            render={({ field }) => (
              <Field label={t("Descriptions")}>
                <Input
                  value={field.value ?? ""}
                  onChange={(_, data) => field.onChange(data.value)}
                />
              </Field>
            )}
          />

          {isRemote && (
            <>
              <Controller
                name="url"
                control={control}
                render={({ field }) => (
                  <Field label={t("Subscription URL")}>
                    <Textarea
                      resize="vertical"
                      value={field.value ?? ""}
                      onChange={(_, data) => field.onChange(data.value)}
                    />
                  </Field>
                )}
              />

              <div style={switchRow}>
                <Label>{t("Auto Update")}</Label>
                <FluentSwitch
                  checked={autoUpdate}
                  onChange={(_, data) =>
                    formIns.setValue(
                      "option.update_interval",
                      data.checked ? DEFAULT_INTERVAL : 0,
                    )
                  }
                />
              </div>
            </>
          )}

          {isLocal && openType === "new" && (
            <FileInput
              onChange={(file, val) => {
                formIns.setValue(
                  "name",
                  formIns.getValues("name") || file.name,
                );
                fileDataRef.current = val;
              }}
            />
          )}

          {isRemote && (
            <Accordion collapsible>
              <AccordionItem value="advanced">
                <AccordionHeader>{t("Advanced")}</AccordionHeader>
                <AccordionPanel>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      paddingTop: 8,
                    }}
                  >
                    <Controller
                      name="option.update_interval"
                      control={control}
                      render={({ field }) => (
                        <Field label={t("Update Interval")}>
                          <Input
                            type="number"
                            disabled={!autoUpdate}
                            value={field.value?.toString() ?? ""}
                            onChange={(_, data) =>
                              field.onChange(
                                data.value === "" ? 0 : Number(data.value),
                              )
                            }
                            contentAfter={
                              <span style={{ whiteSpace: "nowrap" }}>
                                {t("mins")}
                              </span>
                            }
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      name="option.user_agent"
                      control={control}
                      render={({ field }) => (
                        <Field label="User Agent">
                          <Input
                            placeholder={`clash-verge/v${version}`}
                            value={field.value ?? ""}
                            onChange={(_, data) => field.onChange(data.value)}
                          />
                        </Field>
                      )}
                    />

                    <Controller
                      name="option.with_proxy"
                      control={control}
                      render={({ field }) => (
                        <div style={switchRow}>
                          <Label>{t("Use System Proxy")}</Label>
                          <FluentSwitch
                            checked={!!field.value}
                            onChange={(_, data) => field.onChange(data.checked)}
                          />
                        </div>
                      )}
                    />

                    <Controller
                      name="option.self_proxy"
                      control={control}
                      render={({ field }) => (
                        <div style={switchRow}>
                          <Label>{t("Use Clash Proxy")}</Label>
                          <FluentSwitch
                            checked={!!field.value}
                            onChange={(_, data) => field.onChange(data.checked)}
                          />
                        </div>
                      )}
                    />

                    <Controller
                      name="option.danger_accept_invalid_certs"
                      control={control}
                      render={({ field }) => (
                        <div style={switchRow}>
                          <Label>{t("Accept Invalid Certs (Danger)")}</Label>
                          <FluentSwitch
                            checked={!!field.value}
                            onChange={(_, data) => field.onChange(data.checked)}
                          />
                        </div>
                      )}
                    />
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </BaseDialog>
    );
  },
);
