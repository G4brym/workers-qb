import { describe, expectTypeOf, it } from 'vitest'
import { Raw } from '../../src/tools'

describe('Type safety', () => {
  it('Raw.content should be typed as string', () => {
    const raw = new Raw('CURRENT_TIMESTAMP')
    expectTypeOf(raw.content).toBeString()
    expectTypeOf(raw.content).not.toBeAny()
  })

  it('Raw constructor should only accept string', () => {
    expectTypeOf(Raw).toBeConstructibleWith('test')
    expectTypeOf(Raw).constructorParameters.toEqualTypeOf<[string]>()
  })
})
