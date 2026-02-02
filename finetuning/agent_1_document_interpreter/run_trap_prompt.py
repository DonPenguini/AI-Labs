#!/usr/bin/env python3
"""
Run prompts on the finetuned QLoRA model and print outputs.

- Main prompt: replicates finetuning setup (instruction + input) → expect SSD JSON.
- Trap prompts: general questions with NO instruction → expect natural language.
  If the model outputs JSON for trap prompts, it indicates format overfitting (mode collapse).
"""

import os
from pathlib import Path

from unsloth import FastLanguageModel
from peft import PeftModel


# ---------------------------------------------------------------------------
# Config (override via env to match train_qlora.py)
# ---------------------------------------------------------------------------
MODEL_NAME = os.environ.get("FINETUNE_MODEL", "unsloth/llama-3.1-8b-unsloth-bnb-4bit")
ADAPTER_PATH = os.environ.get("FINETUNE_OUTPUT", "outputs_qlora")
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


def main():
    adapter_path = Path(ADAPTER_PATH)
    if not adapter_path.is_absolute():
        adapter_path = Path(__file__).resolve().parent / adapter_path
    if not adapter_path.exists():
        raise FileNotFoundError(f"Adapter path not found: {adapter_path}")

    print("Loading base model (4-bit)...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_NAME,
        max_seq_length=MAX_SEQ_LENGTH,
        dtype=None,
        load_in_4bit=True,
        trust_remote_code=False,
    )

    print(f"Loading adapter from {adapter_path}...")
    model = PeftModel.from_pretrained(model, str(adapter_path))

    print("Preparing for inference...")
    model = FastLanguageModel.for_inference(model)

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # ----- Main prompt (expect SSD JSON) -----
    main_prompt = f"{INSTRUCTION}\n\n{INPUT}".strip()
    print("\n" + "=" * 60)
    print("MAIN PROMPT (instruction + input) — expect SSD JSON")
    print("=" * 60)
    print(main_prompt)
    print("\n--- Model output ---\n")
    response = _run_prompt(model, tokenizer, main_prompt)
    print(response)
    print()

    # ----- Trap prompts (expect natural language; JSON = overfitting) -----
    for i, trap in enumerate(TRAP_PROMPTS, 1):
        print("\n" + "=" * 60)
        print(f"TRAP PROMPT {i} (no instruction) — expect natural language, not JSON")
        print("=" * 60)
        print(trap)
        print("\n--- Model output ---\n")
        response = _run_prompt(model, tokenizer, trap)
        print(response)
        overfit = _looks_like_ssd_json(response)
        print("\n--- Format check ---")
        print("FAIL (format overfitting)" if overfit else "PASS (natural language)")
        print()


if __name__ == "__main__":
    main()
