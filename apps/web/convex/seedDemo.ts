import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seed = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    // === PROJECTS ===
    const proj1 = await ctx.db.insert("projects", {
      companyId,
      name: "Downtown Office Renovation",
      code: "DOR-2026",
      location: "245 Main St, Buffalo NY 14203",
      type: "Commercial",
      status: "Active",
      contractor: "Maziarz Construction",
      projectManager: "Mike Maziarz",
      foundationType: "Existing Concrete",
      style: "Modern Open-Plan",
      size: "32,000 SF",
    });

    const proj2 = await ctx.db.insert("projects", {
      companyId,
      name: "Highway 90 Bridge Repair",
      code: "HBR-2026",
      location: "I-90 Westbound, Mile Marker 42, Erie County NY",
      type: "Civil/Infrastructure",
      status: "Active",
      contractor: "Empire State Bridge Co",
      projectManager: "Tom Reynolds",
      foundationType: "Deep Piles",
      size: "4-Lane, 280ft Span",
    });

    const proj3 = await ctx.db.insert("projects", {
      companyId,
      name: "Lakeside Residential Complex",
      code: "LRC-2026",
      location: "1800 Lakeshore Blvd, Hamburg NY 14075",
      type: "Residential",
      status: "Bidding",
      contractor: "TBD",
      projectManager: "Sarah Chen",
      foundationType: "Slab on Grade",
      style: "Contemporary",
      size: "48 Units, 3 Buildings",
    });

    const proj4 = await ctx.db.insert("projects", {
      companyId,
      name: "School District HVAC Upgrade",
      code: "SDH-2026",
      location: "Buffalo Public Schools District, Multiple Sites",
      type: "Institutional",
      status: "Pre-Construction",
      contractor: "Climate Systems Inc",
      projectManager: "Mike Maziarz",
      size: "6 Schools, 450,000 SF Total",
    });

    // === DAILY LOGS (for project 1) ===
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      
      const logs = [
        {
          weather: "Clear, 42°F",
          wind: "8 mph NW",
          precipitation: "None",
          summary: "Drywall installation continued on floors 2-3. Electrical rough-in 90% complete on floor 1. HVAC ductwork started in east wing. No delays.",
          manpower: [
            { trade: "Drywall", company: "Buffalo Interiors", headcount: 8 },
            { trade: "Electrical", company: "Volt Electric", headcount: 4 },
            { trade: "HVAC", company: "Climate Systems", headcount: 3 },
          ],
        },
        {
          weather: "Partly Cloudy, 38°F",
          wind: "12 mph W",
          precipitation: "Light snow AM",
          summary: "Morning snow delayed start by 1 hour. Painting started on floor 1. Fire suppression inspection passed. Elevator shaft framing complete.",
          manpower: [
            { trade: "Painting", company: "Pro Finish Painters", headcount: 5 },
            { trade: "Fire Suppression", company: "SafeGuard Fire", headcount: 2 },
            { trade: "Iron Workers", company: "Allied Steel", headcount: 4 },
          ],
        },
        {
          weather: "Overcast, 35°F",
          wind: "15 mph NW",
          precipitation: "None",
          summary: "Concrete pour for floor 3 mezzanine — 45 yards delivered. Plumbing rough-in started in restrooms. Safety walk completed, no issues found.",
          manpower: [
            { trade: "Concrete", company: "Buffalo Ready Mix", headcount: 6 },
            { trade: "Plumbing", company: "Niagara Plumbing", headcount: 3 },
            { trade: "General Labor", company: "Self-Performed", headcount: 4 },
          ],
        },
        {
          weather: "Sunny, 45°F",
          wind: "5 mph S",
          precipitation: "None",
          summary: "Great weather day. Exterior window installation completed on south face. Roofing membrane 60% complete. Client walk-through at 2pm — positive feedback on progress.",
          manpower: [
            { trade: "Glazing", company: "Crystal Glass Co", headcount: 4 },
            { trade: "Roofing", company: "Summit Roofing", headcount: 5 },
            { trade: "Carpentry", company: "Self-Performed", headcount: 3 },
          ],
        },
        {
          weather: "Rain, 40°F",
          wind: "20 mph W",
          precipitation: "0.8 in",
          summary: "Rain day — exterior work stopped. Interior work continued. Flooring installation started in lobby. IT rough-in for server room complete. RFI submitted for curtain wall detail at corner.",
          manpower: [
            { trade: "Flooring", company: "Floor Masters", headcount: 4 },
            { trade: "Low Voltage", company: "DataCom Systems", headcount: 2 },
            { trade: "Carpentry", company: "Self-Performed", headcount: 3 },
          ],
        },
      ];

      const log = logs[i];
      await ctx.db.insert("dailyLogs", {
        companyId,
        projectId: proj1,
        date: dateStr,
        weatherCondition: log.weather,
        wind: log.wind,
        precipitation: log.precipitation,
        workPerformed: log.summary,
        manpower: log.manpower,
        createdBy: "Demo User",
      });
    }

    // === CREW MEMBERS ===
    const crewMembers = [
      { firstName: "Mike", lastName: "Maziarz", trade: "Management", email: "mike@demo.com", status: "Active" },
      { firstName: "Tom", lastName: "Reynolds", trade: "General", email: "tom@demo.com", status: "Active" },
      { firstName: "Sarah", lastName: "Chen", trade: "Engineering", email: "sarah@demo.com", status: "Active" },
      { firstName: "Jake", lastName: "Miller", trade: "Concrete", status: "Active" },
      { firstName: "Carlos", lastName: "Rivera", trade: "Electrical", status: "Active" },
      { firstName: "Dave", lastName: "Wilson", trade: "Heavy Equipment", status: "Active" },
      { firstName: "Tony", lastName: "Russo", trade: "General", status: "Active" },
      { firstName: "Chris", lastName: "Johnson", trade: "Safety", email: "chris@demo.com", status: "Active" },
    ];

    for (const c of crewMembers) {
      await ctx.db.insert("crew", {
        companyId,
        projectId: proj1,
        firstName: c.firstName,
        lastName: c.lastName,
        trade: c.trade,
        email: c.email,
        status: c.status,
      });
    }

    // === SUBCONTRACTORS ===
    const subs = [
      { name: "Volt Electric LLC", trade: "Electrical", contact: "Jim Volt", phone: "716-555-0201", email: "jim@voltelectric.com", status: "Active", rating: 5 },
      { name: "Niagara Plumbing Co", trade: "Plumbing", contact: "Pat Niagara", phone: "716-555-0202", email: "pat@niagaraplumbing.com", status: "Active", rating: 4 },
      { name: "Climate Systems Inc", trade: "HVAC", contact: "Bob Climate", phone: "716-555-0203", email: "bob@climatesystems.com", status: "Active", rating: 5 },
      { name: "Summit Roofing", trade: "Roofing", contact: "Mark Summit", phone: "716-555-0204", email: "mark@summitroofing.com", status: "Active", rating: 4 },
      { name: "Buffalo Interiors", trade: "Drywall/Framing", contact: "Lisa Interior", phone: "716-555-0205", email: "lisa@buffalointeriors.com", status: "Active", rating: 5 },
      { name: "Pro Finish Painters", trade: "Painting", contact: "Ray Finish", phone: "716-555-0206", status: "Active", rating: 3 },
    ];

    for (const s of subs) {
      await ctx.db.insert("subcontractors", {
        companyId,
        name: s.name,
        trade: s.trade,
        contactName: s.contact,
        phone: s.phone,
        email: s.email,
        status: s.status,
        rating: s.rating,
      });
    }

    // === BUDGET (for project 1) ===
    const budgetItems = [
      { code: "01-0000", description: "General Conditions", category: "General", budgeted: 185000, committed: 172000 },
      { code: "03-0000", description: "Concrete", category: "Structure", budgeted: 320000, committed: 298000 },
      { code: "05-0000", description: "Structural Steel", category: "Structure", budgeted: 450000, committed: 445000 },
      { code: "07-0000", description: "Roofing & Waterproofing", category: "Envelope", budgeted: 180000, committed: 175000 },
      { code: "08-0000", description: "Doors & Windows", category: "Envelope", budgeted: 220000, committed: 210000 },
      { code: "09-0000", description: "Finishes (Drywall, Paint, Flooring)", category: "Interiors", budgeted: 275000, committed: 240000 },
      { code: "15-0000", description: "Mechanical/HVAC", category: "MEP", budgeted: 380000, committed: 365000 },
      { code: "16-0000", description: "Electrical", category: "MEP", budgeted: 290000, committed: 278000 },
      { code: "21-0000", description: "Fire Suppression", category: "MEP", budgeted: 95000, committed: 92000 },
      { code: "31-0000", description: "Site Work & Excavation", category: "Site", budgeted: 150000, committed: 148000 },
    ];

    for (const b of budgetItems) {
      await ctx.db.insert("budgetLineItems", {
        projectId: proj1,
        companyId,
        costCode: b.code,
        description: b.description,
        category: b.category,
        budgeted: b.budgeted,
        committed: b.committed,
        actual: Math.round(b.committed * (0.4 + Math.random() * 0.3)),
      });
    }

    // === RFIs ===
    const rfis = [
      { number: "RFI-001", subject: "Curtain wall detail at NW corner", status: "Open", priority: "High", assignedTo: "Architect", dueDate: "2026-03-15" },
      { number: "RFI-002", subject: "Floor drain locations in mechanical room", status: "Answered", priority: "Medium", assignedTo: "MEP Engineer", dueDate: "2026-03-10" },
      { number: "RFI-003", subject: "Steel connection detail at grid line 4/C", status: "Open", priority: "High", assignedTo: "Structural Engineer", dueDate: "2026-03-12" },
      { number: "RFI-004", subject: "Paint color confirmation for lobby accent wall", status: "Draft", priority: "Low", assignedTo: "Interior Designer", dueDate: "2026-03-20" },
    ];

    for (const r of rfis) {
      await ctx.db.insert("rfis", {
        projectId: proj1,
        companyId,
        number: r.number,
        subject: r.subject,
        status: r.status,
        priority: r.priority,
        assignedTo: r.assignedTo,
        dateRequired: r.dueDate,
      });
    }

    // === EQUIPMENT ===
    const equipment = [
      { name: "CAT 320 Excavator", type: "Heavy", serial: "CAT320-88721", hours: 4280, status: "Active", nextDue: "2026-04-01" },
      { name: "Bobcat S650 Skid Steer", type: "Light", serial: "BOB650-33492", hours: 2150, status: "Active", nextDue: "2026-03-20" },
      { name: "JLG 600S Boom Lift", type: "Aerial", serial: "JLG600-55103", hours: 1890, status: "In Shop", nextDue: "2026-03-08" },
      { name: "Wacker Neuson Plate Compactor", type: "Compaction", serial: "WN-PC-7721", hours: 890, status: "Active", nextDue: "2026-05-15" },
    ];

    for (const eq of equipment) {
      await ctx.db.insert("equipment", {
        companyId,
        name: eq.name,
        type: eq.type,
        serial: eq.serial,
        hours: eq.hours,
        status: eq.status,
        nextDue: eq.nextDue,
      });
    }

    return { projects: [proj1, proj2, proj3, proj4], success: true };
  },
});
