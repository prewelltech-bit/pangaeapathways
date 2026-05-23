"""
Auth routes: login, Google OAuth, hierarchical account creation, MFA, logout.

Role hierarchy:
  CEO → creates → DIRECTOR (assigns country)
  DIRECTOR → creates → BRANCH_ADMIN (in own country only)
  BRANCH_ADMIN → cannot create accounts
"""
from fastapi import APIRouter, Response, Request, HTTPException, Depends
from bson import ObjectId
import os
from datetime import datetime, timezone
import pyotp

from utils.db import db
from utils.auth_utils import hash_password, verify_password, create_access_token, generate_totp_secret
from utils.google_auth import verify_google_token
import random
from models.schemas import (
    UserCreate, UserLogin, VerifyMfa, VerifyEnableMfa,
    CreateUserByAdmin, GoogleAuthRequest,
    ForgotPasswordRequest, VerifyForgotPasswordOTP, ResetPasswordRequest
)
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _serialize_user(user: dict) -> dict:
    """Return a JSON-safe user dict for the session payload."""
    return {
        "sub": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "country": user.get("country"),
        "branchId": str(user["branchId"]) if user.get("branchId") else None,
    }

def create_session(user: dict, response: Response):
    """Create JWT session cookie and return user info."""
    payload = _serialize_user(user)
    token = create_access_token(payload)
    response.set_cookie(
        key="pangaea_session",
        value=token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax"
    )
    return {"ok": True, "role": user["role"], "country": user.get("country")}

# ─── Standard Email/Password Login ────────────────────────────────────────────

@router.post("/login")
def login(creds: UserLogin, response: Response):
    user = db.users.find_one({"email": creds.email})
    if not user or not verify_password(creds.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Account has been deactivated")

    if user.get("totpEnabled"):
        response.set_cookie(key="pangaea_mfa_pending", value=str(user["_id"]), httponly=True, max_age=600)
        return {"needsMfa": True}

    return create_session(user, response)

# ─── Google OAuth: Sign In ─────────────────────────────────────────────────

@router.post("/google/login")
def google_login(req: GoogleAuthRequest, response: Response):
    """
    User signs in with Google. Verifies the ID token server-side,
    finds the user by googleId or email, creates a session.
    """
    try:
        google_data = verify_google_token(req.credential)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    # Find user by googleId first, then fallback to email
    user = db.users.find_one({"googleId": google_data["googleId"]})
    if not user:
        user = db.users.find_one({"email": google_data["email"]})
        if user:
            # Link existing account to Google
            db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"googleId": google_data["googleId"], "emailVerifiedAt": datetime.now(timezone.utc)}}
            )
            user = db.users.find_one({"_id": user["_id"]})

    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found. Please ask your CEO or Director to create your account."
        )

    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Account has been deactivated")

    return create_session(user, response)

# ─── Google OAuth: Create Account (hierarchical) ───────────────────────────

@router.post("/google/create-account")
def google_create_account(
    req: GoogleAuthRequest,
    response: Response,
    current_user=Depends(get_current_user)
):
    """
    Authenticated users create a new account for someone else using their Google account.
    CEO → creates DIRECTOR, DIRECTOR → creates BRANCH_ADMIN.
    The NEW user signs in with Google, and their Google credential is sent here.
    """
    if current_user["role"] in ("BRANCH_ADMIN", "ADMIN"):
        raise HTTPException(status_code=403, detail="Branch Admins cannot create accounts")

    try:
        google_data = verify_google_token(req.credential)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    # Validate role hierarchy
    if req.role == "DIRECTOR":
        if current_user["role"] != "CEO":
            raise HTTPException(status_code=403, detail="Only CEO can create Director accounts")
        if not req.country:
            raise HTTPException(status_code=400, detail="Country is required for Director accounts")
        country = req.country
        branch_id = None

    elif req.role in ("BRANCH_ADMIN", "ADMIN"):
        if current_user["role"] != "DIRECTOR":
            raise HTTPException(status_code=403, detail="Only Directors can create Branch Admin accounts")
        if not req.branchId:
            raise HTTPException(status_code=400, detail="Branch is required for Branch Admin accounts")
        # Validate branch belongs to Director's country
        branch = db.branches.find_one({"_id": ObjectId(req.branchId)})
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        if branch.get("country") != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Cannot assign admin to branch outside your country")
        country = current_user.get("country")
        branch_id = ObjectId(req.branchId)

    elif req.role == "HR":
        if current_user["role"] not in ("CEO", "DIRECTOR"):
            raise HTTPException(status_code=403, detail="Only CEO or Directors can create HR accounts")
        
        # Scope assignment
        if current_user["role"] == "CEO":
            country = req.country or None
            branch_id = ObjectId(req.branchId) if req.branchId else None
            if branch_id:
                branch = db.branches.find_one({"_id": branch_id})
                if not branch:
                    raise HTTPException(status_code=404, detail="Branch not found")
                if country and branch.get("country") != country:
                    raise HTTPException(status_code=400, detail="Branch country does not match assigned country")
                if not country:
                    country = branch.get("country")
        else:
            # Director is creating: country is auto-assigned
            country = current_user.get("country")
            branch_id = ObjectId(req.branchId) if req.branchId else None
            if branch_id:
                branch = db.branches.find_one({"_id": branch_id})
                if not branch:
                    raise HTTPException(status_code=404, detail="Branch not found")
                if branch.get("country") != current_user.get("country"):
                    raise HTTPException(status_code=403, detail="Cannot assign HR to branch outside your country")
    else:
        raise HTTPException(status_code=400, detail="Invalid role. Must be DIRECTOR, BRANCH_ADMIN, ADMIN, or HR")

    # Check not already registered
    if db.users.find_one({"$or": [{"email": google_data["email"]}, {"googleId": google_data["googleId"]}]}):
        raise HTTPException(status_code=400, detail="This Google account is already registered")

    new_user = {
        "email": google_data["email"],
        "name": google_data["name"],
        "googleId": google_data["googleId"],
        "passwordHash": None,
        "role": req.role,
        "country": country,
        "branchId": branch_id,
        "createdBy": current_user["_id"],
        "emailVerifiedAt": datetime.now(timezone.utc),
        "isActive": True,
        "totpEnabled": False,
        "totpSecret": None,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }

    result = db.users.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    return create_session(new_user, response)

# ─── Admin Creates Account With Email+Password (for Director/BRANCH_ADMIN/HR) ───

@router.post("/create-user")
def create_user_by_admin(
    data: CreateUserByAdmin,
    current_user=Depends(get_current_user)
):
    """
    CEO creates Director or HR accounts (email/password).
    Director creates Branch Admin or HR accounts (email/password).
    The new user can later link their Google account on first login.
    """
    if current_user["role"] in ("BRANCH_ADMIN", "ADMIN"):
        raise HTTPException(status_code=403, detail="Branch Admins cannot create accounts")

    if data.role == "CEO":
        raise HTTPException(status_code=403, detail="CEO accounts cannot be created via this endpoint")

    if data.role == "DIRECTOR":
        if current_user["role"] != "CEO":
            raise HTTPException(status_code=403, detail="Only CEO can create Director accounts")
        if not data.country:
            raise HTTPException(status_code=400, detail="Country is required when creating a Director account")
        country = data.country
        branch_id = None

    elif data.role in ("BRANCH_ADMIN", "ADMIN"):
        if current_user["role"] != "DIRECTOR":
            raise HTTPException(status_code=403, detail="Only Directors can create Branch Admin accounts")
        if not data.branchId:
            raise HTTPException(status_code=400, detail="Branch is required when creating a Branch Admin account")
        branch = db.branches.find_one({"_id": ObjectId(data.branchId)})
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        if branch.get("country") != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Cannot assign admin to branch outside your country")
        country = current_user.get("country")
        branch_id = ObjectId(data.branchId)

    elif data.role == "HR":
        if current_user["role"] not in ("CEO", "DIRECTOR"):
            raise HTTPException(status_code=403, detail="Only CEO or Directors can create HR accounts")
        
        if current_user["role"] == "CEO":
            country = data.country or None
            branch_id = ObjectId(data.branchId) if data.branchId else None
            if branch_id:
                branch = db.branches.find_one({"_id": branch_id})
                if not branch:
                    raise HTTPException(status_code=404, detail="Branch not found")
                if country and branch.get("country") != country:
                    raise HTTPException(status_code=400, detail="Branch country does not match assigned country")
                if not country:
                    country = branch.get("country")
        else:
            # Director is creating: country is inherited
            country = current_user.get("country")
            branch_id = ObjectId(data.branchId) if data.branchId else None
            if branch_id:
                branch = db.branches.find_one({"_id": branch_id})
                if not branch:
                    raise HTTPException(status_code=404, detail="Branch not found")
                if branch.get("country") != current_user.get("country"):
                    raise HTTPException(status_code=403, detail="Cannot assign HR to branch outside your country")
    else:
        raise HTTPException(status_code=400, detail="Invalid role. Must be DIRECTOR, BRANCH_ADMIN, ADMIN, or HR")

    if db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = {
        "email": data.email,
        "name": data.name,
        "passwordHash": hash_password(data.password),
        "googleId": None,
        "role": data.role,
        "country": country,
        "branchId": branch_id,
        "createdBy": current_user["_id"],
        "emailVerifiedAt": datetime.now(timezone.utc),
        "isActive": True,
        "totpEnabled": False,
        "totpSecret": None,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }

    result = db.users.insert_one(new_user)
    return {"message": "Account created successfully", "userId": str(result.inserted_id)}

# ─── Forgot Password / Reset Password ──────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    user = db.users.find_one({"email": req.email})
    if not user:
        # We still return success to prevent email enumeration
        return {"message": "If an account exists, an OTP has been sent."}
        
    otp = str(random.randint(100000, 999999))
    print(f"\n{'='*50}\n[DEV] OTP FOR {req.email} IS: {otp}\n{'='*50}\n")
    
    # Store OTP with a 15-minute expiration
    db.passwordResets.update_one(
        {"email": req.email},
        {
            "$set": {
                "otp": hash_password(otp),
                "createdAt": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    # Ensure index exists for expiration (you can set a TTL index in DB, but we'll do manual check for now)
    
    return {"message": "If an account exists, an OTP has been sent."}

@router.post("/verify-reset-otp")
def verify_reset_otp(req: VerifyForgotPasswordOTP):
    reset_doc = db.passwordResets.find_one({"email": req.email})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
        
    # Check if expired (e.g. 15 mins = 900 seconds)
    age = (datetime.now(timezone.utc) - reset_doc["createdAt"].replace(tzinfo=timezone.utc)).total_seconds()
    if age > 900:
        db.passwordResets.delete_one({"email": req.email})
        raise HTTPException(status_code=400, detail="OTP has expired.")
        
    if not verify_password(req.otp, reset_doc["otp"]):
        raise HTTPException(status_code=400, detail="Invalid OTP.")
        
    return {"message": "OTP verified successfully."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    reset_doc = db.passwordResets.find_one({"email": req.email})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired request.")
        
    age = (datetime.now(timezone.utc) - reset_doc["createdAt"].replace(tzinfo=timezone.utc)).total_seconds()
    if age > 900:
        db.passwordResets.delete_one({"email": req.email})
        raise HTTPException(status_code=400, detail="OTP has expired.")
        
    if not verify_password(req.otp, reset_doc["otp"]):
        raise HTTPException(status_code=400, detail="Invalid OTP.")
        
    user = db.users.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"passwordHash": hash_password(req.newPassword)}}
    )
    
    # Consume OTP
    db.passwordResets.delete_one({"email": req.email})
    
    return {"message": "Password reset successfully. You can now login."}

# ─── MFA ──────────────────────────────────────────────────────────────────────

@router.post("/mfa")
def verify_mfa(req: Request, response: Response, mfa_data: VerifyMfa):
    user_id_str = req.cookies.get("pangaea_mfa_pending")
    if not user_id_str:
        user = db.users.find_one({"email": mfa_data.email})
    else:
        user = db.users.find_one({"_id": ObjectId(user_id_str)})

    if not user or not user.get("totpEnabled"):
        raise HTTPException(status_code=400, detail="Invalid MFA request")

    totp = pyotp.TOTP(user["totpSecret"])
    if not totp.verify(mfa_data.code):
        raise HTTPException(status_code=401, detail="Invalid code")

    response.delete_cookie("pangaea_mfa_pending")
    return create_session(user, response)

@router.post("/totp/setup")
def totp_setup(current_user=Depends(get_current_user)):
    secret = generate_totp_secret()
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {"totpSecret": secret}})
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=current_user["email"], issuer_name="Pangaea Pathways CRM")
    return {"secret": secret, "uri": uri}

@router.post("/totp/enable")
def totp_enable(data: VerifyEnableMfa, current_user=Depends(get_current_user)):
    if not current_user.get("totpSecret"):
        raise HTTPException(status_code=400, detail="MFA setup not initiated")
    totp = pyotp.TOTP(current_user["totpSecret"])
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {"totpEnabled": True}})
    return {"message": "MFA enabled successfully"}

@router.post("/totp/disable")
def totp_disable(current_user=Depends(get_current_user)):
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {"totpEnabled": False, "totpSecret": None}})
    return {"message": "MFA disabled successfully"}

# ─── Session ──────────────────────────────────────────────────────────────────

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("pangaea_session")
    return {"ok": True}

@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"],
        "country": current_user.get("country"),
        "branchId": str(current_user["branchId"]) if current_user.get("branchId") else None,
        "totpEnabled": current_user.get("totpEnabled", False),
        "isActive": current_user.get("isActive", True),
    }
