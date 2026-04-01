
export default function ProductGallery({ images }: { images: string[] }) {
    return (
        <div className="w-full flex flex-col gap-4 lg:sticky lg:top-28">
            {/* Mobile: Horizontal scroll, Desktop: Grid */}
            <div className="flex overflow-x-auto lg:grid lg:grid-cols-2 gap-4 snap-x snap-mandatory hide-scrollbar">
                {images.map((img, index) => (
                    <div
                        key={index}
                        className="w-full flex-shrink-0 snap-center lg:col-span-1 aspect-[3/4] bg-gray-100 overflow-hidden"
                    >
                        <img
                            src={img}
                            alt={`Product view ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading={index === 0 ? "eager" : "lazy"} // Performance optimization
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}