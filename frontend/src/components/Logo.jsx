const sizeClass = {
  sm: 'h-12 w-auto',
  md: 'h-32 w-auto',
  lg: 'h-52 w-auto',
};

export default function Logo({ size = 'md' }) {
  return (
    <img
      src="/logo.png"
      alt="RupResearch"
      className={`object-contain ${sizeClass[size] ?? sizeClass.md}`}
    />
  );
}
