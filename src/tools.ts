import { FetchTypes } from './enums'
import { CountResult, Primitive, RawQuery } from './interfaces'

export class Raw {
  public isRaw = true
  public content: any
  constructor(content: any) {
    this.content = content
  }
}

export class Query<Result = any> {
  public executeMethod: (query: Query<Result>) => Promise<Result>
  public executeMethodSync: ((query: Query<Result>) => Result) | undefined
  public query: string
  public arguments?: Primitive[]
  public fetchType?: FetchTypes

  constructor(
    executeMethod: (query: Query<Result>) => Promise<Result>,
    query: string,
    args?: Primitive[],
    fetchType?: FetchTypes,
    executeMethodSync?: (query: Query<Result>) => Result
  ) {
    this.executeMethod = executeMethod
    this.query = trimQuery(query)
    this.arguments = args
    this.fetchType = fetchType
    this.executeMethodSync = executeMethodSync
  }

  async execute(): Promise<Result> {
    return this.executeMethod(this)
  }

  executeSync(): Result {
    if (this.executeMethodSync !== undefined) {
      return this.executeMethodSync(this)
    }
    throw new Error('Query was not provided with "executeSync" method')
  }

  toObject(): RawQuery {
    return {
      query: this.query,
      args: this.arguments,
      fetchType: this.fetchType,
    }
  }
}

export class QueryWithExtra<GenericResultWrapper, Result = any> extends Query<Result> {
  private countQuery: string

  constructor(
    executeMethod: (query: Query<Result>) => Promise<Result>,
    query: string,
    countQuery: string,
    args?: Primitive[],
    fetchType?: FetchTypes,
    executeMethodSync?: (query: Query<Result>) => Result
  ) {
    super(executeMethod, query, args, fetchType, executeMethodSync)
    this.countQuery = countQuery
  }

  async count(): Promise<CountResult<GenericResultWrapper>> {
    return this.executeMethod(
      new Query(this.executeMethod, this.countQuery, this.arguments, FetchTypes.ONE)
    ) as Promise<CountResult<GenericResultWrapper>>
  }

  countSync(): CountResult<GenericResultWrapper> {
    if (this.executeMethodSync === undefined) {
      throw new Error('"executeMethodSync" was not defined')
    }
    return this.executeMethodSync(
      new Query(
        async () => {
          throw new Error('async was not supposed to be called in sync context')
        },
        this.countQuery,
        this.arguments,
        FetchTypes.ONE,
        this.executeMethodSync
      )
    ) as CountResult<GenericResultWrapper>
  }
}

export function trimQuery(query: string): string {
  return query.replace(/\s\s+/g, ' ')
}
