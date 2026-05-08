"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import type { Id } from "../../../convex/_generated/dataModel";

const COLOR_PRESETS = [
  { name: "OpsSlate Orange", primary: "#f97316", accent: "#fb923c" },
  { name: "Construction Blue", primary: "#3b82f6", accent: "#60a5fa" },
  { name: "Safety Green", primary: "#22c55e", accent: "#4ade80" },
  { name: "Steel Gray", primary: "#6b7280", accent: "#9ca3af" },
  { name: "Brick Red", primary: "#dc2626", accent: "#ef4444" },
  { name: "Navy Pro", primary: "#1e3a5f", accent: "#2563eb" },
  { name: "Earth Brown", primary: "#92400e", accent: "#d97706" },
  { name: "Royal Purple", primary: "#7c3aed", accent: "#a78bfa" },
];

function BrandingContent() {
  const { user } = useAuth();
  const branding = useQuery(api.companyBranding.get, user ? { companyId: user.companyId as Id<"companies"> } : "skip") as any;
  const updateBranding = useMutation(api.companyBranding.update);
  const generateUploadUrl = useMutation(api.companyBranding.generateUploadUrl);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [tagline, setTagline] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#f97316");
  const [accentColor, setAccentColor] = useState("#fb923c");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (branding) {
      setName(branding.name || "");
      setPhone(branding.phone || "");
      setEmail(branding.email || "");
      setWebsite(branding.website || "");
      setAddress(branding.address || "");
      setCity(branding.city || "");
      setState(branding.state || "");
      setZip(branding.zip || "");
      setTagline(branding.tagline || "");
      setLicenseNumber(branding.licenseNumber || "");
      setPrimaryColor(branding.primaryColor || "#f97316");
      setAccentColor(branding.accentColor || "#fb923c");
    }
  }, [branding]);

  const handleSave = async () => {
    if (!user) return;
    await updateBranding({
      companyId: user.companyId as Id<"companies">,
      name: name || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: website || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
      tagline: tagline || undefined,
      licenseNumber: licenseNumber || undefined,
      primaryColor,
      accentColor,
    });
    setDirty(false);
    toast("Branding saved!", "success");
  };

  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast("Logo must be under 5MB", "error"); return; }
    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      await updateBranding({ companyId: user.companyId as Id<"companies">, logoStorageId: storageId });
      toast("Logo uploaded!", "success");
    } catch { toast("Upload failed", "error"); }
    setUploading(false);
  };

  const setField = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setDirty(true);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🎨 Company Branding</h1>
          <p className="text-sm text-muted-foreground">Customize your logo, colors, and company info. Applied to PDFs, emails, client portal, and reports.</p>
        </div>
        <Button onClick={handleSave} disabled={!dirty} className="bg-orange-500 hover:bg-orange-600">
          {dirty ? "💾 Save Changes" : "✅ Saved"}
        </Button>
      </div>

      {/* Logo */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-base">🏢 Company Logo</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-secondary/50 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
              {branding?.resolvedLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.resolvedLogoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-4xl text-muted-foreground">🏗️</span>
              )}
            </div>
            <div className="space-y-2">
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "🔄 Uploading..." : "📤 Upload Logo"}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
              <p className="text-xs text-muted-foreground">PNG or SVG recommended. Max 5MB. Square format works best.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-base">🎨 Brand Colors</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Primary Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setDirty(true); }} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={primaryColor} onChange={setField(setPrimaryColor)} className="font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Accent Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={accentColor} onChange={(e) => { setAccentColor(e.target.value); setDirty(true); }} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={accentColor} onChange={setField(setAccentColor)} className="font-mono text-sm" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Presets</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((p) => (
                <button key={p.name} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:border-white/30 text-xs transition-colors"
                  onClick={() => { setPrimaryColor(p.primary); setAccentColor(p.accent); setDirty(true); }}>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.primary }} />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.accent }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          {/* Preview */}
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="h-2" style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor})` }} />
            <div className="p-4 flex items-center gap-3">
              {branding?.resolvedLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.resolvedLogoUrl} alt="" className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: primaryColor }}>
                  {(name || "C")[0]}
                </div>
              )}
              <div>
                <p className="font-bold" style={{ color: primaryColor }}>{name || "Your Company"}</p>
                <p className="text-xs text-muted-foreground">{tagline || "Your tagline here"}</p>
              </div>
            </div>
            <div className="px-4 pb-3">
              <div className="h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: primaryColor }}>
                Sample Button
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-base">📋 Company Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Company Name</label><Input value={name} onChange={setField(setName)} className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Tagline / Slogan</label><Input value={tagline} onChange={setField(setTagline)} placeholder="Building excellence since 1995" className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Phone</label><Input value={phone} onChange={setField(setPhone)} placeholder="(716) 555-1234" className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Email</label><Input value={email} onChange={setField(setEmail)} placeholder="info@company.com" className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Website</label><Input value={website} onChange={setField(setWebsite)} placeholder="www.company.com" className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">License #</label><Input value={licenseNumber} onChange={setField(setLicenseNumber)} className="mt-1" /></div>
            <div className="md:col-span-2"><label className="text-xs font-medium text-muted-foreground">Street Address</label><Input value={address} onChange={setField(setAddress)} className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">City</label><Input value={city} onChange={setField(setCity)} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-medium text-muted-foreground">State</label><Input value={state} onChange={setField(setState)} className="mt-1" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">ZIP</label><Input value={zip} onChange={setField(setZip)} className="mt-1" /></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Where Branding Appears */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-base">📍 Where Your Branding Appears</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { icon: "📄", label: "PDF Reports", desc: "SOW, Daily Logs, Invoices" },
              { icon: "📧", label: "Email Headers", desc: "Briefings, Notifications" },
              { icon: "🔗", label: "Client Portal", desc: "Shared project links" },
              { icon: "📊", label: "Analytics Reports", desc: "Company health scores" },
              { icon: "📋", label: "Bid Documents", desc: "Proposals & estimates" },
              { icon: "🖨️", label: "Print Layouts", desc: "All print-friendly pages" },
            ].map((item) => (
              <div key={item.label} className="bg-secondary/30 rounded-lg p-3">
                <span className="text-lg">{item.icon}</span>
                <p className="text-xs font-medium mt-1">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={!dirty} className="bg-orange-500 hover:bg-orange-600 px-8">
          {dirty ? "💾 Save All Changes" : "✅ All Saved"}
        </Button>
      </div>
    </div>
  );
}

export default function BrandingPage() { return <AppShell><BrandingContent /></AppShell>; }
