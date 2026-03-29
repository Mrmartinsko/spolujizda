import secrets
from datetime import datetime, timedelta


def generate_token_with_expiration(*, hours=24):
    token = secrets.token_urlsafe(48)
    expires_at = datetime.utcnow() + timedelta(hours=hours)
    return token, expires_at
