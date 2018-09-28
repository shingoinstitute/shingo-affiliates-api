import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common'
import { SupportService } from '../../components'
import { Refresh, ArrayParam, StringParam, User } from '../../decorators'
import { RequiredValidator, SalesforceIdValidator } from '../../validators'
import { missingParam, portalRoles } from '../../util'
import { AuthUser, AnonymousAuthGuard } from '../../guards/auth.guard'

/**
 * @desc Controller of the REST API logic for Support Pages
 *
 * @export
 * @class SupportController
 */
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  private getRoles(user: AuthUser | undefined) {
    return [
      ...((user && portalRoles(user).map(r => r.name! + 's')) || []),
      'Anonymous',
    ]
  }

  @Get()
  @UseGuards(AnonymousAuthGuard)
  readAll(
    @User() user: AuthUser | undefined,
    @Refresh() refresh: boolean | undefined,
  ) {
    return this.supportService.getAll(this.getRoles(user), refresh)
  }

  @Get('/category/:name')
  @UseGuards(AnonymousAuthGuard)
  readCategory(
    @User() user: AuthUser | undefined,
    @Param('name') category: string,
    @Refresh() refresh: boolean | undefined,
  ) {
    return this.supportService
      .getAll(this.getRoles(user), refresh)
      .then(pages =>
        pages.filter(
          page => page.Category__c.toLowerCase() === category.toLowerCase(),
        ),
      )
  }

  /**
   * ### GET: /support/describe
   * Describes Support_Page__c
   *
   * @param refresh Force cache refresh
   */
  @Get('/describe')
  describe(@Refresh() refresh: boolean | undefined) {
    return this.supportService.describe(refresh)
  }

  @Get('/search')
  @UseGuards(AnonymousAuthGuard)
  search(
    @User() user: AuthUser | undefined,
    @StringParam('search', new RequiredValidator(missingParam('search')))
    search: string,
    @ArrayParam('retrieve', new RequiredValidator(missingParam('retrieve')))
    retrieve: string[],
    @Refresh() refresh: boolean | undefined,
  ) {
    return this.supportService.search(
      search,
      retrieve,
      this.getRoles(user),
      refresh,
    )
  }

  @Get('/:id')
  @UseGuards(AnonymousAuthGuard)
  async read(
    @User() user: AuthUser | undefined,
    @Param('id', SalesforceIdValidator) id: string,
    @Refresh() refresh: boolean | undefined,
  ) {
    const result = await this.supportService.get(
      id,
      this.getRoles(user),
      refresh,
    )
    if (typeof result === 'undefined') {
      // semantically, we really should throw a ForbiddenException, but a 404 doesn't leak information (that the item exists)
      throw new NotFoundException(`Support Page with Id ${id} not found`)
    }
    return result
  }
}
