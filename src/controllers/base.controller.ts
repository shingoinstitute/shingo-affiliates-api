import { Response, HttpStatus } from '@nestjs/common';
import { SalesforceService, LoggerService } from '../components';

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
    * @protected
    * @param {Response} res - The express response from the calling route
    * @param {string} message - Log message
    * @param {*} error - An error object to be logged and returned as JSON
    * @param {HttpStatus} [errorCode=HttpStatus.INTERNAL_SERVER_ERROR] - HttpStatus CODE
    * @returns Response body is a JSON object with the error
    * @memberof BaseController
    */
    protected handleError( @Response() res, message: string, error: any, errorCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
        if (error.metadata) error = SalesforceService.parseRPCErrorMeta(error);

        this.log.error(message + ' %j', error);
        return res.status(errorCode).json({ error });
    }
}