export class Logger {
  static error(message: string, context?: any): void {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, context)
  }

  static warn(message: string, context?: any): void {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, context)
  }

  static info(message: string, context?: any): void {
    console.info(`[INFO] ${new Date().toISOString()}: ${message}`, context)
  }

  static debug(message: string, context?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, context)
    }
  }
}
