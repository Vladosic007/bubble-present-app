'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function BubblikBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Базовый фон рисуем сразу, бабликов — после маунта (чтобы не было ошибок гидрации)
  if (!mounted) {
    return <div className="fixed inset-0 z-0 bg-[#F2F2F7]" />;
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#F2F2F7]">
      {[...Array(14)].map((_, i) => {
        const size = Math.random() * 30 + 15;
        return (
          <motion.div
            key={i}
            className="absolute bottom-[-60px]"
            style={{ width: size, height: size, left: `${Math.random() * 100}%` }}
            animate={{
              y: ['0vh', '-120vh'],
              x: [0, Math.random() * 60 - 30, 0],
              rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'linear',
            }}
          >
            <Image draggable={false} src="/images/small-bubblik.png" alt="" fill className="object-contain opacity-30" />
          </motion.div>
        );
      })}
    </div>
  );
}
