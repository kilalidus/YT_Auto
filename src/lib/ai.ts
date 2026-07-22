import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const ai = new GoogleGenAI({
  apiKey,
});

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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\n${userMessage}`,
      config: json
        ? {
            responseMimeType: "application/json",
          }
        : undefined,
    });

    return response.text ?? "";
  } catch (err) {
    console.error("[LLM]", err);
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
SEO, upload consistency and growth opportunities.

Return ONLY valid JSON.
`;

  const user = `
Analyze this channel.

Return JSON:

{
  "healthScore": 0,
  "summary": "",
  "strengths": [],
  "weaknesses": [],
  "performance":{
    "rating":"",
    "note":""
  },
  "engagement":{
    "rating":"",
    "avgEngagementRate":"",
    "note":""
  },
  "consistency":{
    "rating":"",
    "uploadFrequency":"",
    "note":""
  },
  "seo":{
    "rating":"",
    "score":0,
    "note":""
  },
  "retention":{
    "trend":"",
    "note":""
  },
  "ctrOpportunities":[]
}

Channel:
${JSON.stringify(channelInfo, null, 2)}
`;

  return runJSON(system, user);
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
You are a YouTube growth expert.

Return ONLY valid JSON.
`;

  const user = `
Return JSON:

{
  "titles":[],
  "descriptions":[],
  "seo":[],
  "tags":[],
  "keywords":[],
  "trending":[],
  "videoIdeas":[],
  "playlist":[],
  "uploadTimes":[],
  "engagement":[],
  "growth":[],
  "calendar":[]
}

Channel:

${JSON.stringify(channelInfo, null, 2)}
`;

  return runJSON(system, user);
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
`;

  const user = `
Write a ${params.type} YouTube script.

Topic:
${params.topic}

Audience:
${params.audience}

Tone:
${params.tone}

Duration:
${params.duration}

Channel:
${params.channelName}

Extra:
${params.extra ?? ""}
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

Return ONLY JSON.
`;

  const user = `
Generate ${count} YouTube ideas.

Return:

{
  "ideas":[
    {
      "title":"",
      "hook":"",
      "format":"",
      "why":"",
      "difficulty":"",
      "estimatedViews":"",
      "tags":[]
    }
  ]
}

Channel:
${params.channelName}

Niche:
${params.niche}

Audience:
${params.audience}
`;

  return runJSON<{ ideas: ContentIdea[] }>(system, user);
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
  const prompt = `
You are YouTubeFlow AI.

You are an expert YouTube strategist.

${context ? `Context:\n${context}\n` : ""}

Conversation:

${messages
  .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
  .join("\n")}
`;

  return runLLM("", prompt);
}