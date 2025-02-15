export class AuthError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN'); 
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(message = 'Invalid credentials') {
    super(message, 401, 'INVALID_CREDENTIALS');
  }
}

export class SessionExpiredError extends AuthError {
  constructor(message = 'Session expired') {
    super(message, 401, 'SESSION_EXPIRED');
  }
}

export class InvalidSessionError extends AuthError {
  constructor(message = 'Invalid session') {
    super(message, 401, 'INVALID_SESSION');
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}
