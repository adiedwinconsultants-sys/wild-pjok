import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    nip: text('nip'),
    school: text('school'),
    role: text('role', { enum: ['teacher', 'admin'] })
      .notNull()
      .default('teacher'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
  }),
)

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    userAgent: text('user_agent'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    refreshUnique: uniqueIndex('sessions_refresh_unique').on(table.refreshTokenHash),
    userIndex: index('sessions_user_idx').on(table.userId),
  }),
)

export const passwordResets = sqliteTable(
  'password_resets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    tokenUnique: uniqueIndex('password_resets_token_unique').on(table.tokenHash),
    userIndex: index('password_resets_user_idx').on(table.userId),
  }),
)

export const classes = sqliteTable(
  'classes',
  {
    id: text('id').primaryKey(),
    teacherId: text('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    gradeLevel: integer('grade_level').notNull(),
    academicYear: text('academic_year').notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    uniqueClass: uniqueIndex('classes_teacher_name_year_unique').on(
      table.teacherId,
      table.name,
      table.academicYear,
    ),
    teacherIndex: index('classes_teacher_idx').on(table.teacherId),
  }),
)

export const students = sqliteTable(
  'students',
  {
    id: text('id').primaryKey(),
    teacherId: text('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: text('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    nis: text('nis').notNull(),
    sex: text('sex', { enum: ['L', 'P'] }).notNull(),
    birthDate: text('birth_date').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    uniqueNis: uniqueIndex('students_class_nis_unique').on(table.classId, table.nis),
    classIndex: index('students_class_idx').on(table.classId),
    teacherIndex: index('students_teacher_idx').on(table.teacherId),
  }),
)

export const instruments = sqliteTable(
  'instruments',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    version: integer('version').notNull(),
    group: text('group').notNull(),
    name: text('name').notNull(),
    payloadJson: text('payload_json').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    uniqueSlugVersion: uniqueIndex('instruments_slug_version_unique').on(table.slug, table.version),
    groupIndex: index('instruments_group_idx').on(table.group),
  }),
)

export const assessments = sqliteTable(
  'assessments',
  {
    id: text('id').primaryKey(),
    teacherId: text('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: text('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    instrumentId: text('instrument_id').notNull(),
    instrumentSnapshotJson: text('instrument_snapshot_json').notNull(),
    participantIdsJson: text('participant_ids_json').notNull().default('[]'),
    date: text('date').notNull(),
    status: text('status', { enum: ['draft', 'finalized', 'reopened'] })
      .notNull()
      .default('draft'),
    finalizedAt: text('finalized_at'),
    reopenedAt: text('reopened_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    teacherDateIndex: index('assessments_teacher_date_idx').on(table.teacherId, table.date),
    classIndex: index('assessments_class_idx').on(table.classId),
    instrumentIndex: index('assessments_instrument_idx').on(table.instrumentId),
  }),
)

export const assessmentScores = sqliteTable(
  'assessment_scores',
  {
    id: text('id').primaryKey(),
    assessmentId: text('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    indicatorId: text('indicator_id').notNull(),
    rawValue: real('raw_value').notNull(),
    normalizedValue: real('normalized_value').notNull(),
    kind: text('kind', { enum: ['process', 'product'] }).notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    uniqueScore: uniqueIndex('assessment_scores_unique').on(
      table.assessmentId,
      table.studentId,
      table.indicatorId,
    ),
    assessmentIndex: index('assessment_scores_assessment_idx').on(table.assessmentId),
    studentIndex: index('assessment_scores_student_idx').on(table.studentId),
  }),
)

export const assessmentResults = sqliteTable(
  'assessment_results',
  {
    id: text('id').primaryKey(),
    assessmentId: text('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    processScore: real('process_score'),
    productScore: real('product_score'),
    finalScore: real('final_score').notNull(),
    category: text('category', {
      enum: ['sangat_baik', 'baik', 'cukup', 'perlu_bimbingan'],
    }).notNull(),
    computedAt: text('computed_at').notNull(),
  },
  (table) => ({
    uniqueResult: uniqueIndex('assessment_results_unique').on(table.assessmentId, table.studentId),
    assessmentIndex: index('assessment_results_assessment_idx').on(table.assessmentId),
  }),
)

export const assessmentFeedback = sqliteTable(
  'assessment_feedback',
  {
    id: text('id').primaryKey(),
    resultId: text('result_id')
      .notNull()
      .references(() => assessmentResults.id, { onDelete: 'cascade' }),
    note: text('note').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    resultUnique: uniqueIndex('assessment_feedback_result_unique').on(table.resultId),
  }),
)

export const exportJobs = sqliteTable(
  'export_jobs',
  {
    id: text('id').primaryKey(),
    teacherId: text('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assessmentId: text('assessment_id'),
    classId: text('class_id'),
    format: text('format', { enum: ['xlsx', 'pdf'] }).notNull(),
    status: text('status', {
      enum: ['pending', 'processing', 'completed', 'failed'],
    })
      .notNull()
      .default('pending'),
    r2Key: text('r2_key'),
    errorMessage: text('error_message'),
    createdAt: text('created_at').notNull(),
    completedAt: text('completed_at'),
  },
  (table) => ({
    teacherIndex: index('export_jobs_teacher_idx').on(table.teacherId),
    statusIndex: index('export_jobs_status_idx').on(table.status),
  }),
)

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    payloadJson: text('payload_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    entityIndex: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    actorIndex: index('audit_logs_actor_idx').on(table.actorId),
  }),
)
