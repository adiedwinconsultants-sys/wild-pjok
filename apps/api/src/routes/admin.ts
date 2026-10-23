import type { AdminUser, Teacher } from '@pjok/shared'
import { adminUserUpdateSchema, adminUsersQuerySchema } from '@pjok/shared'
import { and, count, desc, eq, getTableColumns, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import type { users as usersTable } from '../db/schema'
import { classes, users } from '../db/schema'
import { AppError } from '../lib/errors'
import { ok, paginationMeta, parseBody, parseParam, parseQuery } from '../lib/http'
import { nowIso } from '../lib/time'
import { requireAuth, requireRole } from '../middleware/auth'
import type { AppBindings } from '../types'

type UserRow = typeof usersTable.$inferSelect

export const adminRoutes = new Hono<AppBindings>()

adminRoutes.use('*', requireAuth, requireRole('superadmin'))

adminRoutes.get('/users', async (c) => {
  const db = c.get('db')
  const query = parseQuery(c, adminUsersQuerySchema)
  const filters = []
  if (query.q) {
    const term = query.q.toLowerCase()
    filters.push(
      sql`(instr(lower(${users.name}), ${term}) > 0 or instr(lower(${users.email}), ${term}) > 0)`,
    )
  }
  if (query.role) filters.push(eq(users.role, query.role))
  const where = filters.length > 0 ? and(...filters) : undefined

  const offset = (query.page - 1) * query.perPage
  const rows = await db
    .select({
      ...getTableColumns(users),
      classCount: sql<number>`(select count(*) from ${classes} where ${classes.teacherId} = ${users.id})`,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(query.perPage)
    .offset(offset)

  const totalRows = await db.select({ total: count() }).from(users).where(where)
  const total = totalRows[0]?.total ?? 0

  const data: AdminUser[] = rows.map((row) => ({
    ...toPublicUser(row),
    classCount: Number(row.classCount),
  }))

  return ok(c, data, paginationMeta(query.page, query.perPage, total))
})

adminRoutes.patch('/users/:id', async (c) => {
  const db = c.get('db')
  const id = parseParam(c, 'id')
  const body = await parseBody(c, adminUserUpdateSchema)
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  const target = rows[0]
  if (!target) {
    throw new AppError(404, 'ADMIN_USER_NOT_FOUND', 'Pengguna tidak ditemukan')
  }

  if (target.role === 'superadmin' && body.role !== 'superadmin') {
    const superadmins = await db
      .select({ total: count() })
      .from(users)
      .where(eq(users.role, 'superadmin'))
    if ((superadmins[0]?.total ?? 0) <= 1) {
      throw new AppError(
        409,
        'LAST_SUPERADMIN',
        'Superadmin terakhir tidak dapat diturunkan perannya',
      )
    }
  }

  const updated = await db
    .update(users)
    .set({ role: body.role, updatedAt: nowIso() })
    .where(eq(users.id, id))
    .returning()
  const row = updated[0]
  if (!row) {
    throw new AppError(404, 'ADMIN_USER_NOT_FOUND', 'Pengguna tidak ditemukan')
  }

  const classRows = await db
    .select({ total: count() })
    .from(classes)
    .where(eq(classes.teacherId, row.id))

  const data: AdminUser = {
    ...toPublicUser(row),
    classCount: classRows[0]?.total ?? 0,
  }
  return ok(c, data)
})

function toPublicUser(row: UserRow): Teacher {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    nip: row.nip,
    school: row.school,
    role: row.role,
    authProvider: row.authProvider,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
