#!/usr/bin/env python3
"""
Run Agent 2: Document Verifier with Graph RAG.
Takes source documents and SSD documents from Agent 1,
verifies that the SSD accurately represents the source.
"""

import json
import argparse
from pathlib import Path
from typing import Dict, Optional

import torch
from unsloth import FastLanguageModel
from graph_rag import DocumentVerifierRAG


class DocumentVerifier:
    """
    Agent 2: Verifies Scientific Simulation Documents (SSD) using Graph RAG.
    Checks whether SSD accurately represents the source document.
    """
    
    def __init__(
        self,
        model_path: str,
        embedding_model: str = "all-MiniLM-L6-v2",
        max_seq_length: int = 8192
    ):
        """
        Initialize the document verifier.
        
        Args:
            model_path: Path to finetuned verification model
            embedding_model: Sentence transformer model for semantic similarity
            max_seq_length: Maximum sequence length for model
        """
        print(f"Loading verification model from {model_path}")
        self.model, self.tokenizer = FastLanguageModel.from_pretrained(
            model_name=model_path,
            max_seq_length=max_seq_length,
            dtype=None,
            load_in_4bit=True,
        )
        FastLanguageModel.for_inference(self.model)
        
        print("Initializing Document Verifier RAG system")
        self.graph_rag = DocumentVerifierRAG(
            embedding_model=embedding_model
        )
    
    def verify_document(self, source_document: str, ssd_document: Dict) -> Dict:
        """
        Verify an SSD document against its source using Graph RAG and the finetuned model.
        
        Args:
            source_document: The original user query or document text
            ssd_document: The SSD format document from Agent 1
            
        Returns:
            Verification result with fidelity scores and missing/extra elements
        """
        # Step 1: Analyze source document
        print("Analyzing source document...")
        source_analysis = self.graph_rag.analyze_source_document(source_document)
        
        # Step 2: Verify SSD fidelity to source
        print("Verifying SSD fidelity to source...")
        fidelity_result = self.graph_rag.verify_ssd_fidelity(source_document, ssd_document)
        
        # Step 3: Format prompt for LLM verification
        fidelity_context = {
            "source_analysis": {
                "equations": source_analysis.extracted_equations,
                "parameters": source_analysis.extracted_parameters,
                "assumptions": source_analysis.extracted_assumptions,
                "constraints": source_analysis.extracted_constraints,
                "confidence": source_analysis.confidence_score
            },
            "fidelity_scores": {
                "equation_accuracy": fidelity_result.equation_accuracy,
                "parameter_completeness": fidelity_result.parameter_completeness,
                "assumption_completeness": fidelity_result.assumption_completeness,
                "constraint_accuracy": fidelity_result.constraint_accuracy,
                "overall_fidelity": fidelity_result.overall_fidelity
            },
            "missing_elements": fidelity_result.missing_elements,
            "extra_elements": fidelity_result.extra_elements
        }
        
        prompt = f"""### Instruction:
Verify that the generated SSD accurately represents the source document. Check that all equations, parameters, assumptions, and constraints from the source are correctly extracted and represented in the SSD. Identify any missing elements or hallucinated additions.

### Source Document:
{source_document}

### SSD Document:
{json.dumps(ssd_document, indent=2)}

### Fidelity Analysis:
{json.dumps(fidelity_context, indent=2)}

### Verification Output:
"""
        
        # Step 4: Run LLM verification
        print("Running LLM verification...")
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=2048,
                temperature=0.3,
                top_p=0.9,
                do_sample=True,
            )
        
        verification_output = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        verification_json = verification_output.split("### Verification Output:")[-1].strip()
        
        try:
            verification_result = json.loads(verification_json)
        except json.JSONDecodeError:
            # Fallback if LLM doesn't produce valid JSON
            verification_result = {
                "equation_accuracy": fidelity_result.equation_accuracy,
                "parameter_completeness": fidelity_result.parameter_completeness,
                "assumption_completeness": fidelity_result.assumption_completeness,
                "constraint_accuracy": fidelity_result.constraint_accuracy,
                "missing_elements": fidelity_result.missing_elements,
                "extra_elements": fidelity_result.extra_elements,
                "overall_fidelity": fidelity_result.overall_fidelity,
                "summary": "LLM verification could not parse, using graph RAG results only"
            }
        
        # Combine graph RAG and LLM verifications
        result = {
            "source_document": source_document,
            "ssd_document": ssd_document,
            "source_analysis": {
                "equations": source_analysis.extracted_equations,
                "parameters": source_analysis.extracted_parameters,
                "assumptions": source_analysis.extracted_assumptions,
                "constraints": source_analysis.extracted_constraints
            },
            "fidelity_verification": {
                "equation_accuracy": fidelity_result.equation_accuracy,
                "parameter_completeness": fidelity_result.parameter_completeness,
                "assumption_completeness": fidelity_result.assumption_completeness,
                "constraint_accuracy": fidelity_result.constraint_accuracy,
                "overall_fidelity": fidelity_result.overall_fidelity
            },
            "llm_verification": verification_result,
            "overall_status": "high_fidelity" if fidelity_result.overall_fidelity >= 0.9 else (
                "acceptable" if fidelity_result.overall_fidelity >= 0.7 else "needs_review"
            )
        }
        
        return result
    
    def batch_verify(self, input_file: str, output_file: str):
        """
        Verify a batch of source documents and SSDs from a JSONL file.
        Each line should have {source_document: str, ssd_document: dict}.
        
        Args:
            input_file: Path to input JSONL file with source+SSD pairs
            output_file: Path to output JSONL file with verification results
        """
        with open(input_file, 'r') as f_in, open(output_file, 'w') as f_out:
            for line_num, line in enumerate(f_in, 1):
                line = line.strip()
                if not line:
                    continue
                
                try:
                    data = json.loads(line)
                    source_doc = data.get('source_document', '')
                    ssd_doc = data.get('ssd_document', data.get('ssd_output', {}))
                    
                    print(f"\nVerifying document {line_num}: {ssd_doc.get('simulation_name', 'Unknown')}")
                    
                    result = self.verify_document(source_doc, ssd_doc)
                    f_out.write(json.dumps(result) + '\n')
                    
                    print(f"Status: {result['overall_status']}")
                    print(f"Overall Fidelity: {result['fidelity_verification']['overall_fidelity']:.2f}")
                    
                except Exception as e:
                    print(f"Error processing line {line_num}: {e}")
                    continue


def main():
    parser = argparse.ArgumentParser(description="Run Agent 2: Document Verifier")
    parser.add_argument(
        "--model",
        type=str,
        required=True,
        help="Path to finetuned verification model"
    )
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="Input JSONL file with source_document and ssd_document pairs"
    )
    parser.add_argument(
        "--output",
        type=str,
        required=True,
        help="Output JSONL file for verification results"
    )
    parser.add_argument(
        "--embedding-model",
        type=str,
        default="all-MiniLM-L6-v2",
        help="Sentence transformer model for semantic similarity"
    )
    
    args = parser.parse_args()
    
    verifier = DocumentVerifier(
        model_path=args.model,
        embedding_model=args.embedding_model
    )
    
    verifier.batch_verify(args.input, args.output)
    print(f"\nVerification complete. Results saved to {args.output}")


if __name__ == "__main__":
    main()
