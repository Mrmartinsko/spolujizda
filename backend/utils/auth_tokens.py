import secrets
from datetime import timedelta

from utils.datetime_utils import utc_now


def generate_token_with_expiration(*, hours=24):
    token = secrets.token_urlsafe(48)
    expires_at = utc_now() + timedelta(hours=hours)
    return token, expires_at
