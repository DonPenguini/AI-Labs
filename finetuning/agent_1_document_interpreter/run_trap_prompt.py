#!/usr/bin/env python3
"""
Run a prompt on the finetuned QLoRA model and print the output.
Replicates the finetuning setup: prompt = instruction + newline + input (same as train_qlora).
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

# Same instruction as in model1_samples.jsonl (finetuning setup)
INSTRUCTION = (
    "Convert the following natural language simulation description into a structured SSD format "
    "with all necessary components including simulation name, domain, equations, parameters, and constraints."
)

# User input (simulation scenario) — same format as "input" in training data
INPUT = (
    "A population of bacteria grows in a petri dish with limited food. "
    "The growth rate is proportional to the current population, but slows down as the population "
    "approaches the carrying capacity of the environment. Provide the simulation parameters and "
    "logistic growth equations for this system."
)


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

    # Replicate finetuning setup: prompt = instruction + "\n\n" + input (same as train_qlora)
    prompt = f"{INSTRUCTION}\n\n{INPUT}".strip()

    print("\n--- Prompt (instruction + input) ---")
    print(prompt)
    print("\n--- Model output ---\n")

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    output_ids = model.generate(
        **inputs,
        max_new_tokens=4096,
        do_sample=True,
        temperature=0.7,
        top_p=0.9,
        pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
    )

    # Decode only the new tokens (after the prompt)
    prompt_length = inputs["input_ids"].shape[1]
    response_ids = output_ids[0][prompt_length:]
    response = tokenizer.decode(response_ids, skip_special_tokens=True)

    print(response.strip())
    print()


if __name__ == "__main__":
    main()
