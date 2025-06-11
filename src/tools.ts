import { FetchTypes } from './enums'
import { CountResult, MaybeAsync, Primitive, QueryLoggerMeta, RawQuery } from './interfaces'

export class Raw {
  public isRaw = true
  public content: any
  constructor(content: any) {
    this.content = content
  }
}

export function trimQuery(query: string): string {
  return query.replace(/\s\s+/g, ' ')
}
