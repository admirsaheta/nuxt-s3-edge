import { getKey, normalizeKey } from '../../helpers'
// @ts-ignore
import { defineEventHandler } from '#imports'

export default defineEventHandler(async (event) => {
  const key = getKey(event)

  const normalizedKey = normalizeKey(key)

  await event.context.s3.removeItem(normalizedKey, { removeMeta: true })

  return { status: 'ok' }
})
