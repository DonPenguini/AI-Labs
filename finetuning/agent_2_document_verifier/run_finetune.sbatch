#!/bin/bash
# SLURM batch script for training Agent 2 (Document Verifier)

#SBATCH --job-name=agent2_finetune
#SBATCH --output=logs/agent2_%j.out
#SBATCH --error=logs/agent2_%j.err
#SBATCH --time=04:00:00
#SBATCH --partition=gpu
#SBATCH --gres=gpu:v100:2
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=8
#SBATCH --mem=64G

# Load modules (adjust for your cluster)
module load python/3.9
module load cuda/11.8

# Activate virtual environment
source ~/venv/ailabs/bin/activate

# Set up environment
export WANDB_PROJECT="ai-labs-agent2"
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Training parameters
export FINETUNE_DATA="model2_samples.jsonl"
export FINETUNE_MODEL="unsloth/Qwen3-8B"
export FINETUNE_OUTPUT="outputs_agent2_lora"
export FINETUNE_EPOCHS=2
export FINETUNE_BATCH_SIZE=2
export FINETUNE_GRAD_ACCUM=8
export FINETUNE_LR=2e-5
export FINETUNE_MAX_SEQ_LENGTH=8192

# Create logs directory
mkdir -p logs

# Run training
cd finetuning/agent_2_document_verifier
python train.py

echo "Training completed at $(date)"
