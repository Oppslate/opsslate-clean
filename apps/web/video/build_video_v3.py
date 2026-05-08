#!/usr/bin/env python3
"""OpsSlate Product Video V3 — longer scenes, bigger fonts, more screenshots, no skipping."""
import subprocess, os, json, shlex

VIDEO_DIR = os.path.dirname(os.path.abspath(__file__))
SS = os.path.join(VIDEO_DIR, "screenshots")
VOICE = "en-US-AvaNeural"
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
TMP = os.path.join(VIDEO_DIR, "tmp")

def tts(text, path):
    subprocess.run(f'edge-tts --voice "{VOICE}" --text {shlex.quote(text)} --write-media "{path}" --rate="-5%"', shell=True, check=True, capture_output=True)

def dur(path):
    r = subprocess.run(["ffprobe","-v","quiet","-show_entries","format=duration","-of","json",path], capture_output=True, text=True)
    return float(json.loads(r.stdout)["format"]["duration"])

def make_text_card(sid, title, subtitle, accent, min_dur):
    """Dark card with large centered text."""
    d = max(min_dur, 4.0)
    vf = f"color=c=#0b0f14:s=1920x1080:d={d}"
    # Top accent line
    vf += f",drawbox=x=0:y=0:w=iw:h=5:color={accent.replace('#','0x')}:t=fill"
    # Bottom accent line
    vf += f",drawbox=x=0:y=ih-5:w=iw:h=5:color={accent.replace('#','0x')}:t=fill"
    
    if title:
        lines = title.split("\n")
        y = 350 - (len(lines)-1)*50 if not subtitle else 280
        for i, ln in enumerate(lines):
            s = ln.replace("'","").replace(":","\\\\:").replace("$","\\$").replace("%","\\%")
            vf += f",drawtext=text='{s}':fontsize=96:fontcolor=white:x=(w-text_w)/2:y={y+i*110}:fontfile={FB}"
    
    if subtitle:
        slines = subtitle.split("\n")
        y_start = (280 + (len(title.split("\n")) if title else 0)*110 + 60) if title else 380
        for i, ln in enumerate(slines):
            s = ln.replace("'","").replace(":","\\\\:").replace("$","\\$").replace("%","\\%")
            vf += f",drawtext=text='{s}':fontsize=38:fontcolor=0xcccccc:x=(w-text_w)/2:y={y_start+i*52}:fontfile={FR}"
    
    out = os.path.join(TMP, f"{sid}_v.mp4")
    subprocess.run(["ffmpeg","-y","-f","lavfi","-i",vf,"-t",str(d),"-c:v","libx264","-pix_fmt","yuv420p",out], check=True, capture_output=True)
    return out, d

def make_screenshot_card(sid, img_file, caption, accent, min_dur):
    """Screenshot with optional caption overlay at bottom."""
    d = max(min_dur, 5.0)
    img = os.path.join(SS, img_file)
    
    ac = accent.replace('#','0x')
    vf = f"scale=1920:1080"
    
    # Caption omitted — let screenshots and voice narration speak
    
    out = os.path.join(TMP, f"{sid}_v.mp4")
    subprocess.run(["ffmpeg","-y","-loop","1","-i",img,"-t",str(d),"-vf",vf,"-c:v","libx264","-pix_fmt","yuv420p","-r","30",out], check=True, capture_output=True)
    return out, d

def add_audio(sid, video_path, narration, video_dur):
    """Add TTS or silence."""
    final = os.path.join(TMP, f"{sid}_final.mp4")
    if narration:
        audio_path = os.path.join(TMP, f"{sid}_a.mp3")
        tts(narration, audio_path)
        ad = dur(audio_path)
        # If audio is longer than video, extend video
        if ad + 0.8 > video_dur:
            # Remake video with longer duration
            return None, ad + 1.0  # Signal to redo
        subprocess.run(["ffmpeg","-y","-i",video_path,"-i",audio_path,"-c:v","copy","-c:a","aac","-b:a","192k","-shortest",final], check=True, capture_output=True)
    else:
        subprocess.run(["ffmpeg","-y","-i",video_path,"-f","lavfi","-i","anullsrc=r=44100:cl=stereo","-c:v","copy","-c:a","aac","-shortest",final], check=True, capture_output=True)
    return final, video_dur

# ═══════════════════════════════════════════════
# SCENES — (type, sid, args...)
# type: "text" | "ss" (screenshot)
# ═══════════════════════════════════════════════
SCENES = [
    # HOOK
    ("text", "s01", "Your PM Software\nCosts $50,000 a Year.", "And your field crews\nstill hate using it.", "#ef4444", 5.0,
     "Fifty thousand dollars a year. For software your foremen won't even open."),

    # LANDING
    ("ss", "s02", "landing.png", "opsslate.app", "#4ea8ff", 5.0,
     "So we built something different."),

    # INTRO CARD
    ("text", "s03", "OpsSlate", "AI-Powered Construction PM\n$49/month  ·  20+ Modules  ·  Real-Time", "#4ea8ff", 6.0,
     None),

    # DASHBOARD
    ("ss", "s04", "dashboard.png", "Real-Time Project Dashboard", "#4ea8ff", 7.0,
     "One dashboard. Every project at a glance. Updated instantly, not last Tuesday."),

    # VOICE CARD
    ("text", "s05", "🎙️ Voice Daily Logs", "Tap.  Talk.  Done.\n\n30 seconds to a professional daily log.\nNo typing.  No forms.  No excuses.", "#22c55e", 6.0,
     None),

    # VOICE DEMO
    ("ss", "s06", "daily-logs.png", "AI-Powered Daily Log Entry", "#22c55e", 7.0,
     "Your foreman talks into their phone. AI writes the log. Construction data entry, solved."),

    # AUTOPILOT CARD
    ("text", "s07", "🤖 AI Autopilot", "Reads your scope of work.\nAnalyzes schedule, crew, budget, weather.\nTells you what to do next.", "#a855f7", 6.0,
     None),

    # AUTOPILOT DEMO
    ("ss", "s08", "autopilot.png", "AI Project Intelligence", "#a855f7", 8.0,
     "It cross-references your RFIs, submittals, and schedule. If a submittal isn't approved before steel goes up — it tells you. Before you even notice."),

    # HEALTH SCORES
    ("ss", "s09", "reports.png", "Project Health Scores", "#eab308", 7.0,
     "Every project gets a health score. Zero to a hundred. Green means go. Red means call somebody."),

    # TIME TRACKING
    ("ss", "s10", "time-tracking.png", "One-Tap Clock In / Out", "#22c55e", 6.0,
     "One tap to clock in. Live timer. Auto overtime. No timesheets."),

    # PUNCH LIST
    ("ss", "s11", "punch-list.png", "Punch List Management", "#4ea8ff", 5.0,
     "Punch lists with auto numbering, trade tagging, and overdue tracking."),

    # CHANGE ORDERS
    ("ss", "s12", "change-orders.png", "Change Order Workflow", "#eab308", 5.0,
     "Full change order approval workflow with cost and schedule impact."),

    # SAFETY
    ("ss", "s13", "safety.png", "Safety & Incident Reporting", "#ef4444", 5.0,
     "Incident reporting with risk assessment matrix and corrective actions."),

    # WEATHER
    ("ss", "s14", "weather.png", "Weather Intelligence", "#4ea8ff", 5.0,
     "Ten day forecast with field work recommendations and crew calloff emails."),

    # BUDGET
    ("ss", "s15", "budget.png", "Budget & Cost Tracking", "#22c55e", 5.0,
     "Live budget variance. Cost codes. See overruns before they happen."),

    # RFIs
    ("ss", "s16", "rfis.png", "RFI Tracking", "#a855f7", 4.5,
     "R F I tracking with overdue alerts and answer workflow."),

    # SUBMITTALS
    ("ss", "s17", "submittals.png", "Submittal Review Workflow", "#4ea8ff", 4.5,
     "Submittals with four action review. Approved, revise, or rejected."),

    # CREW
    ("ss", "s18", "crew.png", "Crew Management", "#22c55e", 5.0,
     "Crew management with automated email notifications and scheduling."),

    # DOCUMENTS
    ("ss", "s19", "documents.png", "Document Manager", "#4ea8ff", 4.5,
     "Upload anything. Fifteen categories. Organized and searchable."),

    # CALENDAR
    ("ss", "s20", "calendar.png", "Project Calendar", "#eab308", 4.0,
     None),

    # COMPARISON
    ("text", "s21", "OpsSlate  vs  Procore",
     "AI Autopilot              ✅        ❌\nVoice Daily Logs        ✅        ❌\nHealth Scores            ✅        ❌\nReal-Time Data          ✅        ❌\nScope-Aware AI          ✅        ❌\n\nPrice                          $49       $4,000+",
     "#22c55e", 8.0,
     "Eight features they don't have. A hundred times cheaper. And we ship new features every single week."),

    # CTA
    ("text", "s22", "opsslate.app", "Start Free Today\n\nNo Credit Card  ·  No Sales Calls\nJust Better Project Management", "#4ea8ff", 7.0,
     "Try it free. No credit card. No sales calls. Just better project management. O P S Slate dot app."),
]


def main():
    os.makedirs(TMP, exist_ok=True)
    segments = []
    
    for scene in SCENES:
        stype = scene[0]
        sid = scene[1]
        print(f"Building {sid}...")
        
        try:
            if stype == "text":
                _, sid_name, title, subtitle, accent, min_dur, narration = scene
                
                # Generate audio first to get true duration
                actual_dur = min_dur
                if narration:
                    ap = os.path.join(TMP, f"{sid}_a.mp3")
                    tts(narration, ap)
                    ad = dur(ap)
                    actual_dur = max(min_dur, ad + 1.5)
                
                video_path, _ = make_text_card(sid, title, subtitle, accent, actual_dur)
                final, _ = add_audio(sid, video_path, narration, actual_dur)
                segments.append(final)
                
            elif stype == "ss":
                _, sid_name, img_file, caption, accent, min_dur, narration = scene
                
                actual_dur = min_dur
                if narration:
                    ap = os.path.join(TMP, f"{sid}_a.mp3")
                    tts(narration, ap)
                    ad = dur(ap)
                    actual_dur = max(min_dur, ad + 1.5)
                
                video_path, _ = make_screenshot_card(sid, img_file, caption, accent, actual_dur)
                final, _ = add_audio(sid, video_path, narration, actual_dur)
                segments.append(final)
            
            print(f"  ✅ {actual_dur:.1f}s")
        except Exception as e:
            print(f"  ❌ {e}")
    
    # Concat
    cf = os.path.join(TMP, "concat3.txt")
    with open(cf, "w") as f:
        for s in segments:
            if s: f.write(f"file '{s}'\n")
    
    out = os.path.join(VIDEO_DIR, "opsslate-intro-v3.mp4")
    subprocess.run(["ffmpeg","-y","-f","concat","-safe","0","-i",cf,"-c:v","libx264","-c:a","aac","-movflags","+faststart",out], check=True, capture_output=True)
    
    d = dur(out)
    sz = os.path.getsize(out) / 1048576
    print(f"\n✅ {out}")
    print(f"Duration: {d:.0f}s ({d/60:.1f}min) | Size: {sz:.1f}MB")
    print(f"Scenes: {len(segments)}")


if __name__ == "__main__":
    main()
