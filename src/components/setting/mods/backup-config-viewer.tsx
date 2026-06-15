import { useState, useRef, memo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { useVerge } from "@/hooks/use-verge";
import { Notice } from "@/components/base";
import { isValidUrl } from "@/utils/helper";
import { useLockFn } from "ahooks";
import { Button, Field, Input } from "@fluentui/react-components";
import { EyeRegular, EyeOffRegular } from "@fluentui/react-icons";
import { saveWebdavConfig, createWebdavBackup } from "@/services/cmds";

export interface BackupConfigViewerProps {
  onBackupSuccess: () => Promise<void>;
  onSaveSuccess: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onInit: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const BackupConfigViewer = memo(
  ({
    onBackupSuccess,
    onSaveSuccess,
    onRefresh,
    onInit,
    setLoading,
  }: BackupConfigViewerProps) => {
    const { t } = useTranslation();
    const { verge } = useVerge();
    const { webdav_url, webdav_username, webdav_password } = verge || {};
    const [showPassword, setShowPassword] = useState(false);
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const urlRef = useRef<HTMLInputElement>(null);

    const { register, handleSubmit, watch } = useForm<IWebDavConfig>({
      defaultValues: {
        url: webdav_url,
        username: webdav_username,
        password: webdav_password,
      },
    });
    const url = watch("url");
    const username = watch("username");
    const password = watch("password");

    const webdavChanged =
      webdav_url !== url ||
      webdav_username !== username ||
      webdav_password !== password;

    const handleClickShowPassword = () => {
      setShowPassword((prev) => !prev);
    };

    useEffect(() => {
      if (webdav_url && webdav_username && webdav_password) {
        onInit();
      }
    }, []);

    const checkForm = () => {
      const username = usernameRef.current?.value;
      const password = passwordRef.current?.value;
      const url = urlRef.current?.value;

      if (!url) {
        urlRef.current?.focus();
        Notice.error(t("WebDAV URL Required"));
        throw new Error(t("WebDAV URL Required"));
      } else if (!isValidUrl(url)) {
        urlRef.current?.focus();
        Notice.error(t("Invalid WebDAV URL"));
        throw new Error(t("Invalid WebDAV URL"));
      }
      if (!username) {
        usernameRef.current?.focus();
        Notice.error(t("WebDAV URL Required"));
        throw new Error(t("Username Required"));
      }
      if (!password) {
        passwordRef.current?.focus();
        Notice.error(t("WebDAV URL Required"));
        throw new Error(t("Password Required"));
      }
    };

    const save = useLockFn(async (data: IWebDavConfig) => {
      checkForm();
      try {
        setLoading(true);
        await saveWebdavConfig(
          data.url.trim(),
          data.username.trim(),
          data.password,
        ).then(() => {
          Notice.success(t("WebDAV Config Saved"));
          onSaveSuccess();
        });
      } catch (error) {
        Notice.error(t("WebDAV Config Save Failed", { error }), 3000);
      } finally {
        setLoading(false);
      }
    });

    const handleBackup = useLockFn(async () => {
      checkForm();
      try {
        setLoading(true);
        await createWebdavBackup().then(async () => {
          await onBackupSuccess();
          Notice.success(t("Backup Created"));
        });
      } catch (error) {
        Notice.error(t("Backup Failed", { error }));
      } finally {
        setLoading(false);
      }
    });

    const textInputProps = {
      autoCorrect: "off" as const,
      autoCapitalize: "off" as const,
      spellCheck: false,
    };

    return (
      <form onSubmit={(e) => e.preventDefault()}>
        <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
          <div
            style={{
              flex: "1 1 75%",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <Field label={t("WebDAV Server URL")}>
              <Input
                {...register("url")}
                {...textInputProps}
                input={{ ref: urlRef }}
              />
            </Field>
            <div style={{ display: "flex", gap: 16 }}>
              <Field label={t("Username")} style={{ flex: 1 }}>
                <Input
                  {...register("username")}
                  {...textInputProps}
                  input={{ ref: usernameRef }}
                />
              </Field>
              <Field label={t("Password")} style={{ flex: 1 }}>
                <Input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  {...textInputProps}
                  input={{ ref: passwordRef }}
                  contentAfter={
                    <Button
                      appearance="transparent"
                      size="small"
                      icon={showPassword ? <EyeOffRegular /> : <EyeRegular />}
                      onClick={handleClickShowPassword}
                    />
                  }
                />
              </Field>
            </div>
          </div>
          <div
            style={{
              flex: "1 1 25%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {webdavChanged ||
            webdav_url === undefined ||
            webdav_username === undefined ||
            webdav_password === undefined ? (
              <Button
                appearance="primary"
                style={{ width: "100%" }}
                type="button"
                onClick={handleSubmit(save)}
              >
                {t("Save")}
              </Button>
            ) : (
              <>
                <Button
                  appearance="primary"
                  style={{ width: "100%" }}
                  onClick={handleBackup}
                  type="button"
                >
                  {t("Backup")}
                </Button>
                <Button
                  appearance="outline"
                  style={{ width: "100%" }}
                  onClick={onRefresh}
                  type="button"
                >
                  {t("Refresh")}
                </Button>
              </>
            )}
          </div>
        </div>
      </form>
    );
  },
);
