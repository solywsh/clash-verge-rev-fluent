import {
  MihomoWebSocket,
  type Message,
  type LogLevel,
} from "tauri-plugin-mihomo-api";

/**
 * Which mihomo realtime stream to subscribe to.
 *
 * Upstream v2.5.1 keeps the HTTP external controller off and exposes realtime
 * data (traffic / memory / connections / logs) over the mihomo plugin's IPC
 * WebSocket instead of `ws://<controller>/...`.
 */
export type MihomoStream =
  | { stream: "traffic" }
  | { stream: "memory" }
  | { stream: "connections" }
  | { stream: "logs"; level: LogLevel };

export interface MihomoWsHandlers {
  /** Receives `{ data }` where `data` is the raw JSON text frame, mirroring the
   *  previous Sockette `MessageEvent` shape so callers can keep `JSON.parse(event.data)`. */
  onmessage?: (event: { data: string }) => void;
  onerror?: (err: unknown) => void;
}

export interface MihomoWsHandle {
  close: () => void;
}

const connect = (source: MihomoStream): Promise<MihomoWebSocket> => {
  switch (source.stream) {
    case "traffic":
      return MihomoWebSocket.connect_traffic();
    case "memory":
      return MihomoWebSocket.connect_memory();
    case "connections":
      return MihomoWebSocket.connect_connections();
    case "logs":
      return MihomoWebSocket.connect_logs(source.level);
  }
};

/**
 * Open a mihomo realtime stream over the plugin IPC WebSocket. Returns a handle
 * with `close()`; safe to call `close()` before the connection finishes opening.
 */
export const createMihomoWs = (
  source: MihomoStream,
  handlers: MihomoWsHandlers,
): MihomoWsHandle => {
  let closed = false;
  let socket: MihomoWebSocket | null = null;
  let removeListener: (() => void) | null = null;

  connect(source)
    .then((ws) => {
      if (closed) {
        ws.close();
        return;
      }
      socket = ws;
      removeListener = ws.addListener((msg: Message) => {
        if (msg.type === "Text") {
          handlers.onmessage?.({ data: msg.data });
        } else if (msg.type === "Close") {
          handlers.onerror?.(msg.data);
        }
      });
    })
    .catch((err) => handlers.onerror?.(err));

  return {
    close: () => {
      closed = true;
      removeListener?.();
      removeListener = null;
      socket?.close();
      socket = null;
    },
  };
};
