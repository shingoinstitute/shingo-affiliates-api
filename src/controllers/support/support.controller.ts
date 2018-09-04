import {
    Controller,
    Get, Param, Headers, Session, Inject, BadRequestException, ForbiddenException
} from '@nestjs/common'
import { SupportService } from '../../components'
import { LoggerInstance } from 'winston'
import { SalesforceIdValidator } from '../../validators/SalesforceId.validator'

/**
 * @desc Controller of the REST API logic for Support Pages
 *
 * @export
 * @class SupportController
 */
@Controller('support')
export class SupportController {

  constructor(private supportService: SupportService, @Inject('LoggerService') private log: LoggerInstance) { }

  private getRole(session: any) {
    return session.user && session.user.role && session.user.role.name + 's' || 'Anonymous';
  }

  @Get()
  async readAll(@Session() session, @Headers('x-force-refresh') refresh = 'false') {
    const role = this.getRole(session)

    return this.supportService.getAll(role, refresh === 'true')
  }

  @Get('/category/:name')
  async readCategory(@Session() session,
                     @Param('name') category: string,
                     @Headers('x-force-refresh') refresh = 'false') {
    const role = this.getRole(session)

    return this.supportService
      .getAll(role, refresh === 'true')
      .then(pages => pages.filter(page => page.Category__c.toLowerCase() === category.toLowerCase()))
  }

  /**
   * ### GET: /support/describe
   * Describes Support_Page__c
   *
   * @param refresh Force cache refresh using header 'x-force-refresh'
   */
  @Get('/describe')
  async describe(@Headers('x-force-refresh') refresh = 'false') {
    return this.supportService.describe(refresh === 'true')
  }

  @Get('/search')
  async search(@Session() session,
               @Headers('x-search') search: string,
               @Headers('x-retrieve') retrieve: string,
               @Headers('x-force-refresh') refresh = 'false') {

    // Check for required fields
    if (!search || !retrieve) {
      throw new BadRequestException(
        `Missing parameters: ${!search ? 'x-search ' : ''}${!retrieve ? 'x-retrieve' : ''}`,
        'MISSING_PARAMETERS'
      )
    }

    if (!retrieve.includes('Restricted_To__c')) retrieve += ',Restricted_To__c';

    const role = this.getRole(session)

    return this.supportService.search(search, retrieve, role, refresh === 'true');
  }

  @Get('/:id')
  async read(@Session() session,
             @Param('id', SalesforceIdValidator) id: string,
             @Headers('x-force-refresh') refresh = 'false') {
    const role = this.getRole(session)

    const page = await this.supportService.get(id, refresh === 'true');

    if (!page.Restricted_To__c.includes(role)) {
      throw new ForbiddenException('You do not have permission to read this support page!', 'ACCESS_FORBIDDEN')
    }

    return page
  }

}
