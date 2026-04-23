import csv
import ctypes
import json
import os
import subprocess
import sys
import time
from pathlib import Path


class AQTK_VOICE(ctypes.Structure):
    _fields_ = [
        ("bas", ctypes.c_int),
        ("spd", ctypes.c_int),
        ("vol", ctypes.c_int),
        ("pit", ctypes.c_int),
        ("acc", ctypes.c_int),
        ("lmd", ctypes.c_int),
        ("fsc", ctypes.c_int),
    ]


PROJECT_ROOT = Path(os.getcwd())
AQUESTALK_PLAYER_DIR = PROJECT_ROOT / "tools" / "aquestalkplayer" / "aquestalkplayer"
AQUESTALK_PLAYER_EXE = AQUESTALK_PLAYER_DIR / "AquesTalkPlayer.exe"
AQUESTALK_PLAYER_PRESET = AQUESTALK_PLAYER_DIR / "AquesTalkPlayer.preset"

OFFICIAL_PRESET_TEMPLATES = {
    # Official AquesTalkPlayer presets show Reimu/Marisa as AquesTalk1 f1/f2 in monotone mode.
    "reimu": {
        "preset_name": "codex_reimu",
        "monotone": "true",
        "engine": "AquesTalk1",
        "voice": "f1",
        "memo": "Codex/Reimu",
    },
    "marisa": {
        "preset_name": "codex_marisa",
        "monotone": "true",
        "engine": "AquesTalk1",
        "voice": "f2",
        "memo": "Codex/Marisa",
    },
}

GENERIC_PRESET_TEMPLATES = {
    0: {
        "preset_name": "codex_aqt10_f1",
        "monotone": "false",
        "engine": "AquesTalk10",
        "voice": "F1E",
        "memo": "Codex/AquesTalk10 F1",
    },
    1: {
        "preset_name": "codex_aqt10_f2",
        "monotone": "false",
        "engine": "AquesTalk10",
        "voice": "F2E",
        "memo": "Codex/AquesTalk10 F2",
    },
    2: {
        "preset_name": "codex_aqt10_m1",
        "monotone": "false",
        "engine": "AquesTalk10",
        "voice": "M1E",
        "memo": "Codex/AquesTalk10 M1",
    },
}


def _clamp_int(value, minimum, maximum, default):
    try:
        number = int(round(float(value)))
    except (TypeError, ValueError):
        number = default
    return max(minimum, min(maximum, number))


def _resolve_preset_template(params):
    speaker_key = str(params.get("speakerKey", "")).strip().lower()
    if speaker_key in OFFICIAL_PRESET_TEMPLATES:
        return OFFICIAL_PRESET_TEMPLATES[speaker_key]

    bas = _clamp_int(params.get("bas", 0), 0, 2, 0)
    return GENERIC_PRESET_TEMPLATES.get(bas, GENERIC_PRESET_TEMPLATES[0])


def _build_player_preset_row(template, params):
    return [
        template["preset_name"],
        template["monotone"],
        template["engine"],
        template["voice"],
        str(_clamp_int(params.get("spd", 100), 50, 300, 100)),
        str(_clamp_int(params.get("vol", 100), 0, 300, 100)),
        str(_clamp_int(params.get("pit", 100), 20, 200, 100)),
        str(_clamp_int(params.get("acc", 100), 0, 200, 100)),
        str(_clamp_int(params.get("lmd", 100), 0, 200, 100)),
        str(_clamp_int(params.get("fsc", 100), 50, 200, 100)),
        template["memo"],
    ]


def _format_player_csv_row(row, quote_strings):
    formatted = []
    for index, value in enumerate(row):
        cell = str(value)
        if quote_strings and index in {0, 1, 2, 3, 10}:
            escaped = cell.replace('"', '""')
            formatted.append(f'"{escaped}"')
        else:
            formatted.append(cell)
    return ",".join(formatted)


def _ensure_player_preset(params):
    if not AQUESTALK_PLAYER_PRESET.exists():
        raise FileNotFoundError(f"AquesTalkPlayer preset file not found: {AQUESTALK_PLAYER_PRESET}")

    template = _resolve_preset_template(params)
    target_row = _build_player_preset_row(template, params)

    last_error = None
    for _ in range(6):
        try:
            with AQUESTALK_PLAYER_PRESET.open("r", encoding="cp932", newline="") as preset_file:
                rows = list(csv.reader(preset_file))

            if not rows:
                raise RuntimeError("AquesTalkPlayer preset file is empty.")

            header = rows[0]
            body = rows[1:]
            updated = False

            for index, row in enumerate(body):
                if row and row[0] == template["preset_name"]:
                    body[index] = target_row
                    updated = True
                    break

            if not updated:
                body.append(target_row)

            with AQUESTALK_PLAYER_PRESET.open("w", encoding="cp932", newline="") as preset_file:
                preset_file.write(_format_player_csv_row(header, quote_strings=False) + "\n")
                for row in body:
                    preset_file.write(_format_player_csv_row(row, quote_strings=True) + "\n")

            return template["preset_name"]
        except PermissionError as exc:
            last_error = exc
            time.sleep(0.15)

    raise last_error if last_error else RuntimeError("Failed to update AquesTalkPlayer preset file.")


def _generate_with_aquestalkplayer(output_path, text, params):
    if not AQUESTALK_PLAYER_EXE.exists():
        return False

    preset_name = _ensure_player_preset(params)
    output_file = Path(output_path).resolve()
    output_file.parent.mkdir(parents=True, exist_ok=True)
    if output_file.exists():
        output_file.unlink()

    completed = subprocess.run(
        [
            str(AQUESTALK_PLAYER_EXE),
            "/P",
            preset_name,
            "/T",
            text,
            "/W",
            str(output_file),
        ],
        cwd=str(AQUESTALK_PLAYER_DIR),
        capture_output=True,
        text=True,
        encoding="cp932",
        errors="ignore",
        check=False,
    )

    if completed.returncode != 0:
        stderr = completed.stderr.strip() or completed.stdout.strip()
        print(
            f"Error: AquesTalkPlayer failed (code: {completed.returncode}) {stderr}",
            file=sys.stderr,
        )
        return False

    if not output_file.exists():
        print("Error: AquesTalkPlayer completed without writing the wav file.", file=sys.stderr)
        return False

    print(f"Success: Generated {output_file} via AquesTalkPlayer preset {preset_name}")
    return True


def _text_to_aquestalk(text):
    import pykakasi

    kakasi = pykakasi.kakasi()
    result = kakasi.convert(text)
    katakana = "".join(item["kana"] for item in result)
    allowed = (
        "ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトド"
        "ナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲ"
        "ンヴヵヶー"
    )
    return "".join(char for char in katakana if char in allowed)


def _generate_with_aquestalk_dll(output_path, text, params):
    try:
        dll_path = PROJECT_ROOT / "src" / "AquesTalk.dll"
        if not dll_path.exists():
            print(f"Error: DLL not found at {dll_path}", file=sys.stderr)
            return False

        library = ctypes.windll.LoadLibrary(str(dll_path))
        library.AquesTalk_Synthe_Utf8.restype = ctypes.POINTER(ctypes.c_ubyte)
        library.AquesTalk_Synthe_Utf8.argtypes = [
            ctypes.POINTER(AQTK_VOICE),
            ctypes.c_char_p,
            ctypes.POINTER(ctypes.c_int),
        ]
        library.AquesTalk_FreeWave.argtypes = [ctypes.POINTER(ctypes.c_ubyte)]

        voice_params = AQTK_VOICE()
        voice_params.bas = _clamp_int(params.get("bas", 0), 0, 2, 0)
        voice_params.spd = _clamp_int(params.get("spd", 100), 50, 300, 100)
        voice_params.vol = _clamp_int(params.get("vol", 100), 0, 300, 100)
        voice_params.pit = _clamp_int(params.get("pit", 100), 20, 200, 100)
        voice_params.acc = _clamp_int(params.get("acc", 100), 0, 200, 100)
        voice_params.lmd = _clamp_int(params.get("lmd", 100), 0, 200, 100)
        voice_params.fsc = _clamp_int(params.get("fsc", 100), 50, 200, 100)

        phonetic_text = text
        if any(ord(char) > 127 for char in text):
            phonetic_text = _text_to_aquestalk(text)

        size = ctypes.c_int(0)
        wav_ptr = library.AquesTalk_Synthe_Utf8(
            ctypes.byref(voice_params),
            phonetic_text.encode("utf-8"),
            ctypes.byref(size),
        )

        if not wav_ptr:
            print(f"Error: DLL synthesis failed (code: {size.value})", file=sys.stderr)
            return False

        wav_data = ctypes.string_at(wav_ptr, size.value)
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_bytes(wav_data)
        library.AquesTalk_FreeWave(wav_ptr)

        print(f"Success: Generated {output_file} via direct AquesTalk DLL fallback")
        return True
    except Exception as exc:
        print(f"Exception: {exc}", file=sys.stderr)
        return False


def generate_voice(output_path, text, params_json):
    params = json.loads(params_json)

    if _generate_with_aquestalkplayer(output_path, text, params):
        return True

    print(
        "Warning: AquesTalkPlayer route unavailable, falling back to direct DLL synthesis.",
        file=sys.stderr,
    )
    return _generate_with_aquestalk_dll(output_path, text, params)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python aquestalk_bridge.py <output_path> <text> <json_params>")
        sys.exit(1)

    success = generate_voice(sys.argv[1], sys.argv[2], sys.argv[3])
    if not success:
        sys.exit(1)
