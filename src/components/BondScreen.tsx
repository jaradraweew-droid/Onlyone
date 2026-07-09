import { useState, useEffect } from 'react';
import type { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, Copy, Check, Clock, WifiOff, Radar, QrCode, ScanLine } from 'lucide-react';
import { socket } from '../socket';
import { NearbyRadar } from './Bond/NearbyRadar';
import { QRCodeDisplay } from './Bond/QRCodeDisplay';
import { QRCodeScanner } from './Bond/QRCodeScanner';
import { useDeepLinkConnection } from '../hooks/useDeepLinkConnection';

interface Props {
  user: User;
  onUpdateUser: (user: User) => void;
}

export default function BondScreen({ user, onUpdateUser }: Props) {
  const [partnerCode, setPartnerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sent' | 'partner_offline' | 'error'>('idle');
  const [incomingRequest, setIncomingRequest] = useState<{ seedCode: string; name?: string } | null>(null);
  const [activeModal, setActiveModal] = useState<'radar' | 'qr_display' | 'qr_scan' | null>(null);
  
  const { deepLinkCode, clearDeepLink } = useDeepLinkConnection();

  useEffect(() => {
    const onBondRequested = (requesterUser: { seedCode: string; name?: string }) => {
      setIncomingRequest(requesterUser);
    };

    const onBondAccepted = (acceptorUser: { seedCode: string }) => {
      onUpdateUser({ ...user, partnerId: acceptorUser.seedCode });
    };

    const onBondRequestSent = () => {
      setLoading(false);
      setStatus('sent');
    };

    const onBondPartnerOffline = () => {
      setLoading(false);
      setStatus('partner_offline');
    };

    socket.on('bond_requested', onBondRequested);
    socket.on('bond_accepted', onBondAccepted);
    socket.on('bond_request_sent', onBondRequestSent);
    socket.on('bond_partner_offline', onBondPartnerOffline);

    return () => {
      socket.off('bond_requested', onBondRequested);
      socket.off('bond_accepted', onBondAccepted);
      socket.off('bond_request_sent', onBondRequestSent);
      socket.off('bond_partner_offline', onBondPartnerOffline);
    };
  }, [user, onUpdateUser]);

  const handleBond = (codeToConnect?: string) => {
    const target = (codeToConnect || partnerCode).trim();
    if (!target || loading) return;
    setPartnerCode(target);
    setLoading(true);
    setStatus('idle');

    const timeout = setTimeout(() => {
      setLoading(false);
      setStatus('error');
    }, 8000);

    const clearOnResponse = () => clearTimeout(timeout);
    socket.once('bond_request_sent', clearOnResponse);
    socket.once('bond_partner_offline', clearOnResponse);

    socket.emit('bond_request', { targetCode: target, user });
  };

  useEffect(() => {
    if (deepLinkCode) {
      handleBond(deepLinkCode);
      clearDeepLink();
    }
  }, [deepLinkCode, clearDeepLink]);

  const handleCopy = () => {
    navigator.clipboard.writeText(user.seedCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAccept = () => {
    if (!incomingRequest) return;
    socket.emit('bond_accept', { targetCode: incomingRequest.seedCode, user });
    onUpdateUser({ ...user, partnerId: incomingRequest.seedCode });
  };

  const renderStatus = () => {
    if (status === 'sent') return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-sage-600 text-sm bg-sage-50 border border-sage-200 rounded-[20px] px-5 py-3 mt-4"
      >
        <Clock size={16} className="shrink-0" />
        <span>Bond request sent! Waiting for <strong>{partnerCode}</strong> to accept…</span>
      </motion.div>
    );
    if (status === 'partner_offline') return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-[20px] px-5 py-3 mt-4"
      >
        <WifiOff size={16} className="shrink-0" />
        <span>Partner is not online yet. Ask them to open the app and try again.</span>
      </motion.div>
    );
    if (status === 'error') return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-[20px] px-5 py-3 mt-4"
      >
        <WifiOff size={16} className="shrink-0" />
        <span>Connection error. Please refresh and try again.</span>
      </motion.div>
    );
    return null;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:px-12 bg-mint relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-[-10%] left-[-20%] w-64 h-64 bg-sage-100 rounded-full blur-[80px] opacity-50" />
      <div className="absolute bottom-[-10%] right-[-20%] w-64 h-64 bg-sage-200 rounded-full blur-[80px] opacity-50" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md flex flex-col items-center z-10"
      >
        <div className="w-20 h-20 bg-sage-100 rounded-full flex items-center justify-center mb-8 text-sage-500 shadow-inner">
          <Leaf size={36} strokeWidth={1.5} />
        </div>

        <h2 className="text-3xl md:text-4xl font-serif text-sage-900 mb-8 text-center leading-tight">
          Create your<br />Bond
        </h2>

        {/* Incoming request banner */}
        {incomingRequest && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-sage-50 border border-sage-200 rounded-[24px] p-5 mb-6 flex flex-col items-center gap-3"
          >
            <p className="text-sage-700 text-sm text-center">
              <strong>{incomingRequest.name || incomingRequest.seedCode}</strong> wants to bond!
            </p>
            <button
              onClick={handleAccept}
              className="bg-sage-500 text-white rounded-[20px] px-6 py-3 font-medium hover:bg-sage-700 transition-colors active:scale-[0.98]"
            >
              Accept Bond
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeModal === 'radar' && (
            <NearbyRadar
              key="radar"
              user={user}
              onClose={() => setActiveModal(null)}
              onConnect={(code) => {
                setActiveModal(null);
                handleBond(code);
              }}
            />
          )}

          {activeModal === 'qr_display' && (
            <QRCodeDisplay
              key="qr_display"
              seedCode={user.seedCode}
              onClose={() => setActiveModal(null)}
            />
          )}

          {activeModal === 'qr_scan' && (
            <QRCodeScanner
              key="qr_scan"
              onClose={() => setActiveModal(null)}
              onScan={(code) => {
                setActiveModal(null);
                handleBond(code);
              }}
            />
          )}

          {!activeModal && (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {/* Seamless Connection Methods */}
              <div className="w-full grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setActiveModal('radar')}
                  className="col-span-2 flex items-center justify-center gap-3 bg-sage-500 text-white p-4 rounded-[24px] font-medium hover:bg-sage-600 transition-colors shadow-sm"
                >
                  <Radar size={20} />
                  Find Nearby Sanctuaries
                </button>
                <button
                  onClick={() => setActiveModal('qr_display')}
                  className="flex items-center justify-center gap-2 bg-white border border-sage-200 text-sage-700 p-4 rounded-[20px] font-medium hover:bg-sage-50 transition-colors shadow-sm"
                >
                  <QrCode size={18} />
                  Show QR
                </button>
                <button
                  onClick={() => setActiveModal('qr_scan')}
                  className="flex items-center justify-center gap-2 bg-white border border-sage-200 text-sage-700 p-4 rounded-[20px] font-medium hover:bg-sage-50 transition-colors shadow-sm"
                >
                  <ScanLine size={18} />
                  Scan QR
                </button>
              </div>

              {/* Seed Code Display */}
              <div className="w-full bg-white/80 backdrop-blur-md rounded-[24px] p-5 shadow-sm mb-6 flex items-center justify-between border border-sage-100">
                <div>
                  <p className="text-sage-500 text-xs uppercase tracking-wider mb-1">Your Code</p>
                  <span className="font-mono text-lg font-bold text-sage-900 tracking-wider select-all">{user.seedCode}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="p-3 text-sage-500 hover:bg-sage-100 rounded-full transition-colors bg-sage-50 active:scale-95"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>

              {/* Divider */}
              <div className="w-full flex items-center gap-4 mb-6 px-2">
                <div className="flex-1 h-px bg-sage-200" />
                <span className="text-sage-400 text-xs font-medium tracking-widest uppercase">OR</span>
                <div className="flex-1 h-px bg-sage-200" />
              </div>

              {/* Manual Entry */}
              <div className="w-full flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Enter partner's code"
                  value={partnerCode}
                  onChange={(e) => { setPartnerCode(e.target.value); setStatus('idle'); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleBond()}
                  className="w-full bg-white/80 backdrop-blur-md border border-sage-200 rounded-[20px] px-5 py-4 outline-none focus:border-sage-500 focus:bg-white text-center font-mono tracking-wide text-sage-900 shadow-sm transition-all"
                />
                <button
                  onClick={() => handleBond()}
                  disabled={!partnerCode.trim() || loading}
                  className="w-full bg-sage-100 text-sage-700 rounded-[20px] px-6 py-4 font-medium disabled:opacity-50 hover:bg-sage-200 transition-all flex justify-center items-center shadow-sm active:scale-[0.98]"
                >
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Leaf size={20} />
                    </motion.div>
                  ) : (
                    'Connect Manually'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status feedback */}
        {!activeModal && renderStatus()}
      </motion.div>
    </div>
  );
}
