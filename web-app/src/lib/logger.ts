import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Re-export cn utility since we are in lib
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Simple Structured Logger
// In a real production app, you might swap this for 'pino' or 'winston'
// and send logs to Datadog/Sentry.

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    timestamp: string;
}

class Logger {
    private log(level: LogLevel, message: string, context?: Record<string, any>) {
        const entry: LogEntry = {
            level,
            message,
            context,
            timestamp: new Date().toISOString(),
        };

        // In production, you would stream 'entry' to your aggregator.
        // In dev, we just print nicely.
        if (process.env.NODE_ENV === "development") {
            const color =
                level === "error"
                    ? "\x1b[31m" // Red
                    : level === "warn"
                        ? "\x1b[33m" // Yellow
                        : level === "info"
                            ? "\x1b[36m" // Cyan
                            : "\x1b[32m"; // Green

            console.log(
                `${color}[${entry.timestamp}] [${level.toUpperCase()}] ${message}\x1b[0m`,
                context ? context : ""
            );
        } else {
            // Production: JSON format for ingestion
            console.log(JSON.stringify(entry));
        }
    }

    info(message: string, context?: Record<string, any>) {
        this.log("info", message, context);
    }

    warn(message: string, context?: Record<string, any>) {
        this.log("warn", message, context);
    }

    error(message: string, context?: Record<string, any>) {
        this.log("error", message, context);
    }

    debug(message: string, context?: Record<string, any>) {
        this.log("debug", message, context);
    }
}

export const logger = new Logger();
