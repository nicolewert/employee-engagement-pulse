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
  api.insights.generateWeeklyInsights
);

// Clean up old sync progress records every 24 hours
crons.interval(
  "cleanup-sync-progress",
  { hours: 24 },
  api.channels.cleanupSyncProgress
);

export default crons;