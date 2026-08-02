import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth";
import { getDailyQueue } from "@/features/review/queue";
import { ReviewSession } from "@/features/review/review-session";
import { HeartbeatTracker } from "@/features/progression/heartbeat-tracker";

export const metadata: Metadata = { title: "Révisions" };

export default async function RevisionsPage() {
  const user = await requireOnboardedUser();
  const queue = await getDailyQueue(user.id);

  return (
    <div className="mx-auto max-w-xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl">Révisions</h1>
        <p className="text-[var(--text-muted)]">
          Répétition espacée (FSRS) — les cartes reviennent juste avant que vous ne les
          oubliiez.
        </p>
      </header>

      <HeartbeatTracker context="review" />
      <ReviewSession queue={queue} />
    </div>
  );
}
