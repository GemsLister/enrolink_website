// Simple API client using fetch
const BASE = import.meta.env.VITE_API_URL || '/api';
const request = async (method, url, options = {}) => {
	// Validate URL parameter
	if (typeof url !== 'string') {
		console.error('URL must be a string. Received:', {
			url,
			type: typeof url,
			method,
			options
		});
		throw new Error('URL must be a string');
	}

	const { params, body, token, ...rest } = options;
	
	// Ensure token is a valid string JWT
	// Handle different token formats: string, object with .token, or useAuth return value
	let tokenString = null;
	if (token) {
		if (typeof token === 'string' && token.trim().length > 0) {
			tokenString = token.trim();
		} else if (typeof token === 'object') {
			// If token is an object, try to extract the actual token string
			if (token.token && typeof token.token === 'string') {
				tokenString = token.token.trim();
			} else if (token.value && typeof token.value === 'string') {
				tokenString = token.value.trim();
			} else {
				// Try to get from localStorage as fallback
				const storedToken = localStorage.getItem('token');
				if (storedToken && typeof storedToken === 'string') {
					tokenString = storedToken.trim();
				} else {
					console.warn('Token is an object but no valid token string found:', token);
				}
			}
		}
	} else {
		// If no token provided, try to get from localStorage
		const storedToken = localStorage.getItem('token');
		if (storedToken && typeof storedToken === 'string') {
			tokenString = storedToken.trim();
		}
	}
	
	const headers = {
		'Content-Type': 'application/json',
		...(tokenString && { 'Authorization': `Bearer ${tokenString}` }),
		...(options.headers || {})
	};

	// Build URL with query params
    let fullUrl = url.startsWith('http') ? url : `${BASE}${url}`;
	if (params) {
		const queryString = new URLSearchParams(params).toString();
		fullUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${queryString}`;
	}

	try {
		// Debug: Log token presence for calendar requests
		if (url.includes('/calendar')) {
			console.log('Sending calendar request with token:', {
				url: fullUrl,
				hasToken: !!tokenString,
				tokenType: typeof token,
				originalTokenType: token ? typeof token : 'null',
				tokenLength: tokenString ? tokenString.length : 0,
				tokenPreview: tokenString ? (tokenString.length > 20 ? tokenString.substring(0, 20) + '...' : tokenString) : 'No token',
				isValidJWT: tokenString ? tokenString.split('.').length === 3 : false
			});
		}
		
		// For GET/HEAD requests, don't include body in the fetch options
		const fetchOptions = {
			method,
			headers,
			credentials: 'include',
			...rest
		};

		// Only add body for non-GET/HEAD requests
		if (method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD' && body) {
			fetchOptions.body = JSON.stringify(body);
		} else if (method.toUpperCase() === 'GET' && body) {
			// For GET requests, move body to query params if needed
			const queryParams = new URLSearchParams();
			Object.entries(body).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					queryParams.append(key, value);
				}
			});
			const queryString = queryParams.toString();
			fullUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${queryString}`;
		}

	const response = await fetch(fullUrl, fetchOptions);

	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		// Log detailed error for debugging
		if (response.status === 401) {
			console.error('Authentication failed:', {
				url: fullUrl,
				hasToken: !!tokenString,
				tokenLength: tokenString?.length,
				tokenType: typeof token,
				originalToken: token,
				headers: Object.keys(fetchOptions.headers),
				authHeader: fetchOptions.headers['Authorization'] ? 'Present' : 'Missing'
			});
		}
		const error = new Error(data.message || data.error || 'Request failed');
		error.status = response.status;
		error.data = data;
		throw error;
	}
	return data;
	} catch (error) {
		console.error('API request failed:', {
			url: fullUrl,
			method,
			error: error.message,
			status: error.status,
			data: error.data
		});
		throw error;
	}
};

export const api = {
	// Expose request method for direct use
	request,
	
	// Auth
    login: (payload) => request('POST', '/auth/login', { body: payload }),
    google: (payload) => request('POST', '/auth/google', { body: payload }),
    signupWithInvite: (payload) => request('POST', '/auth/signup-with-invite', { body: payload }),
    requestPasswordReset: (payload) => request('POST', '/auth/request-password-reset', { body: payload }),
    resetPassword: (payload) => request('POST', '/auth/reset-password', { body: payload }),

	// Dashboard
	    dashboardStats: (token, year) => request('GET', `/dashboard/stats${year ? `?year=${encodeURIComponent(year)}` : ''}`, { token }),
	    dashboardActivity: (token, year) => request('GET', `/dashboard/activity${year ? `?year=${encodeURIComponent(year)}` : ''}`, { token }),
	    dashboardPushGa: (token, year) => request('POST', `/dashboard/push-ga${year ? `?year=${encodeURIComponent(year)}` : ''}`, { token }),

	// Officers
    officersList: (token) => request('GET', '/officers', { token }),
    officersInterviewers: (token) => request('GET', '/officers/interviewers', { token }),
    officerUpdate: (token, id, payload) => request('PATCH', `/officers/${id}`, { body: payload, token }),
    officersArchivedList: (token) => request('GET', '/officers/archived', { token }),
    officerArchive: (token, id) => request('PATCH', `/officers/${id}/archive`, { token }),
    officerRestore: (token, id) => request('PATCH', `/officers/${id}/restore`, { token }),
    officerInvite: (token, payload) => request('POST', '/auth/invite', { body: payload, token }),

	// Batches
	    batchesList: (token) => request('GET', '/batches', { token }),
	    batchesArchivedList: (token) => request('GET', '/batches/archived', { token }),
	    batchArchive: (token, id) => request('PATCH', `/batches/${id}/archive`, { token }),
	    batchRestore: (token, id) => request('PATCH', `/batches/${id}/restore`, { token }),

    // Calendar
    calendarEvents: (token, { timeMin, timeMax, calendarId = 'primary' }) => {
        const params = new URLSearchParams();
        if (timeMin) params.append('timeMin', timeMin);
        if (timeMax) params.append('timeMax', timeMax);
        if (calendarId) params.append('calendarId', calendarId);
        const queryString = params.toString();
        const url = queryString ? `/calendar/events?${queryString}` : '/calendar/events';
        return request('GET', url, { token })
    },
    calendarCreate: (event, token) => request('POST', '/calendar/events', { body: event, token }),
    calendarUpdate: (eventId, event, token) => request('PATCH', `/calendar/events/${eventId}`, { body: event, token }),
    calendarDelete: (token, eventId) => request('DELETE', `/calendar/events/${eventId}`, { token }),
    calendarPushToGoogle: (token) => request('POST', '/calendar/push', { token }) // Push database events to Google Calendar
};
