export const PLAN_LIMITS = {
  free: {
    projects: 1,
    crewMembers: 3,
    storage: "100MB",
    aiQueries: 10,
    modules: [
      "dashboard", "calendar", "daily-logs", "crew", "time-tracking",
      "weather", "punch-list", "site-media", "settings", "help",
    ],
  },
  pro: {
    projects: 10,
    crewMembers: 25,
    storage: "10GB",
    aiQueries: 1000,
    modules: "all",
  },
  team: {
    projects: -1,
    crewMembers: -1,
    storage: "50GB",
    aiQueries: -1,
    modules: "all",
  },
  suite_pro: {
    projects: -1,
    crewMembers: -1,
    storage: "50GB",
    aiQueries: -1,
    modules: "all",
  },
  suite_biz: {
    projects: -1,
    crewMembers: -1,
    storage: "100GB",
    aiQueries: -1,
    modules: "all",
  },
} as const;
