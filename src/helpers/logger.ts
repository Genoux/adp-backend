// RoomLogger.ts
import chalk from 'chalk';

class RoomLogger {
  private static instance: RoomLogger;
  private debugMode: boolean;

  private constructor() {
    this.debugMode = process.env.NODE_ENV !== 'production';
  }

  public static getInstance(): RoomLogger {
    if (!RoomLogger.instance) {
      RoomLogger.instance = new RoomLogger();
    }
    return RoomLogger.instance;
  }

  private formatMessage(roomId: number | null, message: string): string {
    return roomId ? `Room ${roomId}: ${message}` : message;
  }

  public info(roomId: number | null, message: string): void {
    if (this.debugMode) {
      console.log(chalk.blue('ℹ'), this.formatMessage(roomId, message));
    }
  }

  public success(roomId: number | null, message: string): void {
    if (this.debugMode) {
      console.log(chalk.green('✓'), this.formatMessage(roomId, message));
    }
  }

  public warn(roomId: number | null, message: string): void {
    if (this.debugMode) {
      console.log(chalk.yellow('⚠'), this.formatMessage(roomId, message));
    }
  }

  public error(roomId: number | null, message: string, error?: any): void {
    console.log(chalk.red('✖'), this.formatMessage(roomId, message));
    if (error) {
      console.error(error);
    }
  }

  public system(message: string): void {
    if (this.debugMode) {
      console.log(chalk.cyan('🔧'), message);
    }
  }

  public start(roomId: number | null, message: string): void {
    if (this.debugMode) {
      console.log(chalk.cyan('▶'), this.formatMessage(roomId, message));
    }
  }
}

export default RoomLogger;