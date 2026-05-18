const KEY = 'unixcrm.selectedBoardId'

export function getStoredBoardId(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setStoredBoardId(id: string | null): void {
  try {
    if (id) sessionStorage.setItem(KEY, id)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
