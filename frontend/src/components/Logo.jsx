export default function Logo({ size = 'md' }) {
  const height = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;

  return (
    <img
      src="/logo.png"
      alt="RupResearch"
      style={{ height }}
      className="object-contain"
    />
  );
}
