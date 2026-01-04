
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (isOpen) setIsRendered(true);
        else {
            const timer = setTimeout(() => setIsRendered(false), 200); // Wait for animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isRendered) return null;

    return createPortal(
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-lg w-full border-2 border-stone-200 dark:border-stone-800 transform transition-all duration-200 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-stone-800">
                    <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 tracking-tight">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
