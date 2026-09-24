"""
SourceSense – Alert dispatcher.

Sends SMS, WhatsApp (via Twilio), and email (via SMTP) notifications
to site managers when relay state changes.

All credentials are read from env vars. If credentials are absent,
the channel is marked "skipped" rather than raising an error.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


def _build_message(event_data: dict) -> str:
    action = event_data.get("relay_action", "?")
    pm10 = event_data.get("pm10_corrected", "N/A")
    label = event_data.get("classifier_label", "N/A")
    confidence = event_data.get("classifier_confidence", 0)
    ts = event_data.get("timestamp", "N/A")
    node = event_data.get("node_name", "Unknown Node")

    return (
        f"[SourceSense Alert] Node: {node}\n"
        f"Relay: {action}\n"
        f"PM10: {pm10} µg/m³ | Source: {label} ({confidence*100:.0f}%)\n"
        f"Time: {ts}\n"
        f"Reason: {event_data.get('trigger_reason', '')}"
    )


def _send_twilio_sms(to: str, body: str) -> dict:
    if not all([settings.twilio_account_sid, settings.twilio_auth_token, settings.twilio_from_number]):
        return {"status": "skipped", "detail": "Twilio credentials not configured"}
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        msg = client.messages.create(body=body, from_=settings.twilio_from_number, to=to)
        return {"status": "sent", "sid": msg.sid}
    except Exception as e:
        logger.error("SMS dispatch failed: %s", e)
        return {"status": "failed", "detail": str(e)}


def _send_twilio_whatsapp(to: str, body: str) -> dict:
    if not all([settings.twilio_account_sid, settings.twilio_auth_token, settings.twilio_whatsapp_from]):
        return {"status": "skipped", "detail": "Twilio WhatsApp credentials not configured"}
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        wa_to = f"whatsapp:{to}" if not to.startswith("whatsapp:") else to
        wa_from = settings.twilio_whatsapp_from
        if not wa_from.startswith("whatsapp:"):
            wa_from = f"whatsapp:{wa_from}"
        msg = client.messages.create(body=body, from_=wa_from, to=wa_to)
        return {"status": "sent", "sid": msg.sid}
    except Exception as e:
        logger.error("WhatsApp dispatch failed: %s", e)
        return {"status": "failed", "detail": str(e)}


def _send_email(to: str, subject: str, body: str) -> dict:
    if not all([settings.smtp_host, settings.smtp_user, settings.smtp_password]):
        return {"status": "skipped", "detail": "SMTP credentials not configured"}
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.smtp_from
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, to, msg.as_string())
        return {"status": "sent"}
    except Exception as e:
        logger.error("Email dispatch failed: %s", e)
        return {"status": "failed", "detail": str(e)}


def dispatch(
    event_data: dict,
    site_manager_phone: Optional[str] = None,
    site_manager_email: Optional[str] = None,
    channels: list[str] = None,
) -> list[dict]:
    """
    Dispatch alerts across configured channels.

    Parameters
    ----------
    event_data : dict with relay_action, pm10_corrected, classifier_label, etc.
    channels   : subset of ["sms", "whatsapp", "email"], defaults to all

    Returns
    -------
    List of dispatch result dicts (one per channel attempted).
    """
    if channels is None:
        channels = ["sms", "whatsapp", "email"]

    body = _build_message(event_data)
    subject = f"[SourceSense] Relay {event_data.get('relay_action')} — {event_data.get('node_name', 'Node')}"
    results = []

    for ch in channels:
        if ch == "sms" and site_manager_phone:
            res = _send_twilio_sms(site_manager_phone, body)
            results.append({"channel": "sms", "recipient": site_manager_phone, **res, "message": body})

        elif ch == "whatsapp" and site_manager_phone:
            res = _send_twilio_whatsapp(site_manager_phone, body)
            results.append({"channel": "whatsapp", "recipient": site_manager_phone, **res, "message": body})

        elif ch == "email" and site_manager_email:
            res = _send_email(site_manager_email, subject, body)
            results.append({"channel": "email", "recipient": site_manager_email, **res, "message": body})

    return results
