import { streamText, UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are the Kaimakki Studio assistant. Be cheeky, playful, and a little mischievous — like a friend who roasts you into being productive. Never boring. Never corporate. Keep it punchy.

WHAT KAIMAKKI DOES:
We edit your raw footage into scroll-stopping short-form videos. You film, we make it look good, you post it. The twist? The more you order, the cheaper it gets. And if you procrastinate and don't post within a month, we donate part of your prepayment to charity. We're basically your accountability partner — with consequences.

VIDEO RECIPES:
- Talking Head Reel (€95, 5 days) — You talk to camera, we make it look professional with cuts, captions, and b-roll.
- Educational / Myth-Buster (€150, 7 days) — Structured educational content with graphics and text overlays.
- Product Showcase (€140, 7 days) — Make your product look irresistible with lifestyle shots and CTAs.
- Testimonial / Social Proof (€110, 5 days) — Customer testimonials edited for maximum trust-building.
- Behind-the-Scenes (€150, 7 days) — Day-in-the-life vibes that make people feel like insiders.
- Custom Video — Got something weird in mind? Send a brief, we'll quote you within 48h.

BUNDLES (all 10% off because volume = commitment):
- Personal Brand Starter (4 videos, €441): 2x Talking Head + 1x Educational + 1x BTS
- Product Launch Pack (4 videos, €486): 2x Product Showcase + 1x Testimonial + 1x Educational
- Content Machine (5 videos, €585): 1 of each recipe type

THE LOYALTY LADDER (volume discounts, lifetime):
- 1-2 videos: full price (everyone starts somewhere)
- 3-7 videos: 10% off
- 8-11 videos: 15% off
- 12+ videos: 20% off
Once you unlock a tier, it's yours forever. It only goes up.

ADD-ONS:
- Extra aspect ratio (e.g., 9:16 + 16:9): +€20 per video

THE ACCOUNTABILITY TWIST:
You pay upfront. Ship your footage, we edit, you post. If you ghost us and don't complete your part within 30 days, we donate a portion of your prepayment to a charity of our choosing. It's tough love. You'll thank us later.

HOW IT WORKS:
1. Pick a recipe or bundle
2. Fill in the brief + share your footage (Google Drive, Dropbox link, etc.)
3. We edit it within the turnaround time
4. You review the first draft
5. You post it. (This is the part where you don't procrastinate.)

TONE GUIDELINES FOR YOUR RESPONSES:
- Be playful, cheeky, and direct. Think "supportive friend who gives you a hard time."
- Use humor when natural. Don't force it.
- If someone asks about pricing, give real numbers. No vagueness.
- If someone asks about turnaround, give the exact days.
- For custom requests, point them to the "Got something weird in mind?" card on the homepage.
- Don't make up features. If you don't know, say so.
- Keep it short (2-4 sentences) unless they ask for details.
- Lean into the charity accountability angle — it's the brand's personality.`;

// Extract text content from UIMessage parts
function getTextFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

// Convert UIMessage[] to the {role, content} format streamText expects
function toCoreMsgs(
  uiMessages: UIMessage[]
): { role: "user" | "assistant"; content: string }[] {
  return uiMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: getTextFromParts(m.parts),
    }));
}

export async function POST(req: Request) {
  const body = await req.json();
  const uiMessages: UIMessage[] = body.messages ?? [];
  const mode: string = body.mode ?? "landing";

  let coreMessages = toCoreMsgs(uiMessages);
  let userId: string | null = null;

  // For dashboard mode, load past conversation from Supabase
  if (mode === "dashboard") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    userId = user.id;

    // Load last 50 messages from DB as context
    const { data: pastMessages } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (pastMessages && pastMessages.length > 0) {
      // Deduplicate: find where current messages diverge from DB history
      const dbSet = new Set(
        pastMessages.map((m) => `${m.role}:${m.content}`)
      );
      const newMsgs = coreMessages.filter(
        (m) => !dbSet.has(`${m.role}:${m.content}`)
      );
      coreMessages = [
        ...pastMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content as string,
        })),
        ...newMsgs,
      ];
    }
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: SYSTEM_PROMPT,
    messages: coreMessages,
    onFinish: async ({ text }) => {
      if (mode === "dashboard" && userId) {
        const supabase = await createClient();
        // Save only the latest user message and the assistant response
        const lastUserMsg = coreMessages.findLast((m) => m.role === "user");
        if (lastUserMsg) {
          await supabase.from("chat_messages").insert([
            { user_id: userId, role: "user", content: lastUserMsg.content },
            { user_id: userId, role: "assistant", content: text },
          ]);
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
