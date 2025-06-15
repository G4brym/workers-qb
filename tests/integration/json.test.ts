import { D1QB } from '../../src/databases/d1'
import { FetchTypes } from '../../src/enums'
import { beforeAll, afterAll, describe, expect, test } from 'vitest' // Import vitest functions

// Helper function to extract the actual value from D1's single-column result
// D1 returns results typically as an object where the key is the SQL function call or alias.
// e.g. { "json_extract(?,?)": "value" } or { "my_alias": "value" }
// This helper tries to robustly get that single value.
const getResultValue = (resultField: any) => {
  if (typeof resultField === 'object' && resultField !== null) {
    const keys = Object.keys(resultField);
    if (keys.length === 1) {
      return resultField[keys[0]];
    }
  }
  // Fallback or if the structure is different (e.g. for json_each/json_tree results)
  return resultField;
};

// Environment variable set by vitest-pool-workers
declare var env: {
  DB: D1Database; // This should be the D1 binding
};

describe('D1QB JSON Functions Integration Tests with Miniflare D1', () => {
  let qb: D1QB;

  beforeAll(() => {
    // env.DB is automatically provided by the vitest-pool-workers environment
    // when configured in vitest.config.ts and wrangler.toml
    if (!env || !env.DB) {
      throw new Error(
        'D1Database (env.DB) not available. Ensure Vitest is configured with @cloudflare/vitest-pool-workers and D1 bindings.'
      );
    }
    qb = new D1QB(env.DB);
  });

  // afterAll can be used for cleanup if needed, but Miniflare's D1 is usually in-memory and resets.

  test('json() should correctly wrap a JSON string', async () => {
    const testJson = { key: 'value', number: 123 };
    const stringifiedJson = JSON.stringify(testJson);
    const result = await qb.json(stringifiedJson);
    expect(result.success).toBe(true);
    // D1 returns the result with the function call as the key, e.g., {"json(?)":"{\"key\":\"value\",\"number\":123}"}
    expect(getResultValue(result.results)).toBe(stringifiedJson);
  });

  test('json_array() should create a JSON array string', async () => {
    const result = await qb.json_array(1, "test", null, JSON.stringify({ a: 1 }));
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe('[1,"test",null,{"a":1}]');
  });

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

    result = await qb.json_extract(stringifiedData, '$.user');
    expect(result.success).toBe(true);
    // D1/SQLite json_extract on an object/array returns it as a JSON string
    expect(JSON.parse(getResultValue(result.results))).toEqual({ id: 1, name: 'John Doe' });
  });

  test('json_object() should create a JSON object string', async () => {
    const result = await qb.json_object('name', 'Jane Doe', 'age', 30, 'active', true, 'tags', JSON.stringify(['a','b']));
    expect(result.success).toBe(true);
    const expected = { name: "Jane Doe", age: 30, active: true, tags: ["a","b"] };
    expect(JSON.parse(getResultValue(result.results))).toEqual(expected);
  });

  describe('json_type()', () => {
    const data = {
      str: "hello", num: 123.45, int: 123, arr: [1, 2], obj: { a: 1 },
      boolTrue: true, boolFalse: false, nullVal: null
    };
    const stringifiedData = JSON.stringify(data);

    test.each([
      ['$.str', 'text'], ['$.num', 'real'], ['$.int', 'integer'], ['$.arr', 'array'],
      ['$.obj', 'object'], ['$.boolTrue', 'true'], ['$.boolFalse', 'false'], ['$.nullVal', 'null'],
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

  test('json_valid() should check if JSON is valid', async () => {
    const validJson = '{"key": "value"}';
    const invalidJson = '{"key": "value"';

    let result = await qb.json_valid(validJson);
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe(1);

    result = await qb.json_valid(invalidJson);
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe(0);
  });

  test('json_quote() should quote a JSON value appropriately', async () => {
    let result = await qb.json_quote("hello");
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe('"hello"');

    result = await qb.json_quote(123);
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe(123);

    result = await qb.json_quote(null);
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe('null');
  });

  describe('JSON modification functions', () => {
    const initialJson = '{"name":"John","age":30,"address":{"street":"123 Main","city":"Anytown"},"tags":["dev","qa"]}';

    test('json_insert() should insert values into JSON string', async () => {
      let result = await qb.json_insert(initialJson, '$.address.zip', '12345');
      expect(result.success).toBe(true);
      let modified = JSON.parse(getResultValue(result.results));
      expect(modified.address.zip).toBe('12345');

      result = await qb.json_insert(initialJson, '$.tags[1]', 'uat');
      expect(result.success).toBe(true);
      modified = JSON.parse(getResultValue(result.results));
      expect(modified.tags).toEqual(['dev', 'uat', 'qa']);
    });

    test('json_replace() should replace values in JSON string', async () => {
      let result = await qb.json_replace(initialJson, '$.age', 31);
      expect(result.success).toBe(true);
      let modified = JSON.parse(getResultValue(result.results));
      expect(modified.age).toBe(31);

      result = await qb.json_replace(initialJson, '$.nonExistentKey', 'newValue');
      expect(result.success).toBe(true);
      modified = JSON.parse(getResultValue(result.results));
      expect(modified).toEqual(JSON.parse(initialJson));
    });

    test('json_set() should set (update or insert) values in JSON string', async () => {
      let result = await qb.json_set(initialJson, '$.age', 32);
      expect(result.success).toBe(true);
      let modified = JSON.parse(getResultValue(result.results));
      expect(modified.age).toBe(32);

      result = await qb.json_set(initialJson, '$.occupation', 'Engineer');
      expect(result.success).toBe(true);
      modified = JSON.parse(getResultValue(result.results));
      expect(modified.occupation).toBe('Engineer');

      result = await qb.json_set(initialJson, '$.vehicle.type', 'car');
      expect(result.success).toBe(true);
      modified = JSON.parse(getResultValue(result.results));
      expect(modified.vehicle.type).toBe('car');
    });

    test('json_remove() should remove elements from JSON string', async () => {
      let result = await qb.json_remove(initialJson, '$.address.city');
      expect(result.success).toBe(true);
      let modified = JSON.parse(getResultValue(result.results));
      expect(modified.address.city).toBeUndefined();
      expect(modified.address.street).toBe("123 Main");

      result = await qb.json_remove(initialJson, '$.tags[0]');
      expect(result.success).toBe(true);
      modified = JSON.parse(getResultValue(result.results));
      expect(modified.tags).toEqual(['qa']);
    });

    test('json_patch() should apply a JSON merge patch to a JSON string', async () => {
      const doc = '{"a": 1, "b": 2}';
      const patch = '{"a": 6, "c": 7}'; // This is a merge patch

      const result = await qb.json_patch(doc, patch); // patch should be a JSON string
      expect(result.success).toBe(true);
      const modified = JSON.parse(getResultValue(result.results));
      expect(modified).toEqual({ "a": 6, "b": 2, "c": 7 });
    });
  });

  describe('JSON table functions (json_each, json_tree)', () => {
    // D1QB methods for json_each/json_tree use FetchTypes.ONE by default.
    // This means they will return only the first row/item from the iteration.
    const complexJson = '{"a":1,"b":{"c":[2,3],"d":"foo"},"e":null}';

    // To test json_each and json_tree properly for multiple rows,
    // one would typically use a raw query or modify D1QB methods
    // to use FetchTypes.ALL for these specific functions.
    // For now, these tests verify the FetchTypes.ONE behavior.

    test('json_each() should iterate over JSON (first item due to FetchTypes.ONE)', async () => {
      const result = await qb.json_each(complexJson);
      expect(result.success).toBe(true);
      // D1 `json_each` returns columns: key, value, type, atom, id, parent, fullkey, path
      // The `result.results` will be an object representing the first row.
      const firstItem = result.results; // This is already the first row object
      expect(firstItem).toHaveProperty('key');
      expect(firstItem).toHaveProperty('value');
      expect(firstItem).toHaveProperty('type');
      // Example: expect(firstItem.key).toBe('a'); expect(firstItem.value).toBe(1);
    });

    test('json_tree() should recursively iterate over JSON (first item due to FetchTypes.ONE)', async () => {
      const result = await qb.json_tree(complexJson, '$.b');
      expect(result.success).toBe(true);
      const firstNode = result.results;
      expect(firstNode).toHaveProperty('key');
      expect(firstNode).toHaveProperty('value');
      expect(firstNode).toHaveProperty('type');
      // Example: expect(firstNode.key).toBe('c'); // if '$.b' is the path
    });
  });

  test('json_group_array() (direct call, limited test)', async () => {
    // This function is an aggregate. Calling it directly like this is unusual.
    // SQLite's json_group_array expects values, not a pre-formed JSON string.
    // A single value results in an array with that one value.
    const result = await qb.json_group_array(123);
    expect(result.success).toBe(true);
    expect(getResultValue(result.results)).toBe("[123]");
  });
});
