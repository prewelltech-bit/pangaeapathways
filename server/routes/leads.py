"""
Leads route — RBAC enforced:
  GET  /api/leads        → scoped by role (CEO=all, Director=country, BranchAdmin=branch)
  POST /api/leads        → CEO, Director, Branch Admin can create
  PATCH /api/leads/:id   → CEO and Director only (Branch Admin blocked)
  DELETE /api/leads/:id  → CEO only
"""
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from bson import ObjectId
from datetime import datetime, timezone

from utils.db import db
from middleware.auth import get_current_user
from models.schemas import LeadCreate, LeadUpdate, LeadTransferRequest

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "public", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/leads", tags=["leads"])


def _serialize_lead(lead: dict) -> dict:
    lead["_id"] = str(lead["_id"])
    lead["branchId"] = str(lead["branchId"]) if lead.get("branchId") else None
    lead["ownerId"] = str(lead["ownerId"]) if lead.get("ownerId") else None
    lead["referringPartnerId"] = str(lead["referringPartnerId"]) if lead.get("referringPartnerId") else None
    if lead.get("createdBy"):
        lead["createdBy"] = str(lead["createdBy"])
    return lead


# ─── Create Lead ──────────────────────────────────────────────────────────────

@router.post("")
def create_lead(lead: LeadCreate, current_user=Depends(get_current_user)):
    """All roles can create leads, but Branch Admins can only create for their own branch."""
    lead_dict = lead.model_dump(exclude_unset=True)

    # Branch Admins can only create leads for their own branch
    if current_user["role"] in ("BRANCH_ADMIN", "ADMIN"):
        if str(current_user.get("branchId")) != lead.branchId:
            raise HTTPException(status_code=403, detail="Branch Admins can only create leads for their own branch")

    # Directors can only create leads for branches in their country
    if current_user["role"] == "DIRECTOR":
        branch = db.branches.find_one({"_id": ObjectId(lead.branchId)})
        if not branch or branch.get("country") != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Directors can only create leads for branches in their country")

    lead_dict["branchId"] = ObjectId(lead.branchId)
    if lead.ownerId:
        lead_dict["ownerId"] = ObjectId(lead.ownerId)
    if lead.referringPartnerId:
        lead_dict["referringPartnerId"] = ObjectId(lead.referringPartnerId)

    lead_dict["createdAt"] = datetime.now(timezone.utc)
    lead_dict["updatedAt"] = datetime.now(timezone.utc)
    lead_dict["createdBy"] = current_user["_id"]

    if lead.consentContact:
        lead_dict["consentAt"] = datetime.now(timezone.utc)

    result = db.leads.insert_one(lead_dict)
    return {"message": "Lead created successfully", "id": str(result.inserted_id)}


# ─── List Leads ───────────────────────────────────────────────────────────────

@router.get("")
def get_leads(scope: str = "all", current_user=Depends(get_current_user)):
    """Returns leads scoped to the user's role and scope parameter."""
    query = {}
    
    if scope == "my":
        query["ownerId"] = current_user["_id"]
    else:
        role = current_user["role"]
        if role == "DIRECTOR":
            country = current_user.get("country")
            if country:
                country_branches = list(db.branches.find({"country": country}, {"_id": 1}))
                branch_ids = [b["_id"] for b in country_branches]
                query["branchId"] = {"$in": branch_ids}
        elif role in ("BRANCH_ADMIN", "ADMIN"):
            branch_id = current_user.get("branchId")
            if branch_id:
                query["branchId"] = branch_id

    leads_cursor = db.leads.find(query).sort("createdAt", -1)

    leads = []
    for lead in leads_cursor:
        leads.append(_serialize_lead(lead))
    return leads


# ─── Get Single Lead ──────────────────────────────────────────────────────────

@router.get("/{lead_id}")
def get_lead(lead_id: str, current_user=Depends(get_current_user)):
    lead = db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Verify access scope
    # If the user is the owner, they can always see it
    has_access = False
    if str(lead.get("ownerId")) == str(current_user["_id"]):
        has_access = True
    else:
        role = current_user["role"]
        if role == "CEO":
            has_access = True
        elif role == "DIRECTOR":
            branch = db.branches.find_one({"_id": lead.get("branchId")})
            if branch and branch.get("country") == current_user.get("country"):
                has_access = True
        elif role in ("BRANCH_ADMIN", "ADMIN"):
            if str(lead.get("branchId")) == str(current_user.get("branchId")):
                has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    serialized = _serialize_lead(lead)
    
    # Lookup owner name
    if serialized.get("ownerId"):
        owner = db.users.find_one({"_id": ObjectId(serialized["ownerId"])})
        serialized["ownerName"] = owner.get("name") if owner else "Unassigned"
        serialized["ownerEmail"] = owner.get("email") if owner else ""
    else:
        serialized["ownerName"] = "Unassigned"
        serialized["ownerEmail"] = ""
        
    # Lookup creator name
    if serialized.get("createdBy"):
        creator = db.users.find_one({"_id": ObjectId(serialized["createdBy"])})
        serialized["creatorName"] = creator.get("name") if creator else "System"
    else:
        serialized["creatorName"] = "System"
        
    # Lookup branch name
    if serialized.get("branchId"):
        branch = db.branches.find_one({"_id": ObjectId(serialized["branchId"])})
        serialized["branchName"] = branch.get("name") if branch else "Unknown"
    else:
        serialized["branchName"] = "Unknown"
        
    return serialized


# ─── Update Lead ──────────────────────────────────────────────────────────────

@router.patch("/{lead_id}")
def update_lead(
    lead_id: str,
    updates: LeadUpdate,
    current_user=Depends(get_current_user)
):
    """
    CEO: can edit any lead.
    Director: can only edit leads within their country's branches.
    Branch Admin: can only edit leads within their own branch.
    """
    lead = db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Directors can only edit leads in their country
    if current_user["role"] == "DIRECTOR":
        branch = db.branches.find_one({"_id": lead.get("branchId")})
        if not branch or branch.get("country") != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Cannot edit leads outside your country")

    # Branch Admins/Admins can only edit leads in their own branch
    if current_user["role"] in ("BRANCH_ADMIN", "ADMIN"):
        if str(lead.get("branchId")) != str(current_user.get("branchId")):
            raise HTTPException(status_code=403, detail="Branch Admins can only edit leads in their own branch")

    update_dict = updates.model_dump(exclude_unset=True)
    if not update_dict:
        return {"message": "No updates provided"}

    if "branchId" in update_dict and update_dict["branchId"]:
        update_dict["branchId"] = ObjectId(update_dict["branchId"])
    if "ownerId" in update_dict and update_dict["ownerId"]:
        update_dict["ownerId"] = ObjectId(update_dict["ownerId"])

    update_dict["updatedAt"] = datetime.now(timezone.utc)

    result = db.leads.update_one({"_id": ObjectId(lead_id)}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")

    return {"message": "Lead updated successfully"}


# ─── Delete Lead ──────────────────────────────────────────────────────────────

@router.delete("/{lead_id}")
def delete_lead(lead_id: str, current_user=Depends(get_current_user)):
    """Only CEO can delete leads."""
    if current_user["role"] != "CEO":
        raise HTTPException(status_code=403, detail="Only CEO can delete leads")

    result = db.leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")

    return {"message": "Lead deleted successfully"}


# ─── Transfer Leads ───────────────────────────────────────────────────────────

@router.post("/transfer")
def transfer_leads(req: LeadTransferRequest, current_user=Depends(get_current_user)):
    """Admin tool to bulk transfer leads between users."""
    if current_user["role"] not in ("CEO", "DIRECTOR"):
        raise HTTPException(status_code=403, detail="Only CEO or Director can transfer leads")

    # Validate destination
    if not db.users.find_one({"_id": ObjectId(req.destinationUserId)}):
        raise HTTPException(status_code=404, detail="Destination user not found")
    if not db.branches.find_one({"_id": ObjectId(req.destinationBranchId)}):
        raise HTTPException(status_code=404, detail="Destination branch not found")

    # Build query
    query = {"ownerId": ObjectId(req.sourceUserId)}
    
    if current_user["role"] == "DIRECTOR":
        country = current_user.get("country")
        country_branches = list(db.branches.find({"country": country}, {"_id": 1}))
        branch_ids = [b["_id"] for b in country_branches]
        query["branchId"] = {"$in": branch_ids}

    # If limit is specified, fetch IDs first
    if req.limit and req.limit > 0:
        leads = list(db.leads.find(query).limit(req.limit))
        lead_ids = [lead["_id"] for lead in leads]
        if not lead_ids:
            return {"message": "No leads found to transfer", "transferred_count": 0}
        filter_query = {"_id": {"$in": lead_ids}}
    else:
        filter_query = query

    update_payload = {
        "$set": {
            "ownerId": ObjectId(req.destinationUserId),
            "branchId": ObjectId(req.destinationBranchId),
            "updatedAt": datetime.now(timezone.utc)
        }
    }

    result = db.leads.update_many(filter_query, update_payload)

    # Log audit
    db.activities.insert_one({
        "action": "LEAD_TRANSFER",
        "performedBy": current_user["_id"],
        "sourceUserId": ObjectId(req.sourceUserId),
        "destinationUserId": ObjectId(req.destinationUserId),
        "destinationBranchId": ObjectId(req.destinationBranchId),
        "transferReason": req.transferReason,
        "count": result.modified_count,
        "timestamp": datetime.now(timezone.utc)
    })

    return {"message": "Leads transferred successfully", "transferred_count": result.modified_count}


# ─── File Notes Endpoints ───────────────────────────────────────────────────

@router.get("/{lead_id}/notes")
def get_lead_notes(lead_id: str, current_user=Depends(get_current_user)):
    # Verify access to the lead
    lead = db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    has_access = False
    if str(lead.get("ownerId")) == str(current_user["_id"]):
        has_access = True
    else:
        role = current_user["role"]
        if role == "CEO":
            has_access = True
        elif role == "DIRECTOR":
            branch = db.branches.find_one({"_id": lead.get("branchId")})
            if branch and branch.get("country") == current_user.get("country"):
                has_access = True
        elif role in ("BRANCH_ADMIN", "ADMIN"):
            if str(lead.get("branchId")) == str(current_user.get("branchId")):
                has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    notes_cursor = db.notes.find({"leadId": ObjectId(lead_id)}).sort("createdAt", -1)
    
    notes = []
    for note in notes_cursor:
        note["_id"] = str(note["_id"])
        note["leadId"] = str(note["leadId"])
        note["createdBy"] = str(note["createdBy"])
        notes.append(note)
    return notes


@router.post("/{lead_id}/notes")
async def create_lead_note(
    lead_id: str,
    body: str = Form(...),
    sendToClient: bool = Form(False),
    sendToAssigned: bool = Form(False),
    sendToStaff: bool = Form(False),
    sendToOthers: bool = Form(False),
    othersEmails: str = Form(None),
    file: UploadFile = File(None),
    current_user=Depends(get_current_user)
):
    # Verify access to the lead
    lead = db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    has_access = False
    if str(lead.get("ownerId")) == str(current_user["_id"]):
        has_access = True
    else:
        role = current_user["role"]
        if role == "CEO":
            has_access = True
        elif role == "DIRECTOR":
            branch = db.branches.find_one({"_id": lead.get("branchId")})
            if branch and branch.get("country") == current_user.get("country"):
                has_access = True
        elif role in ("BRANCH_ADMIN", "ADMIN"):
            if str(lead.get("branchId")) == str(current_user.get("branchId")):
                has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    attachment = None

    if file and file.filename:
        # File type validation
        ext = os.path.splitext(file.filename)[1].lower()
        allowed_exts = [".png", ".jpg", ".jpeg", ".gif", ".docx", ".doc", ".pdf"]
        if ext not in allowed_exts:
            raise HTTPException(status_code=400, detail=f"Unsupported file format. Supported formats: {', '.join(allowed_exts)}")
            
        # File size validation (2MB limit)
        contents = await file.read()
        size_bytes = len(contents)
        if size_bytes > 2 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File exceeds maximum size of 2MB")
            
        await file.seek(0)
        
        safe_filename = f"{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
        notes_dir = os.path.join(UPLOAD_DIR, "notes", lead_id)
        os.makedirs(notes_dir, exist_ok=True)
        
        file_path = os.path.join(notes_dir, safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        attachment = {
            "filename": file.filename,
            "storedPath": f"notes/{lead_id}/{safe_filename}",
            "size": size_bytes
        }

    note_doc = {
        "leadId": ObjectId(lead_id),
        "body": body,
        "sendToClient": sendToClient,
        "sendToAssigned": sendToAssigned,
        "sendToStaff": sendToStaff,
        "sendToOthers": sendToOthers,
        "othersEmails": othersEmails,
        "attachment": attachment,
        "createdAt": datetime.now(timezone.utc),
        "createdBy": ObjectId(current_user["_id"]),
        "creatorName": current_user.get("name", "Unknown User")
    }

    result = db.notes.insert_one(note_doc)
    note_id = str(result.inserted_id)

    # ─── Email dispatch simulations ──────────────────────────────────────────
    print(f"\n{'='*50}\n[DEV] FILE NOTE CREATED FOR LEAD: {lead.get('fullName')} (ID: {lead_id})")
    
    if sendToClient:
        client_email = lead.get("email", "N/A")
        print(f"[DEV EMAIL] Sent file note to Client ({lead.get('fullName')}) at email: {client_email}")
        
    if sendToAssigned:
        owner_id = lead.get("ownerId")
        if owner_id:
            owner = db.users.find_one({"_id": ObjectId(owner_id)})
            owner_email = owner.get("email", "N/A") if owner else "N/A"
            owner_name = owner.get("name", "N/A") if owner else "N/A"
            print(f"[DEV EMAIL] Sent file note to Assigned User ({owner_name}) at email: {owner_email}")
        else:
            print("[DEV EMAIL] Cannot send to assigned user: lead has no owner assigned.")
            
    if sendToStaff:
        # Find all staff members in the same branch
        branch_id = lead.get("branchId")
        if branch_id:
            staff_users = list(db.users.find({"branchId": branch_id}))
            print(f"[DEV EMAIL] Sent file note to {len(staff_users)} Staff Members of Branch ID {branch_id}")
            for su in staff_users:
                print(f"  - Staff: {su.get('name')} ({su.get('email')})")
        else:
            print("[DEV EMAIL] Cannot send to staff: lead has no branchId.")
            
    if sendToOthers and othersEmails:
        emails_list = [e.strip() for e in othersEmails.split(",") if e.strip()]
        print(f"[DEV EMAIL] Sent file note to custom recipients: {', '.join(emails_list)}")
        
    print(f"{'='*50}\n")

    # Add activity
    db.activities.insert_one({
        "leadId": ObjectId(lead_id),
        "userId": ObjectId(current_user["_id"]),
        "type": "FILE_NOTE",
        "body": f"Added File Note: {body[:100]}...",
        "createdAt": datetime.now(timezone.utc)
    })

    return {"message": "File Note created successfully", "id": note_id}


@router.get("/notes/download/{note_id}")
def download_note_attachment(note_id: str, current_user=Depends(get_current_user)):
    note = db.notes.find_one({"_id": ObjectId(note_id)})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    attachment = note.get("attachment")
    if not attachment:
        raise HTTPException(status_code=404, detail="No attachment for this note")
        
    file_path = os.path.join(UPLOAD_DIR, attachment["storedPath"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on disk")
        
    return FileResponse(path=file_path, filename=attachment["filename"])
