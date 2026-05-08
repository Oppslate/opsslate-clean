import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  companies: defineTable({
    name: v.string(),
    plan: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    planStatus: v.optional(v.string()),
    planExpiresAt: v.optional(v.number()),
    // Branding
    logoStorageId: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    tagline: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
  }).index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),

  users: defineTable({
    companyId: v.id("companies"),
    email: v.string(),
    name: v.string(),
    role: v.optional(v.string()),
    passwordHash: v.string(),
    sessionToken: v.optional(v.string()),
    resetToken: v.optional(v.string()),
    resetTokenExpiry: v.optional(v.number()),
    mustChangePassword: v.optional(v.boolean()),
  }).index("by_email", ["email"])
    .index("by_session", ["sessionToken"]),

  projects: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    code: v.optional(v.string()),
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    county: v.optional(v.string()),
    fabricator: v.optional(v.string()),
    contractor: v.optional(v.string()),
    type: v.optional(v.string()),
    size: v.optional(v.string()),
    style: v.optional(v.string()),
    contractDate: v.optional(v.string()),
    orderDate: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    foundationType: v.optional(v.string()),
    projectManager: v.optional(v.string()),
    planStatus: v.optional(v.string()),
    status: v.optional(v.string()),
    // Financial
    contractValue: v.optional(v.number()),
    retainagePercent: v.optional(v.number()),
    billingMethod: v.optional(v.string()), // "fixed" | "time-materials" | "cost-plus" | "unit-price"
    clientPO: v.optional(v.string()),
    contingencyPercent: v.optional(v.number()),
  }).index("by_company", ["companyId"]),

  equipment: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    type: v.optional(v.string()),
    serial: v.optional(v.string()),
    hours: v.optional(v.number()),
    nextDue: v.optional(v.string()),
    status: v.optional(v.string()),
  }).index("by_company", ["companyId"]),

  rentals: defineTable({
    projectId: v.id("projects"),
    equipmentId: v.id("equipment"),
    vendor: v.optional(v.string()),
    po: v.optional(v.string()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    rateType: v.optional(v.string()),
    rate: v.optional(v.number()),
    qty: v.optional(v.number()),
    deliveryFee: v.optional(v.number()),
    pickupFee: v.optional(v.number()),
    status: v.optional(v.string()),
    lastVerified: v.optional(v.string()),
    daysRented: v.optional(v.number()),
    totalCost: v.optional(v.number()),
  }).index("by_project", ["projectId"]),

  deliveries: defineTable({
    projectId: v.id("projects"),
    supplier: v.optional(v.string()),
    material: v.optional(v.string()),
    po: v.optional(v.string()),
    eta: v.optional(v.string()),
    status: v.optional(v.string()),
    confirmed: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  concretePours: defineTable({
    projectId: v.id("projects"),
    date: v.optional(v.string()),
    pour: v.optional(v.string()),
    cy: v.optional(v.number()),
    mixDesign: v.optional(v.string()),
    supplier: v.optional(v.string()),
    pump: v.optional(v.string()),
    crew: v.optional(v.string()),
    status: v.optional(v.string()),
    weatherRisk: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  // submittals and rfis defined below with enhanced schemas

  risks: defineTable({
    projectId: v.id("projects"),
    description: v.optional(v.string()),
    probability: v.optional(v.string()),
    impact: v.optional(v.string()),
    mitigation: v.optional(v.string()),
    owner: v.optional(v.string()),
    status: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  personalEvents: defineTable({
    date: v.string(),
    time: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    recurring: v.optional(v.string()),
    done: v.optional(v.boolean()),
  }).index("by_date", ["date"]),

  feedback: defineTable({
    companyId: v.id("companies"),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    category: v.optional(v.string()),
    message: v.string(),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_company", ["companyId"])
    .index("by_status", ["status"]),

  vendors: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    category: v.optional(v.string()),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    emergency: v.optional(v.string()),
    notes: v.optional(v.string()),
    rating: v.optional(v.number()),
  }).index("by_company", ["companyId"]),

  maintenance: defineTable({
    equipmentId: v.id("equipment"),
    date: v.optional(v.string()),
    service: v.optional(v.string()),
    cost: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_equipment", ["equipmentId"]),

  // documents defined below with enhanced schema

  tasks: defineTable({
    projectId: v.id("projects"),
    task: v.string(),
    customTask: v.optional(v.string()),
    dateOrdered: v.optional(v.string()),
    dateScheduled: v.optional(v.string()),
    startDate: v.optional(v.string()),
    dateComplete: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()), // "Not Started" | "In Progress" | "Blocked" | "Complete"
    impact: v.optional(v.string()),
    // New fields
    progress: v.optional(v.number()), // 0-100
    assignedTo: v.optional(v.string()), // contact name or company
    trade: v.optional(v.string()),
    phase: v.optional(v.string()), // "Pre-Construction" | "Foundation" | "Framing" | "Rough-In" | "Finish" | "Closeout"
    blocker: v.optional(v.string()),
    dependsOn: v.optional(v.array(v.string())), // task IDs
    activityLog: v.optional(v.array(v.object({
      date: v.string(),
      author: v.string(),
      note: v.string(),
      type: v.string(), // "note" | "status_change" | "date_change" | "progress" | "created"
    }))),
  }).index("by_project", ["projectId"]),

  fieldNotes: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    note: v.string(),
    author: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  customTrades: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
  }).index("by_company", ["companyId"]),

  contacts: defineTable({
    projectId: v.id("projects"),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    company: v.optional(v.string()),
    title: v.optional(v.string()),
    role: v.optional(v.string()),
    trade: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  emails: defineTable({
    companyId: v.string(),
    projectId: v.optional(v.string()),
    subject: v.string(),
    from: v.string(),
    to: v.optional(v.string()),
    cc: v.optional(v.string()),
    date: v.string(),
    body: v.optional(v.string()),
    bodyPreview: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    hasAttachments: v.optional(v.boolean()),
    attachmentNames: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
    threadId: v.optional(v.string()),
    importance: v.optional(v.string()),
    isRead: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    attachmentStorageIds: v.optional(v.array(v.string())),
    aiTone: v.optional(v.string()),
    aiRiskFlags: v.optional(v.array(v.string())),
    aiActionItems: v.optional(v.array(v.string())),
    aiSummary: v.optional(v.string()),
    // Workflow pipeline
    pipelineStatus: v.optional(v.string()),   // "inbox" | "processing" | "assigned" | "filed"
    processedByPm: v.optional(v.string()),     // PM name that processed this
    processedAt: v.optional(v.number()),
    extractedContacts: v.optional(v.number()),
    extractedTasks: v.optional(v.number()),
    extractedDates: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"])
    .index("by_date", ["companyId", "date"]),
  crew: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    trade: v.optional(v.string()),
    task: v.optional(v.string()),
    phaseCode: v.optional(v.string()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"]),

  changeOrders: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    number: v.optional(v.number()),
    title: v.string(),
    description: v.optional(v.string()),
    reason: v.optional(v.string()),
    requestedBy: v.optional(v.string()),
    requestedDate: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.string(),
    priority: v.optional(v.string()),
    // Cost
    costType: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    approvedCost: v.optional(v.number()),
    // Schedule
    scheduleDaysImpact: v.optional(v.number()),
    // Scope
    scopeDescription: v.optional(v.string()),
    affectedTrades: v.optional(v.array(v.string())),
    affectedArea: v.optional(v.string()),
    // Approval
    approvedBy: v.optional(v.string()),
    approvedDate: v.optional(v.string()),
    rejectedReason: v.optional(v.string()),
    // Crew
    notifyCrewIds: v.optional(v.array(v.string())),
    // Attachments / notes
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_status", ["projectId", "status"]),

  budget: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    originalContract: v.optional(v.number()),
    currentContract: v.optional(v.number()),
    totalCommitted: v.optional(v.number()),
    totalActual: v.optional(v.number()),
    contingency: v.optional(v.number()),
    updatedAt: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  voiceCommands: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    userId: v.string(),
    transcript: v.string(),
    action: v.string(),
    response: v.string(),
    timestamp: v.number(),
  }).index("by_project", ["projectId"]),

  delayPredictions: defineTable({
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    generatedAt: v.number(),
    overallRisk: v.string(),
    predictedDelayDays: v.number(),
    confidence: v.number(),
    predictions: v.any(),
    recommendations: v.any(),
    rawAnalysis: v.string(),
  }).index("by_project", ["projectId"]),

  bidDocuments: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    type: v.string(), // "bid_proposal" | "bid_breakdown" | "contract"
    fileName: v.string(),
    fileId: v.id("_storage"),
    uploadedAt: v.number(),
    status: v.string(), // "uploaded" | "processing" | "extracted" | "failed"
    extractedData: v.optional(v.any()), // AI-extracted JSON
  }).index("by_project", ["projectId"]),

  bidLineItems: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    documentId: v.id("bidDocuments"),
    costCode: v.optional(v.string()),
    description: v.string(),
    category: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    bidAmount: v.number(),
    committed: v.optional(v.number()),
    actual: v.optional(v.number()),
    variance: v.optional(v.number()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()), // "bid_proposal" | "bid_breakdown" | "contract"
  }).index("by_project", ["projectId"]),

  budgetLineItems: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    costCode: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    budgeted: v.number(),
    committed: v.optional(v.number()),
    actual: v.optional(v.number()),
    variance: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  subcontractors: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    trade: v.optional(v.string()),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    license: v.optional(v.string()),
    licenseExpiry: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    rating: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    projectIds: v.optional(v.array(v.string())),
  }).index("by_company", ["companyId"]),

  rfis: defineTable({
    companyId: v.optional(v.any()),
    projectId: v.id("projects"),
    number: v.optional(v.any()),
    subject: v.optional(v.string()),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    requestedBy: v.optional(v.string()),
    dateSubmitted: v.optional(v.string()),
    dateRequired: v.optional(v.string()),
    dateAnswered: v.optional(v.string()),
    costImpact: v.optional(v.any()),
    scheduleImpact: v.optional(v.any()),
    notes: v.optional(v.string()),
    // Legacy fields
    sent: v.optional(v.string()),
    dateSent: v.optional(v.string()),
    responseRequired: v.optional(v.string()),
    ballInCourt: v.optional(v.string()),
    impactType: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  submittals: defineTable({
    companyId: v.optional(v.any()),
    projectId: v.id("projects"),
    number: v.optional(v.any()),
    title: v.optional(v.string()),
    specSection: v.optional(v.string()),
    description: v.optional(v.string()),
    submittedBy: v.optional(v.string()),
    submittedDate: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    reviewer: v.optional(v.string()),
    reviewDate: v.optional(v.string()),
    reviewAction: v.optional(v.string()),
    reviewComments: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    trade: v.optional(v.string()),
    notes: v.optional(v.string()),
    itemNumber: v.optional(v.string()),
    sourceDocumentId: v.optional(v.id("documents")),
    sourceDocumentName: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    uploadDocumentId: v.optional(v.id("documents")),
    uploadDocumentName: v.optional(v.string()),
    uploadDate: v.optional(v.string()),
    adminDecisionBy: v.optional(v.string()),
    adminDecisionDate: v.optional(v.string()),
    // Legacy fields
    spec: v.optional(v.string()),
    dateSubmitted: v.optional(v.string()),
    dateRequired: v.optional(v.string()),
    ballInCourt: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  timeEntries: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    crewMemberId: v.optional(v.string()),
    crewMemberName: v.string(),
    trade: v.optional(v.string()),
    date: v.string(),
    hoursRegular: v.number(),
    hoursOvertime: v.optional(v.number()),
    hoursDouble: v.optional(v.number()),
    rateRegular: v.optional(v.number()),
    rateOvertime: v.optional(v.number()),
    costCode: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    // Clock in/out fields
    clockInTime: v.optional(v.number()),
    clockOutTime: v.optional(v.number()),
    clockedOut: v.optional(v.boolean()),
    clockedInBy: v.optional(v.string()),
    totalHours: v.optional(v.number()),
    totalCost: v.optional(v.number()),
  }).index("by_project", ["projectId"])
    .index("by_company", ["companyId"])
    .index("by_date", ["projectId", "date"]),

  documents: defineTable({
    companyId: v.id("companies"),
    projectId: v.optional(v.id("projects")),
    name: v.string(),
    category: v.string(),
    url: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    uploadedBy: v.optional(v.string()),
    uploadedAt: v.optional(v.string()),
    version: v.optional(v.any()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    aiExtract: v.optional(v.string()),
    aiStatus: v.optional(v.string()),
    // Legacy fields
    description: v.optional(v.string()),
    fileName: v.optional(v.string()),
    storageId: v.optional(v.any()),
    status: v.optional(v.string()),
    createdAt: v.optional(v.any()),
    updatedAt: v.optional(v.any()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"]),

  autopilot: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    enabled: v.boolean(),
    // What AI controls
    managesCrew: v.optional(v.boolean()),
    managesSupplies: v.optional(v.boolean()),
    managesSchedule: v.optional(v.boolean()),
    monitorsWeather: v.optional(v.boolean()),
    monitorsSafety: v.optional(v.boolean()),
    autoSendEmails: v.optional(v.boolean()),
    generatesDailyLogs: v.optional(v.boolean()),
    // AI context
    projectGoals: v.optional(v.string()),
    constraints: v.optional(v.string()),
    budget: v.optional(v.number()),
    deadline: v.optional(v.string()),
    // Scope & Schedule
    scopeOfWork: v.optional(v.string()),
    phases: v.optional(v.string()),
    currentPhase: v.optional(v.string()),
    milestones: v.optional(v.string()),
    // State
    lastRunAt: v.optional(v.string()),
    lastRunSummary: v.optional(v.string()),
    totalActions: v.optional(v.number()),
    enabledAt: v.optional(v.string()),
    enabledBy: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"]),

  autopilotLog: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    type: v.string(),
    category: v.string(),
    title: v.string(),
    description: v.string(),
    actionTaken: v.optional(v.string()),
    status: v.string(),
    confidence: v.optional(v.number()),
    requiresApproval: v.optional(v.boolean()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    rejectedBy: v.optional(v.string()),
    rejectedReason: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_project", ["projectId"])
    .index("by_company", ["companyId"])
    .index("by_status", ["projectId", "status"]),

  weatherAlerts: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    date: v.string(),
    alertType: v.string(),
    severity: v.string(),
    message: v.string(),
    recommendation: v.string(),
    affectedWork: v.optional(v.array(v.string())),
    crewNotified: v.optional(v.boolean()),
    notifiedAt: v.optional(v.string()),
    dismissed: v.optional(v.boolean()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_date", ["companyId", "date"]),

  incidents: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    number: v.optional(v.number()),
    // Incident details
    title: v.string(),
    type: v.string(),
    severity: v.string(),
    status: v.string(),
    date: v.string(),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.string(),
    // People involved
    injuredPerson: v.optional(v.string()),
    injuredPersonRole: v.optional(v.string()),
    injuredPersonCompany: v.optional(v.string()),
    injuryType: v.optional(v.string()),
    bodyPart: v.optional(v.string()),
    treatmentGiven: v.optional(v.string()),
    hospitalTransport: v.optional(v.boolean()),
    // Witnesses
    witnesses: v.optional(v.array(v.object({
      name: v.string(),
      company: v.optional(v.string()),
      statement: v.optional(v.string()),
    }))),
    // Root cause
    rootCause: v.optional(v.string()),
    contributingFactors: v.optional(v.array(v.string())),
    // Risk assessment
    riskLevel: v.optional(v.string()),
    likelihoodOfRecurrence: v.optional(v.string()),
    potentialConsequence: v.optional(v.string()),
    // Response path
    immediateActions: v.optional(v.array(v.object({
      action: v.string(),
      assignedTo: v.optional(v.string()),
      status: v.string(),
      completedDate: v.optional(v.string()),
    }))),
    correctiveActions: v.optional(v.array(v.object({
      action: v.string(),
      assignedTo: v.optional(v.string()),
      dueDate: v.optional(v.string()),
      status: v.string(),
      completedDate: v.optional(v.string()),
    }))),
    preventiveActions: v.optional(v.array(v.object({
      action: v.string(),
      assignedTo: v.optional(v.string()),
      dueDate: v.optional(v.string()),
      status: v.string(),
    }))),
    // OSHA
    oshaReportable: v.optional(v.boolean()),
    oshaRecordNumber: v.optional(v.string()),
    daysAwayFromWork: v.optional(v.number()),
    restrictedDutyDays: v.optional(v.number()),
    // Notifications
    notifiedParties: v.optional(v.array(v.string())),
    // Meta
    reportedBy: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedDate: v.optional(v.string()),
    closedBy: v.optional(v.string()),
    closedDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_severity", ["companyId", "severity"])
    .index("by_status", ["companyId", "status"]),

  incidentComments: defineTable({
    incidentId: v.id("incidents"),
    author: v.string(),
    text: v.string(),
    type: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_incident", ["incidentId"]),

  siteMedia: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    type: v.string(),
    fileName: v.string(),
    url: v.string(),
    thumbnailUrl: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    // Metadata
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    capturedDate: v.optional(v.string()),
    capturedBy: v.optional(v.string()),
    // Drone specific
    altitude: v.optional(v.string()),
    gpsCoords: v.optional(v.string()),
    // Linked items
    linkedPunchId: v.optional(v.string()),
    linkedChangeOrderId: v.optional(v.string()),
    linkedDailyLogId: v.optional(v.string()),
    // Status
    status: v.optional(v.string()),
    uploadedBy: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_category", ["projectId", "category"])
    .index("by_type", ["projectId", "type"]),

  changeOrderComments: defineTable({
    changeOrderId: v.id("changeOrders"),
    author: v.string(),
    text: v.string(),
    type: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_co", ["changeOrderId"]),

  punchList: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    number: v.optional(v.number()),
    title: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    trade: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    assignedCompany: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.string(),
    dueDate: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_status", ["projectId", "status"]),

  dailyLogs: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    date: v.string(),
    createdBy: v.optional(v.string()),
    // Weather
    weatherCondition: v.optional(v.string()),
    tempHigh: v.optional(v.number()),
    tempLow: v.optional(v.number()),
    wind: v.optional(v.string()),
    precipitation: v.optional(v.string()),
    // Manpower
    manpower: v.optional(v.array(v.object({
      trade: v.string(),
      company: v.optional(v.string()),
      headcount: v.number(),
      hours: v.optional(v.number()),
    }))),
    totalManpower: v.optional(v.number()),
    // Equipment on site
    equipmentOnSite: v.optional(v.array(v.object({
      name: v.string(),
      status: v.optional(v.string()),
      hours: v.optional(v.number()),
    }))),
    // Work performed
    workPerformed: v.optional(v.string()),
    // Delays
    delays: v.optional(v.array(v.object({
      description: v.string(),
      cause: v.optional(v.string()),
      hoursLost: v.optional(v.number()),
    }))),
    // Visitors
    visitors: v.optional(v.array(v.object({
      name: v.string(),
      company: v.optional(v.string()),
      purpose: v.optional(v.string()),
    }))),
    // Safety
    safetyIncidents: v.optional(v.string()),
    toolboxTalk: v.optional(v.string()),
    // Notes
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"])
    .index("by_date", ["companyId", "date"]),

  contractAnalysis: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    rawText: v.optional(v.string()),
    summary: v.optional(v.string()),
    insuranceRequirements: v.optional(v.array(v.object({
      requirement: v.string(),
      limit: v.optional(v.string()),
    }))),
    criticalDates: v.optional(v.array(v.object({
      date: v.string(),
      description: v.string(),
    }))),
    schedulingMilestones: v.optional(v.array(v.object({
      milestone: v.string(),
      date: v.optional(v.string()),
    }))),
    risks: v.optional(v.array(v.object({
      risk: v.string(),
      severity: v.optional(v.string()),
    }))),
    status: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"]),

  notificationProfiles: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    email: v.string(),
    type: v.string(), // "full_dashboard" | "job_updates" | "crew_schedule" | "custom"
    projectIds: v.optional(v.array(v.string())), // specific projects (empty = all)
    includeCalendar: v.optional(v.boolean()),
    includeTodayPanel: v.optional(v.boolean()),
    includeCrewSchedule: v.optional(v.boolean()),
    active: v.optional(v.boolean()),
  }).index("by_company", ["companyId"]),

  insuranceRequirements: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    extractedText: v.optional(v.string()),
    requirements: v.optional(v.array(v.object({
      category: v.string(),
      description: v.string(),
      limit: v.optional(v.string()),
      status: v.optional(v.string()),
    }))),
    status: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"]),

  teamMembers: defineTable({
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    email: v.string(),
    name: v.string(),
    role: v.string(), // owner, admin, pm, field
    status: v.string(), // active, invited, disabled
    assignedProjects: v.optional(v.array(v.string())),
    inviteToken: v.optional(v.string()),
    invitedBy: v.optional(v.string()),
    invitedAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    permissions: v.optional(v.object({
      // per-module overrides: "full" | "write" | "read" | "none"
      budget: v.optional(v.string()),
      bidTracker: v.optional(v.string()),
      crew: v.optional(v.string()),
      dailyLogs: v.optional(v.string()),
      timeTracking: v.optional(v.string()),
      punchList: v.optional(v.string()),
      safety: v.optional(v.string()),
      siteMedia: v.optional(v.string()),
      changeOrders: v.optional(v.string()),
      rfis: v.optional(v.string()),
      submittals: v.optional(v.string()),
      correspondence: v.optional(v.string()),
      documents: v.optional(v.string()),
      aiTools: v.optional(v.string()),
      reports: v.optional(v.string()),
    })),
  }).index("by_company", ["companyId"])
    .index("by_email", ["companyId", "email"])
    .index("by_user", ["userId"])
    .index("by_invite", ["inviteToken"]),

  activityLog: defineTable({
    companyId: v.id("companies"),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    action: v.string(),
    module: v.string(),
    projectId: v.optional(v.string()),
    details: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"])
    .index("by_user", ["companyId", "userId"]),

  // ========================================
  // ESTIMATING MODULE (OpsSlate Suite)
  // ========================================

  costItems: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    category: v.string(), // Labor, Equipment, Materials, Subcontractor
    unit: v.optional(v.string()),
    unitCost: v.number(),
    description: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_category", ["companyId", "category"]),

  estimates: defineTable({
    companyId: v.id("companies"),
    projectId: v.optional(v.id("projects")), // Link to OpsSlate project when won
    name: v.string(),
    client: v.optional(v.string()),
    location: v.optional(v.string()),
    bidDate: v.optional(v.string()),
    status: v.string(), // draft, submitted, won, lost
    bidType: v.optional(v.string()), // dot, building
    description: v.optional(v.string()),
    overhead: v.optional(v.number()),
    profit: v.optional(v.number()),
    bond: v.optional(v.number()),
    tax: v.optional(v.number()),
    notes: v.optional(v.string()),
    // DOT fields
    projectNumber: v.optional(v.string()),
    federalAid: v.optional(v.string()),
    dbeGoal: v.optional(v.number()),
    contractDays: v.optional(v.number()),
    liquidatedDamages: v.optional(v.number()),
    preBidMeeting: v.optional(v.string()),
    prevailingWage: v.optional(v.string()),
    bidBondRequired: v.optional(v.string()),
    // Building fields
    bidMethod: v.optional(v.string()),
    buildingType: v.optional(v.string()),
    squareFootage: v.optional(v.number()),
    floors: v.optional(v.number()),
    architect: v.optional(v.string()),
    addendaCount: v.optional(v.number()),
    alternates: v.optional(v.string()),
    trusses: v.optional(v.number()),
    ends: v.optional(v.number()),
  }).index("by_company", ["companyId"])
    .index("by_status", ["companyId", "status"])
    .index("by_project", ["projectId"]),

  estimateItems: defineTable({
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    section: v.optional(v.string()),
    description: v.string(),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    unitCost: v.optional(v.number()),
    taxPct: v.optional(v.number()),
    costItemId: v.optional(v.id("costItems")),
    notes: v.optional(v.string()),
  }).index("by_estimate", ["estimateId"])
    .index("by_company", ["companyId"]),

  estimateCrews: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    items: v.optional(v.any()), // [{name, quantity, unitCost}]
  }).index("by_company", ["companyId"]),

  estimateAssemblies: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    items: v.optional(v.any()), // [{name, quantity, unit, unitCost}]
  }).index("by_company", ["companyId"]),

  estimateRfqs: defineTable({
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    vendorName: v.string(),
    amount: v.optional(v.number()),
    status: v.optional(v.string()), // draft, sent, received, accepted, rejected
    dueDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_estimate", ["estimateId"])
    .index("by_company", ["companyId"]),

  engineerEstimates: defineTable({
    companyId: v.id("companies"),
    estimateId: v.id("estimates"),
    itemCode: v.optional(v.string()),
    description: v.string(),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    unitCost: v.optional(v.number()),
  }).index("by_estimate", ["estimateId"])
    .index("by_company", ["companyId"]),

  udigTickets: defineTable({
    companyId: v.string(),
    projectId: v.optional(v.string()),
    dateCalled: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    ticketNumber: v.string(),
    emailCopy: v.optional(v.string()),
    completionDate: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"]),

  // ===== BUYOUT / PROCUREMENT =====
  buyoutItems: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    category: v.string(), // Concrete, Steel, Pipe, Electrical, Equipment Rental, Misc
    description: v.string(),
    budgetAmount: v.number(), // from estimate
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    // Vendor/Sub awards
    awardedVendor: v.optional(v.string()),
    awardedAmount: v.optional(v.number()),
    awardedDate: v.optional(v.string()),
    poNumber: v.optional(v.string()),
    // Tracking
    status: v.string(), // open, quoted, awarded, ordered, delivered, complete, cancelled
    quotesReceived: v.optional(v.number()),
    leadTime: v.optional(v.string()),
    deliveryDate: v.optional(v.string()),
    // Savings
    savings: v.optional(v.number()), // budget - awarded
    savingsPercent: v.optional(v.number()),
    // Notes & docs
    notes: v.optional(v.string()),
    scope: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_project", ["companyId", "projectId"]),

  buyoutQuotes: defineTable({
    companyId: v.id("companies"),
    buyoutItemId: v.id("buyoutItems"),
    vendorName: v.string(),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    amount: v.number(),
    unitPrice: v.optional(v.number()),
    leadTime: v.optional(v.string()),
    notes: v.optional(v.string()),
    quoteDate: v.optional(v.string()),
    expiresDate: v.optional(v.string()),
    status: v.string(), // pending, selected, rejected, expired
    createdAt: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_item", ["buyoutItemId"]),

  // Decision Intelligence
  decisionLog: defineTable({
    companyId: v.string(),
    type: v.string(),
    description: v.string(),
    action: v.string(),
    project: v.string(),
    confidence: v.number(),
    outcome: v.string(),
    date: v.string(),
    wasOverridden: v.boolean(),
    overrideReason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),

  // Client Portal
  clientPortalLinks: defineTable({
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    token: v.string(),
    clientName: v.string(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_company", ["companyId"])
    .index("by_token", ["token"]),

  // AI Project Manager System
  aiProjectManagers: defineTable({
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    name: v.string(),
    avatar: v.string(), // emoji avatar
    personality: v.string(), // "direct" | "detailed" | "friendly"
    voice: v.optional(v.string()),
    status: v.string(), // "active" | "paused"
    permissions: v.optional(v.object({
      contacts: v.optional(v.string()),       // "none" | "read" | "readwrite"
      tasks: v.optional(v.string()),          // "none" | "read" | "readwrite"
      emails: v.optional(v.string()),         // "none" | "read" | "readwrite"
      documents: v.optional(v.string()),      // "none" | "read" | "readwrite"
      budget: v.optional(v.string()),         // "none" | "read" | "readwrite"
      schedule: v.optional(v.string()),       // "none" | "read" | "readwrite"
      changeOrders: v.optional(v.string()),   // "none" | "read" | "readwrite"
      rfis: v.optional(v.string()),           // "none" | "read" | "readwrite"
      submittals: v.optional(v.string()),     // "none" | "read" | "readwrite"
      deliveries: v.optional(v.string()),     // "none" | "read" | "readwrite"
      crew: v.optional(v.string()),           // "none" | "read" | "readwrite"
      punchList: v.optional(v.string()),      // "none" | "read" | "readwrite"
    })),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_project", ["projectId"]),

  aiPmMessages: defineTable({
    pmId: v.id("aiProjectManagers"),
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    role: v.string(), // "user" | "pm"
    message: v.string(),
    createdAt: v.number(),
  }).index("by_pm", ["pmId"])
    .index("by_project", ["projectId"]),

  aiPmTasks: defineTable({
    pmId: v.id("aiProjectManagers"),
    projectId: v.id("projects"),
    companyId: v.id("companies"),
    description: v.string(),
    type: v.string(), // "email_draft" | "follow_up" | "report" | "analysis" | "general"
    status: v.string(), // "pending" | "in_progress" | "waiting_approval" | "done" | "failed"
    result: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_pm", ["pmId"])
    .index("by_project", ["projectId"])
    .index("by_company", ["companyId"]),

  aiWarRoom: defineTable({
    companyId: v.id("companies"),
    fromPmId: v.id("aiProjectManagers"),
    fromPmName: v.string(),
    fromProject: v.string(),
    message: v.string(),
    type: v.string(), // "coordination" | "conflict" | "resource" | "update"
    resolved: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),
});
