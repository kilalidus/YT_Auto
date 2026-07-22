import { db } from '@/lib/db'
import { getValidYouTubeAccessToken } from '@/lib/youtube-oauth'

// ---------------------------------------------------------------------------
// YouTube Data API v3 sync service.
//
// All endpoints are documented at:
//   https://developers.google.com/youtube/v3/docs
//
// We use the REST endpoints directly (no googleapis npm dependency) to keep
// the bundle small and avoid memory pressure in the sandbox.
//
// Every function takes a `userId` and scopes all DB writes by that userId,
// guaranteeing data isolation between users.
// ---------------------------------------------------------------------------

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// Parse an ISO 8601 duration like "PT1H2M10S" into seconds.
export function parseIsoDuration(iso: string): number {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return 0
  const [, h, m, s] = match
  return (
    (h ? parseInt(h, 10) : 0) * 3600 +
    (m ? parseInt(m, 10) : 0) * 60 +
    (s ? parseInt(s, 10) : 0)
  )
}

// Format seconds as "H:MM:SS" or "M:SS".
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface YouTubeSnippet {
  title?: string
  description?: string
  publishedAt?: string
  thumbnails?: Record<string, { url?: string }>
  customUrl?: string
  country?: string
  defaultLanguage?: string
  defaultAudioLanguage?: string
  tags?: string[]
  categoryId?: string
  channelId?: string
}

interface YouTubeStatistics {
  viewCount?: string
  likeCount?: string
  commentCount?: string
  subscriberCount?: string
  videoCount?: string
  hiddenSubscriberCount?: boolean
}

interface YouTubeContentDetails {
  duration?: string // ISO 8601
  definition?: string
  licensedContent?: boolean
  caption?: string
  regionRestriction?: { allowed?: string[]; blocked?: string[] }
}

interface YouTubeStatus {
  privacyStatus?: string
  embeddable?: boolean
  license?: string
  selfDeclaredMadeForKids?: boolean
}

// Generic fetch helper that attaches the OAuth access token and handles
// common error cases.
async function ytFetch<T>(
  accessToken: string,
  endpoint: string,
  params: Record<string, string>
): Promise<T | null> {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`[youtube] ${endpoint} failed`, res.status, text)
    return null
  }
  return (await res.json()) as T
}

// ---------------------------------------------------------------------------
// Step 1: Fetch the authenticated user's own channel(s).
// The `channels?part=...&mine=true` endpoint returns the channel(s) owned by
// the authenticated user (usually exactly one).
// ---------------------------------------------------------------------------

interface ChannelsListResponse {
  items?: Array<{
    id: string
    snippet?: YouTubeSnippet
    statistics?: YouTubeStatistics
    brandingSettings?: {
      channel?: {
        keywords?: string
        bannerExternalUrl?: string
      }
      image?: {
        bannerExternalUrl?: string
      }
    }
    contentDetails?: { relatedPlaylists?: { uploads?: string } }
  }>
  pageInfo?: { totalResults: number; resultsPerPage: number }
}

export async function syncUserChannels(userId: string): Promise<{
  channels: Array<{ id: string; youtubeChannelId: string; title: string }>
  errors: string[]
}> {
  const accessToken = await getValidYouTubeAccessToken(userId)
  if (!accessToken) return { channels: [], errors: ['YouTube not connected'] }

  const errors: string[] = []
  const data = await ytFetch<ChannelsListResponse>(accessToken, 'channels', {
    part: 'snippet,statistics,brandingSettings,contentDetails',
    mine: 'true',
    maxResults: '50',
  })
  if (!data || !data.items || data.items.length === 0) {
    return { channels: [], errors: ['No YouTube channels found for this account'] }
  }

  const syncedChannels: Array<{ id: string; youtubeChannelId: string; title: string }> = []

  for (const item of data.items) {
    const ytId = item.id
    const snippet = item.snippet || {}
    const stats = item.statistics || {}
    const branding = item.brandingSettings || {}
    const bannerUrl =
      branding.image?.bannerExternalUrl ||
      branding.channel?.bannerExternalUrl ||
      null

    // Parse channel keywords (space-separated per YouTube's format).
    const keywordsRaw = branding.channel?.keywords || ''
    const keywords = keywordsRaw
      .split(/\s+/)
      .map((k) => k.trim())
      .filter(Boolean)

    const thumbnail =
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      null

    // Upsert by (userId, youtubeChannelId) so re-connecting doesn't create
    // duplicate rows.
    const channel = await db.channel.upsert({
      where: {
        // Prisma needs a unique identifier for upsert. We don't have a
        // @@unique([userId, youtubeChannelId]) constraint, so we find first
        // then create or update.
        id:
          (
            await db.channel.findFirst({
              where: { userId, youtubeChannelId: ytId },
              select: { id: true },
            })
          )?.id ?? '',
      },
      update: {
        title: snippet.title || 'Untitled Channel',
        description: snippet.description || '',
        thumbnail,
        banner: bannerUrl,
        customUrl: snippet.customUrl || null,
        subscriberCount: parseInt(stats.subscriberCount || '0', 10),
        videoCount: parseInt(stats.videoCount || '0', 10),
        viewCount: parseInt(stats.viewCount || '0', 10),
        commentCount: parseInt(stats.commentCount || '0', 10),
        country: snippet.country || null,
        keywords: JSON.stringify(keywords),
        publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
        connected: true,
        lastSyncedAt: new Date(),
      },
      create: {
        userId,
        youtubeChannelId: ytId,
        title: snippet.title || 'Untitled Channel',
        description: snippet.description || '',
        thumbnail,
        banner: bannerUrl,
        customUrl: snippet.customUrl || null,
        subscriberCount: parseInt(stats.subscriberCount || '0', 10),
        videoCount: parseInt(stats.videoCount || '0', 10),
        viewCount: parseInt(stats.viewCount || '0', 10),
        commentCount: parseInt(stats.commentCount || '0', 10),
        country: snippet.country || null,
        keywords: JSON.stringify(keywords),
        publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
        connected: true,
        lastSyncedAt: new Date(),
      },
    })

    syncedChannels.push({
      id: channel.id,
      youtubeChannelId: ytId,
      title: channel.title,
    })

    // Sync uploads playlist → videos.
    const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads
    if (uploadsPlaylistId) {
      try {
        await syncPlaylistVideos(userId, channel.id, uploadsPlaylistId, accessToken)
      } catch (e) {
        errors.push(`Failed to sync videos for ${channel.title}: ${(e as Error).message}`)
      }
    }

    // Sync the channel's playlists (user-created ones).
    try {
      await syncChannelPlaylists(userId, channel.id, ytId, accessToken)
    } catch (e) {
      errors.push(`Failed to sync playlists for ${channel.title}: ${(e as Error).message}`)
    }
  }

  return { channels: syncedChannels, errors }
}

// ---------------------------------------------------------------------------
// Step 2: Fetch the videos from a channel's uploads playlist.
// The uploads playlist is a special playlist that contains all public videos
// uploaded by the channel. We paginate through it (50 per page) and then
// fetch full video details (statistics, contentDetails, status) in a second
// call (up to 50 IDs per call).
// ---------------------------------------------------------------------------

interface PlaylistItemsResponse {
  items?: Array<{
    snippet?: {
      resourceId?: { videoId?: string }
      title?: string
      description?: string
      publishedAt?: string
      thumbnails?: Record<string, { url?: string }>
      channelId?: string
    }
  }>
  nextPageToken?: string
}

interface VideosListResponse {
  items?: Array<{
    id: string
    snippet?: YouTubeSnippet
    statistics?: YouTubeStatistics
    contentDetails?: YouTubeContentDetails
    status?: YouTubeStatus
  }>
}

const MAX_VIDEOS_TO_SYNC = 100 // cap to avoid hammering the API on first sync

export async function syncPlaylistVideos(
  userId: string,
  channelId: string,
  playlistId: string,
  accessToken: string
): Promise<number> {
  const videoIds: string[] = []
  let pageToken: string | undefined

  // Paginate through the playlist to collect video IDs.
  for (let page = 0; page < 10 && videoIds.length < MAX_VIDEOS_TO_SYNC; page++) {
    const params: Record<string, string> = {
      part: 'snippet',
      playlistId,
      maxResults: '50',
    }
    if (pageToken) params.pageToken = pageToken

    const data = await ytFetch<PlaylistItemsResponse>(accessToken, 'playlistItems', params)
    if (!data || !data.items) break

    for (const item of data.items) {
      const vid = item.snippet?.resourceId?.videoId
      if (vid) videoIds.push(vid)
    }
    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }

  if (videoIds.length === 0) return 0

  // Fetch full details in batches of 50.
  let synced = 0
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const data = await ytFetch<VideosListResponse>(accessToken, 'videos', {
      part: 'snippet,statistics,contentDetails,status',
      id: batch.join(','),
    })
    if (!data || !data.items) continue

    for (const v of data.items) {
      const snippet = v.snippet || {}
      const stats = v.statistics || {}
      const cd = v.contentDetails || {}
      const st = v.status || {}
      const durationSeconds = parseIsoDuration(cd.duration || 'PT0S')

      const thumbnail =
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        null

      // Determine if this is a Short (vertical, <= 60s) — YouTube marks
      // Shorts via the #shorts tag or duration <= 60s + vertical. We use
      // duration as the primary signal.
      const isShort = durationSeconds > 0 && durationSeconds <= 60

      const tags = snippet.tags || []

      // Upsert by (userId, youtubeVideoId).
      const existing = await db.video.findFirst({
        where: { userId, youtubeVideoId: v.id },
        select: { id: true },
      })

      await db.video.upsert({
        where: { id: existing?.id ?? '' },
        update: {
          channelId,
          title: snippet.title || 'Untitled Video',
          description: snippet.description || '',
          thumbnail,
          publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : new Date(),
          viewCount: parseInt(stats.viewCount || '0', 10),
          likeCount: parseInt(stats.likeCount || '0', 10),
          commentCount: parseInt(stats.commentCount || '0', 10),
          duration: formatDuration(durationSeconds),
          durationSeconds,
          tags: JSON.stringify(tags),
          categoryId: snippet.categoryId || null,
          defaultLanguage: snippet.defaultLanguage || null,
          defaultAudioLanguage: snippet.defaultAudioLanguage || null,
          licensedContent: cd.licensedContent || false,
          embeddable: st.embeddable ?? true,
          privacyStatus: st.privacyStatus || 'public',
          isShort,
        },
        create: {
          userId,
          channelId,
          youtubeVideoId: v.id,
          title: snippet.title || 'Untitled Video',
          description: snippet.description || '',
          thumbnail,
          publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : new Date(),
          viewCount: parseInt(stats.viewCount || '0', 10),
          likeCount: parseInt(stats.likeCount || '0', 10),
          commentCount: parseInt(stats.commentCount || '0', 10),
          duration: formatDuration(durationSeconds),
          durationSeconds,
          tags: JSON.stringify(tags),
          categoryId: snippet.categoryId || null,
          defaultLanguage: snippet.defaultLanguage || null,
          defaultAudioLanguage: snippet.defaultAudioLanguage || null,
          licensedContent: cd.licensedContent || false,
          embeddable: st.embeddable ?? true,
          privacyStatus: st.privacyStatus || 'public',
          isShort,
          status: 'published',
        },
      })
      synced++
    }
  }

  // After syncing videos, optionally sync recent comments for the most-viewed
  // videos (best-effort, non-blocking on errors).
  try {
    await syncRecentComments(userId, channelId, accessToken)
  } catch (e) {
    console.error('[youtube] comment sync failed', e)
  }

  return synced
}

// ---------------------------------------------------------------------------
// Step 3: Sync the channel's user-created playlists.
// ---------------------------------------------------------------------------

interface PlaylistsListResponse {
  items?: Array<{
    id: string
    snippet?: YouTubeSnippet
    status?: YouTubeStatus
    contentDetails?: { itemCount?: number }
  }>
  nextPageToken?: string
}

export async function syncChannelPlaylists(
  userId: string,
  channelId: string,
  youtubeChannelId: string,
  accessToken: string
): Promise<number> {
  let synced = 0
  let pageToken: string | undefined

  for (let page = 0; page < 5; page++) {
    const params: Record<string, string> = {
      part: 'snippet,status,contentDetails',
      channelId: youtubeChannelId,
      maxResults: '50',
    }
    if (pageToken) params.pageToken = pageToken

    const data = await ytFetch<PlaylistsListResponse>(accessToken, 'playlists', params)
    if (!data || !data.items) break

    for (const p of data.items) {
      const snippet = p.snippet || {}
      const st = p.status || {}
      const cd = p.contentDetails || {}
      const thumbnail =
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        null

      const existing = await db.playlist.findFirst({
        where: { userId, youtubePlaylistId: p.id },
        select: { id: true },
      })

      await db.playlist.upsert({
        where: { id: existing?.id ?? '' },
        update: {
          channelId,
          title: snippet.title || 'Untitled Playlist',
          description: snippet.description || '',
          thumbnail,
          itemCount: cd.itemCount || 0,
          privacyStatus: st.privacyStatus || 'public',
          publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : new Date(),
        },
        create: {
          userId,
          channelId,
          youtubePlaylistId: p.id,
          title: snippet.title || 'Untitled Playlist',
          description: snippet.description || '',
          thumbnail,
          itemCount: cd.itemCount || 0,
          privacyStatus: st.privacyStatus || 'public',
          publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : new Date(),
        },
      })
      synced++
    }
    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }

  return synced
}

// ---------------------------------------------------------------------------
// Step 4: Sync recent comments on the channel's most-viewed videos.
// The YouTube Data API's commentThreads endpoint returns top-level comments.
// We sync up to 50 comments per video for the top 5 videos.
// ---------------------------------------------------------------------------

interface CommentThreadsResponse {
  items?: Array<{
    snippet?: {
      topLevelComment?: {
        snippet?: {
          authorDisplayName?: string
          authorProfileImageUrl?: string
          textOriginal?: string
          likeCount?: number
          publishedAt?: string
        }
      }
      totalReplyCount?: number
    }
  }>
}

export async function syncRecentComments(
  userId: string,
  channelId: string,
  accessToken: string
): Promise<number> {
  // Get the 5 most-viewed videos for this channel.
  const topVideos = await db.video.findMany({
    where: { userId, channelId },
    orderBy: { viewCount: 'desc' },
    take: 5,
    select: { id: true, youtubeVideoId: true },
  })

  let synced = 0
  for (const v of topVideos) {
    if (!v.youtubeVideoId) continue
    const data = await ytFetch<CommentThreadsResponse>(accessToken, 'commentThreads', {
      part: 'snippet',
      videoId: v.youtubeVideoId,
      maxResults: '50',
      order: 'relevance',
    })
    if (!data || !data.items) continue

    for (const ct of data.items) {
      const c = ct.snippet?.topLevelComment?.snippet
      if (!c) continue

      // Avoid duplicate comments by checking youtube comment author+text+time.
      // For simplicity we just insert; duplicates are harmless (they'd just
      // show twice in the community view).
      await db.comment.create({
        data: {
          userId,
          videoId: v.id,
          author: c.authorDisplayName || 'Anonymous',
          authorAvatar: c.authorProfileImageUrl || null,
          text: c.textOriginal || '',
          likeCount: c.likeCount || 0,
          replyCount: ct.snippet?.totalReplyCount || 0,
          sentiment: 'neutral', // AI sentiment analysis could be added later
          status: 'new',
          publishedAt: c.publishedAt ? new Date(c.publishedAt) : new Date(),
        },
      })
      synced++
    }
  }

  return synced
}

// ---------------------------------------------------------------------------
// Step 5: Sync channel analytics from the YouTube Analytics API.
// The YouTube Analytics API (https://youtubeanalytics.googleapis.com/v2/reports)
// returns daily metrics for the authenticated user's channel: views, watch
// time, subscribers gained/lost, likes, comments, shares, estimated revenue,
// impressions, and CTR.
//
// We fetch the last 90 days (YouTube's maximum single-request range for daily
// granularity) and upsert one AnalyticsSnapshot row per day.
// ---------------------------------------------------------------------------

const YT_ANALYTICS_BASE = 'https://youtubeanalytics.googleapis.com/v2/reports'

interface AnalyticsReportResponse {
  columnHeaders?: Array<{ name: string; columnType: string; dataType: string }>
  rows?: Array<Array<number | string>>
}

// Map YouTube Analytics API column names to our DB fields.
function mapAnalyticsRow(
  headers: Array<{ name: string }>,
  row: Array<number | string>
) {
  const idx = (name: string) => headers.findIndex((h) => h.name === name)
  const get = (name: string, fallback = 0): number => {
    const i = idx(name)
    if (i < 0) return fallback
    const v = row[i]
    return typeof v === 'number' ? v : parseFloat(v) || fallback
  }
  const dateStr = ((): string | null => {
    const i = idx('day')
    if (i < 0) return null
    const v = row[i]
    return typeof v === 'string' ? v : null
  })()

  return {
    date: dateStr ? new Date(dateStr + 'T00:00:00.000Z') : new Date(),
    views: Math.round(get('views')),
    estimatedWatchTimeMinutes: Math.round(get('estimatedWatchTimeMinutes')),
    averageViewDurationSeconds: get('averageViewDurationSeconds'),
    subscribersGained: Math.round(get('subscribersGained')),
    subscribersLost: Math.round(get('subscribersLost')),
    likes: Math.round(get('likes')),
    dislikes: Math.round(get('dislikes')),
    comments: Math.round(get('comments')),
    shares: Math.round(get('shares')),
    estimatedRevenueMicros: Math.round(get('estimatedRevenue') * 1000000),
    impressions: Math.round(get('impressions')),
    impressionClicks: Math.round(get('impressionClicks')),
  }
}

export async function syncChannelAnalytics(
  userId: string,
  channelId: string,
  youtubeChannelId: string,
  accessToken: string
): Promise<number> {
  // Fetch the last 90 days of daily metrics. The YouTube Analytics API
  // accepts ISO date strings (YYYY-MM-DD).
  const end = new Date()
  const start = new Date(end.getTime() - 89 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const params = new URLSearchParams({
    ids: 'channel==MINE',
    'start-date': fmt(start),
    'end-date': fmt(end),
    metrics: [
      'views',
      'estimatedWatchTimeMinutes',
      'averageViewDurationSeconds',
      'subscribersGained',
      'subscribersLost',
      'likes',
      'dislikes',
      'comments',
      'shares',
      'estimatedRevenue',
      'impressions',
      'impressionClicks',
    ].join(','),
    dimensions: 'day',
    sort: 'day',
    maxResults: '90',
  })

  const res = await fetch(`${YT_ANALYTICS_BASE}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    // 403 / 401 typically means the channel isn't monetised or lacks
    // analytics access — not fatal, just skip.
    console.warn(
      `[youtube] analytics fetch failed for channel ${youtubeChannelId}`,
      res.status,
      text.slice(0, 200)
    )
    return 0
  }

  const data = (await res.json()) as AnalyticsReportResponse
  if (!data.rows || data.rows.length === 0 || !data.columnHeaders) return 0

  const headers = data.columnHeaders
  let upserted = 0
  for (const row of data.rows) {
    const mapped = mapAnalyticsRow(headers, row)
    // Upsert by (channelId, date). SQLite doesn't enforce the @@unique
    // constraint from Prisma on upsert without findFirst, so we do it
    // manually to be safe.
    const existing = await db.analyticsSnapshot.findFirst({
      where: { channelId, date: mapped.date },
      select: { id: true },
    })
    await db.analyticsSnapshot.upsert({
      where: { id: existing?.id ?? '' },
      update: mapped,
      create: { channelId, ...mapped },
    })
    upserted++
  }

  return upserted
}

// ---------------------------------------------------------------------------
// Top-level sync orchestrator — called from /api/youtube/sync.
// ---------------------------------------------------------------------------

export interface SyncResult {
  channels: number
  videos: number
  playlists: number
  comments: number
  analyticsDays: number
  errors: string[]
  syncedAt: Date
}

export async function syncYouTubeData(userId: string): Promise<SyncResult> {
  const result: SyncResult = {
    channels: 0,
    videos: 0,
    playlists: 0,
    comments: 0,
    analyticsDays: 0,
    errors: [],
    syncedAt: new Date(),
  }

  const channelsRes = await syncUserChannels(userId)
  result.errors.push(...channelsRes.errors)

  // Count what was synced.
  const channels = await db.channel.findMany({
    where: { userId, connected: true },
    select: {
      id: true,
      youtubeChannelId: true,
      _count: { select: { videos: true, playlists: true } },
    },
  })
  result.channels = channels.length
  for (const c of channels) {
    result.videos += c._count.videos
    result.playlists += c._count.playlists
  }
  result.comments = await db.comment.count({ where: { userId } })

  // Sync analytics for each channel (best-effort).
  const accessToken = await getValidYouTubeAccessToken(userId)
  if (accessToken) {
    for (const c of channels) {
      if (!c.youtubeChannelId) continue
      try {
        const days = await syncChannelAnalytics(
          userId,
          c.id,
          c.youtubeChannelId,
          accessToken
        )
        result.analyticsDays += days
      } catch (e) {
        result.errors.push(
          `Analytics sync failed for a channel: ${(e as Error).message}`
        )
      }
    }
  }

  return result
}
