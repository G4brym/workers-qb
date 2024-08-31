import { QuerybuilderExceptionTest, QuerybuilderTest } from '../utils'

describe('Logger', () => {
  test('receive query in logger', async () => {
    const loggerMock = jest.fn()

    await new QuerybuilderTest({
      logger: loggerMock,
    })
      .fetchAll({
        tableName: 'testTable',
        fields: ['id', 'name'],
        where: {
          conditions: 'field = ?1',
          params: ['test'],
        },
      })
      .execute()

    expect(loggerMock.mock.calls).toHaveLength(1)
    expect(loggerMock.mock.calls[0][0]).toMatchObject({
      query: 'SELECT id, name FROM testTable WHERE field = ?1',
      args: ['test'],
      fetchType: 'ALL',
    })
    expect(loggerMock.mock.calls[0][1].duration >= 0).toBeTruthy()
  })

  test('receive query in logger when there is an exception', async () => {
    const loggerMock = jest.fn()

    const t = async () => {
      await new QuerybuilderExceptionTest({
        logger: loggerMock,
      })
        .fetchAll({
          tableName: 'testTable',
          fields: ['id', 'name'],
          where: {
            conditions: 'field = ?1',
            params: ['test'],
          },
        })
        .execute()
    }

    await expect(t()).rejects.toThrow('Fake db error')

    expect(loggerMock.mock.calls).toHaveLength(1)
    expect(loggerMock.mock.calls[0][0]).toMatchObject({
      query: 'SELECT id, name FROM testTable WHERE field = ?1',
      args: ['test'],
      fetchType: 'ALL',
    })
    expect(loggerMock.mock.calls[0][1].duration >= 30).toBeTruthy()
  })
})
