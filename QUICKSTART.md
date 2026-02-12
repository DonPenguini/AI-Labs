# Quick Start: Graph RAG Integration

Get up and running with Graph RAG document verification in 5 minutes.

## Prerequisites

```bash
pip install torch unsloth transformers trl datasets sentence-transformers networkx wandb weave
```

## Quick Test: Verify Graph RAG Works

### Test Agent 2 (Document Fidelity Verification)

```python
# Save as test_agent2.py
from finetuning.agent_2_document_verifier.graph_rag import DocumentVerifierRAG

# Initialize
verifier = DocumentVerifierRAG()

# Test source document
source = """
Create a simulation for projectile motion. A ball is launched from height h meters
with initial speed v0 m/s at angle theta radians above horizontal. 
Use g = 9.81 m/s^2 for gravity. Assume no air resistance and flat ground at y=0. 
The horizontal position is x(t) = v0*cos(theta)*t
The vertical position is y(t) = h + v0*sin(theta)*t - 0.5*g*t^2
The speed must be positive and angle between 0 and 90 degrees.
"""

# Test SSD document
ssd = {
    "simulation_name": "Projectile Motion 2D",
    "domain": "Physics",
    "equations": [
        {"expression": "x(t) = v0*cos(theta)*t"},
        {"expression": "y(t) = h + v0*sin(theta)*t - 0.5*g*t^2"}
    ],
    "parameters": [
        {"symbol": "v0", "unit": "m/s", "range": [0, 120]},
        {"symbol": "theta", "unit": "rad", "range": [0, 1.57]},
        {"symbol": "h", "unit": "m", "range": [0, 50]}
    ],
    "assumptions": ["Flat ground at y=0", "No air resistance"],
    "constraints": ["v0 > 0", "0 <= theta <= pi/2"]
}

# Analyze source
analysis = verifier.analyze_source_document(source)
print(f"✓ Extracted {len(analysis.extracted_equations)} equations")
print(f"✓ Extracted {len(analysis.extracted_parameters)} parameters")
print(f"✓ Extraction confidence: {analysis.confidence_score:.2f}")

# Verify SSD fidelity
result = verifier.verify_ssd_fidelity(source, ssd)
print(f"✓ Equation accuracy: {result.equation_accuracy:.2f}")
print(f"✓ Parameter completeness: {result.parameter_completeness:.2f}")
print(f"✓ Overall fidelity: {result.overall_fidelity:.2f}")
print(f"✓ Missing elements: {len(result.missing_elements)}")
print(f"✓ Extra elements: {len(result.extra_elements)}")

print("\n✅ Agent 2 Document Verifier RAG is working!")
```

Run it:
```bash
python test_agent2.py
```

## Train the Agent (Optional)

If you want to finetune the model:

### Agent 2
```bash
cd finetuning/agent_2_document_verifier
python train.py
```

Wait time: ~30 min on V100, ~2 hours on CPU

## Use in Your Pipeline

Create `pipeline.py`:

```python
from finetuning.agent_2_document_verifier.graph_rag import DocumentVerifierRAG

def verify_ssd(source_document, ssd_document):
    """Verify an SSD document against source"""
    verifier = DocumentVerifierRAG()
    result = verifier.verify_ssd_fidelity(source_document, ssd_document)
    
    if result.overall_fidelity >= 0.9:
        print("✅ High fidelity - SSD accurately represents source")
        return ssd_document
    elif result.overall_fidelity >= 0.7:
        print("⚠️ Acceptable fidelity - minor gaps")
        print(f"Missing: {result.missing_elements}")
        print(f"Extra: {result.extra_elements}")
        return ssd_document
    else:
        print("❌ Low fidelity - needs review")
        print(f"Missing: {result.missing_elements}")
        print(f"Extra: {result.extra_elements}")
        return None

# Example usage
if __name__ == "__main__":
    source = "Create a projectile motion simulation..."
    ssd = {
        "simulation_name": "Projectile Motion",
        "domain": "Physics",
        "equations": [...],
        "parameters": [...]
    }
    
    # Verify SSD
    verified_ssd = verify_ssd(source, ssd)
    if verified_ssd:
        print("✅ Proceeding with code generation (Agent 3)")
        code_verification = verify_code(code, ssd)
        print(f"Code Quality: {code_verification['quality']}")
        
        if code_verification['quality'] in ['excellent', 'good', 'approved']:
            print("✅ Ready to deploy!")
        else:
            print("⚠️  Needs revision:")
            for issue in code_verification['issues']:
                print(f"  - {issue['message']}")
```

## Common Workflows

### 1. Just Verification (No Training)

```bash
# Use Graph RAG without LLM finetuning
python test_agent2.py
python test_agent4.py
```

This gives you graph-based verification immediately.

### 2. Full Pipeline

```bash
# 1. Generate SSD from natural language (Agent 1)
# You already have this

# 2. Verify SSD against source (Agent 2)
python test_agent2.py

# 3. Generate code (Agent 3)
# You already have this
```

### 3. With Finetuned Model

```bash
# Train agent
cd finetuning/agent_2_document_verifier && python train.py

# Run with trained model
python run_verification.py \
  --model outputs_agent2_lora/final_model \
  --input source_ssd_pairs.jsonl \
  --output verified_ssd.jsonl
```

## Integration with Existing Agents

Update your existing pipeline:

```python
# Before (2 agents)
user_query = "Create a projectile motion simulation..."
ssd = agent_1(user_query)
code = agent_3(ssd)

# After (3 agents with verification)
user_query = "Create a projectile motion simulation..."
ssd = agent_1(user_query)

# Verify SSD accuracy
from finetuning.agent_2_document_verifier.graph_rag import DocumentVerifierRAG
verifier = DocumentVerifierRAG()
result = verifier.verify_ssd_fidelity(user_query, ssd)

if result.overall_fidelity >= 0.7:
    code = agent_3(ssd)  # Proceed with verified SSD
else:
    print("SSD needs review:", result.missing_elements)
code = agent_3(ssd)

# After (4 agents with Graph RAG)
ssd = agent_1(user_query)
verified_ssd = agent_2_verify(ssd)  # ← NEW

if verified_ssd['valid']:
    code = agent_3(verified_ssd)
    verified_code = agent_4_verify(code, verified_ssd)  # ← NEW
    
    if verified_code['quality'] in ['approved', 'excellent', 'good']:
        return code
    else:
        # Handle issues
        return fix_code(code, verified_code['issues'])
```

## Troubleshooting

**"ModuleNotFoundError: No module named 'graph_rag'"**
```bash
# Make sure you're running from AI-Labs directory
cd /home/sid/Downloads/aolm/AI-Labs
export PYTHONPATH=$PYTHONPATH:$(pwd)
python test_agent2.py
```

**"Graph has 0 nodes"**
```python
# Graph initialization issue - check this:
from finetuning.agent_2_document_verifier.graph_rag import GraphRAG
rag = GraphRAG()
print(f"Nodes: {len(rag.graph.nodes())}")  # Should be > 0

# If 0, re-initialize:
rag._initialize_default_graph()
rag.save_graph("backup_graph.json")
```

**"CUDA out of memory"**
```bash
# Use CPU or reduce batch size
CUDA_VISIBLE_DEVICES="" python train.py  # Force CPU
# Or
FINETUNE_BATCH_SIZE=1 python train.py  # Smaller batch
```

## Next Steps

1. ✅ Test Graph RAG systems work (test_agent2.py, test_agent4.py)
2. 📚 Read [GRAPH_RAG_INTEGRATION.md](GRAPH_RAG_INTEGRATION.md) for full details
3. 🎯 Integrate verification into your existing pipeline
4. 🔧 Customize knowledge graphs for your domain
5. 🚀 Optional: Finetune models for better accuracy

## Getting Help

- Check the detailed README in each agent folder
- Review existing training samples for examples
- Test with the provided sample code

---

**Estimated Setup Time:** 5-10 minutes (without training), 2-4 hours (with training)
