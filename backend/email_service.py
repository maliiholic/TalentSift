import logging

import requests
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_otp_email(subject, message, recipient_email):
    brevo_api_key = getattr(settings, 'BREVO_API_KEY', '').strip()
    brevo_from_email = getattr(settings, 'BREVO_FROM_EMAIL', '').strip() or getattr(settings, 'DEFAULT_FROM_EMAIL', '').strip()
    brevo_from_name = getattr(settings, 'BREVO_FROM_NAME', 'TalentSift').strip() or 'TalentSift'
    sendgrid_api_key = getattr(settings, 'SENDGRID_API_KEY', '').strip()
    sendgrid_from_email = getattr(settings, 'SENDGRID_FROM_EMAIL', '').strip() or getattr(settings, 'DEFAULT_FROM_EMAIL', '').strip()
    sendgrid_from_name = getattr(settings, 'SENDGRID_FROM_NAME', 'TalentSift').strip() or 'TalentSift'

    if brevo_api_key:
        response = requests.post(
            'https://api.brevo.com/v3/smtp/email',
            headers={
                'api-key': brevo_api_key,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            json={
                'sender': {
                    'email': brevo_from_email,
                    'name': brevo_from_name,
                },
                'to': [
                    {
                        'email': recipient_email,
                    }
                ],
                'subject': subject,
                'textContent': message,
            },
            timeout=20,
        )
        if response.status_code not in (200, 201, 202):
            raise RuntimeError(f'Brevo API failed: {response.status_code} {response.text}')
        return

    if sendgrid_api_key:
        response = requests.post(
            'https://api.sendgrid.com/v3/mail/send',
            headers={
                'Authorization': f'Bearer {sendgrid_api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'personalizations': [
                    {
                        'to': [{'email': recipient_email}],
                        'subject': subject,
                    }
                ],
                'from': {
                    'email': sendgrid_from_email,
                    'name': sendgrid_from_name,
                },
                'content': [
                    {
                        'type': 'text/plain',
                        'value': message,
                    }
                ],
            },
            timeout=20,
        )
        if response.status_code not in (200, 202):
            raise RuntimeError(f'SendGrid API failed: {response.status_code} {response.text}')
        return

    send_mail(
        subject,
        message,
        getattr(settings, 'DEFAULT_FROM_EMAIL', sendgrid_from_email),
        [recipient_email],
        fail_silently=False,
    )