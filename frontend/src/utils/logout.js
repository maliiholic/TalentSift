// Centralized logout utility
// Clears all auth state (localStorage, axios headers, Redux, redux-persist)
// and redirects to the Getting Started page.

import axios from 'axios';
import { persistor } from '@/Store';
import { Role_Action } from '@/Redux/Action';
import { API_BASE_URL } from '@/utils/api';

/**
 * Perform a full logout: hit the backend, clear every auth artifact, and redirect.
 *
 * @param {Function} dispatch  - Redux dispatch (from useDispatch)
 * @param {Function} routerReplace - router.replace (from useRouter)
 */
export const performLogout = async (dispatch, routerReplace) => {
  // 1. Tell the backend to invalidate the session / cookies
  try {
    await axios.post(`${API_BASE_URL}/logout/`, {}, { withCredentials: true });
  } catch (error) {
    // Continue cleanup even if the endpoint fails
    console.error('Logout endpoint error:', error);
  }

  // 2. Clear all auth-related localStorage keys
  try {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch (e) {
    // localStorage may not be available (SSR edge case)
  }

  // 3. Remove Authorization header from axios defaults
  delete axios.defaults.headers.common['Authorization'];

  // 4. Reset Redux role to Guest
  dispatch(Role_Action('Guest'));

  // 5. Purge redux-persist storage so the role is not restored on next load
  try {
    await persistor.purge();
  } catch (e) {
    // Ignore purge errors
  }

  // 6. Redirect to the Getting Started page
  routerReplace('/');
};
