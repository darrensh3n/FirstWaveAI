from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
