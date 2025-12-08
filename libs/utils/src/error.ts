export const isJsonWebTokenError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'name' in error && error.name === 'JsonWebTokenError'
