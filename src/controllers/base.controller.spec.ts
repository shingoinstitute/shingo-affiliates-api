import { Test as NestTest } from '@nestjs/testing';
import { HttpStatus, Controller } from '@nestjs/common';
import { BaseController } from './base.controller';
import { LoggerService } from '../components';
import { MockLoggerInstance } from '../components/mock';
import { MockExpressInstance, MockServiceFactory } from '../factories';
import { Expect, Test, TestFixture, Setup, Any, TestCase } from 'alsatian';

@Controller()
class MockBaseController extends BaseController {
    constructor(private logger: LoggerService) { super(logger); }
}

@TestFixture('Base Controller')
export class BaseControllerFixture {

    private mockExpress: MockExpressInstance;
    private mockLogger: MockLoggerInstance;

    @Setup
    public Setup() {
        this.mockExpress = MockServiceFactory.getMockInstance<MockExpressInstance>(MockExpressInstance);
        this.mockLogger = MockServiceFactory.getMockInstance<MockLoggerInstance>(MockLoggerInstance);

        NestTest.createTestingModule({
            controllers: [MockBaseController],
            components: [
                { provide: 'LoggerService', useValue: this.mockLogger }
            ]
        });
    }

    @TestCase('Error 1 - undefined HttpStatus', 'Error String', undefined)
    @TestCase('Error 1 - BAD_REQUEST', 'Error String', HttpStatus.BAD_REQUEST)
    @Test('Handle Error')
    public handleError(message: string, error: any, errorCode: HttpStatus) {
        const controller = NestTest.get<MockBaseController>(MockBaseController);

        controller.handleError(this.mockExpress.res, message, error, errorCode);

        Expect(this.mockLogger.error).toHaveBeenCalledWith(message + ' %j', error);
        Expect(this.mockExpress.res.status).toHaveBeenCalledWith(errorCode || HttpStatus.INTERNAL_SERVER_ERROR).exactly(1).times;
        Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
    }

}