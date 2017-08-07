import { Test as NestTest } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { FacilitatorsController } from './facilitators.controller';
import { FacilitatorsService, LoggerService } from '../../components';
import { MockFacilitatorsServiceInstance, MockLoggerInstance } from '../../components/mock';
import { MockExpressInstance, MockServiceFactory } from '../../factories';
import { Expect, Test, AsyncTest, TestFixture, Setup, SpyOn, Any, TestCase } from 'alsatian';

function getController() {
    const controller: FacilitatorsController = NestTest.get<FacilitatorsController>(FacilitatorsController);
    const handleError = SpyOn(controller, 'handleError');
    handleError.andStub();
    return { controller, handleError };
}

@TestFixture('Facilitators Controller')
export class FacilitatorsControllerFixture {

    private mockFacilitatorsService: MockFacilitatorsServiceInstance;
    private mockExpress: MockExpressInstance;

    @Setup
    public Setup() {
        this.mockFacilitatorsService = MockServiceFactory.getMockInstance<MockFacilitatorsServiceInstance>(MockFacilitatorsServiceInstance);
        this.mockExpress = MockServiceFactory.getMockInstance<MockExpressInstance>(MockExpressInstance);

        NestTest.createTestingModule({
            controllers: [FacilitatorsController],
            components: [
                { provide: FacilitatorsService, useValue: this.mockFacilitatorsService },
                { provide: LoggerService, useValue: MockServiceFactory.getMockInstance<MockLoggerInstance>(MockLoggerInstance) }
            ]
        });
    }

    @Test('Controller initilized correctly')
    public initilized() {
        const { controller } = getController();

        Expect(controller).toBeDefined();
        Expect(controller.read).toBeDefined();
        Expect(controller.readAll).toBeDefined();
        Expect(controller.create).toBeDefined();
        Expect(controller.update).toBeDefined();
        Expect(controller.delete).toBeDefined();
        Expect(controller.unamp).toBeDefined();
        Expect(controller.deleteLogin).toBeDefined();
        Expect(controller.changeRole).toBeDefined();
        Expect(controller.describe).toBeDefined();
        Expect(controller.search).toBeDefined();
        Expect(controller.map).toBeDefined();
    }

    @TestCase({ affiliate: '', user: { role: { name: 'Affiliate Manager' } } }, '', 'false', true, true)
    @TestCase({ affiliate: '', user: { role: { name: 'Affiliate Manager' } } }, '00030000bdffss', 'false', true, true)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Facilitator' } } }, '', 'false', false, true)
    @TestCase({ affiliate: '', user: { role: { name: 'Facilitator' } } }, '', 'false', false, false)
    @TestCase({ affiliate: '', user: { role: { name: 'Affiliate Manager' } } }, '', 'true', true, true)
    @TestCase({ affiliate: '', user: { role: { name: 'Affiliate Manager' } } }, '00030000bdffss', 'true', true, true)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Facilitator' } } }, '', 'true', false, true)
    @TestCase({ affiliate: '', user: { role: { name: 'Facilitator' } } }, '', 'true', false, false)
    @AsyncTest('Read all facilitators')
    public async readAll(session: any, xAffiliate: string, refresh: string, isAfMan: boolean, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.readAll(this.mockExpress.res, session, xAffiliate, refresh);

        if (isValid) {
            Expect(this.mockFacilitatorsService.getAll).toHaveBeenCalledWith(session.user, refresh === 'true', (isAfMan ? xAffiliate : session.affiliate)).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in FacilitatorsController.readAll(): ', Any, HttpStatus.FORBIDDEN).exactly(1).times;
            Expect(this.mockFacilitatorsService.getAll).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('false')
    @TestCase('true')
    @AsyncTest('Describe the Contact object in SF')
    public async describe(refresh) {
        const { controller } = getController();

        await controller.describe(this.mockExpress.res, refresh);

        Expect(this.mockFacilitatorsService.describe).toHaveBeenCalledWith(refresh === 'true').exactly(1).times;
        Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
        Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
    }

    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Affiliate Manager' } } }, 'D*', 'Id,Name', 'false', true, true)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Affiliate Manager' } } }, '', 'Id,Name', 'false', true, false)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Affiliate Manager' } } }, 'D*', '', 'false', true, false)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Facilitator' } } }, 'D*', 'Id,Name', 'false', false, true)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Facilitator' } } }, '', 'Id,Name', 'false', false, false)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Facilitator' } } }, 'D*', '', 'false', false, false)
    @TestCase({ affiliate: '', user: { role: { name: 'Facilitator' } } }, 'D*', 'Id,Name', 'false', false, false)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Affiliate Manager' } } }, 'D*', 'Id,Name', 'true', true, true)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Affiliate Manager' } } }, '', 'Id,Name', 'true', true, false)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Affiliate Manager' } } }, 'D*', '', 'true', true, false)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Facilitator' } } }, 'D*', 'Id,Name', 'true', false, true)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Facilitator' } } }, '', 'Id,Name', 'true', false, false)
    @TestCase({ affiliate: '000300000asdfg', user: { role: { name: 'Facilitator' } } }, 'D*', '', 'true', false, false)
    @TestCase({ affiliate: '', user: { role: { name: 'Facilitator' } } }, 'D*', 'Id,Name', 'true', false, false)
    @AsyncTest('Search for facilitators')
    public async search(session: any, search: string, retrieve: string, refresh: string, isAfMan: boolean, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.search(this.mockExpress.res, session, search, retrieve, refresh);

        if (isValid) {
            Expect(this.mockFacilitatorsService.search).toHaveBeenCalledWith(search, retrieve, isAfMan ? '' : session.affiliate, refresh === 'true').exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            const status = (!isAfMan && !session.affiliate ? HttpStatus.FORBIDDEN : HttpStatus.BAD_REQUEST);
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in FacilitatorsController.search(): ', Any, status).exactly(1).times;
            Expect(this.mockFacilitatorsService.search).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('', false)
    @TestCase('not a sf id', false)
    @TestCase('0003000000asdfg', true)
    @AsyncTest('Read a single Facilitator')
    public async read(id: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.read(this.mockExpress.res, id);

        if (isValid) {
            Expect(this.mockFacilitatorsService.get).toHaveBeenCalledWith(id).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in FacilitatorsController.read(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockFacilitatorsService.get).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase({ AccountId: '0003000000asdfg', FirstName: 'test', LastName: 'user', Email: 'test.user@gmail.com', password: 'password' }, true)
    @TestCase({ AccountId: '0003000000asdfg', FirstName: 'test', LastName: 'user', Email: 'test.user@gmail.com', password: 'password', roleId: 1 }, true)
    @TestCase({ FirstName: 'test', LastName: 'user', Email: 'test.user@gmail.com', password: 'password' }, false) // Missing AccountId
    @TestCase({ AccountId: '0003000000asdfg', LastName: 'user', Email: 'test.user@gmail.com', password: 'password' }, false) // Missing FirstName
    @TestCase({ AccountId: '0003000000asdfg', FirstName: 'test', LastName: 'user', password: 'password' }, false) // Missing Email
    @TestCase({ AccountId: '0003000000asdfg', FirstName: 'test', LastName: 'user', Email: 'test.user@gmail.com' }, false) // Missing password
    @TestCase({ AccountId: 'not a sf id', FirstName: 'test', LastName: 'user', Email: 'test.user@gmail.com', password: 'password' }, false) // Bad body.AccountId
    @AsyncTest('Create a Facilitator')
    public async create(body: any, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.create(this.mockExpress.res, body);

        if (isValid) {
            Expect(this.mockFacilitatorsService.create).toHaveBeenCalledWith(body).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.CREATED).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in FacilitatorsController.create(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockFacilitatorsService.get).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase({ AccountId: '0003000000asdfg', Email: 'test.user@gmail.com', password: 'password' }, '0003000000aDFSAA', true)
    @TestCase({ Email: 'test.user@gmail.com', password: 'password' }, '0003000000aDFSAA', false) // Missing AccountId
    @TestCase({ AccountId: '0003000000asdfg', password: 'password' }, '0003000000aDFSAA', false) // Missing Email
    @TestCase({ AccountId: '0003000000asdfg', Email: 'test.user@gmail.com' }, '0003000000aDFSAA', false) // Missing Password
    @TestCase({ AccountId: '0003000000asdfg', Email: 'test.user@gmail.com', password: 'password' }, 'not a sf id', false) // Bad Id Param
    @AsyncTest('Map an existing contact to a new/current auth')
    public async map(body: any, id: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.map(this.mockExpress.res, body, id);

        if (isValid) {
            Expect(this.mockFacilitatorsService.mapContact).toHaveBeenCalledWith(id, body).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.CREATED).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in FacilitatorsController.map(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockFacilitatorsService.mapContact).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase({ Id: '0003000000asdfg', Email: 'test.user@gmail.com' }, '0003000000asdfg', true)
    @TestCase({ Id: '0003000000asdfg', Email: 'test.user@gmail.com' }, 'not a sf id', false) // Bad Id Param
    @TestCase({ Email: 'test.user@gmail.com' }, '0003000000asdfg', false) // Missing Id
    @AsyncTest('Update a Facilitator')
    public async update(body: any, id: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.update(this.mockExpress.res, body, id);

        if (isValid) {
            Expect(this.mockFacilitatorsService.update).toHaveBeenCalledWith(body).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in FacilitatorsController.update(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockFacilitatorsService.update).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('', 'true', false)
    @TestCase('', 'false', false)
    @TestCase('not a sf id', 'true', false)
    @TestCase('not a sf id', 'false', false)
    @TestCase('0003000000asdfg', 'true', true)
    @TestCase('0003000000asdfg', 'false', true)
    @AsyncTest('Delete a Facilitator')
    public async delete(id: string, deleteAuth: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.delete(this.mockExpress.res, id, deleteAuth);

        if (isValid) {
            Expect(this.mockFacilitatorsService.delete).toHaveBeenCalledWith(id).exactly(1).times;
            if (deleteAuth === 'true') Expect(this.mockFacilitatorsService.deleteAuth).toHaveBeenCalledWith(id).exactly(1).times;
            else Expect(this.mockFacilitatorsService.unmapAuth).toHaveBeenCalledWith(id).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in FacilitatorsController.delete(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockFacilitatorsService.delete).not.toHaveBeenCalled();
            Expect(this.mockFacilitatorsService.deleteAuth).not.toHaveBeenCalled();
            Expect(this.mockFacilitatorsService.unmapAuth).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('', false)
    @TestCase('not a sf id', false)
    @TestCase('0003000000asdfg', true)
    @AsyncTest('Delete only the login of a Facilitator')
    public async deleteLogin(id: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.deleteLogin(this.mockExpress.res, id);

        if (isValid) {
            Expect(this.mockFacilitatorsService.deleteAuth).toHaveBeenCalledWith(id).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in FacilitatorsController.deleteLogin(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockFacilitatorsService.deleteAuth).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('', false)
    @TestCase('not a sf id', false)
    @TestCase('0003000000asdfg', true)
    @AsyncTest('Unmap the affiliate-portal service from a Facilitator\'s auth account')
    public async unmap(id: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.unamp(this.mockExpress.res, id);

        if (isValid) {
            Expect(this.mockFacilitatorsService.unmapAuth).toHaveBeenCalledWith(id).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in FacilitatorsController.unmap(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockFacilitatorsService.unmapAuth).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('', 1, false)
    @TestCase('not a sf id', 1, false)
    @TestCase('0003000000asdfg', 1, true)
    @AsyncTest('Change the role of a Facilitator')
    public async changeRole(id: string, roleId: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.changeRole(this.mockExpress.res, id, roleId);

        if (isValid) {
            Expect(this.mockFacilitatorsService.changeRole).toHaveBeenCalledWith(id, roleId).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in FacilitatorsController.changeRole(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockFacilitatorsService.changeRole).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }
}