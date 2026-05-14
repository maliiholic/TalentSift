#!/usr/bin/env python
import os
import sys
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, 'd:\\Projects\\TalentSift\\backend')

django.setup()

from practice.services.gemini import generate_questions
from practice.models import PracticeTopic

# Check if topic exists
print("Available topics:")
for topic in PracticeTopic.objects.all():
    print(f"  - {topic.name} (slug: {topic.slug})")

# Try to generate questions
try:
    print("\nTesting generate_questions('Frontend Development', 'beginner', 'mcq', 2)...")
    result = generate_questions('Frontend Development', 'beginner', 'mcq', 2)
    print(f"Success! Generated {len(result)} questions")
    print(f"First question: {json.dumps(result[0], indent=2)}")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
