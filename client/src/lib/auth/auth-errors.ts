export type AuthErrorCode =
  | 'auth/invalid-credential'
  | 'auth/email-already-in-use'
  | 'auth/weak-password'
  | 'auth/invalid-email'
  | 'auth/too-many-requests'
  | 'auth/network-request-failed'
  | 'auth/user-not-found'
  | 'auth/operation-not-allowed'
  | 'auth/requires-recent-login'
  | 'auth/wrong-password'
  | 'auth/user-disabled'

export class AuthError extends Error {
  code: AuthErrorCode

  constructor(code: AuthErrorCode, message?: string) {
    super(message || code)
    this.name = 'AuthError'
    this.code = code
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}

/**
 * Maps Firebase-compatible error codes to friendly user messages.
 */
export function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.'
    case 'auth/wrong-password':
      return 'Current password is incorrect.'
    case 'auth/requires-recent-login':
      return 'This operation is sensitive and requires recent authentication. Please re-enter your password.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Log in instead.'
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 8 characters).'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.'
    case 'auth/user-disabled':
      return 'This account has been deactivated. Contact support.'
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.'
    default:
      return 'Something went wrong. Please check your details and try again.'
  }
}
