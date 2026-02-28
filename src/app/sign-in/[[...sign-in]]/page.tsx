import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import SignInClient from './SignInClient'

export default async function SignInPage() {
  const { userId } = await auth()

  if (userId) {
    redirect('/dashboard')
  }

  return <SignInClient />
}
