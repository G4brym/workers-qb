// Code taken from type-fest

export type OmitIndexSignature<ObjectType> = {
  [KeyType in keyof ObjectType as {} extends Record<KeyType, unknown> ? never : KeyType]: ObjectType[KeyType]
}

export type PickIndexSignature<ObjectType> = {
  [KeyType in keyof ObjectType as {} extends Record<KeyType, unknown> ? KeyType : never]: ObjectType[KeyType]
}

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

type SimpleMerge<Destination, Source> = {
  [Key in keyof Destination as Key extends keyof Source ? never : Key]: Destination[Key]
} & Source

export type Merge<Destination, Source> = Simplify<
  SimpleMerge<PickIndexSignature<Destination>, PickIndexSignature<Source>> &
    SimpleMerge<OmitIndexSignature<Destination>, OmitIndexSignature<Source>>
>
