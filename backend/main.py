import json
import logging
import os
import traceback
from typing import Generator

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, Response
from pydantic import BaseModel, field_validator

from agents import dispatcher_graph

# Fish Audio TTS configuration
FISH_AUDIO_API_KEY = os.getenv("FISH_AUDIO_API_KEY")
FISH_AUDIO_VOICE_ID = os.getenv("FISH_AUDIO_VOICE_ID", "")  # Optional: specific voice
FISH_AUDIO_API_URL = "https://api.fish.audio/v1/tts"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="FirstWave Emergency Dispatcher API")


# =============================================================================
# Error Handling
# =============================================================================

class APIError(Exception):
    """Custom API error with status code and details."""
    def __init__(self, status_code: int, message: str, details: str | None = None):
        self.status_code = status_code
        self.message = message
        self.details = details
        super().__init__(message)


@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    """Handle custom API errors."""
    logger.error(f"API Error: {exc.message} - Details: {exc.details}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "details": exc.details,
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.error(f"Unexpected error: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "An unexpected error occurred",
            "details": str(exc) if app.debug else None,
        }
    )


# =============================================================================
# CORS Configuration
# =============================================================================

# Allow configurable origins (comma-separated in env var, or default to localhost)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Request/Response Models
# =============================================================================

class DispatchRequest(BaseModel):
    transcript: str

    @field_validator('transcript')
    @classmethod
    def validate_transcript(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Transcript cannot be empty')
        if len(v) > 50000:  # 50KB limit
            raise ValueError('Transcript is too long (max 50,000 characters)')
        return v.strip()


class DispatchResponse(BaseModel):
    extracted: dict
    incident_type: str
    severity: str | None
    key_risks: list[str]
    missing_info: list[str]
    suggested_questions: list[str]
    info_complete: bool
    dispatch_recommendation: dict
    nearest_resources: list[dict]
    validated_output: dict


class TTSRequest(BaseModel):
    text: str
    voice_id: str | None = None

    @field_validator('text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Text cannot be empty')
        if len(v) > 5000:  # 5KB limit for TTS
            raise ValueError('Text is too long (max 5,000 characters)')
        return v.strip()


# =============================================================================
# Health Check Endpoints
# =============================================================================

@app.get("/")
def read_root():
    return {"message": "FirstWave Emergency Dispatcher API", "status": "running"}


@app.get("/health")
def health_check():
    """
    Health check endpoint.
    
    Returns basic health status. Could be extended to check:
    - Database connectivity
    - LLM API availability
    - Memory usage
    """
    return {"status": "ok", "service": "firstwave-dispatcher"}


# =============================================================================
# Text-to-Speech Endpoint
# =============================================================================

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using Fish Audio API.
    
    Returns audio bytes (MP3 format) that can be played directly.
    """
    if not FISH_AUDIO_API_KEY:
        logger.error("Fish Audio API key not configured")
        raise APIError(
            status_code=500,
            message="TTS service not configured",
            details="FISH_AUDIO_API_KEY environment variable is not set"
        )
    
    logger.info(f"TTS request (text length: {len(request.text)})")
    
    # Use provided voice_id or fall back to configured default
    voice_id = request.voice_id or FISH_AUDIO_VOICE_ID
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Build request payload
            payload = {
                "text": request.text,
                "format": "mp3",
            }
            
            # Add voice reference if specified
            if voice_id:
                payload["reference_id"] = voice_id
            
            response = await client.post(
                FISH_AUDIO_API_URL,
                headers={
                    "Authorization": f"Bearer {FISH_AUDIO_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"Fish Audio API error: {response.status_code} - {error_text}")
                raise APIError(
                    status_code=502,
                    message="TTS service error",
                    details=f"Fish Audio returned {response.status_code}"
                )
            
            # Return audio bytes directly
            logger.info("TTS audio generated successfully")
            return Response(
                content=response.content,
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": "inline",
                    "Cache-Control": "no-cache",
                }
            )
            
    except httpx.TimeoutException:
        logger.error("Fish Audio API timeout")
        raise APIError(
            status_code=504,
            message="TTS service timeout",
            details="Fish Audio API took too long to respond"
        )
    except httpx.RequestError as e:
        logger.error(f"Fish Audio API request error: {e}")
        raise APIError(
            status_code=502,
            message="TTS service unavailable",
            details=str(e)
        )


# =============================================================================
# Dispatch Endpoints
# =============================================================================

@app.post("/dispatch", response_model=DispatchResponse)
def dispatch_emergency(request: DispatchRequest):
    """
    Process an emergency transcript through the dispatcher agent graph.
    
    Returns extracted info, triage, dispatch recommendations, and nearest resources.
    
    This endpoint processes the entire pipeline synchronously and returns
    all results at once. For real-time updates, use /dispatch/stream instead.
    """
    logger.info(f"Processing dispatch request (transcript length: {len(request.transcript)})")
    
    try:
        # Run the graph with the transcript
        result = dispatcher_graph.invoke({
            "transcript": request.transcript,
            "messages": [],
        })
        
        # Check for any agent errors in the result
        errors = []
        for key, value in result.items():
            if isinstance(value, dict) and "_error" in value:
                errors.append(f"{key}: {value['_error']}")
        
        if errors:
            logger.warning(f"Dispatch completed with errors: {errors}")
        
        return DispatchResponse(
            extracted=result.get("extracted", {}),
            incident_type=result.get("incident_type", "unknown"),
            severity=result.get("severity"),
            key_risks=result.get("key_risks", []),
            missing_info=result.get("missing_info", []),
            suggested_questions=result.get("suggested_questions", []),
            info_complete=result.get("info_complete", False),
            dispatch_recommendation=result.get("dispatch_recommendation", {}),
            nearest_resources=result.get("nearest_resources", []),
            validated_output=result.get("validated_output", {}),
        )
        
    except ValueError as e:
        # Configuration errors (e.g., missing API key)
        logger.error(f"Configuration error: {e}")
        raise APIError(
            status_code=500,
            message="Service configuration error",
            details=str(e)
        )
    except Exception as e:
        logger.error(f"Dispatch processing error: {e}\n{traceback.format_exc()}")
        raise APIError(
            status_code=500,
            message="Failed to process dispatch request",
            details=str(e)
        )


def event_generator(transcript: str) -> Generator[str, None, None]:
    """
    Generator that streams agent outputs as Server-Sent Events.
    
    Each event contains the agent name and its output data.
    Includes error handling for individual agent failures.
    """
    try:
        logger.info(f"Starting stream processing (transcript length: {len(transcript)})")
        event_count = 0
        
        for output in dispatcher_graph.stream({"transcript": transcript, "messages": []}):
            # Each output is a dict with the node name as key
            node_name = list(output.keys())[0]
            node_output = output[node_name]
            
            # Check for agent-level errors
            if isinstance(node_output, dict) and "_error" in node_output:
                logger.warning(f"Agent {node_name} error: {node_output['_error']}")
                # Include error info in the event but don't stop processing
                node_output["_had_error"] = True
            
            # Emit SSE event with agent name and data
            try:
                event_data = json.dumps({"agent": node_name, "data": node_output})
                yield f"data: {event_data}\n\n"
                event_count += 1
                logger.debug(f"Emitted event {event_count}: {node_name}")
            except (TypeError, ValueError) as e:
                # JSON serialization error - send error event but continue
                logger.error(f"Failed to serialize {node_name} output: {e}")
                error_data = json.dumps({
                    "agent": node_name,
                    "data": {"_error": f"Serialization error: {str(e)}"}
                })
                yield f"data: {error_data}\n\n"
        
        # Send completion event
        logger.info(f"Stream completed successfully ({event_count} events)")
        yield "event: done\ndata: {}\n\n"
        
    except ValueError as e:
        # Configuration errors
        logger.error(f"Stream configuration error: {e}")
        error_data = json.dumps({"error": f"Configuration error: {str(e)}"})
        yield f"event: error\ndata: {error_data}\n\n"
        
    except ConnectionError as e:
        # Network/API connectivity issues
        logger.error(f"Stream connection error: {e}")
        error_data = json.dumps({"error": "Connection error - please try again"})
        yield f"event: error\ndata: {error_data}\n\n"
        
    except Exception as e:
        # Unexpected errors
        logger.error(f"Stream error: {e}\n{traceback.format_exc()}")
        error_data = json.dumps({"error": str(e)})
        yield f"event: error\ndata: {error_data}\n\n"


@app.post("/dispatch/stream")
def dispatch_stream(request: DispatchRequest):
    """
    Stream emergency dispatch processing via Server-Sent Events.
    
    Emits an event as each agent in the pipeline completes, allowing
    the frontend to update progressively.
    
    Event types:
    - data: Regular data event with agent output
    - done: Stream completed successfully
    - error: An error occurred during processing
    
    Each data event contains:
    {
        "agent": "agent_name",
        "data": { ... agent output ... }
    }
    """
    logger.info(f"Stream dispatch request (transcript length: {len(request.transcript)})")
    
    return StreamingResponse(
        event_generator(request.transcript),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )
