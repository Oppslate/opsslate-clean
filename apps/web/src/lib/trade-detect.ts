// Auto-detect trade and role from company/person name
const TRADE_PATTERNS: Array<{ pattern: RegExp; trade: string; role: string }> = [
  { pattern: /electric/i, trade: "Electrical", role: "Subcontractor" },
  { pattern: /plumb/i, trade: "Plumbing", role: "Subcontractor" },
  { pattern: /hvac|heating|cooling|air\s?condition|mechanical/i, trade: "HVAC", role: "Subcontractor" },
  { pattern: /concret/i, trade: "Concrete", role: "Subcontractor" },
  { pattern: /steel|iron\s?work|weld/i, trade: "Steel", role: "Subcontractor" },
  { pattern: /mason/i, trade: "Masonry", role: "Subcontractor" },
  { pattern: /roof/i, trade: "Roofing", role: "Subcontractor" },
  { pattern: /fram|carpent|lumber/i, trade: "Framing", role: "Subcontractor" },
  { pattern: /drywall|plaster|gyp/i, trade: "Drywall", role: "Subcontractor" },
  { pattern: /paint|coat/i, trade: "Painting", role: "Subcontractor" },
  { pattern: /floor|tile|carpet/i, trade: "Flooring", role: "Subcontractor" },
  { pattern: /excavat|earth|grad|site\s?work|dirt/i, trade: "Excavation", role: "Subcontractor" },
  { pattern: /landscap|lawn|turf/i, trade: "Landscaping", role: "Subcontractor" },
  { pattern: /fire\s?protect|sprinkler/i, trade: "Fire Protection", role: "Subcontractor" },
  { pattern: /elevator|lift|escalat/i, trade: "Elevator", role: "Subcontractor" },
  { pattern: /demol/i, trade: "Demolition", role: "Subcontractor" },
  { pattern: /waterproof|membrane/i, trade: "Waterproofing", role: "Subcontractor" },
  { pattern: /insulat/i, trade: "Insulation", role: "Subcontractor" },
  { pattern: /glass|glaz|window/i, trade: "Glass / Glazing", role: "Subcontractor" },
  { pattern: /fenc/i, trade: "Fencing", role: "Subcontractor" },
  { pattern: /pav|asphalt|striping/i, trade: "Paving / Asphalt", role: "Subcontractor" },
  { pattern: /utilit|sewer|water\s?main|pipe/i, trade: "Utilities", role: "Subcontractor" },
  { pattern: /environ|abat|asbestos|lead|hazmat|remediat/i, trade: "Environmental / Abatement", role: "Subcontractor" },
  { pattern: /survey/i, trade: "Surveying", role: "Subcontractor" },
  { pattern: /test|inspect|lab/i, trade: "Testing / Inspection", role: "Inspector" },
  { pattern: /sheet\s?metal|duct/i, trade: "Sheet Metal", role: "Subcontractor" },
  { pattern: /scaffold/i, trade: "Scaffolding", role: "Subcontractor" },
  { pattern: /truck|haul|transport/i, trade: "Trucking / Hauling", role: "Subcontractor" },
  { pattern: /supply|suppli|material|lumber\s?yard/i, trade: "Material Supplier", role: "Supplier/Vendor" },
  { pattern: /rent|equip.*rent/i, trade: "Equipment Rental", role: "Supplier/Vendor" },
  { pattern: /architect/i, trade: "General", role: "Architect" },
  { pattern: /engineer/i, trade: "General", role: "Engineer" },
  { pattern: /general\s?contract|gc\b/i, trade: "General", role: "General Contractor" },
  { pattern: /develop/i, trade: "General", role: "Owner/Developer" },
];

export function detectTradeAndRole(text: string): { trade?: string; role?: string } {
  if (!text) return {};
  for (const { pattern, trade, role } of TRADE_PATTERNS) {
    if (pattern.test(text)) {
      return { trade, role };
    }
  }
  return {};
}
