export function createPermissions (denied = []) {
  const deniedSet = new Set(denied)

  return {
    has (permission) {
      return !deniedSet.has(permission)
    }
  }
}
