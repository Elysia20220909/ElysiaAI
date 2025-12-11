declare class BackupScheduler {
  private config;
  private intervalId?;
  private isRunning;
  constructor();
  start(): void;
  stop(): void;
  private performBackup;
  private cleanupOldBackups;
  getBackupHistory(): {
        name: string;
        size: number;
        createdAt: Date;
    }[];
  triggerManualBackup(): Promise<void>;
  getStatus(): {
        enabled: boolean;
        running: boolean;
        interval: number;
        maxBackups: number;
        backupDir: string;
        backupCount: number;
    };
}
export declare const backupScheduler: BackupScheduler;
export {};
//# sourceMappingURL=backup-scheduler.d.ts.map