#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, 'd:\\Projects\\TalentSift\\backend')

django.setup()

from practice.services.gemini import _call_groq, GROQ_API_KEY, GROQ_CLIENT, GROQ_MODEL

print(f"GROQ_API_KEY set: {bool(GROQ_API_KEY)}")
print(f"GROQ_MODEL: {GROQ_MODEL}")
print(f"GROQ_CLIENT initialized: {bool(GROQ_CLIENT)}")

if not GROQ_CLIENT:
    print("ERROR: GROQ_CLIENT not initialized. Check requirements or API key.")
    sys.exit(1)

prompt = "Return a JSON array with 2 simple test MCQ questions about Python. Format: [{\"text\": \"Q1\", \"type\": \"mcq\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correct\": \"A\"}]"

try:
    print("\nCalling Groq...")
    result = _call_groq(prompt)
    print(f"Success! Response length: {len(result)} chars")
    print(f"First 200 chars: {result[:200]}")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
