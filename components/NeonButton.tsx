import React from 'react';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'cyan' | 'purple' | 'danger';
  glow?: boolean;
}

export const NeonButton: React.FC<NeonButtonProps> = ({ 
  children, 
  variant = 'cyan', 
  glow = false, 
  className = '', 
  ...props 
}) => {
  let baseClasses = "relative px-6 py-3 font-tech font-bold uppercase tracking-wider transition-all duration-300 border focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  let colorClasses = "";
  if (variant === 'cyan') {
    colorClasses = "text-neon-cyan border-neon-cyan hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.5)]";
    if (glow) colorClasses += " shadow-[0_0_15px_rgba(0,240,255,0.4)] bg-neon-cyan/5";
  } else if (variant === 'purple') {
    colorClasses = "text-neon-purple border-neon-purple hover:bg-neon-purple/10 hover:shadow-[0_0_15px_rgba(188,19,254,0.5)]";
    if (glow) colorClasses += " shadow-[0_0_15px_rgba(188,19,254,0.4)] bg-neon-purple/5";
  } else if (variant === 'danger') {
    colorClasses = "text-red-500 border-red-500 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]";
  }

  return (
    <button className={`${baseClasses} ${colorClasses} ${className}`} {...props}>
      {children}
    </button>
  );
};