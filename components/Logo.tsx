import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Building 1 */}
    <path d="M12 56V24C12 21.7909 13.7909 20 16 20H20C22.2091 20 24 21.7909 24 24V56" stroke="#A7B0B9" strokeWidth="4" strokeLinecap="round"/>
    
    {/* Building 2 (Tallest) */}
    <path d="M28 56V12C28 9.79086 29.7909 8 32 8H36C38.2091 8 40 9.79086 40 12V56" stroke="#00E0C6" strokeWidth="4" strokeLinecap="round"/>
    
    {/* Building 3 */}
    <path d="M44 56V32C44 29.7909 45.7909 28 48 28H52C54.2091 28 56 29.7909 56 32V56" stroke="#77C66E" strokeWidth="4" strokeLinecap="round"/>
    
    {/* Connection Arc */}
    <path d="M18 20C18 14 24 6 34 8" stroke="#F48FB1" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2"/>
    <path d="M40 12C46 12 50 20 50 28" stroke="#F48FB1" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2"/>
    
    {/* Base */}
    <path d="M8 56H56" stroke="#556270" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

export default Logo;