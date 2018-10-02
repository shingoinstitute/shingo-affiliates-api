export class EnsureRoleServiceMock {
  async init() {
    return
  }

  static facilitatorId = 0
  static affiliateId = 1

  get facilitatorId() {
    return EnsureRoleServiceMock.facilitatorId
  }

  get affiliateId() {
    return EnsureRoleServiceMock.affiliateId
  }
}
