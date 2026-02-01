#!/bin/bash
#SBATCH -A default
#SBATCH --qos=normal
#SBATCH --job-name=qlora
#SBATCH --output=logs/qlora_%j.out
#SBATCH --error=logs/qlora_%j.err
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=10
#SBATCH --gres=gpu:1
#SBATCH --mem-per-cpu=4G
#SBATCH --time=24:00:00
#SBATCH --nodelist=node04

# Optional: set before sbatch or edit below
# export FINETUNE_DATA=model1_samples.jsonl
# export FINETUNE_OUTPUT=outputs_qlora
# export WANDB_PROJECT=my-project

set -e
module add cuda/12.2

# Project files are here (run from home or anywhere)
SCRIPT_DIR=/scratch/adithya.kishor/finetune
cd "$SCRIPT_DIR"

if [ -d "$SCRIPT_DIR/.venv" ]; then
  source "$SCRIPT_DIR/.venv/bin/activate"
fi

NUM_GPUS=${SLURM_GPUS_ON_NODE:-${SLURM_GPUS:-1}}
echo "Running on $NUM_GPUS GPU(s), node $SLURM_NODELIST"

torchrun --nproc_per_node="$NUM_GPUS" "$SCRIPT_DIR/train_qlora.py"

echo "Done."
