import json
from typing import Generator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agents import dispatcher_graph

app = FastAPI(title="FirstWave Emergency Dispatcher API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DispatchRequest(BaseModel):
    transcript: str


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


@app.get("/")
def read_root():
    return {"message": "FirstWave Emergency Dispatcher API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/dispatch", response_model=DispatchResponse)
def dispatch_emergency(request: DispatchRequest):
    """
    Process an emergency transcript through the dispatcher agent graph.
    
    Returns extracted info, triage, dispatch recommendations, and nearest resources.
    """
    # Run the graph with the transcript
    result = dispatcher_graph.invoke({
        "transcript": request.transcript,
        "messages": [],
    })
    
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


def event_generator(transcript: str) -> Generator[str, None, None]:
    """
    Generator that streams agent outputs as Server-Sent Events.
    
    Each event contains the agent name and its output data.
    """
    try:
        for output in dispatcher_graph.stream({"transcript": transcript, "messages": []}):
            # Each output is a dict with the node name as key
            node_name = list(output.keys())[0]
            node_output = output[node_name]
            
            # Emit SSE event with agent name and data
            event_data = json.dumps({"agent": node_name, "data": node_output})
            yield f"data: {event_data}\n\n"
        
        # Send completion event
        yield "event: done\ndata: {}\n\n"
    except Exception as e:
        # Send error event
        error_data = json.dumps({"error": str(e)})
        yield f"event: error\ndata: {error_data}\n\n"


@app.post("/dispatch/stream")
def dispatch_stream(request: DispatchRequest):
    """
    Stream emergency dispatch processing via Server-Sent Events.
    
    Emits an event as each agent in the pipeline completes, allowing
    the frontend to update progressively.
    """
    return StreamingResponse(
        event_generator(request.transcript),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
