    "use client";

    import { useEffect, useState } from 'react';
    import { useDispatch, useSelector } from 'react-redux';
    import { usePathname, useRouter } from 'next/navigation';
    import { Auth } from '@/Redux/Action';
    import Loader from './loader';


    const Protect = ({ children }) => {
        const role = useSelector((state) => state.Role_Reducer);
        const [loading, setLoading] = useState(true);
        const dispatch = useDispatch();
        const pathname = usePathname();
        const route = useRouter();
        useEffect(() => {
            const checkAuth = async () => {
                try {
                    // Always run the auth check and wait for it to finish before showing page
                    // This avoids briefly rendering "Access Denied" while auth is being resolved
                    await dispatch(Auth(role));
                } finally {
                    setLoading(false);
                }
            };

            checkAuth();
        }, [dispatch, role]);

        let allow = false;
        let redirectPath = '/Users/Home';

        if (role === 'admin') {
            allow =
                pathname === '/Admin/deleteusers' ||
                pathname === '/Admin/deletesubscription' ||
                pathname === '/Admin/dashboard' ||
                pathname === '/Admin/deletejob' ||
                pathname === '/Admin/report';
            redirectPath = '/Users/Home';
        } else if (role === 'Candidate') {
            allow =
                pathname === '/Users/Home' ||
                pathname === '/Users/Jobs' ||
                pathname === '/Users/Notifications' ||
                pathname === '/Users/Profile' ||
                pathname.startsWith('/Users/Jobs/') ||
                pathname === '/Users/Practice';
            redirectPath = '/Users/Home';
        } else if (role === 'Recruiter') {
            allow =
                pathname === '/Users/Home' ||
                pathname === '/Users/Posts' ||
                pathname === '/Users/Notifications' ||
                pathname === '/Users/Profile' ||
                pathname === '/Users/Posts/CreateJob' ||
                pathname.startsWith('/Users/Posts/');
            redirectPath = '/Users/Home';
        } else if (role === 'Guest') {
            allow =
                pathname === '/Users/Home' ||
                pathname === '/Users/SignIn' ||
                pathname === '/Users/SignUp';
            redirectPath = '/Users/Home';
        } else {
            // Fallback for transient/unknown auth state to avoid blank screens.
            allow =
                pathname === '/Users/Home' ||
                pathname === '/Users/SignIn' ||
                pathname === '/Users/SignUp';
        }

        useEffect(() => {
            if (loading) {
                return;
            }

            if (!allow && redirectPath && pathname !== redirectPath) {
                route.replace(redirectPath);
            }
        }, [allow, loading, pathname, redirectPath, route]);

        if (loading) {
            return (
                <>
                    <Loader></Loader>
                </>
            );
        }

        if (!allow) {
            const hasToken = (typeof window !== 'undefined') && Boolean(localStorage.getItem('access'));

            // If a token exists, the app is still resolving auth — show loader to avoid flicker.
            if (hasToken) {
                return <Loader />;
            }

            // No token: show Access Denied with login link.
            return (
                <div className="fixed inset-0 bg-white flex flex-col justify-center items-center z-50">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-800 mb-4">Access Denied</h1>
                        <p className="text-gray-600 mb-6">You are not authorized to view this page. Please log in to continue.</p>
                        <a href="/Users/SignIn" className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                            Go to Login
                        </a>
                    </div>
                </div>
            );
        }

        return <>{children}</>;
    };

    export default Protect;