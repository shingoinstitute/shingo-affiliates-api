import { Response, HttpStatus } from '@nestjs/common';
import { OldSalesforceClient } from '../components';

/**
 * @desc The base controller class contains methods shared between multiple routes
 * 
 * @export
 * @class BaseController
 */
export abstract class BaseController {

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
        if (error.metadata) error = OldSalesforceClient.parseRPCErrorMeta(error);
        if (error.message) error = { message: error.message };

        if (typeof error.error === 'string' && error.error.match(/\{.*\}/g)) {
            try {
                error.error = JSON.parse(error.error);
            } catch (e) {
                console.warn(`Failed to parse an error in response object. Expected a JSON string but got ${error.error} instead`);
            }
        }

        console.error(message + ' %j', error);
        return res.status(errorCode).json({ error: error });
    }
}