'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase, faRobot, faChartLine, faUserGraduate } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { useDispatch, useSelector } from 'react-redux';
import { show_search, search_bar_action } from "@/Redux/Action";
import bgImage from "../../Photos/file.png";

// Use path directly instead of importing video as module
const talentsiftVideo = "/talentsift1.mp4";

const heroByRole = {
  Guest: {
    label: "Discover the platform",
    eyebrow: "AI-powered hiring, simplified",
    title: "Welcome to TalentSift",
    description:
      "Discover a faster way to connect talent and opportunities with AI-assisted screening, job discovery, and practice interviews.",
    primaryLabel: "Get Started",
    primaryPath: "/Users/SignIn",
  },
  Candidate: {
    label: "Candidate mode",
    eyebrow: "Your next role starts here",
    title: "Find jobs and practice with confidence",
    description:
      "Browse opportunities, prepare with AI practice interviews, and keep your applications moving in one place.",
    primaryLabel: "Explore Jobs",
    primaryPath: "/Users/Jobs",
  },
  Recruiter: {
    label: "Recruiter mode",
    eyebrow: "Hire faster, with less noise",
    title: "Post jobs and review better candidates",
    description:
      "Create roles, review applications, and use AI-assisted workflows to keep hiring organized and efficient.",
    primaryLabel: "Post Jobs",
    primaryPath: "/Users/Posts/CreateJob",
  },
};

const quickActionsByRole = {
  Guest: [
    { title: "Sign in", description: "Continue to your personal dashboard.", path: "/Users/SignIn" },
    { title: "Browse jobs", description: "See open roles and get a feel for the platform.", path: "/Users/Jobs" },
    { title: "See how it works", description: "Understand the AI interview and hiring flow.", path: "#how-it-works" },
  ],
  Candidate: [
    { title: "Browse jobs", description: "Find fresh openings tailored to you.", path: "/Users/Jobs" },
    { title: "Practice interview", description: "Sharpen your answers with AI feedback.", path: "/Users/Practice" },
    { title: "Track applications", description: "See your submitted applications and interview updates.", path: "/Users/Notifications" },
  ],
  Recruiter: [
    { title: "Create job post", description: "Publish a role in just a few steps.", path: "/Users/Posts/CreateJob" },
    { title: "Review applications", description: "Shortlist candidates faster.", path: "/Users/Posts" },
    { title: "View interviews", description: "Manage upcoming candidate interviews.", path: "/Users/Interviews" },
  ],
};

const homeStats = [
  { value: "10x", label: "faster shortlisting" },
  { value: "24/7", label: "AI practice interviews" },
  { value: "85%", label: "recruiter time saved" },
];

export default function Home() {
  const router = useRouter();
  const role = useSelector((state) => state.Role_Reducer);
  const dispatch = useDispatch();
  const hero = heroByRole[role] || heroByRole.Guest;
  const quickActions = quickActionsByRole[role] || quickActionsByRole.Guest;

  useEffect(() => {
    dispatch(show_search(false));
    dispatch(search_bar_action(""));
  }, [dispatch]);

  return (
    <div className="bg-[#F4F2EE] min-h-screen text-gray-800 font-sans">

      <header className="relative min-h-[92vh] overflow-hidden">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#0073b1]/20 blur-3xl"></div>
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-[#F4F2EE]/20 blur-3xl"></div>
        <video
          className="absolute inset-0 h-full w-full object-cover scale-[1.03] blur-[2px]"
          src={talentsiftVideo}
          autoPlay
          muted
          loop
          playsInline
        ></video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-black/75"></div>

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="max-w-5xl w-full p-6 sm:p-12 relative">
            {/* Ambient Glow Behind Text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gradient-to-tr from-[#0073b1]/20 to-purple-500/10 blur-[100px] -z-10 rounded-full"></div>
            
            {/* Sophisticated Mode Indicator (Only shown if user is logged in as Candidate or Recruiter) */}
            {(role === "Candidate" || role === "Recruiter") && (
              <div className="flex justify-center mb-6">
                <div className="relative group flex items-center gap-3">
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00a8ff] opacity-40"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0073b1] shadow-[0_0_8px_#00a8ff]"></span>
                    </div>
                    <span className="text-sm font-medium tracking-[0.2em] uppercase text-white/90">
                      Current Mode: <span className="font-bold text-white">{role}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-sm sm:text-7xl lg:text-[5rem] mb-6">
              {hero.title}
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-300 sm:text-xl font-light">
              {hero.description}
            </p>

            <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row">
              <button
                onClick={() => router.push(hero.primaryPath)}
                className="relative inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white transition-all duration-300 ease-out bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] overflow-hidden group shadow-[0_0_40px_-10px_rgba(0,115,177,0.3)] hover:shadow-[0_0_60px_-15px_rgba(0,115,177,0.5)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#0073b1]/0 via-[#0073b1]/40 to-[#0073b1]/0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000"></div>
                <span className="relative font-semibold tracking-wide">{hero.primaryLabel}</span>
              </button>
              
              <button
                onClick={() => router.push("#quick-actions")}
                className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white/80 transition-all duration-300 rounded-full hover:text-white hover:bg-white/5"
              >
                Explore Features <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
              </button>
            </div>
            
            <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 pt-10 border-t border-white/10">
              {homeStats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{stat.value}</div>
                  <div className="mt-2 text-xs font-medium tracking-widest text-gray-400 uppercase">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section id="quick-actions" className="border-t border-gray-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0073b1]/70">Fast navigation</p>
            <h2 className="text-3xl font-semibold text-[#0073b1] sm:text-4xl">Quick Actions</h2>
            <p className="mx-auto max-w-2xl text-sm text-gray-600 sm:text-base">
              Jump straight to the tasks that matter most for your role.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => router.push(action.path)}
                className="group rounded-2xl border border-gray-100 bg-[#F4F2EE]/50 hover:bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#0073b1]/30 hover:shadow-[0_8px_30px_rgba(0,115,177,0.06)] cursor-pointer"
              >
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#0073b1]">{action.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0073b1]/70">Product highlights</p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#0073b1] mb-4">
            What We Offer
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-sm sm:text-base text-gray-600">
            The platform combines hiring, applications, interview practice, and analytics in one place.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={faBriefcase}
              title="Job Posting"
              description="Effortlessly post jobs and reach a diverse pool of talent faster than ever before."
            />
            <FeatureCard
              icon={faUserGraduate}
              title="Candidate Applications"
              description="Candidates can browse job listings, apply with ease, and track their applications."
            />
            <FeatureCard
              icon={faRobot}
              title="AI Practice Interviews"
              description="Candidates can practice their interview skills with AI-powered mock interviews."
            />
            <FeatureCard
              icon={faChartLine}
              title="Analytics"
              description="Recruiters gain insights on candidate performance and application trends to make smarter hiring decisions."
            />
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gradient-to-b from-gray-50 to-[#F4F2EE]/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur md:p-10">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-[#0073b1] sm:text-4xl">
                Trusted by teams that hire with intent
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-600 sm:text-base">
                Proven frameworks that elevate hiring efficiency and empower candidates.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <TrustCard
                title="Faster shortlisting"
                value="Less noise"
                description="AI-assisted screening helps recruiters focus on qualified candidates sooner."
              />
              <TrustCard
                title="Better interview prep"
                value="24/7 practice"
                description="Candidates can rehearse answers and improve before the real interview."
              />
              <TrustCard
                title="More organized hiring"
                value="One workflow"
                description="Posts, applications, interviews, and notifications stay connected in one flow."
              />
            </div>
          </div>
        </div>
      </section>


      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0073b1]/70">Workflow</p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#0073b1] mb-4">
            How It Works
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-sm sm:text-base text-gray-600">
            A quick overview of the product flow from posting to hiring.
          </p>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-4 max-w-6xl mx-auto">
            <StepCard
              step="1"
              title="Create Job Post"
              description="Recruiters can quickly create job listings with all the necessary details."
            />
            {/* Arrow 1 -> 2 */}
            <div className="hidden lg:flex items-center justify-center text-gray-300 w-8 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <StepCard
              step="2"
              title="Automated AI Interviews"
              description="Candidates can take AI interviews that simulate real interview questions."
            />
            {/* Arrow 2 -> 3 */}
            <div className="hidden lg:flex items-center justify-center text-gray-300 w-8 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <StepCard
              step="3"
              title="Apply, Review, and Hire"
              description="Candidates apply for jobs, and recruiters review applications to make the best hire."
            />
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-[#F4F2EE] text-center border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0073b1]/70">Next step</p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#0073b1] mb-6">
            Ready to Transform Your Career or Hiring Process?
          </h2>
          <p className="text-base sm:text-lg text-gray-700 mb-8">
            Join TalentSift today and experience AI-driven recruitment that benefits both candidates and recruiters.
          </p>
          {
            role === "Guest" &&
            <button
              onClick={() => router.push("/Users/SignUp")}
              className="px-8 py-4 bg-gradient-to-r from-[#0073b1] to-[#005582] hover:from-[#005582] hover:to-[#00446a] text-white font-semibold text-lg rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] tracking-wide"
            >
              Sign Up Now
            </button>
          }

          {
            role === "Candidate" &&
            <button
              onClick={() => router.push("/Users/Practice")}
              className="px-8 py-4 bg-gradient-to-r from-[#0073b1] to-[#005582] hover:from-[#005582] hover:to-[#00446a] text-white font-semibold text-lg rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] tracking-wide"
            >
              Practice Interview
            </button>
          }

          {
            role === "Recruiter" &&
            <button
              onClick={() => router.push("/Users/Posts")}
              className="px-8 py-4 bg-gradient-to-r from-[#0073b1] to-[#005582] hover:from-[#005582] hover:to-[#00446a] text-white font-semibold text-lg rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] tracking-wide"
            >
              Check Jobs
            </button>
          }
        </div>
      </section>
    </div>
  );
}

// Reusable Feature Card Component
function FeatureCard({ icon, title, description }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-[#F4F2EE]/40 p-6 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0073b1]/5 text-[#0073b1] ring-1 ring-[#0073b1]/10">
        <FontAwesomeIcon icon={icon} className="text-xl" />
      </div>
      <h3 className="text-base font-bold mb-2 text-gray-900">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}

function TrustCard({ title, value, description }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
          <h3 className="mt-1 text-2xl font-extrabold text-[#0073b1]">{value}</h3>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0073b1]/5 text-[#0073b1]">
          <span className="h-2 w-2 rounded-full bg-[#0073b1]"></span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}


function StepCard({ step, title, description }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#0073b1] text-lg font-bold text-white shadow-sm">
        {step}
      </div>
      <h3 className="mb-3 text-lg font-bold text-gray-900">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}
