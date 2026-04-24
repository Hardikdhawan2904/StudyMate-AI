"""One-time migration: lowercase all existing email addresses."""
from database import SessionLocal
from models import User

db = SessionLocal()
users = db.query(User).all()
changed = 0
for u in users:
    lower = u.email.lower()
    if u.email != lower:
        u.email = lower
        changed += 1
db.commit()
db.close()
print(f"Done. Updated {changed} email(s).")
