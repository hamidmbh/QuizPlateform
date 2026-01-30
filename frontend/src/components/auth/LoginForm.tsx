import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, User, BookOpen, AlertCircle } from 'lucide-react';
import { demoCredentials } from '@/data/mockData';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Veuillez entrer votre email');
      return;
    }
    if (!password.trim()) {
      setError('Veuillez entrer votre mot de passe');
      return;
    }

    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);

    if (success) {
      navigate('/dashboard');
    } else {
      setError('Email ou mot de passe incorrect');
    }
  };

  const fillDemoCredentials = (type: 'student' | 'admin') => {
    setEmail(demoCredentials[type].email);
    setPassword(demoCredentials[type].password);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-2xl mb-2">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
              <GraduationCap className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-gradient">QuizMaster</span>
          </Link>
          <p className="text-muted-foreground">Connectez-vous pour continuer</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="font-display text-2xl text-center">Connexion</CardTitle>
            <CardDescription className="text-center">
              Choisissez votre type de compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Étudiant
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Professeur
                </TabsTrigger>
              </TabsList>

              <TabsContent value="student">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-primary-foreground shadow-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Connexion...' : 'Se connecter'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('student')}
                    className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Utiliser les identifiants de démo
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-admin">Email</Label>
                    <Input
                      id="email-admin"
                      type="email"
                      placeholder="prof@school.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-admin">Mot de passe</Label>
                    <Input
                      id="password-admin"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-primary-foreground shadow-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Connexion...' : 'Se connecter'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('admin')}
                    className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Utiliser les identifiants de démo
                  </button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/" className="hover:text-primary transition-colors">
            ← Retour à l'accueil
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
