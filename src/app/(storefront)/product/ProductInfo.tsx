'use client';


import { useState } from 'react';
import { ChevronDown, Star, X, Truck, Info, RefreshCw, 
  ArrowRightLeft, MapPin, Send, Ticket, Clock, Video, ShieldAlert, CheckCircle2,
  Recycle, FlaskConical, Loader2, XCircle, MapPinOff } from 'lucide-react';

interface ProductInfoProps {
    product: any; // In a real app, define the strict TypeScript interface here
}

export default function ProductInfo({ product }: ProductInfoProps) {
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState(product.colors[0].name);
    const [openDetail, setOpenDetail] = useState<string | null>(product.details[0].title);

    return (
        <div className="w-full flex flex-col pt-8 lg:pt-0 lg:pl-10">
            {/* Title & Price */}
            <h1 className="font-serif text-3xl md:text-4xl text-primary-dark mb-4">
                {product.name}
            </h1>
            <p className="font-sans text-xl text-gray-700 mb-6">{product.price}</p>

            {/* Description */}
            <p className="font-sans text-sm text-gray-500 leading-relaxed mb-8">
                {product.description}
            </p>

            {/* Color Selector */}
            <div className="mb-6">
                <span className="font-sans text-xs uppercase tracking-widest text-primary-dark mb-3 block">
                    Color: <span className="text-gray-500 ml-1">{selectedColor}</span>
                </span>
                <div className="flex space-x-3">
                    {product.colors.map((color: any) => (
                        <button
                            key={color.name}
                            onClick={() => setSelectedColor(color.name)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color.name ? 'border-primary-dark' : 'border-transparent'
                                }`}
                            style={{ backgroundColor: color.hex }}
                            aria-label={`Select ${color.name}`}
                        />
                    ))}
                </div>
            </div>

            {/* Size Selector */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <span className="font-sans text-xs uppercase tracking-widest text-primary-dark">Size</span>
                    <button className="font-sans text-xs text-gray-400 underline hover:text-primary-dark">Size Guide</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {product.sizes.map((size: string) => (
                        <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`py-3 border font-sans text-sm transition-colors ${selectedSize === size
                                    ? 'border-primary-dark bg-primary-dark text-primary'
                                    : 'border-gray-300 text-primary-dark hover:border-gray-800'
                                }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            {/* Add to Cart Button */}
            <button
                className={`w-full py-4 mb-10 font-sans text-sm font-medium tracking-widest uppercase transition-colors ${selectedSize
                        ? 'bg-primary-dark text-primary hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                disabled={!selectedSize}
            >
                {selectedSize ? 'Add to Cart' : 'Select a Size'}
            </button>

            {/* Expandable Details (Accordion) */}
            <div className="border-t border-gray-200">
                {product.details.map((detail: any) => (
                    <div key={detail.title} className="border-b border-gray-200">
                        <button
                            onClick={() => setOpenDetail(openDetail === detail.title ? null : detail.title)}
                            className="w-full py-4 flex justify-between items-center font-sans text-sm tracking-wide text-primary-dark"
                        >
                            {detail.title}
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openDetail === detail.title ? 'rotate-180' : ''}`} />
                        </button>
                        <div
                            className={`overflow-hidden transition-all duration-300 ${openDetail === detail.title ? 'max-h-40 pb-4' : 'max-h-0'}`}
                        >
                            <p className="font-sans text-sm text-gray-500 leading-relaxed">
                                {detail.content}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}