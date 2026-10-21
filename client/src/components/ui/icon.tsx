import React from 'react'
import {
  IconSearch,
  IconCalendar,
  IconShoppingCart,
  IconHeart,
  IconHeartFilled,
  IconAdjustmentsHorizontal,
  IconExternalLink,
  IconX,
  IconMenu2,
  IconChevronDown,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconChecklist,
  IconPlus,
  IconTrash,
  IconEye,
  IconRefresh,
  IconMapPin,
  IconBuildingStore,
  IconUser,
  IconLock,
  IconMail,
  IconPhone,
  IconArrowLeft,
  IconArrowRight,
  IconCircleCheck,
  IconClock,
  IconTruck,
  IconShieldCheck,
  IconWallet,
  IconSun,
  IconMoon,
  IconHelpCircle,
  IconBox,
  IconRotateClockwise2,
  IconStar,
  IconStarFilled,
  IconMessage,
  IconBell,
  IconUpload,
  IconLayoutDashboard,
  IconFileText,
  IconPackage,
  IconCreditCard,
  IconEdit,
  IconEyeOff,
  IconLoader2,
  IconArrowUp,
  IconBriefcase,
  IconShield,
  IconPower,
  IconInbox,
  IconMaximize,
  IconCamera,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export type IconName =
  | 'search'
  | 'calendar'
  | 'cart'
  | 'heart'
  | 'heart-filled'
  | 'filters'
  | 'external-link'
  | 'close'
  | 'menu'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'check'
  | 'check-circle'
  | 'alert'
  | 'warning'
  | 'info'
  | 'checklist'
  | 'plus'
  | 'trash'
  | 'eye'
  | 'refresh'
  | 'map-pin'
  | 'store'
  | 'user'
  | 'lock'
  | 'mail'
  | 'phone'
  | 'arrow-left'
  | 'arrow-right'
  | 'clock'
  | 'truck'
  | 'shield-check'
  | 'wallet'
  | 'sun'
  | 'moon'
  | 'help'
  | 'box'
  | 'rotate'
  | 'star'
  | 'star-filled'
  | 'message'
  | 'bell'
  | 'upload'
  | 'dashboard'
  | 'file-text'
  | 'package'
  | 'credit-card'
  | 'edit'
  | 'eye-off'
  | 'loader'
  | 'arrow-up'
  | 'briefcase'
  | 'shield'
  | 'power'
  | 'inbox'
  | 'maximize'
  | 'camera'
  | 'adjustments'
  | 'layout'

interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'stroke'> {
  name: IconName
  size?: number | string
  className?: string
  stroke?: number | string
}

const iconMap: Record<IconName, React.ComponentType<Record<string, unknown>>> = {
  search: IconSearch,
  calendar: IconCalendar,
  cart: IconShoppingCart,
  heart: IconHeart,
  'heart-filled': IconHeartFilled,
  filters: IconAdjustmentsHorizontal,
  adjustments: IconAdjustmentsHorizontal,
  'external-link': IconExternalLink,
  close: IconX,
  menu: IconMenu2,
  'chevron-down': IconChevronDown,
  'chevron-up': IconChevronUp,
  'chevron-left': IconChevronLeft,
  'chevron-right': IconChevronRight,
  check: IconCheck,
  'check-circle': IconCircleCheck,
  alert: IconAlertCircle,
  warning: IconAlertTriangle,
  info: IconInfoCircle,
  checklist: IconChecklist,
  plus: IconPlus,
  trash: IconTrash,
  eye: IconEye,
  'eye-off': IconEyeOff,
  refresh: IconRefresh,
  loader: IconLoader2,
  'map-pin': IconMapPin,
  store: IconBuildingStore,
  user: IconUser,
  lock: IconLock,
  mail: IconMail,
  phone: IconPhone,
  'arrow-left': IconArrowLeft,
  'arrow-right': IconArrowRight,
  'arrow-up': IconArrowUp,
  clock: IconClock,
  truck: IconTruck,
  'shield-check': IconShieldCheck,
  shield: IconShield,
  wallet: IconWallet,
  sun: IconSun,
  moon: IconMoon,
  help: IconHelpCircle,
  box: IconBox,
  rotate: IconRotateClockwise2,
  star: IconStar,
  'star-filled': IconStarFilled,
  message: IconMessage,
  bell: IconBell,
  upload: IconUpload,
  dashboard: IconLayoutDashboard,
  layout: IconLayoutDashboard,
  'file-text': IconFileText,
  package: IconPackage,
  'credit-card': IconCreditCard,
  edit: IconEdit,
  briefcase: IconBriefcase,
  power: IconPower,
  inbox: IconInbox,
  maximize: IconMaximize,
  camera: IconCamera,
}

export function Icon({
  name,
  size = 18,
  stroke = 1.75,
  className,
  ...props
}: IconProps) {
  const Component = iconMap[name] || IconBox
  return (
    <Component
      size={size}
      stroke={stroke}
      className={cn('shrink-0 select-none inline-block align-middle', className)}
      aria-hidden="true"
      {...props}
    />
  )
}
