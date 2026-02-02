#!/usr/bin/env python3
"""
Fine-tune a language model on model1_samples.jsonl using Unsloth + QLoRA.
- Trains only on the OUTPUT (completion); instruction and input are used as context but excluded from loss.
- Uses 2x V100 GPUs via Distributed Data Parallel (DDP) when launched with torchrun.
"""

import json
import os
from pathlib import Path

import torch
from unsloth import FastLanguageModel  # import before trl for Unsloth patches
from datasets import Dataset
from trl import SFTConfig, SFTTrainer
import wandb
import weave

# ---------------------------------------------------------------------------
# Config (override via env or edit here)
# ---------------------------------------------------------------------------
DATA_PATH = os.environ.get("FINETUNE_DATA", "model1_samples.jsonl")
MODEL_NAME = os.environ.get("FINETUNE_MODEL", "unsloth/llama-3.1-8b-unsloth-bnb-4bit")
OUTPUT_DIR = os.environ.get("FINETUNE_OUTPUT", "outputs_qlora")
MAX_SEQ_LENGTH = int(os.environ.get("FINETUNE_MAX_SEQ_LENGTH", "4096"))
NUM_EPOCHS = float(os.environ.get("FINETUNE_EPOCHS", "1"))
PER_DEVICE_BATCH_SIZE = int(os.environ.get("FINETUNE_BATCH_SIZE", "2"))
GRADIENT_ACCUMULATION_STEPS = int(os.environ.get("FINETUNE_GRAD_ACCUM", "8"))
LEARNING_RATE = float(os.environ.get("FINETUNE_LR", "1e-5"))
LORA_R = int(os.environ.get("FINETUNE_LORA_R", "16"))
LORA_ALPHA = int(os.environ.get("FINETUNE_LORA_ALPHA", "16"))
SAVE_STEPS = int(os.environ.get("FINETUNE_SAVE_STEPS", "200"))
LOGGING_STEPS = int(os.environ.get("FINETUNE_LOGGING_STEPS", "5"))


def load_and_format_dataset(data_path: str):
    """Load JSONL and convert to HuggingFace Dataset with prompt/completion.
    Only the completion (output) will be used for loss when completion_only_loss=True.
    """
    path = Path(data_path)
    if not path.is_absolute():
        path = Path(__file__).resolve().parent / path
    if not path.exists():
        raise FileNotFoundError(f"Data file not found: {path}")

    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            instruction = obj.get("instruction", "")
            inp = obj.get("input", "")
            output = obj.get("output")
            if output is None:
                continue
            # Prompt = instruction + input (model sees this; no loss here)
            prompt = f"{instruction}\n\n{inp}".strip()
            # Completion = output only (loss computed here)
            completion = json.dumps(output, ensure_ascii=False) if isinstance(output, dict) else str(output)
            rows.append({"prompt": prompt, "completion": completion})

    return Dataset.from_list(rows)


def tokenize_for_completion_only(dataset, tokenizer, max_length: int):
    """Pre-tokenize dataset to input_ids + completion_mask so Unsloth skips formatting_func.
    Loss will be applied only where completion_mask=1 (output tokens).
    EOS is appended to each completion so the model learns to output it and stop generation.
    """
    def _tokenize(example):
        prompt = example["prompt"]
        completion = example["completion"]
        prompt_ids = tokenizer(prompt, truncation=True, max_length=max_length, add_special_tokens=True)["input_ids"]
        # Append EOS so the model learns to emit it at end of generation
        full_text = prompt + completion + tokenizer.eos_token
        full_encoded = tokenizer(full_text, truncation=True, max_length=max_length, add_special_tokens=True)
        full_ids = full_encoded["input_ids"]
        prompt_len = len(prompt_ids)
        if prompt_len > len(full_ids):
            prompt_len = len(full_ids)
        elif full_ids[:prompt_len] != prompt_ids:
            # Boundary mismatch: use prefix length that matches (tokenizer quirk)
            for i in range(min(prompt_len, len(full_ids)), 0, -1):
                if full_ids[:i] == prompt_ids[:i]:
                    prompt_len = i
                    break
        completion_mask = [0] * prompt_len + [1] * (len(full_ids) - prompt_len)
        return {
            "input_ids": full_ids,
            "attention_mask": [1] * len(full_ids),
            "completion_mask": completion_mask,
        }
    return dataset.map(_tokenize, remove_columns=dataset.column_names, num_proc=1, desc="Tokenizing")


def main():
    data_path = os.environ.get("FINETUNE_DATA", DATA_PATH)
    model_name = os.environ.get("FINETUNE_MODEL", MODEL_NAME)
    output_dir = os.environ.get("FINETUNE_OUTPUT", OUTPUT_DIR)

    print(f"Loading dataset from {data_path} ...")
    dataset = load_and_format_dataset(data_path)
    print(f"Dataset size: {len(dataset)}")

    print(f"Loading model {model_name} (QLoRA 4-bit) ...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=MAX_SEQ_LENGTH,
        dtype=None,  # auto
        load_in_4bit=True,  # QLoRA
        trust_remote_code=False,
    )

    # LoRA adapter (QLoRA)
    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_R,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha=LORA_ALPHA,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
        max_seq_length=MAX_SEQ_LENGTH,
        use_rslora=True,
    )

    # Ensure pad token exists for batching
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Pre-tokenize so Unsloth sees input_ids + completion_mask (avoids "must specify formatting_func")
    print("Pre-tokenizing dataset (output-only labels)...")
    dataset = tokenize_for_completion_only(dataset, tokenizer, MAX_SEQ_LENGTH)

    # Training args: DDP is auto-enabled when torchrun uses >1 GPU
    num_gpus = torch.cuda.device_count()
    effective_batch = PER_DEVICE_BATCH_SIZE * max(1, num_gpus) * GRADIENT_ACCUMULATION_STEPS
    print(f"GPUs: {num_gpus}, effective batch size: {effective_batch}")

    # WandB: set WANDB_PROJECT, WANDB_RUN_NAME, WANDB_ENTITY in env; run `wandb login` or set WANDB_API_KEY
    report_to = "none" if os.environ.get("WANDB_DISABLED", "").lower() in ("1", "true", "yes") else "wandb"
    run_name = os.environ.get("WANDB_RUN_NAME") or f"qlora-{Path(output_dir).name}"

    training_args = SFTConfig(
        output_dir=output_dir,
        num_train_epochs=NUM_EPOCHS,
        per_device_train_batch_size=PER_DEVICE_BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        learning_rate=LEARNING_RATE,
        logging_steps=LOGGING_STEPS,
        save_steps=SAVE_STEPS,
        save_total_limit=2,
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
        warmup_ratio=0.05,
        max_grad_norm=1.0,
        ddp_find_unused_parameters=False,
        # Train only on completion (output); prompt (instruction+input) is masked in loss
        completion_only_loss=True,
        max_seq_length=MAX_SEQ_LENGTH,
        # Log loss, lr, grad_norm, etc. to Weights & Biases
        report_to=report_to,
        run_name=run_name,
    )

    # SFTTrainer with prompt+completion dataset → loss only on completion (output)
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=training_args,
    )

    trainer.train()
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"Saved model and tokenizer to {output_dir}")


if __name__ == "__main__":
    main()
