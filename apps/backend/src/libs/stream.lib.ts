import { EventEmitter } from "node:events";
import Transport from "winston-transport";

export const logEventEmitter = new EventEmitter();

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export class SSELogTransport extends Transport {
  log(info: any, callback: () => void) {
    setImmediate(() => {
      logEventEmitter.emit("log", {
        timestamp: info.timestamp || new Date().toISOString(),
        level: (info.level || "INFO").toUpperCase(),
        message: info.message,
      });
    });

    callback();
  }
}
