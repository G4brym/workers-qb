import { Query } from './tools'
import { QueryBuilder } from './Builder'
import {
  DefaultReturnObject,
  Delete,
  DeleteReturning,
  DeleteWithoutReturning,
  Insert,
  InsertMultiple,
  InsertOne,
  InsertWithoutReturning,
  RawQuery,
  RawQueryFetchAll,
  RawQueryFetchOne,
  RawQueryWithoutFetching,
  SelectAll,
  SelectOne,
  Update,
  UpdateReturning,
  UpdateWithoutReturning,
} from './interfaces'

export class Transaction<QB extends QueryBuilder<any>> {
  public qb: QB

  public constructor(qb: QB) {
    this.qb = qb
  }

  setDebugger(state: boolean) {
    return this.qb.setDebugger(state)
  }

  async execute(query: Query) {
    return this.qb.execute(query)
  }

  async batchExecute(queryArray: Query[]) {
    return this.qb.batchExecute(queryArray)
  }

  async commitTransaction(): Promise<void> {
    await new Query((q) => this.execute(q), 'COMMIT').execute()
  }

  async rollbackTransaction(): Promise<void> {
    await new Query((q) => this.execute(q), 'ROLLBACK').execute()
  }

  createTable<GenericResult = undefined>(params: { tableName: string; schema: string; ifNotExists?: boolean }) {
    return this.qb.createTable<GenericResult>(params)
  }

  dropTable<GenericResult = undefined>(params: { tableName: string; ifExists?: boolean }) {
    return this.qb.dropTable<GenericResult>(params)
  }

  fetchOne<GenericResult = DefaultReturnObject>(params: SelectOne) {
    return this.qb.fetchOne<GenericResult>(params)
  }

  fetchAll<GenericResult = DefaultReturnObject>(params: SelectAll) {
    return this.qb.fetchAll<GenericResult>(params)
  }

  raw<GenericResult = DefaultReturnObject>(
    params: RawQuery | RawQueryFetchOne | RawQueryFetchAll | RawQueryWithoutFetching
  ) {
    return this.qb.raw<GenericResult>(params)
  }

  insert<GenericResult = DefaultReturnObject>(params: Insert | InsertOne | InsertMultiple | InsertWithoutReturning) {
    return this.qb.insert<GenericResult>(params)
  }

  update<GenericResult = DefaultReturnObject>(params: Update | UpdateReturning | UpdateWithoutReturning) {
    return this.qb.update<GenericResult>(params)
  }

  delete<GenericResult = DefaultReturnObject>(params: Delete | DeleteReturning | DeleteWithoutReturning) {
    return this.qb.delete<GenericResult>(params)
  }
}
