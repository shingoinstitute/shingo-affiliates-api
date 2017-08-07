import { Test as NestTest } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AffiliatesController } from './affiliates.controller';
import { AffiliatesService, LoggerService } from '../../components';
import { MockAffiliatesServiceInstance, MockLoggerInstance } from '../../components/mock';
import { MockExpressInstance, MockServiceFactory, MulterFactory } from '../../factories';
import { Expect, Test, AsyncTest, TestFixture, Setup, SpyOn, Any, TestCase } from 'alsatian';

function getController() {
    const controller: AffiliatesController = NestTest.get<AffiliatesController>(AffiliatesController);
    const handleError = SpyOn(controller, 'handleError');
    handleError.andStub();
    return { controller, handleError };
}

@TestFixture('Affiliates Controller')
export class AffiliatesControllerFixture {

    private mockAffiliatesService: MockAffiliatesServiceInstance;
    private mockExpress: MockExpressInstance;

    @Setup
    public Setup() {
        this.mockAffiliatesService = MockServiceFactory.getMockInstance<MockAffiliatesServiceInstance>(MockAffiliatesServiceInstance);
        this.mockExpress = MockServiceFactory.getMockInstance<MockExpressInstance>(MockExpressInstance);

        NestTest.createTestingModule({
            controllers: [AffiliatesController],
            components: [
                { provide: AffiliatesService, useValue: this.mockAffiliatesService },
                { provide: LoggerService, useValue: MockServiceFactory.getMockInstance<MockLoggerInstance>(MockLoggerInstance) }
            ]
        });
    }

    @Test('Controller initialized correctly')
    public intialized() {
        const { controller } = getController();

        Expect(controller).toBeDefined();
        Expect(controller.readAll).toBeDefined();
        Expect(controller.describe).toBeDefined();
        Expect(controller.search).toBeDefined();
        Expect(controller.read).toBeDefined();
        Expect(controller.map).toBeDefined();
        Expect(controller.create).toBeDefined();
        Expect(controller.update).toBeDefined();
        Expect(controller.delete).toBeDefined();
    }

    @TestCase({ user: { role: { name: 'Affiliate Manager' } } }, 'false', 'false', 'false', true)
    @TestCase({ user: { role: { name: 'Affiliate Manager' } } }, 'false', 'false', 'true', true)
    @TestCase({ user: { role: { name: 'Affiliate Manager' } } }, 'false', 'true', 'false', true)
    @TestCase({ user: { role: { name: 'Affiliate Manager' } } }, 'false', 'true', 'true', true)
    @TestCase({ user: { role: { name: 'Affiliate Manager' } } }, 'true', 'false', 'false', true)
    @TestCase({ user: { role: { name: 'Affiliate Manager' } } }, 'true', 'false', 'true', true)
    @TestCase({ user: { role: { name: 'Affiliate Manager' } } }, 'true', 'true', 'false', true)
    @TestCase({ user: { role: { name: 'Affiliate Manager' } } }, 'true', 'true', 'true', true)
    @TestCase({ user: { role: { name: 'Facilitator' } } }, 'false', 'false', 'false', false)
    @TestCase({ user: { role: { name: 'Facilitator' } } }, 'false', 'false', 'true', false)
    @TestCase({ user: { role: { name: 'Facilitator' } } }, 'false', 'true', 'false', true)
    @TestCase({ user: { role: { name: 'Facilitator' } } }, 'false', 'true', 'true', true)
    @TestCase({ user: { role: { name: 'Facilitator' } } }, 'true', 'false', 'false', true)
    @TestCase({ user: { role: { name: 'Facilitator' } } }, 'true', 'false', 'true', true)
    @TestCase({ user: { role: { name: 'Facilitator' } } }, 'true', 'true', 'false', true)
    @TestCase({ user: { role: { name: 'Facilitator' } } }, 'true', 'true', 'true', true)
    @TestCase({}, 'false', 'false', 'false', false)
    @TestCase({}, 'false', 'false', 'true', false)
    @TestCase({}, 'false', 'true', 'false', true)
    @TestCase({}, 'false', 'true', 'true', true)
    @TestCase({}, 'true', 'false', 'false', true)
    @TestCase({}, 'true', 'false', 'true', true)
    @TestCase({}, 'true', 'true', 'false', true)
    @TestCase({}, 'true', 'true', 'true', true)
    @AsyncTest('Read all Affiliates')
    public async readAll(session: string, isPublicQ: string, isPublicH: string, refresh: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.readAll(this.mockExpress.res, session, isPublicQ, isPublicH, refresh);

        const isPublic = (isPublicQ === 'true' || isPublicH === 'true');

        if (isValid) {
            Expect(this.mockAffiliatesService.getAll).toHaveBeenCalledWith(isPublic, refresh === 'true');
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(this.mockExpress.res, 'Error in AffiliatesController.readAll(): ', Any, HttpStatus.FORBIDDEN);
            Expect(this.mockAffiliatesService.getAll).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('false')
    @TestCase('true')
    @AsyncTest('Describe the Account SF object')
    public async describe(refresh: string) {
        const { controller } = getController();

        await controller.describe(this.mockExpress.res, refresh);

        Expect(this.mockAffiliatesService.describe).toHaveBeenCalledWith(refresh === 'true').exactly(1).times;
        Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
        Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
    }

    @TestCase('', '', 'false')
    @TestCase('', 'Id,', 'true')
    @TestCase('D*', '', 'true')
    @TestCase('D*', 'Id,', 'true')
    @AsyncTest('Search for an Affiliate')
    public async search(search: string, retrieve: string, refresh: string) {
        const { controller, handleError } = getController();

        await controller.search(this.mockExpress.res, search, retrieve, refresh);

        if (search && retrieve) {
            Expect(this.mockAffiliatesService.search).toHaveBeenCalledWith(search, retrieve, refresh === 'true').exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in AffiliatesController.search(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockAffiliatesService.search).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('', false)
    @TestCase('not a sf id', false)
    @TestCase('01Sg0000001jXbg', true)
    @AsyncTest('Read a specific Affiliate')
    public async read(id: string, isId: boolean) {
        const { controller, handleError } = getController();

        await controller.read(this.mockExpress.res, id);

        if (isId) {
            Expect(this.mockAffiliatesService.get).toHaveBeenCalledWith(id).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in AffiliatesController.read(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockAffiliatesService.get).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('01Sg0000001jXbg', 'D*', 'Id,Name', 'false', true)
    @TestCase('not a sf id', 'D*', 'Id,Name', 'false', false) // Bad Id
    @TestCase('', 'D*', 'Id,Name', 'false', false) // Bad Id
    @TestCase('01Sg0000001jXbg', '', 'Id,Name', 'false', false) // Missing search
    @TestCase('01Sg0000001jXbg', 'D*', '', 'false', false) // Missing retrieve
    @TestCase('01Sg0000001jXbg', 'D*', 'Id,Name', 'true', true)
    @TestCase('not a sf id', 'D*', 'Id,Name', 'true', false) // Bad Id
    @TestCase('', 'D*', 'Id,Name', 'true', false) // Bad Id
    @TestCase('01Sg0000001jXbg', '', 'Id,Name', 'true', false) // Missing search
    @TestCase('01Sg0000001jXbg', 'D*', '', 'true', false) // Missing retrieve
    @AsyncTest('Search for an Affiliates Course Managers')
    public async searchCMS(id: string, search: string, retrieve: string, refresh: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.searchCMS(this.mockExpress.res, id, search, retrieve, refresh);

        if (isValid) {
            Expect(this.mockAffiliatesService.searchCM).toHaveBeenCalledWith(id, search, retrieve, refresh === 'true');
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in AffiliatesController.searchCMS(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockAffiliatesService.searchCM).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase({}, false)
    @TestCase({ SomeOtherProp: 'oops' }, false)
    @TestCase({ Name: 'Test Workshop' }, true)
    @AsyncTest('Create a new workshop')
    public async create(body: any, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.create(this.mockExpress.res, body);

        if (isValid) {
            Expect(this.mockAffiliatesService.create).toHaveBeenCalledWith(body).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.CREATED).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in AffiliatesController.create(): ', Any, HttpStatus.BAD_REQUEST);
            Expect(this.mockAffiliatesService.create).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('', false)
    @TestCase('not a sf id', false)
    @TestCase('01Sg0000001jXbg', true)
    @AsyncTest('Map an existing Account to be an Affiliate')
    public async map(id: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.map(this.mockExpress.res, id);

        if (isValid) {
            Expect(this.mockAffiliatesService.map).toHaveBeenCalledWith(id).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in AffiliatesController.map(): ', Any, HttpStatus.BAD_REQUEST);
            Expect(this.mockAffiliatesService.map).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase({ Id: '01Sg0000001jXbg' }, '01Sg0000001jXbg', true)
    @TestCase({ Id: '01Sg0000001jXbg' }, '01Sg0000001jXBG', false) // Differing Ids
    @TestCase({ Id: 'not a sf id' }, '01Sg0000001jXbg', false) // Bad Id
    @TestCase({ Id: '' }, '01Sg0000001jXbg', false) // Empty Id    
    @AsyncTest('Update an Affiliate')
    public async update(body: any, id: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.update(this.mockExpress.res, body, id);

        if (isValid) {
            Expect(this.mockAffiliatesService.update).toHaveBeenCalledWith(body).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in AffiliatesController.update(): ', Any, HttpStatus.BAD_REQUEST);
            Expect(this.mockAffiliatesService.update).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('', false)
    @TestCase('not a sf id', false)
    @TestCase('01Sg0000001jXbg', true)
    @AsyncTest('Delete an Affiliate')
    public async delete(id: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.delete(this.mockExpress.res, id);

        if (isValid) {
            Expect(this.mockAffiliatesService.delete).toHaveBeenCalledWith(id).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in AffiliatesController.delete(): ', Any, HttpStatus.BAD_REQUEST);
            Expect(this.mockAffiliatesService.delete).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

}