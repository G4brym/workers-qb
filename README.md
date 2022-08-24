# workers-qb

Zero dependencies Query Builder for Cloudflare D1 Workers

This module provides a simple standardized interface while keeping the benefits and speed of using raw queries over a 
traditional ORM.

`workers-qb` is not intended to provide ORM-like functionality, rather to make it easier to interact with the database 
from code for direct SQL access using convenient wrapper methods.

Read the documentation [Here](https://workers-qb.massadas.com/)!

## Features
- [x] Zero dependencies.
- [x] Fully typed/TypeScript support
- [x] SQL Type checking with compatible IDE's
- [x] Insert/Update/Select/Delete queries
- [x] Create/drop tables
- [x] Keep where conditions simple in code
- [ ] Bulk insert/update
- [ ] Named parameters (waiting for full support in D1)

## Installation

```
npm install workers-qb
```

## Basic Usage
```ts
import { D1QB } from 'workers-qb'
const qb = new D1QB(env.DB)

const fetched = await qb.fetchOne({
    tableName: "employees",
    fields: "count(*) as count",
    where: {
      conditions: "active = ?1",
      params: [true]
    },
})

console.log(`Company has ${fetched.results.count} active employees`)
```

#### Fetching a single record

```ts
const qb = new D1QB(env.DB)

const fetched = await qb.fetchOne({
    tableName: "employees",
    fields: "count(*) as count",
    where: {
      conditions: "department = ?1",
      params: ["HQ"]
    },
})

console.log(`There are ${fetched.results.count} employees in the HR department`)
```

#### Fetching multiple records

```ts
import { OrderTypes } from 'workers-qb'
const qb = new D1QB(env.DB)

const fetched = await qb.fetchAll({
    tableName: "employees",
    fields: [
        "role",
        "count(*) as count",
    ],
    where: {
      conditions: "department = ?1",
      params: ["HR"]
    },
    groupBy: "role",
    orderBy: {
      "count": OrderTypes.DESC,
    },
})

console.log(`Roles in the HR department:`)

fetched.results.forEach((employee) => {
    console.log(`${employee.role} has ${employee.count} employees`)
})
```

#### Inserting rows

```ts
const qb = new D1QB(env.DB)

const inserted = await qb.insert({
    tableName: "employees",
    data: {
        name: "Joe",
        role: "manager",
        department: "store",
    },
    returning: "*",
})

console.log(inserted)  // This will contain the data after SQL triggers and primary keys that are automated
```

#### Updating rows

```ts
const updated = await qb.update({
    tableName: "employees",
    data: {
      role: "CEO",
      department: "HQ",
    },
    where: {
      conditions: "id = ?1",
      params: [123]
    },
})

console.log(`Lines affected in this query: ${updated.changes}`)
```

#### Deleting rows

```ts
const deleted = await qb.delete({
    tableName: "employees",
    where: {
      conditions: "id = ?1",
      params: [123]
    },
})

console.log(`Lines affected in this query: ${deleted.changes}`)
```

#### Dropping and creating tables

```ts
const created = await qb.createTable({
    tableName: "testTable",
    schema: `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    `,
    ifNotExists: true,
})


const dropped = await qb.dropTable({
    tableName: "testTable"
})
```


## Development

### Set up tools and environment

You need to have [Node.js](https://nodejs.org/en/download/) installed. Node includes npm as its default package manager.

Open the whole package folder with a good code editor, preferably [Visual Studio Code](https://code.visualstudio.com/download). Consider installing VS Code extensions [ES Lint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode).

In the VS Code top menu: **Terminal** -> **New Terminal**

### Install dependencies

Install dependencies with npm:

```bash
npm i
```

### Write your code

Write your code in **src** folder, and unit test in **test** folder.

The VS Code shortcuts for formatting of a code file are: <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>F</kbd> (Windows); <kbd>Shift</kbd> + <kbd>Option (Alt)</kbd> + <kbd>F</kbd> (MacOS); <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd> (Linux).

### Test

Test your code with Jest framework:

```bash
npm run test
```

**Note:** This project uses [husky](https://typicode.github.io/husky/), [pinst](https://github.com/typicode/pinst) and [commitlint](https://commitlint.js.org/) to automatically execute test and [lint commit message](https://www.conventionalcommits.org/) before every commit.

### Build

Build production (distribution) files in your **dist** folder:

```bash
npm run build
```

It generates CommonJS (in **dist/cjs** folder), ES Modules (in **dist/esm** folder), bundled and minified UMD (in **dist/umd** folder), as well as TypeScript declaration files (in **dist/types** folder).

### Try it before publishing

Run:

```bash
npm link
```

[npm link](https://docs.npmjs.com/cli/v6/commands/npm-link) will create a symlink in the global folder, which may be **{prefix}/lib/node_modules/workers-qb** or **C:\Users\<username>\AppData\Roaming\npm\node_modules\workers-qb**.

Create an empty folder elsewhere, you don't even need to `npm init` (to generate **package.json**). Open the folder with VS Code, open a terminal and just run:

```bash
npm link workers-qb
```

This will create a symbolic link from globally-installed workers-qb to **node_modules/** of the current folder.

You can then create a, for example, **testsql.ts** file with the content:

```ts
import { D1QB } from 'workers-qb'
const qb = new D1QB(env.DB)

console.log("Creating table...")
const created = await qb.createTable({
    tableName: "testTable",
    schema: `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    `,
    ifNotExists: true,
})
console.log(created)

console.log("Inserting rows...")
const inserted = await qb.insert({
    tableName: "testTable",
    data: {
        name: "my name",
    },
    returning: "*",
})
console.log(inserted)

console.log("Selecting rows...")
const selected = await qb.fetchAll({
    tableName: "testTable",
    fields: "*"
})
console.log(selected)
```

If you don't see any linting errors in VS Code, if you put your mouse cursor over `D1QB` and see its type, then it's all good.

Whenever you want to uninstall the globally-installed workers-qb and remove the symlink in the global folder, run:

```bash
npm uninstall workers-qb -g
```
