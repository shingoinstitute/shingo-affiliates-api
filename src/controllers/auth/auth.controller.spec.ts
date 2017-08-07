import { Test as NestTest } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService, LoggerService, SalesforceService } from '../../components';
import { MockSalesforceServiceInstance, MockAuthServiceInstance, MockLoggerInstance } from '../../components/mock';
import { MockExpressInstance, MockServiceFactory } from '../../factories';
import { Expect, Test, AsyncTest, TestFixture, Setup, SpyOn, Any, TestCase } from 'alsatian';

function getController() {
    const controller: AuthController = NestTest.get<AuthController>(AuthController);
    const handleError = SpyOn(controller, 'handleError');
    handleError.andStub();
    return { controller, handleError };
}

@TestFixture('Auth Controller')
export class AuthControllerFixture {

    private mockAuthService: MockAuthServiceInstance;
    private mockSFService: MockSalesforceServiceInstance;
    private mockExpress: MockExpressInstance;

    @Setup
    public Setup() {
        this.mockAuthService = MockServiceFactory.getMockInstance<MockAuthServiceInstance>(MockAuthServiceInstance);
        this.mockSFService = MockServiceFactory.getMockInstance<MockSalesforceServiceInstance>(MockSalesforceServiceInstance);
        this.mockExpress = MockServiceFactory.getMockInstance<MockExpressInstance>(MockExpressInstance);

        NestTest.createTestingModule({
            controllers: [AuthController],
            components: [
                { provide: AuthService, useValue: this.mockAuthService },
                { provide: SalesforceService, useValue: this.mockSFService },
                { provide: LoggerService, useValue: MockServiceFactory.getMockInstance<MockLoggerInstance>(MockLoggerInstance) }
            ]
        });
    }

    @Test('Controller initilized correclty')
    public initialized() {
        const { controller } = getController();

        Expect(controller).toBeDefined();
        Expect(controller.login).toBeDefined();
        Expect(controller.valid).toBeDefined();
        Expect(controller.logout).toBeDefined();
    }

    @TestCase({ email: 'test.user@example.com', password: 'password' }, true)
    @TestCase({ password: 'password' }, false) // Missing email
    @TestCase({ email: 'test.user@example.com' }, false) // Missing password
    @AsyncTest('Login a user')
    public async login(body: any, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.login(this.mockExpress.req, this.mockExpress.res, body);

        if (isValid) {
            Expect(this.mockAuthService.login).toHaveBeenCalledWith(body).exactly(1).times;
            Expect(this.mockSFService.query).toHaveBeenCalledWith(Any).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in AuthController.login(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockAuthService.login).not.toHaveBeenCalled();
            Expect(this.mockSFService.query).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @AsyncTest('Validate a user')
    public async valid() {
        const { controller, handleError } = getController();

        await controller.valid(this.mockExpress.req, this.mockExpress.res);

        Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
        Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
    }

    @TestCase({ id: 1 }, true)
    @TestCase(undefined, false)
    @AsyncTest('Logout a user')
    public async logout(user: any, isValid: boolean) {
        const { controller, handleError } = getController();

        this.mockExpress.req.session.user = user;

        await controller.logout(this.mockExpress.req, this.mockExpress.res);

        if (isValid) {
            Expect(this.mockAuthService.updateUser).toHaveBeenCalledWith(Any).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in AuthController.logout(): ', Any, HttpStatus.NOT_FOUND).exactly(1).times;
            Expect(this.mockAuthService.updateUser).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }
}

