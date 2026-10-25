import { getStatus } from '~/server/chat-service'

export async function GET() {
  return Response.json(await getStatus())
}
