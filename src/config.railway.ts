// Public deployment configuration (Vercel frontend → Railway backend)
// Used for the student/education version hosted outside Amazon
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-app.up.railway.app';
export const SOCKET_URL = API_BASE_URL;
