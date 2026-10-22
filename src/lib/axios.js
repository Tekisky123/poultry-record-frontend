import axios from 'axios';

// const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888/api';
const isLocalhost = window.location.hostname === "localhost";

const api = axios.create({
	// baseURL: "https://poultry-record-backend.vercel.app/api",
	// baseURL: "http://localhost:8889/api",
	baseURL: isLocalhost
    ? "http://localhost:6060/api"
    : "https://poultry-record-backend.vercel.app/api", 
	withCredentials: true,
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
		// Pass canceled requests straight through without error logging
		if (axios.isCancel(error)) {
			return Promise.reject(error);
		}

		// Log detailed error information
		console.error('API Response Error:', {
			status: error.response?.status,
			statusText: error.response?.statusText,
			message: error.response?.data?.message,
			url: error.config?.url,
			method: error.config?.method,
			headers: error.config?.headers
		});
		
		// Handle expired session / 401 Unauthorized
		if (error.response?.status === 401) {
			const isAuthUrl = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/signup');
			if (!isAuthUrl) {
				localStorage.removeItem('token');
				localStorage.removeItem('accessToken');
				localStorage.removeItem('jwt');
				if (window.location.pathname !== '/signin') {
					window.location.href = '/signin';
				}
			}
		}
		
		return Promise.reject(error);
	}
);

// In-flight request deduplication map and master-data cache
const inFlightRequests = new Map();
const cacheMap = new Map();
const CACHE_TTL = 15000; // 15 seconds for master lookup data

const CACHEABLE_ROUTES = [
	'/group',
	'/customer',
	'/vendor',
	'/diesel-stations',
	'/vehicle',
	'/user',
	'/ledger'
];

export const clearApiCache = () => {
	cacheMap.clear();
	inFlightRequests.clear();
};

const originalRequest = api.request.bind(api);

api.request = async function (configOrUrl, maybeConfig) {
	let config;
	if (typeof configOrUrl === 'string') {
		config = maybeConfig || {};
		config.url = configOrUrl;
	} else {
		config = configOrUrl || {};
	}

	const method = (config.method || 'get').toLowerCase();

	// Invalidate cache immediately on any state-modifying mutation
	if (method !== 'get') {
		cacheMap.clear();
		return originalRequest(config);
	}

	const url = config.url || '';
	const isNoCache = url.includes('_t=') ||
		Boolean(config.params?._t) ||
		config.headers?.['Cache-Control'] === 'no-cache' ||
		config.headers?.['cache-control'] === 'no-cache';

	const isCacheable = !isNoCache && CACHEABLE_ROUTES.some(r => url === r || url.startsWith(r + '?'));
	const cacheKey = `${url}?${JSON.stringify(config.params || {})}`;

	// Return cached response if valid
	if (isCacheable) {
		const cached = cacheMap.get(cacheKey);
		if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
			return Promise.resolve({
				...cached.response,
				data: typeof cached.response.data === 'object' ? JSON.parse(JSON.stringify(cached.response.data)) : cached.response.data
			});
		}
	}

	// In-flight deduplication for concurrent identical GET requests
	if (!isNoCache && inFlightRequests.has(cacheKey)) {
		return inFlightRequests.get(cacheKey);
	}

	const promise = originalRequest(config)
		.then(response => {
			if (isCacheable && response?.status >= 200 && response?.status < 300) {
				cacheMap.set(cacheKey, {
					timestamp: Date.now(),
					response
				});
			}
			return response;
		})
		.finally(() => {
			inFlightRequests.delete(cacheKey);
		});

	if (!isNoCache) {
		inFlightRequests.set(cacheKey, promise);
	}

	return promise;
};

export default api;
