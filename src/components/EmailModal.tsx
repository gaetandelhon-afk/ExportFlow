'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Mail, Send, X, FileText, Loader2, Plus, User, Users, Clock
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface EmailModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (data: EmailData) => Promise<void>
  documentType: 'Quote' | 'Invoice' | 'Proforma' | 'Packing List'
  documentNumber: string
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
  /** @deprecated Use useCurrentUser hook instead - kept for backward compatibility */
  adminEmail?: string
}

export interface EmailData {
  to: string[]
  cc: string[]
  subject: string
  body: string
}

const RECENT_EMAILS_KEY = 'orderbridge_recent_emails'
const TEAM_USERS_KEY = 'orderbridge_users'
const MAX_RECENT_EMAILS = 10

interface TeamMember {
  id: string
  name: string
  email: string
  status: string
}

export function EmailModal({
  isOpen,
  onClose,
  onSend,
  documentType,
  documentNumber,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  adminEmail: legacyAdminEmail = ''
}: EmailModalProps) {
  // Get current user dynamically
  const { user: currentUser } = useCurrentUser()
  
  // Use current user's email, fallback to legacy prop for backward compatibility
  const currentUserEmail = currentUser?.email || legacyAdminEmail
  const currentUserName = currentUser?.name || ''
  
  const [toEmails, setToEmails] = useState<string[]>([])
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [newToEmail, setNewToEmail] = useState('')
  const [newCcEmail, setNewCcEmail] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [ccMe, setCcMe] = useState(false)
  const [sending, setSending] = useState(false)
  const [recentEmails, setRecentEmails] = useState<string[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [showToSuggestions, setShowToSuggestions] = useState(false)
  const [showCcSuggestions, setShowCcSuggestions] = useState(false)
  
  const toInputRef = useRef<HTMLInputElement>(null)
  const ccInputRef = useRef<HTMLInputElement>(null)

  // Load recent emails and team members from localStorage
  useEffect(() => {
    // Load recent emails
    const storedRecent = localStorage.getItem(RECENT_EMAILS_KEY)
    if (storedRecent) {
      try {
        setRecentEmails(JSON.parse(storedRecent))
      } catch {
        setRecentEmails([])
      }
    }
    
    // Load team members (colleagues)
    const storedTeam = localStorage.getItem(TEAM_USERS_KEY)
    if (storedTeam) {
      try {
        const users = JSON.parse(storedTeam) as TeamMember[]
        // Only include active users
        setTeamMembers(users.filter(u => u.status === 'active'))
      } catch {
        setTeamMembers([])
      }
    }
  }, [])

  // Initialize with default values
  useEffect(() => {
    if (isOpen) {
      if (defaultTo && !toEmails.length) {
        setToEmails([defaultTo])
      }
      setSubject(defaultSubject)
      setBody(defaultBody)
    }
  }, [isOpen, defaultTo, defaultSubject, defaultBody])

  // Save email to recent list
  const saveRecentEmail = (email: string) => {
    const normalized = email.toLowerCase().trim()
    if (!normalized || !normalized.includes('@')) return
    
    const updated = [normalized, ...recentEmails.filter(e => e !== normalized)].slice(0, MAX_RECENT_EMAILS)
    setRecentEmails(updated)
    localStorage.setItem(RECENT_EMAILS_KEY, JSON.stringify(updated))
  }

  const addToEmail = (email: string) => {
    const normalized = email.toLowerCase().trim()
    if (normalized && normalized.includes('@') && !toEmails.includes(normalized)) {
      setToEmails([...toEmails, normalized])
      saveRecentEmail(normalized)
    }
    setNewToEmail('')
    setShowToSuggestions(false)
  }

  const addCcEmail = (email: string) => {
    const normalized = email.toLowerCase().trim()
    if (normalized && normalized.includes('@') && !ccEmails.includes(normalized)) {
      setCcEmails([...ccEmails, normalized])
      saveRecentEmail(normalized)
    }
    setNewCcEmail('')
    setShowCcSuggestions(false)
  }

  const removeToEmail = (email: string) => {
    setToEmails(toEmails.filter(e => e !== email))
  }

  const removeCcEmail = (email: string) => {
    setCcEmails(ccEmails.filter(e => e !== email))
  }

  const handleKeyDown = (e: React.KeyboardEvent, type: 'to' | 'cc') => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault()
      if (type === 'to' && newToEmail.trim()) {
        addToEmail(newToEmail)
      } else if (type === 'cc' && newCcEmail.trim()) {
        addCcEmail(newCcEmail)
      }
    }
  }

  const handleSend = async () => {
    if (toEmails.length === 0) return
    
    setSending(true)
    try {
      const allCc = [...ccEmails]
      if (ccMe && currentUserEmail && !allCc.includes(currentUserEmail.toLowerCase())) {
        allCc.push(currentUserEmail.toLowerCase())
      }
      
      await onSend({
        to: toEmails,
        cc: allCc,
        subject,
        body
      })
      
      // Save all emails to recent
      toEmails.forEach(saveRecentEmail)
      allCc.forEach(saveRecentEmail)
      
      handleClose()
    } catch (error) {
      console.error('Failed to send:', error)
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setToEmails([])
    setCcEmails([])
    setNewToEmail('')
    setNewCcEmail('')
    setCcMe(false)
    onClose()
  }

  // Filter suggestions based on input
  const getToSuggestions = () => {
    const input = newToEmail.toLowerCase()
    return recentEmails
      .filter(email => 
        !toEmails.includes(email) && 
        !ccEmails.includes(email) &&
        (input === '' || email.includes(input))
      )
      .slice(0, 5)
  }

  const getCcSuggestions = () => {
    const input = newCcEmail.toLowerCase()
    return recentEmails
      .filter(email => 
        !toEmails.includes(email) && 
        !ccEmails.includes(email) &&
        (input === '' || email.includes(input))
      )
      .slice(0, 5)
  }
  
  // Get team member suggestions for CC (excluding current user)
  const getTeamSuggestions = () => {
    const input = newCcEmail.toLowerCase()
    return teamMembers
      .filter(member => 
        member.email.toLowerCase() !== currentUserEmail?.toLowerCase() &&
        !toEmails.includes(member.email.toLowerCase()) && 
        !ccEmails.includes(member.email.toLowerCase()) &&
        (input === '' || 
         member.email.toLowerCase().includes(input) || 
         member.name.toLowerCase().includes(input))
      )
      .slice(0, 5)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#d2d2d7]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Send {documentType}</h2>
              <p className="text-[13px] text-[#86868b]">{documentNumber}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-[#f5f5f7] rounded-lg">
            <X className="w-5 h-5 text-[#86868b]" />
          </button>
        </div>
        
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* To Field */}
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
              To <span className="text-[#86868b] font-normal">(multiple emails allowed)</span>
            </label>
            <div className="min-h-[44px] px-3 py-2 bg-[#f5f5f7] rounded-xl flex flex-wrap gap-2 items-center">
              {toEmails.map(email => (
                <span 
                  key={email}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0071e3]/10 text-[#0071e3] text-[13px] rounded-lg"
                >
                  <User className="w-3.5 h-3.5" />
                  {email}
                  <button 
                    onClick={() => removeToEmail(email)}
                    className="hover:bg-[#0071e3]/20 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="relative flex-1 min-w-[150px]">
                <input
                  ref={toInputRef}
                  type="email"
                  value={newToEmail}
                  onChange={(e) => setNewToEmail(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'to')}
                  onFocus={() => setShowToSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                  placeholder={toEmails.length === 0 ? "Enter email addresses..." : "Add another..."}
                  className="w-full h-7 bg-transparent border-0 text-[14px] focus:outline-none"
                />
                {/* Suggestions Dropdown */}
                {showToSuggestions && getToSuggestions().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#d2d2d7]/30 overflow-hidden z-10">
                    <div className="px-3 py-1.5 bg-[#f5f5f7] border-b border-[#d2d2d7]/30">
                      <span className="text-[11px] text-[#86868b] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Recent
                      </span>
                    </div>
                    {getToSuggestions().map(email => (
                      <button
                        key={email}
                        onClick={() => addToEmail(email)}
                        className="w-full px-3 py-2 text-left text-[13px] hover:bg-[#f5f5f7] flex items-center gap-2"
                      >
                        <User className="w-3.5 h-3.5 text-[#86868b]" />
                        {email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CC Field */}
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
              CC <span className="text-[#86868b] font-normal">(optional)</span>
            </label>
            <div className="min-h-[44px] px-3 py-2 bg-[#f5f5f7] rounded-xl flex flex-wrap gap-2 items-center">
              {ccEmails.map(email => (
                <span 
                  key={email}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#ff9500]/10 text-[#ff9500] text-[13px] rounded-lg"
                >
                  <Users className="w-3.5 h-3.5" />
                  {email}
                  <button 
                    onClick={() => removeCcEmail(email)}
                    className="hover:bg-[#ff9500]/20 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="relative flex-1 min-w-[150px]">
                <input
                  ref={ccInputRef}
                  type="email"
                  value={newCcEmail}
                  onChange={(e) => setNewCcEmail(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'cc')}
                  onFocus={() => setShowCcSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCcSuggestions(false), 200)}
                  placeholder="Add colleagues..."
                  className="w-full h-7 bg-transparent border-0 text-[14px] focus:outline-none"
                />
                {/* CC Suggestions Dropdown - Team Members + Recent */}
                {showCcSuggestions && (getTeamSuggestions().length > 0 || getCcSuggestions().length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#d2d2d7]/30 overflow-hidden z-10 max-h-64 overflow-y-auto">
                    {/* Team Members Section */}
                    {getTeamSuggestions().length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-[#5856d6]/5 border-b border-[#d2d2d7]/30">
                          <span className="text-[11px] text-[#5856d6] flex items-center gap-1 font-medium">
                            <Users className="w-3 h-3" />
                            Team Members
                          </span>
                        </div>
                        {getTeamSuggestions().map(member => (
                          <button
                            key={member.id}
                            onClick={() => addCcEmail(member.email)}
                            className="w-full px-3 py-2 text-left hover:bg-[#f5f5f7] flex items-center gap-2"
                          >
                            <div className="w-6 h-6 bg-[#5856d6]/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-medium text-[#5856d6]">
                                {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-[#1d1d1f] truncate">{member.name}</p>
                              <p className="text-[11px] text-[#86868b] truncate">{member.email}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {/* Recent Emails Section */}
                    {getCcSuggestions().length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-[#f5f5f7] border-b border-[#d2d2d7]/30">
                          <span className="text-[11px] text-[#86868b] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Recent
                          </span>
                        </div>
                        {getCcSuggestions().map(email => (
                          <button
                            key={email}
                            onClick={() => addCcEmail(email)}
                            className="w-full px-3 py-2 text-left text-[13px] hover:bg-[#f5f5f7] flex items-center gap-2"
                          >
                            <User className="w-3.5 h-3.5 text-[#86868b]" />
                            {email}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* CC me checkbox - shows current user's email dynamically */}
            {currentUserEmail && (
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ccMe}
                  onChange={(e) => setCcMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                />
                <span className="text-[13px] text-[#86868b]">
                  CC me ({currentUserName ? `${currentUserName} - ` : ''}{currentUserEmail})
                </span>
              </label>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Email message..."
              className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
            />
          </div>

          {/* Info */}
          <p className="text-[12px] text-[#86868b] flex items-center gap-2">
            <FileText className="w-4 h-4" />
            The {documentType.toLowerCase()} PDF will be attached automatically
          </p>
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-[#d2d2d7]/30">
          <button
            onClick={handleClose}
            className="flex-1 h-11 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed]"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || toEmails.length === 0}
            className="flex-1 h-11 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] disabled:bg-[#d2d2d7] flex items-center justify-center gap-2"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send {documentType}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
