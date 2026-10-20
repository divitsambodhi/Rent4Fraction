import React from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { VendorHeader } from './vendor-header'
import type { VendorApprovalStatus } from '@/types/vendor'

interface VendorShellProps {
  businessName: string
  approvalStatus: VendorApprovalStatus
  activeTitle: string
  subtitle?: string
  children: React.ReactNode
}

export function VendorShell({
  businessName,
  approvalStatus,
  activeTitle,
  subtitle,
  children,
}: VendorShellProps) {
  return (
    <DashboardLayout type="vendor">
      <VendorHeader
        businessName={businessName}
        approvalStatus={approvalStatus}
        activeTitle={activeTitle}
        subtitle={subtitle}
      />
      {children}
    </DashboardLayout>
  )
}
