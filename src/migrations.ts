import { QueryBuilder } from './builder'

export type MigrationEntry = {
  id: number
  name: string
  applied_at: Date
}

export type Migration = {
  name: string
  sql: string
}

export type MigrationOptions = {
  migrations: Array<Migration>
  tableName?: string
}

export class syncMigrationsBuilder<GenericResultWrapper> {
  _builder: QueryBuilder<GenericResultWrapper, false>
  _migrations: Array<Migration>
  _tableName: string

  constructor(options: MigrationOptions, builder: QueryBuilder<GenericResultWrapper, false>) {
    this._tableName = options.tableName || 'migrations'
    this._migrations = options.migrations
    this._builder = builder
  }

  initialize(): void {
    this._builder
      .createTable({
        tableName: this._tableName,
        schema: `id         INTEGER PRIMARY KEY AUTOINCREMENT,
               name       TEXT UNIQUE,
               applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL`,
        ifNotExists: true,
      })
      .execute()

    return
  }

  getApplied(): Array<MigrationEntry> {
    this.initialize()
    const result = this._builder
      .fetchAll<MigrationEntry>({
        tableName: this._tableName,
        orderBy: 'id',
      })
      .execute()
    return result.results || []
  }

  getUnapplied(): Array<Migration> {
    const appliedMigrations = this.getApplied().map((migration) => {
      return migration.name
    })

    const unappliedMigrations: Array<Migration> = []

    for (const migration of this._migrations) {
      if (!appliedMigrations.includes(migration.name)) {
        unappliedMigrations.push(migration)
      }
    }

    return unappliedMigrations
  }

  apply(): Array<Migration> {
    const appliedMigrations: Array<Migration> = []

    for (const migration of this.getUnapplied()) {
      this._builder
        .raw({
          query: `
          ${migration.sql}
          INSERT INTO ${this._tableName} (name)
          values ('${migration.name}');`,
        })
        .execute()

      appliedMigrations.push(migration)
    }

    return appliedMigrations
  }
}

export class asyncMigrationsBuilder<GenericResultWrapper> {
  _builder: QueryBuilder<GenericResultWrapper, true>
  _migrations: Array<Migration>
  _tableName: string

  constructor(options: MigrationOptions, builder: QueryBuilder<GenericResultWrapper, true>) {
    this._tableName = options.tableName || 'migrations'
    this._migrations = options.migrations
    this._builder = builder
  }

  async initialize(): Promise<void> {
    await this._builder
      .createTable({
        tableName: this._tableName,
        schema: `id         INTEGER PRIMARY KEY AUTOINCREMENT,
               name       TEXT UNIQUE,
               applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL`,
        ifNotExists: true,
      })
      .execute()

    return
  }

  async getApplied(): Promise<Array<MigrationEntry>> {
    await this.initialize()
    const result = await this._builder
      .fetchAll<MigrationEntry>({
        tableName: this._tableName,
        orderBy: 'id',
      })
      .execute()
    return result.results || []
  }

  async getUnapplied(): Promise<Array<Migration>> {
    const appliedMigrations = (await this.getApplied()).map((migration) => {
      return migration.name
    })

    const unappliedMigrations: Array<Migration> = []

    for (const migration of this._migrations) {
      if (!appliedMigrations.includes(migration.name)) {
        unappliedMigrations.push(migration)
      }
    }

    return unappliedMigrations
  }

  async apply(): Promise<Array<Migration>> {
    const appliedMigrations: Array<Migration> = []

    for (const migration of await this.getUnapplied()) {
      await this._builder
        .raw({
          query: `
          ${migration.sql}
          INSERT INTO ${this._tableName} (name)
          values ('${migration.name}');`,
        })
        .execute()

      appliedMigrations.push(migration)
    }

    return appliedMigrations
  }
}
