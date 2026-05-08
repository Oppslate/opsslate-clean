"use client";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const sections = [
  {
    id: "getting-started",
    icon: "🚀",
    title: "Getting Started",
    steps: [
      { title: "Log in", text: "Use the credentials provided by your admin. You'll land on the Dashboard — your daily command center." },
      { title: "Create your first project", text: "Click \"+ Create New Project\" on the Dashboard. Enter a project name, optional code (e.g. LC-2026), and location. Hit Save — it appears instantly." },
      { title: "Add equipment", text: "Go to Equipment → \"+ Add Equipment\". Enter name, type, serial/unit number, and hours. This is your fleet inventory." },
      { title: "Create a rental", text: "Go to Rentals → \"+ Add Rental\". Pick a project and equipment, then fill in vendor, PO, rate, and start date." },
      { title: "Explore the Dashboard", text: "Your Dashboard shows KPIs per job — weekly burn, monthly exposure, cost to date, open RFIs, and more. Click any job name to see full details." },
    ],
  },
  {
    id: "create-project",
    icon: "📁",
    title: "Creating a Project",
    steps: [
      { title: "From the Dashboard", text: "Click \"+ Create New Project\" in the top-right area of the Dashboard page." },
      { title: "Fill in details", text: "Project Name (required) — e.g. \"Ledge Creek Bridge\"\nProject Code (optional) — e.g. \"LC-2026\"\nLocation (optional) — e.g. \"Angelica, NY\"" },
      { title: "Save", text: "Click Save. Your project immediately appears in the job selector dropdown, on the Dashboard cards, and across all filter dropdowns on every page." },
      { title: "Next steps", text: "Start adding rentals, deliveries, concrete pours, and other records to your new project. Everything is scoped per-project." },
    ],
  },
  {
    id: "rentals",
    icon: "🏗️",
    title: "Managing Rentals",
    steps: [
      { title: "Add a rental", text: "Rentals → \"+ Add Rental\". Select project, equipment, vendor, PO #, rate type (Daily/Weekly/Monthly), rate amount, quantity, and start date." },
      { title: "Edit a rental", text: "Click any rental row to open the edit modal. Change any field and hit Save." },
      { title: "Off-Rent", text: "Click the red \"Off Rent\" button on any active rental. This stamps today's date as the end date and changes status to Off Rent." },
      { title: "Filter & search", text: "Use the search bar to find any rental by keyword. Filter by project or status (On Rent / Off Rent / Returned)." },
      { title: "Export", text: "Click \"📥 Export CSV\" to download the current filtered view as a spreadsheet." },
    ],
  },
  {
    id: "deliveries",
    icon: "🚚",
    title: "Tracking Deliveries",
    steps: [
      { title: "Add a delivery", text: "Deliveries → \"+ Add Delivery\". Enter supplier, material, PO #, and ETA date." },
      { title: "Update status", text: "Click a delivery row → change status to Scheduled, In Transit, Delivered, Delayed, or Cancelled." },
      { title: "Late warnings", text: "Deliveries past their ETA that aren't marked Delivered show a red ⚠️ LATE badge automatically." },
    ],
  },
  {
    id: "concrete",
    icon: "🧱",
    title: "Concrete Pours",
    steps: [
      { title: "Schedule a pour", text: "Concrete → \"+ Add Pour\". Enter date, pour location/name, cubic yards, mix design, supplier, pump type, and crew." },
      { title: "Weather risk", text: "Set weather risk to Low/Medium/High. High-risk pours get a red badge for visibility." },
      { title: "Update status", text: "Track pours through: Planned → Confirmed → In Progress → Completed (or Cancelled)." },
    ],
  },
  {
    id: "rfis",
    icon: "📋",
    title: "RFIs (Request for Information)",
    steps: [
      { title: "Create an RFI", text: "RFIs → \"+ Add RFI\". Enter RFI number, subject, question, date sent, response deadline, and who has the ball." },
      { title: "Track aging", text: "Each RFI shows days open. Past-due RFIs (past response deadline) show a red ⚠️ warning." },
      { title: "Impact tracking", text: "Set schedule impact and cost impact (None/Minor/Major) to flag critical RFIs." },
      { title: "Close an RFI", text: "Click the row → change status to Closed when resolved." },
    ],
  },
  {
    id: "submittals",
    icon: "📝",
    title: "Submittals",
    steps: [
      { title: "Add a submittal", text: "Submittals → \"+ Add Submittal\". Enter number, spec section, description, dates, and ball in court." },
      { title: "Track approvals", text: "Status options: Pending → Submitted → Approved / Rejected / Resubmit." },
      { title: "Deadline warnings", text: "Submittals past their required date that aren't Approved show a red overdue flag." },
    ],
  },
  {
    id: "risks",
    icon: "⚠️",
    title: "Risk Register",
    steps: [
      { title: "Log a risk", text: "Risk Register → \"+ Add Risk\". Describe the risk, set probability (Low/Medium/High), impact, mitigation plan, and owner." },
      { title: "Track mitigation", text: "Update status: Open → Mitigated → Closed (or Occurred if it happens)." },
      { title: "Visual priority", text: "High probability or impact items show red badges so nothing gets missed." },
    ],
  },
  {
    id: "vendors",
    icon: "🏢",
    title: "Vendor Directory",
    steps: [
      { title: "Add a vendor", text: "Vendors → \"+ Add Vendor\". Enter company name, category, contact name, phone, email, and emergency number." },
      { title: "Quick contact", text: "Phone numbers and emails are clickable — tap to call or email directly from the app." },
      { title: "Emergency contacts", text: "Emergency numbers show in red with a 📞 icon for quick field access." },
    ],
  },
  {
    id: "calendar",
    icon: "📅",
    title: "Project Calendar",
    steps: [
      { title: "View all events", text: "Calendar pulls in rental dates, deliveries, concrete pours, RFI deadlines, submittal due dates, and equipment maintenance — all in one view." },
      { title: "Filter", text: "Filter by project or event type using the dropdowns." },
      { title: "Click a day", text: "Click any calendar day to see full event details in the sidebar." },
      { title: "Color coding", text: "Blue = rentals, Green = deliveries, Orange = pours, Purple = RFIs, Yellow = submittals, Cyan = maintenance, Red = rental end dates." },
    ],
  },
  {
    id: "tips",
    icon: "💡",
    title: "Tips & Tricks",
    steps: [
      { title: "Search everything", text: "Every table page has a search bar that searches across all fields. Type any keyword to find records fast." },
      { title: "Export data", text: "Every table has a \"📥 Export CSV\" button. The export respects your current filters — so filter first, then export." },
      { title: "Keyboard shortcuts", text: "Press Escape to close any modal. Click outside a modal to close it." },
      { title: "Mobile friendly", text: "Use the ☰ hamburger menu on mobile/tablet to access navigation." },
      { title: "Feedback", text: "Click the 💬 button in the bottom-right corner to send feedback. We review every submission." },
    ],
  },
];

function HelpContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">📖 Help & Getting Started</h1>
        <p className="text-muted-foreground text-sm">Everything you need to know to use OpsSlate effectively.</p>
      </div>

      {/* Quick nav */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Jump to section:</h3>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-sm transition-colors"
              >
                {s.icon} {s.title}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {sections.map((section) => (
        <Card key={section.id} id={section.id} className="bg-card border-border scroll-mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl">{section.icon}</span>
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {section.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Footer CTA */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">Still need help?</p>
          <p className="text-sm">
            Use the <span className="text-primary font-medium">💬 Feedback</span> button in the bottom-right corner to ask a question or report an issue. We review every submission.
          </p>
          <div className="mt-3">
            <Link href="/" className="text-primary hover:underline text-sm font-medium">← Back to Dashboard</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HelpPage() {
  return <AppShell><HelpContent /></AppShell>;
}
