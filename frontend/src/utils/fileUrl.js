// In development the Vite proxy doesn't intercept <a href> clicks (those go directly to the target),
// so we need the full URL for file links. In production the backend serves from the same origin.
export const FILE_HOST = import.meta.env.DEV ? 'http://localhost:5269' : '';
export const fileUrl = (path) => (path ? `${FILE_HOST}${path}` : '#');
