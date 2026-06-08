<div align="center">
  <h1>TalentSift</h1>
  <p><strong>Intelligent Applicant Tracking & AI-Powered Recruitment Platform</strong></p>

  [![TalentSift CI](https://github.com/mearslanahmed/TalentSift/actions/workflows/ci.yml/badge.svg)](https://github.com/mearslanahmed/TalentSift/actions/workflows/ci.yml)
  [![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat&logo=next.js)](https://nextjs.org/)
  [![Django](https://img.shields.io/badge/Django-5.2-092E20?style=flat&logo=django)](https://www.djangoproject.com/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat&logo=postgresql)](https://supabase.com/)
  [![LangChain](https://img.shields.io/badge/LangChain-AI-1C3C3C?style=flat)](https://www.langchain.com/)
  
</div>

## Introduction

TalentSift is a comprehensive applicant tracking and recruitment platform that revolutionizes the hiring process by intelligently connecting job seekers (candidates) with employers (recruiters). Traditional hiring processes are often bogged down by manual screening, unoptimized job listings, and poor interview preparation. TalentSift solves this by augmenting the traditional job board with AI-driven capabilities.

**Target Users:**
* **Recruiters & Employers:** Looking to automate the initial interview screening process, manage applicants efficiently, and generate optimized job titles using AI.
* **Candidates:** Looking for an intuitive platform to discover jobs, track their applications, and practice their interview skills in a simulated AI environment.

## Live Demo

* **Production Website:** [https://talentsift.live](https://talentsift.live)

TalentSift is fully deployed and operational. Candidates can explore jobs, practice interviews, and manage their profiles, while recruiters can post listings and automatically screen applicants via AI.

## Key Features

### AI-Powered Recruitment
* **Automated AI Screening Interviews:** Candidates complete automated AI interview sessions that are instantly graded, providing recruiters with immediate scoring to efficiently screen applicants before manual review.
* **AI Practice Interviews:** A dedicated environment for candidates to practice specific tech/domain interviews and receive immediate scoring and feedback via LangChain & Groq.
* **AI Job Title Generator:** Assists recruiters in creating compelling, industry-standard job titles for their postings.
* **LLM Chatbot Integration:** Embedded AI assistant to help users navigate the platform and answer queries.

### Comprehensive User Portals
* **Role-Based Workspaces:** Distinct modes for Candidates and Recruiters within a unified platform.
* **Recruiter Dashboard:** Complete oversight of job postings, applications, reports, and automated interview feedback.
* **Candidate Tracking:** Real-time status updates on submitted applications (Pending, Reviewed, Shortlisted, Rejected).

### Monetization & Access
* **Stripe Subscriptions:** Premium access tiers (AI Tier, Practice Tier) handled securely via Stripe checkout sessions.

### Security & Notifications
* **Email OTP Verification:** Secure sign-up and sign-in processes utilizing One-Time Passwords (OTP).
* **Real-time Notifications:** In-app alert system for application status changes and interview schedules.
* **Job Moderation:** Community-driven job reporting to maintain platform integrity.

## Technology Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | Next.js (16.2), React (19), Tailwind CSS v4, Redux Toolkit, Chart.js |
| **Backend** | Django (5.2), Django REST Framework, LangChain, Groq API |
| **Database** | PostgreSQL (Production), SQLite (Development) |
| **Authentication** | Simple JWT, Custom User Models, Google reCAPTCHA v2/v3 |
| **Email Services** | Brevo API |
| **Cloud Storage** | Cloudinary (Resumes & Profile Media) |
| **Deployment Platforms**| Vercel (Frontend), Render (Backend), Supabase (Database) |
| **Payments** | Stripe |

## System Architecture

```mermaid
graph TD
    Client[Client Browser] -->|HTTPS| Frontend[Frontend: Next.js on Vercel]
    Frontend -->|REST API via Axios| Backend[Backend: Django DRF on Render]
    
    Backend -->|Read/Write| DB[(PostgreSQL on Supabase)]
    Backend -->|Media Storage| Cloudinary[(Cloudinary)]
    Backend -->|SMTP/API| Brevo[Brevo Email Service]
    Backend -->|AI Integrations| Groq[Groq API / LangChain]
    Backend -->|Payments| Stripe[Stripe API]
```

## Project Structure

```text
TalentSift/
├── frontend/                 # Next.js Application
│   ├── public/               # Static assets
│   ├── src/                  # Source code
│   │   ├── app/              # Next.js App Router (Admin, Users, Auth views)
│   │   ├── Redux/            # State management & persistence
│   │   └── utils/            # Frontend utilities
│   └── package.json          # Node dependencies
├── backend/                  # Django Application
│   ├── backend/              # Core Django settings & URLs
│   ├── signup/               # Auth, Roles, and Core Models
│   ├── applications/         # Job Applications & Automated AI Interviews
│   ├── practice/             # AI Practice Interviews Architecture
│   ├── checkout/             # Stripe Payments & Subscriptions
│   ├── chatbot/              # LLM Chatbot Integration
│   └── requirements.txt      # Python dependencies
├── docs/                     # Documentation
└── screenshots/              # UI Previews
```

## Screenshots

### Candidate Experience
![Candidate Home](screenshots/candidate_mode_home_screen.png)
*Candidate Dashboard and Job Discovery*

![AI Interview Screening](screenshots/ai_interview.png)
*Automated Applicant Screening Session*

![Interview Practice](screenshots/interview_practice.png)
*AI-Powered Interview Practice Session*

### Recruiter Experience
![Recruiter Home](screenshots/recruter_mode_home_screen.png)
*Recruiter Workspace and Job Management*

![Admin Analytics](screenshots/admin_panel_analytics.png)
*Platform Analytics and Moderation Dashboard*

## Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **Python**: v3.10 or higher
* **PostgreSQL**: Optional for local development (SQLite used by default)

### Installation

Clone the repository:
```bash
git clone https://github.com/mearslanahmed/TalentSift.git
cd TalentSift
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will start on `http://localhost:3000`.

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
The backend API will start on `http://localhost:8000`.

### Environment Variables

**Backend (`backend/.env`):**
```env
DJANGO_SECRET_KEY=your-secure-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_BASE_URL=http://localhost:3000

# Database (Leave blank to use SQLite for local dev)
DATABASE_URL=postgres://user:password@localhost:5432/talentsift

# Email Service (Brevo)
BREVO_API_KEY=your-brevo-api-key
BREVO_FROM_EMAIL=from_email@domain.com
BREVO_FROM_NAME=from_name


# Cloudinary Storage
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

# AI Integration
GROQ_API_KEY=your-groq-api-key

# Stripe
STRIPE_TEST_PUBLIC_KEY=pk_test_...
STRIPE_TEST_SECRET_KEY=sk_test_...

# Interview Settings
INTERVIEW_PASS_SCORE=8.0
INTERVIEW_MINUTES_PER_QUESTION=2.0
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
```

## API Overview

TalentSift uses a RESTful API architecture. Major endpoints include:

* **Authentication:** `/signup/`, `/login/`, `/send_otp/`, `/verify_otp/`
* **Jobs & Applications:** `/create-job/`, `/get-jobs/`, `/apply-job/<id>/`, `/application/<id>/status/`
* **Interviews:** `/application/<id>/start-interview/`, `/interview/submit-answer/`
* **Practice Area:** `/api/practice/`
* **Admin & Moderation:** `/dashboard/`, `/all_users/`, `/report/`
* **Payments:** `/create_checkout_session/`, `/verify_payment/`

## Database Design

The relational database architecture is centered around a custom user model and polymorphic profiles:

* **Users & Roles:** A base `User` model extends into a `Profile`, which then distinguishes into a `Candidate` or `Recruiter`.
* **Jobs & Applications:** `Recruiters` create `Jobs`. `Candidates` create `JobApplications`. A unique-together constraint ensures a candidate can only apply to a specific job once.
* **AI Interviews:** A `JobApplication` can trigger an `InterviewSession` (AI screening), which holds JSON arrays of questions, attempts, and an aggregated `final_score`.
* **Practice Sessions:** `PracticeTopic` generates a `PracticeSession`, broken down into `PracticeQuestion` and `PracticeAttempt` to provide granular feedback.
* **Monetization:** `Subscriptions` map directly to `Users` to grant premium platform privileges.

## Authentication & Security

* **Access Control:** Role-Based Access Control (RBAC) ensuring Candidate and Recruiter boundaries via Simple JWT.
* **MFA Verification:** Registration and login are fortified with Email OTP verification.
* **Storage Security:** Candidate resumes are stored via an `AuthenticatedRawCloudinaryStorage` backend, requiring signed URLs for access and preventing public scraping.
* **CORS & CSRF:** Strict environment variable configurations block unauthorized client origins.

## Deployment

The production environment is decoupled for scalability:

* **Frontend (Vercel):** Next.js App Router deployed on Vercel for edge caching, fast global CDN delivery, and automatic CI/CD pipeline integration.
* **Backend (Render):** Django WSGI application served via Gunicorn. Static assets are collected and compressed via WhiteNoise.
* **Database (Supabase):** PostgreSQL utilizing Supabase connection pooling (`DATABASE_URL_POOLER`) to handle concurrent Django connections efficiently.
* **Media (Cloudinary):** Offloads media delivery and transformation, ensuring the Render backend remains stateless.
* **Email (Brevo):** Reliable transactional email delivery for OTPs and notifications.

## Challenges & Engineering Decisions

* **SQLite to PostgreSQL Migration:** Transitioned from SQLite (development) to PostgreSQL via `dj_database_url` for production. This allows robust concurrent transactions essential for an applicant tracking system.
* **Decoupled Architecture:** Separating Next.js and Django allowed the team to leverage the best of React's ecosystem for a highly interactive UI, while utilizing Python/Django's robust ORM and LangChain compatibility for AI operations.
* **AI Evaluation Integrity:** Used Groq for ultra-fast LLM inference, keeping AI interview feedback instantaneous to ensure a smooth user experience.
* **Stateless Deployments:** Migrated from local file storage to Cloudinary to allow horizontal scaling on Render without losing uploaded resumes or profile images.

## Future Improvements

* **OAuth Integration:** Add Google and LinkedIn Single Sign-On (SSO) to bypass OTP for faster onboarding.
* **Advanced Analytics Dashboard:** Deeper graphical insights for recruiters (e.g., application funnel drop-offs, average AI screening scores by job).
* **WebSocket Integration:** Transition from REST polling to WebSockets (Django Channels) for real-time chat and immediate in-app notifications.
* **Expanded Practice Interviews:** Introduce speech-to-text audio responses for a more realistic interview simulation.

## Team

Built by [Arslan Ahmed](https://github.com/mearslanahmed) (lead developer).

| Role | Name | Contact |
|------|------|---------|
| Lead Developer | Arslan Ahmed | arslanahmednaseem@gmail.com |
| Team Member | Maliha Haider | malihahaider745@gmail.com |

---

TalentSift was developed for [**Embinx**](https://embinx.com) - a leading tech company specializing in hardware, software, and advanced embedded systems for IoT and smart technology solutions.

## License

This project is licensed under the MIT License.
