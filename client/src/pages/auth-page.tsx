import { useMemo, useState } from 'react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthCard } from '@/components/auth/auth-card'
import { ModeTabs } from '@/components/auth/mode-tabs'
import { AccountTypeToggle } from '@/components/auth/account-type-toggle'
import { LoginForm } from '@/components/auth/login-form'
import { CustomerSignupForm } from '@/components/auth/customer-signup-form'
import { VendorSignupWizard } from '@/components/auth/vendor-signup-wizard'
import { VerifyEmailPanel } from '@/components/auth/verify-email-panel'
import { ApplicationSubmittedPanel } from '@/components/auth/application-submitted-panel'
import { AlreadyLoggedIn } from '@/components/auth/already-logged-in'
import { useAuth } from '@/providers/auth-provider'
import { useAppNavigate, useAppSearchParams } from '@/components/shared/app-link'
import { usePageTitle } from '@/hooks/use-page-title'
import { sanitizeRedirect } from '@/lib/auth'
import type { AuthMode, AuthUser } from '@/types/auth'

export function AuthPage() {
  const { user, logout } = useAuth()
  const navigate = useAppNavigate()
  const [searchParams, setSearchParams] = useAppSearchParams()

  // 1. Resolve Auth Mode from URL params
  const rawMode = searchParams.get('mode')
  const mode: AuthMode = useMemo(() => {
    if (rawMode === 'signup' || rawMode === 'vendor') return rawMode
    return 'login'
  }, [rawMode])

  const redirectParam = searchParams.get('redirect')

  // 2. Post-action sub-views
  const [subView, setSubView] = useState<'default' | 'verify' | 'submitted'>('default')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [submittedBusinessName, setSubmittedBusinessName] = useState('')

  // 3. Dynamic Page Title
  const pageTitle = useMemo(() => {
    if (subView === 'verify') return 'Verify Your Email'
    if (subView === 'submitted') return 'Application Submitted'
    if (mode === 'vendor') return 'Vendor Partner Registration'
    if (mode === 'signup') return 'Create Customer Account'
    return 'Log in to Rent4Fraction'
  }, [mode, subView])

  usePageTitle(pageTitle)

  // 4. Mode Switch handler with URL sync
  const handleSwitchMode = (newMode: AuthMode) => {
    setSubView('default')
    const nextParams = new URLSearchParams()
    if (newMode !== 'login') {
      nextParams.set('mode', newMode)
    }
    if (redirectParam) {
      nextParams.set('redirect', redirectParam)
    }
    setSearchParams(nextParams, { replace: true })
  }

  // 5. Post-signup callbacks
  const handleCustomerSignupSuccess = (createdUser: AuthUser) => {
    setSubmittedEmail(createdUser.email)
    setSubView('verify')
  }

  const handleVendorSignupSuccess = (createdUser: AuthUser, businessName: string) => {
    setSubmittedEmail(createdUser.email)
    setSubmittedBusinessName(businessName)
    setSubView('submitted')
  }

  const handleEmailVerified = () => {
    const sanitized = sanitizeRedirect(redirectParam)
    navigate(sanitized || '/')
  }

  return (
    <AuthLayout mode={mode}>
      <AuthCard>
        {/* Scenario 1: Already logged in */}
        {user ? (
          <AlreadyLoggedIn
            user={user}
            onLogout={logout}
            redirectPath={redirectParam}
          />
        ) : subView === 'verify' ? (
          /* Scenario 2: Verification panel */
          <VerifyEmailPanel
            email={submittedEmail}
            onVerified={handleEmailVerified}
            onChangeEmail={() => setSubView('default')}
            onSkip={() => {
              const sanitized = sanitizeRedirect(redirectParam)
              navigate(sanitized || '/')
            }}
          />
        ) : subView === 'submitted' ? (
          /* Scenario 3: Vendor application submitted panel */
          <ApplicationSubmittedPanel
            businessName={submittedBusinessName}
            email={submittedEmail}
          />
        ) : (
          /* Scenario 4: Standard auth forms */
          <div className="space-y-6">
            {/* Top segmented tablist: Log in vs Sign up */}
            <ModeTabs
              mode={mode === 'login' ? 'login' : 'signup'}
              onChange={(m) => handleSwitchMode(m)}
            />

            {/* Sub-selector under Sign Up: Customer vs Vendor */}
            {(mode === 'signup' || mode === 'vendor') && (
              <div className="pt-1">
                <AccountTypeToggle
                  value={mode === 'vendor' ? 'vendor' : 'customer'}
                  onChange={(type) =>
                    handleSwitchMode(type === 'vendor' ? 'vendor' : 'signup')
                  }
                />
              </div>
            )}

            {/* Form rendering */}
            {mode === 'login' && (
              <LoginForm
                onSwitchMode={handleSwitchMode}
                redirectParam={redirectParam}
                roleParam={(searchParams.get('role') as 'customer' | 'vendor' | null)}
              />
            )}

            {mode === 'signup' && (
              <CustomerSignupForm
                onSwitchMode={handleSwitchMode}
                onSuccess={handleCustomerSignupSuccess}
              />
            )}

            {mode === 'vendor' && (
              <VendorSignupWizard
                onSwitchMode={handleSwitchMode}
                onSuccess={handleVendorSignupSuccess}
              />
            )}
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  )
}
