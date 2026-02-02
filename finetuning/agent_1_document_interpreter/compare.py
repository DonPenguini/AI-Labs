#!/usr/bin/env python3
"""
Run prompts on base and finetuned LoRA model and print outputs side by side.

- Main prompt: replicates finetuning setup (instruction + input) → expect SSD JSON.
- Trap prompts: general questions with NO instruction → expect natural language.
  If the finetuned model outputs JSON for trap prompts, it indicates format overfitting (mode collapse).
"""

import os
from pathlib import Path

import torch
from unsloth import FastLanguageModel
from peft import PeftModel


# ---------------------------------------------------------------------------
# Config (override via env to match train.py)
# ---------------------------------------------------------------------------
MODEL_NAME = os.environ.get("FINETUNE_MODEL", "unsloth/Qwen3-4B")
ADAPTER_PATH = os.environ.get("FINETUNE_OUTPUT", "outputs_lora")
MAX_SEQ_LENGTH = int(os.environ.get("FINETUNE_MAX_SEQ_LENGTH", "4096"))
MAX_NEW_TOKENS = int(os.environ.get("RUN_PROMPT_MAX_TOKENS", "1024"))

# Same instruction as in model1_samples.jsonl (finetuning setup)
INSTRUCTION = (
    "Convert the following natural language simulation description into a structured SSD format "
    "with all necessary components including simulation name, domain, equations, parameters, and constraints."
)

# Main prompt: user input (simulation scenario) — same format as "input" in training data
INPUT = (
    "A population of bacteria grows in a petri dish with limited food. "
    "The growth rate is proportional to the current population, but slows down as the population "
    "approaches the carrying capacity of the environment. Provide the simulation parameters and "
    "logistic growth equations for this system."
)

# Trap prompts: general questions with NO instruction. Model should respond in natural language, not JSON.
# If it outputs SSD-style JSON here → format overfitting (Fail).
TRAP_PROMPTS = [
    # Simple greeting — most basic test; should get a friendly reply, not entities/equations
    "Hey! How are you doing today? Can you tell me a joke?",
    # General knowledge (no SSD instruction)
    "Can I know more about how pendulums work?",
    "Define how photosynthesis works in plants",
    # Negative constraint — explicitly ask for non-JSON (poem)
    "Explain how a pendulum works, but write it as a poem. Do NOT use JSON or any structured data formats.",
    # Creative writing — STEM-adjacent but clearly not a simulation
    "Write a short sci-fi story about a scientist who discovers a new planet where gravity works backward.",
]


def _looks_like_ssd_json(text: str) -> bool:
    """Heuristic: response looks like SSD-format JSON (format overfitting)."""
    stripped = text.strip()
    if not stripped.startswith("{"):
        return False
    return "simulation_name" in stripped or '"domain"' in stripped


def _run_prompt(model, tokenizer, prompt_text: str, max_new_tokens: int = MAX_NEW_TOKENS) -> str:
    """Run one prompt and return the decoded response (new tokens only)."""
    inputs = tokenizer(prompt_text, return_tensors="pt").to(model.device)
    output_ids = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        temperature=0.7,
        top_p=0.9,
        pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
    )
    prompt_length = inputs["input_ids"].shape[1]
    response_ids = output_ids[0][prompt_length:]
    return tokenizer.decode(response_ids, skip_special_tokens=True).strip()


def _side_by_side(left: str, right: str, col_width: int = 55, label_left: str = "BASE", label_right: str = "FINETUNED") -> str:
    """Format two strings in fixed-width columns side by side."""
    def wrap(s: str, w: int) -> list[str]:
        lines = []
        for line in s.splitlines():
            while line:
                lines.append(line[:w] if len(line) <= w else line[:w])
                line = line[w:] if len(line) > w else ""
        return lines if lines else [""]

    left_lines = wrap(left, col_width)
    right_lines = wrap(right, col_width)
    n = max(len(left_lines), len(right_lines))
    left_lines += [""] * (n - len(left_lines))
    right_lines += [""] * (n - len(right_lines))

    sep = " | "
    total_width = col_width + len(sep) + col_width
    header = f" {label_left:<{col_width}} {sep} {label_right:<{col_width}}"
    hrule = " " + "-" * (total_width - 1)
    rows = [f" {left_lines[i]:<{col_width}} {sep} {right_lines[i]:<{col_width}}" for i in range(n)]
    return "\n".join([header, hrule] + rows)


def main():
    adapter_path = Path(ADAPTER_PATH)
    if not adapter_path.is_absolute():
        adapter_path = Path(__file__).resolve().parent / adapter_path
    if not adapter_path.exists():
        raise FileNotFoundError(f"Adapter path not found: {adapter_path}")

    print("Loading base model (LoRA, 16-bit)...")
    # Match the training setup: use bfloat16 when available, otherwise float16
    preferred_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_NAME,
        max_seq_length=MAX_SEQ_LENGTH,
        dtype=preferred_dtype,
        load_in_4bit=False,  # standard LoRA (no QLoRA quantization)
        trust_remote_code=False,
    )
    print("Preparing base model for inference...")
    model = FastLanguageModel.for_inference(model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    main_prompt = f"{INSTRUCTION}\n\n{INPUT}".strip()
    all_prompts = [main_prompt] + TRAP_PROMPTS

    # ----- Run all prompts on BASE model -----
    print("\nRunning all prompts on BASE model...")
    base_responses = [_run_prompt(model, tokenizer, p) for p in all_prompts]

    # ----- Load adapter and run same prompts on FINETUNED model -----
    print(f"Loading adapter from {adapter_path}...")
    model = PeftModel.from_pretrained(model, str(adapter_path))
    print("Preparing finetuned model for inference...")
    model = FastLanguageModel.for_inference(model)

    print("Running all prompts on FINETUNED model...")
    ft_responses = [_run_prompt(model, tokenizer, p) for p in all_prompts]

    # ----- Main prompt: side-by-side (expect SSD JSON) -----
    print("\n" + "=" * 120)
    print("MAIN PROMPT (instruction + input) — expect SSD JSON")
    print("=" * 120)
    print(main_prompt)
    print("\n--- Base vs Finetuned ---\n")
    print(_side_by_side(base_responses[0], ft_responses[0]))
    print()

    # ----- Trap prompts: side-by-side (expect natural language; JSON = overfitting) -----
    for i, trap in enumerate(TRAP_PROMPTS, 1):
        print("\n" + "=" * 120)
        print(f"TRAP PROMPT {i} (no instruction) — expect natural language, not JSON")
        print("=" * 120)
        print(trap)
        print("\n--- Base vs Finetuned ---\n")
        print(_side_by_side(base_responses[i], ft_responses[i]))
        overfit = _looks_like_ssd_json(ft_responses[i])
        print("\n--- Format check (finetuned) ---")
        print("FAIL (format overfitting)" if overfit else "PASS (natural language)")
        print()


if __name__ == "__main__":
    main()
