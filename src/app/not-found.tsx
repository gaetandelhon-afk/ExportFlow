import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="text-center">
        <div 
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'var(--color-logo-bg)' }}
        >
          <span className="text-white font-bold text-3xl">404</span>
        </div>
        
        <h1 
          className="text-[28px] font-semibold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Page not found
        </h1>
        <p 
          className="text-[15px] mb-8 max-w-md"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Sorry, we couldn&apos;t find the page you&apos;re looking for. 
          It might have been moved or deleted.
        </p>
        
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Go back
          </Link>
          <Link href="/dashboard" className="btn-primary">
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}