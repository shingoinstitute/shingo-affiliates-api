import { Test as NestTest } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { WorkshopsController } from './workshops.controller';
import { WorkshopsService, LoggerService } from '../../components';
import { MockWorkshopsServiceInstance, MockLoggerInstance } from '../../components/mock';
import { MockExpressInstance, MockMulterInstance, MockServiceFactory } from '../../factories/index.mock';
import { MulterFactory } from '../../factories'
import { Expect, Test, AsyncTest, TestFixture, Setup, SpyOn, Any, TestCase } from 'alsatian';

function getController() {
    const controller: WorkshopsController = NestTest.get<WorkshopsController>(WorkshopsController);
    const handleError = SpyOn(controller, 'handleError');
    handleError.andStub();
    return { controller, handleError };
}

@TestFixture('Workshops Controller')
export class WorkshopsControllerFixture {

    private mockWorkshopsService: MockWorkshopsServiceInstance;
    private mockMulter: MockMulterInstance;
    private mockExpress: MockExpressInstance;

    @Setup
    public Setup() {
        this.mockWorkshopsService = MockServiceFactory.getMockInstance<MockWorkshopsServiceInstance>(MockWorkshopsServiceInstance);
        this.mockMulter = MockServiceFactory.getMockInstance<MockMulterInstance>(MockMulterInstance);
        this.mockExpress = MockServiceFactory.getMockInstance<MockExpressInstance>(MockExpressInstance);

        NestTest.createTestingModule({
            controllers: [WorkshopsController],
            components: [
                { provide: WorkshopsService, useValue: this.mockWorkshopsService },
                { provide: MulterFactory, useValue: this.mockMulter },
                { provide: LoggerService, useValue: MockServiceFactory.getMockInstance<MockLoggerInstance>(MockLoggerInstance) }
            ]
        });
    }

    @Test('Controller initialized correctly')
    public initialized() {
        const { controller } = getController();

        Expect(controller).toBeDefined();
        Expect(controller.readAll).toBeDefined();
        Expect(controller.describe).toBeDefined();
        Expect(controller.search).toBeDefined();
        Expect(controller.read).toBeDefined();
        Expect(controller.facilitators).toBeDefined();
        Expect(controller.create).toBeDefined();
        Expect(controller.update).toBeDefined();
        Expect(controller.delete).toBeDefined();
        Expect(controller.uploadAttendeeFile).toBeDefined();
        Expect(controller.uploadEvaluations).toBeDefined();
    }

    @TestCase({ id: 1 }, 'false', 'false', 'false')
    @TestCase({ id: 1 }, 'false', 'false', 'true')
    @TestCase({ id: 1 }, 'false', 'true', 'false')
    @TestCase({ id: 1 }, 'false', 'true', 'true')
    @TestCase({ id: 1 }, 'true', 'false', 'false')
    @TestCase({ id: 1 }, 'true', 'false', 'true')
    @TestCase({ id: 1 }, 'true', 'true', 'false')
    @TestCase({ id: 1 }, 'true', 'true', 'true')
    @TestCase(undefined, 'false', 'false', 'false')
    @TestCase(undefined, 'false', 'false', 'true')
    @TestCase(undefined, 'false', 'true', 'false')
    @TestCase(undefined, 'false', 'true', 'true')
    @TestCase(undefined, 'true', 'false', 'false')
    @TestCase(undefined, 'true', 'false', 'true')
    @TestCase(undefined, 'true', 'true', 'false')
    @TestCase(undefined, 'true', 'true', 'true')
    @AsyncTest('Read all workshops')
    public async readAll(sessionUser: object | undefined, isPublicQ: string, isPublicH: string, refresh: string) {
        const { controller, handleError } = getController();

        const session = {
            user: sessionUser
        }
        await controller.readAll(this.mockExpress.res, session)
        const expectedIsPublic: boolean = (isPublicQ === 'true' || isPublicH === 'true');
        const expectedRefresh: boolean = refresh === 'true';
        const expectedUser: object | undefined = session.user;

        if (!expectedIsPublic && !expectedUser) {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in WorkshopsController.readAll(): ', Any, HttpStatus.FORBIDDEN).exactly(1).times;
            Expect(this.mockWorkshopsService.getAll).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        } else {
            Expect(this.mockWorkshopsService.getAll).toHaveBeenCalledWith(expectedIsPublic, expectedRefresh, expectedUser).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        }
    }

    @TestCase('false')
    @TestCase('true')
    @AsyncTest('Describe the Workshop__c SF object')
    public async describe(refresh: string) {
        const { controller } = getController();

        await controller.describe(this.mockExpress.res, refresh);

        Expect(this.mockWorkshopsService.describe).toHaveBeenCalledWith(refresh === 'true').exactly(1).times;
        Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
        Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
    }

    @TestCase('', '', 'false')
    @TestCase('', 'Id,', 'true')
    @TestCase('D*', '', 'true')
    @TestCase('D*', 'Id,', 'true')
    @AsyncTest('Search for a Workshop')
    public async search(search: string, retrieve: string, refresh: string) {
        const { controller, handleError } = getController();

        await controller.search(this.mockExpress.res, search, retrieve, refresh);

        if (search && retrieve) {
            Expect(this.mockWorkshopsService.search).toHaveBeenCalledWith(search, retrieve, refresh === 'true').exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in WorkshopsController.search(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockWorkshopsService.search).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('', false)
    @TestCase('not a sf id', false)
    @TestCase('a1Sg0000001jXbg', true)
    @AsyncTest('Read a specific workshop')
    public async read(id: string, isId: boolean) {
        const { controller, handleError } = getController();

        await controller.read(this.mockExpress.res, id);

        if (isId) {
            Expect(this.mockWorkshopsService.get).toHaveBeenCalledWith(id).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in WorkshopsController.read(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockWorkshopsService.get).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('', false)
    @TestCase('not a sf id', false)
    @TestCase('a1Sg0000001jXbg', true)
    @AsyncTest('Get the facilitators for a Workshop')
    public async facilitators(id: string, isId: boolean) {
        const { controller, handleError } = getController();

        await controller.facilitators(this.mockExpress.res, id);

        if (isId) {
            Expect(this.mockWorkshopsService.facilitators).toHaveBeenCalledWith(id).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in WorkshopsController.facilitators(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(this.mockWorkshopsService.facilitators).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }

    }

    @TestCase(
        {
            Organizing_Affiliate__c: '00300s00000sfAAD', Start_Date__c: new Date().toString(),
            End_Date__c: new Date().toString(), Host_Site__c: 'USU', Event_Country__c: 'USA',
            Event_City__c: 'Logan', facilitators: []
        },
        {
            affiliate: '00300s00000sfAAD',
            user: { role: { name: 'Facilitator' } }
        },
        true
    )
    @TestCase(
        {
            Organizing_Affiliate__c: '00300s00000sfAAD', Start_Date__c: new Date().toString(),
            End_Date__c: new Date().toString(), Host_Site__c: 'USU', Event_Country__c: 'USA',
            Event_City__c: 'Logan', facilitators: []
        },
        {
            affiliate: '00300s00000sfAAD',
            user: { role: { name: 'Affiliate Manager' } }
        },
        true
    )
    @TestCase(
        {
            Organizing_Affiliate__c: '00300s00000sfAAD', Start_Date__c: new Date().toString(),
            End_Date__c: new Date().toString(), Host_Site__c: 'USU', Event_Country__c: 'USA',
            Event_City__c: 'Logan', facilitators: []
        },
        {
            affiliate: '00300000sfAAD',
            user: { role: { name: 'Facilitator' } }
        },
        false // Differing Affiliate and Organizing_Affiliate__c
    )
    @TestCase(
        {
            Organizing_Affiliate__c: 'not a sf id', Start_Date__c: new Date().toString(),
            End_Date__c: new Date().toString(), Host_Site__c: 'USU', Event_Country__c: 'USA',
            Event_City__c: 'Logan', facilitators: []
        },
        {
            affiliate: '00300s00000sfAAD',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Not an sf id
    )
    @TestCase(
        {
            Start_Date__c: new Date().toString(),
            End_Date__c: new Date().toString(), Host_Site__c: 'USU', Event_Country__c: 'USA',
            Event_City__c: 'Logan', facilitators: []
        },
        {
            affiliate: '00300s00000sfAAD',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Missing Organizing_Affiliate__c
    )
    @TestCase(
        {
            Organizing_Affiliate__c: '00300s00000sfAAD',
            End_Date__c: new Date().toString(), Host_Site__c: 'USU', Event_Country__c: 'USA',
            Event_City__c: 'Logan', facilitators: []
        },
        {
            affiliate: '00300s00000sfAAD',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Missing Start_Date__c
    )
    @TestCase(
        {
            Organizing_Affiliate__c: '00300s00000sfAAD', Start_Date__c: new Date().toString(),
            Host_Site__c: 'USU', Event_Country__c: 'USA',
            Event_City__c: 'Logan', facilitators: []
        },
        {
            affiliate: '00300s00000sfAAD',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Missing End_Date__c
    )
    @TestCase(
        {
            Organizing_Affiliate__c: '00300s00000sfAAD', Start_Date__c: new Date().toString(),
            End_Date__c: new Date().toString(), Event_Country__c: 'USA',
            Event_City__c: 'Logan', facilitators: []
        },
        {
            affiliate: '00300s00000sfAAD',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Missing Host_Site__c
    )
    @TestCase(
        {
            Organizing_Affiliate__c: '00300s00000sfAAD', Start_Date__c: new Date().toString(),
            End_Date__c: new Date().toString(), Host_Site__c: 'USU',
            Event_City__c: 'Logan', facilitators: []
        },
        {
            affiliate: '00300s00000sfAAD',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Missing Event_Country__c
    )
    @TestCase(
        {
            Organizing_Affiliate__c: '00300s00000sfAAD', Start_Date__c: new Date().toString(),
            End_Date__c: new Date().toString(), Host_Site__c: 'USU', Event_Country__c: 'USA',
            facilitators: []
        },
        {
            affiliate: '00300s00000sfAAD',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Missing Event_City__c
    )
    @TestCase(
        {
            Organizing_Affiliate__c: '00300s00000sfAAD', Start_Date__c: new Date().toString(),
            End_Date__c: new Date().toString(), Host_Site__c: 'USU', Event_Country__c: 'USA',
            Event_City__c: 'Logan'
        },
        {
            affiliate: '00300s00000sfAAD',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Missing facilitators
    )
    @AsyncTest('Create a new workshop')
    public async create(body: any, session: any, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.create(this.mockExpress.res, body, session);

        if (isValid) {
            Expect(this.mockWorkshopsService.create).toHaveBeenCalledWith(body).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.CREATED).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            const status = (session.user.role.name !== 'Affiliate Manager' && session.affiliate !== body.Organizing_Affiliate__c ? HttpStatus.FORBIDDEN : HttpStatus.BAD_REQUEST)
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in WorkshopsController.create(): ', Any, status);
            Expect(this.mockWorkshopsService.create).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase(
        'a1Sg0000001jXbg',
        {
            Id: 'a1Sg0000001jXbg',
            Organizing_Affiliate__c: '00300s00000sfAAD'
        },
        {
            affiliate: '00300s00000sfAAD',
            user: { role: { name: 'Facilitator' } }
        },
        true
    )
    @TestCase(
        'a1Sg0000001jXbg',
        {
            Id: 'a1Sg0000001jXbg',
            Organizing_Affiliate__c: '00300s00000sfAAD'
        },
        {
            affiliate: '',
            user: { role: { name: 'Affiliate Manager' } }
        },
        true
    )
    @TestCase(
        'not a sf id',
        {
            Id: 'a1Sg0000001jXbg',
            Organizing_Affiliate__c: '00300s00000sfAAD'
        },
        {
            affiliate: '',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Bad Id Param
    )
    @TestCase(
        'a1Sg0000001jXbg',
        {
            Id: 'not a sf id',
            Organizing_Affiliate__c: '00300s00000sfAAD'
        },
        {
            affiliate: '',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Bad body.Id
    )
    @TestCase(
        'a1Sg0000001jXBg',
        {
            Id: 'a1Sg0000001jXbg',
            Organizing_Affiliate__c: '00300s00000sfAAD'
        },
        {
            affiliate: '',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Id Param and body.Id do not match
    )
    @TestCase(
        'a1Sg0000001jXbg',
        {
            Id: 'a1Sg0000001jXbg',
            Organizing_Affiliate__c: 'not a sf id'
        },
        {
            affiliate: '',
            user: { role: { name: 'Affiliate Manager' } }
        },
        false // Bad body.Organizing_Affiliate__c
    )
    @TestCase(
        'a1Sg0000001jXbg',
        {
            Id: 'a1Sg0000001jXbg',
            Organizing_Affiliate__c: '00300s00000sfAAD'
        },
        {
            affiliate: '00300S00000SFAAD',
            user: { role: { name: 'Facilitator' } }
        },
        false // session.affiliate and body.Organizing_Affiliate__c mismatch
    )
    @AsyncTest('Update a workshop')
    public async update(id: string, body: any, session: any, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.update(this.mockExpress.res, id, body, session);

        if (isValid) {
            Expect(this.mockWorkshopsService.update).toHaveBeenCalledWith(body).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            const status = (session.user.role.name !== 'Affiliate Manager' && session.affiliate !== body.Organizing_Affiliate__c ? HttpStatus.FORBIDDEN : HttpStatus.BAD_REQUEST)
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in WorkshopsController.update(): ', Any, status);
            Expect(this.mockWorkshopsService.update).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

    @TestCase('', false)
    @TestCase('not a sf id', false)
    @TestCase('a1Sg0000001jXbg', true)
    @AsyncTest('Upload Attendee File')
    public async uploadAttendeeFile(id: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.uploadAttendeeFile(this.mockExpress.req, this.mockExpress.res, id);

        if (isValid) {
            setTimeout(() => {
                Expect(this.mockMulter.getUploadFunction).toHaveBeenCalledWith('attendeeList').exactly(1).times;
                Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.ACCEPTED).exactly(1).times;
                Expect(this.mockExpress.res.json).toHaveBeenCalledWith().exactly(1).times;
            }, 1000);
        } else {
            Expect(handleError).toHaveBeenCalledWith(this.mockExpress.res, 'Error in WorkshopsController.uploadAttendeeFile(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
        }
    }

    @TestCase('', false)
    @TestCase('not a sf id', false)
    @TestCase('a1Sg0000001jXbg', true)
    @AsyncTest('Upload Evaluation files')
    public async uploadEvaluationFiles(id: string, isValid: boolean) {
        const { controller, handleError } = getController();

        await controller.uploadEvaluations(this.mockExpress.req, this.mockExpress.res, id);

        if (isValid) {
            setTimeout(() => {
                Expect(this.mockMulter.getUploadFunction).toHaveBeenCalledWith('evaluationFiles').exactly(1).times;
                Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.ACCEPTED).exactly(1).times;
                Expect(this.mockExpress.res.json).toHaveBeenCalledWith().exactly(1).times;
            }, 1000);
        } else {
            Expect(handleError).toHaveBeenCalledWith(this.mockExpress.res, 'Error in WorkshopsController.uploadEvaluations(): ', Any, HttpStatus.BAD_REQUEST).exactly(1).times;
        }
    }

    @TestCase('', false)
    @TestCase('not a sf id', false)
    @TestCase('a1Sg0000001jXbg', true)
    @AsyncTest('Delete a Workshop')
    public async delete(id: string, isId: boolean) {
        const { controller, handleError } = getController();

        await controller.delete(this.mockExpress.res, id);

        if (isId) {
            Expect(this.mockWorkshopsService.delete).toHaveBeenCalledWith(id).exactly(1).times;
            Expect(this.mockExpress.res.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockExpress.res.json).toHaveBeenCalledWith(Any).exactly(1).times;
        } else {
            Expect(handleError).toHaveBeenCalledWith(Any, 'Error in WorkshopsController.delete(): ', Any, HttpStatus.BAD_REQUEST);
            Expect(this.mockWorkshopsService.delete).not.toHaveBeenCalled();

            // Because we "stubbed" the handleError, res.status never gets called
            Expect(this.mockExpress.res.status).not.toHaveBeenCalled();
        }
    }

}
