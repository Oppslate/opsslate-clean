#!/usr/bin/env python3
"""Build OpsSlate product intro video V2 — conversational, screenshot-based, elegant."""
import subprocess
import os
import json
import shlex

VIDEO_DIR = os.path.dirname(os.path.abspath(__file__))
SCREENSHOTS_DIR = os.path.join(VIDEO_DIR, "screenshots")
VOICE = "en-US-AvaNeural"  # Conversational, expressive tech female
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# Scene: (id, screenshot_file or None, title, subtitle, narration, accent_color)
# narration = None means text-only card (no voiceover — "let them read")
SCENES = [
    # ── HOOK ──
    ("s01_hook", None,
     "Your PM Software\nCosts $50,000/year.",
     "And your field crews still hate it.",
     "Fifty thousand dollars a year for software your foremen won't even use.",
     "#ef4444"),

    # ── LANDING PAGE ──
    ("s02_landing", "landing.png",
     None, None,
     "So we built something better.",
     "#4ea8ff"),

    # ── INTRO ──
    ("s03_intro", None,
     "OpsSlate",
     "AI-Powered Construction PM\n$49/month  ·  20+ Modules  ·  Real-Time",
     None,  # Let them read
     "#4ea8ff"),

    # ── DASHBOARD ──
    ("s04_dash", "dashboard.png",
     None, None,
     "One dashboard. Every project. Every metric. Updated in real time, not last Tuesday.",
     "#4ea8ff"),

    # ── VOICE DAILY LOGS ──
    ("s05_voice_card", None,
     "🎙️ Voice Daily Logs",
     "Tap.  Talk.  Done.\n30 seconds to a professional daily log.",
     None,  # Let them read
     "#22c55e"),

    ("s06_voice_demo", "daily-logs.png",
     None, None,
     "Your foreman talks into their phone. AI writes the log. No typing. No data entry. No excuses.",
     "#22c55e"),

    # ── AI AUTOPILOT ──
    ("s07_autopilot_card", None,
     "🤖 AI Autopilot",
     "Reads your scope of work.\nAnalyzes schedule, crew, budget, weather.\nTells you what to do next.",
     None,  # Let them read
     "#a855f7"),

    ("s08_autopilot_demo", "autopilot.png",
     None, None,
     "It cross-references your RFIs, submittals, and schedule. If a submittal isn't approved before steel goes up, it flags it. Before you even notice.",
     "#a855f7"),

    # ── REPORTS ──
    ("s09_health", "reports.png",
     None, None,
     "Every project gets a health score. Zero to a hundred. Open the app. Green means go. Red means call somebody.",
     "#eab308"),

    # ── TIME TRACKING ──
    ("s10_time", "time-tracking.png",
     None, None,
     "One tap to clock in. Live timer. Auto overtime calculation. No timesheets. No arguments.",
     "#22c55e"),

    # ── FEATURE MONTAGE — screenshots only, no narration ──
    ("s11_punch", "punch-list.png", None, None, None, "#4ea8ff"),
    ("s12_safety", "safety.png", None, None, None, "#ef4444"),
    ("s13_weather", "weather.png", None, None, None, "#eab308"),
    ("s14_budget", "budget.png", None, None, None, "#22c55e"),
    ("s15_crew", "crew.png", None, None, None, "#4ea8ff"),

    # ── COMPARISON ──
    ("s16_compare", None,
     "OpsSlate  vs  Procore",
     "AI Autopilot          ✅    ❌\nVoice Daily Logs     ✅    ❌\nHealth Scores         ✅    ❌\nReal-Time Data       ✅    ❌\nScope-Aware AI       ✅    ❌\n──────────────────────\nPrice                    $49     $4,000+",
     "Eight features they don't have. A hundred times cheaper. And we ship new features every week.",
     "#22c55e"),

    # ── CTA ──
    ("s17_cta", None,
     "opsslate.app",
     "Start Free  ·  No Credit Card\nThe future of construction management.",
     "Try it free. No credit card. No sales calls. Just better project management.",
     "#4ea8ff"),
]


def get_audio_duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "json", path],
        capture_output=True, text=True
    )
    return float(json.loads(result.stdout)["format"]["duration"])


def generate_tts(text, output_path):
    cmd = f'edge-tts --voice "{VOICE}" --text {shlex.quote(text)} --write-media "{output_path}" --rate="-2%"'
    subprocess.run(cmd, shell=True, check=True, capture_output=True)


def build_scene(scene):
    sid, screenshot, title, subtitle, narration, accent = scene
    tmp = os.path.join(VIDEO_DIR, "tmp")
    
    # Determine duration
    has_audio = narration is not None and narration.strip() != ""
    audio_path = os.path.join(tmp, f"{sid}_audio.mp3")
    
    if has_audio:
        generate_tts(narration, audio_path)
        audio_dur = get_audio_duration(audio_path)
        duration = audio_dur + 1.0  # padding
    else:
        duration = 3.0 if screenshot else 4.0  # Quick for montage, longer for text cards
    
    # Build video
    video_path = os.path.join(tmp, f"{sid}_video.mp4")
    
    if screenshot and os.path.exists(os.path.join(SCREENSHOTS_DIR, screenshot)):
        # Screenshot-based scene
        img = os.path.join(SCREENSHOTS_DIR, screenshot)
        
        # Build filter: scale screenshot, add accent bar, optional overlay text
        filters = f"movie={img},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#0b0f14"
        
        # Add subtle accent bar at bottom
        filters += f",drawbox=x=0:y=ih-4:w=iw:h=4:color={accent}:t=fill"
        
        # Add semi-transparent gradient at bottom if there's narration (for readability)
        if has_audio:
            filters += ",drawbox=x=0:y=ih-80:w=iw:h=80:color=black@0.5:t=fill"
        
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"color=c=#0b0f14:s=1920x1080:d={duration}",
            "-filter_complex", f"[0:v]{filters}[out]" if False else "",  # skip complex for now
            "-t", str(duration),
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            video_path
        ]
        
        # Simpler approach: use image as input
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", img,
            "-t", str(duration),
            "-vf", f"scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#0b0f14,drawbox=x=0:y=ih-4:w=iw:h=4:color={accent.replace('#', '0x')}:t=fill",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
            video_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
    else:
        # Text card scene — elegant dark background
        drawtext_filters = f"color=c=#0b0f14:s=1920x1080:d={duration}"
        
        # Accent line at top
        drawtext_filters += f",drawbox=x=0:y=0:w=iw:h=3:color={accent.replace('#', '0x')}:t=fill"
        # Accent line at bottom  
        drawtext_filters += f",drawbox=x=0:y=ih-3:w=iw:h=3:color={accent.replace('#', '0x')}:t=fill"
        
        if title:
            lines = title.split("\n")
            y_base = 340 if subtitle else 450
            for i, line in enumerate(lines):
                safe = line.replace("'", "").replace(":", "\\\\:").replace("$", "\\$")
                y = y_base + i * 90
                drawtext_filters += f",drawtext=text='{safe}':fontsize=82:fontcolor=white:x=(w-text_w)/2:y={y}:fontfile={FONT_BOLD}"
        
        if subtitle:
            sub_lines = subtitle.split("\n")
            y_base = (340 if title else 400) + (len(title.split("\n")) if title else 0) * 90 + 50
            for i, line in enumerate(sub_lines):
                safe = line.replace("'", "").replace(":", "\\\\:").replace("$", "\\$")
                y = y_base + i * 42
                drawtext_filters += f",drawtext=text='{safe}':fontsize=32:fontcolor=0xbbbbbb:x=(w-text_w)/2:y={y}:fontfile={FONT_REG}"
        
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", drawtext_filters,
            "-t", str(duration),
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            video_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
    
    # Combine with audio if present
    if has_audio:
        combined = os.path.join(tmp, f"{sid}_final.mp4")
        subprocess.run([
            "ffmpeg", "-y",
            "-i", video_path, "-i", audio_path,
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            combined
        ], check=True, capture_output=True)
        return combined
    else:
        # Add silent audio track for concat compatibility
        silent = os.path.join(tmp, f"{sid}_final.mp4")
        subprocess.run([
            "ffmpeg", "-y",
            "-i", video_path,
            "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo",
            "-c:v", "copy", "-c:a", "aac", "-shortest",
            silent
        ], check=True, capture_output=True)
        return silent


def main():
    tmp = os.path.join(VIDEO_DIR, "tmp")
    os.makedirs(tmp, exist_ok=True)
    
    segments = []
    for scene in SCENES:
        print(f"Building {scene[0]}...")
        try:
            seg = build_scene(scene)
            segments.append(seg)
            print(f"  ✅ done")
        except Exception as e:
            print(f"  ❌ failed: {e}")
    
    # Concat
    concat_file = os.path.join(tmp, "concat.txt")
    with open(concat_file, "w") as f:
        for seg in segments:
            f.write(f"file '{seg}'\n")
    
    output = os.path.join(VIDEO_DIR, "opsslate-intro-v2.mp4")
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_file,
        "-c:v", "libx264", "-c:a", "aac",
        "-movflags", "+faststart",
        output
    ], check=True, capture_output=True)
    
    dur = get_audio_duration(output)
    size_mb = os.path.getsize(output) / 1048576
    print(f"\n✅ Video: {output}")
    print(f"Duration: {dur:.1f}s | Size: {size_mb:.1f}MB")


if __name__ == "__main__":
    main()
