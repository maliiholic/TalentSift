// API Configuration Utility
// Uses environment variable NEXT_PUBLIC_API_URL if available, defaults to localhost:8000

export const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        // Client-side: use environment variable
        return process.env.NEXT_PUBLIC_API_URL || 'https://talentsift-ghee.onrender.com';
    }
    // Server-side: fallback
    return 'https://talentsift-ghee.onrender.com';
};

export const API_BASE_URL = getApiUrl();
