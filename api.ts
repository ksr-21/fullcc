const API_URL = (import.meta as any).env?.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const withFriendlyNetworkError = async <T>(request: () => Promise<T>): Promise<T> => {
    try {
        return await request();
    } catch (error: any) {
        if (error instanceof TypeError && error.message?.includes('Failed to fetch')) {
            throw new Error('Backend server is not reachable. Start the backend on http://localhost:5000 and try again.');
        }
        throw error;
    }
};

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const api = {
    get: async (endpoint: string) => {
        const response = await withFriendlyNetworkError(() => fetch(`${API_URL}${endpoint}`, { headers: getHeaders() }));
        if (!response.ok) {
            let errorMsg = 'API request failed';
            try { const error = await response.json(); errorMsg = error.message || error.error || errorMsg; } catch (e) {}
            throw new Error(errorMsg);
        }
        return response.json();
    },
    post: async (endpoint: string, data: any) => {
        const response = await withFriendlyNetworkError(() => fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }));
        if (!response.ok) {
            let errorMsg = 'API request failed';
            try { const error = await response.json(); errorMsg = error.message || error.error || errorMsg; } catch (e) {}
            throw new Error(errorMsg);
        }
        return response.json();
    },
    put: async (endpoint: string, data: any) => {
        const response = await withFriendlyNetworkError(() => fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }));
        if (!response.ok) {
            let errorMsg = 'API request failed';
            try { const error = await response.json(); errorMsg = error.message || error.error || errorMsg; } catch (e) {}
            throw new Error(errorMsg);
        }
        return response.json();
    },
    delete: async (endpoint: string) => {
        const response = await withFriendlyNetworkError(() => fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers: getHeaders() }));
        if (!response.ok) {
            let errorMsg = 'API request failed';
            try { const error = await response.json(); errorMsg = error.message || error.error || errorMsg; } catch (e) {}
            throw new Error(errorMsg);
        }
        return response.json();
    },
    upload: async (file: File) => {
        const formData = new FormData(); formData.append('file', file);
        const token = localStorage.getItem('token');
        const response = await withFriendlyNetworkError(() => fetch(`${API_URL}/upload`, { method: 'POST', headers: { 'Authorization': token ? `Bearer ${token}` : '' }, body: formData }));
        if (!response.ok) {
            let errorMsg = 'Upload failed';
            try { const error = await response.json(); errorMsg = error.message || error.error || errorMsg; } catch (e) {}
            throw new Error(errorMsg);
        }
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
        // The backend registration flow fills invite-backed profile fields server-side.
        const data = await api.post('/auth/register', { email, password: pass, name: email.split('@')[0] });
        const user = { id: data._id, uid: data._id, ...data };
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(user));
        currentUser = user;
        authListeners.forEach(cb => cb(currentUser));
        return { user };
    },
    seedSuperAdmin: async (name: string, email: string, pass: string) => {
        const data = await api.post('/auth/seed-admin', { name, email, password: pass });
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

const toDoc = (d: any) => ({
    id: d._id || d.id,
    data: () => ({ ...d, id: d._id || d.id }),
    exists: true
});

const toSnapshot = (items: any[]) => ({
    docs: items.map(toDoc),
    empty: items.length === 0,
    forEach: (cb: any) => items.forEach((d: any) => cb(toDoc(d)))
});

const applyFilters = (items: any[], filters: Array<{ field: string; op: string; value: any }>) => {
    return items.filter((item) => {
        return filters.every(({ field, op, value }) => {
            const itemValue = field === '__id' ? (item._id || item.id) : item[field];

            if (op === '==') {
                return itemValue === value;
            }

            if (op === 'array-contains') {
                return Array.isArray(itemValue) && itemValue.includes(value);
            }

            return true;
        });
    });
};

const createQuery = (
    name: string,
    filters: Array<{ field: string; op: string; value: any }> = [],
    limitCount?: number
) => ({
    where: (field: string, op: string, value: any) => createQuery(name, [...filters, { field, op, value }], limitCount),
    limit: (count: number) => createQuery(name, filters, count),
    get: async () => {
        if (filters.length === 1 && filters[0].field === '__id' && filters[0].op === '==') {
            const data = await api.get(`/${name}/${filters[0].value}`);
            const items = data ? [data] : [];
            return toSnapshot(typeof limitCount === 'number' ? items.slice(0, limitCount) : items);
        }

        const data = await api.get(`/${name}`);
        const filteredItems = applyFilters(Array.isArray(data) ? data : [data], filters);
        const items = typeof limitCount === 'number' ? filteredItems.slice(0, limitCount) : filteredItems;
        return toSnapshot(items);
    },
    onSnapshot: (callback: any, errorCallback?: any) => {
        const load = async () => {
            try {
                const snapshot = await createQuery(name, filters, limitCount).get();
                callback(snapshot);
            } catch (error: any) {
                if (errorCallback) errorCallback(error);
            }
        };

        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }
});

export const db = {
    collection: (name: string) => ({
        get: async () => {
            const data = await api.get(`/${name}`);
            return toSnapshot(data);
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
        where: (field: string, op: string, value: any) => createQuery(name, [{ field, op, value }]),
        onSnapshot: (callback: any) => {
            api.get(`/${name}`).then(data => {
                callback(toSnapshot(data));
            });
            const interval = setInterval(() => {
                api.get(`/${name}`).then(data => {
                    callback(toSnapshot(data));
                });
            }, 5000);
            return () => clearInterval(interval);
        }
    }),
    batch: () => ({
        set: (ref: any, data: any) => {
             // Batch writes are handled as direct API updates in this Mongo-backed client.
        },
        commit: async () => {
             // No-op placeholder kept for compatibility with existing callers.
        }
    })
};

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const compressImage = (file: File, maxWidth = 1024, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Failed to get canvas context'));

                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas to Blob failed'));
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const uploadToCloudinary = async (file: File | Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('resource_type', 'auto');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Upload failed');
    }
    const data = await response.json();
    return data.secure_url;
};

export const storage = {
    ref: (path: string) => ({
        put: async (file: File) => {
            // Check for Cloudinary configuration
            const hasCloudinary = !!CLOUDINARY_CLOUD_NAME && !!CLOUDINARY_UPLOAD_PRESET && CLOUDINARY_CLOUD_NAME !== 'undefined';

            if (hasCloudinary) {
                try {
                    const url = await uploadToCloudinary(file);
                    return {
                        ref: {
                            getDownloadURL: async () => url
                        }
                    };
                } catch (err: any) {
                    console.warn('Cloudinary upload failed, falling back to local backend:', err.message);
                }
            } else {
                console.info('Cloudinary not configured, using local backend storage.');
            }

            // Fallback to backend upload if Cloudinary fails or is not configured
            try {
                const data = await api.upload(file);
                return {
                    ref: {
                        getDownloadURL: async () => data.fileUrl || data.url || data.uri
                    }
                };
            } catch (fallbackErr: any) {
                console.error('All upload methods failed:', fallbackErr.message);
                throw fallbackErr;
            }
        },
        getDownloadURL: async () => "" // Mock
    }),
    setMaxUploadRetryTime: (time: number) => {}
};
