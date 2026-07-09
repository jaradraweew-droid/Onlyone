import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion } from 'motion/react';
import { X, AlertCircle } from 'lucide-react';

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
  key?: string;
}

export function QRCodeScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (detectedCodes: { rawValue: string }[]) => {
    if (detectedCodes.length > 0) {
      const value = detectedCodes[0].rawValue;
      // Extract code if it's a URL
      try {
        const url = new URL(value);
        const code = url.searchParams.get('connect');
        if (code) {
          onScan(code);
        } else {
          onScan(value); // Fallback if they scanned raw text
        }
      } catch {
        // Not a URL, treat as raw code
        onScan(value);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white/90 backdrop-blur-md rounded-[32px] p-6 shadow-sm border border-sage-100 flex flex-col items-center"
    >
      <div className="w-full flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-sage-900">Scan QR Code</h3>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-sage-400 hover:text-sage-600 hover:bg-sage-50 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="w-full flex items-start gap-3 bg-red-50 text-red-700 p-4 rounded-xl text-sm mb-4">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="w-full aspect-square overflow-hidden rounded-2xl border-2 border-sage-200">
        <Scanner
          onScan={handleScan}
          onError={(err: unknown) => {
            console.error('QR Scanner Error:', err);
            setError('Could not access camera. Please check permissions.');
          }}
          formats={['qr_code']}
          styles={{
            container: { width: '100%', height: '100%' },
            video: { objectFit: 'cover' }
          }}
        />
      </div>
    </motion.div>
  );
}
