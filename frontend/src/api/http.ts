/** Shared authenticated fetch helpers. */
export const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> =>
    fetch(input, {
        ...init,
        headers: {
            ...getAuthHeaders(),
            ...init.headers,
        },
    });