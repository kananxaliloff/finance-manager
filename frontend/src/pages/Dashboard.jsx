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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '1rem 2rem', maxWidth: '1400px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Finance Overview</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={baseCurrency} 
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="form-input"
            style={{ width: '100px', padding: '0.4rem 0.8rem', margin: 0 }}
          >
            <option value="AZN">AZN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <button onClick={handleLogout} className="btn-primary" style={{ margin: 0, padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--border)' }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {error && <div className="error-message" style={{marginBottom: '1rem'}}>{error}</div>}

      {/* Main Metrics Area */}
      {dashboardData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', flexShrink: 0 }}>
          
          {/* HERO: Available Money */}
          <div className="auth-card" style={{ padding: '2rem', margin: 0, background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.15), rgba(30, 41, 59, 0.8))', border: '2px solid #10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#10b981' }}>
              <TrendingUp size={28} /> <h3 style={{fontSize: '1.2rem', margin: 0}}>Available Money</h3>
            </div>
            <h2 style={{ fontSize: '4rem', margin: 0, color: '#10b981', fontWeight: '800' }}>{dashboardData.availableMoney.toFixed(2)} <span style={{fontSize:'1.5rem', opacity: 0.8}}>{baseCurrency}</span></h2>
          </div>

          {/* SECONDARY: Actual & Assigned side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="auth-card" style={{ padding: '1.5rem', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
                  <Wallet size={20} color="#3b82f6" /> <h3 style={{margin: 0, fontSize: '1rem'}}>Actual Money</h3>
                </div>
                <h2 style={{ fontSize: '2rem', margin: 0 }}>{dashboardData.totalActualMoney.toFixed(2)} <span style={{fontSize:'1rem', color:'var(--text-muted)'}}>{baseCurrency}</span></h2>
              </div>
            </div>

            <div className="auth-card" style={{ padding: '1.5rem', margin: 0, border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: '#ef4444' }}>
                  <Target size={20} color="#ef4444" /> <h3 style={{margin: 0, fontSize: '1rem'}}>Assigned Targets</h3>
                </div>
                <h2 style={{ fontSize: '2rem', margin: 0, color: '#ef4444' }}>{dashboardData.totalAssignedTargets.toFixed(2)} <span style={{fontSize:'1rem', opacity: 0.8}}>{baseCurrency}</span></h2>
              </div>
            </div>
          </div>
          
        </div>
      )}

      {/* Modal for Creating Accounts & Targets */}
      {(showAccountForm || showTargetForm) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="auth-card" style={{ width: '400px', maxWidth: '90%', padding: '2rem', position: 'relative' }}>
            <button onClick={() => {setShowAccountForm(false); setShowTargetForm(false)}} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>{showAccountForm ? 'Add New Account' : 'Add Savings Target'}</h2>
            <form onSubmit={(e) => handleCreate(e, showAccountForm ? 'account' : 'target')} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" className="form-input" placeholder={showAccountForm ? "Account Name" : "Target Name"} value={formName} onChange={(e)=>setFormName(e.target.value)} required style={{ paddingLeft: '1rem' }} />
              <input type="number" step="0.01" className="form-input" placeholder="Amount" value={formAmount} onChange={(e)=>setFormAmount(e.target.value)} required style={{ paddingLeft: '1rem' }} />
              <select className="form-input" value={formCurrency} onChange={(e)=>setFormCurrency(e.target.value)} style={{ paddingLeft: '1rem' }}>
                <option value="AZN">AZN</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', background: showTargetForm ? '#ef4444' : 'var(--primary)' }}>
                {showAccountForm ? 'Save Account' : 'Save Target'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lists & Creation Forms - Takes remaining height and scrolls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flexGrow: 1, minHeight: 0 }}>
        
        {/* Accounts Section */}
        <div className="auth-card" style={{ margin: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
            <h2 style={{margin: 0, fontSize: '1.2rem'}}>Your Accounts</h2>
            <button onClick={() => setShowAccountForm(!showAccountForm)} className="btn-primary" style={{ width: 'auto', margin: 0, padding: '0.4rem', borderRadius: '50%' }}>
              <Plus size={18} />
            </button>
          </div>
          
          <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
            {dashboardData?.accounts?.length === 0 && <p style={{color: 'var(--text-muted)'}}>No accounts added yet.</p>}
            {dashboardData?.accounts?.map(acc => (
              <div key={acc.ID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', gap: '1rem' }}>
                <div style={{ fontWeight: '500', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={acc.Name}>{acc.Name}</div>
                <div style={{ color: 'var(--text-muted)', flexShrink: 0, fontWeight: '600' }}>{acc.Balance.toFixed(2)} {acc.Currency}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Targets Section */}
        <div className="auth-card" style={{ margin: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
            <h2 style={{margin: 0, fontSize: '1.2rem'}}>Savings Targets</h2>
            <button onClick={() => setShowTargetForm(!showTargetForm)} className="btn-primary" style={{ width: 'auto', margin: 0, padding: '0.4rem', borderRadius: '50%', background: '#ef4444' }}>
              <Plus size={18} />
            </button>
          </div>
          
          <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
            {dashboardData?.targets?.length === 0 && <p style={{color: 'var(--text-muted)'}}>No targets assigned yet.</p>}
            {dashboardData?.targets?.map(target => (
              <div key={target.ID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', gap: '1rem' }}>
                <div style={{ fontWeight: '500', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={target.Name}>{target.Name}</div>
                <div style={{ color: 'var(--text-muted)', flexShrink: 0, fontWeight: '600' }}>{target.AssignedAmount.toFixed(2)} {target.Currency}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
