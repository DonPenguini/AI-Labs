#!/usr/bin/env python3
"""
ENHANCED Dataset Extension Script with FORCED DIVERSITY
Ensures wide domain coverage across: Physics, Chemistry, Biology, Math, 
Computer Science, Engineering, Finance, and more.
"""

import json
import random
import logging
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime
from collections import defaultdict

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field, field_validator
from langchain_openai import ChatOpenAI

# Configure logging
DEBUG_MODE = False

import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.DEBUG if DEBUG_MODE else logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'dataset_extension_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ==================== DOMAIN DEFINITIONS ====================

DOMAIN_CATALOG = {
    "High School Physics": {
        "subcategories": [
            "Electricity and Circuits", "Optics and Light", "Motion and Forces", 
            "Heat and Temperature", "Waves and Sound", "Magnetism",
            "Simple Machines", "Energy Conservation", "Pressure and Fluids",
            "Resistor Color Coding", "Ohm's Law Experiments", "Series and Parallel Circuits"
        ],
        "example_topics": [
            "resistor color bands", "resistance calculation", "Ohm's law verification",
            "series circuit analysis", "parallel circuit analysis", "voltmeter reading",
            "ammeter usage", "LED circuits", "battery internal resistance",
            "pendulum period", "inclined plane friction", "pulley systems",
            "reflection in mirrors", "refraction in glass", "lens focal length",
            "convex lens imaging", "concave mirror experiments", "prism dispersion",
            "specific heat capacity", "thermal expansion", "calorimetry",
            "Newton's laws verification", "projectile motion", "momentum conservation"
        ]
    },
    "High School Chemistry": {
        "subcategories": [
            "Salt Analysis", "Acid-Base Reactions", "Titration Experiments",
            "Qualitative Analysis", "Quantitative Analysis", "Redox Reactions",
            "Electrochemistry", "Chemical Kinetics", "pH and Indicators",
            "Organic Chemistry Basics", "Crystallization", "Distillation",
            "Chromatography", "Flame Tests", "Precipitation Reactions"
        ],
        "example_topics": [
            "cation identification", "anion identification", "salt analysis procedure",
            "group separation", "confirmatory tests", "pH indicator color change",
            "acid-base titration", "permanganate titration", "iodometric titration",
            "copper sulfate crystallization", "simple distillation", "fractional distillation",
            "paper chromatography", "thin layer chromatography", "flame test colors",
            "sodium carbonate test", "sulfate test", "chloride test",
            "ferric chloride test", "Benedict's test", "Fehling's test",
            "rate of reaction", "activation energy", "equilibrium constant",
            "electroplating", "galvanic cell", "pH measurement"
        ]
    },
    "High School Biology": {
        "subcategories": [
            "Microscopy", "Cell Biology", "Photosynthesis", "Respiration",
            "Osmosis and Diffusion", "Plant Physiology", "Human Anatomy",
            "Genetics", "Ecology", "Microbiology", "Enzyme Activity",
            "Dissection Studies", "Slide Preparation"
        ],
        "example_topics": [
            "onion peel mounting", "cheek cell observation", "stomata study",
            "plasmolysis", "osmosis in potato", "diffusion demonstration",
            "starch test in leaves", "CO2 requirement for photosynthesis",
            "transpiration rate", "root pressure", "capillary action in plants",
            "human blood cell types", "bacterial culture", "yeast fermentation",
            "enzyme catalase activity", "amylase on starch", "pH effect on enzymes",
            "seed germination", "mitosis in onion root tip", "Punnett square genetics"
        ]
    },
    "UV-Visible Spectroscopy": {
        "subcategories": [
            "UV Absorption", "Colorimetry", "Beer-Lambert Law",
            "Spectrophotometry", "Wavelength Selection", "Sample Preparation",
            "Calibration Curves", "Concentration Determination"
        ],
        "example_topics": [
            "UV light absorption", "colored solution analysis", "Beer's law verification",
            "absorbance vs concentration", "colorimeter calibration", "standard curve",
            "copper sulfate concentration", "potassium permanganate analysis",
            "chlorophyll extraction", "carotene absorption spectrum",
            "protein estimation", "DNA quantification", "glucose determination",
            "pH indicator spectroscopy", "reaction rate monitoring"
        ]
    },
    "Physics": {
        "subcategories": [
            "Classical Mechanics", "Thermodynamics", "Electromagnetism", 
            "Optics", "Wave Mechanics", "Fluid Dynamics", "Acoustics"
        ],
        "example_topics": [
            "projectile motion", "heat transfer", "electromagnetic fields",
            "wave interference", "Bernoulli's equation", "Doppler effect",
            "phase transitions", "simple harmonic motion"
        ]
    },
    "Chemistry": {
        "subcategories": [
            "Physical Chemistry", "Organic Chemistry", "Inorganic Chemistry",
            "Analytical Chemistry", "Electrochemistry", "Chemical Kinetics"
        ],
        "example_topics": [
            "reaction rates", "pH calculations", "redox reactions",
            "equilibrium constants", "enthalpy changes", "spectral analysis"
        ]
    },
    "Biology": {
        "subcategories": [
            "Molecular Biology", "Cell Biology", "Ecology", "Physiology",
            "Genetics", "Microbiology"
        ],
        "example_topics": [
            "DNA replication", "population dynamics", "cell division",
            "bacterial growth", "metabolic pathways"
        ]
    },
    "School Laboratory Experiments": {
        "subcategories": [
            "Basic Measurements", "Chemical Tests", "Physical Experiments",
            "Safety Procedures", "Data Recording", "Equipment Usage",
            "Titrations and Volumetric Analysis", "Qualitative Tests",
            "Quantitative Measurements", "Standard Solutions"
        ],
        "example_topics": [
            "measuring cylinder usage", "burette reading", "pipette technique",
            "weighing balance accuracy", "thermometer calibration", "pH meter usage",
            "litmus test", "universal indicator", "methyl orange endpoint",
            "phenolphthalein color change", "safety goggles importance",
            "chemical storage", "waste disposal", "dilution calculations",
            "molarity preparation", "normality calculation", "titration curves",
            "primary standard", "secondary standard", "indicator selection"
        ]
    },
    "Resistor Experiments": {
        "subcategories": [
            "Color Code Reading", "Resistance Measurement", "Tolerance Calculation",
            "Series Combinations", "Parallel Combinations", "Power Rating",
            "Variable Resistors", "Thermistors", "LDR Experiments"
        ],
        "example_topics": [
            "4-band color code", "5-band color code", "6-band resistor reading",
            "tolerance band identification", "multimeter resistance measurement",
            "ohmmeter calibration", "total resistance in series", "total resistance in parallel",
            "combined series-parallel circuits", "voltage divider rule", "current divider rule",
            "potentiometer adjustment", "rheostat usage", "thermistor temperature response",
            "LDR light sensitivity", "power dissipation", "resistor heating",
            "temperature coefficient", "strain gauge measurement"
        ]
    },
    "School Chemistry Practicals": {
        "subcategories": [
            "Preliminary Tests", "Dry Heating Tests", "Flame Tests",
            "Wet Tests", "Group Separation", "Confirmatory Tests",
            "Organic Compound Tests", "Functional Group Tests"
        ],
        "example_topics": [
            "carbonate test with acid", "sulphide smell test", "ammonium salt test",
            "flame color of sodium", "flame color of potassium", "flame color of calcium",
            "copper blue-green flame", "barium green flame", "strontium red flame",
            "lead iodide yellow precipitate", "ferric hydroxide brown precipitate",
            "zinc hydroxide white precipitate", "copper hydroxide blue precipitate",
            "silver chloride precipitate", "barium sulfate precipitate",
            "Lucas test for alcohols", "Tollens test for aldehydes",
            "iodoform test", "Molisch test for carbohydrates"
        ]
    },
    "Mathematics": {
        "subcategories": [
            "Algebra", "Geometry", "Trigonometry", "Statistics",
            "Calculus Basics", "Probability", "Mensuration"
        ],
        "example_topics": [
            "quadratic equations", "circle theorems", "sine rule",
            "mean and median", "differentiation basics", "coin toss probability",
            "area and volume"
        ]
    },
    "School Physics Practicals": {
        "subcategories": [
            "Vernier Caliper", "Screw Gauge", "Simple Pendulum",
            "Sonometer", "Meter Bridge", "Potentiometer",
            "Focal Length Determination", "Refractive Index",
            "Specific Heat", "Young's Modulus"
        ],
        "example_topics": [
            "vernier scale reading", "least count calculation", "zero error correction",
            "screw gauge pitch", "screw gauge least count", "diameter measurement",
            "pendulum effective length", "time period vs length", "acceleration due to gravity",
            "sonometer wire frequency", "resonance in sonometer", "frequency of tuning fork",
            "Wheatstone bridge balance", "unknown resistance measurement",
            "potentiometer internal resistance", "EMF comparison", "cell EMF measurement",
            "convex lens focal length", "concave mirror focal length", "u-v method",
            "displacement method", "refractive index of glass slab", "critical angle",
            "total internal reflection", "method of mixtures", "cooling curve",
            "stretching wire experiment", "stress-strain graph"
        ]
    },
    "School Science Experiments": {
        "subcategories": [
            "Basic Physics Labs", "Basic Chemistry Labs", "Basic Biology Labs",
            "Simple Machines", "Light and Optics", "Sound and Waves",
            "Electricity Basics", "Heat Experiments", "Chemical Reactions Labs",
            "Plant Biology", "Human Body", "Water Analysis",
            "Motion Experiments", "Measurement Techniques"
        ],
        "example_topics": [
            "pendulum swing period", "ice melting heat", "seed germination rate",
            "lever mechanical advantage", "mirror focal point", "tuning fork frequency",
            "simple bulb circuit", "thermal expansion measurement", "neutralization reaction",
            "photosynthesis demonstration", "pulse rate measurement", "water hardness test",
            "friction force", "density determination", "magnet field lines",
            "electrolysis of water", "rusting of iron", "pH of household items",
            "capillary rise", "salt crystallization", "respiration in plants",
            "Newton's cradle momentum", "sound speed in air", "electromagnet strength"
        ]
    },
    "Computer Science": {
        "subcategories": [
            "Algorithms", "Data Structures", "Programming Basics"
        ],
        "example_topics": [
            "sorting algorithms", "binary search trees", "loops and functions"
        ]
    },
    "Electrical Engineering": {
        "subcategories": [
            "Circuit Theory", "Digital Electronics", "Basic Measurements"
        ],
        "example_topics": [
            "RC circuits", "logic gates", "voltage measurement"
        ]
    }
}


# ==================== STRUCTURED OUTPUT SCHEMAS ====================

class Entity(BaseModel):
    """Represents a physical entity in the simulation"""
    name: str = Field(description="Name of the entity")
    mass: Optional[Dict[str, Any]] = Field(None, description="Mass properties")
    capacitance: Optional[Dict[str, Any]] = Field(None, description="Capacitance properties")
    resistance: Optional[Dict[str, Any]] = Field(None, description="Resistance properties")
    count: Optional[Dict[str, Any]] = Field(None, description="Count properties")


class Constant(BaseModel):
    """Represents a physical constant"""
    name: str = Field(description="Name of the constant")
    symbol: str = Field(description="Symbol for the constant")
    value: float = Field(description="Numerical value")
    unit: str = Field(description="Unit of measurement")


class Parameter(BaseModel):
    """Represents a simulation parameter"""
    name: str = Field(description="Name of the parameter")
    symbol: str = Field(description="Mathematical symbol")
    unit: str = Field(description="Unit of measurement")
    range: List[float] = Field(description="Valid range [min, max]")


class Equation(BaseModel):
    """Represents a mathematical equation"""
    description: str = Field(description="Description of what the equation represents")
    expression: str = Field(description="Mathematical expression")
    condition: Optional[str] = Field(None, description="Condition for applicability")


class SimulationOutput(BaseModel):
    """Structured output for a simulation description - SSD Format"""
    simulation_name: str = Field(description="Unique identifier for the simulation")
    domain: str = Field(description="Scientific/engineering domain")
    description: str = Field(description="Brief description of the simulation")
    assumptions: List[str] = Field(description="List of assumptions made")
    entities: List[Entity] = Field(default_factory=list, description="Physical entities")
    constants: List[Constant] = Field(default_factory=list, description="Physical constants")
    parameters: List[Parameter] = Field(description="Configurable parameters")
    equations: List[Equation] = Field(description="Mathematical equations")
    initial_conditions: Dict[str, Any] = Field(description="Initial conditions")
    outputs: List[str] = Field(description="Output variables")
    simulation_controls: List[str] = Field(description="User-controllable parameters")
    constraints: Optional[List[str]] = Field(default_factory=list, description="System constraints")
    
    @field_validator('simulation_name')
    @classmethod
    def validate_simulation_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Simulation name cannot be empty")
        return v.strip()
    
    @field_validator('domain')
    @classmethod
    def validate_domain(cls, v):
        if not v or not v.strip():
            raise ValueError("Domain cannot be empty")
        return v.strip()


class DatasetEntry(BaseModel):
    """Complete dataset entry with instruction, input, and output"""
    instruction: str = Field(description="The task instruction for the model")
    input: str = Field(description="Natural language description of the simulation")
    output: SimulationOutput = Field(description="Structured simulation specification")
    
    @field_validator('input')
    @classmethod
    def validate_input(cls, v):
        if not v or not v.strip() or len(v.strip()) < 10:
            raise ValueError("Input must be meaningful (at least 10 characters)")
        return v.strip()


class ValidationFeedback(BaseModel):
    """Critic agent's validation feedback"""
    is_valid: bool = Field(description="Whether the sample passes validation")
    quality_score: float = Field(description="Quality score from 0.0 to 10.0", ge=0.0, le=10.0)
    scientific_accuracy: float = Field(description="Scientific accuracy 0-10", ge=0.0, le=10.0)
    format_compliance: float = Field(description="SSD format compliance 0-10", ge=0.0, le=10.0)
    diversity_score: float = Field(description="How different from examples 0-10", ge=0.0, le=10.0)
    mathematical_correctness: float = Field(description="Math correctness 0-10", ge=0.0, le=10.0)
    completeness: float = Field(description="Completeness 0-10", ge=0.0, le=10.0)
    issues: List[str] = Field(default_factory=list, description="Issues found")
    strengths: List[str] = Field(default_factory=list, description="Strengths")
    recommendation: str = Field(description="ACCEPT, REJECT, or REVISE")
    feedback_summary: str = Field(description="Brief evaluation summary")


# ==================== DIVERSITY MANAGER ====================

class DiversityManager:
    """Manages domain rotation and tracks diversity metrics"""
    
    def __init__(self, domain_catalog: Dict):
        self.domain_catalog = domain_catalog
        self.domain_queue = self._build_domain_queue()
        self.domain_counts = defaultdict(int)
        self.subcategory_counts = defaultdict(int)
        self.topic_history = []
        self.max_topic_history = 100
        
    def _build_domain_queue(self) -> List[tuple]:
        """Build a shuffled queue of (domain, subcategory) pairs"""
        queue = []
        for domain, info in self.domain_catalog.items():
            for subcat in info['subcategories']:
                queue.append((domain, subcat))
        random.shuffle(queue)
        return queue
    
    def get_next_domain_target(self) -> tuple:
        """Get the next domain and subcategory to target"""
        if not self.domain_queue:
            self.domain_queue = self._build_domain_queue()
        
        domain, subcategory = self.domain_queue.pop(0)
        self.domain_counts[domain] += 1
        self.subcategory_counts[f"{domain}::{subcategory}"] += 1
        
        return domain, subcategory
    
    def get_topic_suggestions(self, domain: str) -> List[str]:
        """Get topic suggestions for a domain, avoiding recent topics"""
        topics = self.domain_catalog.get(domain, {}).get('example_topics', [])
        # Filter out recently used topics
        available = [t for t in topics if t not in self.topic_history[-20:]]
        return available if available else topics
    
    def record_generated(self, domain: str, topic: str):
        """Record a generated simulation"""
        self.topic_history.append(topic)
        if len(self.topic_history) > self.max_topic_history:
            self.topic_history = self.topic_history[-self.max_topic_history:]
    
    def get_diversity_stats(self) -> Dict:
        """Get diversity statistics"""
        return {
            'unique_domains': len(self.domain_counts),
            'unique_subcategories': len(self.subcategory_counts),
            'domain_distribution': dict(self.domain_counts),
            'most_common_domains': sorted(
                self.domain_counts.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5],
            'least_common_domains': sorted(
                self.domain_counts.items(), 
                key=lambda x: x[1]
            )[:5]
        }


# ==================== DATASET LOADER ====================

def load_existing_dataset(filepath: str) -> List[Dict]:
    """Load existing JSONL dataset"""
    logger.info(f"Loading dataset from: {filepath}")
    data = []
    default_instruction = "Convert the following natural language simulation description into a structured SSD (Structured Simulation Description) format with all necessary components including simulation name, domain, equations, parameters, and constraints."
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            try:
                entry = json.loads(line.strip())
                if 'instruction' not in entry:
                    entry['instruction'] = default_instruction
                data.append(entry)
            except json.JSONDecodeError as e:
                logger.warning(f"Error parsing line {i}: {e}")
    
    logger.info(f"Loaded {len(data)} existing entries")
    return data


def select_diverse_examples(
    data: List[Dict], 
    target_domain: str,
    num_examples: int = 5
) -> List[Dict]:
    """
    Select examples that are DIFFERENT from target domain
    This prevents the model from copying similar examples
    """
    # Filter out examples from the same domain
    different_domain = [d for d in data if d.get('output', {}).get('domain') != target_domain]
    
    # If not enough different examples, use all data
    if len(different_domain) < num_examples:
        different_domain = data
    
    selected = random.sample(different_domain, min(num_examples, len(different_domain)))
    logger.debug(f"Selected {len(selected)} examples from different domains than {target_domain}")
    
    return selected


# ==================== ENHANCED PROMPT CONSTRUCTION ====================

def build_targeted_generation_prompt(
    examples: List[Dict],
    target_domain: str,
    target_subcategory: str,
    topic_suggestions: List[str]
) -> ChatPromptTemplate:
    """Build a domain-targeted generation prompt"""
    
    # Format examples (escape for LangChain)
    example_text = "\n\n".join([
        f"EXAMPLE {i+1}:\n"
        f"Input: {ex['input']}\n"
        f"Output Domain: {ex['output'].get('domain', 'Unknown')}\n"
        f"Output Type: {ex['output'].get('simulation_name', 'Unknown')}"
        for i, ex in enumerate(examples)
    ])
    
    # Format topic suggestions
    topic_hint = ", ".join(random.sample(topic_suggestions, min(5, len(topic_suggestions))))
    
    prompt_template = f"""You are an expert in {target_domain}, specifically in {target_subcategory}.

Your task is to generate a COMPLETELY NEW and CREATIVE simulation description in the field of {target_domain} ({target_subcategory}).

CRITICAL REQUIREMENTS:
1. The simulation MUST be in the domain: {target_domain}
2. The simulation MUST focus on: {target_subcategory}
3. INSPIRATION (not limitations): Example topics include {topic_hint} - but FEEL FREE to create entirely new experiments, procedures, or simulations beyond these examples
4. The simulation MUST be COMPLETELY DIFFERENT from all examples below
5. Use realistic equations, parameters, and physical principles from {target_domain}
6. BE CREATIVE: Invent new lab procedures, combine concepts, or design novel experiments within {target_subcategory}

EXAMPLES FROM OTHER DOMAINS (DO NOT COPY - THESE ARE DIFFERENT FIELDS):
{example_text}

WHAT TO GENERATE:
- Create an original simulation that a student, researcher, or engineer in {target_domain} would actually use
- You can design NEW lab procedures, experiments, or analytical methods not listed in the examples
- Include proper mathematical equations relevant to {target_subcategory}
- Use standard terminology and notation from {target_domain}
- Make it scientifically accurate with realistic parameters
- Ensure the simulation is practical, educational, and innovative

FORMAT REQUIREMENTS:
Your response must be a JSON object with these THREE fields:
1. "instruction": "Convert the following natural language simulation description into a structured SSD format with all necessary components including simulation name, domain, equations, parameters, and constraints."
2. "input": Natural language description of what the user wants to simulate (2-4 sentences)
3. "output": Complete structured SSD specification with:
   - simulation_name: Descriptive name (e.g., "Doppler Effect Analyzer", "Enzyme Kinetics Model")
   - domain: MUST be "{target_domain}"
   - description: What the simulation does
   - assumptions: List of simplifying assumptions
   - entities: Physical objects/components (if applicable)
   - constants: Physical constants used (name, symbol, value, unit)
   - parameters: Adjustable parameters (name, symbol, unit, range [min, max])
   - equations: Mathematical relationships (description, expression, condition)
   - initial_conditions: Starting state
   - outputs: What results the simulation produces
   - simulation_controls: User-adjustable parameters
   - constraints: System limitations

CRITICAL: 
- Domain must be EXACTLY "{target_domain}"
- Must focus on {target_subcategory}
- Must be different from all examples
- Must be scientifically accurate
- Return ONLY the JSON object, no other text

Generate the simulation now:"""

    return ChatPromptTemplate.from_messages([
        ("system", f"You are an expert in {target_domain} and {target_subcategory}. Generate accurate, diverse simulation specifications."),
        ("user", prompt_template)
    ])


def build_validation_prompt(entry: Dict, examples: List[Dict], target_domain: str) -> ChatPromptTemplate:
    """Build the validation prompt for critic agent"""
    
    example_summaries = "\n".join([
        f"  - {ex['output']['domain']}: {ex['output']['simulation_name']}"
        for ex in examples[:3]
    ])
    
    prompt_template = f"""You are an expert scientific reviewer validating simulation descriptions for a high-quality dataset.

TARGET DOMAIN: {target_domain}

ENTRY TO VALIDATE:
```json
{json.dumps(entry, indent=2).replace('{', '{{').replace('}', '}}')}
```

EXISTING EXAMPLES FOR COMPARISON:
{example_summaries}

VALIDATION CRITERIA:

1. **Domain Accuracy** (CRITICAL): 
   - Domain must be EXACTLY "{target_domain}"
   - If domain doesn't match, score 0.0 and REJECT

2. **Scientific Accuracy** (0-10):
   - Physical laws, equations, and principles must be correct
   - Units must be consistent and standard
   - Constants must have accurate values
   - Mathematical notation must be proper

3. **Mathematical Correctness** (0-10):
   - Equations must be syntactically valid
   - Variables must be defined in parameters
   - Expressions must use standard notation
   - No undefined symbols

4. **Format Compliance** (0-10):
   - All required SSD fields present
   - Proper data types and structure
   - Parameter ranges are [min, max]
   - Non-empty critical fields

5. **Diversity** (0-10):
   - Must be DIFFERENT from examples
   - Must NOT duplicate existing simulation types
   - Should have unique problem formulation

6. **Completeness** (0-10):
   - Sufficient parameters (at least 3)
   - Adequate equations (at least 2)
   - Realistic constraints
   - Clear initial conditions
   - Meaningful outputs

QUALITY THRESHOLDS:
- Domain mismatch → REJECT immediately
- Overall quality ≥ 7.0 → ACCEPT
- Overall quality 5.0-6.9 → REVISE
- Overall quality < 5.0 → REJECT
- Any score < 4.0 in critical areas → REJECT

Provide detailed feedback with scores, issues, strengths, and recommendation."""

    return ChatPromptTemplate.from_messages([
        ("system", "You are a rigorous scientific reviewer ensuring data quality."),
        ("user", prompt_template)
    ])


# ==================== ENHANCED GENERATION ENGINE ====================

class SimulationGenerator:
    """Enhanced generator with diversity enforcement"""
    
    def __init__(
        self,
        vllm_base_url: str,
        model_name: str,
        temperature: float = 0.8,
        max_tokens: int = 2000,
        enable_critic: bool = True,
        min_quality_score: float = 7.0
    ):
        logger.info(f"Initializing Enhanced SimulationGenerator")
        logger.info(f"VLLM URL: {vllm_base_url}")
        logger.info(f"Model: {model_name}")
        logger.info(f"Temperature: {temperature}")
        logger.info(f"Critic: {'ENABLED' if enable_critic else 'DISABLED'}")
        
        self.enable_critic = enable_critic
        self.min_quality_score = min_quality_score
        
        # Initialize diversity manager
        self.diversity_manager = DiversityManager(DOMAIN_CATALOG)
        logger.info(f"[OK] Diversity Manager initialized with {len(DOMAIN_CATALOG)} domains")
        
        # Generator LLM
        self.generator_llm = ChatOpenAI(
            base_url=vllm_base_url,
            api_key="EMPTY",
            model=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=120,
            max_retries=2
        )
        
        # Critic LLM
        self.critic_llm = ChatOpenAI(
            base_url=vllm_base_url,
            api_key="EMPTY",
            model=model_name,
            temperature=0.3,
            max_tokens=1500,
            timeout=120,
            max_retries=2
        )
        
        # Structured output setup
        self.use_structured = False
        try:
            self.structured_generator = self.generator_llm.with_structured_output(DatasetEntry)
            self.structured_critic = self.critic_llm.with_structured_output(ValidationFeedback)
            self.use_structured = True
            logger.info("[OK] Structured output enabled")
        except:
            logger.info("Will use JSON parsing fallback")
            self.use_structured = False
        
        self.stats = {
            'generated': 0,
            'accepted': 0,
            'rejected': 0,
            'domain_mismatch': 0,
            'quality_scores': []
        }
    
    def test_api_connection(self) -> bool:
        """Test API connection"""
        logger.info("Testing API connection...")
        try:
            from langchain_core.messages import HumanMessage
            test_messages = [HumanMessage(content="Test connection. Respond: OK")]
            response = self.generator_llm.invoke(test_messages)
            
            if hasattr(response, 'content'):
                logger.info(f"✓ API connection successful")
                return True
            else:
                logger.error(f"✗ Unexpected response type")
                return False
        except Exception as e:
            logger.error(f"✗ API test failed: {e}")
            return False
    
    def validate_with_critic(
        self, 
        entry: Dict, 
        examples: List[Dict],
        target_domain: str
    ) -> Optional[ValidationFeedback]:
        """Validate with critic agent"""
        if not self.enable_critic:
            return None
        
        try:
            prompt = build_validation_prompt(entry, examples, target_domain)
            
            if self.use_structured:
                chain = prompt | self.structured_critic
                feedback = chain.invoke({})
            else:
                chain = prompt | self.critic_llm
                response = chain.invoke({})
                content = response.content
                
                start_idx = content.find('{')
                end_idx = content.rfind('}') + 1
                if start_idx == -1 or end_idx == 0:
                    logger.error("No JSON in critic response")
                    return None
                
                json_str = content[start_idx:end_idx]
                feedback_dict = json.loads(json_str)
                feedback = ValidationFeedback(**feedback_dict)
            
            return feedback
            
        except Exception as e:
            logger.error(f"Critic validation error: {e}")
            return None
    
    def generate_single_entry(
        self,
        examples: List[Dict],
        target_domain: str,
        target_subcategory: str,
        topic_suggestions: List[str],
        simulation_number: int,
        max_retries: int = 3
    ) -> Optional[Dict]:
        """Generate a single simulation entry with domain targeting"""
        
        logger.info(f"{'='*60}")
        logger.info(f"Generating #{simulation_number}: {target_domain} -> {target_subcategory}")
        
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    logger.info(f"  Retry {attempt}/{max_retries}")
                
                prompt = build_targeted_generation_prompt(
                    examples, 
                    target_domain, 
                    target_subcategory,
                    topic_suggestions
                )
                
                if self.use_structured:
                    chain = prompt | self.structured_generator
                    result = chain.invoke({})
                    entry = result.dict()
                else:
                    chain = prompt | self.generator_llm
                    response = chain.invoke({})
                    content = response.content
                    
                    start_idx = content.find('{')
                    end_idx = content.rfind('}') + 1
                    
                    if start_idx == -1 or end_idx == 0:
                        logger.error("No JSON in response")
                        continue
                    
                    json_str = content[start_idx:end_idx]
                    entry = json.loads(json_str)
                
                # Validate required fields
                if 'input' not in entry or 'output' not in entry:
                    logger.error("Missing input/output")
                    continue
                
                if 'instruction' not in entry:
                    entry['instruction'] = "Convert the following natural language simulation description into a structured SSD format with all necessary components."
                
                # CHECK DOMAIN MATCH
                generated_domain = entry['output'].get('domain', '')
                if generated_domain != target_domain:
                    logger.warning(f"[X] Domain mismatch: expected '{target_domain}', got '{generated_domain}'")
                    self.stats['domain_mismatch'] += 1
                    continue
                
                logger.info(f"[OK] Generated: {entry['output'].get('simulation_name', 'Unknown')}")
                logger.info(f"  Domain: {generated_domain} ✓")
                logger.info(f"  Subcategory: {target_subcategory}")
                logger.info(f"  Parameters: {len(entry['output'].get('parameters', []))}")
                logger.info(f"  Equations: {len(entry['output'].get('equations', []))}")
                
                return entry
                
            except Exception as e:
                logger.error(f"[X] Generation error (attempt {attempt+1}): {e}")
                if attempt == max_retries:
                    return None
        
        return None
    
    def generate_dataset(
        self,
        existing_data: List[Dict],
        target_size: int = 10000,
        num_examples: int = 5,
        output_file: str = "extended_dataset.jsonl",
        checkpoint_interval: int = 50
    ):
        """Generate diverse dataset with domain rotation"""
        
        logger.info(f"\n{'='*60}")
        logger.info(f"ENHANCED DATASET GENERATION - DIVERSITY ENFORCED")
        logger.info(f"{'='*60}")
        logger.info(f"Using {len(existing_data)} examples for few-shot prompting")
        logger.info(f"Target: {target_size} diverse samples")
        logger.info(f"Domains: {len(DOMAIN_CATALOG)} major fields")
        logger.info(f"Subcategories: {sum(len(v['subcategories']) for v in DOMAIN_CATALOG.values())}")
        logger.info(f"Output: {output_file}")
        logger.info(f"{'='*60}\n")
        
        # Check if output file exists and count existing entries
        starting_count = 0
        if Path(output_file).exists():
            logger.info(f"[NOTICE] Output file exists: {output_file}")
            try:
                with open(output_file, 'r', encoding='utf-8') as f:
                    starting_count = sum(1 for _ in f)
                logger.info(f"[NOTICE] Appending to existing file with {starting_count} entries")
            except Exception as e:
                logger.warning(f"Could not count existing entries: {e}")
        else:
            logger.info(f"[NOTICE] Creating new output file: {output_file}")
            # Create new file if it doesn't exist
            with open(output_file, 'w', encoding='utf-8') as f:
                pass
        
        # Test API
        if not self.test_api_connection():
            logger.error("[X] API connection failed - aborting")
            return
        
        logger.info("[OK] API verified - starting generation\n")
        
        # Generation loop
        generated = 0
        failed = 0
        rejected_by_critic = 0
        consecutive_failures = 0
        max_consecutive_failures = 15
        
        for i in range(target_size):
            simulation_number = i + 1
            
            # Get next domain target from diversity manager
            target_domain, target_subcategory = self.diversity_manager.get_next_domain_target()
            topic_suggestions = self.diversity_manager.get_topic_suggestions(target_domain)
            
            logger.info(f"\n--- Sample {i+1}/{target_size} ---")
            logger.info(f"Target: {target_domain} :: {target_subcategory}")
            
            # Select diverse examples (different from target domain)
            examples = select_diverse_examples(
                existing_data,
                target_domain,
                num_examples
            )
            
            # Generate entry
            entry = self.generate_single_entry(
                examples,
                target_domain,
                target_subcategory,
                topic_suggestions,
                simulation_number
            )
            
            if entry:
                # Validate format
                if not self._validate_ssd_format(entry):
                    failed += 1
                    consecutive_failures += 1
                    logger.warning(f"[X] Format validation failed")
                    continue
                
                # Critic validation
                if self.enable_critic:
                    feedback = self.validate_with_critic(
                        entry, 
                        examples,
                        target_domain
                    )
                    
                    if feedback:
                        self.stats['quality_scores'].append(feedback.quality_score)
                        
                        logger.info(f"\n[CRITIC] Evaluation:")
                        logger.info(f"   Quality: {feedback.quality_score:.1f}/10")
                        logger.info(f"   Scientific: {feedback.scientific_accuracy:.1f}/10")
                        logger.info(f"   Math: {feedback.mathematical_correctness:.1f}/10")
                        logger.info(f"   Diversity: {feedback.diversity_score:.1f}/10")
                        logger.info(f"   Recommendation: {feedback.recommendation}")
                        
                        if feedback.quality_score < self.min_quality_score or feedback.recommendation == "REJECT":
                            rejected_by_critic += 1
                            consecutive_failures += 1
                            logger.warning(f"[X] REJECTED (score: {feedback.quality_score:.1f})")
                            continue
                        
                        logger.info(f"[OK] ACCEPTED ✓")
                
                # Save entry
                with open(output_file, 'a', encoding='utf-8') as f:
                    f.write(json.dumps(entry, ensure_ascii=False) + '\n')
                
                generated += 1
                consecutive_failures = 0
                self.stats['accepted'] += 1
                
                # Record for diversity tracking
                self.diversity_manager.record_generated(
                    target_domain,
                    entry['output'].get('simulation_name', '')
                )
                
                # Checkpoint
                if generated % checkpoint_interval == 0:
                    stats = self.diversity_manager.get_diversity_stats()
                    avg_quality = sum(self.stats['quality_scores']) / len(self.stats['quality_scores']) if self.stats['quality_scores'] else 0
                    
                    logger.info(f"\n{'='*60}")
                    logger.info(f"CHECKPOINT: {generated}/{target_size}")
                    logger.info(f"Acceptance: {generated/(generated+failed+rejected_by_critic)*100:.1f}%")
                    logger.info(f"Avg Quality: {avg_quality:.2f}/10")
                    logger.info(f"Unique Domains: {stats['unique_domains']}")
                    logger.info(f"Unique Subcategories: {stats['unique_subcategories']}")
                    logger.info(f"Domain mismatches: {self.stats['domain_mismatch']}")
                    logger.info(f"Top domains: {stats['most_common_domains'][:3]}")
                    logger.info(f"{'='*60}\n")
            else:
                failed += 1
                consecutive_failures += 1
                logger.warning(f"[X] Generation failed")
            
            # Safety check
            if consecutive_failures >= max_consecutive_failures:
                logger.error(f"\n[X] {max_consecutive_failures} consecutive failures - stopping")
                break
        
        # Final summary
        stats = self.diversity_manager.get_diversity_stats()
        avg_quality = sum(self.stats['quality_scores']) / len(self.stats['quality_scores']) if self.stats['quality_scores'] else 0
        
        logger.info(f"\n{'='*80}")
        logger.info(f"GENERATION COMPLETE")
        logger.info(f"{'='*80}")
        logger.info(f"[OK] Generated: {generated}")
        logger.info(f"[X] Failed: {failed}")
        logger.info(f"[X] Rejected by critic: {rejected_by_critic}")
        logger.info(f"[X] Domain mismatches: {self.stats['domain_mismatch']}")
        logger.info(f"[STAT] Avg quality: {avg_quality:.2f}/10")
        logger.info(f"[STAT] Unique domains: {stats['unique_domains']}")
        logger.info(f"[STAT] Unique subcategories: {stats['unique_subcategories']}")
        logger.info(f"[FILE] Output: {output_file}")
        logger.info(f"\nDomain Distribution:")
        for domain, count in stats['most_common_domains']:
            logger.info(f"  {domain}: {count}")
        logger.info(f"{'='*80}\n")
    
    def _validate_ssd_format(self, entry: Dict) -> bool:
        """Validate SSD format"""
        try:
            if 'input' not in entry or 'output' not in entry:
                logger.error("Missing input/output")
                return False
            
            if 'instruction' not in entry:
                entry['instruction'] = "Convert the following natural language simulation description into a structured SSD format."
            
            if not isinstance(entry['input'], str) or len(entry['input'].strip()) < 10:
                logger.error("Invalid input")
                return False
            
            output = entry['output']
            if not isinstance(output, dict):
                logger.error("Output not a dict")
                return False
            
            required = [
                'simulation_name', 'domain', 'description', 'assumptions',
                'parameters', 'equations', 'initial_conditions',
                'outputs', 'simulation_controls'
            ]
            
            missing = [f for f in required if f not in output]
            if missing:
                logger.error(f"Missing fields: {missing}")
                return False
            
            if not output['simulation_name'] or not output['simulation_name'].strip():
                logger.error("Empty simulation_name")
                return False
            
            if not output['domain'] or not output['domain'].strip():
                logger.error("Empty domain")
                return False
            
            if not isinstance(output['parameters'], list) or len(output['parameters']) == 0:
                logger.error("Invalid parameters")
                return False
            
            if not isinstance(output['equations'], list) or len(output['equations']) == 0:
                logger.error("Invalid equations")
                return False
            
            logger.debug("[OK] Format validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return False


# ==================== MAIN ====================

def main():
    """Main execution"""
    
    # Configuration
    INPUT_FILE = "model1_samples.jsonl"
    OUTPUT_FILE = "extended_simulations_diverse_10k.jsonl"
    TARGET_SIZE = 10000
    VLLM_BASE_URL = "http://164.52.193.86:8000/v1"
    MODEL_NAME = "Qwen/Qwen3-30B-A3B-GPTQ-Int4"
    NUM_EXAMPLES = 5
    TEMPERATURE = 0.9
    CHECKPOINT_INTERVAL = 50
    
    logger.info("="*80)
    logger.info("ENHANCED DATASET GENERATION - DIVERSITY ENFORCED")
    logger.info("="*80)
    logger.info(f"Input: {INPUT_FILE}")
    logger.info(f"Output: {OUTPUT_FILE}")
    logger.info(f"Target: {TARGET_SIZE:,} diverse samples")
    logger.info(f"Strategy: Domain rotation + subcategory targeting")
    logger.info(f"VLLM: {VLLM_BASE_URL}")
    logger.info(f"Model: {MODEL_NAME}")
    logger.info(f"Temperature: {TEMPERATURE}")
    logger.info("="*80)
    
    # Load data
    script_dir = Path(__file__).parent
    input_path = script_dir / INPUT_FILE
    output_path = script_dir / OUTPUT_FILE
    
    if not input_path.exists():
        logger.error(f"[X] Input file not found: {input_path}")
        return
    
    existing_data = load_existing_dataset(str(input_path))
    
    if len(existing_data) == 0:
        logger.error("[X] No data loaded")
        return
    
    logger.info(f"[OK] Loaded {len(existing_data)} examples")
    
    # Initialize generator
    try:
        generator = SimulationGenerator(
            vllm_base_url=VLLM_BASE_URL,
            model_name=MODEL_NAME,
            temperature=TEMPERATURE,
            enable_critic=True,
            min_quality_score=7.0
        )
        logger.info("[OK] Generator initialized")
    except Exception as e:
        logger.error(f"[X] Initialization failed: {e}")
        return
    
    # Generate dataset
    try:
        generator.generate_dataset(
            existing_data=existing_data,
            target_size=TARGET_SIZE,
            num_examples=NUM_EXAMPLES,
            output_file=str(output_path),
            checkpoint_interval=CHECKPOINT_INTERVAL
        )
        logger.info(f"[OK] Complete! Output: {output_path}")
    except KeyboardInterrupt:
        logger.warning("\n⚠ Interrupted by user")
        logger.info(f"Partial results: {output_path}")
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        logger.error(traceback.format_exc())


if __name__ == "__main__":
    main()