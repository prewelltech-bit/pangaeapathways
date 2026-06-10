import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Sends an OTP email via Brevo SMTP relay (smtp-relay.brevo.com:587).
    Returns True if sent successfully, False otherwise.
    """
    smtp_host = os.environ.get("SMTP_HOST", "smtp-relay.brevo.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")

    print(f"[SMTP DEBUG] Host={smtp_host}, Port={smtp_port}, User={smtp_user}, Password={'SET' if smtp_password else 'NOT SET'}")

    if not smtp_user or not smtp_password:
        print("[WARNING] SMTP_USER or SMTP_PASSWORD not set. Cannot send email.")
        return False

    try:
        msg = MIMEMultipart()
        smtp_from = os.environ.get("SMTP_FROM_EMAIL", smtp_user)
        msg['From'] = f"Pangaea Pathways CRM <{smtp_from}>"
        msg['To'] = to_email
        msg['Subject'] = "Pangaea Pathways CRM - Password Reset OTP"

        body = f"""Hello,

You requested a password reset for your Pangaea Pathways CRM account.

Your OTP code is: {otp}

This code is valid for 15 minutes. If you did not request this, please ignore this email.

Best regards,
Pangaea Pathways Team
"""
        msg.attach(MIMEText(body, 'plain'))

        print(f"[SMTP DEBUG] Connecting to {smtp_host}:{smtp_port} via STARTTLS...")
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
        server.ehlo()
        server.starttls()
        server.ehlo()
        print(f"[SMTP DEBUG] Logging in as {smtp_user}...")
        server.login(smtp_user, smtp_password)
        print(f"[SMTP DEBUG] Sending email to {to_email}...")
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()
        print(f"[SUCCESS] OTP email sent successfully to {to_email} via Brevo SMTP.")
        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"[ERROR] SMTP Auth failed: {e}")
        return False
    except smtplib.SMTPConnectError as e:
        print(f"[ERROR] Cannot connect to {smtp_host}:{smtp_port} — {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Failed to send email to {to_email}: {type(e).__name__}: {e}")
        return False
