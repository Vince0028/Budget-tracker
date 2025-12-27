
import React from 'react';
import { QCard } from './UI/QuirkyComponents';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings: React.FC = () => {
    return (
        <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-6">Settings</h2>
            <QCard title="App Info" className="border-l-4 border-l-stone-800 dark:border-l-stone-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-600 dark:text-stone-400">
                        <SettingsIcon size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                           Version 1.0.0 (Beta)
                        </p>
                        <p className="text-xs text-stone-500 mt-2">
                           All data is stored locally.
                        </p>
                    </div>
                </div>
            </QCard>
        </div>
    )
}

export default Settings;