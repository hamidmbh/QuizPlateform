import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '@/services/api';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, LogOut, User, ArrowLeft, Save, Loader2 } from 'lucide-react';

export function AdminProfile() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  if (!user || user.role !== 'TEACHER') {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password && password !== passwordConfirmation) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (password && password.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: { name: string; email: string; password?: string; password_confirmation?: string } = {
        name: name.trim(),
        email: email.trim(),
      };
      if (password.trim()) {
        payload.password = password;
        payload.password_confirmation = passwordConfirmation;
      }
      await authApi.updateProfile(payload);
      await refreshUser();
      setPassword('');
      setPasswordConfirmation('');
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Erreur lors de la mise à jour du profil.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 font-display font-bold text-xl text-foreground hover:opacity-90"
            >
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-gradient">QuizMaster</span>
              <span className="text-muted-foreground text-sm font-normal ml-2">Admin</span>
            </Link>
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
              <ArrowLeft className="w-4 h-4" />
              Tableau de bord
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground hidden sm:inline">
              <span className="text-foreground font-medium">{user.name}</span>
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-xl mx-auto"
        >
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Mon profil</h1>
            <p className="text-muted-foreground">Modifiez vos informations personnelles</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations du compte
              </CardTitle>
              <CardDescription>
                Mettez à jour votre nom, votre email ou votre mot de passe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {message && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      message.type === 'success'
                        ? 'bg-success/20 text-success'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="profile-name">Nom</Label>
                  <Input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    required
                    className="max-w-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    className="max-w-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-password">Nouveau mot de passe (optionnel)</Label>
                  <Input
                    id="profile-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Laisser vide pour ne pas changer"
                    className="max-w-md"
                    autoComplete="new-password"
                  />
                </div>

                {password && (
                  <div className="space-y-2">
                    <Label htmlFor="profile-password-confirm">Confirmer le mot de passe</Label>
                    <Input
                      id="profile-password-confirm"
                      type="password"
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      placeholder="Confirmer le mot de passe"
                      className="max-w-md"
                      autoComplete="new-password"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="gradient-primary text-primary-foreground"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                  <Link to="/dashboard">
                    <Button type="button" variant="outline">
                      Annuler
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
