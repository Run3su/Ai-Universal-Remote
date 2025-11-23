import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'control';
  className?: string;
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  active = false,
  ...props 
}) => {
  // 3D Push Button Styles
  // shadow-[0_4px_0_0_rgb(...)] creates the physical depth
  // active:translate-y-[4px] pushes the button "down"
  // active:shadow-none hides the shadow when pressed
  
  const baseStyles = "relative transition-all duration-75 active:translate-y-[4px] active:shadow-none font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation";
  
  // Default rounding if not specified
  const roundedClass = className.includes('rounded') ? '' : 'rounded-xl';

  const variants = {
    primary: "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_4px_0_0_#1e3a8a] border-t border-blue-400",
    secondary: "bg-gradient-to-b from-gray-700 to-gray-800 text-gray-200 shadow-[0_4px_0_0_#111827] border-t border-gray-600 hover:brightness-110",
    danger: "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_4px_0_0_#7f1d1d] border-t border-red-400 hover:brightness-110",
    ghost: "bg-transparent hover:bg-white/5 text-gray-400 active:translate-y-0 active:shadow-none shadow-none", // Ghost stays flat
    control: `aspect-square rounded-full border-t border-white/10 hover:brightness-110 ${active ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_4px_0_0_#1e3a8a]' : 'bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-[0_4px_0_0_#111827]'}`
  };

  return (
    <button 
      className={`${baseStyles} ${roundedClass} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};