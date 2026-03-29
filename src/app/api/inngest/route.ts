import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { scheduleFollowUps, checkAndSendReminders } from "@/inngest/functions/schedule-follow-ups";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scheduleFollowUps, checkAndSendReminders],
});
