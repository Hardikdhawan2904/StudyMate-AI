"""
POST /api/auth/signup    — create account, send OTP
POST /api/auth/login     — verify credentials
POST /api/auth/verify-otp — confirm email
POST /api/auth/resend-otp — new OTP code
POST /api/auth/forgot-password — send reset link
"""

import os
import secrets
import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

import bcrypt

from database import get_db
from models import User
from utils.email import send_email

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

def _lower(v: str) -> str:
    return v.lower()

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    @field_validator("email", mode="before")
    @classmethod
    def normalize(cls, v): return _lower(str(v))

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    @field_validator("email", mode="before")
    @classmethod
    def normalize(cls, v): return _lower(str(v))

class EmailRequest(BaseModel):
    email: EmailStr
    @field_validator("email", mode="before")
    @classmethod
    def normalize(cls, v): return _lower(str(v))

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
    @field_validator("email", mode="before")
    @classmethod
    def normalize(cls, v): return _lower(str(v))

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str
    @field_validator("email", mode="before")
    @classmethod
    def normalize(cls, v): return _lower(str(v))


# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def make_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)


def send_otp_email(to: str, name: str, otp: str):
    html = f"""
    <div style="font-family:Inter,sans-serif;background:#030014;color:#e5e7eb;padding:40px;border-radius:16px;max-width:480px;margin:auto">
      <div style="text-align:center;margin-bottom:32px">
        <div style="display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:10px 20px;border-radius:12px">
          <span style="font-size:18px;font-weight:700;color:white">StudyMate AI</span>
        </div>
      </div>
      <h2 style="color:#f5f3ff;font-size:22px;margin-bottom:8px">Verify your email</h2>
      <p style="color:#9ca3af;font-size:14px;margin-bottom:32px">Hi {name}, use the code below to verify your StudyMate AI account.</p>
      <div style="background:#0e0b1f;border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:32px">
        <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#a78bfa">{otp}</span>
      </div>
      <p style="color:#6b7280;font-size:12px;text-align:center">This code expires in <strong style="color:#9ca3af">10 minutes</strong>. If you didn't sign up, ignore this email.</p>
    </div>
    """
    send_email(to, "StudyMate AI — Email Verification Code", html)


def send_reset_otp_email(to: str, name: str, otp: str):
    html = f"""
    <div style="font-family:Inter,sans-serif;background:#030014;color:#e5e7eb;padding:40px;border-radius:16px;max-width:480px;margin:auto">
      <div style="text-align:center;margin-bottom:32px">
        <div style="display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:10px 20px;border-radius:12px">
          <span style="font-size:18px;font-weight:700;color:white">StudyMate AI</span>
        </div>
      </div>
      <h2 style="color:#f5f3ff;font-size:22px;margin-bottom:8px">Reset your password</h2>
      <p style="color:#9ca3af;font-size:14px;margin-bottom:32px">Hi {name}, use the code below to reset your StudyMate AI password.</p>
      <div style="background:#0e0b1f;border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:32px">
        <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#a78bfa">{otp}</span>
      </div>
      <p style="color:#6b7280;font-size:12px;text-align:center">This code expires in <strong style="color:#9ca3af">10 minutes</strong>. If you didn't request this, ignore this email.</p>
    </div>
    """
    send_email(to, "StudyMate AI — Password Reset Code", html)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/signup")
async def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if len(req.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = db.query(User).filter(User.email == req.email).first()
    if existing and existing.is_verified:
        raise HTTPException(status_code=400, detail="Email already registered.")
    if existing and not existing.is_verified:
        # Resend OTP for unverified account
        otp = make_otp()
        existing.otp = otp
        existing.otp_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        existing.hashed_password = hash_password(req.password)
        existing.name = req.name.strip()
        db.commit()
        send_otp_email(req.email, existing.name, otp)
        return {"message": "OTP resent. Please verify your email."}

    otp = make_otp()
    user = User(
        name=req.name.strip(),
        email=req.email,
        hashed_password=hash_password(req.password),
        is_verified=False,
        otp=otp,
        otp_expiry=datetime.datetime.utcnow() + datetime.timedelta(minutes=10),
    )
    db.add(user)
    db.commit()
    send_otp_email(req.email, user.name, otp)
    return {"message": "Account created. Check your email for the verification code."}


@router.post("/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password. Please try again.")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please verify your email first.")

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        }
    }


@router.post("/verify-otp")
async def verify_otp(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.otp != req.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    if not user.otp_expiry or user.otp_expiry < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")

    user.is_verified = True
    user.otp = None
    user.otp_expiry = None
    db.commit()
    return {"message": "Email verified successfully.", "user": {"id": user.id, "name": user.name, "email": user.email}}


@router.post("/resend-otp")
async def resend_otp(req: EmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified.")

    otp = make_otp()
    user.otp = otp
    user.otp_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    db.commit()
    send_otp_email(req.email, user.name, otp)
    return {"message": "New verification code sent."}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    user = db.query(User).filter(User.email == req.email).first()
    if not user or user.reset_token != req.token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")
    if not user.reset_token_expiry or user.reset_token_expiry < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")

    user.hashed_password = hash_password(req.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()
    return {"message": "Password reset successfully. You can now sign in."}


@router.post("/forgot-password")
async def forgot_password(req: EmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user and user.is_verified:
        otp = make_otp()
        user.reset_token = otp
        user.reset_token_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        db.commit()
        send_reset_otp_email(req.email, user.name, otp)
    # Always succeed — no email enumeration
    return {"message": "If this email is registered, you will receive a reset link shortly."}
