import { motion } from 'motion/react';
import { PawPrint, Heart, Check, XIcon } from 'lucide-react';
import type { User, Pet, PetStatus, PetActionType } from '../types';
import PetDisplay from './PetDisplay';
import PetStatusBars from './PetStatusBars';
import PetFeedButton from './PetFeedButton';

// ─── Named Constants ────────────────────────────────────────────────

const HERO_SPRING_STIFFNESS = 200;
const HERO_SPRING_DAMPING = 20;
const HERO_INITIAL_Y = 30;
const STAGGER_DELAY = 0.1;
const MAX_RECENT_ACTIONS = 10;

/** Action type to icon emoji mapping. */
const ACTION_EMOJI: Record<PetActionType, string> = {
  feed: '🍖',
  love: '❤️',
  play: '🎾',
};

// ─── Props ──────────────────────────────────────────────────────────

interface PetScreenProps {
  user: User;
  pet: Pet | null;
  petStatus: PetStatus | null;
  onSetupPet: () => void;
  onPetAction: (type: PetActionType) => void;
  lastUpdateTime: number;
  pendingProposal?: { pet: Pet; proposerName: string } | null;
  onAcceptProposal: () => void;
  onRejectProposal: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatActionTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ─── Sub-components ─────────────────────────────────────────────────

function AdoptHero({ onSetupPet }: { onSetupPet: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: HERO_INITIAL_Y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: HERO_SPRING_STIFFNESS,
        damping: HERO_SPRING_DAMPING,
      }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
    >
      <div className="w-28 h-28 sm:w-32 sm:h-32 bg-amber-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <PawPrint size={48} className="text-amber-400" strokeWidth={1.5} />
      </div>

      <h2 className="font-serif text-2xl sm:text-3xl text-sage-900 mb-3">
        🐾 Adopt a Pet Together
      </h2>
      <p className="text-sage-500 text-sm sm:text-base max-w-xs mb-8 leading-relaxed">
        Raise a virtual pet with your partner! Feed it, play with it, and watch it grow together.
      </p>

      <motion.button
        type="button"
        onClick={onSetupPet}
        aria-label="Adopt a pet"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="bg-sage-500 text-white px-8 py-3.5 rounded-2xl font-medium text-sm shadow-md hover:bg-sage-600 transition-colors flex items-center gap-2"
      >
        <Heart size={18} />
        Start Adoption
      </motion.button>
    </motion.div>
  );
}

function ProposalCard({
  proposal,
  onAccept,
  onReject,
}: {
  proposal: { pet: Pet; proposerName: string };
  onAccept: () => void;
  onReject: () => void;
}) {
  const petTypeLabel = proposal.pet.type === 'cat' ? '🐱 Cat' : '🐶 Dog';

  return (
    <motion.div
      initial={{ opacity: 0, y: HERO_INITIAL_Y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: HERO_SPRING_STIFFNESS,
        damping: HERO_SPRING_DAMPING,
      }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
    >
      <div className="bg-white rounded-3xl shadow-md border border-sage-100 p-6 sm:p-8 w-full max-w-sm">
        <h2 className="font-serif text-xl sm:text-2xl text-sage-900 mb-2">
          🎉 Pet Proposal!
        </h2>
        <p className="text-sage-500 text-sm mb-6">
          <span className="font-semibold text-sage-700">{proposal.proposerName}</span> wants to adopt a pet together!
        </p>

        <div className="bg-amber-50 rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            {petTypeLabel}
          </p>
          <p className="text-lg font-semibold text-sage-900">
            {proposal.pet.name}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onReject}
            aria-label="Decline pet proposal"
            className="flex-1 py-3 rounded-2xl font-medium text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <XIcon size={16} />
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            aria-label="Accept pet proposal"
            className="flex-1 py-3 rounded-2xl font-medium text-sm bg-sage-500 text-white hover:bg-sage-600 transition-colors flex items-center justify-center gap-1.5"
          >
            <Check size={16} />
            Accept
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function PetScreen({
  user,
  pet,
  petStatus,
  onSetupPet,
  onPetAction,
  lastUpdateTime,
  pendingProposal,
  onAcceptProposal,
  onRejectProposal,
}: PetScreenProps) {
  // No pet and no proposal → adoption hero
  if (!pet && !pendingProposal) {
    return (
      <div className="flex flex-col h-full bg-mint overflow-y-auto no-scrollbar lg:desktop-scrollbar">
        <AdoptHero onSetupPet={onSetupPet} />
      </div>
    );
  }

  // Pending proposal → proposal card
  if (!pet && pendingProposal) {
    return (
      <div className="flex flex-col h-full bg-mint overflow-y-auto no-scrollbar lg:desktop-scrollbar">
        <ProposalCard
          proposal={pendingProposal}
          onAccept={onAcceptProposal}
          onReject={onRejectProposal}
        />
      </div>
    );
  }

  // Pet exists → full pet view
  if (!pet || !petStatus) return null;

  const recentActions = [...petStatus.feedingsToday]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_RECENT_ACTIONS);

  return (
    <div className="flex flex-col h-full bg-mint overflow-y-auto px-4 md:px-6 lg:px-8 py-6 pb-32 no-scrollbar lg:desktop-scrollbar">
      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* Pet display */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          aria-label={`${pet.name} pet display`}
        >
          <PetDisplay
            petType={pet.type}
            birthday={pet.birthday}
            hunger={petStatus.hunger}
            love={petStatus.love}
            petName={pet.name}
          />
        </motion.section>

        {/* Status bars */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGGER_DELAY }}
          className="bg-white rounded-[28px] md:rounded-[36px] p-5 md:p-6 shadow-sm border border-sage-100"
          aria-label="Pet status"
        >
          <h3 className="text-[11px] font-bold text-sage-400 uppercase tracking-widest mb-4">
            💖 Status
          </h3>
          <PetStatusBars status={petStatus} lastUpdateTime={lastUpdateTime} />
        </motion.section>

        {/* Action buttons */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGGER_DELAY * 2 }}
          className="bg-white rounded-[28px] md:rounded-[36px] p-5 md:p-6 shadow-sm border border-sage-100"
          aria-label="Pet actions"
        >
          <h3 className="text-[11px] font-bold text-sage-400 uppercase tracking-widest mb-4">
            🎮 Actions
          </h3>
          <PetFeedButton
            onFeed={() => onPetAction('feed')}
            onLove={() => onPetAction('love')}
            onPlay={() => onPetAction('play')}
            feedingsToday={petStatus.feedingsToday}
            energy={petStatus.energy}
          />
        </motion.section>

        {/* Activity log */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGGER_DELAY * 3 }}
          className="bg-white rounded-[28px] md:rounded-[36px] p-5 md:p-6 shadow-sm border border-sage-100"
          aria-label="Recent activity log"
        >
          <h3 className="text-[11px] font-bold text-sage-400 uppercase tracking-widest mb-4">
            📋 Recent Activity
          </h3>

          {recentActions.length === 0 ? (
            <p className="text-sm text-sage-400 text-center py-4">
              No actions yet today. Give {pet.name} some love! 💕
            </p>
          ) : (
            <ul className="space-y-2.5">
              {recentActions.map((action) => {
                const isCurrentUser = action.userId === user.id;
                const emoji = ACTION_EMOJI[action.type];
                return (
                  <li
                    key={action.id}
                    className="flex items-center gap-3 bg-mint/50 rounded-xl px-3.5 py-2.5"
                  >
                    <span className="text-base flex-shrink-0" aria-hidden="true">
                      {emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-sage-700">
                        {isCurrentUser ? 'You' : action.userName}
                      </span>
                      <span className="text-xs text-sage-500">
                        {' '}
                        {action.type === 'feed' && `fed ${pet.name}`}
                        {action.type === 'love' && `gave ${pet.name} love`}
                        {action.type === 'play' && `played with ${pet.name}`}
                      </span>
                    </div>
                    <span className="text-[10px] text-sage-400 tabular-nums flex-shrink-0">
                      {formatActionTime(action.timestamp)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>
      </div>
    </div>
  );
}
