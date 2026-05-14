// API Configuration Utility
// Uses environment variable NEXT_PUBLIC_API_URL if available, defaults to localhost:8000

export const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        // Client-side: use environment variable
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    }
    // Server-side: fallback
    return 'http://localhost:8000';
};

export const API_BASE_URL = getApiUrl();
