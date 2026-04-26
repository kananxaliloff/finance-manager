import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Target, TrendingUp, Plus, LogOut, Loader2, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('AZN');

  // Form States
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('AZN');

  const navigate = useNavigate();

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const res = await fetch(`http://localhost:8080/api/v1/finance/dashboard?baseCurrency=${baseCurrency}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setDashboardData(data);
    } catch (err) {
      setError(err.message);
      if (err.message.includes('token') || err.message.includes('Unauthorized')) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [baseCurrency]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleCreate = async (e, type) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const endpoint = type === 'account' ? '/api/v1/finance/accounts' : '/api/v1/finance/targets';
      const bodyPayload = type === 'account' 
        ? { name: formName, balance: parseFloat(formAmount), currency: formCurrency }
        : { name: formName, assignedAmount: parseFloat(formAmount), currency: formCurrency };

      const res = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Reset forms and refresh data
      setFormName('');
      setFormAmount('');
      setShowAccountForm(false);
      setShowTargetForm(false);
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && !dashboardData) {
    return <div className="auth-container"><Loader2 className="animate-spin" size={48} color="var(--primary)" /></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Finance Overview</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={baseCurrency} 
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="form-input"
            style={{ width: '120px', padding: '0.5rem 1rem' }}
          >
            <option value="AZN">AZN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <button onClick={handleLogout} className="btn-primary" style={{ marginTop: 0, padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)' }}>
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Main Metrics Cards */}
      {dashboardData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          
          <div className="auth-card" style={{ padding: '2rem', margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
              <Wallet size={24} color="#3b82f6" /> <h3>Actual Money</h3>
            </div>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{dashboardData.totalActualMoney.toFixed(2)} <span style={{fontSize:'1.2rem', color:'var(--text-muted)'}}>{baseCurrency}</span></h2>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total balance across all accounts</p>
          </div>

          <div className="auth-card" style={{ padding: '2rem', margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
              <Target size={24} color="#ef4444" /> <h3>Assigned Targets</h3>
            </div>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{dashboardData.totalAssignedTargets.toFixed(2)} <span style={{fontSize:'1.2rem', color:'var(--text-muted)'}}>{baseCurrency}</span></h2>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Money locked for savings/obligations</p>
          </div>

          <div className="auth-card" style={{ padding: '2rem', margin: 0, background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.2), rgba(30, 41, 59, 0.7))', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
              <TrendingUp size={24} color="#10b981" /> <h3>Available Money</h3>
            </div>
            <h2 style={{ fontSize: '3rem', margin: 0, color: '#10b981' }}>{dashboardData.availableMoney.toFixed(2)} <span style={{fontSize:'1.2rem', color:'var(--text-muted)'}}>{baseCurrency}</span></h2>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>The formula: Actual - Assigned</p>
          </div>
          
        </div>
      )}

      {/* Lists & Creation Forms */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Accounts Section */}
        <div className="auth-card" style={{ maxWidth: '100%', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Your Accounts</h2>
            <button onClick={() => setShowAccountForm(!showAccountForm)} className="btn-primary" style={{ width: 'auto', margin: 0, padding: '0.5rem', borderRadius: '50%' }}>
              <Plus size={20} />
            </button>
          </div>
          
          {showAccountForm && (
            <form onSubmit={(e) => handleCreate(e, 'account')} style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input type="text" className="form-input" placeholder="Account Name" value={formName} onChange={(e)=>setFormName(e.target.value)} required style={{ paddingLeft: '1rem' }} />
                <input type="number" step="0.01" className="form-input" placeholder="Balance" value={formAmount} onChange={(e)=>setFormAmount(e.target.value)} required style={{ paddingLeft: '1rem' }} />
                <select className="form-input" value={formCurrency} onChange={(e)=>setFormCurrency(e.target.value)} style={{ paddingLeft: '1rem', width: '100px' }}>
                  <option value="AZN">AZN</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ margin: 0, padding: '0.5rem' }}>Add Account</button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dashboardData?.accounts?.length === 0 && <p style={{color: 'var(--text-muted)'}}>No accounts added yet.</p>}
            {dashboardData?.accounts?.map(acc => (
              <div key={acc.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <div style={{ fontWeight: '500' }}>{acc.Name}</div>
                <div style={{ color: 'var(--text-muted)' }}>{acc.Balance.toFixed(2)} {acc.Currency}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Targets Section */}
        <div className="auth-card" style={{ maxWidth: '100%', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Savings Targets</h2>
            <button onClick={() => setShowTargetForm(!showTargetForm)} className="btn-primary" style={{ width: 'auto', margin: 0, padding: '0.5rem', borderRadius: '50%', background: '#ef4444' }}>
              <Plus size={20} />
            </button>
          </div>
          
          {showTargetForm && (
            <form onSubmit={(e) => handleCreate(e, 'target')} style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input type="text" className="form-input" placeholder="Target Name" value={formName} onChange={(e)=>setFormName(e.target.value)} required style={{ paddingLeft: '1rem' }} />
                <input type="number" step="0.01" className="form-input" placeholder="Amount" value={formAmount} onChange={(e)=>setFormAmount(e.target.value)} required style={{ paddingLeft: '1rem' }} />
                <select className="form-input" value={formCurrency} onChange={(e)=>setFormCurrency(e.target.value)} style={{ paddingLeft: '1rem', width: '100px' }}>
                  <option value="AZN">AZN</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ margin: 0, padding: '0.5rem', background: '#ef4444' }}>Add Target</button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dashboardData?.targets?.length === 0 && <p style={{color: 'var(--text-muted)'}}>No targets assigned yet.</p>}
            {dashboardData?.targets?.map(target => (
              <div key={target.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <div style={{ fontWeight: '500' }}>{target.Name}</div>
                <div style={{ color: 'var(--text-muted)' }}>{target.AssignedAmount.toFixed(2)} {target.Currency}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
