import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { analyzeChannel } from "@/lib/ai";
import { pusherServer } from "@/lib/pusher-server";

// Safe Pusher Trigger helper (won't crash if Pusher env vars are missing)
async function safePusherTrigger(channelId: string, event: string, data: Record<string, unknown>) {
  try {
    if (process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY) {
      await pusherServer.trigger(`channel-${channelId}`, event, data);
    }
  } catch (err) {
    console.warn("Pusher trigger skipped/failed:", err instanceof Error ? err.message : err);
  }
}

function parseJSON(value: string | null | undefined, fallback: unknown = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  let currentChannelId = "";

  try {
    console.log("========== /api/ai/analyze START ==========");

    console.log("1. Authenticating user...");
    const user = await requireUser();
    if (!user || !user.id) {
      console.error("Auth failed: User object empty");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("User authenticated:", user.id);

    const body = await req.json().catch(() => ({}));
    const channelId = (body.channelId ?? "").toString();
    currentChannelId = channelId;

    if (!channelId) {
      console.error("Validation failed: channelId missing");
      return NextResponse.json(
        { error: "channelId is required" },
        { status: 400 }
      );
    }

    await safePusherTrigger(channelId, "ai-status", {
      status: "loading",
      message: "Loading channel data and recent videos...",
    });

    console.log("2. Querying database for channelId:", channelId);

    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        userId: user.id,
      },
      include: {
        videos: {
          orderBy: {
            publishedAt: "desc",
          },
          take: 8,
        },
      },
    });

    if (!channel) {
      console.error("Channel not found in DB for user:", user.id);
      await safePusherTrigger(channelId, "ai-status", {
        status: "error",
        message: "Channel not found.",
      });

      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    console.log("Channel found:", channel.title);

    const recentVideos = (channel.videos || []).map((v) => ({
      title: v.title ?? "",
      viewCount: v.viewCount ?? 0,
      likeCount: v.likeCount ?? 0,
      commentCount: v.commentCount ?? 0,
      publishedAt: v.publishedAt ? v.publishedAt.toISOString() : new Date().toISOString(),
      tags: parseJSON(v.tags, []) as string[],
      duration: v.duration ?? "",
      isShort: Boolean(v.isShort),
    }));

    await safePusherTrigger(channelId, "ai-status", {
      status: "analyzing",
      message: "Analyzing channel performance with Gemini AI...",
    });

    console.log("3. Invoking analyzeChannel (Gemini)...");

    const analysis = await analyzeChannel({
      title: channel.title,
      description: channel.description ?? "",
      subscriberCount: channel.subscriberCount ?? 0,
      videoCount: channel.videoCount ?? 0,
      viewCount: channel.viewCount ?? 0,
      recentVideos,
    });

    console.log("Gemini returned response successfully.");

    const healthScore =
      typeof analysis.healthScore === "number" && !Number.isNaN(analysis.healthScore)
        ? Math.max(0, Math.min(100, Math.round(analysis.healthScore)))
        : 0;

    await safePusherTrigger(channelId, "ai-status", {
      status: "saving",
      message: "Saving AI analysis results...",
    });

    console.log("4. Storing analysis in database...");

    const stored = await db.aIAnalysis.create({
      data: {
        userId: user.id,
        channelId: channel.id,
        type: "channel",
        result: JSON.stringify(analysis),
        score: healthScore,
      },
    });

    console.log("5. Updating channel health score...");

    await db.channel.update({
      where: { id: channel.id },
      data: { healthScore },
    });

    console.log("========== /api/ai/analyze COMPLETED ==========");

    const responsePayload = {
      analysis: {
        id: stored.id,
        channelId: channel.id,
        type: "channel",
        score: healthScore,
        result: analysis,
        createdAt: stored.createdAt,
      },
    };

    await safePusherTrigger(channelId, "ai-status", {
      status: "completed",
      message: "Analysis completed successfully!",
      data: responsePayload.analysis,
    });

    return NextResponse.json(responsePayload);
  } catch (err) {
    console.error("========== ANALYZE CATCH BLOCK ==========");

    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : "";

    console.error("Error Message:", errorMessage);
    console.error("Error Stack:", errorStack);

    if (currentChannelId) {
      await safePusherTrigger(currentChannelId, "ai-status", {
        status: "error",
        message: errorMessage,
      });
    }

    if (errorMessage === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Failed to analyze channel",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}