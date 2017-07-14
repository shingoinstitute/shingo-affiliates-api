import { Component } from '@nestjs/common';
import * as grpc from 'grpc';
import * as path from 'path';

/**
 * @desc gRPC error objects should contain a metadata field
 * 
 * @interface rpcError
 */
interface rpcError {
    metadata : any
}

const authservices = grpc.load(path.join(__dirname, '../../../proto/auth_services.proto')).authservices;

/**
 * @desc A service to abastract the Shingo Auth Microservice client
 * 
 * @export
 * @class AuthService
 */
@Component()
export class AuthService {

    /**
     * @desc Method to instantiate a RPC Client from the auth_services.proto
     * 
     * @returns Returns a RPC Client to be used in consuming the Shingo Auth Microservice
     * @memberof AuthService
     */
    getClient() {
        return new authservices.AuthServices(`${process.env.AUTH_API}:80`, grpc.credentials.createInsecure());
    } 

    /**
     * @desc Utility method to assist in parsing gRPC error metadata. Returns a JSON object from the parsed error data. If no JSON object can be parsed, the method attempts to return the 'error-bin' from the meta-data as a string. If that fails the method returns the error passed to it.
     * 
     * @param {rpcError} error - The error to be parsed
     * @returns {object} The parsed error, 'error-bin'.toString(), or passed in error
     * @memberof AuthService
     */
    parseRPCErrorMeta(error : rpcError) : object {
        try {
            let err = JSON.parse(error.metadata.get('error-bin').toString());
            return err;
        } catch (caught){
            console.error('Couldn\'t parse RPC Error;', { error, caught });
            if(error.metadata.get('error-bin')) return error.metadata.get('error-bin').toString();
            else return error;
        }
    }

}