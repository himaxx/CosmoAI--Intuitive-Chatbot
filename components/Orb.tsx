import React from 'react';

interface OrbProps {
  state: 'idle' | 'listening' | 'speaking';
  volume?: number;
}

export const Orb: React.FC<OrbProps> = ({ state, volume = 0 }) => {
  const baseClasses = "relative w-48 h-48 sm:w-64 sm:h-64 rounded-full transition-all duration-500 ease-in-out";
  
  const stateClasses = {
    idle: "bg-gradient-to-br from-indigo-900 to-purple-900 shadow-[0_0_20px_5px] shadow-purple-900/50 animate-pulse-slow",
    listening: "bg-gradient-to-br from-blue-700 to-cyan-700", // Static class, dynamic styles below
    speaking: "bg-gradient-to-br from-pink-700 to-red-700 shadow-[0_0_40px_10px] shadow-red-500/60 animate-breathing-fast",
  };
  
  const coreClasses = "absolute inset-[10%] rounded-full opacity-50";
  const coreStateClasses = {
    idle: "bg-gradient-to-tl from-indigo-700 to-purple-700",
    listening: "bg-gradient-to-tl from-blue-500 to-cyan-500",
    speaking: "bg-gradient-to-tl from-pink-500 to-red-500",
  };

  const listeningStyle = state === 'listening' ? {
    transform: `scale(${1 + volume * 0.05})`,
    boxShadow: `0 0 ${40 + volume * 20}px 10px rgba(0, 255, 255, ${Math.min(1, 0.5 + volume * 0.5)})`
  } : {};

  return (
    <div 
      className={`${baseClasses} ${stateClasses[state]} ${state === 'speaking' ? 'speaking-effect' : ''}`}
      style={listeningStyle}
    >
      <div className={`${coreClasses} ${coreStateClasses[state]}`}></div>
      <style>{`
        @keyframes pulse-slow {
          50% { opacity: 0.7; transform: scale(0.98); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes breathing {
          0%, 100% { transform: scale(1); box-shadow: 0 0 40px 10px var(--shadow-color); }
          50% { transform: scale(1.05); box-shadow: 0 0 50px 15px var(--shadow-color); }
        }
        .animate-breathing-fast {
          --shadow-color: rgba(255, 0, 0, 0.6);
          animation: breathing 1.5s ease-in-out infinite;
        }
        .speaking-effect::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid rgba(255, 105, 180, 0.5);
          animation: ripple 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite;
        }
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};