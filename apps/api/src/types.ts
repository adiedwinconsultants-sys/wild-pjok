import type { UserRole } from '@pjok/shared'
import type { Database } from './db/client'
import type { Env } from './env'

export type AuthUser = {
  id: string
  sessionId: string
  role: UserRole
  email: string
  name: string
}

export type AppBindings = {
  Bindings: Env
  Variables: {
    user: AuthUser
    env: Env
    db: Database
    requestId: string
  }
}
