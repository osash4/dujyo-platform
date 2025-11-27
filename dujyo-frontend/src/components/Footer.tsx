import React from 'react';
import Logo from './common/Logo';

export const Footer = () => {
  return (
    <footer className="bg-[#375f69] py-5 text-center text-[#8c8c9c] relative z-10">
      <div className="flex flex-col items-center justify-center gap-3 mb-4">
        <div className="flex items-center justify-center gap-2">
          <Logo size="sm" variant="icon" showText={false} />
          <Logo size="sm" variant="text" />
        </div>
        <p className="text-base">&copy; {new Date().getFullYear()} DUJYO. All rights reserved.</p>
      </div>
    </footer>
  );
};
