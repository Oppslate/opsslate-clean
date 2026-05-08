
"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { TableToolbar, exportCSV } from "@/components/table-toolbar";
import { useToast } from "@/components/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const CATEGORIES = ["Progress", "Safety", "Deficiency", "Inspection", "As-Built", "Drone Survey", "Timelapse", "Delivery", "Weather", "Other"];
const MEDIA_TYPES = [
  { value: "photo", label: "📷 Photo", accept: "image/*", icon: "📷" },
  { value: "video", label: "🎥 Video", accept: "video/*", icon: "🎥" },
  { value: "drone", label: "🛸 Drone", accept: "image/*,video/*", icon: "🛸" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(1) + " GB";
}

function typeIcon(type: string) {
  if (type === "photo") return "📷";
  if (type === "video") return "🎥";
  if (type === "drone") return "🛸";
  return "📁";
}

// ── Upload Modal ──
function UploadModal({ onClose, defaultProjectId }: { onClose: () => void; defaultProjectId?: string }) {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const generateUrl = useMutation(api.siteMedia.generateUploadUrl);
  const createMedia = useMutation(api.siteMedia.create);
  const { toast } = useToast();

  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [mediaType, setMediaType] = useState("photo");
  const [category, setCategory] = useState("Progress");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [capturedBy, setCapturedBy] = useState(user?.name ?? "");
  const [capturedDate, setCapturedDate] = useState(new Date().toISOString().slice(0, 10));
  const [altitude, setAltitude] = useState("");
  const [gpsCoords, setGpsCoords] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!projectId || files.length === 0) { toast("Select project and files", "error"); return; }
    setUploading(true);
    let uploaded = 0;
    for (const file of files) {
      try {
        const uploadUrl = await generateUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        // Get the URL from storage
        const fileUrl = `${(projects as any)?.[0]?._id ? "" : ""}https://sincere-duck-383.convex.cloud/api/storage/${storageId}`;

        await createMedia({
          companyId: user!.companyId,
          projectId: projectId as Id<"projects">,
          type: mediaType,
          fileName: file.name,
          url: fileUrl,
          fileSize: file.size,
          title: file.name.replace(/\.[^.]+$/, ""),
          description: description || undefined,
          location: location || undefined,
          tags: tags.length ? tags : undefined,
          category,
          capturedDate: capturedDate || undefined,
          capturedBy: capturedBy || undefined,
          altitude: mediaType === "drone" ? altitude || undefined : undefined,
          gpsCoords: mediaType === "drone" ? gpsCoords || undefined : undefined,
          uploadedBy: user!.name,
        });
        uploaded++;
        setProgress(Math.round((uploaded / files.length) * 100));
      } catch (e) {
        console.error("Upload failed:", file.name, e);
        toast(`Failed: ${file.name}`, "error");
      }
    }
    toast(`Uploaded ${uploaded} file(s)`, "success");
    setUploading(false);
    onClose();
  };

  const currentType = MEDIA_TYPES.find((t) => t.value === mediaType)!;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-bold text-lg">Upload Site Media</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">x</button>
        </div>
        <div className="p-4 space-y-4">
          {/* Media Type Selector */}
          <div className="flex gap-2">
            {MEDIA_TYPES.map((t) => (
              <button
                key={t.value}
                className={`flex-1 py-3 rounded-lg text-center transition-colors border ${mediaType === t.value ? "bg-primary/20 border-primary" : "bg-secondary border-border hover:bg-secondary/80"}`}
                onClick={() => setMediaType(t.value)}
              >
                <div className="text-2xl">{t.icon}</div>
                <div className="text-xs font-semibold mt-1">{t.label.split(" ")[1]}</div>
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1">Project *</label>
            <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Select project...</option>
              {(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          {/* File Drop Zone */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/20 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files) setFiles(Array.from(e.dataTransfer.files)); }}
          >
            <div className="text-4xl mb-2">{currentType.icon}</div>
            <div className="text-sm font-medium">
              {files.length > 0 ? `${files.length} file(s) selected` : "Drop files here or click to browse"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {mediaType === "photo" && "JPG, PNG, HEIC, WebP"}
              {mediaType === "video" && "MP4, MOV, AVI, MKV"}
              {mediaType === "drone" && "Photos or video from DJI, Skydio, etc."}
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <span>{f.name}</span>
                    <span className="text-primary">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileRef} type="file" multiple accept={currentType.accept} className="hidden" onChange={handleFiles} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1">Category</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Floor 2, North wing" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1">Captured By</label>
              <Input value={capturedBy} onChange={(e) => setCapturedBy(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">Date Captured</label>
              <Input type="date" value={capturedDate} onChange={(e) => setCapturedDate(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="cursor-pointer" />
            </div>
          </div>

          {/* Drone-specific fields */}
          {mediaType === "drone" && (
            <div className="bg-secondary/30 rounded-lg p-4">
              <h4 className="text-sm font-bold mb-3">🛸 Drone Flight Data</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold block mb-1">Altitude</label>
                  <Input value={altitude} onChange={(e) => setAltitude(e.target.value)} placeholder="200 ft AGL" />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1">GPS Coordinates</label>
                  <Input value={gpsCoords} onChange={(e) => setGpsCoords(e.target.value)} placeholder="42.8864, -78.8784" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold block mb-1">Description</label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this show?" />
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-semibold block mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
              <Button size="sm" variant="outline" onClick={addTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setTags(tags.filter((x) => x !== t))}>
                    {t} ✕
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border sticky bottom-0 bg-card">
          {uploading && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={uploading || files.length === 0} onClick={handleUpload}>
              {uploading ? "Uploading..." : `Upload ${files.length} File(s)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detail Modal ──
function DetailModal({ item, onClose }: { item: Record<string, unknown>; onClose: () => void }) {
  const updateMedia = useMutation(api.siteMedia.update);
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState((item.title as string) ?? "");
  const [description, setDescription] = useState((item.description as string) ?? "");
  const [location, setLocation] = useState((item.location as string) ?? "");

  const isVideo = (item.type as string) === "video" || (item.fileName as string)?.match(/\.(mp4|mov|avi|mkv|webm)$/i);

  const handleSave = async () => {
    await updateMedia({
      id: item._id as Id<"siteMedia">,
      title: title || undefined,
      description: description || undefined,
      location: location || undefined,
    });
    toast("Updated", "success");
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-5xl w-full max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Media viewer */}
        <div className="flex-1 flex items-center justify-center min-h-0 mb-4">
          {isVideo ? (
            <video
              src={item.url as string}
              controls
              className="max-h-[70vh] max-w-full rounded-lg"
              autoPlay
            />
          ) : (
            <img
              src={item.url as string}
              alt={item.title as string}
              className="max-h-[70vh] max-w-full rounded-lg object-contain"
            />
          )}
        </div>

        {/* Info bar */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
                  <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-lg">{(item.title as string) || (item.fileName as string)}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline">{item.projectName as string}</Badge>
                    <Badge variant="secondary">{typeIcon(item.type as string)} {item.type as string}</Badge>
                    {Boolean(item.category) && <Badge variant="outline">{item.category as string}</Badge>}
                    {Boolean(item.location) && <span className="text-sm text-muted-foreground">📍 {item.location as string}</span>}
                  </div>
                  {Boolean(item.description) && <p className="text-sm text-muted-foreground mt-2">{item.description as string}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {Boolean(item.capturedBy) && <span>By: {item.capturedBy as string}</span>}
                    {Boolean(item.capturedDate) && <span>Date: {item.capturedDate as string}</span>}
                    {Boolean(item.fileSize) && <span>Size: {formatBytes(item.fileSize as number)}</span>}
                    {Boolean(item.altitude) && <span>Alt: {item.altitude as string}</span>}
                    {Boolean(item.gpsCoords) && <span>GPS: {item.gpsCoords as string}</span>}
                  </div>
                  {(item.tags as string[])?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(item.tags as string[]).map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              {!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>✎</Button>}
              <a href={item.url as string} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">↓ Download</Button>
              </a>
              <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
function SiteMediaContent() {
  const { user } = useAuth();
  const [filterProject, setFilterProject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [viewItem, setViewItem] = useState<Record<string, unknown> | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const items = useQuery(api.siteMedia.list, user ? {
    companyId: user.companyId,
    projectId: filterProject || undefined,
    type: filterType || undefined,
    category: filterCategory || undefined,
  } : "skip") as Array<Record<string, unknown>> | undefined;

  const stats = useQuery(api.siteMedia.stats, user ? {
    companyId: user.companyId,
    projectId: filterProject || undefined,
  } : "skip");

  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const removeMedia = useMutation(api.siteMedia.remove);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    if (!items) return [];
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) =>
      (i.title as string)?.toLowerCase().includes(q) ||
      (i.fileName as string)?.toLowerCase().includes(q) ||
      (i.description as string)?.toLowerCase().includes(q) ||
      (i.location as string)?.toLowerCase().includes(q) ||
      (i.tags as string[])?.some((t) => t.toLowerCase().includes(q))
    );
  }, [items, search]);

  const handleExport = () => {
    const headers = ["Type", "File", "Project", "Category", "Location", "Date", "By", "Size", "Tags"];
    const rows = filtered.map((i) => [
      String(i.type ?? ""), String(i.fileName ?? ""), String(i.projectName ?? ""),
      String(i.category ?? ""), String(i.location ?? ""), String(i.capturedDate ?? ""),
      String(i.capturedBy ?? ""), String(i.fileSize ? formatBytes(i.fileSize as number) : ""),
      (i.tags as string[])?.join(", ") ?? "",
    ]);
    exportCSV(headers, rows, "site-media.csv");
  };

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold">Site Media</h1>
          <p className="text-muted-foreground text-sm">Photos, video, and drone footage — organized by project</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={viewMode === "grid" ? "default" : "outline"} onClick={() => setViewMode("grid")}>▦ Grid</Button>
          <Button size="sm" variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")}>☰ List</Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Files</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">📷 {stats.photos}</div>
              <div className="text-xs text-muted-foreground">Photos</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">🎥 {stats.videos}</div>
              <div className="text-xs text-muted-foreground">Videos</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">🛸 {stats.drone}</div>
              <div className="text-xs text-muted-foreground">Drone</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{formatBytes(stats.totalSize)}</div>
              <div className="text-xs text-muted-foreground">Storage Used</div>
            </CardContent>
          </Card>
        </div>
      )}

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => setShowUpload(true)}
        addLabel="Upload Media"
        onExport={handleExport}
      >
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="photo">📷 Photos</option>
          <option value="video">🎥 Videos</option>
          <option value="drone">🛸 Drone</option>
        </select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </TableToolbar>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((item) => {
            const isVideo = (item.type as string) === "video" || (item.fileName as string)?.match(/\.(mp4|mov|avi|mkv|webm)$/i);
            return (
              <div
                key={item._id as string}
                className="group relative bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setViewItem(item)}
              >
                <div className="aspect-square bg-secondary/30 flex items-center justify-center overflow-hidden">
                  {isVideo ? (
                    <div className="w-full h-full flex items-center justify-center bg-black/50">
                      <span className="text-5xl">🎥</span>
                    </div>
                  ) : (
                    <img
                      src={item.url as string}
                      alt={item.title as string}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:3rem">' + typeIcon(item.type as string) + '</span>'; }}
                    />
                  )}
                </div>
                {/* Overlay */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant="secondary" className="text-xs">{typeIcon(item.type as string)}</Badge>
                  {Boolean(item.category) && <Badge variant="outline" className="text-xs bg-black/50">{item.category as string}</Badge>}
                </div>
                <div className="p-2">
                  <div className="text-xs font-medium truncate">{(item.title as string) || (item.fileName as string)}</div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                    <span>{item.projectName as string}</span>
                    <span>{(item.capturedDate as string) || ""}</span>
                  </div>
                  {Boolean(item.location) && <div className="text-xs text-muted-foreground mt-0.5">📍 {item.location as string}</div>}
                </div>
                {/* Delete on hover */}
                <button
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  onClick={(e) => { e.stopPropagation(); removeMedia({ id: item._id as Id<"siteMedia"> }).then(() => toast("Deleted", "success")); }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card className="bg-card border-border">
          <div className="divide-y divide-border">
            {filtered.map((item) => (
              <div
                key={item._id as string}
                className="flex items-center gap-4 p-3 hover:bg-secondary/30 cursor-pointer transition-colors"
                onClick={() => setViewItem(item)}
              >
                <span className="text-2xl">{typeIcon(item.type as string)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{(item.title as string) || (item.fileName as string)}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.projectName as string}</span>
                    {Boolean(item.category) && <Badge variant="outline" className="text-xs">{item.category as string}</Badge>}
                    {Boolean(item.location) && <span>📍 {item.location as string}</span>}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{(item.capturedDate as string) || ""}</div>
                  <div>{item.fileSize ? formatBytes(item.fileSize as number) : ""}</div>
                </div>
                {(item.tags as string[])?.length > 0 && (
                  <div className="flex gap-1">
                    {(item.tags as string[]).slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  </div>
                )}
                <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); removeMedia({ id: item._id as Id<"siteMedia"> }).then(() => toast("Deleted", "success")); }}>✕</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {filtered.length === 0 && (
        <EmptyState
          icon="📷"
          title="No media uploaded yet"
          description="Upload photos, videos, and drone footage to document your job site."
          actionLabel="Upload Media"
          onAction={() => setShowUpload(true)}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          defaultProjectId={filterProject || (projects?.[0]?._id ?? "")}
        />
      )}

      {viewItem && (
        <DetailModal item={viewItem} onClose={() => setViewItem(null)} />
      )}
    </div>
  );
}

export default function SiteMediaPage() {
  return <AppShell><SiteMediaContent /></AppShell>;
}
