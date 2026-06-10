import { redirect } from 'next/navigation'

// The dashboard landing was removed — Projects is the post-login home.
// This stub keeps old bookmarks and stale links working.
export default function DashboardPage() {
  redirect('/user/projects')
}
