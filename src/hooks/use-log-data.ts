import { useEffect } from "react";
import { useEnableLog } from "../services/states";
import { createMihomoWs } from "../utils/websocket";
import { useClashInfo } from "./use-clash";
import dayjs from "dayjs";
import { create } from "zustand";
import { useVisibility } from "./use-visibility";

const MAX_LOG_NUM = 1000;

export type LogLevel = "warning" | "info" | "debug" | "error" | "all";

interface ILogItem {
  time?: string;
  type: string;
  payload: string;
  [key: string]: any;
}

interface LogStore {
  logs: ILogItem[];
  clearLogs: () => void;
  appendLog: (log: ILogItem) => void;
}

// A single unified log buffer. We subscribe once at the most verbose level
// ("debug") so every log is captured, and the UI filters by the selected level
// for display — so switching levels is instant and never loses history.
const useLogStore = create<LogStore>(
  (set: (fn: (state: LogStore) => Partial<LogStore>) => void) => ({
    logs: [],
    clearLogs: () => set(() => ({ logs: [] })),
    appendLog: (log: ILogItem) =>
      set((state: LogStore) => ({
        logs:
          state.logs.length >= MAX_LOG_NUM
            ? [...state.logs.slice(1), log]
            : [...state.logs, log],
      })),
  }),
);

// `logLevel` is accepted for backwards compatibility but no longer changes the
// subscription (we always stream at "debug"); callers filter the result by level.
export const useLogData = (_logLevel?: LogLevel) => {
  const { clashInfo } = useClashInfo();
  const [enableLog] = useEnableLog();
  const { logs, appendLog } = useLogStore();
  const pageVisible = useVisibility();

  useEffect(() => {
    if (!enableLog || !clashInfo || !pageVisible) return;

    let isActive = true;
    const socket = createMihomoWs(
      { stream: "logs", level: "debug" },
      {
        onmessage(event) {
          if (!isActive) return;
          const data = JSON.parse(event.data) as ILogItem;
          const time = dayjs().format("MM-DD HH:mm:ss");
          appendLog({ ...data, time });
        },
        onerror() {
          if (!isActive) return;
          socket.close();
        },
      },
    );

    return () => {
      isActive = false;
      socket.close();
    };
  }, [clashInfo, enableLog, pageVisible]);

  return logs;
};

// 导出清空日志的方法
export const clearLogs = () => {
  useLogStore.getState().clearLogs();
};
