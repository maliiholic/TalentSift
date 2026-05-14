#!/usr/bin/env python
import os
import sys
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, 'd:\\Projects\\TalentSift\\backend')

django.setup()

from practice.models import PracticeTopic
from practice.services.gemini import generate_questions
import logging

logging.basicConfig(level=logging.DEBUG)

# Check topics
print("=" * 60)
print("AVAILABLE TOPICS IN DATABASE:")
print("=" * 60)
topics = PracticeTopic.objects.all()
for t in topics:
    print(f"  - {t.name} (slug: {t.slug}, active: {t.is_active})")

if not topics.exists():
    print("  [NO TOPICS FOUND]")

print("\n" + "=" * 60)
print("TESTING GENERATION FOR DIFFERENT COUNTS:")
print("=" * 60)

test_cases = [
    ("Frontend Development", "beginner", "mcq", 5),
    ("Frontend Development", "beginner", "mcq", 10),
    ("Frontend Development", "advanced", "mixed", 5),
]

for topic, difficulty, qtype, count in test_cases:
    try:
        print(f"\n[TEST] {topic} | {difficulty} | {qtype} | {count} questions")
        result = generate_questions(topic, difficulty, qtype, count)
        print(f"  ✓ Generated {len(result)} questions")
        if len(result) < count:
            print(f"  ⚠ WARNING: Requested {count} but got {len(result)}")
    except Exception as e:
        print(f"  ✗ ERROR: {type(e).__name__}: {e}")
