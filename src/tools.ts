import { FetchTypes } from './enums'
import { CountResult, MaybeAsync, Primitive, QueryLoggerMeta, RawQuery } from './interfaces'

export class Raw {
  public isRaw = true
  public content: any
  constructor(content: any) {
    this.content = content
  }
}

export class Query<Result = any, IsAsync extends boolean = true> {
  public executeMethod: (query: Query<Result, IsAsync>) => MaybeAsync<IsAsync, Result>
  public query: string
  public arguments?: Primitive[]
  public fetchType?: FetchTypes

  constructor(
    executeMethod: (query: Query<Result, IsAsync>) => MaybeAsync<IsAsync, Result>,
    query: string,
    args?: Primitive[],
    fetchType?: FetchTypes
  ) {
    this.executeMethod = executeMethod
    this.query = trimQuery(query)
    this.arguments = args
    this.fetchType = fetchType
  }

  execute(): MaybeAsync<IsAsync, Result> {
    return this.executeMethod(this)
  }

  toObject(): RawQuery {
    return {
      query: this.query,
      args: this.arguments,
      fetchType: this.fetchType,
    }
  }
}

export class QueryWithExtra<GenericResultWrapper, Result = any, IsAsync extends boolean = true> extends Query<
  Result,
  IsAsync
> {
  private countQuery: string

  constructor(
    executeMethod: (query: Query<Result, IsAsync>) => MaybeAsync<IsAsync, Result>,
    query: string,
    countQuery: string,
    args?: Primitive[],
    fetchType?: FetchTypes
  ) {
    super(executeMethod, query, args, fetchType)
    this.countQuery = countQuery
  }

  count(): MaybeAsync<IsAsync, CountResult<GenericResultWrapper>> {
    return this.executeMethod(
      new Query(this.executeMethod, this.countQuery, this.arguments, FetchTypes.ONE)
    ) as MaybeAsync<IsAsync, CountResult<GenericResultWrapper>>
  }
}

export function trimQuery(query: string): string {
  return query.replace(/\s\s+/g, ' ')
}

export class JsonExpression {
  public isJsonExpression = true
  constructor(public readonly expression: string, public readonly bindings: Primitive[] = []) {}
}

export function json(expression: string, ...bindings: Primitive[]): JsonExpression {
  return new JsonExpression(expression, bindings);
}
