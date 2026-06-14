import { createRoot } from "react-dom/client";
import { ReactNode, useState, useEffect } from "react";
import { Box, IconButton, Slide, Snackbar, Typography } from "@mui/material";
import {
  CloseRounded,
  CheckCircleRounded,
  ErrorRounded,
} from "@mui/icons-material";
import { useVerge } from "@/hooks/use-verge";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  Link,
  Toast,
  ToastBody,
  ToastFooter,
  ToastTitle,
} from "@fluentui/react-components";
import { getTargetDocument } from "@/pages/_fluent_theme";
const appWindow = getCurrentWebviewWindow();
interface InnerProps {
  type: string;
  duration?: number;
  message: ReactNode;
  isDark?: boolean;
  onClose: () => void;
}

const NoticeInner = (props: InnerProps) => {
  const { type, message, duration = 1500, onClose } = props;
  const [visible, setVisible] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const { verge } = useVerge();
  const { theme_mode } = verge ?? {};
  const onBtnClose = () => {
    setVisible(false);
    onClose();
  };
  const onAutoClose = (_e: any, reason: string) => {
    if (reason !== "clickaway") onBtnClose();
  };

  useEffect(() => {
    const themeMode = ["light", "dark", "system"].includes(theme_mode!)
      ? theme_mode!
      : "light";

    if (themeMode !== "system") {
      setIsDark(themeMode === "dark");
      return;
    }

    appWindow.theme().then((m) => m && setIsDark(m === "dark"));
    const unlisten = appWindow.onThemeChanged((e) =>
      setIsDark(e.payload === "dark"),
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [theme_mode]);

  const msgElement =
    type === "info" ? (
      message
    ) : (
      <Box sx={{ width: 328, display: "flex", alignItems: "center" }}>
        {type === "error" && <ErrorRounded color="error" />}
        {type === "success" && <CheckCircleRounded color="success" />}

        <Typography
          component="span"
          sx={{ ml: 1, wordWrap: "break-word", width: "calc(100% - 35px)" }}
        >
          {message}
        </Typography>
      </Box>
    );

  return (
    <Toast style={{ position: "fixed", top: 16, right: 20 }}>
      <ToastTitle media={<></>}>{message}</ToastTitle>
    </Toast>
  );

  return (
    <Snackbar
      open={visible}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      autoHideDuration={duration}
      onClose={onAutoClose}
      message={msgElement}
      sx={{
        maxWidth: 360,
        ".MuiSnackbarContent-root": {
          bgcolor: isDark ? "#50515C" : "#ffffff",
          color: isDark ? "#ffffff" : "#000000",
        },
      }}
      TransitionComponent={(p) => <Slide {...p} direction="left" />}
      transitionDuration={200}
      action={
        <IconButton size="small" color="inherit" onClick={onBtnClose}>
          <CloseRounded fontSize="inherit" />
        </IconButton>
      }
    />
  );
};

interface NoticeInstance {
  (props: Omit<InnerProps, "onClose">): void;

  info(message: ReactNode, duration?: number, isDark?: boolean): void;
  error(message: ReactNode, duration?: number, isDark?: boolean): void;
  success(message: ReactNode, duration?: number, isDark?: boolean): void;
}

let parent: HTMLDivElement = null!;

// @ts-ignore
export const Notice: NoticeInstance = (props) => {
  console.log(props);
  dispatchToast(
    <Toast>
      <ToastTitle>{props.message}</ToastTitle>
    </Toast>,
    { toasterId: "toaster", intent: props.type },
    document,
  );
  // if (!parent) {
  //   parent = document.createElement("div");
  //   document.body.appendChild(parent);
  // }
  //
  // const container = document.createElement("div");
  // parent.appendChild(container);
  // const root = createRoot(container);
  //
  // const onUnmount = () => {
  //   root.unmount();
  //   if (parent) setTimeout(() => parent.removeChild(container), 500);
  // };
  //
  // root.render(<NoticeInner {...props} onClose={onUnmount} />);
};

(["info", "error", "success"] as const).forEach((type) => {
  Notice[type] = (message, duration) => {
    setTimeout(() => Notice({ type, message, duration }), 0);
  };
});

let counter = 0;

type ShowToastEventDetail = any;
type ToastOptions = any;

export const EVENTS = {
  show: "fui-toast-show",
  dismiss: "fui-toast-dismiss",
  dismissAll: "fui-toast-dismiss-all",
  update: "fui-toast-update",
  pause: "fui-toast-pause",
  play: "fui-toast-play",
} as const;

function dispatchToast(
  content: unknown,
  options: Partial<ToastOptions> = {},
  targetDocument: Document,
) {
  const detail: ShowToastEventDetail = {
    ...options,
    content,
    toastId: options.toastId ?? (counter++).toString(),
  };
  const event = new CustomEvent<ShowToastEventDetail>(EVENTS.show, {
    bubbles: false,
    cancelable: false,
    detail,
  });
  targetDocument.dispatchEvent(event);
}
