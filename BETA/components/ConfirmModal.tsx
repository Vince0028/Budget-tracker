import React from 'react';
import { QButton, QCard } from './UI/QuirkyComponents';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = 'primary'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                <QCard className={`border-l-4 ${variant === 'danger' ? 'border-l-red-500' : 'border-l-stone-800 dark:border-l-stone-100'} shadow-2xl`}>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <div className={`p-3 rounded-full ${variant === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'}`}>
                                {variant === 'danger' ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 leading-tight mb-1">
                                    {title}
                                </h3>
                                <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                                    {message}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end mt-2 pt-4 border-t border-stone-100 dark:border-stone-800">
                            <QButton variant="ghost" onClick={onClose}>
                                {cancelText}
                            </QButton>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-transform active:scale-95 ${variant === 'danger'
                                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20'
                                        : 'bg-stone-800 hover:bg-stone-900 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900'
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </QCard>
            </div>
        </div>
    );
};

export default ConfirmModal;
