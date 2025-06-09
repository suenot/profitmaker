import React from 'react';

interface PlusCircleIconProps {
  size?: number;
  className?: string;
}

const PlusCircleIcon: React.FC<PlusCircleIconProps> = ({ 
  size = 14, 
  className = '' 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 16 16" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14ZM9 11V9H11C11.3684 9 12 8.55228 12 8C12 7.44771 11.3684 7 11 7H9V5C9 4.63163 8.55229 4 8 4C7.44772 4 7 4.63163 7 5V7H5C4.63163 7 4 7.44771 4 8C4 8.55228 4.63163 9 5 9H7V11C7 11.3684 7.44772 12 8 12C8.55229 12 9 11.3684 9 11Z" 
        fill="currentColor"
      />
    </svg>
  );
};

export default PlusCircleIcon; 