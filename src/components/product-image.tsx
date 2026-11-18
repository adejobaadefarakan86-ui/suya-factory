// Stand-in picture until your real product photos are uploaded
// (that comes with the admin product editor).
const GRADIENTS = [
  "from-orange-700 to-red-900",
  "from-amber-600 to-orange-800",
  "from-red-700 to-stone-900",
  "from-yellow-600 to-red-800",
];

export function ProductImage({ name, index = 0, className = "" }: { name: string; index?: number; className?: string }) {
  return (
    <div
      className={`flex aspect-[4/3] items-end bg-gradient-to-br p-4 ${GRADIENTS[index % GRADIENTS.length]} ${className}`}
      role="img"
      aria-label={`${name} (photo coming soon)`}
    >
      <span className="text-2xl font-extrabold leading-tight text-white/90 drop-shadow">{name}</span>
    </div>
  );
}
