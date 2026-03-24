const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

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

export const FieldValue = {
    arrayUnion: (...elements: any[]) => ({ __op: 'arrayUnion', value: elements }),
    arrayRemove: (...elements: any[]) => ({ __op: 'arrayRemove', value: elements }),
    serverTimestamp: () => Date.now(),
    increment: (n: number) => ({ __op: 'increment', value: n }),
    delete: () => ({ __op: 'delete' })
};

export const FieldPath = {
    documentId: () => '__id'
};

const authListeners: ((user: any) => void)[] = [];
let currentUser: any = null;

// Try to restore user from localStorage on init
const storedUser = localStorage.getItem('user');
if (storedUser) {
    try {
        currentUser = JSON.parse(storedUser);
    } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }
}

export const auth = {
    onAuthStateChanged: (callback: (user: any) => void) => {
        authListeners.push(callback);
        // Initial call
        setTimeout(() => callback(currentUser), 0);
        return () => {
            const index = authListeners.indexOf(callback);
            if (index !== -1) authListeners.splice(index, 1);
        };
    },
    signInWithEmailAndPassword: async (email: string, pass: string) => {
        const data = await api.post('/auth/login', { email, password: pass });
        const user = { id: data._id, uid: data._id, ...data };
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(user));
        currentUser = user;
        authListeners.forEach(cb => cb(currentUser));
        return { user };
    },
    createUserWithEmailAndPassword: async (email: string, pass: string) => {
        // This is a bit tricky as the backend expects more fields for register
        // But for mock purposes we'll just use a generic register
        const data = await api.post('/auth/register', { email, password: pass, name: email.split('@')[0] });
        const user = { id: data._id, uid: data._id, ...data };
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(user));
        currentUser = user;
        authListeners.forEach(cb => cb(currentUser));
        return { user };
    },
    signOut: async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        currentUser = null;
        authListeners.forEach(cb => cb(null));
    },
    currentUser: currentUser
};

export const db = {
    collection: (name: string) => ({
        get: async () => {
            const data = await api.get(`/${name}`);
            return {
                docs: data.map((d: any) => ({
                    id: d._id || d.id,
                    data: () => ({ ...d, id: d._id || d.id }),
                    exists: true
                })),
                empty: data.length === 0,
                forEach: (cb: any) => data.forEach((d: any) => cb({ id: d._id || d.id, data: () => ({ ...d, id: d._id || d.id }) }))
            };
        },
        doc: (id: string) => ({
            get: async () => {
                const d = await api.get(`/${name}/${id}`);
                return {
                    id: d._id || d.id,
                    data: () => ({ ...d, id: d._id || d.id }),
                    exists: !!d
                };
            },
            set: (data: any, options?: any) => {
                if (options?.merge) {
                    return api.put(`/${name}/${id}`, data);
                }
                return api.post(`/${name}`, { ...data, _id: id });
            },
            update: (data: any) => api.put(`/${name}/${id}`, data),
            delete: () => api.delete(`/${name}/${id}`),
        }),
        add: async (data: any) => {
            const d = await api.post(`/${name}`, data);
            return { id: d._id || d.id };
        },
        where: (field: string, op: string, value: any) => {
            // Very basic where mock
            const endpoint = field === '__id' ? `/${name}/${value}` : `/${name}?${field}=${value}`;
            return {
                get: async () => {
                   const data = await api.get(endpoint);
                   const items = Array.isArray(data) ? data : [data];
                   return {
                       docs: items.map((d: any) => ({
                           id: d._id || d.id,
                           data: () => ({ ...d, id: d._id || d.id }),
                           exists: true
                       })),
                       empty: items.length === 0,
                       forEach: (cb: any) => items.forEach((d: any) => cb({ id: d._id || d.id, data: () => ({ ...d, id: d._id || d.id }) }))
                   };
                },
                onSnapshot: (callback: any) => {
                    api.get(endpoint).then(data => {
                        const items = Array.isArray(data) ? data : [data];
                        callback({
                            docs: items.map((d: any) => ({
                                id: d._id || d.id,
                                data: () => ({ ...d, id: d._id || d.id }),
                                exists: true
                            })),
                            forEach: (cb: any) => items.forEach((d: any) => cb({ id: d._id || d.id, data: () => ({ ...d, id: d._id || d.id }) }))
                        });
                    });
                    // In a real app we'd setup a socket or interval
                    const interval = setInterval(() => {
                         api.get(endpoint).then(data => {
                            const items = Array.isArray(data) ? data : [data];
                            callback({
                                docs: items.map((d: any) => ({
                                    id: d._id || d.id,
                                    data: () => ({ ...d, id: d._id || d.id }),
                                    exists: true
                                })),
                                forEach: (cb: any) => items.forEach((d: any) => cb({ id: d._id || d.id, data: () => ({ ...d, id: d._id || d.id }) }))
                            });
                        });
                    }, 5000);
                    return () => clearInterval(interval);
                }
            };
        },
        onSnapshot: (callback: any) => {
            api.get(`/${name}`).then(data => {
                callback({
                    docs: data.map((d: any) => ({
                        id: d._id || d.id,
                        data: () => ({ ...d, id: d._id || d.id }),
                        exists: true
                    })),
                    forEach: (cb: any) => data.forEach((d: any) => cb({ id: d._id || d.id, data: () => ({ ...d, id: d._id || d.id }) }))
                });
            });
            const interval = setInterval(() => {
                api.get(`/${name}`).then(data => {
                    callback({
                        docs: data.map((d: any) => ({
                            id: d._id || d.id,
                            data: () => ({ ...d, id: d._id || d.id }),
                            exists: true
                        })),
                        forEach: (cb: any) => data.forEach((d: any) => cb({ id: d._id || d.id, data: () => ({ ...d, id: d._id || d.id }) }))
                    });
                });
            }, 5000);
            return () => clearInterval(interval);
        }
    }),
    batch: () => ({
        set: (ref: any, data: any) => {
             // Mock batch set
        },
        commit: async () => {
             // Mock batch commit
        }
    })
};

export const storage = {
    ref: (path: string) => ({
        put: async (file: File) => {
            const data = await api.upload(file);
            return {
                ref: {
                    getDownloadURL: async () => data.url
                }
            };
        },
        getDownloadURL: async () => "" // Mock
    }),
    setMaxUploadRetryTime: (time: number) => {}
};
