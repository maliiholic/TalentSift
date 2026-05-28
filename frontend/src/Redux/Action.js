import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// as a sample some functions of actions take help from that 

export const Auth = (role) => {
  return async (dispatch) => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://talentsift-ghee.onrender.com';
      let token = typeof window !== 'undefined' ? localStorage.getItem('access') : null;

      // Helper: quick JWT expiry check without extra dependency
      const isTokenValid = (t) => {
        try {
          if (!t) return false;
          const parts = t.split('.');
          if (parts.length !== 3) return false;
          // base64 decode payload
          const payload = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))));
          if (!payload.exp) return false;
          return Date.now() / 1000 < payload.exp - 5; // 5s leeway
        } catch (e) {
          return false;
        }
      };

      // If guest and no token, short-circuit
      if (role === 'Guest' && !token) {
        dispatch({ type: 'Role', payload: 'Guest' });
        return;
      }

      // If token exists but is invalid/expired, clear it and return Guest
      if (token && !isTokenValid(token)) {
        try {
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
        } catch (e) {}
        dispatch({ type: 'Role', payload: 'Guest' });
        return;
      }

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      // Avoid sending credentials cookie unless required by backend CORS config
      const response = await axios.get(`${API_BASE}/get_user_role/?role=${role}`, {
        withCredentials: false,
        headers,
      });

      dispatch({ type: 'Role', payload: response.data.role });

    } catch (error) {
      // On 401 clear tokens and fallback to Guest
      try {
        if (error && error.response && error.response.status === 401) {
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
        }
      } catch (e) {}
      dispatch({ type: 'Role', payload: 'Guest' });
    }
  };
};

// export const NextPage = (page) => ({
//   type: 'NEXT_PAGE',
//   payload: page
// });

export const Role_Action = (page) => ({
  type: 'Role',
  payload: page
});

export const search_bar_action = (c) => ({
  type: 'search_bar',
  payload: c
});

export const show_search = (c) => ({
  type: 'show_search',
  payload: c
});


export const admin_search_bar_action = (c) => ({
  type: 'admin_search_bar',
  payload: c
});