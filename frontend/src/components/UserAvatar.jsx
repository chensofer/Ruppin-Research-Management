export default function UserAvatar({ userId, firstName, lastName, size = 'md', className = '' }) {
  const pic = userId ? localStorage.getItem(`profilePic_${userId}`) : null;
  const initials = ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?';

  const sizeClass = {
    xs:   'w-6 h-6 text-xs',
    sm:   'w-7 h-7 text-xs',
    md:   'w-8 h-8 text-xs',
    lg:   'w-9 h-9 text-sm',
    xl:   'w-12 h-12 text-base',
    '2xl':'w-20 h-20 text-2xl',
  }[size] ?? 'w-8 h-8 text-xs';

  if (pic) {
    return (
      <img
        src={pic}
        alt={`${firstName ?? ''} ${lastName ?? ''}`}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold flex-shrink-0 ${className}`}>
      {initials}
    </div>
  );
}
