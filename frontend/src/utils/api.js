// API Configuration Utility
// Uses environment variable NEXT_PUBLIC_API_URL if available, otherwise falls back to localhost for local development.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
