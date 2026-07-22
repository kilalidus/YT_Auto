import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { analyzeChannel } from "@/lib/ai";
import { pusherServer } from "@/lib/pusher-server";

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
    console.log("========== /api/ai/analyze ==========");

    console.log("Checking authentication...");
    const user = await requireUser();
    console.log("Authenticated user:", user.id);

    const body = await req.json().catch(() => ({}));
    const channelId = (body.channelId ?? "").toString();
    currentChannelId = channelId;

    if (!channelId) {
      return NextResponse.json(
        { error: "channelId is required" },
        { status: 400 }
      );
    }

    // Broadcast status: Loading channel
    await pusherServer.trigger(`channel-${channelId}`, "ai-status", {
      status: "loading",
      message: "Loading channel data and recent videos...",
    });

    console.log("Loading channel...");

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
      await pusherServer.trigger(`channel-${channelId}`, "ai-status", {
        status: "error",
        message: "Channel not found.",
      });

      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    console.log("Channel loaded:", channel.title);

    const recentVideos = channel.videos.map((v) => ({
      title: v.title,
      viewCount: v.viewCount,
      likeCount: v.likeCount,
      commentCount: v.commentCount,
      publishedAt: v.publishedAt.toISOString(),
      tags: parseJSON(v.tags, []) as string[],
      duration: v.duration,
      isShort: v.isShort,
    }));

    // Broadcast status: Calling Gemini AI
    await pusherServer.trigger(`channel-${channelId}`, "ai-status", {
      status: "analyzing",
      message: "Analyzing channel performance with Gemini AI...",
    });

    console.log("Calling Gemini...");

    const analysis = await analyzeChannel({
      title: channel.title,
      description: channel.description,
      subscriberCount: channel.subscriberCount,
      videoCount: channel.videoCount,
      viewCount: channel.viewCount,
      recentVideos,
    });

    console.log("Gemini returned successfully.");

    const healthScore =
      typeof analysis.healthScore === "number" &&
      !Number.isNaN(analysis.healthScore)
        ? Math.max(0, Math.min(100, Math.round(analysis.healthScore)))
        : 0;

    // Broadcast status: Saving results
    await pusherServer.trigger(`channel-${channelId}`, "ai-status", {
      status: "saving",
      message: "Saving AI analysis results...",
    });

    console.log("Saving analysis...");

    const stored = await db.aIAnalysis.create({
      data: {
        userId: user.id,
        channelId: channel.id,
        type: "channel",
        result: JSON.stringify(analysis),
        score: healthScore,
      },
    });

    console.log("Updating channel...");

    await db.channel.update({
      where: {
        id: channel.id,
      },
      data: {
        healthScore,
      },
    });

    console.log("Analysis completed successfully.");

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

    // Broadcast status: Complete
    await pusherServer.trigger(`channel-${channelId}`, "ai-status", {
      status: "completed",
      message: "Analysis completed successfully!",
      data: responsePayload.analysis,
    });

    return NextResponse.json(responsePayload);
  } catch (err) {
    console.error("========== ANALYZE ERROR ==========");

    if (err instanceof Error) {
      console.error("Message:", err.message);
      console.error("Stack:", err.stack);
    } else {
      console.error(err);
    }

    if (currentChannelId) {
      await pusherServer
        .trigger(`channel-${currentChannelId}`, "ai-status", {
          status: "error",
          message:
            err instanceof Error ? err.message : "Failed to analyze channel",
        })
        .catch(() => {});
    }

    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to analyze channel",
        details: err instanceof Error ? err.message : String(err),
      },
      {
        status: 500,
      }
    );
  }
}