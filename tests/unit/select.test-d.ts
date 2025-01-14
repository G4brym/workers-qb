import { describe, expectTypeOf, it } from 'vitest'
import { DefaultReturnObject } from '../../src'
import { QuerybuilderTest, QuerybuilderTestSync } from '../utils'

describe('Select builder', () => {
  it('should return a iterable if using async and lazy', async () => {
    const results = [
      (await new QuerybuilderTest().select('table').execute({ lazy: true })).results!,
      (await new QuerybuilderTest().fetchAll({ tableName: 'table', lazy: true }).execute()).results!,
    ]

    results.forEach((result) => expectTypeOf(result).toEqualTypeOf<AsyncIterable<DefaultReturnObject>>())
  })

  it('should return a list if using async and not lazy', async () => {
    const results = [
      (await new QuerybuilderTest().select('table').execute()).results!,
      (await new QuerybuilderTest().fetchAll({ tableName: 'table' }).execute()).results!,
    ]

    results.forEach((result) => expectTypeOf(result).toEqualTypeOf<DefaultReturnObject[]>())
  })

  it('should return a iterable if using sync and lazy', async () => {
    const results = [
      new QuerybuilderTestSync().select('table').execute({ lazy: true }).results!,
      new QuerybuilderTestSync().fetchAll({ tableName: 'table', lazy: true }).execute().results!,
    ]

    results.forEach((result) => expectTypeOf(result).toEqualTypeOf<Iterable<DefaultReturnObject>>())
  })

  it('should return a list if using sync and not lazy', async () => {
    const results = [
      new QuerybuilderTestSync().select('table').execute().results!,
      new QuerybuilderTestSync().fetchAll({ tableName: 'table' }).execute().results!,
    ]

    results.forEach((result) => expectTypeOf(result).toEqualTypeOf<DefaultReturnObject[]>())
  })
})
