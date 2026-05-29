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
                pathname === '/' ||
                pathname === '/Users/Home' ||
                pathname === '/Users/SignIn' ||
                pathname === '/Users/SignUp' ||
                pathname === '/Admin/deleteusers' ||
                pathname === '/Admin/deletesubscription' ||
                pathname === '/Admin/dashboard' ||
                pathname === '/Admin/deletejob' ||
                pathname === '/Admin/report';
            redirectPath = '/Users/Home';
        } else if (role === 'Candidate') {
            allow =
                pathname === '/' ||
                pathname === '/Users/Home' ||
                pathname === '/Users/SignIn' ||
                pathname === '/Users/SignUp' ||
                pathname === '/Users/Jobs' ||
                pathname === '/Users/Notifications' ||
                pathname === '/Users/Profile' ||
                pathname.startsWith('/Users/Applications/') ||
                pathname.startsWith('/Users/Jobs/') ||
                pathname === '/Users/Practice';
            redirectPath = '/Users/Home';
        } else if (role === 'Recruiter') {
            allow =
                pathname === '/' ||
                pathname === '/Users/Home' ||
                pathname === '/Users/SignIn' ||
                pathname === '/Users/SignUp' ||
                pathname === '/Users/Posts' ||
                pathname === '/Users/Notifications' ||
                pathname === '/Users/Profile' ||
                pathname === '/Users/Posts/CreateJob' ||
                pathname.startsWith('/Users/Posts/');
            redirectPath = '/Users/Home';
        } else if (role === 'Guest') {
            allow =
                pathname === '/' ||
                pathname === '/Users/Home' ||
                pathname === '/Users/SignIn' ||
                pathname === '/Users/SignUp';
            redirectPath = '/Users/Home';
        } else {
            // Fallback for transient/unknown auth state to avoid blank screens.
            allow =
                pathname === '/' ||
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

        if (loading || !allow) {
            return (
                <>
                    <Loader></Loader>
                </>
            );
        }

        return <>{children}</>;
    };

    export default Protect;