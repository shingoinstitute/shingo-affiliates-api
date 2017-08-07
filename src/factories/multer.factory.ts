import { Component } from '@nestjs/common';
import * as multer from 'multer';

@Component()
export class MulterFactory {

    public getUploadFunction(fieldName: string = 'files', type: 'single' | 'array' = 'single') {
        const m = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1000 * 1000 * 25 } });
        return (type === 'array' ? m.array(fieldName, 30) : m.single(fieldName));
    }
}