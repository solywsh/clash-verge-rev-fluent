import { useEffect } from "react";
import { useEnableLog } from "../services/states";
import { createMihomoWs } from "../utils/websocket";
import type { LogLevel as MihomoLogLevel } from "tauri-plugin-mihomo-api";
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

// frontend "all" maps to the core's most verbose level ("debug").
const toMihomoLevel = (logLevel: LogLevel): MihomoLogLevel =>
  logLevel === "all" ? "debug" : logLevel;

interface LogStore {
  logs: Record<LogLevel, ILogItem[]>;
  clearLogs: (level?: LogLevel) => void;
  appendLog: (level: LogLevel, log: ILogItem) => void;
}

const useLogStore = create<LogStore>(
  (set: (fn: (state: LogStore) => Partial<LogStore>) => void) => ({
    logs: {
      warning: [],
      info: [],
      debug: [],
      error: [],
      all: [],
    },
    clearLogs: (level?: LogLevel) =>
      set((state: LogStore) => ({
        logs: level
          ? { ...state.logs, [level]: [] }
          : { warning: [], info: [], debug: [], error: [], all: [] },
      })),
    appendLog: (level: LogLevel, log: ILogItem) =>
      set((state: LogStore) => {
        const currentLogs = state.logs[level];
        const newLogs =
          currentLogs.length >= MAX_LOG_NUM
            ? [...currentLogs.slice(1), log]
            : [...currentLogs, log];
        return { logs: { ...state.logs, [level]: newLogs } };
      }),
  }),
);

export const useLogData = (logLevel: LogLevel) => {
  const { clashInfo } = useClashInfo();
  const [enableLog] = useEnableLog();
  const { logs, appendLog } = useLogStore();
  const pageVisible = useVisibility();

  useEffect(() => {
    if (!enableLog || !clashInfo || !pageVisible) return;

    let isActive = true;
    const socket = createMihomoWs(
      { stream: "logs", level: toMihomoLevel(logLevel) },
      {
        onmessage(event) {
          if (!isActive) return;
          const data = JSON.parse(event.data) as ILogItem;
          const time = dayjs().format("MM-DD HH:mm:ss");
          appendLog(logLevel, { ...data, time });
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
  }, [clashInfo, enableLog, logLevel]);

  return logs[logLevel];
};

// 导出清空日志的方法
export const clearLogs = (level?: LogLevel) => {
  useLogStore.getState().clearLogs(level);
};
