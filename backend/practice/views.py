from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Avg
from django.utils import timezone
from .models import PracticeTopic, PracticeSession, PracticeQuestion, PracticeAttempt, PracticeSessionAnalytics
from getUserData.JWT import CustomJWTAuthentication
from .services.gemini import generate_questions, evaluate_text_answer
import json


def _build_session_analytics(session):
    attempts = PracticeAttempt.objects.filter(question__session=session).select_related('question')
    questions = PracticeQuestion.objects.filter(session=session)
    mcq_questions = questions.filter(question_type='mcq').count()
    text_questions = questions.filter(question_type='text').count()
    correct_mcq = attempts.filter(question__question_type='mcq', is_correct=True).count()
    text_attempts = attempts.filter(question__question_type='text')
    avg_ai_score = text_attempts.aggregate(models_avg_score=Avg('ai_score'))['models_avg_score']
    avg_similarity = text_attempts.aggregate(models_avg_similarity=Avg('similarity_score'))['models_avg_similarity']

    strengths = []
    improvement_areas = []

    if correct_mcq and mcq_questions:
        accuracy = correct_mcq / mcq_questions
        if accuracy >= 0.75:
            strengths.append('Strong MCQ accuracy')
        elif accuracy <= 0.5:
            improvement_areas.append('Review MCQ fundamentals')

    if avg_ai_score is not None:
        if avg_ai_score >= 7:
            strengths.append('Good written-answer quality')
        elif avg_ai_score < 5:
            improvement_areas.append('Expand written responses with more detail')

    if avg_similarity is not None and avg_similarity >= 5:
        strengths.append('Answers align well with rubrics')

    if not strengths:
        strengths.append('Completed all available questions')
    if not improvement_areas:
        improvement_areas.append('Continue practicing for consistency')

    completion_time_seconds = None
    if session.completed_at:
        completion_time_seconds = int((session.completed_at - session.created_at).total_seconds())

    return {
        'session': session,
        'total_questions': questions.count(),
        'attempted_questions': attempts.count(),
        'mcq_questions': mcq_questions,
        'text_questions': text_questions,
        'correct_mcq': correct_mcq,
        'average_ai_score': avg_ai_score,
        'average_similarity': avg_similarity,
        'completion_time_seconds': completion_time_seconds,
        'strengths': strengths,
        'improvement_areas': improvement_areas,
    }


# ============ HARDCODED SAMPLE QUESTIONS FOR PHASE 1 ============
SAMPLE_QUESTIONS = {
    'frontend-development': {
        'beginner': [
            {
                'text': 'What does HTML stand for?',
                'type': 'mcq',
                'options': ['Hyper Text Markup Language', 'Home Tool Markup Language', 'Hyperlinks and Text Markup Language', 'High Tech Modern Language'],
                'correct': 'Hyper Text Markup Language'
            },
            {
                'text': 'What does CSS stand for?',
                'type': 'mcq',
                'options': ['Cascading Style Sheets', 'Computer Style Sheets', 'Colorful Style System', 'Code Style Sheet'],
                'correct': 'Cascading Style Sheets'
            },
            {
                'text': 'Explain the difference between a div and a span element.',
                'type': 'text',
                'rubric': 'A good answer should mention that div is block-level and span is inline. Div creates line breaks, span does not. Both are generic containers.'
            },
        ],
        'intermediate': [
            {
                'text': 'What is the virtual DOM in React?',
                'type': 'text',
                'rubric': 'Should mention: lightweight representation, reconciliation algorithm, performance optimization, diffing process, reduces direct DOM manipulation.'
            },
            {
                'text': 'Which of the following is a hook in React?',
                'type': 'mcq',
                'options': ['useState', 'setState', 'getState', 'updateState'],
                'correct': 'useState'
            },
        ]
    },
    'backend-development': {
        'beginner': [
            {
                'text': 'What is REST?',
                'type': 'mcq',
                'options': ['Representational State Transfer', 'Resource State Transfer', 'Remote Entry State Transfer', 'Reliable State Transfer'],
                'correct': 'Representational State Transfer'
            },
            {
                'text': 'What is a database?',
                'type': 'text',
                'rubric': 'Should mention: organized collection of data, persistent storage, queryable, structured or semi-structured format.'
            },
        ]
    }
}


def _topic_key(topic_name):
    return (topic_name or '').strip().lower().replace(' ', '-')


def _fallback_questions(topic_name, difficulty, question_type, total_questions):
    """Generate fallback questions from hardcoded pool. DO NOT loop/repeat."""
    topic_pool = SAMPLE_QUESTIONS.get(_topic_key(topic_name), {})
    pool = topic_pool.get(difficulty) or topic_pool.get('intermediate') or next(iter(topic_pool.values()), [])

    def _matches_kind(question):
        if question_type == 'mixed':
            return True
        return question.get('type') == question_type

    filtered = [question for question in pool if _matches_kind(question)]

    if not filtered:
        # Generate minimal fallback questions if pool is empty
        filtered = [
            {
                'text': f'Explain a key concept in {topic_name}.',
                'type': 'text',
                'rubric': 'Define the concept clearly and explain its importance with an example.',
            },
            {
                'text': f'Which of the following is fundamental to {topic_name}?',
                'type': 'mcq',
                'options': ['Correct answer', 'Incorrect answer 1', 'Incorrect answer 2', 'Incorrect answer 3'],
                'correct': 'Correct answer',
            },
            {
                'text': f'How would you apply {topic_name} in a real project?',
                'type': 'text',
                'rubric': 'Describe a practical scenario and the relevant concepts to apply.',
            },
        ]

    # Return only available questions, don't loop/repeat
    # If user wants more than available, return what we have
    return filtered[:total_questions]


# ============ PUBLIC ENDPOINTS ============

@api_view(['GET'])
def get_topics(request):
    """
    Get all available practice topics.
    No authentication required.
    """
    try:
        topics = PracticeTopic.objects.filter(is_active=True)
        data = [
            {
                'id': topic.id,
                'name': topic.name,
                'slug': topic.slug,
                'icon': topic.icon,
                'is_active': topic.is_active
            }
            for topic in topics
        ]
        return Response({
            'status': 'success',
            'topics': data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============ AUTHENTICATED ENDPOINTS ============

@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def start_session(request):
    """
    Start a new practice session.
    Generates hardcoded sample questions for Phase 1.
    
    Request body:
    {
        "topic": "Frontend Development",
        "difficulty": "beginner",
        "question_type": "mixed",
        "total_questions": 5
    }
    """
    if not request.user.is_authenticated:
        return Response({'status': 'error', 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        data = request.data
        topic_name = data.get('topic')
        difficulty = data.get('difficulty', 'beginner')
        question_type = data.get('question_type', 'mixed')
        total_questions = int(data.get('total_questions', 5))

        # Validate total_questions
        if total_questions not in [5, 10, 15]:
            return Response({
                'status': 'error',
                'message': f'Invalid total_questions: {total_questions}. Must be 5, 10, or 15.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate difficulty
        valid_difficulties = ['beginner', 'intermediate', 'advanced']
        if difficulty not in valid_difficulties:
            return Response({
                'status': 'error',
                'message': f'Invalid difficulty: {difficulty}. Must be one of: {", ".join(valid_difficulties)}'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate question_type
        valid_types = ['mcq', 'text', 'mixed']
        if question_type not in valid_types:
            return Response({
                'status': 'error',
                'message': f'Invalid question_type: {question_type}. Must be one of: {", ".join(valid_types)}'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get topic - try exact match first, then case-insensitive
        try:
            topic = PracticeTopic.objects.get(name=topic_name)
        except PracticeTopic.DoesNotExist:
            # Try case-insensitive match
            topic = PracticeTopic.objects.get(name__iexact=topic_name)
        except PracticeTopic.DoesNotExist:
            available_topics = ', '.join([t.name for t in PracticeTopic.objects.filter(is_active=True)])
            return Response({
                'status': 'error',
                'message': f'Topic "{topic_name}" not found. Available topics: {available_topics}'
            }, status=status.HTTP_404_NOT_FOUND)

        # Create session
        session = PracticeSession.objects.create(
            candidate=request.user,
            topic=topic,
            difficulty=difficulty,
            question_type=question_type,
            total_questions=total_questions,
            status='in_progress'
        )

        # Generate questions via Gemini; fall back to local templates when AI is unavailable
        questions_data = []
        try:
            generated = generate_questions(topic.name, difficulty, question_type, total_questions)

            if not generated:
                raise ValueError("AI generation failed.")
                
            generated = generated[:total_questions]

            for idx, q in enumerate(generated, 1):
                q_text = q.get('text') or q.get('question') or ''
                q_type = q.get('type', 'text')
                options = q.get('options') if q_type == 'mcq' else None
                correct = q.get('correct') if q_type == 'mcq' else None
                rubric = q.get('rubric') if q_type == 'text' else None
                
                question = PracticeQuestion.objects.create(
                    session=session,
                    order=idx,
                    question_text=q_text,
                    question_type=q_type,
                    options=json.dumps(options) if options else None,
                    correct_option=correct,
                    evaluation_rubric=rubric
                )

                questions_data.append({
                    'id': question.id,
                    'order': question.order,
                    'question_text': question.question_text,
                    'question_type': question.question_type,
                    'options': options
                })
        except Exception as e:
            session.questions.all().delete()
            fallback_generated = _fallback_questions(topic.name, difficulty, question_type, total_questions)
            for idx, q in enumerate(fallback_generated, 1):
                q_text = q.get('text') or q.get('question') or ''
                q_type = q.get('type', 'text')
                options = q.get('options') if q_type == 'mcq' else None
                correct = q.get('correct') if q_type == 'mcq' else None
                rubric = q.get('rubric') if q_type == 'text' else None

                question = PracticeQuestion.objects.create(
                    session=session,
                    order=idx,
                    question_text=q_text,
                    question_type=q_type,
                    options=json.dumps(options) if options else None,
                    correct_option=correct,
                    evaluation_rubric=rubric
                )

                questions_data.append({
                    'id': question.id,
                    'order': question.order,
                    'question_text': question.question_text,
                    'question_type': question.question_type,
                    'options': options
                })

            return Response({
                'status': 'success',
                'session_id': session.id,
                'questions': questions_data,
                'warning': 'Gemini was unavailable, so local practice questions were used instead.'
            }, status=status.HTTP_201_CREATED)

        return Response({
            'status': 'success',
            'session_id': session.id,
            'questions': questions_data
        }, status=status.HTTP_201_CREATED)

    except PracticeTopic.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'Topic not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        # Catch any other unexpected errors during setup
        return Response({
            'status': 'error',
            'message': f"An unexpected error occurred: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def submit_answer(request):
    """
    Submit an answer to a question.
    
    For MCQ: auto-grades and returns is_correct.
    For text: in Phase 1, returns placeholder feedback (later Gemini).
    
    Request body:
    {
        "question_id": 1,
        "user_answer": "The answer text or MCQ option"
    }
    """
    if not request.user.is_authenticated:
        return Response({'status': 'error', 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        data = request.data
        question_id = data.get('question_id')
        user_answer = data.get('user_answer', '').strip()

        if not user_answer:
            return Response({
                'status': 'error',
                'message': 'Answer cannot be empty'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get question
        question = PracticeQuestion.objects.get(id=question_id)
        session = question.session

        # Verify user owns this session
        if session.candidate != request.user:
            return Response({
                'status': 'error',
                'message': 'You do not have permission to submit answers for this session'
            }, status=status.HTTP_403_FORBIDDEN)

        # Delete previous attempt if exists
        PracticeAttempt.objects.filter(question=question).delete()

        # Handle MCQ
        if question.question_type == 'mcq':
            is_correct = (user_answer == question.correct_option)
            
            attempt = PracticeAttempt.objects.create(
                question=question,
                user_answer=user_answer,
                is_correct=is_correct
            )

            return Response({
                'status': 'success',
                'is_correct': is_correct,
                'user_answer': attempt.user_answer,
                'correct_option': question.correct_option
            }, status=status.HTTP_200_OK)

        # Handle text answer: call Gemini for evaluation
        elif question.question_type == 'text':
            eval_result = {}
            try:
                rubric = question.evaluation_rubric or ''
                eval_result = evaluate_text_answer(question.question_text, rubric, user_answer)
                score = eval_result.get('score')
                feedback_good = eval_result.get('feedback_good')
                feedback_missing = eval_result.get('feedback_missing')
                model_answer = eval_result.get('model_answer')
            except Exception:
                # graceful fallback
                score = 7.0
                feedback_good = 'Good effort. Keep practicing!'
                feedback_missing = 'Consider providing more detail.'
                model_answer = 'This is a placeholder model answer. Gemini evaluation failed.'

            # compute simple token-frequency embedding for storage
            def _text_vector(t):
                words = [w.strip(".,:;()[]\"'\n\t").lower() for w in (t or '').split()]
                vec = {}
                for w in words:
                    if len(w) <= 2:
                        continue
                    vec[w] = vec.get(w, 0) + 1
                return vec

            user_embedding = _text_vector(user_answer)
            similarity = eval_result.get('similarity') if isinstance(eval_result, dict) else None

            attempt = PracticeAttempt.objects.create(
                question=question,
                user_answer=user_answer,
                ai_score=score,
                ai_feedback_good=feedback_good,
                ai_feedback_missing=feedback_missing,
                ai_model_answer=model_answer,
                user_answer_embedding=user_embedding,
                similarity_score=similarity
            )

            return Response({
                'status': 'success',
                'user_answer': attempt.user_answer,
                'ai_score': attempt.ai_score,
                'ai_feedback_good': attempt.ai_feedback_good,
                'ai_feedback_missing': attempt.ai_feedback_missing,
                'ai_model_answer': attempt.ai_model_answer
            }, status=status.HTTP_200_OK)

    except PracticeQuestion.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'Question not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_session(request, session_id):
    """
    Get full session data with all questions and attempts.
    """
    if not request.user.is_authenticated:
        return Response({'status': 'error', 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        session = PracticeSession.objects.get(id=session_id)

        # Verify user owns this session
        if session.candidate != request.user:
            return Response({
                'status': 'error',
                'message': 'You do not have permission to view this session'
            }, status=status.HTTP_403_FORBIDDEN)

        # Build response with questions and attempts
        questions_data = []
        for question in session.questions.all().order_by('order'):
            q_data = {
                'id': question.id,
                'order': question.order,
                'question_text': question.question_text,
                'question_type': question.question_type,
            }

            # Add attempt if exists
            try:
                attempt = question.attempt
                q_data['user_answer'] = attempt.user_answer

                if question.question_type == 'mcq':
                    q_data['is_correct'] = attempt.is_correct
                else:
                    q_data['ai_score'] = attempt.ai_score
                    q_data['ai_feedback_good'] = attempt.ai_feedback_good
                    q_data['ai_feedback_missing'] = attempt.ai_feedback_missing
                    q_data['ai_model_answer'] = attempt.ai_model_answer
            except PracticeAttempt.DoesNotExist:
                q_data['user_answer'] = None

            questions_data.append(q_data)

        return Response({
            'status': 'success',
            'session_id': session.id,
            'topic': session.topic.name if session.topic else None,
            'difficulty': session.difficulty,
            'score': session.score,
            'status': session.status,
            'created_at': session.created_at.isoformat(),
            'completed_at': session.completed_at.isoformat() if session.completed_at else None,
            'questions': questions_data
        }, status=status.HTTP_200_OK)

    except PracticeSession.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'Session not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def complete_session(request, session_id):
    """
    Mark session as completed and calculate final score.
    
    Score calculation:
    - MCQ: 1 point per correct answer
    - Text: ai_score (0-10) / 10 = normalized score
    - Final: average of all question scores
    """
    if not request.user.is_authenticated:
        return Response({'status': 'error', 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        session = PracticeSession.objects.get(id=session_id)

        # Verify user owns this session
        if session.candidate != request.user:
            return Response({
                'status': 'error',
                'message': 'You do not have permission to complete this session'
            }, status=status.HTTP_403_FORBIDDEN)

        # Calculate score
        attempts = PracticeAttempt.objects.filter(question__session=session)
        
        if not attempts.exists():
            session.score = 0.0
        else:
            scores = []
            for attempt in attempts:
                if attempt.question.question_type == 'mcq':
                    scores.append(10.0 if attempt.is_correct else 0.0)
                else:
                    # Keep text score 0-10
                    if attempt.ai_score is not None:
                        scores.append(attempt.ai_score)
            
            session.score = sum(scores) / len(scores) if scores else 0.0

        # Mark as completed
        session.status = 'completed'
        session.completed_at = timezone.now()
        session.save()

        analytics_payload = _build_session_analytics(session)
        PracticeSessionAnalytics.objects.update_or_create(
            session=session,
            defaults={
                'total_questions': analytics_payload['total_questions'],
                'attempted_questions': analytics_payload['attempted_questions'],
                'mcq_questions': analytics_payload['mcq_questions'],
                'text_questions': analytics_payload['text_questions'],
                'correct_mcq': analytics_payload['correct_mcq'],
                'average_ai_score': analytics_payload['average_ai_score'],
                'average_similarity': analytics_payload['average_similarity'],
                'completion_time_seconds': analytics_payload['completion_time_seconds'],
                'strengths': analytics_payload['strengths'],
                'improvement_areas': analytics_payload['improvement_areas'],
            }
        )

        return Response({
            'status': 'success',
            'session_id': session.id,
            'final_score': session.score,
            'status': session.status,
            'completed_at': session.completed_at.isoformat(),
            'analytics': {
                'total_questions': analytics_payload['total_questions'],
                'attempted_questions': analytics_payload['attempted_questions'],
                'mcq_questions': analytics_payload['mcq_questions'],
                'text_questions': analytics_payload['text_questions'],
                'correct_mcq': analytics_payload['correct_mcq'],
                'average_ai_score': analytics_payload['average_ai_score'],
                'average_similarity': analytics_payload['average_similarity'],
                'completion_time_seconds': analytics_payload['completion_time_seconds'],
                'strengths': analytics_payload['strengths'],
                'improvement_areas': analytics_payload['improvement_areas'],
            }
        }, status=status.HTTP_200_OK)

    except PracticeSession.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'Session not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_history(request):
    """
    Get all past sessions for the logged-in candidate.
    Paginated, newest first.
    """
    if not request.user.is_authenticated:
        return Response({'status': 'error', 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        sessions = PracticeSession.objects.filter(candidate=request.user).order_by('-created_at')
        
        # Basic pagination
        page = int(request.query_params.get('page', 1))
        per_page = int(request.query_params.get('per_page', 10))
        
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        
        total_count = sessions.count()
        paginated_sessions = sessions[start_idx:end_idx]

        data = [
            {
                'session_id': s.id,
                'topic': s.topic.name if s.topic else None,
                'difficulty': s.difficulty,
                'score': s.score,
                'total_questions': s.total_questions,
                'question_type': s.question_type,
                'status': s.status,
                'created_at': s.created_at.isoformat(),
                'completed_at': s.completed_at.isoformat() if s.completed_at else None,
                'has_analytics': hasattr(s, 'analytics')
            }
            for s in paginated_sessions
        ]

        return Response({
            'status': 'success',
            'count': total_count,
            'page': page,
            'per_page': per_page,
            'results': data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_session_analytics(request, session_id):
    """Get stored analytics for a completed practice session."""
    if not request.user.is_authenticated:
        return Response({'status': 'error', 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        session = PracticeSession.objects.get(id=session_id)
        if session.candidate != request.user:
            return Response({
                'status': 'error',
                'message': 'You do not have permission to view this session'
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            analytics = session.analytics
        except PracticeSessionAnalytics.DoesNotExist:
            analytics = None

        if analytics is None:
            analytics_payload = _build_session_analytics(session)
        else:
            analytics_payload = {
                'session': session,
                'total_questions': analytics.total_questions,
                'attempted_questions': analytics.attempted_questions,
                'mcq_questions': analytics.mcq_questions,
                'text_questions': analytics.text_questions,
                'correct_mcq': analytics.correct_mcq,
                'average_ai_score': analytics.average_ai_score,
                'average_similarity': analytics.average_similarity,
                'completion_time_seconds': analytics.completion_time_seconds,
                'strengths': analytics.strengths or [],
                'improvement_areas': analytics.improvement_areas or [],
            }

        return Response({
            'status': 'success',
            'session_id': session.id,
            'analytics': {
                'total_questions': analytics_payload['total_questions'],
                'attempted_questions': analytics_payload['attempted_questions'],
                'mcq_questions': analytics_payload['mcq_questions'],
                'text_questions': analytics_payload['text_questions'],
                'correct_mcq': analytics_payload['correct_mcq'],
                'average_ai_score': analytics_payload['average_ai_score'],
                'average_similarity': analytics_payload['average_similarity'],
                'completion_time_seconds': analytics_payload['completion_time_seconds'],
                'strengths': analytics_payload['strengths'],
                'improvement_areas': analytics_payload['improvement_areas'],
            }
        }, status=status.HTTP_200_OK)

    except PracticeSession.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'Session not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
