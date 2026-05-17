'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase, faRobot, faChartLine, faUserGraduate } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { useDispatch, useSelector } from 'react-redux';
import { show_search, search_bar_action } from "@/Redux/Action";

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
  { value: "AI", label: "assisted screening" },
  { value: "24/7", label: "candidate practice" },
  { value: "Fast", label: "recruiter workflows" },
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
          <div className="max-w-4xl rounded-3xl border border-white/10 bg-black/25 p-6 shadow-2xl backdrop-blur-md sm:p-10">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
              <span className="h-2 w-2 rounded-full bg-[#0073b1]"></span>
              {hero.label}
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
              {hero.eyebrow}
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-white drop-shadow-xl sm:text-6xl lg:text-7xl">
              {hero.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-200 sm:text-xl">
              {hero.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-white/80">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">AI interview prep</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Role-based workflow</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Notifications + tracking</span>
            </div>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => router.push(hero.primaryPath)}
                className="rounded-lg bg-[#0073b1] px-7 py-3.5 text-base font-semibold text-white shadow-lg transition duration-300 ease-in-out hover:bg-[#005582] hover:scale-105"
              >
                {hero.primaryLabel}
              </button>
              <button
                onClick={() => router.push("#quick-actions")}
                className="rounded-lg border border-white/20 bg-white/10 px-7 py-3.5 text-base font-semibold text-white transition duration-300 ease-in-out hover:bg-white/20"
              >
                Quick Actions
              </button>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {homeStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-center">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="mt-1 text-sm text-gray-200">{stat.label}</div>
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
                className="group rounded-2xl border border-gray-200 bg-[#F4F2EE] p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#0073b1] hover:shadow-lg"
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

      <section className="border-t border-gray-200 bg-gradient-to-b from-[#F4F2EE] to-[#E2DFDA] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur md:p-10">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-[#0073b1] sm:text-4xl">
                Trusted by teams that hire with intent
              </h2>
              <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
                    A cleaner trust section works better here until you have verified customer quotes to display.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            <StepCard
              step="1"
              title="Create Job Post"
              description="Recruiters can quickly create job listings with all the necessary details."
            />
            <StepCard
              step="2"
              title="Automated AI Interviews"
              description="Candidates can take AI interviews that simulate real interview questions."
            />
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
              className="px-8 py-4 bg-[#0073b1] text-white font-semibold text-lg rounded-lg shadow-lg hover:bg-[#005582] hover:scale-105 transition duration-300 ease-in-out transform"
            >
              Sign Up Now
            </button>
          }

          {
            role === "Candidate" &&
            <button
              onClick={() => router.push("/Users/Practice")}
              className="px-8 py-4 bg-[#0073b1] text-white font-semibold text-lg rounded-lg shadow-lg hover:bg-[#005582] hover:scale-105 transition duration-300 ease-in-out transform"
            >
              Practice Interview
            </button>
          }

          {
            role === "Recruiter" &&
            <button
              onClick={() => router.push("/Users/Posts")}
              className="px-8 py-4 bg-[#0073b1] text-white font-semibold text-lg rounded-lg shadow-lg hover:bg-[#005582] hover:scale-105 transition duration-300 ease-in-out transform"
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
    <div className="group rounded-2xl border border-gray-200 bg-[#F4F2EE] p-6 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#0073b1] hover:bg-white hover:shadow-lg">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0073b1]/15 to-[#0073b1]/5 text-[#0073b1] ring-1 ring-[#0073b1]/10 transition duration-300 group-hover:bg-[#0073b1] group-hover:text-white">
        <FontAwesomeIcon icon={icon} className="text-2xl" />
      </div>
      <h3 className="text-lg font-semibold mb-3 text-gray-900">{title}</h3>
      <p className="text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

function TrustCard({ title, value, description }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-[#0073b1]">{value}</h3>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0073b1]/10 text-[#0073b1]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0073b1]"></span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}


// Reusable Step Card Component
function StepCard({ step, title, description }) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-[#0073b1] hover:shadow-2xl">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#0073b1] text-xl font-bold text-white shadow-lg shadow-[#0073b1]/20 transition duration-300 group-hover:scale-105">
        {step}
      </div>
      <h3 className="mb-4 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}
