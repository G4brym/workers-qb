/**
 * Custom error class for Query Builder errors with enhanced context.
 * Provides helpful information about what went wrong and how to fix it.
 */
export class QueryBuilderError extends Error {
  public query?: string
  public expectedParams?: number
  public receivedParams?: number
  public hint?: string
  public clause?: string

  constructor(
    message: string,
    options?: {
      query?: string
      expectedParams?: number
      receivedParams?: number
      hint?: string
      clause?: string
    }
  ) {
    super(message)
    this.name = 'QueryBuilderError'
    this.query = options?.query
    this.expectedParams = options?.expectedParams
    this.receivedParams = options?.receivedParams
    this.hint = options?.hint
    this.clause = options?.clause

    // Build enhanced message
    let enhancedMessage = `QueryBuilderError: ${message}`

    if (options?.clause) {
      enhancedMessage += `\n  Clause: ${options.clause}`
    }

    if (options?.query) {
      enhancedMessage += `\n  Query: ${options.query}`
    }

    if (options?.expectedParams !== undefined) {
      enhancedMessage += `\n  Expected: ${options.expectedParams} parameter(s)`
    }

    if (options?.receivedParams !== undefined) {
      enhancedMessage += `\n  Received: ${options.receivedParams} parameter(s)`
    }

    if (options?.hint) {
      enhancedMessage += `\n  Hint: ${options.hint}`
    }

    this.message = enhancedMessage

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueryBuilderError)
    }
  }
}

/**
 * Error thrown when there's a parameter count mismatch.
 */
export class ParameterMismatchError extends QueryBuilderError {
  constructor(options: {
    clause: string
    query?: string
    expectedParams: number
    receivedParams: number
  }) {
    const tooMany = options.receivedParams > options.expectedParams
    super('Parameter count mismatch', {
      ...options,
      hint: tooMany
        ? 'Remove extra parameters or add more placeholders (?) to your query'
        : 'Add missing parameters or remove extra placeholders (?) from your query',
    })
    this.name = 'ParameterMismatchError'
  }
}

/**
 * Error thrown when required data is missing.
 */
export class MissingDataError extends QueryBuilderError {
  constructor(operation: string, field: string) {
    super(`${field} is required for ${operation} operation`, {
      hint: `Provide a valid ${field} parameter`,
    })
    this.name = 'MissingDataError'
  }
}

/**
 * Error thrown when an invalid configuration is detected.
 */
export class InvalidConfigurationError extends QueryBuilderError {
  constructor(message: string, hint?: string) {
    super(message, { hint })
    this.name = 'InvalidConfigurationError'
  }
}

/**
 * Error thrown when a subquery token is not found.
 */
export class SubqueryTokenError extends QueryBuilderError {
  constructor(token: string) {
    super(`Subquery token ${token} not found in placeholders`, {
      hint: 'Ensure the subquery is properly registered before referencing it',
    })
    this.name = 'SubqueryTokenError'
  }
}

/**
 * Error thrown when subquery context is missing.
 */
export class MissingSubqueryContextError extends QueryBuilderError {
  constructor() {
    super('Subquery context not provided for token processing', {
      hint: 'This is likely an internal error. Please report it.',
    })
    this.name = 'MissingSubqueryContextError'
  }
}
