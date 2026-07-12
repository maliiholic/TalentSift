from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from django.conf import settings
import os

# Import your custom JWT authentication
from getUserData.JWT import CustomJWTAuthentication

# Groq Model Setup
# Use an environment-configurable model name with a safe fallback.
groq_model = getattr(settings, "GROQ_MODEL", os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b"))
llm = ChatGroq(model=groq_model, api_key=settings.GROQ_API_KEY)

# Prepare a prompt template for the job title enhancement
job_title_prompt_template = """
The following is a job title that needs to be made more professional. Please enhance the job title and make it sound more polished:
Job Title: {job_title}
"""

prompt_template = PromptTemplate(input_variables=["job_title"], template=job_title_prompt_template)

@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def enhance_job_title(request):
    # Ensure that the job title is provided in the request body
    if not request.data.get('prompt'):
        return Response(
            {'error': 'Job title is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    job_title = request.data.get('prompt')

    # Create the prompt using the job title from the request
    prompt = prompt_template.format(job_title=job_title)

    try:
        # Generate a more professional job title using Groq/Mistral.
        response = llm.invoke(prompt)

        professional_job_title = getattr(response, 'content', None)
        if not professional_job_title:
            professional_job_title = 'No professional job title found'

        # Return the structured response (professional job title)
        return Response(
            {'professional_job_title': professional_job_title},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        # Log the exception and return an error response
        return Response(
            {'error': 'An unexpected error occurred', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


job_description_prompt_template = """
You are a professional hiring manager. Write a concise, to-the-point, and professional job description for the following position:
Job Title: {job_name}
Workplace Type: {workplace_type}
Skills Required: {skills}

Format the description as PLAIN TEXT. 
Do NOT use markdown headers (like #, ##, or ###) and do NOT use bold or italic markup (like * or **). 
Use simple uppercase headings and standard list dashes (-) for bullet points.

Use the following exact layout with simple line breaks:

ROLE OVERVIEW:
(A brief 2-3 sentence overview of the role, tailored to the experience level implied by the title)

KEY RESPONSIBILITIES:
- (responsibility 1)
- (responsibility 2)
- (responsibility 3)
- (responsibility 4)

REQUIRED SKILLS & QUALIFICATIONS:
- (requirement 1)
- (requirement 2)
- (requirement 3)
- (requirement 4)

Do NOT include generic benefit sections, wellness details, or compensation. Keep it brief, realistic, and directly to the point. Return ONLY the plain text content.
"""

description_prompt = PromptTemplate(input_variables=["job_name", "workplace_type", "skills"], template=job_description_prompt_template)


@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def generate_job_description(request):
    job_name = request.data.get('job_name')
    workplace_type = request.data.get('workplace_type', 'Remote')
    skills = request.data.get('skills', '')

    if not job_name:
        return Response(
            {'error': 'Job title is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    prompt = description_prompt.format(job_name=job_name, workplace_type=workplace_type, skills=skills)

    try:
        response = llm.invoke(prompt)
        description = getattr(response, 'content', None)
        if not description:
            description = 'No job description generated'

        return Response(
            {'description': description},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'error': 'An unexpected error occurred', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
