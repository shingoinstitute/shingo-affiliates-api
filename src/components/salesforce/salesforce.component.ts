import { Component } from '@nestjs/common';
import * as grpc from 'grpc';
import * as path from 'path';
import * as bluebird from 'bluebird';

export interface gRPCError { metadata: any }

export interface SFSuccessObject { id: string; success: boolean; errors: any[] }

export interface SFQueryObject { action: 'SELECT' | 'select'; fields: string[]; table: string; clauses?: string }

export interface SFQueryResponse { totalSize: number, done: false, records: object[] }

export interface SFIdData { object: string; ids: string[] }

export interface SFRecordData { object: string; records: object[] }

export interface SFSearchData { retrieve: string; search: string }

export interface SFSearchResults { searchRecords: any[] }

const sfservices = grpc.load(path.join(__dirname, '../../../proto/sf_services.proto')).sfservices;

/**
 * @desc A service to abastract the Shingo SF Microservice client
 * 
 * @export
 * @class SalesforceService
 */
@Component()
export class SalesforceService {

    private client;

    constructor() {
        this.client = bluebird.promisifyAll(this.getClient());
    }

    /**
     * @desc Method to instantiate a RPC Client from the sf_services.proto
     * 
     * @private
     * @returns Returns a RPC Client to be used in consuming the Shingo SF Microservice
     * @memberof SalesforceService
     */
    private getClient() {
        const envendpoint = process.env.SF_API
        const endpoint = envendpoint.indexOf(':') !== -1 ? envendpoint : `${envendpoint}:80`
        return new sfservices.SalesforceMicroservices(endpoint, grpc.credentials.createInsecure());
    }

    /**
     * @desc Async wrapper for the Shingo SF Microservice query call
     * 
     * @param {SFQueryObject} query - See {@link SFQueryObject}
     * @returns {Promise<SFQueryResponse>} See {@link SFQueryResponse}
     * @memberof SalesforceService
     */
    public async query(query: SFQueryObject): Promise<SFQueryResponse> {
        const response = await this.client.queryAsync(query);
        return JSON.parse(response.contents);
    }

    /**
     * @desc Async wrapper for the Shingo SF Microservice retrieve call
     * 
     * @param {SFIdData} data - See {@link SFIdData}
     * @returns {Promise<object>} 
     * @memberof SalesforceService
     */
    public async retrieve(data: SFIdData): Promise<object> {
        const response = await this.client.retrieveAsync(data);
        return JSON.parse(response.contents);
    }

    /**
     * @desc Async wrapper for the Shingo SF Microservice create call
     * 
     * @param {SFRecordData} data - See {@link SFRecordData}
     * @returns {Promise<SFSuccessObject[]>} - See {@link SFSuccessObject}
     * @memberof SalesforceService
     */
    public async create(data: SFRecordData): Promise<SFSuccessObject[]> {
        const response = await this.client.createAsync(data);
        return JSON.parse(response.contents);
    }

    /**
     * @desc Async wrapper for the Shingo SF Microservice update call
     * 
     * @param {SFRecordData} data - See {@link SFRecordData}
     * @returns {Promise<SFSuccessObject[]>} - See {@link SFSuccessObject}
     * @memberof SalesforceService
     */
    public async update(data: SFRecordData): Promise<SFSuccessObject[]> {
        const response = await this.client.updateAsync(data);
        return JSON.parse(response.contents);
    }

    /**
     * @desc Async wrapper for the Shingo SF Microservice delete call
     * 
     * @param {SFIdData} data - See {@link SFIdData}
     * @returns {Promise<SFSuccessObject[]>} - See {@link SFSuccessObject}
     * @memberof SalesforceService
     */
    public async delete(data: SFIdData): Promise<SFSuccessObject[]> {
        const response = await this.client.deleteAsync(data);
        return JSON.parse(response.contents);
    }

    /**
     * @desc Async wrapper for the Shingo SF Microservice describe call
     * 
     * @param {string} object - SF Object to describe
     * @returns {Promise<object>} - See {@linkhttps://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_sobject_describe.htm|Salesforce Docs}
     * @memberof SalesforceService
     */
    public async describe(object: string): Promise<object> {
        const response = await this.client.describeAsync({ object });
        return JSON.parse(response.contents);
    }

    /**
     * @desc Async wrapper for the Shingo SF Microservice search call
     * 
     * @param {SFSearchData} data - See {@link SFSearchData}
     * @returns {Promise<SFSearchResults>} - Array of workshops
     * @memberof SalesforceService
     */
    public async search(data: SFSearchData): Promise<SFSearchResults> {
        const response = await this.client.searchAsync(data);
        return JSON.parse(response.contents);
    }

    /**
     * @desc Utility method to assist in parsing gRPC error metadata. Returns a JSON object from the parsed error data. If no JSON object can be parsed, the method attempts to return the 'error-bin' from the meta-data as a string. If that fails the method returns the error passed to it.
     * 
     * @static
     * @param {gRPCError} error - The error to be parsed
     * @returns {object} The parsed error, 'error-bin'.toString(), or passed in error
     * @memberof SalesforceService
     */
    public static parseRPCErrorMeta(error: gRPCError): object {
        try {
            let err = JSON.parse(error.metadata.get('error-bin').toString());
            return err;
        } catch (caught) {
            if (error.metadata.get('error-bin')) return error.metadata.get('error-bin').toString();
            else return error;
        }
    }

}