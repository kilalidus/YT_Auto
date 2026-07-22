import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

type ThumbnailStyle =
  | "bold-text"
  | "face-reaction"
  | "minimal"
  | "comparison"
  | "clickbait";

const STYLE_DESCRIPTIONS: Record<ThumbnailStyle, string> = {
  "bold-text":
    "oversized bold uppercase typography dominating the frame, vibrant YouTube thumbnail, cinematic lighting",
  "face-reaction":
    "close-up shocked face, expressive emotions, bright colors, YouTube thumbnail",
  "minimal":
    "clean modern minimalist YouTube thumbnail, premium look",
  "comparison":
    "split screen before and after comparison, dramatic transformation",
  "clickbait":
    "viral YouTube thumbnail, glowing arrows, red circles, high contrast, eye-catching",
};

function isStyle(v: unknown): v is ThumbnailStyle {
  return (
    v === "bold-text" ||
    v === "face-reaction" ||
    v === "minimal" ||
    v === "comparison" ||
    v === "clickbait"
  );
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const body = await req.json().catch(() => ({}));

    const title = (body.title ?? "").toString().trim();
    const rawStyle = (body.style ?? "").toString();
    const description = (body.description ?? "").toString().trim();

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const style = isStyle(rawStyle) ? rawStyle : "bold-text";

    const prompt = `
${STYLE_DESCRIPTIONS[style]}.

Professional YouTube thumbnail.

Video title:
${title}

${description}

Ultra detailed.
Highly clickable.
16:9.
No watermark.
No logo.
No text.
`;

    const imageUrl =
      "https://image.pollinations.ai/prompt/" +
      encodeURIComponent(prompt) +
      "?width=1344&height=768&model=flux";

    return NextResponse.json({
      image: imageUrl,
      prompt,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("[ai/thumbnail]", err);

    return NextResponse.json(
      { error: "Failed to generate thumbnail" },
      { status: 500 }
    );
  }
}