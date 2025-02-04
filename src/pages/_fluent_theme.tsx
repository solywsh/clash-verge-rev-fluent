import {
  FluentProvider,
  themeToTokensObject,
  webDarkTheme,
  webLightTheme,
} from "@fluentui/react-components";
import { useThemeMode } from "@/services/states";
import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Effect } from "@tauri-apps/api/window";

export const lightTheme = {
  ...webLightTheme,
  overlay1: "rgba(0, 0, 0, 0.04)",
  overlay1Hover: "rgba(0, 0, 0, 0.08)",
  overlay1Pressed: "rgba(0, 0, 0, 0.02)",
  surface1: "rgba(255, 255, 255, 0.6)",
  surface2: "rgba(255, 255, 255, 0.8)",
  itemBorderColor1: "#eaeaea",
  controlFillDefault: "hsla(0, 0%, 100%, 70%)",
  controlFillSecondary: "hsla(0, 0%, 98%, 50%)",
  controlFillTertiary: "hsla(0, 0%, 98%, 30%)",
  controlFillinputActive: "hsl(0, 0%, 100%)",
  colorSubtleBackgroundHover: "hsla(0, 0%, 0%, 3.73%)",
};

export const darkTheme = {
  ...webDarkTheme,
  overlay1: "rgba(255, 255, 255, 0.04)",
  overlay1Hover: "rgba(255, 255, 255, 0.08)",
  overlay1Pressed: "rgba(255, 255, 255, 0.02)",
  surface1: "rgba(255, 255, 255, 0.04)",
  surface2: "rgba(255, 255, 255, 0.08)",
  itemBorderColor1: "#1d1d1d",
  controlFillDefault: "hsla(0, 0%, 100%, .061)",
  controlFillSecondary: "hsla(0, 0%, 100%, 0.084)",
  controlFillTertiary: "hsla(0, 0%, 100%, 0.033)",
  controlFillinputActive: "hsla(0, 0%, 12%, 70%)",
  colorSubtleBackgroundHover: "hsla(0, 0%, 100%, 6.05%)",
};

export const tokens = themeToTokensObject(lightTheme);

export function FluentProviderWithTheme({
  children,
}: {
  children: React.ReactNode;
}) {
  webLightTheme.colorSubtleBackgroundHover = "rgba(0, 0, 0, 0.04)";
  const theme = useThemeMode();

  return (
    <FluentProvider
      theme={theme === "light" ? lightTheme : darkTheme}
      style={{ background: "transparent" }}
    >
      {children}
    </FluentProvider>
  );
}

export function useFluentTheme() {
  const theme = useThemeMode();
  return theme === "light" ? lightTheme : darkTheme;
}
