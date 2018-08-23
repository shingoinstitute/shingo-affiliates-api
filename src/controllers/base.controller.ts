import { HttpStatus, Inject, Res } from '@nestjs/common';
import { parseError } from '../util';
import { Response } from 'express';
import { LoggerInstance } from 'winston';

/**
 * @desc The base controller class contains methods shared between multiple routes
 *
 * @export
 * @class BaseController
 */
export abstract class BaseController {

  constructor(protected log: LoggerInstance) { };

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
  handleError(@Res() res: Response,
              message: string,
              error: any,
              errorCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
    const err =
      parseError(error,
          e => this.log.warn(
            `Failed to parse an error in response object. Expected a JSON string but got ${e.error} instead`
          )
        )

    this.log.error(message + ': ', err);
    return res.status(errorCode).json({ error: err });
  }
}
