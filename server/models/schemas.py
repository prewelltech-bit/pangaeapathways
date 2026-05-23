from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    country: Optional[str] = None
    branchId: Optional[str] = None
    signupSecret: Optional[str] = None

class CreateUserByAdmin(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    country: Optional[str] = None
    branchId: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    credential: str
    role: Optional[str] = None
    country: Optional[str] = None
    branchId: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class VerifyMfa(BaseModel):
    email: EmailStr
    code: str

class VerifyEnableMfa(BaseModel):
    code: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    oldPassword: Optional[str] = None
    password: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyForgotPasswordOTP(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    newPassword: str

class BranchCreate(BaseModel):
    name: str
    city: str
    country: str

class LeadCreate(BaseModel):
    fullName: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: str = "WEBSITE"
    leadStatus: str = "NEW"
    productLine: str = "UK"
    targetCountryPrimary: Optional[str] = None
    targetCountrySecondary: Optional[str] = None
    branchId: str
    ownerId: Optional[str] = None
    referringPartnerId: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    consentContact: bool = False
    model_config = {"extra": "allow"}

class LeadUpdate(BaseModel):
    fullName: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    leadStatus: Optional[str] = None
    productLine: Optional[str] = None
    targetCountryPrimary: Optional[str] = None
    targetCountrySecondary: Optional[str] = None
    branchId: Optional[str] = None
    ownerId: Optional[str] = None
    referringPartnerId: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    consentContact: Optional[bool] = None
    model_config = {"extra": "allow"}

class LeadTransferRequest(BaseModel):
    sourceUserId: str
    destinationUserId: str
    destinationBranchId: str
    limit: Optional[int] = None
    transferReason: str

class CaseCreate(BaseModel):
    leadId: str
    productLine: Optional[str] = None
    targetCountry: Optional[str] = None
    visaType: Optional[str] = None
    stage: Optional[str] = "CASE_INITIATED"
    model_config = {"extra": "allow"}

class TaskCreate(BaseModel):
    title: str
    dueDate: str
    assigneeId: str
    leadId: Optional[str] = None
    priority: str = "MEDIUM"
    model_config = {"extra": "allow"}

class LeaveRequestCreate(BaseModel):
    startDate: str
    endDate: str
    reason: str
    model_config = {"extra": "allow"}

class InvoiceLine(BaseModel):
    description: str
    quantity: int
    unitExGst: float
    gstRatePct: float

class InvoiceCreate(BaseModel):
    leadId: str
    dueDate: str
    currency: str = "INR"
    notes: Optional[str] = None
    lines: List[InvoiceLine]
    model_config = {"extra": "allow"}

class PaymentCreate(BaseModel):
    invoiceId: str
    amount: float
    method: str
    reference: Optional[str] = None
    model_config = {"extra": "allow"}

class AppointmentCreate(BaseModel):
    title: str
    appointmentDate: str          # "YYYY-MM-DD"
    appointmentTime: str          # "HH:MM"
    durationMins: int = 30
    type: str = "IN_PERSON"       # IN_PERSON | VIDEO_CALL | PHONE
    leadId: Optional[str] = None
    assigneeId: Optional[str] = None
    notes: Optional[str] = None
    model_config = {"extra": "allow"}

class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    appointmentDate: Optional[str] = None
    appointmentTime: Optional[str] = None
    durationMins: Optional[int] = None
    type: Optional[str] = None
    leadId: Optional[str] = None
    assigneeId: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None  # SCHEDULED | COMPLETED | CANCELLED | NO_SHOW
    model_config = {"extra": "allow"}
