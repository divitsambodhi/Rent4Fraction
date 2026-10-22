import { useState, useMemo } from 'react'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { getAllMockUsers, toggleMockUserStatus } from '@/lib/auth/mock-accounts'
import { UserSheet } from './user-sheet'
import type { AdminUser } from '@/types/admin'
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

interface UsersSectionProps {
  roleFilter?: string
  searchQuery?: string
  selectedUserId?: string | null
  onRoleChange: (role: string) => void
  onSearchChange: (q: string) => void
  onSelectUser: (id: string | null) => void
}

export function UsersSection({
  roleFilter = 'all',
  searchQuery = '',
  selectedUserId,
  onRoleChange,
  onSearchChange,
  onSelectUser,
}: UsersSectionProps) {
  const [version, setVersion] = useState(0)

  const allUsers: AdminUser[] = useMemo(() => {
    return getAllMockUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const counts = useMemo(() => {
    return {
      all: allUsers.length,
      customer: allUsers.filter((u) => u.role === 'customer').length,
      vendor: allUsers.filter((u) => u.role === 'vendor').length,
      admin: allUsers.filter((u) => u.role === 'admin').length,
      deactivated: allUsers.filter((u) => u.status === 'deactivated').length,
    }
  }, [allUsers])

  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      if (roleFilter === 'deactivated' && user.status !== 'deactivated') {
        return false
      }
      if (roleFilter !== 'all' && roleFilter !== 'deactivated' && user.role !== roleFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = user.name.toLowerCase().includes(q)
        const matchEmail = user.email.toLowerCase().includes(q)
        if (!matchName && !matchEmail) return false
      }
      return true
    })
  }, [allUsers, roleFilter, searchQuery])

  const handleStatusToggled = (userId: string) => {
    toggleMockUserStatus(userId)
    setVersion((v) => v + 1)
  }

  const activeUser = selectedUserId
    ? allUsers.find((u) => u.user_id === selectedUserId) || null
    : null

  const columns: Column<AdminUser>[] = [
    {
      id: 'name',
      header: 'User',
      accessor: (u) => (
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-brand/10 text-brand font-bold text-xs flex items-center justify-center shrink-0 border border-brand/20">
            {u.avatar_initials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">{u.name}</div>
            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'role',
      header: 'Role',
      accessor: (u) => (
        <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
          {u.role}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'verified',
      header: 'Verified',
      accessor: () => (
        <div className="flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="size-3.5" />
          <span>Email verified</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (u) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
            u.status === 'deactivated'
              ? 'bg-danger/10 text-danger border-danger/30'
              : 'bg-success/10 text-success border-success/30'
          }`}
        >
          {u.status === 'deactivated' ? <XCircle className="size-3" /> : <CheckCircle2 className="size-3" />}
          <span>{u.status}</span>
        </span>
      ),
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Action',
      accessor: (u) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectUser(u.user_id)}
          className="h-8 text-xs font-semibold gap-1 px-2.5"
        >
          <span>Manage</span>
          <ExternalLink className="size-3 text-muted-foreground" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <FilterBar
        searchPlaceholder="Search user by name or email..."
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeStatus={roleFilter}
        onStatusChange={onRoleChange}
        statusPills={[
          { id: 'all', label: 'All Accounts', count: counts.all },
          { id: 'customer', label: 'Customers', count: counts.customer },
          { id: 'vendor', label: 'Vendors', count: counts.vendor },
          { id: 'admin', label: 'Admins', count: counts.admin },
          { id: 'deactivated', label: 'Deactivated', count: counts.deactivated },
        ]}
      />

      <DataTable<AdminUser>
        columns={columns}
        data={filteredUsers}
        keyExtractor={(u) => u.user_id}
        emptyTitle="No users found"
        emptyDescription="No users found matching your search filter."
        onRowClick={(u) => onSelectUser(u.user_id)}
      />

      <UserSheet
        user={activeUser}
        onClose={() => onSelectUser(null)}
        onStatusToggled={handleStatusToggled}
      />
    </div>
  )
}
