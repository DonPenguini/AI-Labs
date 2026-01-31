#!/usr/bin/env python3
"""
Replace output html/css/js paths in model3_samples.jsonl with the actual file content.
For each data point, resolves output.html, output.css, output.js paths (e.g. ../sample1/index.html)
relative to the JSONL directory, reads those files, and writes a new JSONL where each
output field contains the file content instead of the path.

Usage:
  python inline_output_content.py [input.jsonl [output.jsonl]]
  python inline_output_content.py --in-place [input.jsonl]   # overwrite input file

Default: input=model3_samples.jsonl, output=model3_samples_inlined.jsonl
"""

import json
import os
import sys
from pathlib import Path


def resolve_path(base_dir: Path, path_str: str) -> Path:
    """Resolve a path string relative to base_dir. Tries stored path then without leading ../."""
    path_str = path_str.strip()
    candidate = (base_dir / path_str).resolve()
    if candidate.is_file():
        return candidate
    # Paths in JSONL are like "../sample1/index.html"; from agent_3_code_generator that goes up.
    # Samples live in agent_3_code_generator/sampleN/, so try without leading ../
    if path_str.startswith("../"):
        alt = base_dir / path_str[3:]
        if alt.is_file():
            return alt.resolve()
        # Also try path relative to base (e.g. sample1/index.html)
        alt2 = base_dir / path_str.replace("../", "")
        if alt2.is_file():
            return alt2.resolve()
    elif path_str.startswith(".."):
        alt = base_dir / path_str.lstrip("./")
        if alt.is_file():
            return alt.resolve()
    raise FileNotFoundError(f"Cannot resolve path: {path_str} from {base_dir}")


def read_file_content(file_path: Path) -> str:
    """Read file content with UTF-8 encoding."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def process_record(record: dict, base_dir: Path) -> dict:
    """Replace output paths with file contents for one record."""
    if "output" not in record or not isinstance(record["output"], dict):
        return record

    out = record["output"].copy()
    for key in ("html", "css", "js"):
        if key not in out or not isinstance(out[key], str):
            continue
        path_str = out[key]
        if not path_str.strip():
            continue
        try:
            resolved = resolve_path(base_dir, path_str)
            out[key] = read_file_content(resolved)
        except FileNotFoundError as e:
            print(f"Warning: {e}", file=sys.stderr)
            # Leave path as-is or set to empty string
            out[key] = ""
    record["output"] = out
    return record


def main():
    script_dir = Path(__file__).resolve().parent
    input_path = script_dir / "model3_samples.jsonl"
    output_path = script_dir / "model3_samples_inlined.jsonl"
    in_place = False

    args = [a for a in sys.argv[1:] if a != "--in-place"]
    if "--in-place" in sys.argv:
        in_place = True
    if len(args) >= 1:
        input_path = Path(args[0])
    if len(args) >= 2:
        output_path = Path(args[1])
    if in_place:
        output_path = input_path

    if not input_path.is_file():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    base_dir = input_path.resolve().parent
    processed = 0
    errors = 0
    lines_out = []

    with open(input_path, "r", encoding="utf-8") as fin:
        for line_num, line in enumerate(fin, 1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                record = process_record(record, base_dir)
                lines_out.append(json.dumps(record, ensure_ascii=False))
                processed += 1
            except json.JSONDecodeError as e:
                print(f"Warning: Line {line_num} JSON error: {e}", file=sys.stderr)
                errors += 1
            except Exception as e:
                print(f"Warning: Line {line_num}: {e}", file=sys.stderr)
                errors += 1

    with open(output_path, "w", encoding="utf-8") as fout:
        for ln in lines_out:
            fout.write(ln + "\n")

    print(f"Processed {processed} records -> {output_path}")
    if errors:
        print(f"Encountered {errors} errors (see stderr).", file=sys.stderr)


if __name__ == "__main__":
    main()
