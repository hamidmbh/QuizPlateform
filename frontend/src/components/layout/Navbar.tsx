import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = [
  { name: 'Accueil', href: '/' },
  { name: 'Fonctionnalités', href: '/#features' },
  { name: 'Contact', href: '/#contact' },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const scrollToSection = (href: string) => {
    if (href.startsWith('/#')) {
      const id = href.replace('/#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-gradient">QuizMaster</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => scrollToSection(link.href)}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {link.name}
              </button>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link to="/login">
              <Button className="gradient-primary text-primary-foreground shadow-primary hover:opacity-90 transition-opacity">
                Commencer
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href)}
                  className="block w-full text-left text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
                >
                  {link.name}
                </button>
              ))}
              <div className="pt-4 border-t border-border space-y-2">
                <Link to="/login" className="block">
                  <Button variant="ghost" className="w-full">Connexion</Button>
                </Link>
                <Link to="/login" className="block">
                  <Button className="w-full gradient-primary text-primary-foreground">
                    Commencer
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
