// Migration disabled: upvote->likes migration not required for dev (dummy data).
export async function migrateUpvotesToLikes() {
  console.log('[migrate] migrateUpvotesToLikes: skipped (not required for this workspace)')
  return { updated: 0 }
}

if (require.main === module) {
  console.log('[migrate] invoked but skipped (not required)')
  process.exit(0)
}
