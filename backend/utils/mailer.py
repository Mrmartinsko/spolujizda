import os
import smtplib
from email.message import EmailMessage

def send_verification_email(to_email: str, verify_url: str):
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM", user)

    if not host or not user or not password or not from_email:
        # fallback pro dev – když SMTP není nastavené, aspoň to nespadne
        print("\n[DEV] SMTP není nastavené, posílání emailu přeskočeno.")
        print(f"[DEV] Verify URL: {verify_url}\n")
        return

    msg = EmailMessage()
    msg["Subject"] = "Ověření emailu – Spolujízda"
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(
        "Ahoj!\n\n"
        "Klikni na odkaz pro ověření emailu:\n"
        f"{verify_url}\n\n"
        "Pokud jsi účet nezakládal, ignoruj tento email.\n"
    )

    with smtplib.SMTP(host, port) as server:
        server.starttls()
        server.login(user, password)
        server.send_message(msg)
