import { D1QB } from '../../src/databases/d1'
import { FetchTypes } from '../../src/enums'
import Database from 'better-sqlite3' // Changed import

// Helper function to extract the actual value from SQLite's single-column result
const getResultValue = (obj: any) => obj[Object.keys(obj)[0]];

describe('D1QB JSON Functions Integration Tests with better-sqlite3', () => {
  let qb: D1QB;
  let db: Database.Database; // Type for better-sqlite3 Database instance

  beforeAll(() => {
    db = new Database(':memory:'); // Initialize in-memory SQLite database

    // Create a D1-like wrapper around the better-sqlite3 Database instance
    const d1LikeDb = {
      prepare: (query: string) => {
        const stmt = db.prepare(query);
        return {
          bind: (...args: any[]) => {
            // better-sqlite3's bind returns the statement, so we chain calls.
            // The D1QB execute method expects an object with all/run methods.
            return {
              all: async () => {
                // D1's .all() returns an object with results, meta, success.
                // better-sqlite3's .all() directly returns the array of results.
                try {
                  const results = stmt.all(...args);
                  return {
                    results: results,
                    success: true,
                    meta: { changes: db.changes(), last_row_id: db.lastInsertRowid }, // Approximate D1 meta
                  };
                } catch (e:any) {
                  return { success: false, meta: {}, error: e.message }
                }
              },
              run: async () => {
                // D1's .run() returns an object with meta, success.
                // better-sqlite3's .run() returns an info object.
                try {
                  const info = stmt.run(...args);
                  return {
                    success: true,
                    meta: { changes: info.changes, last_row_id: info.lastInsertRowid },
                  };
                } catch (e:any) {
                  return { success: false, meta: {}, error: e.message }
                }
              },
            };
          },
        };
      },
      batch: async (statements: any[]) => {
        // D1 batch returns an array of D1Result-like objects
        // better-sqlite3 can run multiple statements using db.exec or by looping
        const results: any[] = [];
        db.transaction(() => {
            for (const stmtObj of statements) {
                // This is a simplified mock for batch, assuming statements are pre-bound if needed
                // or are simple strings. D1QB's current batchExecute pre-binds.
                // The `stmtObj` here would be the object returned by `db.prepare().bind()` from D1QB's perspective.
                // However, D1QB's batchExecute prepares and binds, then expects to call `all()` or `run()`
                // on each statement. The D1 `batch` method takes an array of *statements* (already prepared).
                // This mock needs to align with how D1QB structures `Query` objects for batching.

                // Let's assume `stmtObj` is a D1-like statement object from qb.db.prepare()
                // This part needs careful implementation if we want to test batching through D1QB.
                // For now, let's return a generic success for each.
                // A more accurate batch mock:
                try {
                    // This is tricky because D1QB's `batchExecute` calls `this.db.batch(statements)`
                    // where `statements` are an array of objects that should be executable.
                    // `better-sqlite3` doesn't have a direct `batch` method that takes prepared statements
                    // in the same way D1 does. It has `db.transaction` for atomicity.
                    // The `d1LikeDb.prepare().bind()` structure above is for single statements.
                    // We'll assume for now that the D1QB batch logic correctly maps to individual `run` or `all` calls
                    // if `this.db.batch` was not native. Since `this.db.batch` IS being called, this mock needs to handle it.

                    // This mock is for the D1 `db.batch(listOfStatements)` call.
                    // Each item in `listOfStatements` is a D1 prepared statement.
                    // We need to execute it.
                    // This part is still simplified.
                    const prepared = db.prepare(stmtObj.query); // stmtObj is Query from D1QB
                    if (stmtObj.fetchType === FetchTypes.ONE || stmtObj.fetchType === FetchTypes.ALL) {
                        const res = prepared.all(...(stmtObj.arguments || []));
                        results.push({ results: stmtObj.fetchType === FetchTypes.ONE ? res[0] : res, success: true, meta: {}});
                    } else {
                        const info = prepared.run(...(stmtObj.arguments || []));
                        results.push({ success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } });
                    }
                } catch (e:any) {
                    results.push({ success: false, meta:{}, error: e.message });
                }
            }
        })();
        return results;
      }
    };
    qb = new D1QB(d1LikeDb as any);
  });

  afterAll(() => {
    db.close(); // Close the database connection
  });

  // Test for json() - SQLite's json() function returns JSON text.
  test('json() should correctly wrap a JSON string', async () => {
    const testJson = { key: 'value', number: 123 };
    const stringifiedJson = JSON.stringify(testJson);
    const result = await qb.json(stringifiedJson);
    expect(result.success).toBe(true);
    // SQLite json() function called as `json(?)` will validate and return the JSON string.
    expect(getResultValue(result.results)).toBe(stringifiedJson);
  });

  // Test for json_array()
  test('json_array() should create a JSON array string', async () => {
    const result = await qb.json_array(1, "test", null, JSON.stringify({ a: 1 }));
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe('[1,"test",null,{"a":1}]');
  });

  // Test for json_array_length()
  test('json_array_length() should return the length of a JSON array', async () => {
    const arr = [1, 2, 3, {a: 4}];
    const stringifiedArr = JSON.stringify(arr);
    const result = await qb.json_array_length(stringifiedArr);
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe(arr.length);
  });

  test('json_array_length() with path should return length of nested array', async () => {
    const obj = { data: [1,2,3,4,5] };
    const stringifiedObj = JSON.stringify(obj);
    const result = await qb.json_array_length(stringifiedObj, '$.data');
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe(5);
  });

  // Test for json_extract()
  test('json_extract() should extract data from JSON', async () => {
    const data = { user: { id: 1, name: 'John Doe' }, status: 'active', tags: ['dev', 'test'] };
    const stringifiedData = JSON.stringify(data);

    let result = await qb.json_extract(stringifiedData, '$.user.name');
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe('John Doe');

    result = await qb.json_extract(stringifiedData, '$.user.id');
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe(1);

    result = await qb.json_extract(stringifiedData, '$.tags[1]');
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe('test');

    // Extracting a whole object/array
    result = await qb.json_extract(stringifiedData, '$.user');
    expect(result.success).toBe(true);
    expect(JSON.parse(getResultValue(result.results))).toEqual({ id: 1, name: 'John Doe' });
  });

  // Test for json_object() - SQLite's json_object returns a JSON object string.
  test('json_object() should create a JSON object string', async () => {
    const result = await qb.json_object('name', 'Jane Doe', 'age', 30, 'active', true, 'tags', JSON.stringify(['a','b']));
    expect(result.success).toBe(true);
    const expected = { name: "Jane Doe", age: 30, active: true, tags: ["a","b"] };
    expect(JSON.parse(getResultValue(result.results))).toEqual(expected);
  });

  // Test for json_type()
  describe('json_type()', () => {
    const data = {
      str: "hello",
      num: 123.45,
      int: 123,
      arr: [1, 2],
      obj: { a: 1 },
      boolTrue: true,
      boolFalse: false,
      nullVal: null
    };
    const stringifiedData = JSON.stringify(data);

    test.each([
      ['$.str', 'text'],
      ['$.num', 'real'],
      ['$.int', 'integer'],
      ['$.arr', 'array'],
      ['$.obj', 'object'],
      ['$.boolTrue', 'true'], // SQLite returns 'true'/'false' for booleans
      ['$.boolFalse', 'false'],
      ['$.nullVal', 'null'],
    ])('should return type for path %s as %s', async (path, expectedType) => {
      const result = await qb.json_type(stringifiedData, path);
      expect(result.success).toBe(true);
      expect(getResultValue(result.results)).toBe(expectedType);
    });
     test('should return type of root if no path', async () => {
      const result = await qb.json_type(stringifiedData);
      expect(result.success).toBe(true);
      expect(getResultValue(result.results)).toBe('object');
    });
  });

  // Test for json_valid()
  test('json_valid() should check if JSON is valid', async () => {
    const validJson = '{"key": "value"}';
    const invalidJson = '{"key": "value"'; // Missing closing brace

    let result = await qb.json_valid(validJson);
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe(1); // SQLite returns 1 for true

    result = await qb.json_valid(invalidJson);
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe(0); // SQLite returns 0 for false
  });

  // Test for json_quote() - quotes strings, numbers become JSON numbers (not strings)
  test('json_quote() should quote a JSON value appropriately', async () => {
    let result = await qb.json_quote("hello"); // string
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe('"hello"');

    result = await qb.json_quote(123); // number
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe(123); // SQLite json_quote on number returns number

    result = await qb.json_quote(null); // null
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe('null'); // SQLite json_quote on null returns 'null' string literal
  });


  // Tests for functions that modify JSON. These will test the SQL string result.
  // json_insert, json_replace, json_set, json_remove
  describe('JSON modification functions', () => {
    const initialJson = '{"name":"John","age":30,"address":{"street":"123 Main","city":"Anytown"},"tags":["dev","qa"]}';

    test('json_insert() should insert values into JSON string', async () => {
      // Insert a new key-value pair into the address object
      let result = await qb.json_insert(initialJson, '$.address.zip', '12345');
      expect(result.success).toBe(true);
      let modified = JSON.parse(getResultValue(result.results));
      expect(modified.address.zip).toBe('12345');

      // Insert into an array (at index 1)
      result = await qb.json_insert(initialJson, '$.tags[1]', 'uat');
      expect(result.success).toBe(true);
      modified = JSON.parse(getResultValue(result.results));
      expect(modified.tags).toEqual(['dev', 'uat', 'qa']);
    });

    test('json_replace() should replace values in JSON string', async () => {
      // Replace existing value
      let result = await qb.json_replace(initialJson, '$.age', 31);
      expect(result.success).toBe(true);
      let modified = JSON.parse(getResultValue(result.results));
      expect(modified.age).toBe(31);

      // Try to replace non-existing, should not change
      result = await qb.json_replace(initialJson, '$.nonExistentKey', 'newValue');
      expect(result.success).toBe(true);
      modified = JSON.parse(getResultValue(result.results));
      expect(modified).toEqual(JSON.parse(initialJson)); // No change
    });

    test('json_set() should set (update or insert) values in JSON string', async () => {
      // Update existing value
      let result = await qb.json_set(initialJson, '$.age', 32);
      expect(result.success).toBe(true);
      let modified = JSON.parse(getResultValue(result.results));
      expect(modified.age).toBe(32);

      // Insert new key-value pair
      result = await qb.json_set(initialJson, '$.occupation', 'Engineer');
      expect(result.success).toBe(true);
      modified = JSON.parse(getResultValue(result.results));
      expect(modified.occupation).toBe('Engineer');

      // Set value in a nested path (creates objects if not exist)
      result = await qb.json_set(initialJson, '$.vehicle.type', 'car');
      expect(result.success).toBe(true);
      modified = JSON.parse(getResultValue(result.results));
      expect(modified.vehicle.type).toBe('car');
    });

    test('json_remove() should remove elements from JSON string', async () => {
      // Remove a key-value pair
      let result = await qb.json_remove(initialJson, '$.address.city');
      expect(result.success).toBe(true);
      let modified = JSON.parse(getResultValue(result.results));
      expect(modified.address.city).toBeUndefined();
      expect(modified.address.street).toBe("123 Main");

      // Remove an array element
      result = await qb.json_remove(initialJson, '$.tags[0]');
      expect(result.success).toBe(true);
      modified = JSON.parse(getResultValue(result.results));
      expect(modified.tags).toEqual(['qa']);
    });

    test('json_patch() should apply a JSON patch to a JSON string', async () => {
      const doc = '{"a": 1, "b": 2}';
      const patch = '{"op": "add", "path": "/c", "value": 3}'; // This is not a valid JSON Patch string by itself for json_patch
      // SQLite's json_patch expects a JSON object (the patch itself) as the second argument.
      const validPatchObject = { "a": 6, "c": 7 }; // This is how SQLite json_patch works, it's a merge patch essentially

      const result = await qb.json_patch(doc, JSON.stringify(validPatchObject));
      expect(result.success).toBe(true);
      const modified = JSON.parse(getResultValue(result.results));
      expect(modified).toEqual({ "a": 6, "b": 2, "c": 7 });
    });
  });

  // json_group_array, json_each, json_tree require table context or more complex setup
  // For json_group_array, we'd need a table with rows to group.
  // For json_each/json_tree, the results are multiple rows.
  // The D1QB methods are currently set to FetchTypes.ONE for these, which needs adjustment.

  describe('JSON table functions (json_each, json_tree)', () => {
    // Note: D1QB methods for json_each/json_tree currently use FetchTypes.ONE.
    // For proper testing, these should ideally use FetchTypes.ALL or be iterable.
    // The mock needs to be adjusted if we change D1QB to return ALL for these.
    // For now, we test with FetchTypes.ONE, which means only the first row of output is returned.

    const complexJson = '{"a":1,"b":{"c":[2,3],"d":"foo"},"e":null}';

    test('json_each() should iterate over JSON (first item)', async () => {
      // This will only get the first emitted row by json_each due to FetchTypes.ONE in D1QB
      const result = await qb.json_each(complexJson);
      expect(result.success).toBe(true);
      // Example: first item might be { key: 'a', value: 1, type: 'integer', ... }
      // The exact structure of `result.results` depends on how `better-sqlite3` returns it for `SELECT * FROM json_each(?)`
      // and how our D1 wrapper processes it. Assuming it's an object for the first row.
      expect(result.results).toHaveProperty('key');
      expect(result.results).toHaveProperty('value');
      expect(result.results).toHaveProperty('type');
    });

    test('json_tree() should recursively iterate over JSON (first item)', async () => {
      const result = await qb.json_tree(complexJson, '$.b');
      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('key');
      expect(result.results).toHaveProperty('value');
      expect(result.results).toHaveProperty('type');
    });
  });

  // json_group_array is an aggregate function.
  // It's hard to test meaningfully without a table and GROUP BY clause.
  // A direct call like `SELECT json_group_array(?)` is not typical.
  test('json_group_array() (direct call, limited test)', async () => {
    // SQLite's json_group_array expects values, not a pre-formed JSON string.
    // Calling it with a single value results in an array with that one value.
    const result = await qb.json_group_array(123);
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe("[123]");

    // If it were to operate on a column in a SELECT statement, it would aggregate values from multiple rows.
    // e.g. db.exec("CREATE TABLE foo (bar INT); INSERT INTO foo VALUES (1),(2),(3);");
    // const query = "SELECT json_group_array(bar) as grouped FROM foo;"
    // This is beyond the scope of a simple qb.json_group_array(value) call.
  });

});
