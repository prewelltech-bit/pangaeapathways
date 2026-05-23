"""
Users route — scoped by role:
  CEO          → sees all users
  DIRECTOR     → sees Branch Admins in their country
  BRANCH_ADMIN → no access
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from utils.db import db
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


from models.schemas import UserProfileUpdate
from utils.auth_utils import hash_password, verify_password

def _serialize(user: dict) -> dict:
    user["_id"] = str(user["_id"])
    user.pop("passwordHash", None)
    user.pop("totpSecret", None)
    if user.get("branchId"):
        user["branchId"] = str(user["branchId"])
    if user.get("createdBy"):
        user["createdBy"] = str(user["createdBy"])
    return user


@router.patch("/me")
def update_my_profile(data: UserProfileUpdate, current_user=Depends(get_current_user)):
    """Allows the current user to update their own profile (name, password)."""
    update_data = {}
    if data.name:
        update_data["name"] = data.name
    
    if data.password:
        if not data.oldPassword:
            raise HTTPException(status_code=400, detail="Current password is required to change password.")
        
        user_doc = db.users.find_one({"_id": ObjectId(current_user["_id"])})
        if not user_doc or not verify_password(data.oldPassword, user_doc.get("passwordHash", "")):
            raise HTTPException(status_code=400, detail="Incorrect current password.")
            
        update_data["passwordHash"] = hash_password(data.password)
        
    if not update_data:
        return {"message": "No updates provided"}
        
    db.users.update_one({"_id": current_user["_id"]}, {"$set": update_data})
    return {"message": "Profile updated successfully"}


@router.get("/me")
def get_my_profile(current_user=Depends(get_current_user)):
    """Returns the profile information for the currently logged in user."""
    user = dict(current_user)
    user = _serialize(user)
    if user.get("branchId"):
        branch = db.branches.find_one({"_id": ObjectId(user["branchId"])})
        user["branchName"] = branch["name"] if branch else "Unknown"
    return user


@router.get("")
def list_users(current_user=Depends(get_current_user)):
    """
    CEO     → all users (directors + branch admins)
    Director → branch admins in their country only
    Branch Admin → 403
    """
    role = current_user["role"]

    if role == "CEO":
        cursor = db.users.find({}).sort("createdAt", -1)
    elif role == "DIRECTOR":
        cursor = db.users.find({
            "$or": [
                {"country": current_user.get("country")},
                {"_id": current_user["_id"]}
            ]
        }).sort("createdAt", -1)
    elif role == "HR":
        branch_id = current_user.get("branchId")
        if branch_id:
            cursor = db.users.find({
                "$or": [
                    {"branchId": branch_id},
                    {"_id": current_user["_id"]}
                ]
            }).sort("createdAt", -1)
        elif current_user.get("country"):
            cursor = db.users.find({
                "$or": [
                    {"country": current_user.get("country")},
                    {"_id": current_user["_id"]}
                ]
            }).sort("createdAt", -1)
        else:
            cursor = db.users.find({}).sort("createdAt", -1)
    elif role in ("BRANCH_ADMIN", "ADMIN"):
        branch_id = current_user.get("branchId")
        if branch_id:
            cursor = db.users.find({
                "$or": [
                    {"branchId": branch_id},
                    {"_id": current_user["_id"]}
                ]
            }).sort("createdAt", -1)
        else:
            return [_serialize(current_user)]
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    return [_serialize(u) for u in cursor]


@router.get("/directors")
def list_directors(current_user=Depends(get_current_user)):
    """CEO only — list all Directors."""
    if current_user["role"] != "CEO":
        raise HTTPException(status_code=403, detail="CEO access required")

    cursor = db.users.find({"role": "DIRECTOR"}).sort("country", 1)
    return [_serialize(u) for u in cursor]


@router.get("/branch-admins")
def list_branch_admins(current_user=Depends(get_current_user)):
    """
    CEO → all Branch Admins globally
    Director → Branch Admins in their country only
    """
    role = current_user["role"]
    if role in ("BRANCH_ADMIN", "ADMIN"):
        raise HTTPException(status_code=403, detail="Access denied")

    query = {"role": {"$in": ["BRANCH_ADMIN", "ADMIN"]}}
    if role == "DIRECTOR":
        query["country"] = current_user.get("country")

    cursor = db.users.find(query).sort("createdAt", -1)
    users = []
    for u in cursor:
        u = _serialize(u)
        # Attach branch name for display
        if u.get("branchId"):
            branch = db.branches.find_one({"_id": ObjectId(u["branchId"])})
            u["branchName"] = branch["name"] if branch else "Unknown"
        users.append(u)
    return users


@router.patch("/{user_id}/deactivate")
def deactivate_user(user_id: str, current_user=Depends(get_current_user)):
    """CEO or Director can deactivate a user (soft delete)."""
    if current_user["role"] in ("BRANCH_ADMIN", "ADMIN"):
        raise HTTPException(status_code=403, detail="Access denied")

    target = db.users.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Director can only deactivate users in their country
    if current_user["role"] == "DIRECTOR":
        if target.get("country") != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Cannot deactivate users outside your country")
        if target["role"] == "DIRECTOR":
            raise HTTPException(status_code=403, detail="Directors cannot deactivate other Directors")

    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"isActive": False}})
    return {"message": "User deactivated successfully"}


@router.patch("/{user_id}/activate")
def activate_user(user_id: str, current_user=Depends(get_current_user)):
    """CEO or Director can reactivate a user."""
    if current_user["role"] in ("BRANCH_ADMIN", "ADMIN"):
        raise HTTPException(status_code=403, detail="Access denied")

    target = db.users.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user["role"] == "DIRECTOR":
        if target.get("country") != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Cannot activate users outside your country")

    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"isActive": True}})
    return {"message": "User activated successfully"}
