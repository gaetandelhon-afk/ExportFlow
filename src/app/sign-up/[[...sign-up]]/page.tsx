import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import SignUpClient from './SignUpClient'

export default async function SignUpPage() {
  const { userId } = await auth()

  if (userId) {
    redirect('/dashboard')
  }

  return <SignUpClient />
}
