import logging
import os
import smtplib
from email.message import EmailMessage
from html import escape

logger = logging.getLogger(__name__)


def _build_email_html(*, title, intro, button_label, button_url, footer_text):
    safe_title = escape(title)
    safe_intro = escape(intro)
    safe_button_label = escape(button_label)
    safe_button_url = escape(button_url, quote=True)
    safe_footer = escape(footer_text)

    return f"""\
<!doctype html>
<html lang="cs">
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
        <div style="font-size:24px;font-weight:700;margin-bottom:16px;color:#111827;">{safe_title}</div>
        <p style="margin:0 0 24px;line-height:1.6;font-size:16px;color:#374151;">{safe_intro}</p>
        <a href="{safe_button_url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
          {safe_button_label}
        </a>
        <p style="margin:24px 0 8px;line-height:1.6;font-size:14px;color:#6b7280;">
          Pokud tlacitko nefunguje, pouzij tento odkaz:
        </p>
        <p style="margin:0 0 24px;word-break:break-all;">
          <a href="{safe_button_url}" style="color:#2563eb;text-decoration:underline;">{safe_button_url}</a>
        </p>
        <p style="margin:0;line-height:1.6;font-size:14px;color:#6b7280;">{safe_footer}</p>
      </div>
    </div>
  </body>
</html>
"""


def send_email(*, to_email, subject, text_content, html_content=None):
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM", user)

    if not host or not user or not password or not from_email:
        logger.info("SMTP neni nastavene, posilani emailu preskoceno pro %s", to_email)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(text_content)

    if html_content:
        msg.add_alternative(html_content, subtype="html")

    try:
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
    except OSError:
        logger.exception("Nepodarilo se odeslat email na %s", to_email)


def send_verification_email(to_email: str, verify_url: str):
    subject = "Overeni emailu - Spolujizda"
    text_content = (
        "Ahoj!\n\n"
        "Dokonceni registrace provedes kliknutim na tento odkaz:\n"
        f"{verify_url}\n\n"
        "Pokud jsi ucet nezakladal, tento email ignoruj.\n"
    )
    html_content = _build_email_html(
        title="Overeni emailu",
        intro="Dekujeme za registraci do Spolujizdy. Pro dokonceni registrace prosim over svoji emailovou adresu.",
        button_label="Overit email",
        button_url=verify_url,
        footer_text="Pokud jsi ucet nezakladal, tento email muzes ignorovat.",
    )
    send_email(
        to_email=to_email,
        subject=subject,
        text_content=text_content,
        html_content=html_content,
    )


def send_password_reset_email(to_email: str, reset_url: str):
    subject = "Obnova hesla - Spolujizda"
    text_content = (
        "Ahoj!\n\n"
        "Obnovu hesla provedes kliknutim na tento odkaz:\n"
        f"{reset_url}\n\n"
        "Pokud jsi o obnovu hesla nezadal, tento email ignoruj.\n"
    )
    html_content = _build_email_html(
        title="Obnova hesla",
        intro="Prisla nam zadost o obnovu hesla k tvemu uctu ve Spolujizde. Pokud jsi ji odeslal ty, nastav si nove heslo pomoci tlacitka niz.",
        button_label="Obnovit heslo",
        button_url=reset_url,
        footer_text="Pokud jsi o obnovu hesla nezadal, tento email muzes bezpecne ignorovat.",
    )
    send_email(
        to_email=to_email,
        subject=subject,
        text_content=text_content,
        html_content=html_content,
    )
