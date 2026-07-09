import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { Share2, X } from 'lucide-react';

interface Props {
  seedCode: string;
  onClose: () => void;
  key?: string;
}

export function QRCodeDisplay({ seedCode, onClose }: Props) {
  const shareUrl = `${window.location.origin}/?connect=${seedCode}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Connect on OnlyOne',
          text: 'Join my sanctuary on OnlyOne!',
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white/90 backdrop-blur-md rounded-[32px] p-8 shadow-sm border border-sage-100 flex flex-col items-center"
    >
      <div className="w-full flex justify-between items-start mb-6">
        <h3 className="text-lg font-semibold text-sage-900">Your QR Code</h3>
        <button
          onClick={onClose}
          className="p-2 -mr-2 -mt-2 text-sage-400 hover:text-sage-600 hover:bg-sage-50 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-sage-100 mb-6">
        <QRCodeSVG value={shareUrl} size={180} level="M" fgColor="#3f4e43" />
      </div>

      <p className="text-sm text-sage-600 text-center mb-6">
        Scan this code or share the link below to instantly connect.
      </p>

      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 bg-sage-500 text-white rounded-2xl px-4 py-3 font-medium hover:bg-sage-600 transition-colors"
      >
        <Share2 size={18} />
        Share Link
      </button>
    </motion.div>
  );
}
