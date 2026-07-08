import { useState, useEffect } from 'react';
import type { User } from '../types';
import { Leaf } from 'lucide-react';
import { motion } from 'motion/react';
import { generateSeedCode, generateId } from '../utils';

interface Props {
  onLogin: (user: User) => void;
}

export default function WelcomeScreen({ onLogin }: Props) {
  const [name, setName] = useState('');
  const [step, setStep] = useState<'name' | 'code'>('name');
  const [generatedCode, setGeneratedCode] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const remembered = localStorage.getItem('monogreen_identity');
    if (remembered) {
      try {
        const parsed = JSON.parse(remembered);
        if (parsed.name && parsed.seedCode) {
          setName(parsed.name);
          setGeneratedCode(parsed.seedCode);
          if (parsed.id) setUserId(parsed.id);
          setStep('code');
        }
      } catch { /* ignore corrupt storage */ }
    }
  }, []);

  const handleCreate = () => {
    if (!name.trim()) return;
    setGeneratedCode(generateSeedCode());
    setUserId(generateId());
    setStep('code');
  };

  const handleStart = () => {
    const newUser: User = {
      id: userId || generateId(),
      name,
      seedCode: generatedCode,
      mood: 'good',
    };
    onLogin(newUser);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:px-12 bg-mint text-sage-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center w-full max-w-md"
      >
        {/* Logo */}
        <div className="w-20 h-20 md:w-24 md:h-24 bg-sage-500 rounded-full flex items-center justify-center mb-6 text-white shadow-lg">
          <Leaf size={40} strokeWidth={1.5} />
        </div>

        <h1 className="text-4xl md:text-5xl font-serif mb-2">MonoGreen</h1>
        <p className="text-sage-700 text-center mb-12 text-sm md:text-base">A digital sanctuary for two.</p>

        {step === 'name' ? (
          <div className="w-full flex flex-col gap-4">
            <label htmlFor="welcome-name-input" className="sr-only">Your name</label>
            <input
              id="welcome-name-input"
              type="text"
              placeholder="What is your name?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full bg-white/50 border border-sage-300 rounded-[24px] px-6 py-4 outline-none focus:border-sage-500 focus:bg-white transition-colors text-base"
            />
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full bg-sage-500 text-white rounded-[24px] px-6 py-4 font-medium disabled:opacity-50 transition-all hover:bg-sage-700 active:scale-[0.98]"
            >
              Begin Journey
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-6 items-center">
            <p className="text-center text-sage-700">Your unique Secret Seed Code is</p>
            <div className="bg-white px-6 py-4 rounded-[24px] border-2 border-sage-500 text-xl font-mono text-sage-900 font-bold tracking-wider w-full text-center select-all">
              {generatedCode}
            </div>
            <p className="text-center text-sm text-sage-700 px-4">
              Share this code with your partner to bond your sanctuary.
            </p>
            <button
              onClick={handleStart}
              className="w-full bg-sage-500 text-white rounded-[24px] px-6 py-4 font-medium transition-all mt-4 hover:bg-sage-700 active:scale-[0.98]"
            >
              Enter Sanctuary
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
