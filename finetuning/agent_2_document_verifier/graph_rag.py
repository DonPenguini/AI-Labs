#!/usr/bin/env python3
"""
Graph RAG implementation for Agent 2: Document Verifier.
Verifies that SSD documents accurately represent the source document/query.
Checks for:
- Equation extraction accuracy
- Assumption completeness
- Constraint identification
- Parameter consistency with source
"""

import json
import os
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

import numpy as np
from sentence_transformers import SentenceTransformer


@dataclass
class DocumentAnalysis:
    """Container for analyzed source document."""
    extracted_equations: List[str]
    extracted_parameters: List[str]
    extracted_assumptions: List[str]
    extracted_constraints: List[str]
    domain_keywords: List[str]
    confidence_score: float
    
@dataclass
class VerificationResult:
    """Container for verification results."""
    equation_accuracy: float
    parameter_completeness: float
    assumption_completeness: float
    constraint_accuracy: float
    missing_elements: List[str]
    extra_elements: List[str]
    overall_fidelity: float


class DocumentVerifierRAG:
    """
    Verifies that generated SSD accurately represents the source document.
    
    Uses semantic analysis and pattern matching to check:
    - All equations from doc are captured in SSD
    - Assumptions are complete and accurate
    - Constraints are properly identified
    - Parameters match those mentioned in doc
    - Nothing is hallucinated or added without basis
    """
    
    def __init__(
        self,
        embedding_model: str = "all-MiniLM-L6-v2"
    ):
        self.embedding_model = SentenceTransformer(embedding_model)
        
        # Common physics/engineering patterns
        self.equation_patterns = [
            r'([a-zA-Z_]\w*)\(([^)]*)\)\s*=\s*(.+)',  # function form: f(x) = ...
            r'([a-zA-Z_]\w*)\s*=\s*([^=]+)',  # assignment form: x = ...
            r'd([a-zA-Z])/d([a-zA-Z])\s*=\s*(.+)',  # derivative: dx/dt = ...
            r'∂([a-zA-Z])/∂([a-zA-Z])\s*=\s*(.+)',  # partial: ∂x/∂t = ...
        ]
        
        self.constraint_keywords = [
            'must', 'should', 'assume', 'given', 'where', 'such that',
            'constraint', 'condition', 'requirement', 'limit', 'range',
            'greater than', 'less than', 'between', 'when', 'if'
        ]
        
        self.assumption_keywords = [
            'assume', 'assuming', 'assumption', 'ignore', 'negligible',
            'ideal', 'constant', 'uniform', 'steady', 'homogeneous',
            'consider', 'treat as', 'approximate', 'neglect'
        ]
    
    def analyze_source_document(self, source_text: str) -> DocumentAnalysis:
        """
        Extract equations, parameters, assumptions, and constraints from source document.
        
        Args:
            source_text: The original user query or document
            
        Returns:
            DocumentAnalysis with extracted elements
        """
        # Extract equations using patterns
        equations = []
        for pattern in self.equation_patterns:
            matches = re.findall(pattern, source_text, re.MULTILINE)
            if matches:
                equations.extend([' '.join(m) if isinstance(m, tuple) else m for m in matches])
        
        # Extract mathematical expressions even without explicit equals
        math_expressions = re.findall(r'[a-zA-Z_]\w*\s*[\+\-\*/\^]\s*[a-zA-Z_0-9()\.]+', source_text)
        equations.extend(math_expressions)
        
        # Extract parameters (variables mentioned)
        parameters = re.findall(r'\b([a-zA-Z_][a-zA-Z_0-9]*)\s*[=:]?\s*\d+|\b([a-zA-Z_][a-zA-Z_0-9]*)\s+\([\w\s/\^]+\)', source_text)
        parameters = list(set([p[0] or p[1] for p in parameters if p]))
        
        # Extract assumptions (sentences with assumption keywords)
        assumptions = []
        sentences = source_text.split('.')
        for sentence in sentences:
            sentence = sentence.strip()
            if any(keyword in sentence.lower() for keyword in self.assumption_keywords):
                assumptions.append(sentence)
        
        # Extract constraints (sentences with constraint keywords)
        constraints = []
        for sentence in sentences:
            sentence = sentence.strip()
            if any(keyword in sentence.lower() for keyword in self.constraint_keywords):
                if sentence not in assumptions:  # avoid duplicates
                    constraints.append(sentence)
        
        # Extract domain keywords
        domain_keywords = self._extract_domain_keywords(source_text)
        
        return DocumentAnalysis(
            extracted_equations=list(set(equations)),
            extracted_parameters=parameters,
            extracted_assumptions=assumptions,
            extracted_constraints=constraints,
            domain_keywords=domain_keywords,
            confidence_score=self._calculate_extraction_confidence(source_text, equations, parameters)
        )
    
    def _extract_domain_keywords(self, text: str) -> List[str]:
        """Extract domain-specific keywords."""
        physics_keywords = ['velocity', 'acceleration', 'force', 'mass', 'energy', 'momentum', 
                           'friction', 'gravity', 'projectile', 'pendulum', 'wave', 'motion']
        electrical_keywords = ['voltage', 'current', 'resistance', 'capacitor', 'inductor',
                              'circuit', 'RC', 'RL', 'power', 'frequency', 'impedance']
        biology_keywords = ['population', 'growth', 'species', 'carrying capacity', 'epidemic',
                           'infection', 'susceptible', 'recovery', 'SIR', 'logistic']
        mechanical_keywords = ['stress', 'strain', 'heat', 'temperature', 'thermal', 'conduction',
                              'pressure', 'fluid', 'flow', 'deformation']
        
        all_keywords = physics_keywords + electrical_keywords + biology_keywords + mechanical_keywords
        
        text_lower = text.lower()
        found_keywords = [kw for kw in all_keywords if kw in text_lower]
        return found_keywords
    
    def _calculate_extraction_confidence(self, text: str, equations: List[str], parameters: List[str]) -> float:
        """Calculate confidence in extraction quality."""
        score = 0.5  # baseline
        
        # Boost if equations found
        if equations:
            score += 0.2
        
        # Boost if parameters found
        if parameters:
            score += 0.15
        
        # Boost if text has clear structure
        if any(marker in text.lower() for marker in ['equation', 'formula', 'where', 'given']):
            score += 0.15
        
        return min(score, 1.0)
    
    def verify_ssd_fidelity(
        self,
        source_text: str,
        ssd_document: Dict
    ) -> VerificationResult:
        """
        Verify that SSD accurately represents the source document.
        
        Args:
            source_text: Original user query or document
            ssd_document: Generated SSD from Agent 1
            
        Returns:
            VerificationResult with detailed analysis
        """
        # Analyze source document
        source_analysis = self.analyze_source_document(source_text)
        
        # Extract from SSD
        ssd_equations = [eq.get('expression', '') for eq in ssd_document.get('equations', [])]
        ssd_parameters = [p.get('symbol', '') for p in ssd_document.get('parameters', [])]
        ssd_assumptions = ssd_document.get('assumptions', [])
        ssd_constraints = ssd_document.get('constraints', [])
        
        # Verify equations
        equation_score, missing_eqs, extra_eqs = self._verify_equations(
            source_analysis.extracted_equations,
            ssd_equations,
            source_text
        )
        
        # Verify parameters
        param_score, missing_params, extra_params = self._verify_parameters(
            source_analysis.extracted_parameters,
            ssd_parameters,
            source_text
        )
        
        # Verify assumptions
        assumption_score, missing_assumptions = self._verify_assumptions(
            source_analysis.extracted_assumptions,
            ssd_assumptions
        )
        
        # Verify constraints
        constraint_score, missing_constraints = self._verify_constraints(
            source_analysis.extracted_constraints,
            ssd_constraints
        )
        
        # Calculate overall fidelity
        overall = (equation_score * 0.4 + param_score * 0.3 + 
                  assumption_score * 0.2 + constraint_score * 0.1)
        
        missing = missing_eqs + missing_params + missing_assumptions + missing_constraints
        extra = extra_eqs + extra_params
        
        return VerificationResult(
            equation_accuracy=equation_score,
            parameter_completeness=param_score,
            assumption_completeness=assumption_score,
            constraint_accuracy=constraint_score,
            missing_elements=missing,
            extra_elements=extra,
            overall_fidelity=overall
        )
    
    def _verify_equations(
        self,
        source_equations: List[str],
        ssd_equations: List[str],
        source_text: str
    ) -> Tuple[float, List[str], List[str]]:
        """Verify equation fidelity using semantic similarity."""
        missing = []
        extra = []
        
        if not source_equations and not ssd_equations:
            return 1.0, [], []
        
        if not source_equations:
            # No equations in source but SSD has them - likely hallucinated
            extra = [f"Equation: {eq}" for eq in ssd_equations]
            return 0.5, [], extra
        
        # Encode equations
        source_embeddings = self.embedding_model.encode(source_equations)
        ssd_embeddings = self.embedding_model.encode(ssd_equations)
        
        # Check coverage: are all source equations in SSD?
        matched_source = 0
        for i, src_emb in enumerate(source_embeddings):
            max_sim = 0
            for ssd_emb in ssd_embeddings:
                sim = np.dot(src_emb, ssd_emb) / (np.linalg.norm(src_emb) * np.linalg.norm(ssd_emb))
                max_sim = max(max_sim, sim)
            
            if max_sim > 0.7:  # threshold for match
                matched_source += 1
            else:
                missing.append(f"Equation: {source_equations[i]}")
        
        # Check for hallucinations: are there SSD equations not in source?
        matched_ssd = 0
        for j, ssd_emb in enumerate(ssd_embeddings):
            max_sim = 0
            for src_emb in source_embeddings:
                sim = np.dot(src_emb, ssd_emb) / (np.linalg.norm(src_emb) * np.linalg.norm(ssd_emb))
                max_sim = max(max_sim, sim)
            
            if max_sim > 0.7:
                matched_ssd += 1
            else:
                extra.append(f"Equation: {ssd_equations[j]}")
        
        # Score: average of precision and recall
        precision = matched_ssd / len(ssd_equations) if ssd_equations else 0
        recall = matched_source / len(source_equations) if source_equations else 0
        score = (precision + recall) / 2
        
        return score, missing, extra
    
    def _verify_parameters(
        self,
        source_parameters: List[str],
        ssd_parameters: List[str],
        source_text: str
    ) -> Tuple[float, List[str], List[str]]:
        """Verify parameter completeness."""
        missing = []
        extra = []
        
        # Normalize parameter names
        source_params_lower = [p.lower() for p in source_parameters]
        ssd_params_lower = [p.lower() for p in ssd_parameters]
        
        # Check for missing parameters
        for param in source_parameters:
            if param.lower() not in ssd_params_lower:
                # Double-check it's actually missing by looking for it in SSD parameters' full names
                found = any(param.lower() in sp.lower() for sp in ssd_parameters)
                if not found:
                    missing.append(f"Parameter: {param}")
        
        # Check for extra parameters (hallucinated)
        for param in ssd_parameters:
            if param.lower() not in source_params_lower:
                # Check if it appears in source text at all
                if param.lower() not in source_text.lower():
                    extra.append(f"Parameter: {param}")
        
        # Score based on coverage
        if not source_parameters:
            score = 1.0 if not ssd_parameters else 0.8  # SSD added reasonable params
        else:
            matched = len([p for p in source_parameters if p.lower() in ssd_params_lower])
            score = matched / len(source_parameters)
        
        # Penalize extra params
        if extra:
            score *= 0.8
        
        return score, missing, extra
    
    def _verify_assumptions(
        self,
        source_assumptions: List[str],
        ssd_assumptions: List[str]
    ) -> Tuple[float, List[str]]:
        """Verify assumption completeness using semantic similarity."""
        missing = []
        
        if not source_assumptions:
            return 1.0, []
        
        if not ssd_assumptions:
            return 0.0, [f"Assumption: {a}" for a in source_assumptions]
        
        # Encode assumptions
        source_embeddings = self.embedding_model.encode(source_assumptions)
        ssd_embeddings = self.embedding_model.encode(ssd_assumptions)
        
        # Check if each source assumption is captured in SSD
        matched = 0
        for i, src_emb in enumerate(source_embeddings):
            max_sim = 0
            for ssd_emb in ssd_embeddings:
                sim = np.dot(src_emb, ssd_emb) / (np.linalg.norm(src_emb) * np.linalg.norm(ssd_emb))
                max_sim = max(max_sim, sim)
            
            if max_sim > 0.6:  # lower threshold for assumptions (more flexible wording)
                matched += 1
            else:
                missing.append(f"Assumption: {source_assumptions[i]}")
        
        score = matched / len(source_assumptions) if source_assumptions else 1.0
        return score, missing
    
    def _verify_constraints(
        self,
        source_constraints: List[str],
        ssd_constraints: List[str]
    ) -> Tuple[float, List[str]]:
        """Verify constraint identification."""
        missing = []
        
        if not source_constraints:
            return 1.0, []
        
        if not ssd_constraints:
            return 0.5, [f"Constraint: {c}" for c in source_constraints]
        
        # Encode constraints
        source_embeddings = self.embedding_model.encode(source_constraints)
        ssd_embeddings = self.embedding_model.encode(ssd_constraints)
        
        # Check if each source constraint is in SSD
        matched = 0
        for i, src_emb in enumerate(source_embeddings):
            max_sim = 0
            for ssd_emb in ssd_embeddings:
                sim = np.dot(src_emb, ssd_emb) / (np.linalg.norm(src_emb) * np.linalg.norm(ssd_emb))
                max_sim = max(max_sim, sim)
            
            if max_sim > 0.6:
                matched += 1
            else:
                missing.append(f"Constraint: {source_constraints[i]}")
        
        score = matched / len(source_constraints) if source_constraints else 1.0
        return score, missing


if __name__ == "__main__":
    # Test the Document Verifier RAG system
    verifier = DocumentVerifierRAG()
    
    # Test source document
    source = """
    A physics worksheet describes a ball launched from a platform at speed v0 and angle theta above horizontal. 
    Ignore air drag; use g = 9.81 m/s^2. 
    The horizontal position is x(t) = v0*cos(theta)*t
    The vertical position is y(t) = h + v0*sin(theta)*t - 0.5*g*t^2
    Assume flat ground at y=0. Assume no air resistance.
    The speed must be positive and angle must be between 0 and 90 degrees.
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
            {"symbol": "v0"},
            {"symbol": "theta"},
            {"symbol": "h"}
        ],
        "assumptions": ["Flat ground at y=0", "No air resistance"],
        "constraints": ["v0 > 0", "0 <= theta <= pi/2"]
    }
    
    # Analyze source
    analysis = verifier.analyze_source_document(source)
    print("Source Analysis:")
    print(f"  Equations: {analysis.extracted_equations}")
    print(f"  Parameters: {analysis.extracted_parameters}")
    print(f"  Assumptions: {analysis.extracted_assumptions}")
    print(f"  Constraints: {analysis.extracted_constraints}")
    print(f"  Confidence: {analysis.confidence_score:.2f}")
    
    # Verify SSD
    result = verifier.verify_ssd_fidelity(source, ssd)
    print("\nVerification Result:")
    print(f"  Equation Accuracy: {result.equation_accuracy:.2f}")
    print(f"  Parameter Completeness: {result.parameter_completeness:.2f}")
    print(f"  Assumption Completeness: {result.assumption_completeness:.2f}")
    print(f"  Constraint Accuracy: {result.constraint_accuracy:.2f}")
    print(f"  Overall Fidelity: {result.overall_fidelity:.2f}")
    print(f"  Missing: {result.missing_elements}")
    print(f"  Extra: {result.extra_elements}")
