import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// as a sample some functions of actions take help from that 

export const Auth = (role) => {
  return async (dispatch) => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await axios.get(`${API_BASE}/get_user_role?role=${role}`, { withCredentials: true });
     
        dispatch({
          type: "Role",
          payload: response.data.role
        });
        
    } catch (error) {
      dispatch({
        type: "Role",
        payload:"Guest"
      });
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