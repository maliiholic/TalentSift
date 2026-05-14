#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, 'd:\\Projects\\TalentSift\\backend')

django.setup()

from practice.models import PracticeTopic

topics_to_create = [
    {
        'name': 'Full Stack Development',
        'slug': 'full-stack-development',
        'icon': '🔄',
        'is_active': True
    },
    {
        'name': 'Data Science',
        'slug': 'data-science',
        'icon': '📊',
        'is_active': True
    },
    {
        'name': 'DevOps',
        'slug': 'devops',
        'icon': '⚙️',
        'is_active': True
    },
]

for topic_data in topics_to_create:
    topic, created = PracticeTopic.objects.get_or_create(
        name=topic_data['name'],
        defaults=topic_data
    )
    if created:
        print(f"✓ Created: {topic.name}")
    else:
        print(f"✗ Already exists: {topic.name}")

print("\n" + "=" * 60)
print("ALL TOPICS IN DATABASE:")
print("=" * 60)
for t in PracticeTopic.objects.all():
    print(f"  - {t.name} (slug: {t.slug})")
