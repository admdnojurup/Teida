import React, { ReactNode } from 'react';
import { Menu, ChevronDown, User } from 'lucide-react';
import { Link } from './ui/Link';
import { CreditBalance } from './CreditBalance';

interface LayoutProps {
  children: ReactNode;
  onTranslationComplete?: boolean;
}

const Logo = () => (
  <div className="flex items-center">
    <img src="/teida-logo.svg" alt="Teida Logo" className="h-10 mr-2" />
    <span className="text-surface-800 font-bold text-2xl">Vertėjas</span>
  </div>
);

const Layout = ({ children, onTranslationComplete = false }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-surface-100 sticky top-0 z-10">
        <div className="container-guru py-4">
          <div className="flex justify-between items-center">
            <div className="flex-1"></div>
            <div className="flex flex-col items-center">
              <Logo />
            </div>
            <div className="flex-1 flex justify-end">
              <CreditBalance onTranslationComplete={onTranslationComplete} />
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-white border-t border-surface-100 mt-16">
        <div className="container-guru py-10">
          <div className="flex justify-center">
            <div className="flex flex-col items-center">
              <Logo />
              <p className="mt-4 text-surface-600 text-sm text-center">
                Panaikinkite kalbos barjerus su mūsų galingais PDF vertimo įrankiais.
              </p>
            </div>
          </div>
          
          <div className="mt-10 pt-8 border-t border-surface-100 text-center text-surface-500 text-sm">
            © {new Date().getFullYear()} Teida Vertėjas. Visos teisės saugomos.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;