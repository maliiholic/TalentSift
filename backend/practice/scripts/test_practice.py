import os
import sys
import json
import requests

API_BASE = os.getenv('PRACTICE_API','http://localhost:8000')
TOKEN = os.getenv('PRACTICE_TOKEN')

if not TOKEN:
    print('Error: set PRACTICE_TOKEN environment variable to your access token')
    sys.exit(2)

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

def start_session(topic='Frontend Development', difficulty='intermediate', qtype='mixed', total=3):
    url = f"{API_BASE}/api/practice/start/"
    payload = {
        'topic': topic,
        'difficulty': difficulty,
        'question_type': qtype,
        'total_questions': total
    }
    r = requests.post(url, headers=headers, json=payload)
    print('START_SESSION STATUS:', r.status_code)
    try:
        print(json.dumps(r.json(), indent=2))
    except Exception:
        print(r.text)
    return r


def submit_answer(question_id, user_answer):
    url = f"{API_BASE}/api/practice/submit-answer/"
    payload = {
        'question_id': question_id,
        'user_answer': user_answer
    }
    r = requests.post(url, headers=headers, json=payload)
    print('SUBMIT_ANSWER STATUS:', r.status_code)
    try:
        print(json.dumps(r.json(), indent=2))
    except Exception:
        print(r.text)
    return r


if __name__ == '__main__':
    # Start session
    r = start_session()
    if r.status_code != 201:
        sys.exit(1)

    data = r.json()
    questions = data.get('questions') or []
    if not questions:
        print('No questions returned')
        sys.exit(1)

    # Find a text question to submit to
    q = None
    for item in questions:
        if item.get('question_type') == 'text':
            q = item
            break
    if not q:
        q = questions[0]

    qid = q['id']
    print('\nSubmitting sample answer to question id', qid)
    sample_answer = 'A concise explanation covering the main concepts requested.'
    submit_answer(qid, sample_answer)
