import { ConflictTypes, JoinTypes, OrderTypes, SetOperationType } from './enums'
import { InvalidConfigurationError } from './errors'
import { Raw, renderRaw, renderRawSql } from './tools'

const unquotedIdentifierPart = '[\\p{L}_][\\p{L}\\p{N}\\p{M}_$]*'
const quotedIdentifierPart = '"(?:[^"]|"")+"'
const identifierPart = `(?:${unquotedIdentifierPart}|${quotedIdentifierPart})`
const identifierPattern = new RegExp(`^${identifierPart}(\\.${identifierPart})*$`, 'u')
const identifierOrWildcardPattern = new RegExp(`^(?:\\*|${identifierPart}(?:\\.${identifierPart})*(?:\\.\\*)?)$`, 'u')
const orderByPattern = new RegExp(`^${identifierPart}(?:\\.${identifierPart})*(?:\\s+(?:ASC|DESC))?$`, 'iu')
const joinOperand = `(?:${identifierPart}(?:\\.${identifierPart})*|\\d+(?:\\.\\d+)?)`
const joinComparison = `${joinOperand}\\s*(?:=|!=|<>|<=|>=|<|>)\\s*${joinOperand}`
const joinConditionPattern = new RegExp(`^${joinComparison}(?:\\s+(?:AND|OR)\\s+${joinComparison})*$`, 'iu')

function invalidSqlValue(clause: string, value: unknown, hint: string): never {
  throw new InvalidConfigurationError(`Invalid ${clause} value: ${value}`, hint)
}

export function renderIdentifier(value: string, clause: string, allowWildcard = false): string {
  const pattern = allowWildcard ? identifierOrWildcardPattern : identifierPattern
  if (typeof value !== 'string' || !pattern.test(value)) {
    invalidSqlValue(clause, value, 'Use a valid SQL identifier. Wrap trusted SQL expressions in Raw.')
  }
  return renderRawSql(value)
}

export function renderExpression(value: string | Raw, clause: string): string {
  if (value instanceof Raw) return renderRaw(value)
  return renderIdentifier(value, clause, true)
}

export function renderOrderBy(value: string | Raw): string {
  if (value instanceof Raw) return renderRaw(value)
  if (typeof value !== 'string' || !orderByPattern.test(value)) {
    invalidSqlValue('ORDER BY', value, 'Use a column with optional ASC/DESC, or wrap a trusted expression in Raw.')
  }
  return renderRawSql(value)
}

export function renderOrderDirection(value: string | OrderTypes): string {
  if (value !== OrderTypes.ASC && value !== OrderTypes.DESC) {
    invalidSqlValue('ORDER BY direction', value, 'Use ASC or DESC.')
  }
  return renderRawSql(value)
}

export function renderJoinType(value: string | JoinTypes): string {
  if (!Object.values(JoinTypes).includes(value as JoinTypes)) {
    invalidSqlValue('JOIN type', value, `Use one of: ${Object.values(JoinTypes).join(', ')}.`)
  }
  return value
}

export function renderJoinCondition(value: string | Raw): string {
  if (value instanceof Raw) return renderRaw(value)
  if (typeof value !== 'string' || !joinConditionPattern.test(value)) {
    invalidSqlValue(
      'JOIN condition',
      value,
      'Use identifier comparisons joined by AND/OR, or wrap a trusted expression in Raw.'
    )
  }
  return renderRawSql(value)
}

export function renderConflictType(value: string | ConflictTypes): string {
  if (!Object.values(ConflictTypes).includes(value as ConflictTypes)) {
    invalidSqlValue('conflict resolution', value, `Use one of: ${Object.values(ConflictTypes).join(', ')}.`)
  }
  return value
}

export function renderSetOperationType(value: string | SetOperationType): string {
  if (!Object.values(SetOperationType).includes(value as SetOperationType)) {
    invalidSqlValue('set operation', value, `Use one of: ${Object.values(SetOperationType).join(', ')}.`)
  }
  return value
}
