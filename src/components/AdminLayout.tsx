'use client'

import { useEffect, useState } from 'react'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    
    // Initial check
    checkWidth()
    
    // Listen for resize
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  return (
    <main 
      style={{
        minHeight: '100vh',
        paddingLeft: isDesktop ? 256 : 0,
        paddingTop: isDesktop ? 0 : 56,
      }}
    >
      <div className="p-4 sm:p-6 lg:p-8 w-full">
        {children}
      </div>
    </main>
  )
}
