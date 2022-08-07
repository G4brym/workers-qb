import {QueryBuilder} from "../src";
import {FetchTypes} from "../src/enums";

export class QuerybuilderTest extends QueryBuilder {
  async execute(params: {query: String, arguments?: (string | number | boolean | null)[], fetchType?: FetchTypes}): Promise<any> {
    return null
  }
}
