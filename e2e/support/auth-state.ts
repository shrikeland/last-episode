import * as path from 'path'

/**
 * Sessions written by tests/setup/auth.setup.ts (project `setup`) and read via `storageState`.
 * e2e/.auth/ is gitignored — the files hold live session cookies.
 */
export const AUTH_DIR = path.join(__dirname, '..', '.auth')
export const USER_STATE = path.join(AUTH_DIR, 'user.json')
export const FRIEND_STATE = path.join(AUTH_DIR, 'friend.json')
