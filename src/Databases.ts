import {QueryBuilder} from "./Builder";
import {FetchTypes} from "./enums";

export class D1QB extends QueryBuilder {
  private db: any;
  constructor(db: any) {
    super();
    this.db = db;
  }

  async execute(params: {query: String, arguments?: (string | number | boolean | null)[], fetchType?: FetchTypes}): Promise<any> {
    let stmt = this.db.prepare(params.query)

    if (params.arguments) {
      stmt = stmt.bind(...params.arguments)
    }

    if (params.fetchType === FetchTypes.ONE) {
      return stmt.first()
    } else if (params.fetchType === FetchTypes.ALL) {
      return stmt.all()
    }

    return stmt.run()
  }
}
