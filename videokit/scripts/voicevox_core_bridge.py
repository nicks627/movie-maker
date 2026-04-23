import json
import os
import sys
from pathlib import Path

from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

PROJECT_ROOT = Path(__file__).resolve().parent.parent
VOICEVOX_ROOT = Path(os.environ.get("VOICEVOX_CORE_ROOT", PROJECT_ROOT / "vendor" / "voicevox_core"))
if not VOICEVOX_ROOT.is_absolute():
    VOICEVOX_ROOT = (PROJECT_ROOT / VOICEVOX_ROOT).resolve()
OPEN_JTALK_DICT = VOICEVOX_ROOT / "dict" / "open_jtalk_dic_utf_8-1.11"
VOICE_MODEL_DIR = VOICEVOX_ROOT / "models" / "vvms"

STYLE_MAP = {
    "metan": 2,
    "zundamon": 3,
    "tsumugi": 8,
    "hau": 10,
    "himari": 14,
    "sora": 16,
    "whitecul": 23,
    "usagi": 61,
    "ryusei": 13,
    "sayo": 46,
    "mico": 43,
    "zunko": 107,
    "kiritan": 108,
    "itako": 109,
    "zonko_jikkyofuu": 93,
}

_MODEL_PATH_CACHE = {}


def _find_runtime_library():
    runtime_dir = VOICEVOX_ROOT / "onnxruntime" / "lib"
    candidates = [
        runtime_dir / "voicevox_onnxruntime.dll",
        runtime_dir / "libvoicevox_onnxruntime.dylib",
        runtime_dir / "libvoicevox_onnxruntime.so",
        runtime_dir / "voicevox_onnxruntime.so",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    dynamic_matches = sorted(runtime_dir.glob("*voicevox_onnxruntime*"))
    if dynamic_matches:
        return dynamic_matches[0]

    return candidates[0]


ONNXRUNTIME_LIBRARY = _find_runtime_library()


def _resolve_style_id(params):
    style_id = params.get("styleId")
    if style_id is not None:
        return int(style_id)

    speaker = params.get("speaker", "zundamon")
    return STYLE_MAP.get(speaker, 3)


def _find_model_path(style_id):
    cached = _MODEL_PATH_CACHE.get(style_id)
    if cached is not None:
        return cached

    for model_path in sorted(VOICE_MODEL_DIR.glob("*.vvm")):
        with VoiceModelFile.open(str(model_path)) as model:
            for speaker_meta in model.metas:
                for style in speaker_meta.styles:
                    if int(style.id) == style_id:
                        _MODEL_PATH_CACHE[style_id] = model_path
                        return model_path

    raise RuntimeError(f"Style ID {style_id} に対応するVOICEVOXモデルが見つかりません。")


def synthesize_voice(output_path, text, params_json):
    params = json.loads(params_json)
    style_id = _resolve_style_id(params)

    if not text:
        raise RuntimeError("テキストが空です。")
    if not ONNXRUNTIME_LIBRARY.exists():
        raise RuntimeError(f"VOICEVOX ONNX Runtime が見つかりません: {ONNXRUNTIME_LIBRARY}")
    if not OPEN_JTALK_DICT.exists():
        raise RuntimeError(f"Open JTalk 辞書が見つかりません: {OPEN_JTALK_DICT}")

    model_path = _find_model_path(style_id)
    runtime = Onnxruntime.load_once(filename=str(ONNXRUNTIME_LIBRARY.resolve()))

    with Synthesizer(runtime, OpenJtalk(str(OPEN_JTALK_DICT.resolve()))) as synthesizer:
        with VoiceModelFile.open(str(model_path.resolve())) as voice_model:
            synthesizer.load_voice_model(voice_model)

            query = synthesizer.create_audio_query(text, style_id)
            query.speed_scale = float(params.get("speedScale", 1.0))
            query.pitch_scale = float(params.get("pitchScale", 0.0))
            query.intonation_scale = float(params.get("intonationScale", 1.0))
            query.volume_scale = float(params.get("volumeScale", 1.0))

            wav_bytes = synthesizer.synthesis(query, style_id)

    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(wav_bytes)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python voicevox_core_bridge.py <output_path> <text> <json_params>", file=sys.stderr)
        sys.exit(1)

    try:
        synthesize_voice(sys.argv[1], sys.argv[2], sys.argv[3])
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
