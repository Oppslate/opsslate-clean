#!/usr/bin/env python3
"""Build OpsSlate product intro video with TTS narration and title cards."""
import subprocess
import os
import json

VIDEO_DIR = os.path.dirname(os.path.abspath(__file__))
VOICE = "en-US-GuyNeural"

# Scene definitions: (id, duration_sec, title_text, subtitle_text, narration, bg_color, accent_color)
SCENES = [
    ("hook", 8, "Your PM Software\nCosts HOW Much?", "$50,000/year for Procore", 
     "Procore charges fifty thousand dollars a year. And your field crews still hate using it.",
     "#0b0f14", "#ef4444"),
    
    ("problem", 10, "The Problem", "❌ Daily logs pencil-whipped at 4PM\n❌ Foremen aren't data entry clerks\n❌ Zero AI in any PM tool",
     "Daily logs get pencil-whipped at 4 PM Friday. Foremen aren't data entry clerks. And no PM tool uses AI. Until now.",
     "#0b0f14", "#ef4444"),
    
    ("intro", 7, "🚜 OpsSlate", "Your Operations. One Slate.\n\nAI-Powered Construction PM\n20+ Modules  •  $49/month",
     "Introducing OpsSlate. AI-powered construction project management. Twenty plus modules. Forty nine dollars a month.",
     "#0b0f14", "#4ea8ff"),
    
    ("voice", 10, "🎙️ Voice Daily Logs", "Tap → Talk → Done\n\n30 seconds to a professional daily log\nNo typing. No forms. No excuses.",
     "Talk to your phone. AI writes the daily log. Thirty seconds. Done. No typing. No forms. No excuses.",
     "#0b0f14", "#22c55e"),
    
    ("autopilot", 10, "🤖 AI Autopilot", "Analyzes your entire project 24/7\n\nCrew • Budget • Weather • Safety\n→ Tells you what needs attention",
     "AI Autopilot analyzes your entire project. Crew, budget, weather, safety. Then tells you exactly what needs attention. Like having a junior PM watching twenty four seven.",
     "#0b0f14", "#a855f7"),
    
    ("health", 7, "📊 Health Scores", "Every project: 0-100\n\n🟢 Healthy (80+)\n🟡 At Risk (60-79)\n🔴 Critical (<60)\n\nOpen app → Know where to focus",
     "Every project gets a health score. Zero to one hundred. Red, yellow, green. Open the app, know exactly where to focus.",
     "#0b0f14", "#eab308"),
    
    ("features", 13, "20+ Modules", "✅ Punch Lists    🔄 Change Orders    💰 Budget\n❓ RFIs    📋 Submittals    🦺 Safety\n⛅ Weather    👷 Crew    ⏱️ Time Tracking\n📄 Documents    📝 Daily Logs    📷 Site Media\n📊 Reports    🏗️ Subcontractors    📧 Briefings",
     "Punch lists. Change orders. Budget tracking. R F Is. Submittals. Safety incidents. Weather intelligence. Crew management. Time tracking. Document management. All connected. All real-time.",
     "#0b0f14", "#4ea8ff"),
    
    ("compare", 10, "OpsSlate vs Procore", "Feature               OpsSlate  Procore\n─────────────────────────\nAI Autopilot          ✅         ❌\nVoice Daily Logs     ✅         ❌\nHealth Scores         ✅         ❌\nReal-Time Data       ✅         ❌\nPrice                    $49/mo    $4K+/mo",
     "Eight features Procore doesn't have. One hundred times cheaper. Real-time data instead of stale refreshes. And AI that actually thinks.",
     "#0b0f14", "#22c55e"),
    
    ("cta", 15, "Start Free Today", "opsslate.app\n\n✓ No credit card required\n✓ All core modules included\n✓ AI features built-in\n\nThe future of construction\nmanagement is here.",
     "Stop overpaying for dumb software. OpsSlate. Free to start. No credit card. The future of construction management is here. ops slate dot app.",
     "#0b0f14", "#4ea8ff"),
]

def generate_tts(text, output_path):
    """Generate TTS audio using edge-tts."""
    cmd = f'edge-tts --voice "{VOICE}" --text "{text}" --write-media "{output_path}" --rate="+5%"'
    subprocess.run(cmd, shell=True, check=True)
    return output_path

def create_title_card(scene_id, title, subtitle, bg_color, accent_color, duration, output_path):
    """Create a title card video using ffmpeg drawtext."""
    # Escape special chars for ffmpeg
    title_esc = title.replace("'", "'\\''").replace(":", "\\:")
    subtitle_esc = subtitle.replace("'", "'\\''").replace(":", "\\:").replace("\n", "\\n")
    
    # Build ffmpeg filter for multi-line text
    filters = []
    
    # Background
    filters.append(f"color=c={bg_color}:s=1920x1080:d={duration}")
    
    # Title text (centered, large)
    title_lines = title.split("\n")
    y_start = 300 if len(title_lines) > 1 else 380
    for i, line in enumerate(title_lines):
        line_esc = line.replace("'", "'\\''").replace(":", "\\:")
        y = y_start + i * 80
        filters[0] += f",drawtext=text='{line_esc}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y={y}:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    
    # Subtitle text (centered, smaller, muted)
    sub_lines = subtitle.split("\n")
    y_start_sub = y_start + len(title_lines) * 80 + 40
    for i, line in enumerate(sub_lines):
        line_esc = line.replace("'", "'\\''").replace(":", "\\:")
        y = y_start_sub + i * 40
        filters[0] += f",drawtext=text='{line_esc}':fontsize=28:fontcolor=0xaaaaaa:x=(w-text_w)/2:y={y}:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    
    # Accent bar at bottom
    filters[0] += f",drawbox=x=0:y=ih-6:w=iw:h=6:color={accent_color}:t=fill"
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", filters[0],
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-t", str(duration),
        output_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path

def main():
    os.makedirs(f"{VIDEO_DIR}/tmp", exist_ok=True)
    
    segments = []
    
    for scene in SCENES:
        scene_id, duration, title, subtitle, narration, bg, accent = scene
        print(f"Building scene: {scene_id}...")
        
        # Generate narration
        audio_path = f"{VIDEO_DIR}/tmp/{scene_id}_audio.mp3"
        generate_tts(narration, audio_path)
        
        # Get audio duration
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "json", audio_path],
            capture_output=True, text=True
        )
        audio_duration = float(json.loads(result.stdout)["format"]["duration"])
        actual_duration = max(duration, audio_duration + 0.5)
        
        # Create title card video
        video_path = f"{VIDEO_DIR}/tmp/{scene_id}_video.mp4"
        create_title_card(scene_id, title, subtitle, bg, accent, actual_duration, video_path)
        
        # Combine video + audio
        combined_path = f"{VIDEO_DIR}/tmp/{scene_id}_combined.mp4"
        subprocess.run([
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            combined_path
        ], check=True, capture_output=True)
        
        segments.append(combined_path)
    
    # Create concat file
    concat_path = f"{VIDEO_DIR}/tmp/concat.txt"
    with open(concat_path, "w") as f:
        for seg in segments:
            f.write(f"file '{seg}'\n")
    
    # Concatenate all segments
    output_path = f"{VIDEO_DIR}/opsslate-intro.mp4"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_path,
        "-c:v", "libx264", "-c:a", "aac",
        "-movflags", "+faststart",
        output_path
    ], check=True, capture_output=True)
    
    print(f"\n✅ Video built: {output_path}")
    
    # Get final duration
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "json", output_path],
        capture_output=True, text=True
    )
    final_duration = float(json.loads(result.stdout)["format"]["duration"])
    print(f"Duration: {final_duration:.1f} seconds")

if __name__ == "__main__":
    main()
