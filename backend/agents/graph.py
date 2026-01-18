"""
Emergency Dispatcher Agent Graph

Orchestrates multiple specialized agents to process emergency calls
and provide dispatch recommendations.
"""

import os
import json
import logging
import traceback
from pathlib import Path
from typing import Literal, Annotated, Callable, TypeVar
from functools import wraps
from typing_extensions import TypedDict

from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


# =============================================================================
# Error Handling
# =============================================================================

class AgentError(Exception):
    """Custom exception for agent-related errors."""
    def __init__(self, agent_name: str, message: str, recoverable: bool = True):
        self.agent_name = agent_name
        self.message = message
        self.recoverable = recoverable
        super().__init__(f"[{agent_name}] {message}")


T = TypeVar('T')


def with_error_handling(agent_name: str, default_return: dict | Callable[[], dict]):
    """
    Decorator that wraps agent functions with error handling.
    
    Provides:
    - Logging of errors
    - Graceful fallback to default values
    - Consistent error structure in the response
    
    Args:
        agent_name: Name of the agent for logging
        default_return: Default dict to return on error, or a callable that returns a dict
    """
    def decorator(func: Callable[..., dict]) -> Callable[..., dict]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> dict:
            try:
                return func(*args, **kwargs)
            except json.JSONDecodeError as e:
                logger.warning(
                    f"[{agent_name}] JSON parsing error: {e}. Using fallback response."
                )
                fallback = default_return() if callable(default_return) else default_return
                return {**fallback, "_error": f"JSON parsing error: {str(e)}"}
            except ValueError as e:
                logger.error(f"[{agent_name}] Configuration error: {e}")
                fallback = default_return() if callable(default_return) else default_return
                return {**fallback, "_error": f"Configuration error: {str(e)}"}
            except ConnectionError as e:
                logger.error(f"[{agent_name}] Connection error: {e}")
                fallback = default_return() if callable(default_return) else default_return
                return {**fallback, "_error": f"Connection error: {str(e)}"}
            except Exception as e:
                logger.error(
                    f"[{agent_name}] Unexpected error: {e}\n{traceback.format_exc()}"
                )
                fallback = default_return() if callable(default_return) else default_return
                return {**fallback, "_error": f"Unexpected error: {str(e)}"}
        return wrapper
    return decorator


def safe_json_parse(content: str, agent_name: str) -> dict | None:
    """
    Safely parse JSON content with error logging.
    
    Attempts to extract JSON from the content even if it contains
    extra text before or after the JSON object.
    """
    content = content.strip()
    
    # Try direct parse first
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON object in the content
    try:
        # Find first { and last }
        start = content.find('{')
        end = content.rfind('}')
        if start != -1 and end != -1 and end > start:
            json_str = content[start:end + 1]
            return json.loads(json_str)
    except json.JSONDecodeError:
        pass
    
    logger.warning(f"[{agent_name}] Could not parse JSON from response: {content[:200]}...")
    return None


# =============================================================================
# Model Configuration
# =============================================================================

def get_model():
    """Get the Groq model instance."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not found. Please set it in backend/.env")
    
    return ChatGroq(
        model="llama-3.3-70b-versatile",  # Free tier model
        temperature=0.1,
        api_key=api_key,
        timeout=30,  # Add timeout to prevent hanging
        max_retries=2,  # Add retries for transient errors
    )


# =============================================================================
# State Schema
# =============================================================================

class DispatcherState(TypedDict):
    """Shared state across all agents in the dispatcher graph."""
    
    # Input
    transcript: str
    
    # Extraction Agent
    extracted: dict  # location, injuries, hazards, people_count, weapons, etc.
    
    # Triage Agent
    incident_type: str
    severity: Literal["P1", "P2", "P3", "P4"] | None
    key_risks: list[str]
    
    # Next-Question Agent
    missing_info: list[str]
    suggested_questions: list[str]
    info_complete: bool
    
    # Dispatch Planner
    dispatch_recommendation: dict  # resources, priority, rationale
    
    # Resource Locator
    nearest_resources: list[dict]  # station, type, eta
    
    # Guardrail validation
    validated_output: dict
    
    # After-Action Evaluator
    evaluation_report: dict
    
    # Message history for agent reasoning
    messages: Annotated[list, add_messages]


# =============================================================================
# Agent Nodes
# =============================================================================

@with_error_handling("extraction", {
    "extracted": {
        "location": None,
        "injuries": None,
        "hazards": None,
        "people_count": None,
        "caller_info": None,
    }
})
def extraction_agent(state: DispatcherState) -> dict:
    """
    Extraction Agent
    
    Pulls out critical details from the transcript:
    - Location/address clues
    - Injuries/symptoms
    - Hazards
    - Number of people
    - Weapons/fire/smoke
    """
    model = get_model()
    
    system_prompt = """You are an Extraction Agent for emergency dispatch.
Your job is to extract critical information from emergency call transcripts.

Extract the following fields (use null if not mentioned):
- location: address, cross streets, landmarks
- injuries: type and description of injuries/symptoms
- hazards: weapons, fire, smoke, chemicals, etc.
- people_count: number of people involved/affected
- caller_info: who is calling, their relation to the incident

Respond ONLY with valid JSON in this exact format:
{
    "location": "string or null",
    "injuries": "string or null",
    "hazards": "string or null",
    "people_count": "number or null",
    "caller_info": "string or null"
}"""

    response = model.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Transcript: {state['transcript']}")
    ])
    
    extracted = safe_json_parse(response.content, "extraction")
    if extracted is None:
        extracted = {"raw_response": response.content[:500]}
    
    logger.info(f"[extraction] Extracted: {list(extracted.keys())}")
    return {"extracted": extracted}


@with_error_handling("triage", {
    "incident_type": "unknown - processing error",
    "severity": "P2",
    "key_risks": ["Unable to complete triage - manual review recommended"]
})
def triage_agent(state: DispatcherState) -> dict:
    """
    Triage Agent
    
    Uses extracted details to identify:
    - Incident type (cardiac arrest, house fire, etc.)
    - Severity/priority level
    - Key risks
    """
    model = get_model()
    
    system_prompt = """You are a Triage Agent for emergency dispatch.
Based on the extracted information, classify the emergency.

Priority levels:
- P1: Life-threatening, immediate response (cardiac arrest, active shooter, structure fire with entrapment)
- P2: Urgent, serious but stable (chest pain, house fire no entrapment, assault in progress)
- P3: Non-urgent, needs response (minor injuries, property crime, small fire contained)
- P4: Low priority, can wait (noise complaint, non-injury accident, information only)

Respond ONLY with valid JSON in this exact format:
{
    "incident_type": "brief description like 'possible cardiac arrest' or 'house fire with entrapment'",
    "severity": "P1 or P2 or P3 or P4",
    "key_risks": ["list", "of", "key", "risks"]
}"""

    context = f"""Transcript: {state['transcript']}
    
Extracted Information: {json.dumps(state.get('extracted', {}), indent=2)}"""

    response = model.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=context)
    ])
    
    result = safe_json_parse(response.content, "triage")
    if result is None:
        return {
            "incident_type": "unknown",
            "severity": "P2",
            "key_risks": ["Unable to parse triage response"]
        }
    
    logger.info(f"[triage] Incident: {result.get('incident_type')}, Severity: {result.get('severity')}")
    return {
        "incident_type": result.get("incident_type", "unknown"),
        "severity": result.get("severity"),
        "key_risks": result.get("key_risks", [])
    }


@with_error_handling("next_question", {
    "missing_info": ["Unable to analyze - manual review needed"],
    "suggested_questions": ["Can you confirm your exact location?", "Is anyone injured?", "Are you in a safe place?"],
    "info_complete": False
})
def next_question_agent(state: DispatcherState) -> dict:
    """
    Next-Question Agent
    
    Proposes top 3 questions the dispatcher should ask next
    based on what's missing (address, breathing status, hazards, etc.)
    
    Questions must be ethically appropriate, empathetic, and trauma-informed.
    """
    model = get_model()
    
    system_prompt = """You are a Next-Question Agent for emergency dispatch.
Analyze what critical information is missing and suggest the top 3 questions the dispatcher should ask.

Essential information for dispatch includes:
- Exact location (address, cross streets, apartment number)
- Nature of emergency (what happened)
- Number of people involved
- Injuries and current condition (conscious? breathing?)
- Hazards (weapons, fire, chemicals)
- Caller's location (are they safe?)

=== ETHICAL GUIDELINES FOR QUESTIONS ===

Your suggested questions MUST follow these ethical principles:

1. EMPATHETIC & CALMING: Callers are often panicked, traumatized, or in crisis.
   - Good: "I understand this is stressful. Can you tell me where you are right now?"
   - Bad: "What's the address? I need the address now."

2. NON-JUDGMENTAL: Never imply blame or make assumptions about the situation.
   - Good: "Is anyone injured that you can see?"
   - Bad: "Did you cause this? Were you involved?"

3. TRAUMA-INFORMED: Be sensitive to potential victims of violence or abuse.
   - Good: "Are you in a safe place to talk?"
   - Bad: "Why didn't you leave sooner?"

4. CLEAR & SIMPLE: Use plain language; the caller may be in shock or distress.
   - Good: "Is the person breathing?"
   - Bad: "Can you assess their respiratory status?"

5. SAFETY-FOCUSED: Prioritize getting help to people, not investigating.
   - Good: "Help is on the way. Is anyone else hurt?"
   - Bad: "Who started the fight? We need to know who's responsible."

6. NON-DISCRIMINATORY: Never ask about:
   - Immigration status
   - Insurance or ability to pay
   - Race, ethnicity, or religion (unless for identifying missing persons)
   - Housing status or income

7. RESPECT CALLER AUTONOMY: If caller seems reluctant, don't pressure.
   - Good: "I want to help you. What can you tell me about where you are?"
   - Bad: "You have to tell me or I can't send help."

Respond ONLY with valid JSON in this exact format:
{
    "missing_info": ["list of critical missing information"],
    "suggested_questions": ["Question 1?", "Question 2?", "Question 3?"],
    "info_complete": false
}

Set info_complete to true ONLY if we have: location, nature of emergency, and patient/victim status."""

    context = f"""Transcript: {state['transcript']}

Extracted Information: {json.dumps(state.get('extracted', {}), indent=2)}

Incident Type: {state.get('incident_type', 'unknown')}
Severity: {state.get('severity', 'unknown')}"""

    response = model.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=context)
    ])
    
    result = safe_json_parse(response.content, "next_question")
    if result is None:
        return {
            "missing_info": ["Unable to analyze"],
            "suggested_questions": ["Can you confirm your exact location?"],
            "info_complete": False
        }
    
    logger.info(f"[next_question] Info complete: {result.get('info_complete')}, Missing: {len(result.get('missing_info', []))} items")
    return {
        "missing_info": result.get("missing_info", []),
        "suggested_questions": result.get("suggested_questions", []),
        "info_complete": result.get("info_complete", False)
    }


def _get_default_dispatch(state: DispatcherState) -> dict:
    """Get default dispatch recommendation based on current state."""
    return {
        "dispatch_recommendation": {
            "resources": {"ems": "yes", "fire": "no", "police": "no"},
            "priority": state.get("severity", "P2"),
            "rationale": "Default dispatch - manual review recommended",
            "special_units": []
        }
    }


@with_error_handling("dispatch_planner", lambda: {
    "dispatch_recommendation": {
        "resources": {"ems": "yes", "fire": "no", "police": "no"},
        "priority": "P2",
        "rationale": "Default dispatch due to processing error",
        "special_units": []
    }
})
def dispatch_planner_agent(state: DispatcherState) -> dict:
    """
    Dispatch Planner Agent
    
    Recommends which resources to send:
    - EMS, Fire, Police
    - Priority level
    - Short rationale
    """
    model = get_model()
    
    system_prompt = """You are a Dispatch Planner Agent for emergency services.
Based on the incident information, recommend which resources to dispatch.

Respond ONLY with valid JSON:
{"resources": {"ems": "yes", "fire": "no", "police": "yes"}, "priority": "P1", "rationale": "Brief reason", "special_units": []}

Rules:
- ems/fire/police: "yes" if needed, "no" if not
- priority: P1 (life-threatening), P2 (urgent), P3 (non-urgent), P4 (low)
- special_units: HAZMAT, K9, SWAT if needed, otherwise empty []"""

    context = f"""Incident Type: {state.get('incident_type', 'unknown')}
Severity: {state.get('severity', 'unknown')}
Key Risks: {', '.join(state.get('key_risks', []))}

Extracted Information: {json.dumps(state.get('extracted', {}), indent=2)}

Original Transcript: {state['transcript']}"""

    response = model.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=context)
    ])
    
    result = safe_json_parse(response.content, "dispatch_planner")
    if result is None:
        return _get_default_dispatch(state)
    
    logger.info(f"[dispatch_planner] Resources: {result.get('resources')}, Priority: {result.get('priority')}")
    return {"dispatch_recommendation": result}


@with_error_handling("resource_locator", {"nearest_resources": []})
def resource_locator_agent(state: DispatcherState) -> dict:
    """
    Resource Locator Tool Agent (MCP-backed)
    
    Automatically locates nearest:
    - Fire station
    - Police
    - Hospital
    
    Uses dummy map data + ETA estimate.
    """
    # Get the resources we need to locate
    dispatch_rec = state.get("dispatch_recommendation", {})
    resources_needed = dispatch_rec.get("resources", {})
    location = state.get("extracted", {}).get("location", "Unknown location")
    
    # Dummy resource database (replace with MCP calls)
    resource_database = {
        "ems": [
            {"name": "Medic Unit 7", "station": "Station 7", "distance_miles": 1.2, "eta_minutes": 4},
            {"name": "Ambulance 12", "station": "Central Hospital", "distance_miles": 2.5, "eta_minutes": 7},
        ],
        "fire": [
            {"name": "Engine 3", "station": "Fire Station 3", "distance_miles": 0.8, "eta_minutes": 3},
            {"name": "Ladder 1", "station": "Fire Station 1", "distance_miles": 1.5, "eta_minutes": 5},
        ],
        "police": [
            {"name": "Unit 42", "station": "Patrol Zone 4", "distance_miles": 0.5, "eta_minutes": 2},
            {"name": "Unit 17", "station": "Patrol Zone 1", "distance_miles": 1.8, "eta_minutes": 6},
        ],
    }
    
    # Find nearest resources for each type needed
    nearest_resources = []
    
    # Handle both dict format {"ems": "yes"} and list format ["EMS", "FIRE"]
    if isinstance(resources_needed, dict):
        for resource_type, needed in resources_needed.items():
            if needed == "yes" and resource_type.lower() in resource_database:
                available = resource_database[resource_type.lower()]
                if available:
                    nearest = available[0]
                    nearest_resources.append({
                        "type": resource_type.upper(),
                        "unit": nearest["name"],
                        "station": nearest["station"],
                        "eta_minutes": nearest["eta_minutes"],
                        "distance_miles": nearest["distance_miles"],
                        "destination": location
                    })
    elif isinstance(resources_needed, list):
        for resource_type in resources_needed:
            if resource_type.lower() in resource_database:
                available = resource_database[resource_type.lower()]
                if available:
                    nearest = available[0]
                    nearest_resources.append({
                        "type": resource_type.upper(),
                        "unit": nearest["name"],
                        "station": nearest["station"],
                        "eta_minutes": nearest["eta_minutes"],
                        "distance_miles": nearest["distance_miles"],
                        "destination": location
                    })
    
    logger.info(f"[resource_locator] Found {len(nearest_resources)} nearest resources")
    return {"nearest_resources": nearest_resources}


@with_error_handling("safety_guardrail", lambda: {
    "validated_output": {
        "is_valid": True,
        "sanitized_recommendation": {},
        "flags": ["Safety guardrail processing error - manual review required"],
        "blocked": False,
        "block_reason": None
    }
})
def safety_guardrail_agent(state: DispatcherState) -> dict:
    """
    Safety Guardrail Agent
    
    Ensures all outputs:
    - Are framed as recommendations (not commands)
    - Use safe language
    - Pass structured output validation
    """
    model = get_model()
    
    system_prompt = """You are a Safety Guardrail Agent for emergency dispatch.
Your job is to validate and sanitize the dispatch recommendations before they are shown to the dispatcher.

Rules:
1. Frame all outputs as RECOMMENDATIONS, not commands (e.g., "Recommend dispatching..." not "Dispatch...")
2. Ensure no harmful or inappropriate language
3. Verify the response makes sense given the incident
4. Add safety reminders for responders if needed
5. Flag any concerns about the recommendations

Respond ONLY with valid JSON in this exact format:
{
    "is_valid": true,
    "sanitized_recommendation": {
        "summary": "Brief summary of recommended action",
        "resources": ["list of resources to dispatch"],
        "priority": "P1/P2/P3/P4",
        "eta_summary": "Nearest unit ETA",
        "safety_notes": ["any safety reminders for responders"],
        "dispatcher_script": "What the dispatcher should say to the caller"
    },
    "flags": ["any concerns or issues to highlight"],
    "blocked": false,
    "block_reason": null
}"""

    context = f"""Incident Type: {state.get('incident_type', 'unknown')}
Severity: {state.get('severity', 'unknown')}

Dispatch Recommendation: {json.dumps(state.get('dispatch_recommendation', {}), indent=2)}

Nearest Resources: {json.dumps(state.get('nearest_resources', []), indent=2)}

Key Risks: {', '.join(state.get('key_risks', []))}"""

    response = model.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=context)
    ])
    
    result = safe_json_parse(response.content, "safety_guardrail")
    if result is None:
        # Fallback: pass through with warning
        return {
            "validated_output": {
                "is_valid": True,
                "sanitized_recommendation": state.get("dispatch_recommendation", {}),
                "flags": ["Guardrail parsing failed - review manually"],
                "blocked": False,
                "block_reason": None
            }
        }
    
    logger.info(f"[safety_guardrail] Valid: {result.get('is_valid')}, Flags: {len(result.get('flags', []))}")
    return {"validated_output": result}


@with_error_handling("after_action_evaluator", {
    "evaluation_report": {
        "overall_score": 0,
        "error": "Unable to generate evaluation",
        "checklist_scores": {},
        "what_went_well": [],
        "what_was_missed": ["Evaluation could not be completed"],
        "top_improvements": ["Manual review recommended"],
        "training_notes": "Evaluation system encountered an error"
    }
})
def after_action_evaluator_agent(state: DispatcherState) -> dict:
    """
    After-Action Evaluator Agent
    
    Generates an after-action report comparing dispatcher's actions
    vs. an ideal checklist:
    - Score breakdown
    - What was done well
    - What was missed
    - Top improvements
    """
    model = get_model()
    
    system_prompt = """You are an After-Action Evaluator Agent for emergency dispatch training.
Generate a training report evaluating how well the call was handled.

Evaluation checklist:
1. Location confirmed (exact address, cross streets)
2. Nature of emergency identified
3. Number of people affected determined
4. Injuries/medical status assessed (conscious? breathing?)
5. Hazards identified (weapons, fire, chemicals)
6. Caller safety confirmed
7. Appropriate resources dispatched
8. Priority level matches severity
9. ETA communicated

Score each item 0-10 and provide overall feedback.

Respond ONLY with valid JSON in this exact format:
{
    "overall_score": 85,
    "checklist_scores": {
        "location_confirmed": 10,
        "emergency_identified": 8,
        "people_count": 5,
        "medical_status": 7,
        "hazards_identified": 6,
        "caller_safety": 4,
        "resources_appropriate": 9,
        "priority_correct": 8,
        "eta_communicated": 10
    },
    "what_went_well": ["list of things done well"],
    "what_was_missed": ["list of things that could be improved"],
    "top_improvements": ["top 3 actionable improvements for next time"],
    "training_notes": "Additional notes for dispatcher training"
}"""

    context = f"""=== CALL SUMMARY ===

Transcript: {state['transcript']}

Extracted Information: {json.dumps(state.get('extracted', {}), indent=2)}

Triage Result:
- Incident Type: {state.get('incident_type', 'unknown')}
- Severity: {state.get('severity', 'unknown')}
- Key Risks: {', '.join(state.get('key_risks', []))}

Missing Information Identified: {', '.join(state.get('missing_info', []))}

Dispatch Decision: {json.dumps(state.get('dispatch_recommendation', {}), indent=2)}

Resources Assigned: {json.dumps(state.get('nearest_resources', []), indent=2)}"""

    response = model.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=context)
    ])
    
    result = safe_json_parse(response.content, "after_action_evaluator")
    if result is None:
        return {
            "evaluation_report": {
                "overall_score": 0,
                "error": "Unable to generate evaluation",
                "raw_response": response.content[:500]
            }
        }
    
    logger.info(f"[after_action_evaluator] Overall score: {result.get('overall_score')}")
    return {"evaluation_report": result}


# =============================================================================
# Graph Construction
# =============================================================================

def should_dispatch(state: DispatcherState) -> str:
    """
    Routing function to determine if we should proceed to dispatch.
    
    Only proceeds to dispatch_planner if we have enough critical information:
    - info_complete is True, OR
    - We have at minimum: location AND (incident_type is known)
    
    This prevents premature dispatch recommendations while still allowing
    dispatch in cases where we have enough info even if not "complete".
    """
    info_complete = state.get("info_complete", False)
    
    if info_complete:
        logger.info("[router] Info complete - proceeding to dispatch")
        return "dispatch_planner"
    
    # Check for minimum required info even if not "complete"
    extracted = state.get("extracted", {})
    has_location = extracted.get("location") is not None
    incident_type = state.get("incident_type", "unknown")
    has_incident = incident_type and incident_type != "unknown"
    
    if has_location and has_incident:
        logger.info(f"[router] Minimum info available (location + incident) - proceeding to dispatch")
        return "dispatch_planner"
    
    logger.info("[router] Insufficient info - waiting for more details before dispatch")
    return "wait_for_info"


def wait_for_info_node(state: DispatcherState) -> dict:
    """
    Placeholder node when we're waiting for more information.
    
    Returns empty dispatch recommendation to signal to frontend
    that more info is needed before dispatch can be recommended.
    """
    return {
        "dispatch_recommendation": {
            "status": "pending_info",
            "resources": {"ems": "no", "fire": "no", "police": "no"},
            "priority": None,
            "rationale": "Waiting for more information before making dispatch recommendation",
            "special_units": [],
            "needs_more_info": True,
        },
        "nearest_resources": [],
        "validated_output": {
            "is_valid": False,
            "status": "pending_info",
            "message": "More information needed before dispatch recommendation",
            "blocked": False,
        }
    }


def build_dispatcher_graph() -> StateGraph:
    """Build and return the dispatcher agent graph."""
    
    # Create the graph
    graph = StateGraph(DispatcherState)
    
    # Add all agent nodes
    graph.add_node("extraction", extraction_agent)
    graph.add_node("triage", triage_agent)
    graph.add_node("next_question", next_question_agent)
    graph.add_node("dispatch_planner", dispatch_planner_agent)
    graph.add_node("resource_locator", resource_locator_agent)
    graph.add_node("safety_guardrail", safety_guardrail_agent)
    graph.add_node("after_action_evaluator", after_action_evaluator_agent)
    graph.add_node("wait_for_info", wait_for_info_node)
    
    # Define the flow
    graph.add_edge(START, "extraction")
    graph.add_edge("extraction", "triage")
    graph.add_edge("triage", "next_question")  # Always run next_question to detect missing info
    
    # Conditional edge: only proceed to dispatch if we have enough info
    graph.add_conditional_edges(
        "next_question",
        should_dispatch,
        {
            "dispatch_planner": "dispatch_planner",
            "wait_for_info": "wait_for_info",
        }
    )
    
    # Dispatch flow
    graph.add_edge("dispatch_planner", "resource_locator")
    graph.add_edge("resource_locator", "safety_guardrail")
    graph.add_edge("safety_guardrail", END)
    
    # Wait for info just ends - frontend will prompt for more questions
    graph.add_edge("wait_for_info", END)
    
    # After-action evaluator runs separately (after call ends)
    # It's not in the main flow - called independently
    
    return graph


# Compile the graph
dispatcher_graph = build_dispatcher_graph().compile()
