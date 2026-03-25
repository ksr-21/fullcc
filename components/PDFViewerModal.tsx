
import React from 'react';
import { CloseIcon, DownloadIcon } from './Icons';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  type?: 'pdf' | 'image';
}

/**
 * Fallback Component: Only used if a direct trigger isn't possible.
 * Now simplified to a download-only trigger.
 */
const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ isOpen, onClose, url, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-[2rem] shadow-2xl w-full max-w-sm border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <DownloadIcon className="w-10 h-10"/>
            </div>
            <div>
                <h3 className="text-xl font-black text-foreground tracking-tight line-clamp-2">{title}</h3>
                <p className="text-sm text-muted-foreground mt-2">File is ready for download.</p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
                <a 
                    href={url} 
                    download={title}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                    <DownloadIcon className="w-5 h-5"/> Download Now
                </a>
                <button onClick={onClose} className="w-full py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewerModal;
