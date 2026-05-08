// @ts-nocheck
import { mutation } from "./_generated/server";

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("companies").first();
    if (existing) return "Already seeded";

    // Company
    const companyId = await ctx.db.insert("companies", { name: "Maziarz Construction", plan: "pro" });

    // User
    await ctx.db.insert("users", {
      companyId,
      email: "mike@maziarz.com",
      name: "Mike Maziarz",
      role: "admin",
      passwordHash: "h_1u09v",
      sessionToken: "",
    });

    // Projects
    const ledgeCreek = await ctx.db.insert("projects", {
      companyId,
      name: "Ledge Creek",
      code: "LED",
      location: "7725 Lake Road, Barker NY 14012",
      status: "Active",
    });

    const angelica = await ctx.db.insert("projects", {
      companyId,
      name: "Town of Angelica",
      code: "ANG",
      location: "Angelica, NY",
      status: "Active",
    });

    const westSeneca = await ctx.db.insert("projects", {
      companyId,
      name: "West Seneca Water Main",
      code: "WSN",
      location: "West Seneca, NY 14224",
      status: "Active",
    });

    // Equipment
    const boom = await ctx.db.insert("equipment", {
      companyId,
      name: "40' Stationary Boom",
      type: "Boom",
      serial: "BM001",
      hours: 320,
      nextDue: "2026-04-15",
      status: "Assigned",
    });

    const lull = await ctx.db.insert("equipment", {
      companyId,
      name: "10K Lull Telehandler",
      type: "Telehandler",
      serial: "LFT001",
      hours: 1450,
      nextDue: "2026-03-20",
      status: "Assigned",
    });

    const excavator = await ctx.db.insert("equipment", {
      companyId,
      name: "CAT 320 Excavator",
      type: "Excavator",
      serial: "EX003",
      hours: 4200,
      nextDue: "2026-03-01",
      status: "Assigned",
    });

    const loader = await ctx.db.insert("equipment", {
      companyId,
      name: "CAT 950 Wheel Loader",
      type: "Loader",
      serial: "LD004",
      hours: 3100,
      nextDue: "2026-05-10",
      status: "Available",
    });

    const dozer = await ctx.db.insert("equipment", {
      companyId,
      name: "CAT D6 Dozer",
      type: "Dozer",
      serial: "DZ005",
      hours: 2800,
      nextDue: "2026-04-01",
      status: "Assigned",
    });

    const roller = await ctx.db.insert("equipment", {
      companyId,
      name: "Bomag BW211 Roller",
      type: "Roller",
      serial: "RL006",
      hours: 980,
      nextDue: "2026-06-15",
      status: "Available",
    });

    // Rentals — Ledge Creek
    await ctx.db.insert("rentals", {
      projectId: ledgeCreek,
      equipmentId: boom,
      vendor: "Holland HighLift",
      po: "26001",
      start: "2026-02-10",
      end: "",
      rateType: "weekly",
      rate: 550,
      qty: 1,
      status: "On Rent",
      lastVerified: "2026-02-20",
    });

    await ctx.db.insert("rentals", {
      projectId: ledgeCreek,
      equipmentId: lull,
      vendor: "Holland HighLift",
      po: "26001",
      start: "2026-02-10",
      end: "",
      rateType: "weekly",
      rate: 1000,
      qty: 1,
      status: "On Rent",
      lastVerified: "2026-02-20",
    });

    // Rentals — West Seneca
    await ctx.db.insert("rentals", {
      projectId: westSeneca,
      equipmentId: excavator,
      vendor: "United Rentals",
      po: "26010",
      start: "2026-02-01",
      end: "",
      rateType: "weekly",
      rate: 2200,
      qty: 1,
      status: "On Rent",
      lastVerified: "2026-02-15",
    });

    await ctx.db.insert("rentals", {
      projectId: westSeneca,
      equipmentId: dozer,
      vendor: "Sunbelt Rentals",
      po: "26011",
      start: "2026-02-05",
      end: "2026-02-19",
      rateType: "weekly",
      rate: 1800,
      qty: 1,
      status: "On Rent",
      lastVerified: "",
    });

    // Deliveries
    await ctx.db.insert("deliveries", {
      projectId: ledgeCreek,
      supplier: "Niagara Concrete",
      material: "4000 PSI Ready Mix",
      po: "26020",
      eta: "2026-02-22",
      status: "Scheduled",
      notes: "Morning delivery 7AM",
    });

    await ctx.db.insert("deliveries", {
      projectId: ledgeCreek,
      supplier: "Lake Shore Sand & Gravel",
      material: "2A Aggregate - 30 ton",
      po: "26021",
      eta: "2026-02-23",
      status: "Confirmed",
    });

    await ctx.db.insert("deliveries", {
      projectId: westSeneca,
      supplier: "Ferguson Waterworks",
      material: "8\" DIP Water Main Pipe",
      po: "26030",
      eta: "2026-02-20",
      status: "Scheduled",
      notes: "Late — was due 2 days ago",
    });

    await ctx.db.insert("deliveries", {
      projectId: westSeneca,
      supplier: "HD Supply",
      material: "Gate Valves (6)",
      po: "26031",
      eta: "2026-02-24",
      status: "Scheduled",
    });

    await ctx.db.insert("deliveries", {
      projectId: angelica,
      supplier: "Cretex Concrete",
      material: "Precast Manholes (3)",
      po: "26040",
      eta: "2026-02-25",
      status: "Scheduled",
    });

    // Concrete Pours
    await ctx.db.insert("concretePours", {
      projectId: ledgeCreek,
      date: "2026-02-24",
      pour: "Foundation Wall Section A",
      cy: 45,
      mixDesign: "4000 PSI w/ fiber",
      supplier: "Niagara Concrete",
      pump: "42m Boom Pump",
      crew: "Crew A - 6 men",
      status: "Confirmed",
      weatherRisk: "Low",
    });

    await ctx.db.insert("concretePours", {
      projectId: ledgeCreek,
      date: "2026-02-28",
      pour: "Slab on Grade - Bay 1",
      cy: 80,
      mixDesign: "4500 PSI",
      supplier: "Niagara Concrete",
      pump: "Line Pump",
      crew: "Crew B - 8 men",
      status: "Planned",
      weatherRisk: "Medium",
    });

    await ctx.db.insert("concretePours", {
      projectId: westSeneca,
      date: "2026-03-03",
      pour: "Thrust Blocks (8)",
      cy: 12,
      mixDesign: "3500 PSI",
      supplier: "Lafarge",
      pump: "N/A - Direct",
      crew: "Crew C - 4 men",
      status: "Planned",
      weatherRisk: "Low",
    });

    // Vendors
    await ctx.db.insert("vendors", {
      companyId,
      name: "Holland HighLift",
      category: "Equipment Rental",
      contactName: "Dave Holland",
      phone: "716-555-0101",
      email: "dave@hollandhighlift.com",
      emergency: "716-555-0102",
      notes: "Primary crane/boom supplier",
      rating: 9,
    });

    await ctx.db.insert("vendors", {
      companyId,
      name: "United Rentals",
      category: "Equipment Rental",
      contactName: "Sarah Mitchell",
      phone: "716-555-0201",
      email: "smitchell@ur.com",
      notes: "Heavy equipment, good rates on long-term",
      rating: 8,
    });

    await ctx.db.insert("vendors", {
      companyId,
      name: "Sunbelt Rentals",
      category: "Equipment Rental",
      contactName: "Tom Brady",
      phone: "716-555-0301",
      email: "tbrady@sunbelt.com",
      notes: "Backup rental source",
      rating: 7,
    });

    await ctx.db.insert("vendors", {
      companyId,
      name: "Niagara Concrete",
      category: "Concrete",
      contactName: "Phil Romano",
      phone: "716-555-0401",
      email: "phil@niagaraconcrete.com",
      emergency: "716-555-0402",
      notes: "Primary concrete supplier, reliable",
      rating: 9,
    });

    await ctx.db.insert("vendors", {
      companyId,
      name: "Ferguson Waterworks",
      category: "Plumbing",
      contactName: "Jim Peters",
      phone: "716-555-0501",
      email: "jpeters@ferguson.com",
      notes: "Water/sewer pipe and fittings",
      rating: 7,
    });

    await ctx.db.insert("vendors", {
      companyId,
      name: "Lake Shore Sand & Gravel",
      category: "Aggregate",
      contactName: "Mike Lake",
      phone: "716-555-0601",
      email: "mlake@lakeshore.com",
      notes: "Aggregate, fill, topsoil",
      rating: 8,
    });

    // RFIs
    await ctx.db.insert("rfis", {
      projectId: ledgeCreek,
      number: "LED-RFI-001",
      subject: "Foundation wall reinforcement detail",
      question: "Drawing S-102 shows #5 bars @ 12\" OC but spec calls for #6 bars. Please clarify.",
      dateSent: "2026-02-12",
      responseRequired: "2026-02-19",
      status: "Open",
      ballInCourt: "Engineer",
      impactType: "Design Clarification",
      scheduleImpact: "Critical Path",
      costImpact: "Possible",
    });

    await ctx.db.insert("rfis", {
      projectId: angelica,
      number: "ANG-RFI-001",
      subject: "Self Storage Building Plans review",
      question: "Request for review & approval of building plans",
      dateSent: "2026-02-18",
      responseRequired: "2026-03-04",
      status: "Sent",
      ballInCourt: "Town",
      impactType: "Design Clarification",
      scheduleImpact: "Critical Path",
      costImpact: "Possible",
    });

    await ctx.db.insert("rfis", {
      projectId: westSeneca,
      number: "WSN-RFI-001",
      subject: "Existing utility conflict at Sta. 4+50",
      question: "Found unmarked gas line at proposed water main crossing. Request field directive.",
      dateSent: "2026-02-10",
      responseRequired: "2026-02-17",
      status: "Open",
      ballInCourt: "Owner/Engineer",
      impactType: "Field Condition",
      scheduleImpact: "Critical Path",
      costImpact: "Yes",
    });

    // Submittals
    await ctx.db.insert("submittals", {
      projectId: ledgeCreek,
      number: "LED-SUB-001",
      spec: "03300",
      description: "Concrete mix designs (4000 & 4500 PSI)",
      status: "Pending",
      dateSubmitted: "2026-02-08",
      dateRequired: "2026-02-22",
      ballInCourt: "Engineer",
    });

    await ctx.db.insert("submittals", {
      projectId: ledgeCreek,
      number: "LED-SUB-002",
      spec: "05120",
      description: "Structural steel shop drawings",
      status: "Pending",
      dateSubmitted: "2026-02-15",
      dateRequired: "2026-03-01",
      ballInCourt: "Architect",
    });

    await ctx.db.insert("submittals", {
      projectId: westSeneca,
      number: "WSN-SUB-001",
      spec: "15100",
      description: "8\" DIP pipe and fittings submittals",
      status: "Approved",
      dateSubmitted: "2026-01-25",
      dateRequired: "2026-02-10",
      ballInCourt: "Returned",
    });

    // Risks
    await ctx.db.insert("risks", {
      projectId: ledgeCreek,
      description: "Winter weather delays — concrete pours may need to be rescheduled",
      probability: "Medium",
      impact: "High",
      mitigation: "Monitor 10-day forecast, have blankets/heaters on standby, schedule pours for warmest days",
      owner: "PM",
      status: "Open",
    });

    await ctx.db.insert("risks", {
      projectId: westSeneca,
      description: "Unmarked utility conflicts — additional unknown utilities possible",
      probability: "High",
      impact: "High",
      mitigation: "Request 811 re-mark, pothole ahead of pipe installation, document all conflicts for change orders",
      owner: "PM / Superintendent",
      status: "Open",
    });

    await ctx.db.insert("risks", {
      projectId: angelica,
      description: "Town approval delays — building plans review timeline unknown",
      probability: "Medium",
      impact: "Medium",
      mitigation: "Follow up weekly with town clerk, escalate to supervisor if >14 days",
      owner: "PM",
      status: "Open",
    });

    // Maintenance
    await ctx.db.insert("maintenance", {
      equipmentId: excavator,
      date: "2026-02-01",
      service: "500 hr service — oil, filters, grease",
      cost: 850,
      notes: "Done by United Rentals on-site",
    });

    await ctx.db.insert("maintenance", {
      equipmentId: lull,
      date: "2026-01-15",
      service: "Annual inspection + tire replacement",
      cost: 2200,
      notes: "2 rear tires replaced",
    });

    return "Seeded successfully: 3 projects, 6 equipment, 4 rentals, 5 deliveries, 3 pours, 6 vendors, 3 RFIs, 3 submittals, 3 risks, 2 maintenance logs";
  },
});
