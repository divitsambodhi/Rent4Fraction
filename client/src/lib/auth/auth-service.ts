import { auth } from '@/lib/firebase'
import {
  sendPasswordResetEmail,
  sendEmailVerification as fbSendEmailVerification,
} from 'firebase/auth'

export const authService = {
  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email)
  },
  async sendEmailVerification(): Promise<void> {
    if (auth.currentUser) {
      await fbSendEmailVerification(auth.currentUser)
    }
  },
  async reloadUser(): Promise<void> {
    if (auth.currentUser) {
      await auth.currentUser.reload()
    }
  },
  getCurrentUser() {
    return auth.currentUser
  },
}

export const mockAuthService = authService

