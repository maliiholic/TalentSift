import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_BASE_URL } from '@/utils/api';

// Async thunk: send a chat message and get the AI reply
export const sendChatMessage = createAsyncThunk(
    'chat/sendMessage',
    async ({ message, conversationHistory }, { rejectWithValue }) => {
        try {
            // Send last 10 messages as context
            const trimmedHistory = (conversationHistory || []).slice(-10);

            const token = typeof window !== 'undefined' ? localStorage.getItem('access') : null;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await axios.post(
                `${API_BASE_URL}/api/chat/`,
                {
                    message,
                    conversation_history: trimmedHistory,
                },
                {
                    withCredentials: true,
                    headers,
                }
            );

            return response.data;
        } catch (error) {
            const errMsg =
                error.response?.data?.error ||
                error.message ||
                'Failed to get a response. Please try again.';
            return rejectWithValue(errMsg);
        }
    }
);

const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        messages: [],   // Array of { role: 'user'|'assistant', content: string, timestamp: string }
        isOpen: false,
        isLoading: false,
        error: null,
    },
    reducers: {
        toggleChat(state) {
            state.isOpen = !state.isOpen;
        },
        openChat(state) {
            state.isOpen = true;
        },
        closeChat(state) {
            state.isOpen = false;
        },
        addUserMessage(state, action) {
            state.messages.push({
                role: 'user',
                content: action.payload,
                timestamp: new Date().toISOString(),
            });
        },
        clearHistory(state) {
            state.messages = [];
            state.error = null;
        },
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(sendChatMessage.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(sendChatMessage.fulfilled, (state, action) => {
                state.isLoading = false;
                state.messages.push({
                    role: 'assistant',
                    content: action.payload.reply,
                    timestamp: new Date().toISOString(),
                });
            })
            .addCase(sendChatMessage.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || 'Something went wrong.';
                // Add an error message to the chat so the user sees it inline
                state.messages.push({
                    role: 'assistant',
                    content: `⚠️ ${action.payload || 'Something went wrong. Please try again.'}`,
                    timestamp: new Date().toISOString(),
                });
            });
    },
});

export const {
    toggleChat,
    openChat,
    closeChat,
    addUserMessage,
    clearHistory,
    clearError,
} = chatSlice.actions;

export default chatSlice.reducer;
