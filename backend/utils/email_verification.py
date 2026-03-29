from utils.auth_tokens import generate_token_with_expiration

def generate_email_verification(hours=24):
    return generate_token_with_expiration(hours=hours)
