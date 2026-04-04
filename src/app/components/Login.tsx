import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Heart, User, Lock, AlertCircle, Loader2 } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      });

      if (res.ok) {
        const user = await res.json();
        login(user);
        navigate('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Credenciales inválidas');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-semibold">Nueva Esperanza</h1>
              <p className="text-blue-200 text-sm">Centro Comunitario de Salud</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-white">
          <h2 className="text-4xl font-semibold mb-4 leading-tight">
            Sistema de Gestión<br />Médica Integral
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed max-w-md">
            Plataforma completa para la administración de consultas, expedientes clínicos y seguimiento de pacientes.
          </p>
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="lg:hidden flex justify-center mb-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-semibold text-gray-900 mb-2">Iniciar Sesión</h2>
                <p className="text-gray-500">Ingresa tus credenciales para acceder</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="usuario">Usuario</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="usuario"
                      placeholder="nombre_usuario"
                      className="pl-10"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700 transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Entrar al Sistema'
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-500">
                <p>Centro Comunitario Nueva Esperanza</p>
                <p className="mt-1">Sonoyta, Sonora • Puerto Peñasco</p>

                <div className="mt-4 p-3 bg-blue-50/50 rounded-lg text-blue-800 text-[10px] text-left">
                  <strong>Pista para pruebas:</strong><br />
                  recepcion / 123<br />
                  medico / 123<br />
                  admin / 123<br />
                  triage / 123
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
