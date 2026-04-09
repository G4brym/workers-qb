import { describe, expect, it } from 'vitest'
import { Migration, PGQB } from '../../src'

/**
 * A mock pg client that captures the last query sent to it.
 */
function makeMockPgClient() {
  let lastQuery: { text: string; values?: any[] } | null = null
  const queryHistory: Array<{ text: string; values?: any[] }> = []

  const client = {
    query(params: { text: string; values?: any[] }) {
      lastQuery = params
      queryHistory.push(params)

      if (params.text.includes('SELECT * FROM migrations')) {
        return Promise.resolve({ command: 'SELECT', oid: null, rowCount: 0, rows: [] })
      }

      return Promise.resolve({ command: 'OK', oid: null, rowCount: 0, rows: [] })
    },
    getLastQuery() {
      return lastQuery
    },
    getQueryHistory() {
      return queryHistory
    },
  }
  return client
}

describe('PGQB parameter placeholder conversion', () => {
  it('converts a single bare ? placeholder to $1', async () => {
    const client = makeMockPgClient()
    const qb = new PGQB(client)

    await qb
      .fetchAll({
        tableName: 'users',
        where: { conditions: 'id = ?', params: [42] },
      })
      .execute()

    const lastQuery = client.getLastQuery()
    expect(lastQuery?.text).toBe('SELECT * FROM users WHERE id = $1')
    expect(lastQuery?.values).toEqual([42])
  })

  it('converts multiple bare ? placeholders to $1, $2, ...', async () => {
    const client = makeMockPgClient()
    const qb = new PGQB(client)

    await qb
      .fetchAll({
        tableName: 'users',
        where: { conditions: ['id = ?', 'status = ?'], params: [42, 'active'] },
      })
      .execute()

    const lastQuery = client.getLastQuery()
    expect(lastQuery?.text).toBe('SELECT * FROM users WHERE (id = $1) AND (status = $2)')
    expect(lastQuery?.values).toEqual([42, 'active'])
  })

  it('converts numbered ?1, ?2 to $1, $2 (UPDATE with WHERE)', async () => {
    const client = makeMockPgClient()
    const qb = new PGQB(client)

    await qb
      .update({
        tableName: 'users',
        where: { conditions: 'id = ?1', params: [42] },
        data: { name: 'Alice' },
      })
      .execute()

    const lastQuery = client.getLastQuery()
    expect(lastQuery?.text).toContain('SET name = $2')
    expect(lastQuery?.text).toContain('WHERE id = $1')
    expect(lastQuery?.text).not.toContain('?')
    expect(lastQuery?.values).toEqual([42, 'Alice'])
  })

  it('SelectBuilder where() chain produces $1, $2 in generated PG query', async () => {
    const client = makeMockPgClient()
    const qb = new PGQB(client)

    await qb.select('users').where('id = ?', 42).where('active = ?', true).execute()

    const lastQuery = client.getLastQuery()
    expect(lastQuery?.text).toBe('SELECT * FROM users WHERE (id = $1) AND (active = $2)')
    expect(lastQuery?.values).toEqual([42, true])
  })

  it('passes through a query with no placeholders unchanged', async () => {
    const client = makeMockPgClient()
    const qb = new PGQB(client)

    await qb.fetchAll({ tableName: 'users' }).execute()

    const lastQuery = client.getLastQuery()
    expect(lastQuery?.text).toBe('SELECT * FROM users')
    expect(lastQuery?.values).toEqual([])
  })

  it('uses PostgreSQL-compatible schema when initializing migrations', async () => {
    const client = makeMockPgClient()
    const qb = new PGQB(client)

    await qb.migrations({ migrations: [] }).initialize()

    const lastQuery = client.getLastQuery()
    expect(lastQuery?.text).toContain('SERIAL PRIMARY KEY')
    expect(lastQuery?.text).not.toContain('AUTOINCREMENT')
  })

  it('applies migrations with PostgreSQL-compatible tracking queries', async () => {
    const client = makeMockPgClient()
    const qb = new PGQB(client)
    const migrations: Migration[] = [
      {
        name: '0001_create_users_table.sql',
        sql: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
      },
    ]

    const applied = await qb.migrations({ migrations }).apply()

    expect(applied).toEqual(migrations)

    const queryHistory = client.getQueryHistory()
    expect(queryHistory).toHaveLength(6)
    expect(queryHistory[0]?.text).toContain('CREATE TABLE IF NOT EXISTS migrations')
    expect(queryHistory[0]?.text).toContain('SERIAL PRIMARY KEY')
    expect(queryHistory[1]?.text).toBe('SELECT * FROM migrations ORDER BY id')
    expect(queryHistory[2]?.text).toBe('BEGIN')
    expect(queryHistory[3]?.text).toContain('CREATE TABLE users (id SERIAL PRIMARY KEY);')
    expect(queryHistory[3]?.values).toBeUndefined()
    expect(queryHistory[4]?.text).toContain('INSERT INTO migrations (name)')
    expect(queryHistory[4]?.text).toContain('values ($1);')
    expect(queryHistory[4]?.values).toEqual(['0001_create_users_table.sql'])
    expect(queryHistory[5]?.text).toBe('COMMIT')
  })

  it('does not send multi-command parameterized migration queries to PostgreSQL', async () => {
    const client = makeMockPgClient()
    const qb = new PGQB(client)
    const migrations: Migration[] = [
      {
        name: '0001_create_users_table.sql',
        sql: 'CREATE TABLE users (id SERIAL PRIMARY KEY); CREATE INDEX users_id_idx ON users (id);',
      },
    ]

    await qb.migrations({ migrations }).apply()

    const queryHistory = client.getQueryHistory()
    expect(queryHistory[3]?.text).toBe(
      'CREATE TABLE users (id SERIAL PRIMARY KEY); CREATE INDEX users_id_idx ON users (id);'
    )
    expect(queryHistory[3]?.values).toBeUndefined()
    expect(queryHistory[4]?.text).toBe('INSERT INTO migrations (name) values ($1);')
    expect(queryHistory[4]?.values).toEqual(['0001_create_users_table.sql'])
  })
})
