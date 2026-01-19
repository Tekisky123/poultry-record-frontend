import axios from 'axios';

// const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888/api';
// const isLocalhost = window.location.hostname === "localhost";

const api = axios.create({
	// baseURL: "https://poultry-record-backend.vercel.app/api",
	// baseURL: "http://localhost:8889/api",
	baseURL: "https://poultry-record-backend-qa.vercel.app/api",
	//baseURL: isLocalhost
	// 	? "http://localhost:6061/api"
	// 	: "https://poultry-record-backend-qa.vercel.app/api",
	//withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Helper function to get token from cookies
const getTokenFromCookies = () => {
	const cookies = document.cookie.split(';');
	for (let cookie of cookies) {
		const [name, value] = cookie.trim().split('=');
		if (name === 'token' || name === 'accessToken' || name === 'jwt') {
			return value;
		}
	}
	return null;
};

// Helper function to get token from localStorage (fallback)
const getTokenFromLocalStorage = () => {
	return localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('jwt');
};

// Request interceptor to add Authorization header
api.interceptors.request.use(
	(config) => {
		// Try to get token from cookies first, then localStorage as fallback
		let token = getTokenFromCookies();
		let tokenSource = 'cookies';

		if (!token) {
			token = getTokenFromLocalStorage();
			tokenSource = 'localStorage';
		}

		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
			// console.log(`✅ Token attached to request from ${tokenSource}:`, token.substring(0, 20) + '...');
			// console.log('🔍 Full Authorization header:', config.headers.Authorization);
		} else {
			console.log('❌ No token found in cookies or localStorage');
			// console.log('🔍 Available cookies:', document.cookie);
			// console.log('🔍 localStorage token:', localStorage.getItem('token'));
		}

		// console.log('📤 Request config headers:', config.headers);
		// console.log('🌐 Request URL:', config.url);
		// console.log('📋 Request method:', config.method);
		return config;
	},
	(error) => {
		console.error('❌ Request interceptor error:', error);
		return Promise.reject(error);
	}
);

// Response interceptor for error handling
api.interceptors.response.use(
	(response) => response,
	(error) => {
		// Log detailed error information
		console.error('API Response Error:', {
			status: error.response?.status,
			statusText: error.response?.statusText,
			message: error.response?.data?.message,
			url: error.config?.url,
			method: error.config?.method,
			headers: error.config?.headers
		});

		// Normalize error
		const message =
			error?.response?.data?.message ||
			error?.response?.data?.error ||
			error?.message ||
			'Unexpected error';
		return Promise.reject(new Error(message));
	}
);

export default api;
