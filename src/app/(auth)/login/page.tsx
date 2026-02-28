'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send code')
        return
      }

      setStep('code')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid code')
        setLoading(false)
        return
      }

      // Use window.location for a hard redirect instead of router.push
      window.location.href = '/dashboard'
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1d1d1f] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-semibold text-xl">OB</span>
          </div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f]">ExportFlow</h1>
          <p className="text-[15px] text-[#86868b] mt-2">
            {step === 'email' ? 'Sign in to your account' : 'Enter verification code'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          {step === 'email' ? (
            <form onSubmit={handleSendCode}>
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>

              {error && (
                <div className="mb-4 text-[13px] text-[#ff3b30] bg-[#ff3b30]/10 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full h-11 bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-[#d2d2d7] text-white text-[15px] font-medium rounded-xl transition-colors flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  required
                  maxLength={6}
                  className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-center tracking-[0.5em] font-mono"
                />
                <p className="text-[12px] text-[#86868b] mt-2 text-center">
                  Code sent to {email}
                </p>
              </div>

              {error && (
                <div className="mb-4 text-[13px] text-[#ff3b30] bg-[#ff3b30]/10 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full h-11 bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-[#d2d2d7] text-white text-[15px] font-medium rounded-xl transition-colors flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setError('')
                }}
                className="w-full mt-3 text-[#0071e3] text-[14px] font-medium"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>

        <p className="text-[12px] text-[#86868b] text-center mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}