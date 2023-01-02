export enum OrderTypes {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum FetchTypes {
  ONE = 'ONE',
  ALL = 'ALL',
}

export enum ConflictTypes {
  ROLLBACK = 'ROLLBACK',
  ABORT = 'ABORT',
  FAIL = 'FAIL',
  IGNORE = 'IGNORE',
  REPLACE = 'REPLACE',
}

export enum JoinTypes {
  INNER = 'INNER',
  LEFT = 'LEFT',
  CROSS = 'CROSS',
}
