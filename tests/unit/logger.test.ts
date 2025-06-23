import { describe, expect, it, vi } from 'vitest'
import { QuerybuilderExceptionTest, QuerybuilderTest } from '../utils'

describe('Logger', () => {
  it('receive query in logger', async () => {
    const loggerMock = vi.fn()

    await new QuerybuilderTest({
      logger: loggerMock,
    })
      .fetchAll({
        tableName: 'testTable',
        fields: ['id', 'name'],
        where: {
          conditions: ['field = ?1'],
          params: ['test'],
        },
      })
      .execute()

    expect(loggerMock.mock.calls).toHaveLength(1)
    // @ts-ignore
    expect(loggerMock.mock.calls[0][0]).toMatchObject({
      query: 'SELECT id, name FROM testTable WHERE field = ?1',
      args: ['test'],
      fetchType: 'ALL',
    })
    // @ts-ignore
    expect(loggerMock.mock.calls[0][1].duration >= 0).toBeTruthy()
  })

  it('receive query in logger when there is an exception', async () => {
    const loggerMock = vi.fn()

    const t = async () => {
      await new QuerybuilderExceptionTest({
        logger: loggerMock,
      })
        .fetchAll({
          tableName: 'testTable',
          fields: ['id', 'name'],
          where: {
            conditions: ['field = ?1'],
            params: ['test'],
          },
        })
        .execute()
    }

    await expect(t()).rejects.toThrow('Fake db error')

    expect(loggerMock.mock.calls).toHaveLength(1)
    // @ts-ignore
    expect(loggerMock.mock.calls[0][0]).toMatchObject({
      query: 'SELECT id, name FROM testTable WHERE field = ?1',
      args: ['test'],
      fetchType: 'ALL',
    })
    // @ts-ignore
    expect(loggerMock.mock.calls[0][1].duration >= 30).toBeTruthy()
  })
})
