import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// Removed unused imports
import { Shield, Eye, Flag, TrendUp as TrendingUp, Warning as AlertTriangle, Clock, Pulse as Activity, ChartBar as BarChart3 } from '@phosphor-icons/react'
import { useDataStore } from '@/lib/useDataStore'

import type { User } from '@/types/index';
import type { ModerationReport, ModerationAction, AutoModerationRule, UserModerationStatus } from '@/types/index';

interface ModerationDashboardProps {
  currentUser: User
  isUserModerator?: boolean
}

interface ModerationStats {
  totalReports: number
  pendingReports: number
  resolvedToday: number
  autoDetectedToday: number
  totalActions: number
  activeActions: number
  flaggedContent: number
  communityHealth: number
}

interface TrendData {
  date: string
  reports: number
  actions: number
  autoDetected: number
}

export function ModerationDashboard({ currentUser: _currentUser, isUserModerator = false }: ModerationDashboardProps) {
  
  const [reports] = useDataStore<ModerationReport>('moderation-reports', 'report')
  const [actions] = useDataStore<ModerationAction>('moderation-actions', 'moderation-action')
  const [autoRules] = useDataStore<AutoModerationRule>('auto-moderation-rules', 'auto-moderation-rule')
  const [_userStatuses] = useDataStore<UserModerationStatus>('user-moderation-status', 'user-moderation-status')
  void _currentUser; void _userStatuses
  
  const [stats, setStats] = useState<ModerationStats>({
    totalReports: 0,
    pendingReports: 0,
    resolvedToday: 0,
    autoDetectedToday: 0,
    totalActions: 0,
    activeActions: 0,
    flaggedContent: 0,
    communityHealth: 85
  })

  const [trendData, setTrendData] = useState<TrendData[]>([])

  const calculateCommunityHealth = useCallback((): number => {
    if ((reports?.length ?? 0) === 0) return 95

    const recentReports = (reports || []).filter(r => 
      r.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
    )
    
    const criticalReports = recentReports.filter(r => r.severity === 'critical').length
    const highReports = recentReports.filter(r => r.severity === 'high').length
    const totalRecentReports = recentReports.length

    if (totalRecentReports === 0) return 95

    const criticalWeight = criticalReports * 0.4
    const highWeight = highReports * 0.2
    const otherWeight = (totalRecentReports - criticalReports - highReports) * 0.1

    const healthScore = Math.max(60, 100 - (criticalWeight + highWeight + otherWeight) * 5)
    return Math.round(healthScore)
  }, [reports])

  const generateTrendData = useCallback((): TrendData[] => {
    const data: TrendData[] = []
    const now = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const dayStart = date.getTime()
      const dayEnd = dayStart + 24 * 60 * 60 * 1000

      const dayReports = (reports || []).filter(r => 
        r.timestamp >= dayStart && r.timestamp < dayEnd
      ).length

      const dayActions = (actions || []).filter(a => 
        a.timestamp >= dayStart && a.timestamp < dayEnd
      ).length

      const dayAutoDetected = (reports || []).filter(r => 
        r.autoDetected && r.timestamp >= dayStart && r.timestamp < dayEnd
      ).length

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        reports: dayReports,
        actions: dayActions,
        autoDetected: dayAutoDetected
      })
    }
    
    return data
  }, [reports, actions])

  useEffect(() => {
    if (!isUserModerator) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    const newStats: ModerationStats = {
      totalReports: reports?.length ?? 0,
      pendingReports: reports?.filter(r => r.status === 'pending').length ?? 0,
      resolvedToday: reports?.filter(r => 
        r.status !== 'pending' && r.timestamp >= todayTimestamp
      ).length ?? 0,
      autoDetectedToday: reports?.filter(r => 
        r.autoDetected && r.timestamp >= todayTimestamp
      ).length ?? 0,
      totalActions: actions?.length ?? 0,
      activeActions: actions?.filter(a => a.active).length ?? 0,
      flaggedContent: reports?.filter(r => r.status === 'pending').length ?? 0,
      communityHealth: calculateCommunityHealth()
    }

    setStats(newStats)
    setTrendData(generateTrendData())
  }, [reports, actions, isUserModerator, calculateCommunityHealth, generateTrendData])

  const getHealthColor = (score: number): string => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthBadge = (score: number): { variant: string, text: string } => {
    if (score >= 80) return { variant: 'default', text: 'Healthy' }
    if (score >= 60) return { variant: 'secondary', text: 'Moderate' }
    return { variant: 'destructive', text: 'Needs Attention' }
  }

  if (!isUserModerator) {
    return (
      <Card className="p-8 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">Access Restricted</h3>
        <p className="text-muted-foreground">
          You need moderator privileges to view the moderation dashboard.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Moderation Dashboard
          </h2>
          <p className="text-muted-foreground">Monitor community health and moderation activity</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Community Health</div>
            <div className={`text-xl font-bold ${getHealthColor(stats.communityHealth)}`}>
              {stats.communityHealth}%
            </div>
          </div>
          <div className="w-16 h-16">
            <div className="relative w-full h-full">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.communityHealth / 100)}`}
                  className={getHealthColor(stats.communityHealth)}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReports}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalReports} total reports
            </p>
            {stats.pendingReports > 0 && (
              <Badge variant="destructive" className="mt-1">
                Requires attention
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Detected Today</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.autoDetectedToday}</div>
            <p className="text-xs text-muted-foreground">
              {(autoRules || []).filter(r => r.enabled).length} rules active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions Today</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolvedToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeActions} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Community Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(stats.communityHealth)}`}>
              {stats.communityHealth}%
            </div>
            <Badge variant="default" className="mt-1">
              {getHealthBadge(stats.communityHealth).text}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards */}
      {stats.pendingReports > 5 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800">High Report Volume</h4>
                <p className="text-sm text-yellow-700">
                  You have {stats.pendingReports} pending reports. Consider reviewing them soon.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.communityHealth < 70 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-800">Community Health Alert</h4>
                <p className="text-sm text-red-700">
                  Community health is below optimal. Increased moderation may be needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            7-Day Activity Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Simple trend visualization */}
            <div className="grid grid-cols-7 gap-2">
              {trendData.map((day, index) => {
                const bucket = (val: number) => Math.min(48, Math.max(4, val * 8));
                const mapToClass = (px: number) => {
                  if (px <= 4) return 'h-bar-4';
                  if (px <= 8) return 'h-bar-8';
                  if (px <= 16) return 'h-bar-16';
                  if (px <= 24) return 'h-bar-24';
                  if (px <= 32) return 'h-bar-32';
                  if (px <= 40) return 'h-bar-40';
                  return 'h-bar-48';
                };

                const reportsPx = bucket(day.reports);
                const actionsPx = bucket(day.actions);
                const autoPx = bucket(day.autoDetected);

                return (
                  <div key={index} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{day.date}</div>
                    <div className="space-y-1">
                      <div className={`bg-blue-200 rounded ${mapToClass(reportsPx)}`} title={`${day.reports} reports`} />
                      <div className={`bg-green-200 rounded ${mapToClass(actionsPx)}`} title={`${day.actions} actions`} />
                      <div className={`bg-yellow-200 rounded ${mapToClass(autoPx)}`} title={`${day.autoDetected} auto-detected`} />
                    </div>
                    <div className="text-xs font-medium mt-1">{day.reports}</div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-200 rounded" />
                <span>Reports</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-200 rounded" />
                <span>Actions</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-200 rounded" />
                <span>Auto-detected</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(reports || []).slice(0, 5).map(report => (
                 <div key={report.id} className="flex items-center justify-between">
                   <div className="flex-1">
                     <p className="text-sm font-medium truncate">{report.contentPreview}</p>
                     <p className="text-xs text-muted-foreground">
                       {report.reason} • by {report.reporterName}
                     </p>
                   </div>
                   <Badge 
                     variant={
                       report.status === 'pending' ? 'default' :
                       report.status === 'approved' ? 'destructive' : 'secondary'
                     }
                     className="ml-2"
                   >
                     {report.status}
                   </Badge>
                 </div>
              ))}
              {(reports || []).length === 0 && (
                 <p className="text-sm text-muted-foreground text-center py-4">
                   No reports yet
                 </p>
               )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Recent Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(actions || []).slice(0, 5).map(action => (
                 <div key={action.id} className="flex items-center justify-between">
                   <div className="flex-1">
                     <p className="text-sm font-medium">{action.type.replace('_', ' ')}</p>
                     <p className="text-xs text-muted-foreground">
                       {action.targetUserName} • by {action.moderatorName}
                     </p>
                   </div>
                   <Badge variant={action.active ? 'default' : 'secondary'} className="ml-2">
                     {action.active ? 'Active' : 'Expired'}
                   </Badge>
                 </div>
              ))}
              {(actions || []).length === 0 && (
                 <p className="text-sm text-muted-foreground text-center py-4">
                   No actions taken yet
                 </p>
               )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}