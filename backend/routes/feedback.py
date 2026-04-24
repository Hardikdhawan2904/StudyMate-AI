from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import os
import resend

router = APIRouter(prefix="/feedback", tags=["Feedback"])

resend.api_key = os.getenv("RESEND_API_KEY", "")
FEEDBACK_TO   = os.getenv("FEEDBACK_TO", "dhawanhardik180@gmail.com")
RESEND_FROM   = os.getenv("RESEND_FROM", "onboarding@resend.dev")


class FeedbackRequest(BaseModel):
    name:    str
    email:   Optional[str] = ""
    type:    str            # "bug" | "suggestion" | "question" | "other"
    message: str


TYPE_LABELS = {
    "bug":        "Bug Report",
    "suggestion": "Suggestion",
    "question":   "Question",
    "other":      "General Feedback",
}


@router.post("")
def send_feedback(req: FeedbackRequest):
    label = TYPE_LABELS.get(req.type, "Feedback")
    subject = f"[StudyMate AI] {label} from {req.name}"

    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0d0b1e;color:#e5e7eb;padding:32px;border-radius:12px;border:1px solid #4c1d95;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #1e1b4b;">
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:18px;">📚</div>
        <div>
          <p style="margin:0;font-size:16px;font-weight:700;color:#fff;">StudyMate AI</p>
          <p style="margin:0;font-size:11px;color:#6b7280;">New {label}</p>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:8px 0;color:#9ca3af;font-size:12px;width:100px;">From</td>
          <td style="padding:8px 0;font-size:13px;color:#e5e7eb;font-weight:600;">{req.name}</td>
        </tr>
        {"<tr><td style='padding:8px 0;color:#9ca3af;font-size:12px;'>Email</td><td style='padding:8px 0;font-size:13px;color:#60a5fa;'>" + req.email + "</td></tr>" if req.email else ""}
        <tr>
          <td style="padding:8px 0;color:#9ca3af;font-size:12px;">Type</td>
          <td style="padding:8px 0;">
            <span style="font-size:11px;padding:3px 10px;border-radius:20px;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.4);color:#c4b5fd;font-weight:600;">{label}</span>
          </td>
        </tr>
      </table>

      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;margin-top:4px;">
        <p style="margin:0 0 6px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Message</p>
        <p style="margin:0;font-size:14px;color:#d1d5db;line-height:1.7;white-space:pre-wrap;">{req.message}</p>
      </div>

      <p style="margin:24px 0 0;font-size:11px;color:#374151;text-align:center;">Sent via StudyMate AI feedback form</p>
    </div>
    """

    try:
        resend.Emails.send({
            "from":    RESEND_FROM,
            "to":      [FEEDBACK_TO],
            "subject": subject,
            "html":    html,
            "reply_to": req.email if req.email else None,
        })
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}
