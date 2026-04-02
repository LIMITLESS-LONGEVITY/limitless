/** A single menu item from the OS config `userMenu` array. */
export interface OSMenuItem {
  label: string
  href: string
  icon: string
  /** Roles allowed to see this item. Empty array = show to all. */
  roles: string[]
}

/** Shape of the response from GET /api/twin/os/config. */
export interface OSConfig {
  userMenu: OSMenuItem[]
  [key: string]: unknown
}
