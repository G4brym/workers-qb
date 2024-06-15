import { FetchTypes } from './enums'
import { Primitive } from './interfaces'

export class Raw {
  public isRaw = true
  public content: any
  constructor(content: any) {
    this.content = content
  }
}

export class Query<Result = any> {
  executeMethod: (query: Query<Result>) => Promise<Result>
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
