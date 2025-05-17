import { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase';
import {
  doc, setDoc, updateDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs
} from 'firebase/firestore';
import { init } from '@telegram-apps/sdk';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

const ADMIN_ID = 890274218;
const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '7⃣'];

function TopNav({ isAdmin }) {
  const location = useLocation();
  return (
    <div className="top-nav">
      <Link to="/" className={location.pathname === '/' ? 'active' : ''}>🏠 Home</Link>
      <Link to="/referrals" className={location.pathname === '/referrals' ? 'active' : ''}>📊 Referrals</Link>
      <Link to="/battles" className={location.pathname === '/battles' ? 'active' : ''}>⚔️ Battles</Link>
      {isAdmin && <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>👑 Admin</Link>}
    </div>
  );
}

function Referrals({ telegramUser }) {
  const [referrals, setReferrals] = useState([]);

  useEffect(() => {
    const loadReferrals = async () => {
      const q = query(collection(db, 'users'), where('referredBy', '==', telegramUser.id.toString()));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => doc.data());
      setReferrals(list);
    };
    if (telegramUser) loadReferrals();
  }, [telegramUser]);

  return (
    <div className="container">
      <h1>📊 Referral Activity</h1>
      {referrals.length === 0 ? <p>No referrals yet.</p> : (
        <ul>
          {referrals.map((r, i) => (
            <li key={i}>User ID: {r.id} — Joined: {r.createdAt?.toDate().toLocaleDateString()}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminPanel() {
  const [targetId, setTargetId] = useState('');
  const [amount, setAmount] = useState(0);

  const updateBalance = async () => {
    const ref = doc(db, 'users', targetId);
    await updateDoc(ref, { balance: Number(amount) });
    alert(`Updated balance for ${targetId}`);
  };

  const resetStreak = async () => {
    const ref = doc(db, 'users', targetId);
    await updateDoc(ref, { streak: 0 });
    alert(`Reset streak for ${targetId}`);
  };

  const banUser = async () => {
    const ref = doc(db, 'users', targetId);
    await updateDoc(ref, { banned: true });
    alert(`Banned user ${targetId}`);
  };

  return (
    <div className="container">
      <h1>👑 Admin Console</h1>
      <input placeholder="User ID" value={targetId} onChange={e => setTargetId(e.target.value)} />
      <input placeholder="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
      <button onClick={updateBalance}>💰 Set Balance</button>
      <button onClick={resetStreak}>♻️ Reset Streak</button>
      <button onClick={banUser}>🚫 Ban User</button>
    </div>
  );
}

function Home({ telegramUser, balance, setBalance, grid, setGrid, streak, setStreak }) {
  return (
    <div className="container">
      <h1>🎰 Spinfinity</h1>
      <div className="balance">Balance: 🪙 {balance}</div>
      {/* You can expand this with actual game logic */}
    </div>
  );
}

export default function App() {
  const [telegramUser, setTelegramUser] = useState(null);
  const [grid, setGrid] = useState(Array.from({ length: 3 }, () => Array(3).fill('❔')));
  const [balance, setBalance] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const setup = async () => {
      let user = null;
      try {
        const tg = await init();
        user = tg.initDataUnsafe?.user;
      } catch (err) {
        console.warn('[Telegram SDK fallback]:', err);
      }
      if (!user) {
        user = { id: 'dev123', first_name: 'Dev Tester', username: 'devmode' };
      }

      setTelegramUser(user);
      const userRef = doc(db, 'users', user.id.toString());
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setBalance(userData.balance || 100);
        setStreak(userData.streak || 0);
      } else {
        const referredBy = new URLSearchParams(window.location.search).get('start') || null;

        await setDoc(userRef, {
          id: user.id,
          balance: 100,
          streak: 0,
          referredBy,
          referralRewarded: false,
          createdAt: serverTimestamp()
        });

        setBalance(100);
        setStreak(0);

        if (referredBy) {
          const referrerRef = doc(db, 'users', referredBy);
          const referrerSnap = await getDoc(referrerRef);
          if (referrerSnap.exists()) {
            const refData = referrerSnap.data();
            if (!refData.referralRewarded) {
              const newBalance = (refData.balance || 0) + 50;
              await updateDoc(referrerRef, {
                balance: newBalance,
                referralRewarded: true
              });
              alert('Your referrer has been rewarded with 50 coins!');
            }
          }
        }
      }
    };
    setup();
  }, []);

  return (
    <Router>
      {telegramUser && <TopNav isAdmin={telegramUser?.id === ADMIN_ID} />}
      <Routes>
        <Route path="/" element={<Home telegramUser={telegramUser} balance={balance} setBalance={setBalance} grid={grid} setGrid={setGrid} streak={streak} setStreak={setStreak} />} />
        <Route path="/referrals" element={<Referrals telegramUser={telegramUser} />} />
        <Route path="/battles" element={<div className="container"><h1>⚔️ Spin Battle</h1><p>Tag a friend. If they spin within 5 minutes, you both earn 50 coins!</p></div>} />
        <Route path="/admin" element={telegramUser?.id === ADMIN_ID ? <AdminPanel /> : <div className="container"><h1>Access Denied</h1></div>} />
      </Routes>
    </Router>
  );
}
