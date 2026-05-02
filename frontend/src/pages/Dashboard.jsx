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
  const [formType, setFormType] = useState('CASH'); // CASH or CARD for accounts, SAVING or PURCHASE for targets
  const [formCardNumber, setFormCardNumber] = useState('');
  const [formNote, setFormNote] = useState('');
  
  // Transaction Form States
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transAmount, setTransAmount] = useState('');
  const [transType, setTransType] = useState('EXPENSE');
  const [transSource, setTransSource] = useState('');
  const [transDest, setTransDest] = useState('');
  const [transTarget, setTransTarget] = useState('');
  const [transDesc, setTransDesc] = useState('');
  
  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState([]);
  
  // Recurring State
  const [pendingRecurring, setPendingRecurring] = useState([]);
  const [showRecurringManager, setShowRecurringManager] = useState(false);

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

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`http://localhost:8080/api/v1/finance/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTransactions(data);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    }
  };

  useEffect(() => {
    if (showHistory) fetchTransactions();
  }, [showHistory]);

  const fetchPendingRecurring = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`http://localhost:8080/api/v1/finance/recurring/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPendingRecurring(data);
    } catch (err) {
      console.error("Failed to fetch pending recurring", err);
    }
  };

  useEffect(() => {
    fetchPendingRecurring();
  }, []);

  const handleConfirmRecurring = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`http://localhost:8080/api/v1/finance/recurring/confirm/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to confirm transaction");
      
      fetchPendingRecurring();
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

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
        ? { 
            name: formName, 
            balance: parseFloat(formAmount), 
            currency: formCurrency,
            type: formType,
            cardNumber: formType === 'CARD' ? formCardNumber : null
          }
        : { 
            name: formName, 
            assignedAmount: parseFloat(formAmount), 
            currency: formCurrency,
            type: formType,
            note: formNote || null
          };

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
      setFormType('CASH');
      setFormCardNumber('');
      setFormNote('');
      setShowAccountForm(false);
      setShowTargetForm(false);
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const bodyPayload = {
        amount: parseFloat(transAmount),
        currency: baseCurrency, // Use dashboard base currency for simplicity or add currency select
        type: transType,
        description: transDesc,
        sourceAccountId: transSource ? parseInt(transSource) : null,
        destinationAccountId: transDest ? parseInt(transDest) : null,
        targetId: transTarget ? parseInt(transTarget) : null,
      };

      const res = await fetch(`http://localhost:8080/api/v1/finance/transactions`, {
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
      setTransAmount('');
      setTransDesc('');
      setTransSource('');
      setTransDest('');
      setTransTarget('');
      setShowTransactionForm(false);
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="auth-container" style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center'}}><Loader2 className="animate-spin" size={48} color="var(--primary)" /></div>;
  }

  if (error && !dashboardData) {
    return (
      <div className="auth-container" style={{height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem'}}>
        <div className="error-message">{error}</div>
        <button onClick={fetchDashboard} className="btn-primary" style={{width: 'auto'}}>Retry</button>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '1rem 2rem', maxWidth: '1400px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
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
          <button onClick={() => setShowTransactionForm(true)} className="btn-primary" style={{ margin: 0, padding: '0.4rem 1rem' }}>
            Add Transaction
          </button>
          <button onClick={() => setShowHistory(true)} className="btn-primary" style={{ margin: 0, padding: '0.4rem 1rem', background: 'transparent', border: '1px solid var(--border)' }}>
            History
          </button>
          <button onClick={() => setShowRecurringManager(true)} className="btn-primary" style={{ margin: 0, padding: '0.4rem 1rem', background: 'transparent', border: '1px solid var(--border)' }}>
            Monthly
          </button>
          <button onClick={handleLogout} className="btn-primary" style={{ margin: 0, padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--border)' }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Pending Monthly Actions Banner */}
      {pendingRecurring?.length > 0 && (
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, color: '#3b82f6', fontSize: '0.9rem', fontWeight: 'bold' }}>Monthly Automation Pending</h4>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>You have {pendingRecurring.length} recurring transaction(s) ready for this month.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {pendingRecurring?.map(pr => (
              <button key={pr.ID} onClick={() => handleConfirmRecurring(pr.ID)} className="btn-primary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: '#3b82f6' }}>
                Confirm {pr.Description} (+{pr.Amount})
              </button>
            ))}
          </div>
        </div>
      )}

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
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select className="form-input" value={formType} onChange={(e)=>setFormType(e.target.value)} style={{ paddingLeft: '1rem', flexShrink: 0 }}>
                  {showAccountForm && <option value="CASH">Cash</option>}
                  {showAccountForm && <option value="CARD">Card</option>}
                  {!showAccountForm && <option value="SAVING">Savings</option>}
                  {!showAccountForm && <option value="PURCHASE">Purchase</option>}
                </select>
                <select className="form-input" value={formCurrency} onChange={(e)=>setFormCurrency(e.target.value)} style={{ paddingLeft: '1rem', width: '90px', flexShrink: 0 }}>
                  <option value="AZN">AZN</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </select>
              </div>

              <input type="text" className="form-input" placeholder={showAccountForm ? "Name (e.g. Wallet, Kapital Bank)" : "Name (e.g. Emergency, Laptop)"} value={formName} onChange={(e)=>setFormName(e.target.value)} required style={{ paddingLeft: '1rem' }} />
              <input type="number" step="0.01" className="form-input" placeholder={showAccountForm ? "Starting Balance" : "Current Amount"} value={formAmount} onChange={(e)=>setFormAmount(e.target.value)} required style={{ paddingLeft: '1rem' }} />
              
              {showAccountForm && formType === 'CARD' && (
                <input type="text" className="form-input" placeholder="16-Digit Card Number" value={formCardNumber} onChange={(e)=>setFormCardNumber(e.target.value)} maxLength="16" pattern="\d{16}" required style={{ paddingLeft: '1rem' }} />
              )}

              {showTargetForm && (
                <input type="text" className="form-input" placeholder="Optional Note / Wishlist Detail" value={formNote} onChange={(e)=>setFormNote(e.target.value)} style={{ paddingLeft: '1rem' }} />
              )}

              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', background: showTargetForm ? '#ef4444' : 'var(--primary)' }}>
                {showAccountForm ? 'Save Account' : 'Save Target'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Transactions */}
      {showTransactionForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="auth-card" style={{ width: '450px', maxWidth: '90%', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowTransactionForm(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Record Transaction</h2>
            <form onSubmit={handleCreateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select className="form-input" value={transType} onChange={(e)=>setTransType(e.target.value)} style={{ paddingLeft: '1rem', flex: 1 }}>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
                <input type="number" step="0.01" className="form-input" placeholder="Amount" value={transAmount} onChange={(e)=>setTransAmount(e.target.value)} required style={{ paddingLeft: '1rem', flex: 1 }} />
              </div>

              {/* Source Account (Required for Expense/Transfer, optional for Income if direct to account) */}
              <select className="form-input" value={transSource} onChange={(e)=>setTransSource(e.target.value)} required={transType !== 'INCOME'} style={{ paddingLeft: '1rem' }}>
                <option value="">{transType === 'INCOME' ? 'Target Account (Required)' : 'Source Account'}</option>
                {dashboardData?.accounts?.map(acc => (
                  <option key={acc.ID} value={acc.ID}>{acc.Name} ({acc.Balance.toFixed(2)} {acc.Currency})</option>
                ))}
              </select>

              {transType === 'TRANSFER' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>To:</p>
                  <select className="form-input" value={transDest || (transTarget ? `t-${transTarget}` : '')} onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('t-')) {
                      setTransTarget(val.substring(2));
                      setTransDest('');
                    } else {
                      setTransDest(val);
                      setTransTarget('');
                    }
                  }} style={{ paddingLeft: '1rem' }}>
                    <option value="">Select Destination</option>
                    <optgroup label="Accounts">
                      {dashboardData?.accounts?.filter(a => a.ID != transSource).map(acc => (
                        <option key={acc.ID} value={acc.ID}>{acc.Name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Savings Targets">
                      {dashboardData?.targets?.map(t => (
                        <option key={t.ID} value={`t-${t.ID}`}>{t.Name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              <input type="text" className="form-input" placeholder="Description (e.g. Salary, Rent, Save for Laptop)" value={transDesc} onChange={(e)=>setTransDesc(e.target.value)} style={{ paddingLeft: '1rem' }} />

              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
                Submit Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal for History */}
      {showHistory && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="auth-card" style={{ width: '600px', maxWidth: '95%', maxHeight: '80vh', padding: '2rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => setShowHistory(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Transaction History</h2>
            
            <div style={{ overflowY: 'auto', flexGrow: 1 }}>
              {transactions?.length === 0 && <p style={{color:'var(--text-muted)'}}>No transactions yet.</p>}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '0.75rem 0' }}>Date</th>
                    <th style={{ padding: '0.75rem 0' }}>Type</th>
                    <th style={{ padding: '0.75rem 0' }}>Description</th>
                    <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions?.map(t => (
                    <tr key={t.ID} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 0', fontSize: '0.85rem' }}>{new Date(t.CreatedAt).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem 0' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: t.Type === 'INCOME' ? 'rgba(16, 185, 129, 0.1)' : t.Type === 'EXPENSE' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: t.Type === 'INCOME' ? '#10b981' : t.Type === 'EXPENSE' ? '#ef4444' : '#3b82f6'
                        }}>
                          {t.Type}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0', fontSize: '0.9rem' }}>{t.Description || '-'}</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: '600', color: t.Type === 'INCOME' ? '#10b981' : t.Type === 'EXPENSE' ? '#ef4444' : 'inherit' }}>
                        {t.Type === 'INCOME' ? '+' : t.Type === 'EXPENSE' ? '-' : ''}{t.Amount.toFixed(2)} {t.Currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Recurring Management */}
      {showRecurringManager && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="auth-card" style={{ width: '500px', maxWidth: '95%', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowRecurringManager(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Monthly Automations</h2>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const payload = {
                amount: parseFloat(formData.get('amount')),
                currency: formData.get('currency'),
                type: formData.get('type'),
                description: formData.get('description'),
                dayOfMonth: parseInt(formData.get('dayOfMonth')),
                sourceAccountId: formData.get('sourceAccountId') ? parseInt(formData.get('sourceAccountId')) : null,
              };

              try {
                const token = localStorage.getItem('authToken');
                const res = await fetch('http://localhost:8080/api/v1/finance/recurring', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error("Failed to create rule");
                e.target.reset();
                fetchPendingRecurring();
                alert("Recurring rule added!");
              } catch (err) {
                alert(err.message);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input name="description" className="form-input" placeholder="Description (e.g. Salary)" required style={{ flex: 2 }} />
                <input name="dayOfMonth" type="number" min="1" max="31" className="form-input" placeholder="Day (1-31)" required style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input name="amount" type="number" step="0.01" className="form-input" placeholder="Amount" required style={{ flex: 1 }} />
                <select name="currency" className="form-input" style={{ width: '90px' }}>
                  <option value="AZN">AZN</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </select>
                <select name="type" className="form-input" style={{ flex: 1 }}>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
              <select name="sourceAccountId" className="form-input" required>
                <option value="">Select Account</option>
                {dashboardData?.accounts?.map(acc => (
                  <option key={acc.ID} value={acc.ID}>{acc.Name}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Add Monthly Rule</button>
            </form>

            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Active Rules</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Newly added rules will prompt for confirmation on their scheduled day each month.</p>
            </div>
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
            {dashboardData?.accounts?.map(acc => {
              const isCard = acc.Type === 'CARD' && acc.CardNumber && acc.CardNumber.length === 16;
              const maskedCard = isCard ? `${acc.CardNumber.slice(0,4)} **** **** ${acc.CardNumber.slice(12,16)}` : '';
              return (
                <div key={acc.ID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={acc.Name}>{acc.Name}</div>
                    {isCard && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>{maskedCard}</div>}
                    {!isCard && acc.Type === 'CASH' && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Cash Wallet</div>}
                  </div>
                  <div style={{ color: 'var(--text-muted)', flexShrink: 0, fontWeight: '600' }}>{acc.Balance.toFixed(2)} {acc.Currency}</div>
                </div>
              );
            })}
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={target.Name}>{target.Name}</div>
                    {target.Type === 'PURCHASE' && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '4px' }}>WISH</span>}
                  </div>
                  {target.Note && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{target.Note}</div>}
                </div>
                <div style={{ color: 'var(--text-muted)', flexShrink: 0, fontWeight: '600' }}>{target.AssignedAmount.toFixed(2)} {target.Currency}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
