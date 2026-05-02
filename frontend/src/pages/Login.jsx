import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Activity } from 'lucide-react';

export default function Login() {
  // 1. React State setup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 2. Form Submission Handler
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevents the browser from reloading the page
    setError('');
    setLoading(true);

    try {
      // 3. Make the API Call to our Go Backend
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      // 4. Store the JWT Token in Local Storage
      // This allows the user to stay logged in even if they refresh the page!
      localStorage.setItem('authToken', data.authToken);
      
      // 5. Navigate to the dashboard (a stub route for now)
      navigate('/dashboard');
      
    } catch (err) {
      // Catch any errors and display them in the UI
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <Activity size={48} color="var(--primary)" style={{margin: '0 auto 1rem'}} />
          <h1>Welcome Back</h1>
          <p>Enter your credentials to access your dashboard</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              {/* Data Binding: the input is tied to the 'email' state */}
              <input 
                type="email" 
                className="form-input" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Authenticating...' : (
              <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                Sign In <ArrowRight size={20} />
              </span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup" className="auth-link">Create one now</Link>
        </div>
      </div>
    </div>
  );
}
