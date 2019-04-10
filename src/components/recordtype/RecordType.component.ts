import { Injectable } from '@nestjs/common'
import { SalesforceService } from '../salesforce/new-salesforce.component'
import { SFQ } from '../../util/salesforce'

@Injectable()
export class RecordTypeService {
  private queryFn: <T>(x: string) => Promise<T[]>
  private baseQuery = new SFQ('RecordType').select('Id')

  /** simple cache for results so that we don't have to re-request */
  private map: { [DeveloperName: string]: string } = {}

  /**
   * Returns the Id of a RecordType given the DeveloperName
   * @param developerName the DeveloperName field of the RecordType
   */
  async get(developerName: string) {
    if (!this.map[developerName]) {
      const v = await this.baseQuery
        .where(`DeveloperName = '${developerName}'`)
        .query(this.queryFn)

      if (v[0]) this.map[developerName] = v[0].Id
    }

    return this.map[developerName]
  }

  constructor(private sfService: SalesforceService) {
    this.queryFn = this.sfService.query.bind(this.sfService)
  }
}
