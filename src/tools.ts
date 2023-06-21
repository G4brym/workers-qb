import { FetchTypes } from 'enums'

export class Raw {
  public isRaw = true
  public content: any
  constructor(content: any) {
    this.content = content
  }
}

export class Query {
  executeMethod: (query: Query) => Promise<any>
  public query: string
  public arguments?: (string | number | boolean | null | Raw)[]
  public fetchType?: FetchTypes

  constructor(
    executeMethod: (query: Query) => Promise<any>,
    query: string,
    args?: (string | number | boolean | null | Raw)[],
    fetchType?: FetchTypes
  ) {
    this.executeMethod = executeMethod
    this.query = query
    this.arguments = args
    this.fetchType = fetchType
  }

  async execute(): Promise<any> {
    return this.executeMethod(this)
  }
}
