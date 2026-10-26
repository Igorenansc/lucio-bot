export default class OwnerService {
  constructor ({ owners = [] } = {}) {
    this.owners = new Set(owners)
  }

  isOwner (userId) {
    if (!userId) return false

    return this.owners.has(String(userId))
  }
}
