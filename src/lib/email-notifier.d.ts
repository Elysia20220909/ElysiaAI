interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
}
declare class EmailNotifier {
    private transporter?;
    private config;
    constructor();
    private initializeTransporter;
    send(options: EmailOptions): Promise<boolean>;
    sendErrorNotification(error: Error, context?: Record<string, unknown>): Promise<void>;
    sendWelcomeEmail(userEmail: string, userName: string): Promise<void>;
    sendBackupNotification(backupInfo: {
        file: string;
        size: number;
        duration: number;
    }): Promise<void>;
    sendHealthCheckFailure(service: string, details: string): Promise<void>;
    getStatus(): {
        enabled: boolean;
        configured: boolean;
        host: string;
        port: number;
        from: string;
    };
}
export declare const emailNotifier: EmailNotifier;
export {};
//# sourceMappingURL=email-notifier.d.ts.map