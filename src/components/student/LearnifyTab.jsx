import React, { useState } from 'react';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

export default function LearnifyTab() {
    const learnifyUrl = import.meta.env.VITE_LEARNIFY_URL || 'https://learnify-ai-ochre.vercel.app';
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    const handleReload = () => {
        setIsLoading(true);
        setError(false);
        const iframe = document.getElementById('learnify-frame');
        if (iframe) iframe.src = learnifyUrl;
    };

    return (
        <div className="w-full h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative">
            {/* Header / Controls */}
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
                    <span className="text-xs font-mono text-gray-500">{learnifyUrl}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReload}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                        title="Reload Frame"
                    >
                        <RefreshCw size={14} />
                    </button>
                    <a
                        href={learnifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                        title="Open in New Tab"
                    >
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Loading Learnify AI...</p>
                </div>
            )}

            {/* Error State (Overlay if needed, but iframe limits handling) */}

            <iframe
                id="learnify-frame"
                src={learnifyUrl}
                className="w-full h-full border-none"
                title="Learnify AI"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setIsLoading(false);
                    setError(true);
                }}
                allow="microphone; camera; clipboard-write"
            />
        </div>
    );
}
