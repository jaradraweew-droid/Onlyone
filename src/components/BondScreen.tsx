import { useState, useEffect } from 'react';
import type { User } from '../types';
import { motion } from 'motion/react';
import { Leaf, Copy, Check, Clock, WifiOff } from 'lucide-react';
import { socket } from '../socket';

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

  useEffect(() => {
    const onBondRequested = (requesterUser: { seedCode: string; name?: string }) => {
      setIncomingRequest(requesterUser);
    };

    const onBondAccepted = (acceptorUser: { seedCode: string }) => {
      onUpdateUser({ ...user, partnerId: acceptorUser.seedCode });
    };

    // Feedback to requester: request was delivered
    const onBondRequestSent = () => {
      setLoading(false);
      setStatus('sent');
    };

    // Feedback to requester: partner is not currently online
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

  const handleCopy = () => {
    navigator.clipboard.writeText(user.seedCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBond = () => {
    if (!partnerCode.trim() || loading) return;
    setLoading(true);
    setStatus('idle');

    // Timeout fallback: if no server response in 8s, show error
    const timeout = setTimeout(() => {
      setLoading(false);
      setStatus('error');
    }, 8000);

    // Clear timeout once we get a response
    const clearOnResponse = () => clearTimeout(timeout);
    socket.once('bond_request_sent', clearOnResponse);
    socket.once('bond_partner_offline', clearOnResponse);

    socket.emit('bond_request', { targetCode: partnerCode.trim(), user });
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
        className="flex items-center gap-2 text-sage-600 text-sm bg-sage-50 border border-sage-200 rounded-[20px] px-5 py-3"
      >
        <Clock size={16} className="shrink-0" />
        <span>Bond request sent! Waiting for <strong>{partnerCode}</strong> to accept…</span>
      </motion.div>
    );
    if (status === 'partner_offline') return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-[20px] px-5 py-3"
      >
        <WifiOff size={16} className="shrink-0" />
        <span>Partner is not online yet. Ask them to open the app and try again.</span>
      </motion.div>
    );
    if (status === 'error') return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-[20px] px-5 py-3"
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

        {/* Seed Code Card */}
        <div className="w-full bg-white/80 backdrop-blur-md rounded-[32px] p-6 shadow-sm mb-8 flex flex-col items-center border border-sage-100">
          <p className="text-sage-700 text-sm mb-3">Your Seed Code</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-sage-900 tracking-wider select-all">{user.seedCode}</span>
            <button
              onClick={handleCopy}
              className="p-2.5 text-sage-500 hover:bg-sage-100 rounded-full transition-colors bg-sage-50 active:scale-95"
              aria-label="Copy seed code"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-4 mb-8 px-4">
          <div className="flex-1 h-px bg-sage-200" />
          <span className="text-sage-400 text-xs font-medium tracking-widest uppercase">OR</span>
          <div className="flex-1 h-px bg-sage-200" />
        </div>

        {/* Partner Code Input */}
        <div className="w-full flex flex-col gap-4">
          <p className="text-sage-700 text-center text-sm px-4 mb-2">
            Enter your partner's code to connect your sanctuaries.
          </p>
          <input
            type="text"
            placeholder="e.g. Green-Willow-123"
            value={partnerCode}
            onChange={(e) => { setPartnerCode(e.target.value); setStatus('idle'); }}
            onKeyDown={(e) => e.key === 'Enter' && handleBond()}
            className="w-full bg-white/80 backdrop-blur-md border border-sage-200 rounded-[28px] px-6 py-5 outline-none focus:border-sage-500 focus:bg-white text-center font-mono tracking-wide text-sage-900 shadow-sm transition-all text-base"
          />
          <button
            onClick={handleBond}
            disabled={!partnerCode.trim() || loading}
            className="w-full bg-sage-500 text-white rounded-[28px] px-6 py-5 font-medium disabled:opacity-50 hover:bg-sage-700 transition-all flex justify-center items-center mt-2 shadow-md active:scale-[0.98]"
          >
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Leaf size={24} />
              </motion.div>
            ) : (
              'Connect Sanctuary'
            )}
          </button>

          {/* Status feedback */}
          {renderStatus()}
        </div>
      </motion.div>
    </div>
  );
}
