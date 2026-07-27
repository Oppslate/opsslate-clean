/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as aiContractorSearch from "../aiContractorSearch.js";
import type * as aiDailyLog from "../aiDailyLog.js";
import type * as aiDirector from "../aiDirector.js";
import type * as aiPm from "../aiPm.js";
import type * as aiPmCron from "../aiPmCron.js";
import type * as aiPmDocReader from "../aiPmDocReader.js";
import type * as aiPmEmailIntel from "../aiPmEmailIntel.js";
import type * as aiPmEngine from "../aiPmEngine.js";
import type * as aiPmSendEmail from "../aiPmSendEmail.js";
import type * as analyzeContract from "../analyzeContract.js";
import type * as auth from "../auth.js";
import type * as authEmail from "../authEmail.js";
import type * as autoDailyLog from "../autoDailyLog.js";
import type * as autoDocScan from "../autoDocScan.js";
import type * as autoRfiGenerator from "../autoRfiGenerator.js";
import type * as autopilotData from "../autopilotData.js";
import type * as autopilotEngine from "../autopilotEngine.js";
import type * as bidManager from "../bidManager.js";
import type * as bidManagerHelpers from "../bidManagerHelpers.js";
import type * as billing from "../billing.js";
import type * as budgetTracker from "../budgetTracker.js";
import type * as buyout from "../buyout.js";
import type * as calendar from "../calendar.js";
import type * as calendarAI from "../calendarAI.js";
import type * as changeOrderNotify from "../changeOrderNotify.js";
import type * as changeOrders from "../changeOrders.js";
import type * as clearAll from "../clearAll.js";
import type * as clientPortal from "../clientPortal.js";
import type * as clockInOut from "../clockInOut.js";
import type * as companyBranding from "../companyBranding.js";
import type * as concrete from "../concrete.js";
import type * as contacts from "../contacts.js";
import type * as contractAnalysis from "../contractAnalysis.js";
import type * as contractToRisks from "../contractToRisks.js";
import type * as crew from "../crew.js";
import type * as crewEmail from "../crewEmail.js";
import type * as crewNotifyCron from "../crewNotifyCron.js";
import type * as crewNotifyHelper from "../crewNotifyHelper.js";
import type * as crons from "../crons.js";
import type * as customTrades from "../customTrades.js";
import type * as dailyBriefing from "../dailyBriefing.js";
import type * as dailyBriefingHelper from "../dailyBriefingHelper.js";
import type * as dailyBriefingManual from "../dailyBriefingManual.js";
import type * as dailyLogs from "../dailyLogs.js";
import type * as dailySummary from "../dailySummary.js";
import type * as dashboard from "../dashboard.js";
import type * as decisionCron from "../decisionCron.js";
import type * as decisionEngine from "../decisionEngine.js";
import type * as decisionLog from "../decisionLog.js";
import type * as delayEngine from "../delayEngine.js";
import type * as delayEngineAI from "../delayEngineAI.js";
import type * as deliveries from "../deliveries.js";
import type * as discordWebhook from "../discordWebhook.js";
import type * as docAnalyzer from "../docAnalyzer.js";
import type * as docManager from "../docManager.js";
import type * as emailAutoAssign from "../emailAutoAssign.js";
import type * as emailConfig from "../emailConfig.js";
import type * as emailIntel from "../emailIntel.js";
import type * as emailIntelHelpers from "../emailIntelHelpers.js";
import type * as emailUploadProcessor from "../emailUploadProcessor.js";
import type * as emails from "../emails.js";
import type * as equipment from "../equipment.js";
import type * as estimating from "../estimating.js";
import type * as feedback from "../feedback.js";
import type * as fieldNotes from "../fieldNotes.js";
import type * as heliosAuthorization from "../heliosAuthorization.js";
import type * as heliosBidBasis from "../heliosBidBasis.js";
import type * as heliosCivilGeometry from "../heliosCivilGeometry.js";
import type * as heliosCivilGeometryActions from "../heliosCivilGeometryActions.js";
import type * as heliosCivilGeometryOpenAIContracts from "../heliosCivilGeometryOpenAIContracts.js";
import type * as heliosEngineeringShadow from "../heliosEngineeringShadow.js";
import type * as heliosEngineeringShadowSchedule from "../heliosEngineeringShadowSchedule.js";
import type * as heliosEstimateActions from "../heliosEstimateActions.js";
import type * as heliosEstimateBuild from "../heliosEstimateBuild.js";
import type * as heliosEstimateOpenAIContracts from "../heliosEstimateOpenAIContracts.js";
import type * as heliosEstimateReviews from "../heliosEstimateReviews.js";
import type * as heliosEstimateSupport from "../heliosEstimateSupport.js";
import type * as heliosEstimates from "../heliosEstimates.js";
import type * as heliosGateway from "../heliosGateway.js";
import type * as heliosIdentity from "../heliosIdentity.js";
import type * as heliosIntelligence from "../heliosIntelligence.js";
import type * as heliosIntelligenceActions from "../heliosIntelligenceActions.js";
import type * as heliosOpenAIContracts from "../heliosOpenAIContracts.js";
import type * as heliosPackages from "../heliosPackages.js";
import type * as heliosPlanActions from "../heliosPlanActions.js";
import type * as heliosPlanIntelligence from "../heliosPlanIntelligence.js";
import type * as heliosPlanOpenAIContracts from "../heliosPlanOpenAIContracts.js";
import type * as heliosProjects from "../heliosProjects.js";
import type * as heliosReviews from "../heliosReviews.js";
import type * as heliosTakeoffIntelligence from "../heliosTakeoffIntelligence.js";
import type * as http from "../http.js";
import type * as inboundEmailAddresses from "../inboundEmailAddresses.js";
import type * as incidents from "../incidents.js";
import type * as insuranceRequirements from "../insuranceRequirements.js";
import type * as legalAI from "../legalAI.js";
import type * as notificationProfiles from "../notificationProfiles.js";
import type * as paymentRules from "../paymentRules.js";
import type * as personalCalendar from "../personalCalendar.js";
import type * as photoPunch from "../photoPunch.js";
import type * as projectChat from "../projectChat.js";
import type * as projectDashboard from "../projectDashboard.js";
import type * as projectDetail from "../projectDetail.js";
import type * as projects from "../projects.js";
import type * as punchList from "../punchList.js";
import type * as rentals from "../rentals.js";
import type * as reporting from "../reporting.js";
import type * as rfis from "../rfis.js";
import type * as risks from "../risks.js";
import type * as scheduleConstraints from "../scheduleConstraints.js";
import type * as seed from "../seed.js";
import type * as seedDemo from "../seedDemo.js";
import type * as seedPersonal from "../seedPersonal.js";
import type * as sendEmail from "../sendEmail.js";
import type * as siteMedia from "../siteMedia.js";
import type * as siteWalk from "../siteWalk.js";
import type * as smartNag from "../smartNag.js";
import type * as specDNA from "../specDNA.js";
import type * as subcontractors from "../subcontractors.js";
import type * as submittalScanner from "../submittalScanner.js";
import type * as submittals from "../submittals.js";
import type * as tasks from "../tasks.js";
import type * as team from "../team.js";
import type * as teamEmail from "../teamEmail.js";
import type * as timeTracking from "../timeTracking.js";
import type * as todayPanel from "../todayPanel.js";
import type * as udigTickets from "../udigTickets.js";
import type * as vendors from "../vendors.js";
import type * as voiceCommand from "../voiceCommand.js";
import type * as voiceCommandHelpers from "../voiceCommandHelpers.js";
import type * as weather from "../weather.js";
import type * as weatherAlerts from "../weatherAlerts.js";
import type * as wipReport from "../wipReport.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  aiContractorSearch: typeof aiContractorSearch;
  aiDailyLog: typeof aiDailyLog;
  aiDirector: typeof aiDirector;
  aiPm: typeof aiPm;
  aiPmCron: typeof aiPmCron;
  aiPmDocReader: typeof aiPmDocReader;
  aiPmEmailIntel: typeof aiPmEmailIntel;
  aiPmEngine: typeof aiPmEngine;
  aiPmSendEmail: typeof aiPmSendEmail;
  analyzeContract: typeof analyzeContract;
  auth: typeof auth;
  authEmail: typeof authEmail;
  autoDailyLog: typeof autoDailyLog;
  autoDocScan: typeof autoDocScan;
  autoRfiGenerator: typeof autoRfiGenerator;
  autopilotData: typeof autopilotData;
  autopilotEngine: typeof autopilotEngine;
  bidManager: typeof bidManager;
  bidManagerHelpers: typeof bidManagerHelpers;
  billing: typeof billing;
  budgetTracker: typeof budgetTracker;
  buyout: typeof buyout;
  calendar: typeof calendar;
  calendarAI: typeof calendarAI;
  changeOrderNotify: typeof changeOrderNotify;
  changeOrders: typeof changeOrders;
  clearAll: typeof clearAll;
  clientPortal: typeof clientPortal;
  clockInOut: typeof clockInOut;
  companyBranding: typeof companyBranding;
  concrete: typeof concrete;
  contacts: typeof contacts;
  contractAnalysis: typeof contractAnalysis;
  contractToRisks: typeof contractToRisks;
  crew: typeof crew;
  crewEmail: typeof crewEmail;
  crewNotifyCron: typeof crewNotifyCron;
  crewNotifyHelper: typeof crewNotifyHelper;
  crons: typeof crons;
  customTrades: typeof customTrades;
  dailyBriefing: typeof dailyBriefing;
  dailyBriefingHelper: typeof dailyBriefingHelper;
  dailyBriefingManual: typeof dailyBriefingManual;
  dailyLogs: typeof dailyLogs;
  dailySummary: typeof dailySummary;
  dashboard: typeof dashboard;
  decisionCron: typeof decisionCron;
  decisionEngine: typeof decisionEngine;
  decisionLog: typeof decisionLog;
  delayEngine: typeof delayEngine;
  delayEngineAI: typeof delayEngineAI;
  deliveries: typeof deliveries;
  discordWebhook: typeof discordWebhook;
  docAnalyzer: typeof docAnalyzer;
  docManager: typeof docManager;
  emailAutoAssign: typeof emailAutoAssign;
  emailConfig: typeof emailConfig;
  emailIntel: typeof emailIntel;
  emailIntelHelpers: typeof emailIntelHelpers;
  emailUploadProcessor: typeof emailUploadProcessor;
  emails: typeof emails;
  equipment: typeof equipment;
  estimating: typeof estimating;
  feedback: typeof feedback;
  fieldNotes: typeof fieldNotes;
  heliosAuthorization: typeof heliosAuthorization;
  heliosBidBasis: typeof heliosBidBasis;
  heliosCivilGeometry: typeof heliosCivilGeometry;
  heliosCivilGeometryActions: typeof heliosCivilGeometryActions;
  heliosCivilGeometryOpenAIContracts: typeof heliosCivilGeometryOpenAIContracts;
  heliosEngineeringShadow: typeof heliosEngineeringShadow;
  heliosEngineeringShadowSchedule: typeof heliosEngineeringShadowSchedule;
  heliosEstimateActions: typeof heliosEstimateActions;
  heliosEstimateBuild: typeof heliosEstimateBuild;
  heliosEstimateOpenAIContracts: typeof heliosEstimateOpenAIContracts;
  heliosEstimateReviews: typeof heliosEstimateReviews;
  heliosEstimateSupport: typeof heliosEstimateSupport;
  heliosEstimates: typeof heliosEstimates;
  heliosGateway: typeof heliosGateway;
  heliosIdentity: typeof heliosIdentity;
  heliosIntelligence: typeof heliosIntelligence;
  heliosIntelligenceActions: typeof heliosIntelligenceActions;
  heliosOpenAIContracts: typeof heliosOpenAIContracts;
  heliosPackages: typeof heliosPackages;
  heliosPlanActions: typeof heliosPlanActions;
  heliosPlanIntelligence: typeof heliosPlanIntelligence;
  heliosPlanOpenAIContracts: typeof heliosPlanOpenAIContracts;
  heliosProjects: typeof heliosProjects;
  heliosReviews: typeof heliosReviews;
  heliosTakeoffIntelligence: typeof heliosTakeoffIntelligence;
  http: typeof http;
  inboundEmailAddresses: typeof inboundEmailAddresses;
  incidents: typeof incidents;
  insuranceRequirements: typeof insuranceRequirements;
  legalAI: typeof legalAI;
  notificationProfiles: typeof notificationProfiles;
  paymentRules: typeof paymentRules;
  personalCalendar: typeof personalCalendar;
  photoPunch: typeof photoPunch;
  projectChat: typeof projectChat;
  projectDashboard: typeof projectDashboard;
  projectDetail: typeof projectDetail;
  projects: typeof projects;
  punchList: typeof punchList;
  rentals: typeof rentals;
  reporting: typeof reporting;
  rfis: typeof rfis;
  risks: typeof risks;
  scheduleConstraints: typeof scheduleConstraints;
  seed: typeof seed;
  seedDemo: typeof seedDemo;
  seedPersonal: typeof seedPersonal;
  sendEmail: typeof sendEmail;
  siteMedia: typeof siteMedia;
  siteWalk: typeof siteWalk;
  smartNag: typeof smartNag;
  specDNA: typeof specDNA;
  subcontractors: typeof subcontractors;
  submittalScanner: typeof submittalScanner;
  submittals: typeof submittals;
  tasks: typeof tasks;
  team: typeof team;
  teamEmail: typeof teamEmail;
  timeTracking: typeof timeTracking;
  todayPanel: typeof todayPanel;
  udigTickets: typeof udigTickets;
  vendors: typeof vendors;
  voiceCommand: typeof voiceCommand;
  voiceCommandHelpers: typeof voiceCommandHelpers;
  weather: typeof weather;
  weatherAlerts: typeof weatherAlerts;
  wipReport: typeof wipReport;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
