import {
    Controller,
    Get, Param, Session, Inject, ForbiddenException
} from '@nestjs/common'
import { SupportService } from '../../components'
import { LoggerInstance } from 'winston'
import { Refresh, ArrayParam, StringParam } from '../../decorators'
import { RequiredValidator, SalesforceIdValidator } from '../../validators'
import { missingParam } from '../../util'

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
  async readAll(@Session() session, @Refresh() refresh: boolean | undefined) {
    const role = this.getRole(session)

    return this.supportService.getAll(role, refresh)
  }

  @Get('/category/:name')
  async readCategory(@Session() session,
                     @Param('name') category: string,
                     @Refresh() refresh: boolean | undefined) {
    const role = this.getRole(session)

    return this.supportService
      .getAll(role, refresh)
      .then(pages => pages.filter(page => page.Category__c.toLowerCase() === category.toLowerCase()))
  }

  /**
   * ### GET: /support/describe
   * Describes Support_Page__c
   *
   * @param refresh Force cache refresh
   */
  @Get('/describe')
  async describe(@Refresh() refresh: boolean | undefined) {
    return this.supportService.describe(refresh)
  }

  @Get('/search')
  async search(@Session() session,
               @StringParam('search', new RequiredValidator(missingParam('search'))) search: string,
               @ArrayParam('retrieve', new RequiredValidator(missingParam('retrieve'))) retrieve: string[],
               @Refresh() refresh: boolean | undefined) {
    const realRetrieve = [...new Set([...retrieve, 'Restricted_To__c'])]

    const role = this.getRole(session)

    return this.supportService.search(search, realRetrieve, role, refresh);
  }

  @Get('/:id')
  async read(@Session() session,
             @Param('id', SalesforceIdValidator) id: string,
             @Refresh() refresh: boolean | undefined) {
    const role = this.getRole(session)

    const page = await this.supportService.get(id, refresh);

    if (!page.Restricted_To__c.includes(role)) {
      throw new ForbiddenException('You do not have permission to read this support page!', 'ACCESS_FORBIDDEN')
    }

    return page
  }

}
