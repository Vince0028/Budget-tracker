
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText: string;
    variant?: 'danger' | 'primary';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    variant = 'primary'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-sm w-full border-2 border-stone-200 dark:border-stone-800 transform transition-all animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${variant === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-stone-100 text-stone-600 dark:bg-stone-800'}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <button
                            onClick={onClose}
                            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 mb-2 tracking-tight">
                        {title}
                    </h3>
                    <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed mb-6 font-medium">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white shadow-lg transform active:scale-95 transition-all
                ${variant === 'danger'
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                    : 'bg-stone-800 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 shadow-stone-500/20'}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
