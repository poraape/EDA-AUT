import React from 'react';
import { BrainCircuitIcon, DownloadIcon } from './icons/Icons';

interface HeaderProps {
    datasetName?: string;
    onExport: () => void;
    canExport: boolean;
}

const Header: React.FC<HeaderProps> = ({ datasetName, onExport, canExport }) => {
    return (
        <header className="flex items-center justify-between p-4 border-b border-border-color bg-background/80 backdrop-blur-sm sticky top-0 z-10 h-16 flex-shrink-0">
            <div className="flex items-center gap-3">
                <BrainCircuitIcon className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-lg font-bold text-text-primary">Agente EDA Autônomo</h1>
                    {datasetName && <p className="text-sm text-text-secondary -mt-1">{datasetName}</p>}
                </div>
            </div>
            <button
                onClick={onExport}
                disabled={!canExport}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary bg-secondary-background border border-border-color rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Exportar conversa"
            >
                <DownloadIcon className="w-4 h-4" />
                <span>Exportar</span>
            </button>
        </header>
    );
};

export default Header;