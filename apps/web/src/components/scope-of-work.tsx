"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { jsPDF } from "jspdf";

interface SowContact {
  firstName?: string;
  lastName?: string;
  company?: string;
  trade?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

interface SowProject {
  name: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
}

const SAVED_COMPANY_KEY = "opsslate_company_letterhead";

function loadCompanyInfo(): CompanyInfo {
  if (typeof window === "undefined") return { name: "", address: "", city: "", state: "", zip: "", phone: "", email: "" };
  try {
    const saved = localStorage.getItem(SAVED_COMPANY_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { name: "Hybrid Building Solutions", address: "", city: "", state: "", zip: "", phone: "", email: "" };
}

function saveCompanyInfo(info: CompanyInfo) {
  try { localStorage.setItem(SAVED_COMPANY_KEY, JSON.stringify(info)); } catch { /* ignore */ }
}

export function ScopeOfWorkModal({
  contact,
  project,
  onClose,
}: {
  contact: SowContact;
  project: SowProject;
  onClose: () => void;
}) {
  const [company, setCompany] = useState<CompanyInfo>(loadCompanyInfo);
  const [showLetterhead, setShowLetterhead] = useState(true);

  // Project info (editable)
  const [projName, setProjName] = useState(project.name || "");
  const [projAddress, setProjAddress] = useState(project.address || project.location || "");
  const [projCity, setProjCity] = useState(project.city || "");
  const [projState, setProjState] = useState(project.state || "");
  const [projZip, setProjZip] = useState(project.zipCode || "");

  // Subcontractor info
  const [subCompany, setSubCompany] = useState(contact.company || [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "");
  const [subContact, setSubContact] = useState([contact.firstName, contact.lastName].filter(Boolean).join(" ") || "");
  const [subPhone, setSubPhone] = useState(contact.phone || "");
  const [subEmail, setSubEmail] = useState(contact.email || "");
  const [subTrade, setSubTrade] = useState(contact.trade || "");

  // Scope details
  const [scopeTitle, setScopeTitle] = useState(`${contact.trade || "General"} Scope of Work`);
  const [scopeDescription, setScopeDescription] = useState(contact.notes || "");
  const [inclusions, setInclusions] = useState("• All labor, materials, and equipment necessary to complete the described scope\n• Cleanup of work area daily\n• Compliance with all applicable building codes and regulations\n• Coordination with other trades as required");
  const [exclusions, setExclusions] = useState("• Work not specifically described in this scope\n• Permits and inspections (provided by GC unless noted)\n• Temporary power and water (provided by GC)");
  const [specialConditions, setSpecialConditions] = useState("• Contractor must maintain current insurance and provide COI prior to start\n• All work must comply with OSHA safety standards\n• Davis-Bacon / prevailing wage rates apply (if applicable)\n• Contractor to verify all field conditions prior to bidding");
  const [schedule, setSchedule] = useState("• Anticipated start date: TBD\n• Duration: TBD\n• Milestone dates to be coordinated with project schedule");
  const [bidInstructions, setBidInstructions] = useState("Please provide your quote including:\n• Lump sum price for described scope\n• Unit prices for any variable quantity items\n• Estimated duration / crew size\n• List of any qualifications or exceptions\n• Insurance certificate (COI)\n• References from similar projects");
  const [responseDate, setResponseDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    saveCompanyInfo(company);

    try {
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 50;
      const contentW = pageW - margin * 2;
      let y = margin;

      const addText = (text: string, x: number, fontSize: number, style: string = "normal", color: [number, number, number] = [33, 33, 33]) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", style);
        doc.setTextColor(...color);
        doc.text(text, x, y);
      };

      const addWrappedText = (text: string, x: number, fontSize: number, maxWidth: number, style: string = "normal", color: [number, number, number] = [33, 33, 33]) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", style);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, maxWidth);
        for (const line of lines) {
          if (y > doc.internal.pageSize.getHeight() - 60) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, x, y);
          y += fontSize * 1.4;
        }
      };

      const addLine = () => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageW - margin, y);
        y += 10;
      };

      const addSectionHeader = (title: string) => {
        if (y > doc.internal.pageSize.getHeight() - 100) {
          doc.addPage();
          y = margin;
        }
        y += 8;
        doc.setFillColor(245, 130, 32); // Orange accent
        doc.rect(margin, y - 12, 4, 16, "F");
        addText(title, margin + 12, 12, "bold", [33, 33, 33]);
        y += 18;
      };

      // === LETTERHEAD ===
      if (showLetterhead && company.name) {
        // Company name - large
        addText(company.name.toUpperCase(), margin, 18, "bold", [245, 130, 32]);
        y += 14;

        // Company address line
        const addrParts = [company.address, company.city, company.state, company.zip].filter(Boolean);
        if (addrParts.length) {
          addText(addrParts.join(", "), margin, 9, "normal", [120, 120, 120]);
          y += 11;
        }
        const contactParts = [company.phone, company.email].filter(Boolean);
        if (contactParts.length) {
          addText(contactParts.join("  |  "), margin, 9, "normal", [120, 120, 120]);
          y += 11;
        }

        y += 5;
        addLine();
        y += 5;
      }

      // === DATE ===
      const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      addText(today, margin, 10, "normal", [100, 100, 100]);
      y += 20;

      // === TITLE ===
      addText("SCOPE OF WORK", margin, 20, "bold", [33, 33, 33]);
      y += 2;
      addText("REQUEST FOR QUOTE", margin, 11, "normal", [245, 130, 32]);
      y += 20;

      // === TO / FROM BLOCK ===
      const colW = contentW / 2;

      // TO block
      addText("TO:", margin, 9, "bold", [100, 100, 100]);
      y += 14;
      if (subCompany) { addText(subCompany, margin, 11, "bold"); y += 14; }
      if (subContact && subContact !== subCompany) { addText(`Attn: ${subContact}`, margin, 10, "normal"); y += 13; }
      if (subPhone) { addText(`Phone: ${subPhone}`, margin, 10, "normal"); y += 13; }
      if (subEmail) { addText(`Email: ${subEmail}`, margin, 10, "normal"); y += 13; }
      if (subTrade) { addText(`Trade: ${subTrade}`, margin, 10, "normal", [245, 130, 32]); y += 13; }

      // FROM block (right side — rewind Y)
      const fromY = y - (subCompany ? 14 : 0) - (subContact && subContact !== subCompany ? 13 : 0) - (subPhone ? 13 : 0) - (subEmail ? 13 : 0) - (subTrade ? 13 : 0);
      let fy = fromY;
      const rx = margin + colW + 20;
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 100, 100);
      doc.text("FROM:", rx, fy); fy += 14;
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(33, 33, 33);
      if (company.name) { doc.text(company.name, rx, fy); fy += 14; }
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      if (company.phone) { doc.text(`Phone: ${company.phone}`, rx, fy); fy += 13; }
      if (company.email) { doc.text(`Email: ${company.email}`, rx, fy); fy += 13; }

      y = Math.max(y, fy) + 10;
      addLine();
      y += 5;

      // === PROJECT INFO ===
      addSectionHeader("PROJECT INFORMATION");
      const projLines = [
        ["Project Name:", projName],
        ["Address:", [projAddress, projCity, projState, projZip].filter(Boolean).join(", ")],
      ];
      for (const [label, val] of projLines) {
        if (val) {
          addText(label, margin + 12, 10, "bold", [80, 80, 80]);
          doc.setFont("helvetica", "normal"); doc.setTextColor(33, 33, 33);
          doc.text(val, margin + 110, y);
          y += 16;
        }
      }
      y += 5;

      // === SCOPE TITLE ===
      addSectionHeader(scopeTitle.toUpperCase());

      // === SCOPE DESCRIPTION ===
      if (scopeDescription.trim()) {
        addWrappedText(scopeDescription, margin + 12, 10, contentW - 24);
        y += 5;
      }

      // === INCLUSIONS ===
      if (inclusions.trim()) {
        addSectionHeader("INCLUSIONS");
        for (const line of inclusions.split("\n")) {
          if (line.trim()) {
            addWrappedText(line.trim(), margin + 12, 10, contentW - 24);
          }
        }
        y += 5;
      }

      // === EXCLUSIONS ===
      if (exclusions.trim()) {
        addSectionHeader("EXCLUSIONS");
        for (const line of exclusions.split("\n")) {
          if (line.trim()) {
            addWrappedText(line.trim(), margin + 12, 10, contentW - 24);
          }
        }
        y += 5;
      }

      // === SPECIAL CONDITIONS ===
      if (specialConditions.trim()) {
        addSectionHeader("SPECIAL CONDITIONS & REQUIREMENTS");
        for (const line of specialConditions.split("\n")) {
          if (line.trim()) {
            addWrappedText(line.trim(), margin + 12, 10, contentW - 24);
          }
        }
        y += 5;
      }

      // === SCHEDULE ===
      if (schedule.trim()) {
        addSectionHeader("SCHEDULE");
        for (const line of schedule.split("\n")) {
          if (line.trim()) {
            addWrappedText(line.trim(), margin + 12, 10, contentW - 24);
          }
        }
        y += 5;
      }

      // === BID INSTRUCTIONS ===
      if (bidInstructions.trim()) {
        addSectionHeader("BID INSTRUCTIONS");
        for (const line of bidInstructions.split("\n")) {
          if (line.trim()) {
            addWrappedText(line.trim(), margin + 12, 10, contentW - 24);
          }
        }
        y += 10;

        // Response deadline
        if (responseDate) {
          if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = margin; }
          doc.setFillColor(255, 243, 224);
          doc.roundedRect(margin, y - 5, contentW, 30, 3, 3, "F");
          doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(245, 130, 32);
          doc.text(`⏰ QUOTES DUE BY: ${new Date(responseDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, margin + 12, y + 12);
          y += 40;
        }
      }

      // === SIGNATURE BLOCK ===
      if (y > doc.internal.pageSize.getHeight() - 120) { doc.addPage(); y = margin; }
      y += 20;
      addLine();
      y += 15;
      addText("ACCEPTED BY:", margin, 10, "bold", [100, 100, 100]);
      y += 30;

      // Signature lines
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + 200, y);
      doc.text("Signature", margin, y + 12);
      doc.line(margin + colW, y, margin + colW + 150, y);
      doc.text("Date", margin + colW, y + 12);
      y += 30;
      doc.line(margin, y, margin + 200, y);
      doc.text("Printed Name / Title", margin, y + 12);
      doc.line(margin + colW, y, margin + colW + 150, y);
      doc.text("Company", margin + colW, y + 12);

      // === FOOTER on every page ===
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        const ph = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(160, 160, 160);
        doc.text(`${company.name} — Scope of Work — ${projName}`, margin, ph - 25);
        doc.text(`Page ${i} of ${pages}`, pageW - margin - 50, ph - 25);
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, ph - 35, pageW - margin, ph - 35);
      }

      // Save
      const filename = `SOW-${projName.replace(/[^a-zA-Z0-9]/g, "_")}-${subCompany.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    }
    setGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-6 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-5 z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">📄 Scope of Work Generator</h2>
              <p className="text-sm text-muted-foreground mt-1">Create a professional SOW / Request for Quote PDF</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* YOUR COMPANY LETTERHEAD */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">🏢 Your Company Letterhead</h3>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={showLetterhead} onChange={(e) => setShowLetterhead(e.target.checked)} className="accent-orange-500" />
                Include letterhead
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Company Name</label><Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">Phone</label><Input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">Address</label><Input value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">Email</label><Input value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2 col-span-2">
                <div><label className="text-xs text-muted-foreground">City</label><Input value={company.city} onChange={(e) => setCompany({ ...company, city: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">State</label><Input value={company.state} onChange={(e) => setCompany({ ...company, state: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">ZIP</label><Input value={company.zip} onChange={(e) => setCompany({ ...company, zip: e.target.value })} /></div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">💾 Letterhead info is saved for future use</p>
          </div>

          {/* SUBCONTRACTOR (TO) */}
          <div>
            <h3 className="font-bold text-sm mb-3">📩 To (Subcontractor / Vendor)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Company</label><Input value={subCompany} onChange={(e) => setSubCompany(e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground">Contact Name</label><Input value={subContact} onChange={(e) => setSubContact(e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground">Phone</label><Input value={subPhone} onChange={(e) => setSubPhone(e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground">Email</label><Input value={subEmail} onChange={(e) => setSubEmail(e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground">Trade</label><Input value={subTrade} onChange={(e) => setSubTrade(e.target.value)} /></div>
            </div>
          </div>

          {/* PROJECT INFO */}
          <div>
            <h3 className="font-bold text-sm mb-3">📍 Project Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs text-muted-foreground">Project Name</label><Input value={projName} onChange={(e) => setProjName(e.target.value)} /></div>
              <div className="col-span-2"><label className="text-xs text-muted-foreground">Address</label><Input value={projAddress} onChange={(e) => setProjAddress(e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-2 col-span-2">
                <div><label className="text-xs text-muted-foreground">City</label><Input value={projCity} onChange={(e) => setProjCity(e.target.value)} /></div>
                <div><label className="text-xs text-muted-foreground">State</label><Input value={projState} onChange={(e) => setProjState(e.target.value)} /></div>
                <div><label className="text-xs text-muted-foreground">ZIP</label><Input value={projZip} onChange={(e) => setProjZip(e.target.value)} /></div>
              </div>
            </div>
          </div>

          {/* SCOPE */}
          <div>
            <h3 className="font-bold text-sm mb-3">📋 Scope of Work</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Scope Title</label><Input value={scopeTitle} onChange={(e) => setScopeTitle(e.target.value)} /></div>
              <div>
                <label className="text-xs text-muted-foreground">Detailed Description of Work *</label>
                <Textarea rows={6} value={scopeDescription} onChange={(e) => setScopeDescription(e.target.value)} placeholder="Describe the full scope of work in detail. Include quantities, specifications, locations within the project, materials, methods, etc.&#10;&#10;Example:&#10;Furnish and install complete electrical system for 50,000 SF warehouse including:&#10;• 200 amp 3-phase main service and distribution&#10;• Interior lighting (LED high-bay fixtures, per lighting plan)&#10;• Receptacles and circuits per plan&#10;• Fire alarm system rough-in&#10;• Parking lot lighting (8 pole-mounted LED fixtures)" />
              </div>
            </div>
          </div>

          {/* INCLUSIONS */}
          <div>
            <h3 className="font-bold text-sm mb-3">✅ Inclusions</h3>
            <Textarea rows={4} value={inclusions} onChange={(e) => setInclusions(e.target.value)} />
          </div>

          {/* EXCLUSIONS */}
          <div>
            <h3 className="font-bold text-sm mb-3">❌ Exclusions</h3>
            <Textarea rows={3} value={exclusions} onChange={(e) => setExclusions(e.target.value)} />
          </div>

          {/* SPECIAL CONDITIONS */}
          <div>
            <h3 className="font-bold text-sm mb-3">⚠️ Special Conditions & Requirements</h3>
            <Textarea rows={4} value={specialConditions} onChange={(e) => setSpecialConditions(e.target.value)} />
          </div>

          {/* SCHEDULE */}
          <div>
            <h3 className="font-bold text-sm mb-3">📅 Schedule</h3>
            <Textarea rows={3} value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </div>

          {/* BID INSTRUCTIONS */}
          <div>
            <h3 className="font-bold text-sm mb-3">💰 Bid Instructions</h3>
            <Textarea rows={5} value={bidInstructions} onChange={(e) => setBidInstructions(e.target.value)} />
            <div className="mt-3">
              <label className="text-xs text-muted-foreground">Quotes Due By</label>
              <Input type="date" value={responseDate} onChange={(e) => setResponseDate(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="w-48 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* GENERATE BUTTON */}
        <div className="sticky bottom-0 bg-card border-t border-border p-5 flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">PDF</Badge>
            <Badge variant="outline" className="text-xs">Professional Format</Badge>
            <Badge variant="outline" className="text-xs">Signature Block</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || !scopeDescription.trim()}
              className="bg-gradient-to-r from-orange-500 to-amber-600"
            >
              {generating ? "Generating..." : "📄 Generate SOW PDF"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
