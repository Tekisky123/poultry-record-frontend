import axios from 'axios';

// const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888/api';

const api = axios.create({
	baseURL: "https://poultry-record-backend.vercel.app/api",
	// baseURL: "http://localhost:8888/api",
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
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
