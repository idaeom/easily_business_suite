import { logger } from "./logger";

// Define an interface for the monitoring service
interface MonitoringService {
    captureException(error: any, context?: Record<string, any>): void;
    sendAlert(message: string, context?: Record<string, any>): void;
}

class AlertServiceImpl implements MonitoringService {
    private isInitialized = false;

    constructor() {
        // Here we would initialize Sentry/Datadog if DSN is present
        if (process.env.SENTRY_DSN) {
            // Sentry.init({...})
            this.isInitialized = true;
        }
    }

    captureException(error: any, context?: Record<string, any>) {
        // 1. Log locally
        logger.error(error.message || "Unknown Error", { ...context, stack: error.stack });

        // 2. Send to External Provider (Mock)
        if (this.isInitialized) {
            // Sentry.captureException(error, { extra: context });
        }
    }

    sendAlert(message: string, context?: Record<string, any>) {
        logger.warn(`[ALERT] ${message}`, context);

        // Could integrate with PagerDuty / Slack Webhook here
    }
}

export const monitor = new AlertServiceImpl();
