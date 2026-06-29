import { NextResponse } from 'next/server'
import { agentOpenApiSpec } from '@/lib/agent-openapi'

// Spec publique : ne contient aucun secret, sert d'outillage à l'agent.
export async function GET() {
  return NextResponse.json(agentOpenApiSpec)
}
