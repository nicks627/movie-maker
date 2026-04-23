import contextlib
import io
import json
import os
import sys
from typing import Any, Dict, List


INSTALL_COMMAND = (
    "python -m pip install \"scenedetect[opencv]\" faster-whisper easyocr opencv-python yt-dlp"
)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def respond(payload: Dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False))


def normalize_json_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass

    if isinstance(value, dict):
        return {str(key): normalize_json_value(entry) for key, entry in value.items()}

    if isinstance(value, (list, tuple)):
        return [normalize_json_value(entry) for entry in value]

    return str(value)


def load_payload() -> Dict[str, Any]:
    if len(sys.argv) < 3:
        return {}

    raw = sys.argv[2]
    if not raw:
        return {}

    return json.loads(raw)


def check_dependencies() -> Dict[str, Any]:
    checks: List[Dict[str, Any]] = []

    modules = [
        ("scenedetect", "PySceneDetect"),
        ("faster_whisper", "faster-whisper"),
        ("easyocr", "easyocr"),
        ("cv2", "opencv-python"),
    ]

    missing: List[str] = []
    for module_name, package_name in modules:
        try:
            __import__(module_name)
            checks.append(
                {
                    "module": module_name,
                    "package": package_name,
                    "ok": True,
                }
            )
        except Exception as error:  # pragma: no cover
            missing.append(package_name)
            checks.append(
                {
                    "module": module_name,
                    "package": package_name,
                    "ok": False,
                    "error": str(error),
                }
            )

    return {
        "ok": len(missing) == 0,
        "pythonExecutable": sys.executable,
        "checks": checks,
        "missingPackages": missing,
        "installCommand": INSTALL_COMMAND,
    }


def detect_scenes(payload: Dict[str, Any]) -> Dict[str, Any]:
    from scenedetect import SceneManager, open_video
    from scenedetect.detectors import ContentDetector

    input_path = payload["input"]
    threshold = float(payload.get("threshold", 27.0))
    min_scene_len = float(payload.get("minSceneLenSec", 2.0))
    duration_sec = float(payload.get("durationSec", 0))
    fps = float(payload.get("fps", 30))
    min_scene_len_frames = max(1, round(min_scene_len * fps))

    video = open_video(input_path)
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=threshold, min_scene_len=min_scene_len_frames))
    scene_manager.detect_scenes(video=video, show_progress=False)
    scene_list = scene_manager.get_scene_list()

    scenes = [
        {
            "startSec": round(start.get_seconds(), 3),
            "endSec": round(end.get_seconds(), 3),
            "durationSec": round(end.get_seconds() - start.get_seconds(), 3),
        }
        for start, end in scene_list
    ]

    if not scenes:
        scenes = [
            {
                "startSec": 0.0,
                "endSec": round(duration_sec, 3),
                "durationSec": round(duration_sec, 3),
            }
        ]

    return {
        "ok": True,
        "sceneCount": len(scenes),
        "scenes": scenes,
    }


def transcribe_audio(payload: Dict[str, Any]) -> Dict[str, Any]:
    from faster_whisper import WhisperModel

    input_path = payload["input"]
    model_name = payload.get("model", "small")
    language = payload.get("language", "ja")
    device = payload.get("device", "cpu")
    compute_type = payload.get("computeType", "int8")

    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, info = model.transcribe(
        input_path,
        language=language,
        word_timestamps=True,
        vad_filter=True,
    )

    collected_segments: List[Dict[str, Any]] = []
    full_text_parts: List[str] = []
    for segment in segments:
        text = (segment.text or "").strip()
        if text:
            full_text_parts.append(text)
        collected_segments.append(
            {
                "id": segment.id,
                "startSec": round(float(segment.start), 3),
                "endSec": round(float(segment.end), 3),
                "text": text,
                "avgLogProb": getattr(segment, "avg_logprob", None),
                "words": [
                    {
                        "startSec": round(float(word.start), 3),
                        "endSec": round(float(word.end), 3),
                        "word": (word.word or "").strip(),
                        "probability": getattr(word, "probability", None),
                    }
                    for word in (segment.words or [])
                ],
            }
        )

    return {
        "ok": True,
        "language": language,
        "durationSec": round(float(getattr(info, "duration", 0.0) or 0.0), 3),
        "segments": collected_segments,
        "text": " ".join(full_text_parts).strip(),
    }


def run_ocr(payload: Dict[str, Any]) -> Dict[str, Any]:
    import easyocr

    frames = payload.get("frames", [])
    language_list = payload.get("languages", ["ja", "en"])
    # EasyOCR emits progress output during model setup / OCR runs. Suppress it so
    # the Node caller receives clean JSON on stdout.
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        reader = easyocr.Reader(language_list, gpu=False)

    results: List[Dict[str, Any]] = []
    for frame in frames:
        frame_path = frame["path"]
        if not os.path.exists(frame_path):
            results.append(
                {
                    "id": frame.get("id"),
                    "path": frame_path,
                    "ok": False,
                    "error": "frame-not-found",
                    "items": [],
                }
            )
            continue

        try:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                detected = reader.readtext(frame_path, detail=1, paragraph=False)
            items = [
                {
                    "text": str(item[1]).strip(),
                    "confidence": float(item[2]),
                    "bbox": normalize_json_value(item[0]),
                }
                for item in detected
                if str(item[1]).strip()
            ]
            results.append(
                {
                    "id": frame.get("id"),
                    "timeSec": frame.get("timeSec"),
                    "path": frame_path,
                    "ok": True,
                    "items": items,
                }
            )
        except Exception as error:  # pragma: no cover
            results.append(
                {
                    "id": frame.get("id"),
                    "timeSec": frame.get("timeSec"),
                    "path": frame_path,
                    "ok": False,
                    "error": str(error),
                    "items": [],
                }
            )

    return {
        "ok": True,
        "results": results,
    }


def main() -> None:
    action = sys.argv[1] if len(sys.argv) > 1 else "check"
    payload = load_payload()

    try:
        if action == "check":
            respond(check_dependencies())
            return

        dependency_result = check_dependencies()
        if not dependency_result["ok"]:
            respond(
                {
                    "ok": False,
                    "action": action,
                    "error": "missing-python-dependencies",
                    "installCommand": dependency_result["installCommand"],
                    "missingPackages": dependency_result["missingPackages"],
                    "checks": dependency_result["checks"],
                }
            )
            return

        if action == "detect-scenes":
            respond(detect_scenes(payload))
            return

        if action == "transcribe":
            respond(transcribe_audio(payload))
            return

        if action == "ocr":
            respond(run_ocr(payload))
            return

        respond(
            {
                "ok": False,
                "error": f"unsupported-action:{action}",
            }
        )
    except Exception as error:  # pragma: no cover
        respond(
            {
                "ok": False,
                "action": action,
                "error": str(error),
            }
        )


if __name__ == "__main__":
    main()
