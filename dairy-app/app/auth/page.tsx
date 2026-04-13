'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.username, formData.password);
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        await register(formData.username, formData.email, formData.password);
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(150deg, #7c4a2d 0%, #c2714f 45%, #e8a87c 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ruled-paper background lines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 39px, rgba(255,255,255,.06) 39px, rgba(255,255,255,.06) 40px)',
      }} />

      <div style={{
        background: '#fffdf9',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(60,20,0,.35)',
        width: '100%',
        maxWidth: '420px',
        padding: '36px 36px 28px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #7c4a2d, #c2714f)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', margin: '0 auto 12px',
            boxShadow: '0 4px 16px rgba(124,74,45,.4)',
          }}>
            <BookOpen size={32} />
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.7rem', fontWeight: 700, color: '#3d2b1f', marginBottom: '4px' }}>
            My Diary
          </h1>
          <p style={{ fontSize: '.85rem', color: '#8b6f5e', fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
            Your personal space to reflect &amp; remember
          </p>
        </div>

        <div style={{ height: '1px', background: '#e8d5b7', margin: '0 -36px 20px' }} />

        <div style={{ marginBottom: '22px' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.2rem', fontWeight: 700, color: '#3d2b1f', marginBottom: '4px' }}>
            {isLogin ? 'Welcome back' : 'Start your journey'}
          </h2>
          <p style={{ fontSize: '.85rem', color: '#8b6f5e', fontFamily: 'Inter, sans-serif' }}>
            {isLogin ? 'Sign in to open your diary' : 'Create an account to begin writing'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#8b6f5e', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'Inter, sans-serif' }}>
                Email
              </label>
              <input
                name="email" type="email" placeholder="your@email.com"
                value={formData.email} onChange={handleChange} required={!isLogin}
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#8b6f5e', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'Inter, sans-serif' }}>
              Username
            </label>
            <input
              name="username" type="text" placeholder="your username"
              value={formData.username} onChange={handleChange} required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#8b6f5e', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'Inter, sans-serif' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                value={formData.password} onChange={handleChange} required
                style={{ ...inputStyle, paddingRight: '40px' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#b89880', display: 'flex', alignItems: 'center', padding: '4px' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#8b6f5e', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'Inter, sans-serif' }}>
                Confirm Password
              </label>
              <input
                name="confirmPassword" type="password" placeholder="••••••••"
                value={formData.confirmPassword} onChange={handleChange} required={!isLogin}
                style={inputStyle}
              />
            </div>
          )}

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '.85rem', color: '#b91c1c', fontFamily: 'Inter, sans-serif' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px',
            background: loading ? '#c2a090' : 'linear-gradient(135deg, #7c4a2d, #c2714f)',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontFamily: 'Georgia, serif', fontSize: '1rem', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(124,74,45,.35)',
            marginTop: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}>
            {loading ? (
              <>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                {isLogin ? 'Opening diary…' : 'Creating account…'}
              </>
            ) : (
              isLogin ? 'Open My Diary' : 'Create Account'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '.88rem', color: '#8b6f5e', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
          <button onClick={switchMode} style={{ background: 'none', border: 'none', color: '#c2714f', fontWeight: 600, cursor: 'pointer', fontSize: '.88rem', fontFamily: 'Inter, sans-serif', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid #e8d5b7',
  borderRadius: '8px',
  background: '#fef9f4',
  color: '#3d2b1f',
  fontFamily: 'Inter, sans-serif',
  fontSize: '.95rem',
  outline: 'none',
};
