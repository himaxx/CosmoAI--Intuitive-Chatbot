
import React, { useRef, useEffect } from 'react';
import type { ConversationTurn } from '../types';

interface TranscriptProps {
  turns: ConversationTurn[];
}

export const Transcript: React.FC<TranscriptProps> = ({ turns }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  return (
    <div
      ref={scrollRef}
      className="w-full h-full p-4 overflow-y-auto bg-black/30 rounded-lg backdrop-blur-sm border border-white/10"
    >
      <div className="flex flex-col gap-4">
        {turns.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Press Start to begin your journey through the cosmos...</p>
          </div>
        ) : (
          turns.map((turn, index) => (
            <div
              key={index}
              className={`flex flex-col max-w-[80%] p-3 rounded-lg ${
                turn.speaker === 'user'
                  ? 'bg-blue-900/50 self-end'
                  : 'bg-purple-900/50 self-start'
              }`}
            >
              <span className={`text-xs font-bold mb-1 ${
                turn.speaker === 'user' ? 'text-blue-300' : 'text-purple-300'
              }`}>
                {turn.speaker === 'user' ? 'You' : 'Cosmo'}
              </span>
              <p className="text-white text-sm sm:text-base">{turn.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
