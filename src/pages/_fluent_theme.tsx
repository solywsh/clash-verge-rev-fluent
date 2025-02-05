import {
  BrandVariants,
  createDarkTheme,
  createLightTheme,
  FluentProvider,
  themeToTokensObject,
  Toaster,
  useFluent,
  webDarkTheme,
  webLightTheme,
} from "@fluentui/react-components";
import { useThemeMode } from "@/services/states";
import { useEffect, useMemo, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Effect } from "@tauri-apps/api/window";
import { getBrandTokensFromPalette } from "../fluent-theme";
import { invoke } from "@tauri-apps/api/core";

let keyColor = "#0F6CBD";

const getKeyColor = () => {
  return invoke<string>("system_accent_color");
};

const getKeyColorP = getKeyColor();

getKeyColorP.then((color) => {
  console.log(color);
  keyColor = color;
});

const themeVariants = getBrandTokensFromPalette(keyColor, {
  darkCp: 0,
  lightCp: 0,
});

export const getLightTheme = (themeVariants: BrandVariants) => ({
  ...createLightTheme(themeVariants),
  overlay1: "rgba(0, 0, 0, 0.04)",
  overlay1Hover: "rgba(0, 0, 0, 0.08)",
  overlay1Pressed: "rgba(0, 0, 0, 0.033)",
  surface1: "rgba(255, 255, 255, 0.6)",
  surface2: "rgba(255, 255, 255, 0.8)",
  itemBorderColor1: "#eaeaea",
  controlFillDefault: "hsla(0, 0%, 100%, 70%)",
  controlFillSecondary: "hsla(0, 0%, 98%, 50%)",
  controlFillTertiary: "hsla(0, 0%, 98%, 30%)",
  controlFillinputActive: "hsl(0, 0%, 100%)",
  colorSubtleBackgroundHover: "hsla(0, 0%, 0%, 3.73%)",
});

export const getDarkTheme = (themeVariants: BrandVariants) => ({
  ...createDarkTheme(themeVariants),
  overlay1: "rgba(255, 255, 255, 0.04)",
  overlay1Hover: "rgba(255, 255, 255, 0.08)",
  overlay1Pressed: "hsla(0, 0%, 100%, 0.033)",
  surface1: "rgba(255, 255, 255, 0.04)",
  surface2: "rgba(255, 255, 255, 0.08)",
  itemBorderColor1: "#1d1d1d",
  controlFillDefault: "hsla(0, 0%, 100%, .061)",
  controlFillSecondary: "hsla(0, 0%, 100%, 0.084)",
  controlFillTertiary: "hsla(0, 0%, 100%, 0.033)",
  controlFillinputActive: "hsla(0, 0%, 12%, 70%)",
  colorSubtleBackgroundHover: "hsla(0, 0%, 100%, 6.05%)",
});

export const tokens = themeToTokensObject(getLightTheme(themeVariants));

export function FluentProviderWithTheme({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useFluentTheme();

  return (
    <FluentProvider theme={theme} style={{ background: "transparent" }}>
      {children}
      <Toaster toasterId="toaster" position="top-end" />
      <GetFLuent />
    </FluentProvider>
  );
}

function GetFLuent() {
  const { targetDocument } = useFluent();
  useEffect(() => {
    context.targetDocument = targetDocument;

    return () => {
      context.targetDocument = document;
    };
  }, []);

  return null;
}

const context = {
  targetDocument: document as Document | undefined,
};

export const getTargetDocument = () => context.targetDocument;

export function useFluentTheme() {
  const theme = useThemeMode();
  const [variants, setVariants] = useState(() => {
    if (keyColor !== "#0F6CBD") {
      return getBrandTokensFromPalette(keyColor, {
        darkCp: 0,
        lightCp: 0,
        hueTorsion: 0,
      });
    }

    return themeVariants;
  });
  useEffect(() => {
    getKeyColorP.then((color) => {
      setVariants(
        getBrandTokensFromPalette(color, {
          darkCp: 0,
          lightCp: 0,
          hueTorsion: 0,
        }),
      );
    });
  }, []);
  const lightTheme = useMemo(() => {
    return getLightTheme(variants);
  }, [variants]);
  const darkTheme = useMemo(() => {
    return getDarkTheme(variants);
  }, [variants]);

  return theme === "light" ? lightTheme : darkTheme;
}
