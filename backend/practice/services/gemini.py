import os
import json
import time
import logging
import socket

try:
    from google import genai  # type: ignore[reportMissingImports]
    from google.genai import types  # type: ignore[reportMissingImports]
except Exception:  # pragma: no cover - fallback only
    genai = None
    types = None

try:
    from langchain_groq import ChatGroq
except Exception:  # pragma: no cover - fallback only
    ChatGroq = None

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_CLIENT = genai.Client(api_key=GEMINI_API_KEY) if genai and GEMINI_API_KEY else None
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_MODEL = os.getenv('GROQ_MODEL', 'openai/gpt-oss-20b')
GROQ_CLIENT = ChatGroq(model=GROQ_MODEL, api_key=GROQ_API_KEY) if ChatGroq and GROQ_API_KEY else None


def _is_gemini_quota_error(error):
    message = str(error).lower()
    return (
        'resource_exhausted' in message
        or 'quota' in message
        or '429' in message
        or 'rate limit' in message
        or 'generate_content_free_tier' in message
    )


def _is_gemini_network_error(error):
    message = str(error).lower()
    return (
        isinstance(error, socket.gaierror)
        or 'getaddrinfo failed' in message
        or 'name or service not known' in message
        or 'temporary failure in name resolution' in message
        or 'dns' in message
    )


def _call_gemini(prompt, model='gemini-2.0-flash', max_output_tokens=4096, timeout=15):
    if not GEMINI_API_KEY:
        raise RuntimeError('GEMINI_API_KEY not configured')
    if not GEMINI_CLIENT:
        raise RuntimeError('google.genai client not configured')

    last_e = None
    # Basic retry
    for attempt in range(2):
        try:
            config = None
            if types is not None:
                config = types.GenerateContentConfig(
                    max_output_tokens=max_output_tokens,
                    response_mime_type="application/json"
                )
            resp = GEMINI_CLIENT.models.generate_content(
                model=model,
                contents=prompt,
                config=config,
            )
            return resp.text
        except Exception as e:
            last_e = e
            logger.exception('Gemini call error, attempt %s: %s', attempt + 1, e)
            if _is_gemini_quota_error(e) or _is_gemini_network_error(e):
                raise RuntimeError('Gemini unavailable due to quota or network error') from e
            time.sleep(1)
            
    if last_e:
        raise last_e
    raise RuntimeError('Gemini API call failed after retries')


def _call_groq(prompt, max_output_tokens=4096):
    if not GROQ_API_KEY:
        raise RuntimeError('GROQ_API_KEY not configured')
    if not GROQ_CLIENT:
        raise RuntimeError('langchain_groq client not configured')

    try:
        response = GROQ_CLIENT.invoke(prompt)
        content = getattr(response, 'content', response)
        if isinstance(content, list):
            content = ''.join(str(item) for item in content)
        return str(content)
    except Exception as e:
        logger.exception('Groq call error: %s', e)
        raise RuntimeError('Groq generation failed') from e


def _build_question_prompt(topic, difficulty, question_type, total_questions):
    return f"""
Produce a JSON array of exactly {total_questions} UNIQUE, non-repeating interview/practice questions about the topic \"{topic}\" at the {difficulty} level.
The requested question type is \"{question_type}\".

Return ONLY a valid JSON array. Each item must be an object with these fields:
 - text: the question string
 - type: either \"mcq\" or \"text\"
 - options: for mcq, an array of exactly 4 option strings
 - correct: for mcq, the correct option string from the options array (server-only)
 - rubric: for text questions, a short rubric (2-4 bullet points) describing what a strong answer should include

STRICT RULES:
1. If requested question type is \"mcq\", EVERY single question must have type \"mcq\".
2. If requested question type is \"text\", EVERY single question must have type \"text\".
3. If requested question type is \"mixed\", return roughly half \"mcq\" and half \"text\".
4. Ensure variety in concepts tested. Do NOT repeat the same questions.
5. For mcq questions, include plausible distractors. Do NOT include additional commentary or markdown. Return raw JSON.
6. Generate EXACTLY {total_questions} questions.
"""


def generate_questions(topic, difficulty, question_type, total_questions=5):
    """Generate a list of questions as JSON using Gemini.

    Returns list of questions where each question is a dict with keys:
      - text (str)
      - type ("mcq"|"text")
      - options (list) optional for mcq
      - correct (str) optional for mcq (server-only)
      - rubric (str) optional for text
    """
    prompt = _build_question_prompt(topic, difficulty, question_type, total_questions)

    def _parse_question_json(raw, source):
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                return data
        except Exception:
            logger.exception('Failed to parse %s JSON response', source)
            start = raw.find('[')
            end = raw.rfind(']')
            if start != -1 and end != -1 and end > start:
                try:
                    data = json.loads(raw[start:end+1])
                    return data
                except Exception:
                    logger.exception('Failed to parse extracted %s JSON', source)
        raise ValueError(f'Invalid JSON from {source}')

    try:
        raw = _call_groq(prompt)
        return _parse_question_json(raw, 'Groq')
    except Exception as groq_error:
        logger.warning('Groq generation unavailable, trying Gemini fallback: %s', groq_error)

    try:
        raw = _call_gemini(prompt)
        return _parse_question_json(raw, 'Gemini')
    except Exception as gemini_error:
        logger.warning('Gemini generation unavailable, caller should use local fallback: %s', gemini_error)

    raise ValueError('Invalid JSON from AI providers')


def evaluate_text_answer(question_text, rubric, user_answer):
    """Evaluate a candidate's free-text answer and return structured feedback.

    Returns dict with keys: score (0-10), feedback_good, feedback_missing, model_answer
    """
    prompt = f"""
You are a STRICT, FAIR, and OBJECTIVE technical interviewer. Evaluate the candidate's answer.
Do NOT praise incorrect, vague, or fundamentally flawed answers. If the answer is wrong, explicitly state that it is incorrect and give a low score (0-4).
If it is partially correct, give a moderate score (5-7).
If it is excellent, give a high score (8-10).

Return ONLY a JSON object with fields:
 - score: (number 0-10)
 - feedback_good: (short text, leave empty if the answer is completely wrong)
 - feedback_missing: (short text, direct and constructive critique)
 - model_answer: (3-4 sentence ideal answer)

Question: {question_text}
Rubric: {rubric}
Candidate answer: {user_answer}
"""

    raw = None
    try:
        raw = _call_gemini(prompt)
        data = json.loads(raw)
        # ensure required keys
        if all(k in data for k in ('score', 'feedback_good', 'feedback_missing', 'model_answer')):
            return data
    except Exception:
        logger.exception('Failed to parse Gemini eval response or call failed')

    # Try to extract JSON object if raw text exists
    if raw:
        start = raw.find('{')
        end = raw.rfind('}')
        if start != -1 and end != -1 and end > start:
            try:
                data = json.loads(raw[start:end+1])
                if all(k in data for k in ('score', 'feedback_good', 'feedback_missing', 'model_answer')):
                    return data
            except Exception:
                logger.exception('Failed to parse extracted eval JSON')

    # FINAL FALLBACK: heuristic scorer based on rubric keywords and simple token similarity
    try:
        # expose a small helper for other modules to compute token-frequency vectors
        def compute_text_vector_for_export(t):
            words = [w.strip(".,:;()[]\"'\n\t").lower() for w in (t or '').split()]
            vec = {}
            for w in words:
                if len(w) <= 2:
                    continue
                vec[w] = vec.get(w, 0) + 1
            return vec

        # attach helper to module level for import
        globals()['compute_text_vector'] = compute_text_vector_for_export

        def _text_vector(t):
            words = [w.strip(".,:;()[]\"'\n\t").lower() for w in (t or '').split()]
            vec = {}
            for w in words:
                if len(w) <= 2:
                    continue
                vec[w] = vec.get(w, 0) + 1
            return vec

        def _cosine_sim(d1, d2):
            dot = 0.0
            for k, v in d1.items():
                if k in d2:
                    dot += v * d2[k]
            norm1 = sum(v * v for v in d1.values()) ** 0.5
            norm2 = sum(v * v for v in d2.values()) ** 0.5
            if norm1 == 0 or norm2 == 0:
                return 0.0
            return dot / (norm1 * norm2)

        rubric_vec = _text_vector(rubric)
        answer_vec = _text_vector(user_answer)
        similarity = round(_cosine_sim(rubric_vec, answer_vec) * 10, 2)  # 0-10 scale

        # reuse keyword coverage for readable feedback
        tokens = [w.lower() for w in json.dumps(rubric).replace('\n', ' ').split()]
        keywords = [t.strip(".,:;()[]\"'") for t in tokens if len(t.strip(".,:;()[]\"'")) > 3]
        keywords = list(dict.fromkeys(keywords))
        answer_text = (user_answer or '').lower()
        matches = [k for k in keywords if k in answer_text]
        match_count = len(matches)
        total = len(keywords) if keywords else 1

        score = int(round(similarity)) if similarity is not None else 7
        score = max(0, min(10, score))

        feedback_good = (
            f'Covered {match_count} of {total} rubric points: ' + ', '.join(matches)
            if matches else 'Some correct ideas, but missing key rubric points.'
        )
        missing = [k for k in keywords if k not in matches]
        feedback_missing = (
            'Mention: ' + ', '.join(missing[:6]) if missing else 'No major omissions detected.'
        )
        model_answer = 'Strong answer should include: ' + ' '.join(rubric.splitlines()[:3]) if rubric else 'A strong answer would be concise and cover the key concepts requested by the question.'

        return {
            'score': score,
            'feedback_good': feedback_good,
            'feedback_missing': feedback_missing,
            'model_answer': model_answer,
            'similarity': similarity
        }
    except Exception:
        return {
            'score': 7,
            'feedback_good': 'Good effort. Keep practicing!',
            'feedback_missing': 'Consider providing more detail.',
            'model_answer': 'This is a placeholder model answer. Gemini evaluation unavailable.',
            'similarity': 0.0
        }
