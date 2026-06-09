import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Sends an OTP email to the recipient using SMTP configuration from environment variables.
    Returns True if sent successfully, False otherwise.
    """
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER")
    # This should be a Google App Password if using smtp.gmail.com
    smtp_password = os.environ.get("SMTP_PASSWORD")

    print(f"[SMTP DEBUG] Host={smtp_host}, Port={smtp_port}, User={smtp_user}, Password={'SET' if smtp_password else 'NOT SET'}")

    if not smtp_user or not smtp_password:
        print("[WARNING] SMTP_USER or SMTP_PASSWORD not set in .env. Falling back to terminal/local file.")
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

        # Setup SMTP connection (TLS) with a 30-second timeout
        print(f"[SMTP DEBUG] Connecting to {smtp_host}:{smtp_port}...")
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
        server.ehlo()
        server.starttls()
        server.ehlo()
        print(f"[SMTP DEBUG] Logging in as {smtp_user}...")
        server.login(smtp_user, smtp_password)
        print(f"[SMTP DEBUG] Sending email to {to_email}...")
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()
        print(f"[SUCCESS] OTP email sent successfully to {to_email} via SMTP.")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"[ERROR] SMTP Authentication failed: {e}. Check App Password is correct and 2FA is enabled on Gmail.")
        return False
    except smtplib.SMTPConnectError as e:
        print(f"[ERROR] Could not connect to SMTP server {smtp_host}:{smtp_port}: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Failed to send email via SMTP to {to_email}: {type(e).__name__}: {e}")
        return False
