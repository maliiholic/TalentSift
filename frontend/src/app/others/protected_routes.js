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

        const PUBLIC_ROUTES = [
            '/',
            '/Users/Home',
            '/Users/SignIn',
            '/Users/SignUp',
            '/Users/About',
            '/Users/Contact',
            '/Users/Privacy',
            '/Users/Terms'
        ];

        const isPublic = PUBLIC_ROUTES.includes(pathname);
        let allow = isPublic;
        let redirectPath = '/Users/Home';

        if (!isPublic) {
            if (role === 'admin') {
                allow =
                    pathname === '/Admin/deleteusers' ||
                    pathname === '/Admin/deletesubscription' ||
                    pathname === '/Admin/dashboard' ||
                    pathname === '/Admin/deletejob' ||
                    pathname === '/Admin/report';
            } else if (role === 'Candidate') {
                allow =
                    pathname === '/Users/Jobs' ||
                    pathname === '/Users/Notifications' ||
                    pathname === '/Users/Profile' ||
                    pathname.startsWith('/Users/Applications/') ||
                    pathname.startsWith('/Users/Jobs/') ||
                    pathname === '/Users/Practice';
            } else if (role === 'Recruiter') {
                allow =
                    pathname === '/Users/Posts' ||
                    pathname === '/Users/Notifications' ||
                    pathname === '/Users/Profile' ||
                    pathname === '/Users/Posts/CreateJob' ||
                    pathname.startsWith('/Users/Posts/');
            }
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