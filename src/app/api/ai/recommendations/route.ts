import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateRecommendations } from "@/lib/ai";
import { broadcastNotification } from "@/lib/notify-broadcast";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseJSON(value: string | null | undefined, fallback: unknown = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// Map generateRecommendations keys -> Recommendation type strings
const TYPE_MAP: Record<string, string> = {
  titles: "title",
  descriptions: "description",
  seo: "seo",
  tags: "tags",
  keywords: "keywords",
  trending: "trending",
  videoIdeas: "videoIdeas",
  playlist: "playlist",
  uploadTimes: "uploadTimes",
  engagement: "engagement",
  growth: "growth",
  calendar: "calendar",
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const channelId = (body.channelId ?? "").toString();
    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    const channel = await db.channel.findFirst({
      where: { id: channelId, userId: user.id },
      include: {
        videos: {
          orderBy: { publishedAt: "desc" },
          take: 20,
        },
      },
    });
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Derive niche from most common tags + recent video titles
    const tagCounts = new Map<string, number>();
    for (const v of channel.videos) {
      const tags = parseJSON(v.tags, []) as string[];
      for (const t of tags) {
        if (typeof t === "string" && t.trim()) {
          tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
        }
      }
    }
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    const recentTopics = channel.videos.slice(0, 8).map((v) => v.title);
    const niche = topTags.length > 0 ? topTags.join(", ") : "General";

    const recs = await generateRecommendations({
      title: channel.title,
      niche,
      subscriberCount: channel.subscriberCount,
      recentTopics,
    });

    // Execute database writes concurrently to reduce response latency
    const created = await Promise.all(
      Object.entries(recs).map(async ([key, items]) => {
        const mappedType = TYPE_MAP[key] ?? key;
        const itemsArr = Array.isArray(items) ? items : [];

        const rec = await db.recommendation.create({
          data: {
            userId: user.id,
            channelId: channel.id,
            type: mappedType,
            content: JSON.stringify({ items: itemsArr }),
          },
        });

        return {
          id: rec.id,
          type: mappedType,
          content: { items: itemsArr },
        };
      })
    );

    // Create a notification
    const notif = await db.notification.create({
      data: {
        userId: user.id,
        type: "recommendation",
        title: "New AI recommendations",
        message: `Fresh recommendations were generated for "${channel.title}".`,
        read: false,
      },
    });

    // Fan-out to realtime clients
    broadcastNotification(user.id, {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      createdAt: notif.createdAt.toISOString(),
      read: notif.read,
    });

    // Group by type
    const grouped: Record<string, { items: unknown[] }> = {};
    for (const c of created) {
      grouped[c.type] = c.content;
    }

    return NextResponse.json({
      recommendations: grouped,
      niche,
      channelId: channel.id,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[ai/recommendations] error", err);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}