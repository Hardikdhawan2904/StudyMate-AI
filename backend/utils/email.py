import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str, reply_to: str = "") -> bool:
    gmail_user = os.getenv("GMAIL_USER", "")
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD", "")

    if not gmail_user or not gmail_pass:
        logger.warning("[DEV EMAIL] To: %s | Subject: %s", to, subject)
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"StudyMate AI <{gmail_user}>"
        msg["To"]      = to
        if reply_to:
            msg["Reply-To"] = reply_to
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(gmail_user, gmail_pass)
            smtp.sendmail(gmail_user, to, msg.as_string())

        logger.info("[Email] Sent to %s", to)
        return True
    except Exception as exc:
        logger.error("[Email ERROR] %s", exc)
        return False
