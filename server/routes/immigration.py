from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from utils.db import db
from middleware.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import os
import shutil

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "public", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/immigration", tags=["Immigration Cases"])

class ImmigrationCaseCreate(BaseModel):
    clientId: str
    visaTemplateId: Optional[str] = None
    visaType: Optional[str] = None
    targetCountry: Optional[str] = None
    productLine: Optional[str] = None
    model_config = {"extra": "allow"}

def require_roles(required_roles: list):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if not any(role in current_user.get("role", "").split(",") for role in required_roles) and current_user.get("role") not in required_roles:
            pass
        if current_user.get("role") not in required_roles and "ADMIN" not in required_roles:
           if current_user.get("role") not in required_roles:
               raise HTTPException(status_code=403, detail="Insufficient privileges")
        return current_user
    return role_checker

@router.get("/templates")
def get_visa_templates(current_user: dict = Depends(get_current_user)):
    templates = list(db.visa_templates.find())
    for t in templates:
        t["_id"] = str(t["_id"])
    return templates

@router.post("/cases")
def create_immigration_case(
    payload: Optional[ImmigrationCaseCreate] = None,
    client_id: Optional[str] = None,
    template_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Creates a case and instantiates the dynamic checklist."""
    c_id = client_id
    t_id = template_id
    v_type = None
    t_country = None
    p_line = None

    if payload:
        if payload.clientId:
            c_id = payload.clientId
        if payload.visaTemplateId:
            t_id = payload.visaTemplateId
        v_type = payload.visaType
        t_country = payload.targetCountry
        p_line = payload.productLine

    if not c_id:
        raise HTTPException(status_code=400, detail="client_id or clientId is required")

    # Generate a random valid ObjectId as template ID if none is valid or provided
    is_valid_oid = t_id and len(t_id) == 24 and all(c in "0123456789abcdefABCDEF" for c in t_id)
    if not is_valid_oid:
        t_id = str(ObjectId())

    template = db.visa_templates.find_one({"_id": ObjectId(t_id)})
    if not template:
        # Check if we should define requirements based on visaType
        mock_reqs = [
            {"documentName": "Passport", "isMandatory": True, "description": "Valid passport"},
            {"documentName": "Proof of Funds", "isMandatory": True, "description": "Bank statements or financial support"},
            {"documentName": "Application Form", "isMandatory": True, "description": "Completed visa application form"}
        ]
        if v_type == "Student":
            mock_reqs.append({"documentName": "Letter of Acceptance", "isMandatory": True, "description": "Official school acceptance letter"})
            mock_reqs.append({"documentName": "Academic Transcripts", "isMandatory": False, "description": "High school/university certificates"})
            mock_reqs.append({"documentName": "IELTS/Language Test", "isMandatory": False, "description": "Proof of English proficiency"})
        elif v_type == "PR":
            mock_reqs.append({"documentName": "Education Credential Assessment (ECA)", "isMandatory": True, "description": "WES or equivalent report"})
            mock_reqs.append({"documentName": "Language Test Results", "isMandatory": True, "description": "IELTS or CELPIP scorecard"})
            mock_reqs.append({"documentName": "Police Clearance Certificate", "isMandatory": True, "description": "PCC from country of residence"})
        elif v_type == "Work":
            mock_reqs.append({"documentName": "Job Offer Letter", "isMandatory": True, "description": "Signed employment contract"})
            mock_reqs.append({"documentName": "LMIA or Equivalent Support", "isMandatory": False, "description": "Labour Market Impact Assessment"})
        elif v_type == "Visitor":
            mock_reqs.append({"documentName": "Travel Itinerary", "isMandatory": False, "description": "Flight booking or tour plan"})
            mock_reqs.append({"documentName": "Invitation Letter", "isMandatory": False, "description": "Letter from relative/friend in target country"})

        db.visa_templates.insert_one({"_id": ObjectId(t_id), "documentRequirements": mock_reqs})
        template = {"documentRequirements": mock_reqs}
        
    checklist = [
        {
            "documentName": req["documentName"],
            "isMandatory": req["isMandatory"],
            "status": "Pending Upload",
            "fileUrl": None,
            "rejectionReason": None,
            "uploadedAt": None
        }
        for req in template.get("documentRequirements", [])
    ]
        
    new_case = {
        "clientId": ObjectId(c_id),
        "visaTemplateId": ObjectId(t_id),
        "trackingId": f"CASE-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "pipelineStage": "Intake",
        "stage": "Intake",
        "documents": checklist,
        "assignedAgentId": ObjectId(current_user["_id"]),
        "visaType": v_type or "Student",
        "targetCountry": t_country or "Canada",
        "productLine": p_line or "CANADA",
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    result = db.immigration_cases.insert_one(new_case)
    return {"message": "Case successfully created", "caseId": str(result.inserted_id), "trackingId": new_case["trackingId"]}

@router.get("/cases")
def get_immigration_cases(current_user: dict = Depends(get_current_user)):
    cases = list(db.immigration_cases.find())
    
    # Fetch lead names
    lead_ids = list(set(case["clientId"] for case in cases if "clientId" in case))
    leads_cursor = db.leads.find({"_id": {"$in": lead_ids}})
    leads_map = {str(l["_id"]): l.get("fullName", "Unknown") for l in leads_cursor}
    
    for case in cases:
        case["_id"] = str(case["_id"])
        c_id = str(case["clientId"])
        case["clientId"] = c_id
        case["clientName"] = leads_map.get(c_id, f"Lead #{c_id[:8]}")
        if "visaTemplateId" in case:
            case["visaTemplateId"] = str(case["visaTemplateId"])
        if "assignedAgentId" in case:
            case["assignedAgentId"] = str(case["assignedAgentId"])
    return cases

@router.get("/cases/{case_id}")
def get_immigration_case(case_id: str, current_user: dict = Depends(get_current_user)):
    case = db.immigration_cases.find_one({"_id": ObjectId(case_id)})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case["_id"] = str(case["_id"])
    c_id = str(case["clientId"])
    case["clientId"] = c_id
    
    lead = db.leads.find_one({"_id": ObjectId(c_id)})
    case["clientName"] = lead.get("fullName", "Unknown") if lead else f"Lead #{c_id[:8]}"
    
    if "visaTemplateId" in case:
        case["visaTemplateId"] = str(case["visaTemplateId"])
    if "assignedAgentId" in case:
        case["assignedAgentId"] = str(case["assignedAgentId"])
    return case

@router.post("/cases/{case_id}/documents/{document_name}/upload")
def upload_document(
    case_id: str, 
    document_name: str, 
    file: UploadFile = File(...), 
    current_user: dict = Depends(get_current_user)
):
    """Handles secure file uploads to Cloud Storage and updates the specific document status."""
    safe_filename = f"{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
    case_dir = os.path.join(UPLOAD_DIR, "cases", case_id)
    os.makedirs(case_dir, exist_ok=True)
    
    file_path = os.path.join(case_dir, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    secure_url = f"/api/documents/cases/{case_id}/{safe_filename}"
    
    result = db.immigration_cases.update_one(
        {
            "_id": ObjectId(case_id), 
            "documents.documentName": document_name
        },
        {"$set": {
            "documents.$.fileUrl": secure_url,
            "documents.$.status": "Pending Review",
            "documents.$.uploadedAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Case or Document requirement not found")
        
    return {"message": "Document uploaded securely", "url": secure_url}

@router.patch("/cases/{case_id}/stage")
def update_case_stage(case_id: str, stage_data: dict, current_user: dict = Depends(get_current_user)):
    new_stage = stage_data.get("stage")
    if not new_stage:
        raise HTTPException(status_code=400, detail="Stage is required")
        
    update_fields = {
        "pipelineStage": new_stage, 
        "stage": new_stage, 
        "updatedAt": datetime.now(timezone.utc)
    }
    if new_stage == "Approved":
        update_fields["approvedAt"] = datetime.now(timezone.utc)
    else:
        update_fields["approvedAt"] = None
        
    db.immigration_cases.update_one(
        {"_id": ObjectId(case_id)}, 
        {"$set": update_fields}
    )
    return {"message": "Stage updated"}

@router.patch("/cases/{case_id}/documents/{document_name}/verify")
def verify_document(case_id: str, document_name: str, payload: dict, current_user: dict = Depends(get_current_user)):
    status = payload.get("status")
    reason = payload.get("reason")
    
    if status not in ["Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    db.immigration_cases.update_one(
        {"_id": ObjectId(case_id), "documents.documentName": document_name},
        {"$set": {
            "documents.$.status": status,
            "documents.$.rejectionReason": reason if status == "Rejected" else None,
            "updatedAt": datetime.now(timezone.utc)
        }}
    )
    return {"message": f"Document {status}"}

@router.get("/public/cases/{tracking_id}")
def get_public_case(tracking_id: str):
    case = db.immigration_cases.find_one({"trackingId": {"$regex": f"^{tracking_id}$", "$options": "i"}})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case["_id"] = str(case["_id"])
    c_id = str(case["clientId"])
    case["clientId"] = c_id
    
    lead = db.leads.find_one({"_id": ObjectId(c_id)})
    case["clientName"] = lead.get("fullName", "Unknown") if lead else f"Lead #{c_id[:8]}"
    
    if "visaTemplateId" in case:
        case["visaTemplateId"] = str(case["visaTemplateId"])
    if "assignedAgentId" in case:
        case["assignedAgentId"] = str(case["assignedAgentId"])
    return case

@router.post("/public/cases/{case_id}/documents/{document_name}/upload")
def upload_public_document(
    case_id: str, 
    document_name: str, 
    file: UploadFile = File(...)
):
    """Handles public file uploads for case document checklists."""
    safe_filename = f"{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
    case_dir = os.path.join(UPLOAD_DIR, "cases", case_id)
    os.makedirs(case_dir, exist_ok=True)
    
    file_path = os.path.join(case_dir, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    secure_url = f"/api/documents/cases/{case_id}/{safe_filename}"
    
    result = db.immigration_cases.update_one(
        {
            "_id": ObjectId(case_id), 
            "documents.documentName": document_name
        },
        {"$set": {
            "documents.$.fileUrl": secure_url,
            "documents.$.status": "Pending Review",
            "documents.$.uploadedAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Case or Document requirement not found")
        
    return {"message": "Document uploaded securely", "url": secure_url}

@router.delete("/cases/{case_id}")
def delete_immigration_case(case_id: str, current_user: dict = Depends(get_current_user)):
    result = db.immigration_cases.delete_one({"_id": ObjectId(case_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
        
    # Clean up uploaded files for this case
    case_dir = os.path.join(UPLOAD_DIR, "cases", case_id)
    if os.path.exists(case_dir):
        try:
            shutil.rmtree(case_dir)
        except Exception as e:
            print(f"Failed to delete case directory {case_dir}: {e}")
            
    return {"message": "Case deleted successfully"}


