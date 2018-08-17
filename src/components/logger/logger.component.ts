import { Inject, Injectable } from '@nestjs/common';
import { Logger, LoggerInstance, LoggerOptions, transports } from 'winston';
import * as path from 'path';

type Level = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';

/**
 * Provides an abstraction of the [Winston](https://github.com/winstonjs/winston) JS logger. Uses Console and File transports.
 * 
 * @export
 * @class LoggerService
 */
@Injectable()
export class LoggerService {

    /**
     * The actual logging instance
     * 
     * @private
     * @type {LoggerInstance}
     * @memberof LoggerService
     */
    private logger: LoggerInstance;

    constructor() {
        let logPath: string = process.env.LOG_PATH || '';
        let logName: string = process.env.LOG_FILE || 'affiliates-api.log';
        let logLevel: Level = process.env.LOG_LEVEL as Level || 'silly';

        const logTransports = [
            new transports.Console({ colorize: true, prettyPrint: true, timestamp: true }),
            new transports.File({ filename: path.join(logPath, logName), json: false, prettyPrint: true })
        ]

        const logOptions: LoggerOptions = { transports: logTransports, level: logLevel };

        this.logger = new Logger(logOptions);
    }

    /**
     * The log function is multipurpse
     * 
     * @param {Level} level - NPM Logging levels (<code>'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly'</code>)
     * @param {string} message - The message to print. May include one formatting operator (i.e. 'my object: %j')
     * @param {any} [meta] - The value to insert into message with formatting operator
     * @returns {LoggerInstance} 
     * @memberof LoggerService
     */
    public log(level: Level, message: string, meta?): LoggerInstance {
        return this.logger.log(level, message, meta);
    }

    /**
     * Logs a <code>'silly'</code> level message. Used for temporary log messages.
     * 
     * @param {string} message - The message to print. May include one formatting operator (i.e. 'my object: %j')
     * @param {any} [meta] - The value to insert into message with formatting operator
     * @returns {LoggerInstance} 
     * @memberof LoggerService
     */
    public silly(message: string, meta?): LoggerInstance {
        return this.logger.silly(message, meta);
    }

    /**
     * Logs a <code>'debug'</code> level message. Used for more permanent messages that shouldn't make it to production.
     * 
     * @param {string} message - The message to print. May include one formatting operator (i.e. 'my object: %j')
     * @param {any} [meta] - The value to insert into message with formatting operator
     * @returns {LoggerInstance} 
     * @memberof LoggerService
     */
    public debug(message: string, meta?): LoggerInstance {
        return this.logger.debug(message, meta);
    }

    /**
     * Logs a <code>'verbose'</code> level message. Used for permanent messages that may or may not be filtered in production.
     * 
     * @param {string} message - The message to print. May include one formatting operator (i.e. 'my object: %j')
     * @param {any} [meta] - The value to insert into message with formatting operator
     * @returns {LoggerInstance} 
     * @memberof LoggerService
     */
    public verbose(message: string, meta?): LoggerInstance {
        return this.logger.verbose(message, meta);
    }

    /**
     * Logs a <code>'info'</code> level message. Used for permanent messages that will be logged in production.
     * 
     * @param {string} message - The message to print. May include one formatting operator (i.e. 'my object: %j')
     * @param {any} [meta] - The value to insert into message with formatting operator
     * @returns {LoggerInstance} 
     * @memberof LoggerService
     */
    public info(message: string, meta?): LoggerInstance {
        return this.logger.info(message, meta);
    }

    /**
     * Logs a <code>'warn'</code> level message. Used for permanent messages to alert developers of potential bugs or issues.
     * 
     * @param {string} message - The message to print. May include one formatting operator (i.e. 'my object: %j')
     * @param {any} [meta] - The value to insert into message with formatting operator 
     * @returns {LoggerInstance} 
     * @memberof LoggerService
     */
    public warn(message: string, meta?): LoggerInstance {
        return this.logger.warn(message, meta);
    }

    /**
     * Logs a <code>'error'</code> level message. Used for permanent messages to alert developers of unexpected state or application failure.
     * 
     * @param {string} message - The message to print. May include one formatting operator (i.e. 'my object: %j')
     * @param {any} [meta] - The value to insert into message with formatting operator
     * @returns {LoggerInstance} 
     * @memberof LoggerService
     */
    public error(message: string, meta?): LoggerInstance {
        return this.logger.error(message, meta);
    }

}