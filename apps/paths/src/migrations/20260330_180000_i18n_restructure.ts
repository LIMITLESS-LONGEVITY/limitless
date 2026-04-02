import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * i18n Data Migration — Copy existing English content to locale tables
 *
 * PREREQUISITES:
 * 1. Enable localization in payload.config.ts (already done in this commit)
 * 2. Run `pnpm payload migrate:create` to auto-generate the schema migration
 *    that creates `{collection}_locales` tables and moves localized columns.
 *    Payload names this migration automatically — it must run BEFORE this one.
 * 3. Run `pnpm payload migrate` to execute both migrations in order.
 *
 * WHAT THIS MIGRATION DOES:
 * After Payload's auto-generated schema migration creates the locale tables
 * and moves localized columns out of the main tables, this migration ensures
 * existing English data is properly inserted into the new locale rows.
 *
 * If Payload's auto-migration already copies data (it typically does for
 * columns it moves), this migration acts as a safety net / no-op for those
 * rows via INSERT ... ON CONFLICT DO NOTHING.
 *
 * COLLECTIONS AFFECTED:
 * - courses: title, description
 * - modules: title, description
 * - lessons: title, content, resources (array — title inside _locales)
 * - articles: title, excerpt, content
 * - categories: title
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Safety net: ensure locale rows exist for all existing English content.
  // Payload's own schema migration typically handles this, but if any rows
  // were missed, these INSERTs fill the gap.
  //
  // NOTE: The exact column names in _locales tables depend on what Payload
  // generates. You may need to adjust column names after running
  // `pnpm payload migrate:create` and inspecting the generated migration.
  //
  // Example pattern (uncomment and adjust after schema migration exists):
  //
  // await db.execute(sql`
  //   INSERT INTO courses_locales (id, _locale, _parent_id, title, description)
  //   SELECT nextval('courses_locales_id_seq'), 'en', id, title, description
  //   FROM courses
  //   WHERE id NOT IN (
  //     SELECT _parent_id FROM courses_locales WHERE _locale = 'en'
  //   )
  // `)
  //
  // Repeat for: modules, lessons, articles, categories

  // Intentional no-op until the Payload schema migration is generated.
  // Run `pnpm payload migrate:create` first, then uncomment the SQL above.
  await db.execute(sql`SELECT 1`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Down migration: copy English locale data back to main tables.
  // This is only needed if you disable localization and revert the schema.
  //
  // Example pattern:
  // await db.execute(sql`
  //   UPDATE courses SET title = cl.title, description = cl.description
  //   FROM courses_locales cl
  //   WHERE cl._parent_id = courses.id AND cl._locale = 'en'
  // `)
  await db.execute(sql`SELECT 1`)
}
