
import React from 'react';

interface IconButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  text: string;
}

export const IconButton: React.FC<IconButtonProps> = ({ onClick, children, disabled = false, text }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className="
          w-16 h-16 sm:w-20 sm:h-20
          rounded-full 
          flex items-center justify-center 
          bg-white/10
          border-2 border-white/20
          hover:bg-white/20 hover:border-white/30
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black
          transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
          backdrop-blur-sm
        "
        aria-label={text}
      >
        {children}
      </button>
      <span className="text-xs text-gray-400 tracking-wider">{text}</span>
    </div>
  );
};
