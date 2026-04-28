const sizeClass = {
  xs: 'h-8 w-auto',
  xs2: 'h-10 w-auto',
  sm: 'h-12 w-auto',
  sm2x: 'h-24 w-auto',
  md: 'h-32 w-auto',
  lg: 'h-52 w-auto',
  xl: 'h-64 w-auto',
};

export default function Logo({ size = 'md' }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="RupResearch"
      className={`object-contain ${sizeClass[size] ?? sizeClass.md}`}
    />
  );
}
