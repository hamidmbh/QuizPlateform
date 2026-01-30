import { motion } from 'framer-motion';
import { 
  Clock, 
  Users, 
  BarChart3, 
  Shield, 
  BookOpen, 
  Zap 
} from 'lucide-react';

const features = [
  {
    icon: Clock,
    title: 'Quiz chronométrés',
    description: 'Définissez un temps limite pour chaque quiz et mesurez la rapidité de vos étudiants.',
  },
  {
    icon: Users,
    title: 'Gestion des classes',
    description: 'Organisez vos étudiants par classe et assignez des quiz spécifiques à chaque groupe.',
  },
  {
    icon: BarChart3,
    title: 'Suivi des résultats',
    description: 'Visualisez les réponses de chaque étudiant et analysez leurs performances.',
  },
  {
    icon: Shield,
    title: 'Accès sécurisé',
    description: 'Les étudiants se connectent avec des identifiants fournis par le professeur.',
  },
  {
    icon: BookOpen,
    title: 'QCM personnalisés',
    description: 'Créez des questions avec 3 à 5 options et personnalisez chaque quiz.',
  },
  {
    icon: Zap,
    title: 'Interface intuitive',
    description: 'Une expérience utilisateur fluide pour les professeurs comme pour les étudiants.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Fonctionnalités <span className="text-gradient">puissantes</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour créer et gérer des quiz efficacement.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group bg-card rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-border"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
