import { getAdminStats } from '@/lib/actions/admin'
import { StatsCard } from '@/components/admin/stats-card'
import { Users, FileText, LayoutGrid, TrendingUp } from 'lucide-react'

export default async function AdminDashboardPage() {
  const stats = await getAdminStats()

  if ('error' in stats) {
    return <div className="p-6 text-destructive">{stats.error}</div>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard
          title="Tổng thành viên"
          value={stats.totalMembers}
          sub={`+${stats.newMembersThisWeek} trong 7 ngày qua`}
          icon={Users}
        />
        <StatsCard
          title="Tổng bài viết"
          value={stats.totalPosts}
          sub={`+${stats.newPostsThisWeek} trong 7 ngày qua`}
          icon={FileText}
        />
        <StatsCard
          title="Tổng spaces"
          value={stats.totalSpaces}
          icon={LayoutGrid}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard
          title="Thành viên mới (7 ngày)"
          value={stats.newMembersThisWeek}
          icon={TrendingUp}
        />
        <StatsCard
          title="Bài viết mới (7 ngày)"
          value={stats.newPostsThisWeek}
          icon={TrendingUp}
        />
      </div>
    </div>
  )
}
