import { describe, expect, it } from 'vitest'
import { PGQB } from '../../src'

/**
 * A mock pg client that captures the last query sent to it.
 */
function makeMockPgClient() {
  let lastQuery: { text: string; values?: any[] } | null = null

  const client = {
    query(params: { text: string; values?: any[] }) {
      lastQuery = params
      return Promise.resolve({ command: 'SELECT', oid: null, rowCount: 0, rows: [] })
    },
    getLastQuery() {
      return lastQuery
    },
  }
  return client
}

describe('PGQB parameter placeholder conversion', () => {
  it('converts bare ? placeholders to $1, $2 sequentially', async () => {
    const client = makeMockPgClient()
    const qb = new PGQB(client)

    await qb
      .fetchAll({
        tableName: 'users',
        where: { conditions: 'id = ?', params: [42] },
      })
      .execute()

    const lastQuery = client.getLastQuery()
    expect(lastQuery?.text).toContain('$1')
    expect(lastQuery?.text).not.toContain('?')
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
    expect(lastQuery?.text).toContain('$1')
    expect(lastQuery?.text).toContain('$2')
    expect(lastQuery?.text).not.toContain('?')
    expect(lastQuery?.values).toEqual([42, 'active'])
  })

  it('converts numbered ?1, ?2 to $1, $2', async () => {
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
    expect(lastQuery?.text).toContain('$1')
    expect(lastQuery?.text).toContain('$2')
    expect(lastQuery?.text).not.toContain('?')
  })

  it('SelectBuilder where() uses $1, $2 in generated PG query', async () => {
    const client = makeMockPgClient()
    const qb = new PGQB(client)

    await qb.select('users').where('id = ?', 42).where('active = ?', true).execute()

    const lastQuery = client.getLastQuery()
    expect(lastQuery?.text).toContain('$1')
    expect(lastQuery?.text).toContain('$2')
    expect(lastQuery?.text).not.toContain('?')
    expect(lastQuery?.values).toEqual([42, true])
  })
})
