import { GoogleGenAI } from "@google/genai";

console.log("Has GEMINI_API_KEY:", !!process.env.GEMINI_API_KEY);

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing!");
    throw new Error("GEMINI_API_KEY is not set");
  }

  return new GoogleGenAI({
    apiKey,
  });
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

async function runLLM(
  systemPrompt: string,
  userMessage: string,
  json = false
): Promise<string> {
  try {
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\n${userMessage}`,
      config: json
        ? {
            responseMimeType: "application/json",
          }
        : undefined,
    });

    console.log("Gemini response text:", response.text);
    if (!response.text) {
      throw new Error("Gemini returned an empty response");
    }

    return response.text;
  } catch (err) {
    console.error("========== GEMINI ERROR ==========");

    if (err instanceof Error) {
      console.error("Message:", err.message);
      console.error("Stack:", err.stack);
    } else {
      console.error(err);
    }
    throw err;
  }
}

async function runJSON<T>(
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const content = await runLLM(systemPrompt, userMessage, true);

  let cleaned = content.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);

    if (match) {
      return JSON.parse(match[1]) as T;
    }

    console.error("Gemini returned invalid JSON:");
    console.error(cleaned);

    throw new Error("Failed to parse Gemini JSON response");
  }
}
/* =======================================================
   Channel Analysis
======================================================= */

export async function analyzeChannel(channelInfo: {
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  recentVideos: Array<{
    title: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    publishedAt: string;
    tags: string[];
    duration: string;
    isShort: boolean;
  }>;
}) {
  const system = `
You are an expert YouTube strategist.

Analyze the channel's performance, audience engagement,
SEO, upload consistency, audience retention, CTR,
and growth opportunities.

Return ONLY valid JSON.
`;

  const user = `
Analyze this YouTube channel.

Return EXACTLY this JSON schema:

{
  "healthScore": 0,
  "summary": "",
  "strengths": [],
  "weaknesses": [],
  "performance": {
    "rating": "",
    "note": ""
  },
  "engagement": {
    "rating": "",
    "avgEngagementRate": "",
    "note": ""
  },
  "consistency": {
    "rating": "",
    "uploadFrequency": "",
    "note": ""
  },
  "seo": {
    "rating": "",
    "score": 0,
    "note": ""
  },
  "retention": {
    "trend": "",
    "note": ""
  },
  "ctrOpportunities": []
}

Channel Data:

${JSON.stringify(channelInfo, null, 2)}
`;

  const result = await runJSON<{
    healthScore: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    performance: {
      rating: string;
      note: string;
    };
    engagement: {
      rating: string;
      avgEngagementRate: string;
      note: string;
    };
    consistency: {
      rating: string;
      uploadFrequency: string;
      note: string;
    };
    seo: {
      rating: string;
      score: number;
      note: string;
    };
    retention: {
      trend: string;
      note: string;
    };
    ctrOpportunities: string[];
  }>(system, user);

  return result;
}
/* =======================================================
   Recommendations
======================================================= */

export async function generateRecommendations(channelInfo: {
  title: string;
  niche: string;
  subscriberCount: number;
  recentTopics: string[];
}) {
  const system = `
You are a professional YouTube growth strategist.

Your job is to analyze a creator's niche and generate practical,
SEO-focused recommendations.

Return ONLY valid JSON.
`;

  const user = `
Analyze this YouTube channel and return recommendations.

Return EXACTLY this JSON:

{
  "titles": [],
  "descriptions": [],
  "seo": [],
  "tags": [],
  "keywords": [],
  "trending": [],
  "videoIdeas": [],
  "playlist": [],
  "uploadTimes": [],
  "engagement": [],
  "growth": [],
  "calendar": []
}

Channel:

${JSON.stringify(channelInfo, null, 2)}
`;

  return runJSON<{
    titles: string[];
    descriptions: string[];
    seo: string[];
    tags: string[];
    keywords: string[];
    trending: string[];
    videoIdeas: string[];
    playlist: string[];
    uploadTimes: string[];
    engagement: string[];
    growth: string[];
    calendar: string[];
  }>(system, user);
}
/* =======================================================
   Script Generator
======================================================= */

export async function generateScript(params: {
  type: string;
  topic: string;
  audience: string;
  tone: string;
  duration: string;
  channelName: string;
  extra?: string;
}) {
  const system = `
You are a professional YouTube script writer.

Write highly engaging, natural sounding scripts that maximize
viewer retention.

Do not include explanations outside the script.
`;

  const user = `
Write a complete YouTube script.

Type:
${params.type}

Topic:
${params.topic}

Audience:
${params.audience}

Tone:
${params.tone}

Duration:
${params.duration}

Channel Name:
${params.channelName}

Additional Instructions:
${params.extra || "None"}

The script should include:

- Hook
- Intro
- Main Content
- Call To Action
- Ending
`;

  return runLLM(system, user);
}
/* =======================================================
   Content Ideas
======================================================= */

export interface ContentIdea {
  title: string;
  hook: string;
  format: string;
  why: string;
  difficulty: string;
  estimatedViews: string;
  tags: string[];
}

export async function generateContentIdeas(params: {
  niche: string;
  audience: string;
  channelName: string;
  count?: number;
}) {
  const count = Math.max(1, Math.min(12, params.count ?? 8));

  const system = `
You are an expert YouTube content strategist.

Generate viral, SEO-optimized content ideas that fit the
creator's niche and audience.

Return ONLY valid JSON.
`;

  const user = `
Generate ${count} YouTube video ideas.

Return EXACTLY this JSON:

{
  "ideas": [
    {
      "title": "",
      "hook": "",
      "format": "",
      "why": "",
      "difficulty": "",
      "estimatedViews": "",
      "tags": []
    }
  ]
}

Channel Name:
${params.channelName}

Niche:
${params.niche}

Audience:
${params.audience}
`;

  const result = await runJSON<{
    ideas: ContentIdea[];
  }>(system, user);

  return result;
}
/* =======================================================
   AI Chat
======================================================= */

export async function chatAssistant(
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>,
  context?: string
) {
  const system = `
You are YouTubeFlow AI.

You are an expert YouTube strategist, SEO specialist,
content creator, script writer, and YouTube growth consultant.

Your goals are to:

- Help creators grow their channels
- Give practical advice
- Explain YouTube analytics
- Improve titles, thumbnails and SEO
- Generate engaging content ideas
- Answer questions clearly and accurately

Keep answers concise unless the user asks for more detail.
`;

  const conversation = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const user = `
${context ? `Context:\n${context}\n\n` : ""}

Conversation:

${conversation}
`;

  return runLLM(system, user);
}