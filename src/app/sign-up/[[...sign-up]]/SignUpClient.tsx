'use client'

import { SignUp } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function SignUpClient() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-[#000000]' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
      <header className="p-6">
        <Link 
          href="/" 
          className={`inline-flex items-center gap-2 transition-colors ${isDark ? 'text-[#98989d] hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Create your account
            </h1>
            <p className={isDark ? 'text-[#98989d]' : 'text-slate-600'}>
              Start your 14-day free trial with full access
            </p>
          </div>
          
          <SignUp
            appearance={{
              baseTheme: isDark ? dark : undefined,
              elements: {
                rootBox: 'w-full',
                card: `shadow-xl border-0 ${isDark ? '!bg-[#1c1c1e]' : ''}`,
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtons: 'hidden',
                socialButtonsBlockButton: 'hidden',
                socialButtonsProviderIcon: 'hidden',
                dividerRow: 'hidden',
                dividerLine: 'hidden',
                dividerText: 'hidden',
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                footerActionLink: 'text-blue-600 hover:text-blue-700',
                otpCodeFieldInputs: 'gap-3',
                otpCodeFieldInput: 'w-10 h-12 text-center text-lg border rounded-lg',
              },
            }}
          />

          <div className={`mt-6 p-4 rounded-lg border ${isDark ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-100'}`}>
            <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              <strong>14-day free trial includes:</strong> Full Business plan access with
              unlimited products, team members, branding, payment tracking, and more.
              No credit card required.
            </p>
          </div>
        </div>
      </main>
      
      <footer className={`p-6 text-center text-sm ${isDark ? 'text-[#636366]' : 'text-slate-500'}`}>
        &copy; {new Date().getFullYear()} ExportFlow. All rights reserved.
      </footer>
    </div>
  )
}
