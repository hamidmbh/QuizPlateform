import { GraduationCap, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer id="contact" className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-display font-bold text-xl mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span>QuizMaster</span>
            </div>
            <p className="text-background/70 max-w-md">
              La plateforme de quiz interactive pour les enseignants et les étudiants. 
              Créez, partagez et évaluez en toute simplicité.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Liens rapides</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-background/70 hover:text-background transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <a href="#features" className="text-background/70 hover:text-background transition-colors">
                  Fonctionnalités
                </a>
              </li>
              <li>
                <Link to="/login" className="text-background/70 hover:text-background transition-colors">
                  Connexion
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-background/70">
                <Mail className="w-4 h-4" />
                <span>contact@quizmaster.com</span>
              </li>
              <li className="flex items-center gap-2 text-background/70">
                <Phone className="w-4 h-4" />
                <span>+33 1 23 45 67 89</span>
              </li>
              <li className="flex items-center gap-2 text-background/70">
                <MapPin className="w-4 h-4" />
                <span>Paris, France</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-background/20 text-center text-background/50">
          <p>© 2024 QuizMaster. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
