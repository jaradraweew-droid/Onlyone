import { motion } from 'motion/react';
import { Leaf } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LeafConfig } from '../types';

export default function LeafAnimation() {
  const [leaves, setLeaves] = useState<LeafConfig[]>([]);

  useEffect(() => {
    const newLeaves: LeafConfig[] = Array.from({ length: 12 }).map((_, i) => {
      const x = Math.random() * 100;
      const direction = Math.random() > 0.5 ? 1 : -1;
      return {
        id: i,
        x,
        finalX: x + Math.random() * 30 * direction,
        delay: Math.random() * 1.5,
        duration: 3 + Math.random() * 2,
        scale: 0.4 + Math.random() * 0.6,
        rotation: -45 + Math.random() * 90,
        direction: direction as 1 | -1,
      };
    });
    setLeaves(newLeaves);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {leaves.map((leaf) => (
        <motion.div
          key={leaf.id}
          initial={{ top: '-10%', left: `${leaf.x}%`, rotate: leaf.rotation, opacity: 0 }}
          animate={{
            top: '110%',
            left: `${leaf.finalX}%`,
            rotate: leaf.rotation + 180 * leaf.direction,
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: leaf.duration,
            delay: leaf.delay,
            ease: 'linear',
          }}
          className="absolute text-sage-500 drop-shadow-sm mix-blend-multiply"
          style={{ transform: `scale(${leaf.scale})` }}
        >
          <Leaf size={36} strokeWidth={1} fill="currentColor" className="opacity-80" />
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-sage-500/5 backdrop-blur-[2px]"
      />
    </div>
  );
}
