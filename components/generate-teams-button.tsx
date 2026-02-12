'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface GenerateTeamsButtonProps {
  sessionId: string
}

export function GenerateTeamsButton({ sessionId }: GenerateTeamsButtonProps) {
  return (
    <Link href={`/staff/sessions/${sessionId}/teams`}>
      <Button variant="primary" className="w-full">
        Voir les équipes
      </Button>
    </Link>
  )
}
