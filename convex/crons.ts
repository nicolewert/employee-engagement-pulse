import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Process unanalyzed messages every 5 minutes
crons.interval(
  "process-unanalyzed-messages",
  { minutes: 5 },
  api.slack.processUnanalyzedMessages
);

// Sync all active channels every hour
crons.interval(
  "sync-active-channels",
  { hours: 1 },
  api.channels.syncActiveChannels
);

// Generate weekly insights every Monday at 9 AM
crons.weekly(
  "generate-weekly-insights", 
  { 
    dayOfWeek: "monday",
    hourUTC: 9,
    minuteUTC: 0
  },
  api.insights.generateWeeklyInsights,
  {
    weekStart: (() => {
      // Calculate the start of the previous week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - daysToMonday - 7); // Previous week's Monday
      lastMonday.setHours(0, 0, 0, 0);
      return lastMonday.getTime();
    })(),
    triggerType: "system" as const
  }
);

// Clean up old sync progress records every 24 hours
crons.interval(
  "cleanup-sync-progress",
  { hours: 24 },
  api.channels.cleanupSyncProgress
);

export default crons;