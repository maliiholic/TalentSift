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
