"""
WSGI config for backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import logging

from django.core.wsgi import get_wsgi_application
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')


def _run_migrations_on_boot():
	"""Fail-safe: apply migrations at process boot for fresh databases.

	This is useful in platforms where build/start hooks may not run migrations
	against the same runtime database connection.
	"""
	enabled = os.getenv('AUTO_MIGRATE_ON_BOOT', 'true').lower() in {'1', 'true', 'yes'}
	if not enabled:
		return

	if os.environ.get('MIGRATIONS_RAN_IN_PROCESS') == '1':
		return

	try:
		call_command('migrate', interactive=False, verbosity=1)
	except Exception:
		logging.getLogger(__name__).exception('Automatic migration on boot failed')
		raise
	finally:
		os.environ['MIGRATIONS_RAN_IN_PROCESS'] = '1'


_run_migrations_on_boot()

application = get_wsgi_application()
