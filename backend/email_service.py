import logging

import requests
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_otp_email(subject, message, recipient_email):
    resend_api_key = getattr(settings, 'RESEND_API_KEY', '').strip()
    resend_from_email = getattr(settings, 'RESEND_FROM_EMAIL', '').strip() or getattr(settings, 'DEFAULT_FROM_EMAIL', '').strip()

    if resend_api_key:
        response = requests.post(
            'https://api.resend.com/emails',
            headers={
                'Authorization': f'Bearer {resend_api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'from': resend_from_email,
                'to': [recipient_email],
                'subject': subject,
                'text': message,
            },
            timeout=20,
        )
        if not response.ok:
            raise RuntimeError(f'Resend API failed: {response.status_code} {response.text}')
        return

    send_mail(
        subject,
        message,
        getattr(settings, 'DEFAULT_FROM_EMAIL', resend_from_email),
        [recipient_email],
        fail_silently=False,
    )