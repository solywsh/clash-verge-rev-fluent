import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import {
  Switch as FluentSwitch,
  Button as FluentButton,
  Input,
  Caption1,
} from "@fluentui/react-components";
import { DeleteRegular, AddRegular } from "@fluentui/react-icons";
import { DialogRef, Notice } from "@/components/base";
import { useClash } from "@/hooks/use-clash";
import { restartCore } from "@/services/cmds";
import { Expander } from "../../fluent/expander";
import { tokens } from "../../../pages/_fluent_theme";

// These dev URLs are always included; hidden from the UI list.
const DEV_URLS = [
  "tauri://localhost",
  "http://tauri.localhost",
  "http://localhost:3000",
];

const filterBaseOriginsForUI = (origins: string[]) =>
  origins.filter((origin) => !DEV_URLS.includes(origin.trim()));

const getFullOrigins = (origins: string[]) => [
  ...new Set([...origins, ...DEV_URLS]),
];

export const HeaderConfiguration = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const { clash, mutateClash, patchClash } = useClash();
  const [open, setOpen] = useState(false);

  const [allowPrivateNetwork, setAllowPrivateNetwork] = useState(true);
  const [allowOrigins, setAllowOrigins] = useState<string[]>([]);

  const loadFromClash = () => {
    const cors = clash?.["external-controller-cors"];
    setAllowPrivateNetwork(cors?.["allow-private-network"] ?? true);
    setAllowOrigins(filterBaseOriginsForUI(cors?.["allow-origins"] ?? []));
  };

  useImperativeHandle(ref, () => ({
    open: () => {
      loadFromClash();
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  // Populate from clash when rendered inline (canExpand content)
  useEffect(() => {
    loadFromClash();
  }, [clash?.["external-controller-cors"]]);

  const onSave = useLockFn(async () => {
    try {
      await patchClash({
        "external-controller-cors": {
          "allow-private-network": allowPrivateNetwork,
          "allow-origins": getFullOrigins(allowOrigins).filter(
            (o) => o.trim() !== "",
          ),
        },
      });
      await restartCore();
      await mutateClash();
      Notice.success(t("Settings Applied"), 1000);
      setOpen(false);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    }
  });

  return (
    <>
      <Expander
        left={t("Allow Private Network")}
        right={
          <FluentSwitch
            checked={allowPrivateNetwork}
            onChange={(_, c) => setAllowPrivateNetwork(c.checked)}
          />
        }
      />

      <Expander
        left={t("Allowed Origins")}
        right={
          <FluentButton
            appearance="subtle"
            icon={<AddRegular />}
            onClick={() => setAllowOrigins((o) => [...o, ""])}
          >
            {t("Add")}
          </FluentButton>
        }
      />

      {allowOrigins.map((origin, index) => (
        <Expander
          key={`origin-${index}`}
          left={
            <Input
              style={{ width: 280 }}
              value={origin}
              placeholder="https://example.com"
              onChange={(e) =>
                setAllowOrigins((list) => {
                  const next = [...list];
                  next[index] = e.target.value;
                  return next;
                })
              }
            />
          }
          right={
            <FluentButton
              appearance="subtle"
              icon={<DeleteRegular />}
              onClick={() =>
                setAllowOrigins((list) => list.filter((_, i) => i !== index))
              }
            />
          }
        />
      ))}

      <Caption1
        style={{
          display: "block",
          color: tokens.colorNeutralForeground3,
          padding: "8px",
          fontStyle: "italic",
        }}
      >
        {t("CORS Always Included")}: {DEV_URLS.join(", ")}
      </Caption1>

      <Expander
        right={
          <FluentButton
            appearance="primary"
            onClick={onSave}
            style={{ marginBlock: 4 }}
          >
            {t("Save")}
          </FluentButton>
        }
      />
    </>
  );
});
