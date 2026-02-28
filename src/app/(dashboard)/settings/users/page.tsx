'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, Users, Search, MoreHorizontal,
  Shield, Clock, Trash2, CheckCircle, XCircle,
  UserPlus, Loader2, Mail
} from 'lucide-react'
import { LimitGate } from '@/components/FeatureGate'
import { usePlan } from '@/hooks/usePlan'

interface TeamMember {
  id: string
  email: string
  name: string
  role: string
  imageUrl?: string
  createdAt: number
  lastSignInAt: number | null
}

interface PendingInvite {
  id: string
  email: string
  role: string
  status: string
  createdAt: number
}

const roleLabels: Record<string, { label: string; color: string; bg: string }> = {
  owner: { label: 'Owner', color: 'text-[#ff3b30]', bg: 'bg-[#ff3b30]/10' },
  member: { label: 'Member', color: 'text-[#0071e3]', bg: 'bg-[#0071e3]/10' },
  ADMIN: { label: 'Admin', color: 'text-[#ff3b30]', bg: 'bg-[#ff3b30]/10' },
}

export default function UsersSettingsPage() {
  const { getLimit } = usePlan()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'owner'>('member')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')

  const loadTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/team')
      if (!res.ok) throw new Error('Failed to load team')
      const data = await res.json()
      setMembers(data.members || [])
      setPendingInvites(data.pendingInvites || [])
    } catch (err) {
      console.error('Failed to load team:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTeam() }, [loadTeam])

  const handleInvite = async () => {
    if (!inviteEmail) return
    setInviting(true)
    setError('')

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invitation')
      }

      setInviteEmail('')
      setShowInviteModal(false)
      await loadTeam()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const res = await fetch(`/api/team/${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove member')
      await loadTeam()
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  const totalCount = members.length + pendingInvites.length

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredInvites = pendingInvites.filter((inv) =>
    inv.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0071e3]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/settings" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
        <ChevronLeft className="w-4 h-4" />
        Back to Settings
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#5856d6]/10 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-[#5856d6]" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Team & Users</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Manage team members and their permissions
            </p>
          </div>
        </div>

        <LimitGate
          feature="team_members"
          currentCount={totalCount}
          showBanner={false}
          fallback={
            <span className="flex items-center gap-2 px-4 py-2.5 bg-gray-300 text-gray-500 rounded-xl text-[14px] font-medium cursor-not-allowed">
              <UserPlus className="w-4 h-4" />
              Limit reached ({totalCount}/{getLimit('team_members')})
            </span>
          }
        >
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ED] transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member ({totalCount}/{getLimit('team_members')})
          </button>
        </LimitGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[24px] font-semibold text-[#1d1d1f]">{members.length}</p>
          <p className="text-[12px] text-[#86868b]">Active Members</p>
        </div>
        <div className="bg-white rounded-xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[24px] font-semibold text-[#ff9500]">{pendingInvites.length}</p>
          <p className="text-[12px] text-[#86868b]">Pending Invitations</p>
        </div>
        <div className="bg-white rounded-xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[24px] font-semibold text-[#ff3b30]">{members.filter((m) => m.role === 'owner' || m.role === 'ADMIN').length}</p>
          <p className="text-[12px] text-[#86868b]">Owners / Admins</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-white border border-[#d2d2d7]/50 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
        />
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-visible">
        <table className="w-full">
          <thead className="bg-[#f5f5f7] border-b border-[#d2d2d7]/30">
            <tr>
              <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">Member</th>
              <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">Role</th>
              <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">Last Login</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d2d2d7]/20">
            {filteredMembers.map((member) => {
              const role = roleLabels[member.role] || { label: member.role, color: 'text-[#86868b]', bg: 'bg-[#86868b]/10' }
              const initials = member.name
                ? member.name.split(' ').map((n) => n[0]).join('').toUpperCase()
                : member.email[0].toUpperCase()

              return (
                <tr key={member.id} className="hover:bg-[#f5f5f7]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0071e3]/10 rounded-full flex items-center justify-center">
                        <span className="text-[14px] font-medium text-[#0071e3]">{initials}</span>
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#1d1d1f]">{member.name || member.email}</p>
                        <p className="text-[12px] text-[#86868b]">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${role.bg} ${role.color}`}>
                      <Shield className="w-3.5 h-3.5" />
                      {role.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#34c759]/10 text-[#34c759]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[14px] text-[#86868b]">
                      {member.lastSignInAt ? new Date(member.lastSignInAt).toLocaleDateString('fr-FR') : 'Never'}
                    </span>
                  </td>
                  <td className="px-4 py-4 relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                      className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-[#86868b]" />
                    </button>

                    {activeMenu === member.id && (
                      <div className="absolute right-4 bottom-full mb-1 w-48 bg-white rounded-xl shadow-lg border border-[#d2d2d7]/30 py-1 z-[101]">
                        <button
                          onClick={() => { handleRemoveMember(member.id); setActiveMenu(null) }}
                          className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#ff3b30] hover:bg-[#ff3b30]/5 w-full text-left"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove Member
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}

            {/* Pending invitations */}
            {filteredInvites.map((invite) => (
              <tr key={invite.id} className="hover:bg-[#f5f5f7]/50 transition-colors opacity-60">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#ff9500]/10 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-[#ff9500]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#1d1d1f]">{invite.email}</p>
                      <p className="text-[12px] text-[#86868b]">Invitation sent</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#0071e3]/10 text-[#0071e3]">
                    <Shield className="w-3.5 h-3.5" />
                    {invite.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#ff9500]/10 text-[#ff9500]">
                    <Clock className="w-3.5 h-3.5" />
                    Pending
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[14px] text-[#86868b]">-</span>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => { /* TODO: cancel invitation */ }}
                    className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                    title="Cancel invitation"
                  >
                    <XCircle className="w-4 h-4 text-[#86868b]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMembers.length === 0 && filteredInvites.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
            <p className="text-[15px] text-[#86868b]">No team members found</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-6">Invite Team Member</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'member' | 'owner')}
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                >
                  <option value="member">Member - Can manage orders &amp; customers</option>
                  <option value="owner">Owner - Full access including settings</option>
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowInviteModal(false); setError('') }}
                className="flex-1 h-10 bg-[#f5f5f7] text-[#1d1d1f] rounded-xl text-[14px] font-medium hover:bg-[#e8e8ed] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail || inviting}
                className="flex-1 h-10 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
