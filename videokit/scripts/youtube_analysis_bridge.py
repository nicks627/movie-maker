import json
import math
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import cv2
import yt_dlp

try:
    import easyocr  # type: ignore
except Exception:
    easyocr = None

try:
    from faster_whisper import WhisperModel  # type: ignore
except Exception:
    WhisperModel = None

try:
    import whisper as openai_whisper  # type: ignore
except Exception:
    openai_whisper = None


VIDEO_EXTENSIONS = {".mp4", ".mkv", ".webm", ".mov", ".m4v"}


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def slugify(value):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", str(value).lower())).strip("-")[:80]


def write_json(path_obj, value):
    path_obj.parent.mkdir(parents=True, exist_ok=True)
    path_obj.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_markdown(path_obj, content):
    path_obj.parent.mkdir(parents=True, exist_ok=True)
    path_obj.write_text(content, encoding="utf-8")


def strip_tags(value):
    clean = re.sub(r"<[^>]+>", " ", value or "")
    clean = re.sub(r"&nbsp;?", " ", clean)
    clean = re.sub(r"\s+", " ", clean)
    return clean.strip()


def parse_timestamp(raw_value):
    normalized = raw_value.replace(",", ".")
    hours, minutes, seconds = normalized.split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def parse_vtt(vtt_path):
    cues = []
    lines = vtt_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line or line.upper().startswith("WEBVTT") or line.startswith("NOTE"):
            index += 1
            continue
        if "-->" not in line:
            index += 1
            continue
        start_raw, end_raw = [part.strip().split(" ")[0] for part in line.split("-->")]
        text_lines = []
        index += 1
        while index < len(lines) and lines[index].strip():
            text_lines.append(strip_tags(lines[index]))
            index += 1
        text = " ".join(part for part in text_lines if part).strip()
        if text:
            cues.append(
                {
                    "startSec": parse_timestamp(start_raw),
                    "endSec": parse_timestamp(end_raw),
                    "text": text,
                }
            )
        index += 1
    return cues


def pick_subtitle_file(candidates):
    if not candidates:
        return None
    priorities = [
        ".ja.vtt",
        ".ja-orig.vtt",
        ".ja-JP.vtt",
        ".en.vtt",
        ".en-orig.vtt",
    ]
    for suffix in priorities:
        for candidate in candidates:
            if candidate.name.endswith(suffix):
                return candidate
    return sorted(candidates)[0]


def build_sample_percentages(sample_count):
    if sample_count <= 1:
        return [50]
    if sample_count == 2:
        return [20, 80]
    return [round(5 + (90 / (sample_count - 1)) * index) for index in range(sample_count)]


def run_download(url, video_dir, ffmpeg_path, with_subtitles):
    download_opts = {
        "quiet": True,
        "noprogress": True,
        "noplaylist": True,
        "outtmpl": str(video_dir / "video.%(ext)s"),
        "format": "best[height<=720][ext=mp4]/best[height<=720]/best",
        "writeinfojson": True,
        "overwrites": True,
    }
    if with_subtitles:
        download_opts["writesubtitles"] = True
        download_opts["writeautomaticsub"] = True
        download_opts["subtitleslangs"] = ["ja", "ja.*"]
    if ffmpeg_path:
        ffmpeg_location = Path(ffmpeg_path)
        download_opts["ffmpeg_location"] = str(ffmpeg_location.parent if ffmpeg_location.is_file() else ffmpeg_location)

    with yt_dlp.YoutubeDL(download_opts) as ydl:
        return ydl.extract_info(url, download=True)


def download_reference(url, output_root, ffmpeg_path, warnings):
    probe_opts = {
        "quiet": True,
        "skip_download": True,
        "noplaylist": True,
    }
    with yt_dlp.YoutubeDL(probe_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    video_id = info.get("id") or slugify(info.get("title") or "youtube-reference")
    video_dir = output_root / video_id
    subtitles_dir = video_dir / "subtitles"
    frames_dir = video_dir / "frames"
    video_dir.mkdir(parents=True, exist_ok=True)
    subtitles_dir.mkdir(parents=True, exist_ok=True)
    frames_dir.mkdir(parents=True, exist_ok=True)

    try:
        info = run_download(url, video_dir, ffmpeg_path, with_subtitles=True)
    except Exception as error:
        message = str(error).lower()
        if "subtitle" in message or "429" in message:
            warnings.append("Subtitle download failed, so the video was retried without subtitles.")
            info = run_download(url, video_dir, ffmpeg_path, with_subtitles=False)
        else:
            raise

    video_file = None
    subtitle_files = []
    for candidate in video_dir.iterdir():
        if candidate.is_file():
            if candidate.suffix.lower() in VIDEO_EXTENSIONS and candidate.stem.startswith("video"):
                video_file = candidate
            if candidate.suffix.lower() == ".vtt":
                target = subtitles_dir / candidate.name
                if candidate != target:
                    shutil.move(str(candidate), str(target))
                subtitle_files.append(target)

    if video_file is None:
        raise RuntimeError(f"Could not find downloaded video for {url}")

    meta = {
        "generatedAt": utc_now(),
        "id": info.get("id"),
        "title": info.get("title"),
        "url": info.get("webpage_url") or url,
        "duration": info.get("duration"),
        "channel": info.get("channel"),
        "uploader": info.get("uploader"),
        "uploadDate": info.get("upload_date"),
        "description": info.get("description"),
        "thumbnail": info.get("thumbnail"),
        "viewCount": info.get("view_count"),
        "likeCount": info.get("like_count"),
        "isShort": bool(info.get("webpage_url", "").find("/shorts/") >= 0),
        "videoPath": str(video_file),
        "subtitles": [str(item) for item in sorted(subtitle_files)],
    }
    write_json(video_dir / "meta.json", meta)

    return {
        "videoId": video_id,
        "videoDir": video_dir,
        "videoPath": video_file,
        "meta": meta,
        "subtitleFiles": sorted(subtitle_files),
        "framesDir": frames_dir,
    }


def extract_frames(video_path, frames_dir, sample_count):
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Could not open {video_path}")

    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 30.0)
    duration_sec = total_frames / fps if total_frames and fps else 0.0
    percentages = build_sample_percentages(sample_count)
    frame_paths = []

    for index, percentage in enumerate(percentages, start=1):
        frame_number = 0
        if total_frames > 0:
            frame_number = min(total_frames - 1, max(0, round((percentage / 100.0) * total_frames)))
            capture.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ok, frame = capture.read()
        if not ok:
            continue
        file_path = frames_dir / f"{index:02d}_{percentage:02d}pct.jpg"
        cv2.imwrite(str(file_path), frame)
        frame_paths.append(
            {
                "path": str(file_path),
                "percentage": percentage,
                "frame": frame_number,
                "second": round(duration_sec * (percentage / 100.0), 2),
            }
        )

    capture.release()

    return {
        "fps": fps,
        "durationSec": round(duration_sec, 3),
        "frames": frame_paths,
    }


def build_contact_sheet(frame_entries, output_path):
    if not frame_entries:
        return None

    images = []
    for entry in frame_entries:
        image = cv2.imread(entry["path"])
        if image is None:
            continue
        labeled = image.copy()
        cv2.putText(
            labeled,
            f"{entry['percentage']}%",
            (24, 52),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.3,
            (255, 255, 255),
            3,
            cv2.LINE_AA,
        )
        images.append(labeled)

    if not images:
        return None

    tile_width = 360
    tile_height = 640
    columns = 3 if len(images) > 4 else 2
    resized = [cv2.resize(image, (tile_width, tile_height)) for image in images]
    rows = []
    for index in range(0, len(resized), columns):
        row_images = resized[index : index + columns]
        if len(row_images) < columns:
            filler = 255 * (row_images[0] * 0)
            row_images = row_images + [filler for _ in range(columns - len(row_images))]
        rows.append(cv2.hconcat(row_images))

    sheet = cv2.vconcat(rows)
    cv2.imwrite(str(output_path), sheet)
    return str(output_path)


def run_ocr(frame_entries, warnings):
    if easyocr is None:
        warnings.append("easyocr is not installed, so OCR analysis was skipped.")
        return []

    reader = easyocr.Reader(["ja", "en"], gpu=False, verbose=False)
    results = []
    for entry in frame_entries:
        detections = reader.readtext(entry["path"], detail=1, paragraph=False)
        normalized = []
        for bbox, text, confidence in detections:
            if not text or confidence < 0.2:
                continue
            xs = [point[0] for point in bbox]
            ys = [point[1] for point in bbox]
            normalized.append(
                {
                    "text": strip_tags(text),
                    "confidence": round(float(confidence), 4),
                    "centerX": round(sum(xs) / len(xs), 2),
                    "centerY": round(sum(ys) / len(ys), 2),
                    "xMin": round(min(xs), 2),
                    "xMax": round(max(xs), 2),
                    "yMin": round(min(ys), 2),
                    "yMax": round(max(ys), 2),
                }
            )
        results.append(
            {
                "framePath": entry["path"],
                "percentage": entry["percentage"],
                "detections": normalized,
            }
        )
    return results


def maybe_transcribe(video_path, warnings):
    if WhisperModel is None and openai_whisper is None:
        warnings.append("No whisper module is installed, so audio transcription was skipped.")
        return None

    try:
        if WhisperModel is not None:
            model = WhisperModel("small", device="cpu", compute_type="int8")
            segments, info = model.transcribe(str(video_path), language="ja")
            segment_items = []
            for segment in segments:
                segment_items.append(
                    {
                        "startSec": round(segment.start, 2),
                        "endSec": round(segment.end, 2),
                        "text": strip_tags(segment.text),
                    }
                )
            return {
                "engine": "faster-whisper",
                "language": getattr(info, "language", None),
                "segments": segment_items,
            }
    except Exception as error:
        warnings.append(f"faster-whisper failed: {error}")

    try:
        if openai_whisper is not None:
            model = openai_whisper.load_model("small")
            result = model.transcribe(str(video_path), language="ja")
            return {
                "engine": "openai-whisper",
                "language": result.get("language"),
                "segments": [
                    {
                        "startSec": round(segment.get("start", 0.0), 2),
                        "endSec": round(segment.get("end", 0.0), 2),
                        "text": strip_tags(segment.get("text", "")),
                    }
                    for segment in result.get("segments", [])
                    if strip_tags(segment.get("text", ""))
                ],
            }
    except Exception as error:
        warnings.append(f"openai-whisper failed: {error}")

    return None


def subtitle_stats(cues):
    if not cues:
        return {
            "cueCount": 0,
            "averageCueChars": 0,
            "charsPerSecond": 0,
            "firstCueStartSec": None,
            "lastCueEndSec": None,
        }
    total_chars = sum(len(cue["text"]) for cue in cues)
    total_duration = max(cues[-1]["endSec"] - cues[0]["startSec"], 1.0)
    return {
        "cueCount": len(cues),
        "averageCueChars": round(total_chars / len(cues), 2),
        "charsPerSecond": round(total_chars / total_duration, 2),
        "firstCueStartSec": cues[0]["startSec"],
        "lastCueEndSec": cues[-1]["endSec"],
    }


def classify_subtitle_density(stats):
    chars_per_second = stats.get("charsPerSecond", 0)
    if chars_per_second >= 18:
        return "high"
    if chars_per_second >= 10:
        return "medium"
    return "low"


def collect_ocr_lines(ocr_results, percentage_limit):
    lines = []
    for frame in ocr_results:
        if frame["percentage"] > percentage_limit:
            continue
        for detection in frame.get("detections", []):
            if detection["text"]:
                lines.append(detection["text"])
    return lines


def infer_headline_hierarchy(early_lines, subtitle_cues):
    if len(early_lines) >= 3:
        return "headline + subline stack"
    if len(early_lines) >= 2:
        first_len = len(early_lines[0])
        second_len = len(early_lines[1])
        if first_len < second_len * 0.8:
            return "kicker + main headline"
        return "two-line headline"
    if subtitle_cues:
        first_text = subtitle_cues[0]["text"]
        if len(first_text) <= 22:
            return "single-line hook"
    return "voice-first opening"


def infer_hook_style(early_lines, subtitle_info, subtitle_cues):
    if sum(len(line) for line in early_lines) >= 14:
        return "headline-led"
    if subtitle_cues and subtitle_info.get("firstCueStartSec") is not None:
        if subtitle_info["firstCueStartSec"] <= 1.5 and len(subtitle_cues[0]["text"]) <= 28:
            return "fast subtitle hook"
        if subtitle_info["firstCueStartSec"] <= 2.5:
            return "voice-led quick hook"
    return "slow hook"


def infer_information_card_position(ocr_results):
    middle = [frame for frame in ocr_results if 30 <= frame["percentage"] <= 70]
    detections = [item for frame in middle for item in frame.get("detections", [])]
    if len(detections) < 2:
        return "undetected"

    avg_x = sum(item["centerX"] for item in detections) / len(detections)
    avg_y = sum(item["centerY"] for item in detections) / len(detections)
    avg_x_ratio = avg_x / 1080.0
    avg_y_ratio = avg_y / 1920.0

    if 0.3 <= avg_x_ratio <= 0.7 and 0.2 <= avg_y_ratio <= 0.62:
        return "center card"
    if avg_y_ratio <= 0.2:
        return "top banner"
    if avg_y_ratio >= 0.7:
        return "lower text block"
    return "side card"


def infer_cta_type(subtitle_cues, ocr_results):
    late_text = " ".join(cue["text"] for cue in subtitle_cues[-3:])
    late_text += " " + " ".join(collect_ocr_lines(ocr_results, 100)[-3:])
    if "?" in late_text or "？" in late_text:
        return "question CTA"
    if re.search(r"登録|follow|comment|subscribe|続き|本編", late_text, re.IGNORECASE):
        return "engagement CTA"
    if re.search(r"つまり|要するに|結局|まとめ", late_text):
        return "summary CTA"
    return "assertive takeaway"


def build_recommendations(hook_style, hierarchy, density, info_card_position, cta_type):
    recommendations = []
    if hook_style == "headline-led":
        recommendations.append("Open with a large declarative headline in the first 1 to 2 seconds.")
    elif hook_style == "fast subtitle hook":
        recommendations.append("Use a compact first subtitle beat immediately, then expand with the next card.")

    if hierarchy == "kicker + main headline":
        recommendations.append("Separate the opener into a short kicker and a larger main headline.")
    elif hierarchy == "headline + subline stack":
        recommendations.append("Use three layers at the opener: kicker, main headline, then one short subline.")

    if info_card_position == "center card":
        recommendations.append("Place one centered information card around the middle section to reset attention.")
    elif info_card_position == "top banner":
        recommendations.append("Keep the main explanatory card near the top and leave the lower third for subtitles.")

    if density == "high":
        recommendations.append("Shorten narration lines and let cards or popups carry more of the structure.")
    elif density == "medium":
        recommendations.append("Keep subtitles to one idea per beat so the layout stays readable on mobile.")

    if cta_type == "question CTA":
        recommendations.append("Close with a binary question or tension prompt instead of a flat summary.")
    else:
        recommendations.append("End with a sharp takeaway card rather than a long spoken wrap-up.")

    return recommendations[:6]


def build_summary(meta, subtitle_cues, ocr_results):
    stats = subtitle_stats(subtitle_cues)
    density = classify_subtitle_density(stats)
    early_lines = collect_ocr_lines(ocr_results, 20)
    hierarchy = infer_headline_hierarchy(early_lines, subtitle_cues)
    hook_style = infer_hook_style(early_lines, stats, subtitle_cues)
    info_card_position = infer_information_card_position(ocr_results)
    cta_type = infer_cta_type(subtitle_cues, ocr_results)
    recommendations = build_recommendations(
        hook_style,
        hierarchy,
        density,
        info_card_position,
        cta_type,
    )

    return {
        "hookStyle": hook_style,
        "headlineHierarchy": hierarchy,
        "subtitleDensity": density,
        "informationCardPosition": info_card_position,
        "ctaType": cta_type,
        "subtitleStats": stats,
        "recommendations": recommendations,
        "analysisFocus": [
            "hook format",
            "headline/subtitle hierarchy",
            "subtitle density",
            "mid-video information card",
            "CTA style",
        ],
        "title": meta.get("title"),
        "channel": meta.get("channel"),
        "duration": meta.get("duration"),
    }


def summary_to_markdown(meta, summary, warnings):
    lines = [
        f"# {meta.get('id')}",
        "",
        f"- Title: {meta.get('title')}",
        f"- URL: {meta.get('url')}",
        f"- Hook style: {summary['hookStyle']}",
        f"- Headline hierarchy: {summary['headlineHierarchy']}",
        f"- Subtitle density: {summary['subtitleDensity']}",
        f"- Information card position: {summary['informationCardPosition']}",
        f"- CTA type: {summary['ctaType']}",
        "",
        "## Recommendations",
        "",
    ]

    for item in summary["recommendations"]:
        lines.append(f"- {item}")

    if warnings:
        lines.extend(["", "## Warnings", ""])
        for item in warnings:
            lines.append(f"- {item}")

    return "\n".join(lines).strip() + "\n"


def main():
    payload = json.loads(sys.argv[1])
    url = payload["url"]
    sample_count = int(payload.get("sampleCount", 6))
    output_root = Path(payload["outputDir"]).resolve()
    ffmpeg_path = payload.get("ffmpegPath")
    warnings = []

    reference = download_reference(url, output_root, ffmpeg_path, warnings)
    selected_subtitle = pick_subtitle_file(reference["subtitleFiles"])
    subtitle_cues = parse_vtt(selected_subtitle) if selected_subtitle else []
    if selected_subtitle is None:
        warnings.append("No subtitle file was downloaded, so subtitle analysis is limited.")

    frame_bundle = extract_frames(reference["videoPath"], reference["framesDir"], sample_count)
    contact_sheet_path = build_contact_sheet(
        frame_bundle["frames"],
        reference["videoDir"] / "contact-sheet.jpg",
    )
    ocr_results = run_ocr(frame_bundle["frames"], warnings)
    transcript = maybe_transcribe(reference["videoPath"], warnings)

    summary = build_summary(reference["meta"], subtitle_cues, ocr_results)
    summary_json_path = reference["videoDir"] / "summary.json"
    summary_md_path = reference["videoDir"] / "summary.md"
    ocr_json_path = reference["videoDir"] / "ocr.json"
    transcript_json_path = reference["videoDir"] / "transcript.json"

    write_json(ocr_json_path, {"generatedAt": utc_now(), "frames": ocr_results, "warnings": warnings})
    if transcript is not None:
        write_json(transcript_json_path, transcript)
    write_json(summary_json_path, summary)
    write_markdown(summary_md_path, summary_to_markdown(reference["meta"], summary, warnings))

    result = {
        "ok": True,
        "generatedAt": utc_now(),
        "videoId": reference["videoId"],
        "title": reference["meta"].get("title"),
        "url": reference["meta"].get("url"),
        "outputDir": str(reference["videoDir"]),
        "metaPath": str(reference["videoDir"] / "meta.json"),
        "videoPath": str(reference["videoPath"]),
        "subtitlePath": str(selected_subtitle) if selected_subtitle else None,
        "contactSheetPath": contact_sheet_path,
        "ocrPath": str(ocr_json_path),
        "transcriptPath": str(transcript_json_path) if transcript is not None else None,
        "summaryPath": str(summary_json_path),
        "summaryMarkdownPath": str(summary_md_path),
        "warnings": warnings,
        "frameBundle": frame_bundle,
        "summary": summary,
    }
    sys.stdout.write(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
