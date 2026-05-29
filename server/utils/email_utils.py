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

        # Setup SMTP connection (TLS)
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()
        print(f"[SUCCESS] OTP email sent successfully to {to_email} via SMTP.")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send email via SMTP to {to_email}: {e}")
        return False
