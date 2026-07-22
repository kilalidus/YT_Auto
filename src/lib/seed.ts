import { db } from '@/lib/db'
import { broadcastNotification } from '@/lib/notify-broadcast'

// Creates rich demo YouTube data + workflow + notes + notifications for a new user
// so the platform feels alive immediately.
export async function seedUserData(userId: string, userName: string) {
  const now = new Date()

  // 1. Demo channel
  const channel = await db.channel.create({
    data: {
      userId,
      title: `${userName || 'Creator'}'s Studio`,
      description:
        'A creative channel exploring tech, productivity, and AI-powered content. New videos every week — tutorials, reviews, and behind-the-scenes deep dives.',
      thumbnail: null,
      customUrl: '@creatorstudio',
      subscriberCount: 48230,
      videoCount: 87,
      viewCount: 1240000,
      country: 'United States',
      publishedAt: new Date('2021-03-14'),
      connected: true,
      healthScore: 78,
    },
  })

  // 2. Demo videos (mix of long-form + shorts)
  const videoData = [
    {
      title: 'I Built an AI YouTube Studio in 7 Days',
      description: 'A behind-the-scenes look at automating my entire content workflow with AI.',
      viewCount: 184000,
      likeCount: 9200,
      commentCount: 640,
      duration: '14:22',
      tags: ['ai', 'youtube', 'automation', 'workflow', 'productivity'],
      isShort: false,
      publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'The Ultimate Productivity System (2025)',
      description: 'My exact productivity stack — apps, routines, and mindset.',
      viewCount: 96400,
      likeCount: 5100,
      commentCount: 380,
      duration: '18:05',
      tags: ['productivity', 'system', 'apps', 'routine'],
      isShort: false,
      publishedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
    },
    {
      title: '5 AI Tools That Feel Illegal to Know',
      description: 'These AI tools will save you hours every single week.',
      viewCount: 312000,
      likeCount: 18700,
      commentCount: 1240,
      duration: '12:48',
      tags: ['ai', 'tools', 'automation', 'tech'],
      isShort: false,
      publishedAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Why Your Thumbnails Aren\'t Getting Clicks',
      description: 'Thumbnail psychology explained with real examples.',
      viewCount: 54800,
      likeCount: 3100,
      commentCount: 220,
      duration: '10:14',
      tags: ['thumbnail', 'ctr', 'design', 'growth'],
      isShort: false,
      publishedAt: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Short: AI wrote my video script in 30 seconds 🤯',
      description: '#shorts #ai #content',
      viewCount: 421000,
      likeCount: 28900,
      commentCount: 1800,
      duration: '0:48',
      tags: ['shorts', 'ai', 'script'],
      isShort: true,
      publishedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Short: The 3-second hook rule',
      description: '#shorts #youtube #tips',
      viewCount: 167000,
      likeCount: 9800,
      commentCount: 540,
      duration: '0:55',
      tags: ['shorts', 'hook', 'tips'],
      isShort: true,
      publishedAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Editing a viral video step-by-step',
      description: 'Watch me edit a video from raw footage to final cut.',
      viewCount: 73200,
      likeCount: 4200,
      commentCount: 290,
      duration: '21:33',
      tags: ['editing', 'tutorial', 'premiere', 'workflow'],
      isShort: false,
      publishedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'My 2025 YouTube Setup Tour',
      description: 'Full studio tour — camera, lighting, audio, and desk.',
      viewCount: 89100,
      likeCount: 5600,
      commentCount: 410,
      duration: '16:41',
      tags: ['setup', 'studio', 'gear', 'tour'],
      isShort: false,
      publishedAt: new Date(now.getTime() - 38 * 24 * 60 * 60 * 1000),
    },
  ]

  for (const v of videoData) {
    await db.video.create({
      data: {
        userId,
        channelId: channel.id,
        title: v.title,
        description: v.description,
        viewCount: v.viewCount,
        likeCount: v.likeCount,
        commentCount: v.commentCount,
        duration: v.duration,
        tags: JSON.stringify(v.tags),
        isShort: v.isShort,
        publishedAt: v.publishedAt,
        status: 'published',
      },
    })
  }

  // 3. Projects
  const proj1 = await db.project.create({
    data: {
      userId,
      channelId: channel.id,
      name: 'AI Workflow Series',
      description: 'A 6-part series on building an AI-powered YouTube workflow.',
      color: '#f43f5e',
      status: 'active',
    },
  })
  const proj2 = await db.project.create({
    data: {
      userId,
      channelId: channel.id,
      name: 'Productivity Deep Dives',
      description: 'Long-form productivity breakdowns and app reviews.',
      color: '#10b981',
      status: 'active',
    },
  })
  const proj3 = await db.project.create({
    data: {
      userId,
      name: 'Shorts Factory',
      description: 'Rapid-fire vertical shorts for maximum reach.',
      color: '#8b5cf6',
      status: 'active',
    },
  })

  // 4. Workflow tasks across stages
  const tasks = [
    { title: 'Research: AI video editing tools 2025', status: 'research', priority: 'high', project: proj1, labels: ['research', 'ai'] },
    { title: 'Script: "Building an AI YouTube Studio"', status: 'script', priority: 'high', project: proj1, labels: ['script'] },
    { title: 'Record: productivity setup walkthrough', status: 'recording', priority: 'medium', project: proj2, labels: ['record'] },
    { title: 'Edit: AI tools compilation video', status: 'editing', priority: 'high', project: proj1, labels: ['edit'] },
    { title: 'Thumbnail: viral AI thumbnail concepts', status: 'thumbnail', priority: 'urgent', project: proj1, labels: ['design'] },
    { title: 'Review: shorts hook compilation', status: 'review', priority: 'medium', project: proj3, labels: ['shorts'] },
    { title: 'Schedule: weekly upload — Friday 4pm', status: 'scheduled', priority: 'high', project: proj2, labels: ['schedule'], deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
    { title: 'Published: AI workflow intro video', status: 'published', priority: 'medium', project: proj1, labels: ['done'], completed: true },
    { title: 'Idea: "Day in the life of an AI creator"', status: 'idea', priority: 'low', project: null, labels: ['idea'] },
    { title: 'Idea: "I tried 10 AI thumbnail generators"', status: 'idea', priority: 'medium', project: proj3, labels: ['idea', 'ai'] },
    { title: 'Script: Shorts — 3 second hook rule', status: 'script', priority: 'high', project: proj3, labels: ['shorts', 'script'] },
    { title: 'Research: best upload times for tech niche', status: 'research', priority: 'low', project: proj2, labels: ['research'] },
  ]
  for (const t of tasks) {
    await db.workflowTask.create({
      data: {
        userId,
        projectId: t.project?.id ?? null,
        channelId: t.project?.channelId ?? null,
        title: t.title,
        status: t.status,
        priority: t.priority,
        labels: JSON.stringify(t.labels),
        deadline: t.deadline ?? null,
        completed: (t as { completed?: boolean }).completed ?? false,
        order: 0,
      },
    })
  }

  // 5. Notes
  const folder1 = await db.folder.create({ data: { userId, name: 'Content Ideas', color: '#f59e0b' } })
  const folder2 = await db.folder.create({ data: { userId, name: 'Scripts & Hooks', color: '#3b82f6' } })
  await db.folder.create({ data: { userId, name: 'Brand Assets', color: '#ec4899' } })

  await db.note.create({
    data: {
      userId,
      folderId: folder1.id,
      projectId: proj1.id,
      title: 'Viral Hooks Vault',
      content: `# Viral Hooks Vault

A running list of high-performing hooks.

## Pattern Interrupts
- "I was wrong about ___"
- "Nobody talks about this ___"
- "This took me 5 years to learn"

## Curiosity Gaps
- "The reason your ___ isn't working"
- "What if I told you ___"

## Checklists
- [ ] Test hook in first 3 seconds
- [ ] Match hook energy to thumbnail
- [ ] A/B test 2 hooks per video
`,
      tags: JSON.stringify(['hooks', 'scripts', 'viral']),
      pinned: true,
      favorited: true,
    },
  })
  await db.note.create({
    data: {
      userId,
      folderId: folder2.id,
      projectId: proj2.id,
      title: 'Productivity Series Outline',
      content: `# Productivity Series Outline

## Video 1 — The System
- Capture → Process → Execute
- Tools: Notion, Todoist, Calendar

## Video 2 — Deep Work
- Time blocking
- Distraction elimination

\`\`\`
const focusBlock = (start, end) => ({
  start, end, mode: 'deep'
})
\`\`\`
`,
      tags: JSON.stringify(['outline', 'productivity']),
      favorited: true,
    },
  })
  await db.note.create({
    data: {
      userId,
      projectId: proj3.id,
      title: 'Shorts Strategy Notes',
      content: `# Shorts Strategy

- Hook in first 1.5s
- Fast cuts every 2-3s
- Looped endings boost retention
- Post 3-5x per week
`,
      tags: JSON.stringify(['shorts', 'strategy']),
    },
  })
  await db.note.create({
    data: {
      userId,
      title: 'Channel Goals Q1',
      content: `# Q1 Goals

- [ ] Hit 50k subscribers
- [ ] Upload 12 long-form videos
- [ ] Post 30 shorts
- [ ] Launch 2 playlists
- [ ] Improve CTR to 8%+
`,
      tags: JSON.stringify(['goals', 'planning']),
      pinned: true,
    },
  })

  // 6. File assets (metadata only, no real binary)
  const fileDefs = [
    { name: 'AI-Studio-Thumbnail-v3.png', type: 'thumbnail', mimeType: 'image/png', size: 482000 },
    { name: 'Productivity-Setup-BRoll.mp4', type: 'video', mimeType: 'video/mp4', size: 184000000 },
    { name: 'Brand-Logo-Pack.zip', type: 'asset', mimeType: 'application/zip', size: 2400000 },
    { name: 'Series-Script-Draft.docx', type: 'document', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 86000 },
    { name: 'Hook-Audio-Memo.m4a', type: 'audio', mimeType: 'audio/mp4', size: 1200000 },
    { name: 'Channel-Banner-2025.png', type: 'image', mimeType: 'image/png', size: 980000 },
  ]
  for (const f of fileDefs) {
    await db.fileAsset.create({
      data: {
        userId,
        projectId: proj1.id,
        name: f.name,
        type: f.type,
        mimeType: f.mimeType,
        size: f.size,
        url: '',
      },
    })
  }

  // 7. Notifications
  const notifs = [
    { type: 'upload', title: 'Upload Reminder', message: 'Your scheduled video "AI Workflow Part 2" is due to publish Friday 4:00 PM.' },
    { type: 'recommendation', title: 'New AI Recommendation', message: 'Gemini found 3 SEO improvements for your latest video.' },
    { type: 'trending', title: 'Trending Opportunity', message: '"AI video editing" is trending in your niche — consider a video this week.' },
    { type: 'deadline', title: 'Workflow Deadline', message: 'Task "Thumbnail: viral AI thumbnail concepts" is marked urgent.' },
    { type: 'weekly', title: 'Weekly Report Ready', message: 'Your weekly performance report is available in Analytics.' },
  ]
  for (let i = 0; i < notifs.length; i++) {
    const n = await db.notification.create({
      data: {
        userId,
        type: notifs[i].type,
        title: notifs[i].title,
        message: notifs[i].message,
        read: i > 2,
        createdAt: new Date(now.getTime() - i * 3 * 60 * 60 * 1000),
      },
    })
    // Fire-and-forget broadcast — at registration time the user likely has no
    // connected socket yet, but we still call so any concurrent session (e.g.
    // a second tab opened during signup) would receive it. Harmless if no
    // client is listening.
    broadcastNotification(userId, {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt.toISOString(),
      read: n.read,
    })
  }

  // 8. Content events (calendar)
  const events = [
    { title: 'Publish: AI Workflow Part 2', date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), type: 'publish', status: 'confirmed', project: proj1 },
    { title: 'Record: Productivity walkthrough', date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), type: 'record', status: 'planned', project: proj2 },
    { title: 'Edit: Shorts compilation', date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), type: 'edit', status: 'planned', project: proj3 },
    { title: 'Review: AI tools video', date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), type: 'review', status: 'planned', project: proj1 },
    { title: 'Publish: Shorts — Hook rule', date: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), type: 'publish', status: 'planned', project: proj3 },
    { title: 'Strategy meeting', date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), type: 'meeting', status: 'planned', project: null },
  ]
  for (const e of events) {
    await db.contentEvent.create({
      data: {
        userId,
        projectId: e.project?.id ?? null,
        title: e.title,
        date: e.date,
        type: e.type,
        status: e.status,
      },
    })
  }

  // 9. Comments for community moderation (seeded against created videos)
  const createdVideos = await db.video.findMany({
    where: { userId },
    select: { id: true, title: true, isShort: true },
  })
  const commentDefs: Array<{
    author: string
    text: string
    likeCount: number
    replyCount: number
    sentiment: 'positive' | 'neutral' | 'negative'
    status: 'new' | 'approved' | 'held' | 'spam' | 'hidden'
    hoursAgo: number
  }> = [
    { author: 'Sarah Mitchell', text: 'This is honestly the best AI workflow breakdown I have seen all year. Bookmarked!', likeCount: 240, replyCount: 8, sentiment: 'positive', status: 'new', hoursAgo: 2 },
    { author: 'TechWithMarcus', text: 'Wait, how did you get Gemini to write the hooks so naturally? Need a tutorial on that specifically!', likeCount: 92, replyCount: 4, sentiment: 'positive', status: 'new', hoursAgo: 4 },
    { author: 'ProdCreator99', text: 'Tried this for a week and my CTR jumped from 4.2% to 7.8%. Wild. Thank you!', likeCount: 156, replyCount: 12, sentiment: 'positive', status: 'approved', hoursAgo: 6 },
    { author: 'anonymous_viewer', text: 'CLICK MY CHANNEL FOR FREE SUBS!!1!', likeCount: 0, replyCount: 0, sentiment: 'neutral', status: 'spam', hoursAgo: 1 },
    { author: 'Devon R.', text: 'The thumbnail at 3:42 is misleading, the video does not actually show that part. Clickbait much?', likeCount: 18, replyCount: 6, sentiment: 'negative', status: 'new', hoursAgo: 8 },
    { author: 'Maya Creates', text: 'Day 47 of asking for a Notion-style notes deep dive. Please!', likeCount: 64, replyCount: 2, sentiment: 'neutral', status: 'new', hoursAgo: 10 },
    { author: 'Jonathan Park', text: 'Genuinely changed how I plan my content. The Kanban + AI combo is chef kiss.', likeCount: 132, replyCount: 9, sentiment: 'positive', status: 'approved', hoursAgo: 14 },
    { author: 'spam_bot_x42', text: 'Make $5000/day from home!!! Visit freesubs dot ru', likeCount: 0, replyCount: 0, sentiment: 'neutral', status: 'spam', hoursAgo: 16 },
    { author: 'Lila Wang', text: 'Could you do a follow-up comparing TubeBuddy vs vidIQ vs this? Would be super helpful.', likeCount: 47, replyCount: 3, sentiment: 'positive', status: 'new', hoursAgo: 18 },
    { author: 'grumpy_creator', text: 'AI scripts all sound the same honestly. Where is the human voice?', likeCount: 31, replyCount: 22, sentiment: 'negative', status: 'held', hoursAgo: 20 },
    { author: 'Priya K.', text: 'The retention tips alone were worth the subscribe. New here!', likeCount: 88, replyCount: 1, sentiment: 'positive', status: 'approved', hoursAgo: 22 },
    { author: 'KennyTutorials', text: 'Can confirm the Friday 4pm upload time works for the tech niche. Been testing it 3 months.', likeCount: 55, replyCount: 4, sentiment: 'positive', status: 'new', hoursAgo: 26 },
    { author: 'AngryBird', text: 'Why does everyone copy MrBeast thumbnails now, including this channel?', likeCount: 12, replyCount: 8, sentiment: 'negative', status: 'held', hoursAgo: 28 },
    { author: 'Nadia S.', text: 'The 3-second hook rule short broke my brain in the best way. Ty!', likeCount: 220, replyCount: 5, sentiment: 'positive', status: 'approved', hoursAgo: 32 },
    { author: 'question_asker', text: 'What mic are you using in this video? Audio is crisp!', likeCount: 24, replyCount: 2, sentiment: 'neutral', status: 'new', hoursAgo: 36 },
    { author: 'fan_of_the_channel', text: 'Been here since 10k subs. The growth has been insane to watch. Congrats!', likeCount: 76, replyCount: 0, sentiment: 'positive', status: 'approved', hoursAgo: 40 },
    { author: 'random_troll', text: 'lol fake views', likeCount: 3, replyCount: 1, sentiment: 'negative', status: 'hidden', hoursAgo: 44 },
    { author: 'EmmaCodes', text: 'Would love a behind-the-scenes on your editing workflow. Première or DaVinci?', likeCount: 41, replyCount: 3, sentiment: 'neutral', status: 'new', hoursAgo: 48 },
  ]
  // Distribute comments across the most-viewed videos
  const targetVideos = createdVideos.slice(0, 6)
  for (let i = 0; i < commentDefs.length; i++) {
    const c = commentDefs[i]
    const v = targetVideos[i % targetVideos.length]
    await db.comment.create({
      data: {
        userId,
        videoId: v.id,
        author: c.author,
        text: c.text,
        likeCount: c.likeCount,
        replyCount: c.replyCount,
        sentiment: c.sentiment,
        status: c.status,
        publishedAt: new Date(now.getTime() - c.hoursAgo * 60 * 60 * 1000),
      },
    })
  }

  return { channel, videoCount: videoData.length }
}
