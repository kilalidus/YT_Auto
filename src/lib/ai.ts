import ZAI from 'z-ai-web-dev-sdk'

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function runLLM(
  systemPrompt: string,
  userMessage: string,
  opts?: { json?: boolean }
): Promise<string> {
  try {
    const zai = await getZAI()
    const messages: ChatMessage[] = [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })
    const content = completion.choices[0]?.message?.content ?? ''
    return content
  } catch (err) {
    console.error('[LLM] error:', err)
    throw err
  }
}

export async function runJSON<T = unknown>(
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const content = await runLLM(
    systemPrompt +
      '\n\nIMPORTANT: Respond with ONLY valid JSON (no markdown fences, no extra text).',
    userMessage
  )
  // Strip markdown fences if present
  let cleaned = content.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // try to extract first {...} or [...]
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (match) {
      try {
        return JSON.parse(match[1]) as T
      } catch {
        // fall through
      }
    }
    throw new Error('Failed to parse LLM JSON response')
  }
}

// --- Domain-specific AI helpers ---

export async function analyzeChannel(channelInfo: {
  title: string
  description: string
  subscriberCount: number
  videoCount: number
  viewCount: number
  recentVideos: Array<{
    title: string
    viewCount: number
    likeCount: number
    commentCount: number
    publishedAt: string
    tags: string[]
    duration: string
    isShort: boolean
  }>
}) {
  const system = `You are an expert YouTube strategist and channel analyst. Analyze the channel's performance, content quality, audience engagement, upload consistency, SEO quality, and growth opportunities. Be specific, data-driven, and actionable. Respond in valid JSON only.`
  const user = `Analyze this YouTube channel and respond as JSON with this exact schema:
{
  "healthScore": <number 0-100>,
  "summary": "<2-3 sentence overview>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "performance": { "rating": "<Excellent|Good|Average|Needs Work>", "note": "<short note>" },
  "engagement": { "rating": "<string>", "avgEngagementRate": "<estimated %>", "note": "<short note>" },
  "consistency": { "rating": "<string>", "uploadFrequency": "<estimated>", "note": "<short note>" },
  "seo": { "rating": "<string>", "score": <0-100>, "note": "<short note>" },
  "retention": { "trend": "<improving|stable|declining>", "note": "<short note>" },
  "ctrOpportunities": ["<opportunity 1>", "<opportunity 2>"]
}

Channel: ${channelInfo.title}
Description: ${channelInfo.description}
Subscribers: ${channelInfo.subscriberCount}
Videos: ${channelInfo.videoCount}
Total Views: ${channelInfo.viewCount}

Recent videos:
${JSON.stringify(channelInfo.recentVideos, null, 2)}`

  return runJSON<{
    healthScore: number
    summary: string
    strengths: string[]
    weaknesses: string[]
    performance: { rating: string; note: string }
    engagement: { rating: string; avgEngagementRate: string; note: string }
    consistency: { rating: string; uploadFrequency: string; note: string }
    seo: { rating: string; score: number; note: string }
    retention: { trend: string; note: string }
    ctrOpportunities: string[]
  }>(system, user)
}

export async function generateRecommendations(channelInfo: {
  title: string
  niche: string
  subscriberCount: number
  recentTopics: string[]
}) {
  const system = `You are a YouTube growth expert. Provide actionable, specific recommendations. Respond in valid JSON only.`
  const user = `Provide recommendations for this channel. Respond as JSON:
{
  "titles": ["<3 catchy video title suggestions>"],
  "descriptions": ["<2 description improvement tips>"],
  "seo": ["<2 SEO improvements>"],
  "tags": ["<6 recommended tags>"],
  "keywords": ["<5 target keywords>"],
  "trending": ["<3 trending topic ideas>"],
  "videoIdeas": ["<4 concrete video ideas>"],
  "playlist": ["<2 playlist improvement suggestions>"],
  "uploadTimes": ["<3 best upload time windows>"],
  "engagement": ["<3 audience engagement tips>"],
  "growth": ["<3 growth strategy steps>"],
  "calendar": ["<3 content calendar suggestions for the next 2 weeks>"]
}

Channel: ${channelInfo.title}
Niche: ${channelInfo.niche}
Subscribers: ${channelInfo.subscriberCount}
Recent topics: ${channelInfo.recentTopics.join(', ')}`

  return runJSON<{
    titles: string[]
    descriptions: string[]
    seo: string[]
    tags: string[]
    keywords: string[]
    trending: string[]
    videoIdeas: string[]
    playlist: string[]
    uploadTimes: string[]
    engagement: string[]
    growth: string[]
    calendar: string[]
  }>(system, user)
}

export async function generateScript(params: {
  type: string
  topic: string
  audience: string
  tone: string
  duration: string
  channelName: string
  extra?: string
}) {
  const typeMap: Record<string, string> = {
    full: 'a complete video script with hook, intro, main sections, storytelling, and call-to-action',
    hook: '3 powerful hook variations (under 15 seconds each)',
    intro: 'an engaging channel intro script (under 30 seconds)',
    shorts: 'a YouTube Shorts script (under 60 seconds, fast-paced)',
    podcast: 'a podcast episode script with segments and guest prompts',
    outline: 'a structured video outline with timestamps',
    thumbnail: '5 high-CTR thumbnail text/visual ideas',
  }
  const system = `You are a professional YouTube scriptwriter who crafts engaging, retention-optimized scripts. Use markdown formatting with clear sections.`
  const user = `Write ${typeMap[params.type] || 'a video script'}.

Topic: ${params.topic}
Target audience: ${params.audience}
Tone: ${params.tone}
Estimated duration: ${params.duration}
Channel name: ${params.channelName}
${params.extra ? `Additional notes: ${params.extra}` : ''}

Make it engaging, natural to speak, and optimized for retention. Use markdown with clear headings (## Hook, ## Intro, ## Main Content, ## Call to Action) where appropriate.`

  return runLLM(system, user)
}

export interface ContentIdea {
  title: string
  hook: string
  format: string
  why: string
  difficulty: string
  estimatedViews: string
  tags: string[]
}

export async function generateContentIdeas(params: {
  niche: string
  audience: string
  channelName: string
  count?: number
}) {
  const count = Math.max(1, Math.min(12, params.count ?? 8))
  const system = `You are a senior YouTube content strategist and creative director who specializes in helping creators find fresh, high-performing video concepts. You think in terms of audience psychology, search demand, retention patterns, and viral mechanics. You always respond with valid JSON only.`
  const user = `Generate ${count} fresh YouTube video ideas for the channel below. Each idea MUST be distinct (vary formats, angles, and difficulty). Respond as JSON with this exact schema:
{
  "ideas": [
    {
      "title": "<catchy, clickable video title under 70 chars>",
      "hook": "<one-sentence opening hook that grabs attention in the first 5 seconds>",
      "format": "<one of: tutorial | review | shorts | vlog | listicle | debate | interview>",
      "why": "<1-2 sentence explanation of why this idea resonates with this specific audience>",
      "difficulty": "<one of: easy | medium | hard>",
      "estimatedViews": "<a realistic range string like '5K-15K' or '50K-150K'>",
      "tags": ["<3-5 lowercase SEO tags relevant to the idea>"]
    }
  ]
}

Channel name: ${params.channelName || 'My Channel'}
Niche / topics: ${params.niche || 'General'}
Target audience: ${params.audience || 'General audience'}

Rules:
- Return exactly ${count} ideas in the "ideas" array.
- "format" MUST be one of the literal strings: tutorial, review, shorts, vlog, listicle, debate, interview.
- "difficulty" MUST be one of: easy, medium, hard.
- Mix formats so the batch has variety (don't return all tutorials).
- Titles should be specific and clickable, not generic.
- Tags should be 3-5 short lowercase keywords.`

  return runJSON<{ ideas: ContentIdea[] }>(system, user)
}

export async function chatAssistant(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: string
) {
  const system = `You are YouTubeFlow AI, an expert YouTube strategist and content creation assistant. Help the user with channel growth, content strategy, scripts, SEO, and analytics. Be concise, specific, and actionable.${context ? `\n\nCurrent context:\n${context}` : ''}`
  const zai = await getZAI()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: system },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ],
    thinking: { type: 'disabled' },
  })
  return completion.choices[0]?.message?.content ?? ''
}
