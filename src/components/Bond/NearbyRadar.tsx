import { motion } from 'motion/react';
import { Radar, X, AlertCircle } from 'lucide-react';
import { useNearbyRadar } from '../../hooks/useNearbyRadar';
import type { User } from '../../types';

interface Props {
  user: User;
  onConnect: (partnerCode: string) => void;
  onClose: () => void;
  key?: string;
}

export function NearbyRadar({ user, onConnect, onClose }: Props) {
  const { isScanning, nearbyUsers, error, startScan, stopScan } = useNearbyRadar(user);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white/90 backdrop-blur-md rounded-[32px] p-6 shadow-sm border border-sage-100 flex flex-col items-center"
    >
      <div className="w-full flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-sage-900 flex items-center gap-2">
          <Radar className={isScanning ? "animate-spin text-sage-500" : "text-sage-500"} size={20} />
          Nearby Sanctuaries
        </h3>
        <button
          onClick={() => {
            stopScan();
            onClose();
          }}
          className="p-2 text-sage-400 hover:text-sage-600 hover:bg-sage-50 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {error ? (
        <div className="w-full flex items-start gap-3 bg-red-50 text-red-700 p-4 rounded-xl text-sm mb-4">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="w-full flex flex-col gap-2 min-h-[160px] max-h-[240px] overflow-y-auto mb-4 p-2 bg-sage-50/50 rounded-2xl border border-sage-100/50">
        {!isScanning && nearbyUsers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sage-500 text-sm text-center">
            Tap scan to find nearby partners.
          </div>
        ) : isScanning && nearbyUsers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sage-500 text-sm">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-12 h-12 bg-sage-200 rounded-full flex items-center justify-center"
            >
              <Radar size={24} className="text-sage-600" />
            </motion.div>
            Scanning area...
          </div>
        ) : (
          nearbyUsers.map((u) => (
            <button
              key={u.seedCode}
              onClick={() => onConnect(u.seedCode)}
              className="w-full flex items-center justify-between p-4 bg-white hover:bg-sage-50 border border-sage-100 rounded-xl transition-all active:scale-[0.98] text-left shadow-sm"
            >
              <div>
                <p className="font-semibold text-sage-900">{u.userName}</p>
                <p className="text-xs text-sage-500">{u.distance}m away</p>
              </div>
              <span className="text-sm font-medium text-sage-600 bg-sage-100 px-3 py-1 rounded-full">
                Connect
              </span>
            </button>
          ))
        )}
      </div>

      {!isScanning ? (
        <button
          onClick={startScan}
          className="w-full bg-sage-100 text-sage-700 rounded-2xl px-4 py-3 font-medium hover:bg-sage-200 transition-colors"
        >
          Start Scanning
        </button>
      ) : (
        <button
          onClick={stopScan}
          className="w-full bg-red-50 text-red-600 rounded-2xl px-4 py-3 font-medium hover:bg-red-100 transition-colors"
        >
          Stop Scanning
        </button>
      )}
    </motion.div>
  );
}
