import { Injectable } from '@nestjs/common';
import * as multer from 'multer';

@Injectable()
export class MulterFactory {

    public getUploadFunction(fieldName: string = 'files', type: 'single' | 'array' = 'single') {
        const m = multer({ storage: multer.memoryStorage() });
        return (type === 'array' ? m.array(fieldName, 30) : m.single(fieldName));
    }
}