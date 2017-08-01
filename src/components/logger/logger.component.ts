import { Component } from '@nestjs/common';
import { Logger, LoggerInstance, LoggerOptions, transports } from 'winston';
import * as path from 'path';

type Level = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';

@Component()
export class LoggerService {
    private static logger: LoggerInstance;

    constructor() {
        if (LoggerService.logger === undefined) {
            const logPath: string = process.env.LOG_PATH || '';
            const logName: string = process.env.LOG_FILE || 'affiliates-api.log';
            const logLevel: Level = process.env.LOG_LEVEL || 'silly';

            const logTransports = [
                new transports.Console({ colorize: true, prettyPrint: true }),
                new transports.File({ filename: path.join(logPath, logName), json: false, prettyPrint: true })
            ]

            const logOptions: LoggerOptions = { transports: logTransports, level: logLevel };

            LoggerService.logger = new Logger(logOptions);
        }
    }

    public log(level: Level, message: string, meta?): LoggerInstance {
        return LoggerService.logger.log(level, message, meta);
    }

    public silly(message: string, meta?): LoggerInstance {
        return LoggerService.logger.silly(message, meta);
    }

    public debug(message: string, meta?): LoggerInstance {
        return LoggerService.logger.debug(message, meta);
    }

    public verbose(message: string, meta?): LoggerInstance {
        return LoggerService.logger.verbose(message, meta);
    }

    public info(message: string, meta?): LoggerInstance {
        return LoggerService.logger.info(message, meta);
    }

    public warn(message: string, meta?): LoggerInstance {
        return LoggerService.logger.warn(message, meta);
    }

    public error(message: string, meta?): LoggerInstance {
        return LoggerService.logger.error(message, meta);
    }

}