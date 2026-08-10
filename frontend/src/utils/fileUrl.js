export const fileUrl = (path) => {
  if (!path) return '#';
  if (import.meta.env.DEV) return path; // Vite proxy forwards /uploads/* → localhost:5269
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${clean}`;
};
