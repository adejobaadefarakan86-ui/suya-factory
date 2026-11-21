import Image from "next/image";

// Product photo (from products.image_urls). Products without a photo yet get
// a coloured stand-in with their name.
const GRADIENTS = [
  "from-orange-700 to-red-900",
  "from-amber-600 to-orange-800",
  "from-red-700 to-stone-900",
  "from-yellow-600 to-red-800",
];

export function ProductImage({
  name,
  src,
  index = 0,
  className = "",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: {
  name: string;
  src?: string | null;
  index?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className={`relative aspect-[4/3] overflow-hidden bg-cream ${className}`}>
        <Image src={src} alt={name} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
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
