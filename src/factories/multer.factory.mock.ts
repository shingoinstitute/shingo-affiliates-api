import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance } from './service.factory.mock';

export class MockMulterInstance extends MockInstance {

    constructor(file: any = { originalname: 'file.test', buffer: new Buffer('test') }) {
        super();

        function upload(req, res, callback) {
            req.file = file;
            req.files = [req.file];
            callback();
        }

        this.getUploadFunction.andReturn(upload);
    }

    getUploadFunction: FunctionSpy = createFunctionSpy();
}