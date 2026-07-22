# Task 4-IDEA-LAB — Work Record

**Agent:** full-stack-developer (Idea Lab)
**Task:** Build AI Idea Lab view with content ideas generator + thumbnail concept generator + send-to-workflow integration

## Work Log

1. Read `worklog.md`, `store.ts`, `ai.ts`, `api-client.ts`, `app-shell.tsx`, `sidebar.tsx`, `recommendations.tsx`, `script-generator.tsx`, `ai/recommendations/route.ts`, `ai/script/route.ts`, `tasks/route.ts`, `prisma/schema.prisma`, `lib/db.ts`, `lib/auth.ts`, `api/upload/route.ts`, `api/channels/route.ts`, `settings.tsx` (for AI Provider radio-card pattern), `globals.css` (for design-system class names) and the image-generation skill reference script to lock down conventions BEFORE writing any code.

2. Added `generateContentIdeas` helper to `src/lib/ai.ts`. Exports a new `ContentIdea` interface. Uses `runJSON` with the existing JSON-robust parser. System prompt positions Gemini as a senior YouTube content strategist; user prompt asks for a JSON `{ ideas: [...] }` with exactly `count` ideas, each containing title / hook / format (constrained vocabulary) / why / difficulty / estimatedViews / tags. Enforces `count` between 1 and 12.

3. Created `src/app/api/ai/ideas/route.ts` — POST handler. Requires auth via `requireUser`, reads `{ niche, audience, channelName, count }` from body, validates niche + audience are present, calls `generateContentIdeas`, returns `{ ideas: [...] }`. Ephemeral — does NOT persist to DB. Same try/catch + UNAUTHORIZED + 500 fallback pattern as `ai/recommendations`.

4. Created `src/app/api/ai/thumbnail/route.ts` — POST handler. Requires auth, reads `{ title, style, description }`. Maps the 5 styles (bold-text / face-reaction / minimal / comparison / clickbait) to rich visual descriptions, builds a detailed image-gen prompt, calls `zai.images.generations.create({ prompt, size: '1344x768' })`, returns `{ image: 'data:image/png;base64,...', prompt }`. `z-ai-web-dev-sdk` is imported directly here (server-only) — NOT added to `lib/ai.ts`. Same error pattern.

5. Added `'idea-lab'` to the `ViewKey` union in `src/lib/store.ts` (between `'recommendations'` and `'script'`).

6. Added `Wand2` to the lucide-react import list in `src/components/app/sidebar.tsx` and registered the new nav item `{ key: 'idea-lab', label: 'AI Idea Lab', icon: Wand2, group: 'create', badge: 'AI' }` placed in the 'create' group, right after `recommendations` and before `script`.

7. Wired `IdeaLabView` into `src/components/app/app-shell.tsx` — added the import and `{view === 'idea-lab' && <IdeaLabView />}` to the render switch.

8. Built `src/components/views/idea-lab.tsx` — the centerpiece. Named export `IdeaLabView`, `'use client'`. Premium 3D glassmorphism UI matching existing conventions. Structure:
   - Header: eyebrow "AI CREATIVE ENGINE", title "Idea Lab", subtitle.
   - Custom two-tab toggle (Content Ideas | Thumbnail Studio) using `motion.div layoutId` for the active indicator — NOT shadcn Tabs.
   - **Content Ideas tab**: left sticky form panel (`lg:grid-cols-[340px_1fr]`) with Channel Select (fetches `/api/channels`, prefills niche + channelName from first channel), Niche Input, Target Audience Input, Channel Name Input, Count Select (4/6/8/10 button grid), Generate Ideas button (grad-primary + glow-primary, animated rotating Wand2 + "Gemini is brainstorming ideas…" loading text). Right results panel: shimmer skeleton grid while loading, empty state with Wand2 in grad-primary glow tile + tip, results grid (1 col mobile / 2 col xl) of idea cards. Each card: difficulty badge (color-coded emerald/amber/red) + format badge (with lucide icon per format), title, italic hook with Quote icon, "Why it works" paragraph, estimated views badge (grad-cool tint, Eye icon), tags as pill chips, action row with "Send to Workflow" (POST `/api/tasks` with status 'idea', labels = tags + format, success toast with "View board" action that calls `navigate('workflow')`) + "Copy" button. Stagger entrance animation `delay: i * 0.06`.
   - **Thumbnail Studio tab**: left sticky form panel (`lg:grid-cols-[380px_1fr]`) with Video Title Input, Style radio-card grid (2 cols, 5 styles with icon + label + desc, active = ring-2 ring-primary + glow-primary + check badge — mirrors the AI Provider cards in settings.tsx), optional Description Textarea, Generate Thumbnail button (animated rotating ImageIcon + "Creating your thumbnail concept…"). Right results panel: 16:9 shimmer placeholder with pulsing ImageIcon while loading, empty state with ImageIcon in grad-warm glow tile, result view with the generated image in a 16:9 card (rounded-2xl + glow-primary + card-3d hover), collapsible prompt display, action buttons (Download via temp `<a download>`, Regenerate, Send to Files via `/api/upload` multipart FormData with fallback toast), and a "Recent thumbnails" history strip (last 3, click to re-view).

9. Verification:
   - `npx tsc --noEmit 2>&1 | grep -E "idea-lab|ai/ideas|ai/thumbnail|lib/ai|lib/store|app-shell|sidebar"` → NO matches (zero errors in my files). Remaining tsc errors are pre-existing in `examples/`, `skills/`, `planner.tsx`, `workflow.tsx`, `quick-actions.tsx` (unrelated to this task).
   - `bun run lint` → 0 errors, 0 warnings (after removing 3 unused `@next/next/no-img-element` eslint-disable directives that the config wasn't reporting).
   - Dev server log shows `✓ Compiled in 570ms` after the view file was created; latest entries show healthy `GET /api/notifications 200` with no errors.

## Stage Summary

- **Files created:**
  - `src/app/api/ai/ideas/route.ts` — POST handler for content idea generation (ephemeral, no DB persistence)
  - `src/app/api/ai/thumbnail/route.ts` — POST handler for AI thumbnail concept generation (z-ai-web-dev-sdk image gen, server-only)
  - `src/components/views/idea-lab.tsx` — `IdeaLabView` named export (~1480 LOC, two-tab premium view)
- **Files modified:**
  - `src/lib/ai.ts` — added `ContentIdea` interface + `generateContentIdeas` helper
  - `src/lib/store.ts` — added `'idea-lab'` to `ViewKey` union
  - `src/components/app/sidebar.tsx` — imported `Wand2`, registered nav item in 'create' group
  - `src/components/app/app-shell.tsx` — imported `IdeaLabView`, added render-switch case
- **Key decisions:**
  - Ideas are ephemeral — not persisted to DB. The user picks winners and sends them to the workflow as tasks via the existing `POST /api/tasks` (status `'idea'`), which the Workflow Kanban already renders.
  - Thumbnail generation uses `z-ai-web-dev-sdk` directly in the route file (not in `lib/ai.ts`, which is text-LLM only) — keeps the SDK server-side only.
  - For the "Send to Files" action, converted the data URL to a Blob and POSTed as multipart FormData to `/api/upload` (the existing route expects FormData with a `file` field). Wrapped in try/catch with a fallback toast so the UI never breaks even if the upload size exceeds the route's 3MB cap.
  - Used a custom two-button tab toggle with `motion.div layoutId` instead of shadcn Tabs to match the spec's "custom-styled" requirement and keep visual consistency with the sidebar active indicator.
  - Style selector uses the same radio-card pattern as the AI Provider cards in `settings.tsx` (glass card + ring-2 ring-primary + check badge on active).
  - Idea cards use `card-3d` for the lift-on-hover 3D tilt, stagger entrance with `delay: i * 0.06`.
  - Format icons mapped: tutorial=GraduationCap, review=Star, shorts=Zap, vlog=Video, listicle=List, debate=MessagesSquare, interview=Mic (per spec).
  - Difficulty colors: easy=emerald, medium=amber, hard=red (per spec).
  - "Send to workflow" toast includes a "View board" action button that calls `navigate('workflow')` so the user can jump straight to the Kanban.
- **Verification:**
  - tsc: zero errors in `idea-lab.tsx`, `ai/ideas/route.ts`, `ai/thumbnail/route.ts`, `lib/ai.ts`, `lib/store.ts`, `app-shell.tsx`, `sidebar.tsx`.
  - lint: 0 errors, 0 warnings across the whole project.
  - dev server: compiles cleanly, no runtime errors in log.
