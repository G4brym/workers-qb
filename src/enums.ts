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
  RIGHT = 'RIGHT',
  FULL = 'FULL',
  NATURAL = 'NATURAL',
}

export enum SetOperationType {
  UNION = 'UNION',
  UNION_ALL = 'UNION ALL',
  INTERSECT = 'INTERSECT',
  INTERSECT_ALL = 'INTERSECT ALL',
  EXCEPT = 'EXCEPT',
  EXCEPT_ALL = 'EXCEPT ALL',
}
