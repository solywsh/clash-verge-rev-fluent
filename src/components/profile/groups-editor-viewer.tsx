import { useEffect, useMemo, useState } from "react";
import { useLockFn } from "ahooks";
import yaml from "js-yaml";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Input,
  Label,
  Option,
  Switch as FluentSwitch,
} from "@fluentui/react-components";
import {
  VerticalAlignTopRounded,
  VerticalAlignBottomRounded,
} from "@mui/icons-material";
import { GroupItem } from "@/components/profile/group-item";
import {
  getNetworkInterfaces,
  readProfileFile,
  saveProfileFile,
} from "@/services/cmds";
import { Notice } from "@/components/base";
import getSystem from "@/utils/get-system";
import { FluentBaseSearchBox as BaseSearchBox } from "../base/base-search-box";
import { Virtuoso } from "react-virtuoso";
import MonacoEditor from "react-monaco-editor";
import { useThemeMode } from "@/services/states";
import { Controller, useForm } from "react-hook-form";

interface Props {
  proxiesUid: string;
  mergeUid: string;
  profileUid: string;
  property: string;
  open: boolean;
  onClose: () => void;
  onSave?: (prev?: string, curr?: string) => void;
}

const builtinProxyPolicies = ["DIRECT", "REJECT", "REJECT-DROP", "PASS"];

export const GroupsEditorViewer = (props: Props) => {
  const { mergeUid, proxiesUid, profileUid, property, open, onClose, onSave } =
    props;
  const { t } = useTranslation();
  const themeMode = useThemeMode();
  const [prevData, setPrevData] = useState("");
  const [currData, setCurrData] = useState("");
  const [visualization, setVisualization] = useState(true);
  const [match, setMatch] = useState(() => (_: string) => true);
  const [interfaceNameList, setInterfaceNameList] = useState<string[]>([]);
  const { control, watch, register, ...formIns } = useForm<IProxyGroupConfig>({
    defaultValues: {
      type: "select",
      name: "",
      interval: 300,
      timeout: 5000,
      "max-failed-times": 5,
      lazy: true,
    },
  });
  const [groupList, setGroupList] = useState<IProxyGroupConfig[]>([]);
  const [proxyPolicyList, setProxyPolicyList] = useState<string[]>([]);
  const [proxyProviderList, setProxyProviderList] = useState<string[]>([]);
  const [prependSeq, setPrependSeq] = useState<IProxyGroupConfig[]>([]);
  const [appendSeq, setAppendSeq] = useState<IProxyGroupConfig[]>([]);
  const [deleteSeq, setDeleteSeq] = useState<string[]>([]);

  const filteredPrependSeq = useMemo(
    () => prependSeq.filter((group) => match(group.name)),
    [prependSeq, match],
  );
  const filteredGroupList = useMemo(
    () => groupList.filter((group) => match(group.name)),
    [groupList, match],
  );
  const filteredAppendSeq = useMemo(
    () => appendSeq.filter((group) => match(group.name)),
    [appendSeq, match],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const reorder = (
    list: IProxyGroupConfig[],
    startIndex: number,
    endIndex: number,
  ) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };
  const onPrependDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      if (active.id !== over.id) {
        let activeIndex = 0;
        let overIndex = 0;
        prependSeq.forEach((item, index) => {
          if (item.name === active.id) {
            activeIndex = index;
          }
          if (item.name === over.id) {
            overIndex = index;
          }
        });

        setPrependSeq(reorder(prependSeq, activeIndex, overIndex));
      }
    }
  };
  const onAppendDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      if (active.id !== over.id) {
        let activeIndex = 0;
        let overIndex = 0;
        appendSeq.forEach((item, index) => {
          if (item.name === active.id) {
            activeIndex = index;
          }
          if (item.name === over.id) {
            overIndex = index;
          }
        });
        setAppendSeq(reorder(appendSeq, activeIndex, overIndex));
      }
    }
  };
  const fetchContent = async () => {
    let data = await readProfileFile(property);
    let obj = yaml.load(data) as ISeqProfileConfig | null;

    setPrependSeq(obj?.prepend || []);
    setAppendSeq(obj?.append || []);
    setDeleteSeq(obj?.delete || []);

    setPrevData(data);
    setCurrData(data);
  };

  useEffect(() => {
    if (currData === "") return;
    if (visualization !== true) return;

    let obj = yaml.load(currData) as {
      prepend: [];
      append: [];
      delete: [];
    } | null;
    setPrependSeq(obj?.prepend || []);
    setAppendSeq(obj?.append || []);
    setDeleteSeq(obj?.delete || []);
  }, [visualization]);

  useEffect(() => {
    if (prependSeq && appendSeq && deleteSeq)
      setCurrData(
        yaml.dump(
          { prepend: prependSeq, append: appendSeq, delete: deleteSeq },
          {
            forceQuotes: true,
          },
        ),
      );
  }, [prependSeq, appendSeq, deleteSeq]);

  const fetchProxyPolicy = async () => {
    let data = await readProfileFile(profileUid);
    let proxiesData = await readProfileFile(proxiesUid);
    let originGroupsObj = yaml.load(data) as {
      "proxy-groups": IProxyGroupConfig[];
    } | null;

    let originProxiesObj = yaml.load(data) as { proxies: [] } | null;
    let originProxies = originProxiesObj?.proxies || [];
    let moreProxiesObj = yaml.load(proxiesData) as ISeqProfileConfig | null;
    let morePrependProxies = moreProxiesObj?.prepend || [];
    let moreAppendProxies = moreProxiesObj?.append || [];
    let moreDeleteProxies =
      moreProxiesObj?.delete || ([] as string[] | { name: string }[]);

    let proxies = morePrependProxies.concat(
      originProxies.filter((proxy: any) => {
        if (proxy.name) {
          return !moreDeleteProxies.includes(proxy.name);
        } else {
          return !moreDeleteProxies.includes(proxy);
        }
      }),
      moreAppendProxies,
    );

    setProxyPolicyList(
      builtinProxyPolicies.concat(
        prependSeq.map((group: IProxyGroupConfig) => group.name),
        originGroupsObj?.["proxy-groups"]
          .map((group: IProxyGroupConfig) => group.name)
          .filter((name) => !deleteSeq.includes(name)) || [],
        appendSeq.map((group: IProxyGroupConfig) => group.name),
        proxies.map((proxy: any) => proxy.name),
      ),
    );
  };
  const fetchProfile = async () => {
    let data = await readProfileFile(profileUid);
    let mergeData = await readProfileFile(mergeUid);
    let globalMergeData = await readProfileFile("Merge");

    let originGroupsObj = yaml.load(data) as {
      "proxy-groups": IProxyGroupConfig[];
    } | null;

    let originProviderObj = yaml.load(data) as { "proxy-providers": {} } | null;
    let originProvider = originProviderObj?.["proxy-providers"] || {};

    let moreProviderObj = yaml.load(mergeData) as {
      "proxy-providers": {};
    } | null;
    let moreProvider = moreProviderObj?.["proxy-providers"] || {};

    let globalProviderObj = yaml.load(globalMergeData) as {
      "proxy-providers": {};
    } | null;
    let globalProvider = globalProviderObj?.["proxy-providers"] || {};

    let provider = Object.assign(
      {},
      originProvider,
      moreProvider,
      globalProvider,
    );

    setProxyProviderList(Object.keys(provider));
    setGroupList(originGroupsObj?.["proxy-groups"] || []);
  };
  const getInterfaceNameList = async () => {
    let list = await getNetworkInterfaces();
    setInterfaceNameList(list);
  };
  useEffect(() => {
    fetchProxyPolicy();
  }, [prependSeq, appendSeq, deleteSeq]);
  useEffect(() => {
    if (!open) return;
    fetchContent();
    fetchProxyPolicy();
    fetchProfile();
    getInterfaceNameList();
  }, [open]);

  const validateGroup = () => {
    let group = formIns.getValues();
    if (group.name === "") {
      throw new Error(t("Group Name Required"));
    }
  };

  const handleSave = useLockFn(async () => {
    try {
      await saveProfileFile(property, currData);
      onSave?.(prevData, currData);
      onClose();
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
    >
      <DialogSurface
        style={{ maxWidth: "90vw", width: "90vw", maxHeight: "92vh" }}
      >
        <DialogBody style={{ maxHeight: "none" }}>
          <DialogTitle>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {t("Edit Groups")}
              <Button
                appearance="primary"
                size="small"
                onClick={() => {
                  setVisualization((prev) => !prev);
                }}
              >
                {visualization ? t("Advanced") : t("Visualization")}
              </Button>
            </div>
          </DialogTitle>

          <DialogContent
            style={{
              display: "flex",
              width: "auto",
              height: "calc(100vh - 185px)",
            }}
          >
            {visualization ? (
              <>
                <div
                  style={{
                    width: "50%",
                    padding: "0 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      height: "calc(100% - 80px)",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Group Type")}</Label>
                          <Dropdown
                            style={fieldStyle}
                            selectedOptions={field.value ? [field.value] : []}
                            value={field.value ?? ""}
                            onOptionSelect={(_, data) =>
                              data.optionValue &&
                              field.onChange(data.optionValue)
                            }
                          >
                            {[
                              "select",
                              "url-test",
                              "fallback",
                              "load-balance",
                              "relay",
                            ].map((option) => (
                              <Option key={option} value={option} text={option}>
                                {option}
                              </Option>
                            ))}
                          </Dropdown>
                        </div>
                      )}
                    />
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Group Name")}</Label>
                          <Input
                            autoComplete="new-password"
                            style={fieldStyle}
                            value={field.value ?? ""}
                            name={field.name}
                            onBlur={field.onBlur}
                            onChange={(_, data) => field.onChange(data.value)}
                            required
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="icon"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Proxy Group Icon")}</Label>
                          <Input
                            autoComplete="new-password"
                            style={fieldStyle}
                            value={field.value ?? ""}
                            name={field.name}
                            onBlur={field.onBlur}
                            onChange={(_, data) => field.onChange(data.value)}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="proxies"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Use Proxies")}</Label>
                          <Dropdown
                            multiselect
                            style={fieldStyle}
                            selectedOptions={field.value ?? []}
                            value={(field.value ?? []).join(", ")}
                            onOptionSelect={(_, data) =>
                              field.onChange(data.selectedOptions)
                            }
                          >
                            {proxyPolicyList.map((option) => (
                              <Option key={option} value={option} text={option}>
                                {option}
                              </Option>
                            ))}
                          </Dropdown>
                        </div>
                      )}
                    />
                    <Controller
                      name="use"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Use Provider")}</Label>
                          <Dropdown
                            multiselect
                            style={fieldStyle}
                            selectedOptions={field.value ?? []}
                            value={(field.value ?? []).join(", ")}
                            onOptionSelect={(_, data) =>
                              field.onChange(data.selectedOptions)
                            }
                          >
                            {proxyProviderList.map((option) => (
                              <Option key={option} value={option} text={option}>
                                {option}
                              </Option>
                            ))}
                          </Dropdown>
                        </div>
                      )}
                    />
                    <Controller
                      name="url"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Health Check Url")}</Label>
                          <Input
                            autoComplete="new-password"
                            placeholder="https://www.gstatic.com/generate_204"
                            style={fieldStyle}
                            value={field.value ?? ""}
                            name={field.name}
                            onBlur={field.onBlur}
                            onChange={(_, data) => field.onChange(data.value)}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="expected-status"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Expected Status")}</Label>
                          <Input
                            autoComplete="new-password"
                            placeholder="*"
                            style={fieldStyle}
                            onChange={(_, data) =>
                              field.onChange(parseInt(data.value))
                            }
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="interval"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Interval")}</Label>
                          <Input
                            autoComplete="new-password"
                            placeholder="300"
                            type="number"
                            style={fieldStyle}
                            contentAfter={t("seconds")}
                            onChange={(_, data) =>
                              field.onChange(parseInt(data.value))
                            }
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="timeout"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Timeout")}</Label>
                          <Input
                            autoComplete="new-password"
                            placeholder="5000"
                            type="number"
                            style={fieldStyle}
                            contentAfter={t("millis")}
                            onChange={(_, data) =>
                              field.onChange(parseInt(data.value))
                            }
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="max-failed-times"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Max Failed Times")}</Label>
                          <Input
                            autoComplete="new-password"
                            placeholder="5"
                            type="number"
                            style={fieldStyle}
                            onChange={(_, data) =>
                              field.onChange(parseInt(data.value))
                            }
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="interface-name"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Interface Name")}</Label>
                          <Dropdown
                            style={fieldStyle}
                            selectedOptions={field.value ? [field.value] : []}
                            value={field.value ?? ""}
                            onOptionSelect={(_, data) =>
                              data.optionValue &&
                              field.onChange(data.optionValue)
                            }
                          >
                            {interfaceNameList.map((option) => (
                              <Option key={option} value={option} text={option}>
                                {option}
                              </Option>
                            ))}
                          </Dropdown>
                        </div>
                      )}
                    />
                    <Controller
                      name="routing-mark"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Routing Mark")}</Label>
                          <Input
                            autoComplete="new-password"
                            type="number"
                            style={fieldStyle}
                            onChange={(_, data) =>
                              field.onChange(parseInt(data.value))
                            }
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="filter"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Filter")}</Label>
                          <Input
                            autoComplete="new-password"
                            style={fieldStyle}
                            value={field.value ?? ""}
                            name={field.name}
                            onBlur={field.onBlur}
                            onChange={(_, data) => field.onChange(data.value)}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="exclude-filter"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Exclude Filter")}</Label>
                          <Input
                            autoComplete="new-password"
                            style={fieldStyle}
                            value={field.value ?? ""}
                            name={field.name}
                            onBlur={field.onBlur}
                            onChange={(_, data) => field.onChange(data.value)}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="exclude-type"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Exclude Type")}</Label>
                          <Dropdown
                            multiselect
                            style={fieldStyle}
                            selectedOptions={
                              field.value ? field.value.split("|") : []
                            }
                            value={(field.value
                              ? field.value.split("|")
                              : []
                            ).join(", ")}
                            onOptionSelect={(_, data) =>
                              field.onChange(data.selectedOptions.join("|"))
                            }
                          >
                            {[
                              "Direct",
                              "Reject",
                              "RejectDrop",
                              "Compatible",
                              "Pass",
                              "Dns",
                              "Shadowsocks",
                              "ShadowsocksR",
                              "Snell",
                              "Socks5",
                              "Http",
                              "Vmess",
                              "Vless",
                              "Trojan",
                              "Hysteria",
                              "Hysteria2",
                              "WireGuard",
                              "Tuic",
                              "Relay",
                              "Selector",
                              "Fallback",
                              "URLTest",
                              "LoadBalance",
                              "Ssh",
                            ].map((option) => (
                              <Option key={option} value={option} text={option}>
                                {option}
                              </Option>
                            ))}
                          </Dropdown>
                        </div>
                      )}
                    />
                    <Controller
                      name="include-all"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Include All")}</Label>
                          <FluentSwitch
                            checked={field.value ?? false}
                            onChange={(_, data) => field.onChange(data.checked)}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="include-all-proxies"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Include All Proxies")}</Label>
                          <FluentSwitch
                            checked={field.value ?? false}
                            onChange={(_, data) => field.onChange(data.checked)}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="include-all-providers"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Include All Providers")}</Label>
                          <FluentSwitch
                            checked={field.value ?? false}
                            onChange={(_, data) => field.onChange(data.checked)}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="lazy"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Lazy")}</Label>
                          <FluentSwitch
                            checked={field.value ?? false}
                            onChange={(_, data) => field.onChange(data.checked)}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="disable-udp"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Disable UDP")}</Label>
                          <FluentSwitch
                            checked={field.value ?? false}
                            onChange={(_, data) => field.onChange(data.checked)}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name="hidden"
                      control={control}
                      render={({ field }) => (
                        <div style={rowStyle}>
                          <Label>{t("Hidden")}</Label>
                          <FluentSwitch
                            checked={field.value ?? false}
                            onChange={(_, data) => field.onChange(data.checked)}
                          />
                        </div>
                      )}
                    />
                  </div>
                  <Button
                    style={{ width: "100%" }}
                    appearance="primary"
                    icon={<VerticalAlignTopRounded />}
                    onClick={() => {
                      try {
                        validateGroup();
                        for (const item of [...prependSeq, ...groupList]) {
                          if (item.name === formIns.getValues().name) {
                            throw new Error(t("Group Name Already Exists"));
                          }
                        }
                        setPrependSeq([formIns.getValues(), ...prependSeq]);
                      } catch (err: any) {
                        Notice.error(err.message || err.toString());
                      }
                    }}
                  >
                    {t("Prepend Group")}
                  </Button>
                  <Button
                    style={{ width: "100%" }}
                    appearance="primary"
                    icon={<VerticalAlignBottomRounded />}
                    onClick={() => {
                      try {
                        validateGroup();
                        for (const item of [...appendSeq, ...groupList]) {
                          if (item.name === formIns.getValues().name) {
                            throw new Error(t("Group Name Already Exists"));
                          }
                        }
                        setAppendSeq([...appendSeq, formIns.getValues()]);
                      } catch (err: any) {
                        Notice.error(err.message || err.toString());
                      }
                    }}
                  >
                    {t("Append Group")}
                  </Button>
                </div>

                <div
                  style={{
                    width: "50%",
                    padding: "0 10px",
                  }}
                >
                  <BaseSearchBox onSearch={(match) => setMatch(() => match)} />
                  <Virtuoso
                    style={{ height: "calc(100% - 24px)", marginTop: "8px" }}
                    totalCount={
                      filteredGroupList.length +
                      (filteredPrependSeq.length > 0 ? 1 : 0) +
                      (filteredAppendSeq.length > 0 ? 1 : 0)
                    }
                    increaseViewportBy={256}
                    itemContent={(index) => {
                      let shift = filteredPrependSeq.length > 0 ? 1 : 0;
                      if (filteredPrependSeq.length > 0 && index === 0) {
                        return (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={onPrependDragEnd}
                          >
                            <SortableContext
                              items={filteredPrependSeq.map((x) => {
                                return x.name;
                              })}
                            >
                              {filteredPrependSeq.map((item, index) => {
                                return (
                                  <GroupItem
                                    key={`${item.name}-${index}`}
                                    type="prepend"
                                    group={item}
                                    onDelete={() => {
                                      setPrependSeq(
                                        prependSeq.filter(
                                          (v) => v.name !== item.name,
                                        ),
                                      );
                                    }}
                                  />
                                );
                              })}
                            </SortableContext>
                          </DndContext>
                        );
                      } else if (index < filteredGroupList.length + shift) {
                        let newIndex = index - shift;
                        return (
                          <GroupItem
                            key={`${filteredGroupList[newIndex].name}-${index}`}
                            type={
                              deleteSeq.includes(
                                filteredGroupList[newIndex].name,
                              )
                                ? "delete"
                                : "original"
                            }
                            group={filteredGroupList[newIndex]}
                            onDelete={() => {
                              if (
                                deleteSeq.includes(
                                  filteredGroupList[newIndex].name,
                                )
                              ) {
                                setDeleteSeq(
                                  deleteSeq.filter(
                                    (v) =>
                                      v !== filteredGroupList[newIndex].name,
                                  ),
                                );
                              } else {
                                setDeleteSeq((prev) => [
                                  ...prev,
                                  filteredGroupList[newIndex].name,
                                ]);
                              }
                            }}
                          />
                        );
                      } else {
                        return (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={onAppendDragEnd}
                          >
                            <SortableContext
                              items={filteredAppendSeq.map((x) => {
                                return x.name;
                              })}
                            >
                              {filteredAppendSeq.map((item, index) => {
                                return (
                                  <GroupItem
                                    key={`${item.name}-${index}`}
                                    type="append"
                                    group={item}
                                    onDelete={() => {
                                      setAppendSeq(
                                        appendSeq.filter(
                                          (v) => v.name !== item.name,
                                        ),
                                      );
                                    }}
                                  />
                                );
                              })}
                            </SortableContext>
                          </DndContext>
                        );
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <MonacoEditor
                height="100%"
                language="yaml"
                value={currData}
                theme={themeMode === "light" ? "vs" : "vs-dark"}
                options={{
                  tabSize: 2, // 根据语言类型设置缩进大小
                  minimap: {
                    enabled: document.documentElement.clientWidth >= 1500, // 超过一定宽度显示minimap滚动条
                  },
                  mouseWheelZoom: true, // 按住Ctrl滚轮调节缩放比例
                  quickSuggestions: {
                    strings: true, // 字符串类型的建议
                    comments: true, // 注释类型的建议
                    other: true, // 其他类型的建议
                  },
                  padding: {
                    top: 33, // 顶部padding防止遮挡snippets
                  },
                  fontFamily: `Fira Code, JetBrains Mono, Roboto Mono, "Source Code Pro", Consolas, Menlo, Monaco, monospace, "Courier New", "Apple Color Emoji"${
                    getSystem() === "windows" ? ", twemoji mozilla" : ""
                  }`,
                  fontLigatures: true, // 连字符
                  smoothScrolling: true, // 平滑滚动
                }}
                onChange={(value) => setCurrData(value)}
              />
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={onClose} appearance="outline">
              {t("Cancel")}
            </Button>

            <Button onClick={handleSave} appearance="primary">
              {t("Save")}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "5px 2px",
};

const fieldStyle: React.CSSProperties = {
  width: "calc(100% - 150px)",
};
