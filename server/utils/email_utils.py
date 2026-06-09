import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Sends an OTP email to the recipient using SMTP_SSL on port 465.
    Using port 465 (SSL) instead of 587 (STARTTLS) for better cloud compatibility.
    Returns True if sent successfully, False otherwise.
    """
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")

    print(f"[SMTP DEBUG] Host={smtp_host}, Port=465 (SSL), User={smtp_user}, Password={'SET' if smtp_password else 'NOT SET'}")

    if not smtp_user or not smtp_password:
        print("[WARNING] SMTP_USER or SMTP_PASSWORD not set. Cannot send email.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
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

        # Use SMTP_SSL on port 465 — more reliable on cloud platforms like Render
        context = ssl.create_default_context()
        print(f"[SMTP DEBUG] Connecting to {smtp_host}:465 via SSL...")
        with smtplib.SMTP_SSL(smtp_host, 465, context=context, timeout=30) as server:
            print(f"[SMTP DEBUG] Logging in as {smtp_user}...")
            server.login(smtp_user, smtp_password)
            print(f"[SMTP DEBUG] Sending email to {to_email}...")
            server.sendmail(smtp_user, to_email, msg.as_string())

        print(f"[SUCCESS] OTP email sent successfully to {to_email} via SMTP_SSL port 465.")
        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"[ERROR] SMTP Auth failed for {smtp_user}: {e}")
        print("[HINT] Make sure 2-Step Verification is ON and you're using a Google App Password (not your normal password).")
        return False
    except smtplib.SMTPConnectError as e:
        print(f"[ERROR] Cannot connect to {smtp_host}:465 — {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Failed to send email to {to_email}: {type(e).__name__}: {e}")
        return False
