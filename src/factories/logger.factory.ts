import {
  Logger,
  LoggerInstance,
  LoggerOptions,
  transports,
  NPMLoggingLevel,
} from 'winston'
import * as path from 'path'

export interface LoggerFactoryOptions {
  /** path to a directory containing log files */
  path?: string
  /** name of the log file */
  name?: string
  /** default log level */
  level?: NPMLoggingLevel
}

export const loggerFactory = (
  options?: string | LoggerFactoryOptions,
): LoggerInstance => {
  const opts = typeof options === 'string' ? { name: options } : options
  const logPath = (opts && opts.path) || process.env.LOG_PATH || ''
  const logName =
    (opts && opts.name) || process.env.LOG_FILE || 'affiliates-api.log'
  const logLevel =
    process.env.NODE_ENV !== 'production'
      ? 'silly'
      : (opts && opts.level) || process.env.LOG_LEVEL || 'info'

  const logTransports = [
    new transports.Console({
      colorize: true,
      prettyPrint: true,
      timestamp: true,
    }),
    new transports.File({
      filename: path.join(logPath, logName),
      json: false,
      prettyPrint: true,
    }),
  ]

  const logOptions: LoggerOptions = {
    transports: logTransports,
    level: logLevel,
  }

  return new Logger(logOptions)
}
