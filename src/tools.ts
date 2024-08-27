import { FetchTypes } from './enums'
import { CountResult, Primitive } from './interfaces'

export class Raw {
  public isRaw = true
  public content: any
  constructor(content: any) {
    this.content = content
  }
}

export class Query<Result = any> {
  public executeMethod: (query: Query<Result>) => Promise<Result>
  public query: string
  public arguments?: Primitive[]
  public fetchType?: FetchTypes

  constructor(
    executeMethod: (query: Query<Result>) => Promise<Result>,
    query: string,
    args?: Primitive[],
    fetchType?: FetchTypes
  ) {
    this.executeMethod = executeMethod
    this.query = query
    this.arguments = args
    this.fetchType = fetchType
  }

  async execute(): Promise<Result> {
    return this.executeMethod(this)
  }
}

export class QueryWithExtra<GenericResultWrapper, Result = any> extends Query<Result> {
  private countQuery: string

  constructor(
    executeMethod: (query: Query<Result>) => Promise<Result>,
    query: string,
    countQuery: string,
    args?: Primitive[],
    fetchType?: FetchTypes
  ) {
    super(executeMethod, query, args, fetchType)
    this.countQuery = countQuery
  }

  async count(): Promise<CountResult<GenericResultWrapper>> {
    return this.executeMethod(
      new Query(this.executeMethod, this.countQuery, this.arguments, FetchTypes.ONE)
    ) as Promise<CountResult<GenericResultWrapper>>
  }
}
