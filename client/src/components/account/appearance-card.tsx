import { useTheme } from '@/providers/theme-provider'
import { Laptop, Moon, Sun, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type ThemeOption = 'light' | 'dark' | 'system'

export function AppearanceCard() {
  const { theme, setTheme } = useTheme()

  const options: {
    key: ThemeOption
    label: string
    description: string
    icon: typeof Sun
  }[] = [
    {
      key: 'light',
      label: 'Light theme',
      description: 'Warm cream surfaces and deep wine accents',
      icon: Sun,
    },
    {
      key: 'dark',
      label: 'Dark theme',
      description: 'Charcoal night palette with subtle borders',
      icon: Moon,
    },
    {
      key: 'system',
      label: 'System preference',
      description: 'Automatically synchronizes with your device settings',
      icon: Laptop,
    },
  ]

  return (
    <article className="p-5 sm:p-6 rounded-[16px] bg-surface border border-border shadow-xs space-y-5">
      <div className="flex items-center gap-3.5 pb-4 border-b border-border">
        <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
          <Sun className="size-5 stroke-[1.75]" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-base text-foreground">
            Appearance & Interface Theme
          </h3>
          <p className="text-xs text-muted-foreground">
            Choose how Rent4Fraction looks on this device.
          </p>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Select appearance theme"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {options.map((opt) => {
          const isSelected = theme === opt.key
          const Icon = opt.icon

          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(opt.key)}
              className={cn(
                'group relative p-4 rounded-[14px] border text-left flex flex-col justify-between space-y-3 transition-all cursor-pointer select-none',
                isSelected
                  ? 'bg-brand/5 border-brand ring-2 ring-brand/20 shadow-xs'
                  : 'bg-surface border-border hover:border-brand/40 hover:bg-muted/30'
              )}
            >
              {/* Token-drawn Thumbnail */}
              <div className="w-full h-20 rounded-[8px] border overflow-hidden relative shadow-inner p-2 flex flex-col justify-between">
                {opt.key === 'light' ? (
                  /* Light theme thumbnail */
                  <div className="w-full h-full bg-[#FAFAF8] rounded-[6px] border border-[#EBEAE5] p-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="h-2 w-10 bg-[#762B36] rounded" />
                      <div className="size-2 rounded-full bg-[#762B36]" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-[#E5E4DE] rounded" />
                      <div className="h-1.5 w-2/3 bg-[#E5E4DE] rounded" />
                    </div>
                  </div>
                ) : opt.key === 'dark' ? (
                  /* Dark theme thumbnail */
                  <div className="w-full h-full bg-[#191A1D] rounded-[6px] border border-[#2E3137] p-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="h-2 w-10 bg-[#9C3D4B] rounded" />
                      <div className="size-2 rounded-full bg-[#9C3D4B]" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-[#2E3137] rounded" />
                      <div className="h-1.5 w-2/3 bg-[#2E3137] rounded" />
                    </div>
                  </div>
                ) : (
                  /* System split thumbnail */
                  <div className="w-full h-full rounded-[6px] overflow-hidden flex border border-border">
                    {/* Left half: Light */}
                    <div className="w-1/2 h-full bg-[#FAFAF8] p-1.5 flex flex-col justify-between border-r border-[#EBEAE5]">
                      <div className="h-2 w-6 bg-[#762B36] rounded" />
                      <div className="h-1.5 w-full bg-[#E5E4DE] rounded" />
                    </div>
                    {/* Right half: Dark */}
                    <div className="w-1/2 h-full bg-[#191A1D] p-1.5 flex flex-col justify-between">
                      <div className="h-2 w-6 bg-[#9C3D4B] rounded ml-auto" />
                      <div className="h-1.5 w-full bg-[#2E3137] rounded" />
                    </div>
                  </div>
                )}
              </div>

              {/* Label and Info */}
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <Icon className="size-3.5 stroke-[2]" />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && (
                    <div className="size-4 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {opt.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </article>
  )
}
