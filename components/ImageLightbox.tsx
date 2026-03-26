import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';

interface ImageLightboxProps {
    src: string | null;
    onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, onClose }) => {
    // Prevent scrolling when lightbox is open
    useEffect(() => {
        if (src) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [src]);

    if (!src) return null;

    // Use React Portal + Inline Z-Index to force it above everything
    return createPortal(
        <div
            style={{ zIndex: 2147483647 }} // Maximum allowable Z-Index in browsers
            className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in touch-none"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                style={{ zIndex: 2147483647 }} // Ensure button is also at max height
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all transform hover:rotate-90 backdrop-blur-md border border-white/10 shadow-2xl cursor-pointer"
            >
                <CloseIcon className="w-8 h-8"/>
            </button>
            <div
                className="relative w-full max-w-5xl max-h-[85vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt="Full View"
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl border border-white/5 bg-black"
                />
            </div>
        </div>,
        document.body
    );
};

export default ImageLightbox;
