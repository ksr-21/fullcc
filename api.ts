const API_URL = 'http://localhost:5000/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const api = {
    get: async (endpoint: string) => {
        const response = await fetch(`${API_URL}${endpoint}`, { headers: getHeaders() });
        if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'API request failed'); }
        return response.json();
    },
    post: async (endpoint: string, data: any) => {
        const response = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
        if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'API request failed'); }
        return response.json();
    },
    put: async (endpoint: string, data: any) => {
        const response = await fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
        if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'API request failed'); }
        return response.json();
    },
    delete: async (endpoint: string) => {
        const response = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers: getHeaders() });
        if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'API request failed'); }
        return response.json();
    },
    upload: async (file: File) => {
        const formData = new FormData(); formData.append('file', file);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/upload`, { method: 'POST', headers: { 'Authorization': token ? `Bearer ${token}` : '' }, body: formData });
        if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Upload failed'); }
        return response.json();
    }
};

export const db = {
    collection: (name: string) => ({
        get: () => api.get(`/${name}`),
        doc: (id: string) => ({
            get: () => api.get(`/${name}/${id}`),
            update: (data: any) => api.put(`/${name}/${id}`, data),
            delete: () => api.delete(`/${name}/${id}`),
        }),
        add: (data: any) => api.post(`/${name}`, data),
        where: (field: string, op: string, value: any) => ({
            get: () => api.get(`/${name}?${field}=${value}`),
            onSnapshot: (callback: any) => { api.get(`/${name}?${field}=${value}`).then(callback); }
        }),
        onSnapshot: (callback: any) => { api.get(`/${name}`).then(callback); }
    }),
    batch: () => ({ set: (ref: any, data: any) => {}, commit: async () => {} })
};
