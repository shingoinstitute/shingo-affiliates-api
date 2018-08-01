import { Response, HttpStatus, Inject } from '@nestjs/common';
import { SalesforceService, LoggerService } from '../components';
import { parseError } from '../util';

/**
 * @desc The base controller class contains methods shared between multiple routes
 * 
 * @export
 * @class BaseController
 */
export abstract class BaseController {

    constructor(protected log: LoggerService) { };

    /**
    * @desc A helper function to return an error response to the client.
    * 
    * @param {Response} res - The express response from the calling route
    * @param {string} message - Log message
    * @param {*} error - An error object to be logged and returned as JSON
    * @param {HttpStatus} [errorCode=HttpStatus.INTERNAL_SERVER_ERROR] - HttpStatus CODE
    * @returns Response body is a JSON object with the error
    * @memberof BaseController
    */
    public handleError( @Response() res, message: string, error: any, errorCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
        const err = parseError(error, e => this.log.warn(`Failed to parse an error in response object. Expected a JSON string but got ${e.error} instead`))

        this.log.error(message + ' %j', err);
        return res.status(errorCode).json({ error: err });
    }
}