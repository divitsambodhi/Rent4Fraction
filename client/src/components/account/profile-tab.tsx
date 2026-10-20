import { PersonalInfoCard } from './personal-info-card'
import { ChangePasswordCard } from './change-password-card'
import { AppearanceCard } from './appearance-card'
import { Button } from '@/components/ui/button'
import { AppLink, useAppNavigate } from '@/components/shared/app-link'
import { useAuth } from '@/providers/auth-provider'
import { Laptop, LogOut, Shield, HelpCircle } from 'lucide-react'

export function ProfileTab() {
  const { logout } = useAuth()
  const navigate = useAppNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="space-y-6 max-w-[720px]">
      <div>
        <h2 className="text-xl font-serif font-bold text-foreground">
          Profile & Security Settings
        </h2>
        <p className="text-xs text-muted-foreground">
          Manage your credentials, notification email, security preferences, and interface appearance.
        </p>
      </div>

      {/* 1. Personal Information Card */}
      <PersonalInfoCard />

      {/* 2. Password & Security Card */}
      <ChangePasswordCard />

      {/* 3. Appearance Card */}
      <AppearanceCard />

      {/* 4. Active Sessions Card */}
      <article className="p-5 sm:p-6 rounded-[16px] bg-surface border border-border shadow-xs space-y-4">
        <div className="flex items-center gap-3.5 pb-3 border-b border-border">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
            <Shield className="size-5 stroke-[1.75]" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-foreground">
              Active Login Sessions
            </h3>
            <p className="text-xs text-muted-foreground">
              Devices currently signed into this customer account.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-muted/30 border border-border">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-surface border border-border/70 flex items-center justify-center text-muted-foreground">
              <Laptop className="size-4.5" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                <span>Current Web Session</span>
                <span className="size-2 rounded-full bg-success inline-block" title="Active now" />
              </div>
              <div className="text-[11px] text-muted-foreground">
                This browser · Signed in recently
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-8 text-xs text-danger hover:bg-danger/10 hover:text-danger gap-1.5"
          >
            <LogOut className="size-3.5" />
            <span>Log out</span>
          </Button>
        </div>
      </article>

      {/* 5. Neutral Support & Account Action Line */}
      <div className="p-4 rounded-[12px] bg-muted/20 border border-border/80 flex items-center gap-3 text-xs text-muted-foreground leading-relaxed">
        <HelpCircle className="size-5 text-muted-foreground shrink-0" />
        <p>
          To delete your account or change your primary email address,{' '}
          <AppLink
            to="/help?tab=contact"
            className="font-semibold text-brand hover:underline"
          >
            contact customer support
          </AppLink>
          .
        </p>
      </div>
    </div>
  )
}
