#!/usr/bin/env python3
"""
Fine-tune Agent 2: Document Verifier with Graph RAG integration.
This agent verifies SSD format outputs from Agent 1 against domain knowledge graphs.
- Validates equation correctness, domain consistency, and parameter feasibility
- Uses Graph RAG to retrieve domain-specific validation rules
- Trains on verification samples with corrective feedback
"""

import json
import os
from pathlib import Path
from typing import Dict, List

import torch
from unsloth import FastLanguageModel
from datasets import Dataset
from trl import SFTConfig, SFTTrainer
import wandb
import weave

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DATA_PATH = os.environ.get("FINETUNE_DATA", "model2_samples.jsonl")
MODEL_NAME = os.environ.get("FINETUNE_MODEL", "unsloth/Qwen3-8B")
OUTPUT_DIR = os.environ.get("FINETUNE_OUTPUT", "outputs_agent2_lora")
MAX_SEQ_LENGTH = int(os.environ.get("FINETUNE_MAX_SEQ_LENGTH", "8192"))
NUM_EPOCHS = float(os.environ.get("FINETUNE_EPOCHS", "2"))
PER_DEVICE_BATCH_SIZE = int(os.environ.get("FINETUNE_BATCH_SIZE", "2"))
GRADIENT_ACCUMULATION_STEPS = int(os.environ.get("FINETUNE_GRAD_ACCUM", "8"))
LEARNING_RATE = float(os.environ.get("FINETUNE_LR", "2e-5"))
LORA_R = int(os.environ.get("FINETUNE_LORA_R", "32"))
LORA_ALPHA = int(os.environ.get("FINETUNE_LORA_ALPHA", "32"))
SAVE_STEPS = int(os.environ.get("FINETUNE_SAVE_STEPS", "100"))
LOGGING_STEPS = int(os.environ.get("FINETUNE_LOGGING_STEPS", "10"))


def load_and_format_dataset(data_path: str):
    """
    Load verification samples with graph RAG context.
    Format: {instruction, ssd_input, graph_context, verification_output}
    """
    path = Path(data_path)
    if not path.is_absolute():
        path = Path(__file__).resolve().parent.parent.parent / "training_dataset/agent_2_document_verifier" / data_path

    if not path.exists():
        raise FileNotFoundError(f"Data file not found: {path}")

    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                # Format for verification task with graph RAG context
                prompt = f"""### Instruction:
{record['instruction']}

### SSD Document to Verify:
{json.dumps(record['ssd_input'], indent=2)}

### Domain Knowledge Graph Context:
{record['graph_context']}

### Verification Output:
"""
                completion = json.dumps(record['verification_output'], indent=2)
                
                rows.append({
                    "prompt": prompt,
                    "completion": completion,
                    "text": prompt + completion
                })
            except Exception as e:
                print(f"Error parsing line {line_num}: {e}")
                continue

    if not rows:
        raise ValueError(f"No valid training samples found in {path}")

    print(f"Loaded {len(rows)} verification samples from {path}")
    return Dataset.from_list(rows)


def formatting_prompts_func(examples):
    """Format dataset for training with completion-only loss."""
    return {"text": examples["text"]}


def main():
    # Initialize tracking
    weave.init(f"ai-labs-agent2-finetuning")
    wandb.init(project="ai-labs-agent2", name=f"agent2-{MODEL_NAME.split('/')[-1]}")

    # Load dataset
    print(f"Loading dataset from {DATA_PATH}")
    dataset = load_and_format_dataset(DATA_PATH)
    
    # Split dataset
    split = dataset.train_test_split(test_size=0.1, seed=42)
    train_dataset = split["train"]
    eval_dataset = split["test"]

    print(f"Training samples: {len(train_dataset)}")
    print(f"Evaluation samples: {len(eval_dataset)}")

    # Load model with LoRA
    print(f"Loading model: {MODEL_NAME}")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_NAME,
        max_seq_length=MAX_SEQ_LENGTH,
        dtype=None,
        load_in_4bit=True,
    )

    # Configure LoRA
    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=0.1,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                       "gate_proj", "up_proj", "down_proj"],
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
    )

    print(f"Model loaded with LoRA (r={LORA_R}, alpha={LORA_ALPHA})")

    # Training configuration
    training_args = SFTConfig(
        output_dir=OUTPUT_DIR,
        num_train_epochs=NUM_EPOCHS,
        per_device_train_batch_size=PER_DEVICE_BATCH_SIZE,
        per_device_eval_batch_size=PER_DEVICE_BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        warmup_steps=50,
        learning_rate=LEARNING_RATE,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=LOGGING_STEPS,
        save_steps=SAVE_STEPS,
        eval_steps=SAVE_STEPS,
        save_total_limit=3,
        max_seq_length=MAX_SEQ_LENGTH,
        dataset_text_field="text",
        packing=False,
        report_to=["wandb", "weave"],
    )

    # Initialize trainer
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        args=training_args,
        formatting_func=formatting_prompts_func,
    )

    # Train
    print("Starting training...")
    trainer.train()

    # Save final model
    final_path = os.path.join(OUTPUT_DIR, "final_model")
    model.save_pretrained(final_path)
    tokenizer.save_pretrained(final_path)
    print(f"Final model saved to {final_path}")

    wandb.finish()


if __name__ == "__main__":
    main()
