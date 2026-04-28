import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { usePathname, useRouter } from 'next/navigation';
import { Auth } from '@/Redux/Action';
import Loader from './loader';


const Protect = ({ children }) => {
    const role = useSelector((state) => state.Role_Reducer);
    const [loading, setLoading] = useState(true);
    const dispatch = useDispatch();
    const pathname = usePathname();
    const route = useRouter();
    const hasCheckedAuth = useRef(false);

    useEffect(() => {
        if (hasCheckedAuth.current) {
            return;
        }

        hasCheckedAuth.current = true;
        setLoading(true);

        dispatch(Auth(role)).then(() => {
            setLoading(false);
        });
    }, [dispatch, role]);

    let allow = false;
    let redirectPath = '/Users/Home';

    if (role === 'admin') {
        allow =
            pathname === '/Admin/deleteusers' ||
            pathname === '/Admin/deletesubscription' ||
            pathname === '/Admin/dashboard' ||
            pathname === '/error' ||
            pathname === '/Admin/deletejob' ||
            pathname === '/Admin/report';
        redirectPath = '/error';
    } else if (role === 'Candidate') {
        allow =
            pathname === '/Users/Home' ||
            pathname === '/Users/Jobs' ||
            pathname === '/Users/Notifications' ||
            pathname === '/Users/Profile' ||
            pathname === '/error' ||
            pathname.startsWith('/Users/Jobs/') ||
            pathname.startsWith('/Users/Practice');
        redirectPath = '/error';
    } else if (role === 'Recruiter') {
        allow =
            pathname === '/Users/Home' ||
            pathname === '/Users/Posts' ||
            pathname === '/Users/Notifications' ||
            pathname === '/Users/Profile' ||
            pathname === '/error' ||
            pathname === '/Users/Posts/CreateJob' ||
            pathname.startsWith('/Users/Posts/');
        redirectPath = '/error';
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
        return null;
    }

    return <>{children}</>;
};

export default Protect;