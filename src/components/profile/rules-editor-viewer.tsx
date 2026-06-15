import { ReactNode, useEffect, useMemo, useState } from "react";
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
import { readProfileFile, saveProfileFile } from "@/services/cmds";
import { Notice } from "@/components/base";
import getSystem from "@/utils/get-system";
import { RuleItem } from "@/components/profile/rule-item";
import { FluentBaseSearchBox as BaseSearchBox } from "../base/base-search-box";
import { Virtuoso } from "react-virtuoso";
import MonacoEditor from "react-monaco-editor";
import { useThemeMode } from "@/services/states";

interface Props {
  groupsUid: string;
  mergeUid: string;
  profileUid: string;
  property: string;
  open: boolean;
  onClose: () => void;
  onSave?: (prev?: string, curr?: string) => void;
}

const portValidator = (value: string): boolean => {
  return new RegExp(
    "^(?:[1-9]\\d{0,3}|[1-5]\\d{4}|6[0-4]\\d{3}|65[0-4]\\d{2}|655[0-2]\\d|6553[0-5])$",
  ).test(value);
};
const ipv4CIDRValidator = (value: string): boolean => {
  return new RegExp(
    "^(?:(?:[1-9]?[0-9]|1[0-9][0-9]|2(?:[0-4][0-9]|5[0-5]))\\.){3}(?:[1-9]?[0-9]|1[0-9][0-9]|2(?:[0-4][0-9]|5[0-5]))(?:\\/(?:[12]?[0-9]|3[0-2]))$",
  ).test(value);
};
const ipv6CIDRValidator = (value: string): boolean => {
  return new RegExp(
    "^([0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4}){7}|::|:(?::[0-9a-fA-F]{1,4}){1,6}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,5}|(?:[0-9a-fA-F]{1,4}:){2}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){3}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){4}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){5}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,6}:)\\/(?:12[0-8]|1[01][0-9]|[1-9]?[0-9])$",
  ).test(value);
};

const rules: {
  name: string;
  required?: boolean;
  example?: string;
  noResolve?: boolean;
  validator?: (value: string) => boolean;
}[] = [
  {
    name: "DOMAIN",
    example: "example.com",
  },
  {
    name: "DOMAIN-SUFFIX",
    example: "example.com",
  },
  {
    name: "DOMAIN-KEYWORD",
    example: "example",
  },
  {
    name: "DOMAIN-REGEX",
    example: "example.*",
  },
  {
    name: "GEOSITE",
    example: "youtube",
  },
  {
    name: "GEOIP",
    example: "CN",
    noResolve: true,
  },
  {
    name: "SRC-GEOIP",
    example: "CN",
  },
  {
    name: "IP-ASN",
    example: "13335",
    noResolve: true,
    validator: (value) => (+value ? true : false),
  },
  {
    name: "SRC-IP-ASN",
    example: "9808",
    validator: (value) => (+value ? true : false),
  },
  {
    name: "IP-CIDR",
    example: "127.0.0.0/8",
    noResolve: true,
    validator: (value) => ipv4CIDRValidator(value) || ipv6CIDRValidator(value),
  },
  {
    name: "IP-CIDR6",
    example: "2620:0:2d0:200::7/32",
    noResolve: true,
    validator: (value) => ipv4CIDRValidator(value) || ipv6CIDRValidator(value),
  },
  {
    name: "SRC-IP-CIDR",
    example: "192.168.1.201/32",
    validator: (value) => ipv4CIDRValidator(value) || ipv6CIDRValidator(value),
  },
  {
    name: "IP-SUFFIX",
    example: "8.8.8.8/24",
    noResolve: true,
    validator: (value) => ipv4CIDRValidator(value) || ipv6CIDRValidator(value),
  },
  {
    name: "SRC-IP-SUFFIX",
    example: "192.168.1.201/8",
    validator: (value) => ipv4CIDRValidator(value) || ipv6CIDRValidator(value),
  },
  {
    name: "SRC-PORT",
    example: "7777",
    validator: (value) => portValidator(value),
  },
  {
    name: "DST-PORT",
    example: "80",
    validator: (value) => portValidator(value),
  },
  {
    name: "IN-PORT",
    example: "7890",
    validator: (value) => portValidator(value),
  },
  {
    name: "DSCP",
    example: "4",
  },
  {
    name: "PROCESS-NAME",
    example: getSystem() === "windows" ? "chrome.exe" : "curl",
  },
  {
    name: "PROCESS-PATH",
    example:
      getSystem() === "windows"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : "/usr/bin/wget",
  },
  {
    name: "PROCESS-NAME-REGEX",
    example: ".*telegram.*",
  },
  {
    name: "PROCESS-PATH-REGEX",
    example:
      getSystem() === "windows" ? "(?i).*Application\\chrome.*" : ".*bin/wget",
  },
  {
    name: "NETWORK",
    example: "udp",
    validator: (value) => ["tcp", "udp"].includes(value),
  },
  {
    name: "UID",
    example: "1001",
    validator: (value) => (+value ? true : false),
  },
  {
    name: "IN-TYPE",
    example: "SOCKS/HTTP",
  },
  {
    name: "IN-USER",
    example: "mihomo",
  },
  {
    name: "IN-NAME",
    example: "ss",
  },
  {
    name: "SUB-RULE",
    example: "(NETWORK,tcp)",
  },
  {
    name: "RULE-SET",
    example: "providername",
    noResolve: true,
  },
  {
    name: "AND",
    example: "((DOMAIN,baidu.com),(NETWORK,UDP))",
  },
  {
    name: "OR",
    example: "((NETWORK,UDP),(DOMAIN,baidu.com))",
  },
  {
    name: "NOT",
    example: "((DOMAIN,baidu.com))",
  },
  {
    name: "MATCH",
    required: false,
  },
];

const builtinProxyPolicies = ["DIRECT", "REJECT", "REJECT-DROP", "PASS"];

export const RulesEditorViewer = (props: Props) => {
  const { groupsUid, mergeUid, profileUid, property, open, onClose, onSave } =
    props;
  const { t } = useTranslation();
  const themeMode = useThemeMode();

  const [prevData, setPrevData] = useState("");
  const [currData, setCurrData] = useState("");
  const [visualization, setVisualization] = useState(true);
  const [match, setMatch] = useState(() => (_: string) => true);

  const [ruleType, setRuleType] = useState<(typeof rules)[number]>(rules[0]);
  const [ruleContent, setRuleContent] = useState("");
  const [noResolve, setNoResolve] = useState(false);
  const [proxyPolicy, setProxyPolicy] = useState(builtinProxyPolicies[0]);
  const [proxyPolicyList, setProxyPolicyList] = useState<string[]>([]);
  const [ruleList, setRuleList] = useState<string[]>([]);
  const [ruleSetList, setRuleSetList] = useState<string[]>([]);
  const [subRuleList, setSubRuleList] = useState<string[]>([]);

  const [prependSeq, setPrependSeq] = useState<string[]>([]);
  const [appendSeq, setAppendSeq] = useState<string[]>([]);
  const [deleteSeq, setDeleteSeq] = useState<string[]>([]);

  const filteredPrependSeq = useMemo(
    () => prependSeq.filter((rule) => match(rule)),
    [prependSeq, match],
  );
  const filteredRuleList = useMemo(
    () => ruleList.filter((rule) => match(rule)),
    [ruleList, match],
  );
  const filteredAppendSeq = useMemo(
    () => appendSeq.filter((rule) => match(rule)),
    [appendSeq, match],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const reorder = (list: string[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };
  const onPrependDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      if (active.id !== over.id) {
        let activeIndex = prependSeq.indexOf(active.id.toString());
        let overIndex = prependSeq.indexOf(over.id.toString());
        setPrependSeq(reorder(prependSeq, activeIndex, overIndex));
      }
    }
  };
  const onAppendDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      if (active.id !== over.id) {
        let activeIndex = appendSeq.indexOf(active.id.toString());
        let overIndex = appendSeq.indexOf(over.id.toString());
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

    let obj = yaml.load(currData) as ISeqProfileConfig | null;
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

  const fetchProfile = async () => {
    let data = await readProfileFile(profileUid); // 原配置文件
    let groupsData = await readProfileFile(groupsUid); // groups配置文件
    let mergeData = await readProfileFile(mergeUid); // merge配置文件
    let globalMergeData = await readProfileFile("Merge"); // global merge配置文件

    let rulesObj = yaml.load(data) as { rules: [] } | null;

    let originGroupsObj = yaml.load(data) as { "proxy-groups": [] } | null;
    let originGroups = originGroupsObj?.["proxy-groups"] || [];
    let moreGroupsObj = yaml.load(groupsData) as ISeqProfileConfig | null;
    let morePrependGroups = moreGroupsObj?.["prepend"] || [];
    let moreAppendGroups = moreGroupsObj?.["append"] || [];
    let moreDeleteGroups =
      moreGroupsObj?.["delete"] || ([] as string[] | { name: string }[]);
    let groups = morePrependGroups.concat(
      originGroups.filter((group: any) => {
        if (group.name) {
          return !moreDeleteGroups.includes(group.name);
        } else {
          return !moreDeleteGroups.includes(group);
        }
      }),
      moreAppendGroups,
    );

    let originRuleSetObj = yaml.load(data) as { "rule-providers": {} } | null;
    let originRuleSet = originRuleSetObj?.["rule-providers"] || {};
    let moreRuleSetObj = yaml.load(mergeData) as {
      "rule-providers": {};
    } | null;
    let moreRuleSet = moreRuleSetObj?.["rule-providers"] || {};
    let globalRuleSetObj = yaml.load(globalMergeData) as {
      "rule-providers": {};
    } | null;
    let globalRuleSet = globalRuleSetObj?.["rule-providers"] || {};
    let ruleSet = Object.assign({}, originRuleSet, moreRuleSet, globalRuleSet);

    let originSubRuleObj = yaml.load(data) as { "sub-rules": {} } | null;
    let originSubRule = originSubRuleObj?.["sub-rules"] || {};
    let moreSubRuleObj = yaml.load(mergeData) as { "sub-rules": {} } | null;
    let moreSubRule = moreSubRuleObj?.["sub-rules"] || {};
    let globalSubRuleObj = yaml.load(globalMergeData) as {
      "sub-rules": {};
    } | null;
    let globalSubRule = globalSubRuleObj?.["sub-rules"] || {};
    let subRule = Object.assign({}, originSubRule, moreSubRule, globalSubRule);
    setProxyPolicyList(
      builtinProxyPolicies.concat(groups.map((group: any) => group.name)),
    );
    setRuleSetList(Object.keys(ruleSet));
    setSubRuleList(Object.keys(subRule));
    setRuleList(rulesObj?.rules || []);
  };

  useEffect(() => {
    if (!open) return;
    fetchContent();
    fetchProfile();
  }, [open]);

  const validateRule = () => {
    if ((ruleType.required ?? true) && !ruleContent) {
      throw new Error(t("Rule Condition Required"));
    }
    if (ruleType.validator && !ruleType.validator(ruleContent)) {
      throw new Error(t("Invalid Rule"));
    }

    const condition = (ruleType.required ?? true) ? ruleContent : "";
    return `${ruleType.name}${condition ? "," + condition : ""},${proxyPolicy}${
      ruleType.noResolve && noResolve ? ",no-resolve" : ""
    }`;
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
              {t("Edit Rules")}
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
                  <div style={rowStyle}>
                    <Label>{t("Rule Type")}</Label>
                    <Dropdown
                      style={{ minWidth: "240px" }}
                      selectedOptions={[ruleType.name]}
                      value={ruleType.name}
                      onOptionSelect={(_, data) => {
                        const found = rules.find(
                          (r) => r.name === data.optionValue,
                        );
                        if (found) setRuleType(found);
                      }}
                    >
                      {rules.map((option) => (
                        <Option
                          key={option.name}
                          value={option.name}
                          text={option.name}
                        >
                          {option.name}
                        </Option>
                      ))}
                    </Dropdown>
                  </div>
                  <div
                    style={{
                      ...rowStyle,
                      display: !(ruleType.required ?? true) ? "none" : "flex",
                    }}
                  >
                    <Label>{t("Rule Content")}</Label>

                    {ruleType.name === "RULE-SET" && (
                      <Dropdown
                        style={{ minWidth: "240px" }}
                        selectedOptions={ruleContent ? [ruleContent] : []}
                        value={ruleContent}
                        onOptionSelect={(_, data) =>
                          data.optionValue && setRuleContent(data.optionValue)
                        }
                      >
                        {ruleSetList.map((option) => (
                          <Option key={option} value={option} text={option}>
                            {option}
                          </Option>
                        ))}
                      </Dropdown>
                    )}
                    {ruleType.name === "SUB-RULE" && (
                      <Dropdown
                        style={{ minWidth: "240px" }}
                        selectedOptions={ruleContent ? [ruleContent] : []}
                        value={ruleContent}
                        onOptionSelect={(_, data) =>
                          data.optionValue && setRuleContent(data.optionValue)
                        }
                      >
                        {subRuleList.map((option) => (
                          <Option key={option} value={option} text={option}>
                            {option}
                          </Option>
                        ))}
                      </Dropdown>
                    )}
                    {ruleType.name !== "RULE-SET" &&
                      ruleType.name !== "SUB-RULE" && (
                        <Input
                          autoComplete="new-password"
                          style={{ minWidth: "240px" }}
                          value={ruleContent}
                          required={ruleType.required ?? true}
                          placeholder={ruleType.example}
                          onChange={(_, data) => setRuleContent(data.value)}
                        />
                      )}
                  </div>
                  <div style={rowStyle}>
                    <Label>{t("Proxy Policy")}</Label>
                    <Dropdown
                      style={{ minWidth: "240px" }}
                      selectedOptions={[proxyPolicy]}
                      value={proxyPolicy}
                      onOptionSelect={(_, data) =>
                        data.optionValue && setProxyPolicy(data.optionValue)
                      }
                    >
                      {proxyPolicyList.map((option) => (
                        <Option key={option} value={option} text={option}>
                          {option}
                        </Option>
                      ))}
                    </Dropdown>
                  </div>
                  {ruleType.noResolve && (
                    <div style={rowStyle}>
                      <Label>{t("No Resolve")}</Label>
                      <FluentSwitch
                        checked={noResolve}
                        onChange={() => setNoResolve(!noResolve)}
                      />
                    </div>
                  )}
                  <Button
                    style={{ width: "100%" }}
                    appearance="primary"
                    icon={<VerticalAlignTopRounded />}
                    onClick={() => {
                      try {
                        let raw = validateRule();
                        if (prependSeq.includes(raw)) return;
                        setPrependSeq([raw, ...prependSeq]);
                      } catch (err: any) {
                        Notice.error(err.message || err.toString());
                      }
                    }}
                  >
                    {t("Prepend Rule")}
                  </Button>
                  <Button
                    style={{ width: "100%" }}
                    appearance="primary"
                    icon={<VerticalAlignBottomRounded />}
                    onClick={() => {
                      try {
                        let raw = validateRule();
                        if (appendSeq.includes(raw)) return;
                        setAppendSeq([...appendSeq, raw]);
                      } catch (err: any) {
                        Notice.error(err.message || err.toString());
                      }
                    }}
                  >
                    {t("Append Rule")}
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
                      filteredRuleList.length +
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
                                return x;
                              })}
                            >
                              {filteredPrependSeq.map((item, index) => {
                                return (
                                  <RuleItem
                                    key={`${item}-${index}`}
                                    type="prepend"
                                    ruleRaw={item}
                                    onDelete={() => {
                                      setPrependSeq(
                                        prependSeq.filter((v) => v !== item),
                                      );
                                    }}
                                  />
                                );
                              })}
                            </SortableContext>
                          </DndContext>
                        );
                      } else if (index < filteredRuleList.length + shift) {
                        let newIndex = index - shift;
                        return (
                          <RuleItem
                            key={`${filteredRuleList[newIndex]}-${index}`}
                            type={
                              deleteSeq.includes(filteredRuleList[newIndex])
                                ? "delete"
                                : "original"
                            }
                            ruleRaw={filteredRuleList[newIndex]}
                            onDelete={() => {
                              if (
                                deleteSeq.includes(filteredRuleList[newIndex])
                              ) {
                                setDeleteSeq(
                                  deleteSeq.filter(
                                    (v) => v !== filteredRuleList[newIndex],
                                  ),
                                );
                              } else {
                                setDeleteSeq((prev) => [
                                  ...prev,
                                  filteredRuleList[newIndex],
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
                                return x;
                              })}
                            >
                              {filteredAppendSeq.map((item, index) => {
                                return (
                                  <RuleItem
                                    key={`${item}-${index}`}
                                    type="append"
                                    ruleRaw={item}
                                    onDelete={() => {
                                      setAppendSeq(
                                        appendSeq.filter((v) => v !== item),
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
