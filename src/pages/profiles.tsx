import useSWR from "swr";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLockFn } from "ahooks";
import { Box, Grid2 } from "@mui/material";
import { Button as FluentButton } from "@fluentui/react-components";
import {
  ArrowClockwiseRegular,
  DocumentBulletListRegular,
  FireFilled,
  PuzzlePieceRegular,
} from "@fluentui/react-icons";
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
import { useTranslation } from "react-i18next";
import {
  enhanceProfiles,
  restartCore,
  getRuntimeLogs,
  deleteProfile,
  updateProfile,
  reorderProfile,
  createProfile,
} from "@/services/cmds";
import { useSetLoadingCache } from "@/services/states";
import { closeAllConnections } from "@/services/api";
import { BasePage, DialogRef, Notice } from "@/components/base";
import {
  ProfileViewer,
  ProfileViewerRef,
} from "@/components/profile/profile-viewer";
import { ProfileItem } from "@/components/profile/profile-item";
import { GlobalEnhanceViewer } from "@/components/profile/global-enhance-viewer";
import { useProfiles } from "@/hooks/use-profiles";
import { ConfigViewer } from "@/components/setting/mods/config-viewer";
import { throttle } from "lodash-es";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useLocation } from "react-router-dom";
import { useListen } from "@/hooks/use-listen";
import { TauriEvent } from "@tauri-apps/api/event";

const ProfilePage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { addListener } = useListen();
  const [activatings, setActivatings] = useState<string[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const { current } = location.state || {};

  useEffect(() => {
    const handleFileDrop = async () => {
      const unlisten = await addListener(
        TauriEvent.DRAG_DROP,
        async (event: any) => {
          const paths = event.payload.paths;

          for (let file of paths) {
            if (!file.endsWith(".yaml") && !file.endsWith(".yml")) {
              Notice.error(t("Only YAML Files Supported"));
              continue;
            }
            const item = {
              type: "local",
              name: file.split(/\/|\\/).pop() ?? "New Profile",
              desc: "",
              url: "",
              option: {
                with_proxy: false,
                self_proxy: false,
              },
            } as IProfileItem;
            let data = await readTextFile(file);
            await createProfile(item, data);
            await mutateProfiles();
          }
        },
      );

      return unlisten;
    };

    const unsubscribe = handleFileDrop();

    return () => {
      unsubscribe.then((cleanup) => cleanup());
    };
  }, []);

  const {
    profiles = {},
    activateSelected,
    patchProfiles,
    mutateProfiles,
  } = useProfiles();

  const { data: chainLogs = {}, mutate: mutateLogs } = useSWR(
    "getRuntimeLogs",
    getRuntimeLogs,
  );

  const viewerRef = useRef<ProfileViewerRef>(null);
  const configRef = useRef<DialogRef>(null);
  const globalEnhanceRef = useRef<DialogRef>(null);

  // distinguish type
  const profileItems = useMemo(() => {
    const items = profiles.items || [];

    const type1 = ["local", "remote"];

    return items.filter((i) => i && type1.includes(i.type!));
  }, [profiles]);

  const currentActivatings = () => {
    return [...new Set([profiles.current ?? ""])].filter(Boolean);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      if (active.id !== over.id) {
        await reorderProfile(active.id.toString(), over.id.toString());
        mutateProfiles();
      }
    }
  };

  const activateProfile = async (profile: string, notifySuccess: boolean) => {
    // 避免大多数情况下loading态闪烁
    const reset = setTimeout(() => {
      setActivatings((prev) => [...prev, profile]);
    }, 100);

    try {
      await patchProfiles({ current: profile });
      await mutateLogs();
      closeAllConnections();
      await activateSelected();
      if (notifySuccess) {
        Notice.success(t("Profile Switched"), 1000);
      }
    } catch (err: any) {
      Notice.error(err?.message || err.toString(), 4000);
    } finally {
      clearTimeout(reset);
      setActivatings([]);
    }
  };
  const onSelect = useLockFn(async (current: string, force: boolean) => {
    if (!force && current === profiles.current) return;
    await activateProfile(current, true);
  });

  useEffect(() => {
    (async () => {
      if (current) {
        mutateProfiles();
        await activateProfile(current, false);
      }
    })();
  }, current);

  const onEnhance = useLockFn(async (notifySuccess: boolean) => {
    setActivatings(currentActivatings());
    try {
      await enhanceProfiles();
      mutateLogs();
      if (notifySuccess) {
        Notice.success(t("Profile Reactivated"), 1000);
      }
    } catch (err: any) {
      Notice.error(err.message || err.toString(), 3000);
    } finally {
      setActivatings([]);
    }
  });

  const onDelete = useLockFn(async (uid: string) => {
    const current = profiles.current === uid;
    try {
      setActivatings([...(current ? currentActivatings() : []), uid]);
      await deleteProfile(uid);
      mutateProfiles();
      mutateLogs();
      current && (await onEnhance(false));
    } catch (err: any) {
      Notice.error(err?.message || err.toString());
    } finally {
      setActivatings([]);
    }
  });

  // 更新所有订阅
  const setLoadingCache = useSetLoadingCache();
  const onUpdateAll = useLockFn(async () => {
    const throttleMutate = throttle(mutateProfiles, 2000, {
      trailing: true,
    });
    const updateOne = async (uid: string) => {
      try {
        await updateProfile(uid);
        throttleMutate();
      } finally {
        setLoadingCache((cache) => ({ ...cache, [uid]: false }));
      }
    };

    return new Promise((resolve) => {
      setLoadingCache((cache) => {
        // 获取没有正在更新的订阅
        const items = profileItems.filter(
          (e) => e.type === "remote" && !cache[e.uid],
        );
        const change = Object.fromEntries(items.map((e) => [e.uid, true]));

        Promise.allSettled(items.map((e) => updateOne(e.uid))).then(resolve);
        return { ...cache, ...change };
      });
    });
  });

  return (
    <BasePage
      full
      title={t("Profiles")}
      contentStyle={{ height: "100%" }}
      header={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FluentButton
            appearance="primary"
            onClick={() => viewerRef.current?.create()}
          >
            {t("New")}
          </FluentButton>

          <FluentButton
            icon={<PuzzlePieceRegular />}
            title={t("Global Enhancement")}
            onClick={() => globalEnhanceRef.current?.open()}
            appearance="subtle"
          />

          <FluentButton
            icon={<ArrowClockwiseRegular />}
            title={t("Update All Profiles")}
            onClick={onUpdateAll}
            appearance="subtle"
          />

          <FluentButton
            icon={<DocumentBulletListRegular />}
            title={t("View Runtime Config")}
            onClick={() => configRef.current?.open()}
            appearance="subtle"
          />

          <FluentButton
            icon={<FireFilled />}
            title={t("Reactivate Profiles")}
            onClick={() => onEnhance(true)}
            appearance="subtle"
          />
        </Box>
      }
    >
      <Box
        sx={{
          pt: 1,
          pb: 1,
          px: "20px",
          height: "100%",
          overflowY: "auto",
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <Grid2 container spacing={{ xs: 1, lg: 1 }}>
            <SortableContext
              items={profileItems.map((x) => {
                return x.uid;
              })}
            >
              {profileItems.map((item) => (
                <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.file}>
                  <ProfileItem
                    id={item.uid}
                    selected={profiles.current === item.uid}
                    activating={activatings.includes(item.uid)}
                    itemData={item}
                    onSelect={(f) => onSelect(item.uid, f)}
                    onEdit={() => viewerRef.current?.edit(item)}
                    onSave={async (prev, curr) => {
                      if (prev !== curr && profiles.current === item.uid) {
                        await onEnhance(false);
                        await restartCore();
                        Notice.success(t("Clash Core Restarted"), 1000);
                      }
                    }}
                    onDelete={() => onDelete(item.uid)}
                  />
                </Grid2>
              ))}
            </SortableContext>
          </Grid2>
        </DndContext>
      </Box>

      <ProfileViewer
        ref={viewerRef}
        onChange={async () => {
          mutateProfiles();
          await onEnhance(false);
        }}
      />
      <ConfigViewer ref={configRef} />
      <GlobalEnhanceViewer
        ref={globalEnhanceRef}
        logInfo={chainLogs["Script"]}
        onSave={async (prev, curr) => {
          if (prev !== curr) {
            await onEnhance(false);
          }
        }}
      />
    </BasePage>
  );
};

export default ProfilePage;
