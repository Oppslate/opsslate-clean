import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

// Daily briefing emails at 6 AM EST (11 UTC)
crons.daily(
  "daily-briefing",
  { hourUTC: 11, minuteUTC: 0 },
  internal.dailyBriefing.sendDailyBriefings
);

// Crew 5-day advance notification at 6 AM EST (11 UTC)
crons.daily(
  "crew-5-day-notification",
  { hourUTC: 11, minuteUTC: 0 },
  internal.crewNotifyCron.sendUpcomingNotifications
);

// AI PM Morning Briefings at 6 AM EST (11 UTC)
crons.daily(
  "ai-pm-morning-briefings",
  { hourUTC: 11, minuteUTC: 0 },
  internal.aiPmCron.sendMorningBriefings
);

// Decision Engine — runs every 4 hours to learn and make autonomous decisions
crons.interval(
  "decision-engine",
  { hours: 4 },
  internal.decisionCron.runDecisionEngine
);

// Weather sweep for active projects every 30 minutes
crons.interval(
  "active-project-weather-refresh",
  { minutes: 30 },
  api.weather.refreshActiveProjectWeather
);

export default crons;
