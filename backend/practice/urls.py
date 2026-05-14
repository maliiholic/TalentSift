from django.urls import path
from . import views

urlpatterns = [
    # Public endpoint - no auth needed
    path('topics/', views.get_topics, name='get_topics'),
    
    # Authenticated endpoints
    path('start/', views.start_session, name='start_session'),
    path('submit-answer/', views.submit_answer, name='submit_answer'),
    path('session/<int:session_id>/', views.get_session, name='get_session'),
    path('complete/<int:session_id>/', views.complete_session, name='complete_session'),
    path('analytics/<int:session_id>/', views.get_session_analytics, name='get_session_analytics'),
    path('history/', views.get_history, name='get_history'),
]
