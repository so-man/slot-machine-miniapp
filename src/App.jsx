import { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase';
import {
  doc, setDoc, updateDoc, getDoc, collection, addDoc, serverTimestamp
} from 'firebase/firestore';
import { init } from '@telegram-apps/sdk';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '7️⃣'];

function TopNav({ isAdmin }) {
  const location = useLocation();
  return (
    <div className="top-nav">
      <Link to="/" className={location.pathname === '/' ? 'active' : ''}>🏠 Home</Link>
      <Link to="/referrals" className={location.pathname === '/referrals' ? 'active' : ''}>📈 Referrals</Link>
      <Link to="/battles" className={location.pathname === '/battles' ? 'active' : ''}>⚔️ Battles</Link>
      {isAdmin && (
        <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>👑 Admin</Link>
      )}
    </div>
  );
}

function Home({ telegramUser, balance, setBalance, grid, setGrid, streak, setStreak }) {
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('');
  const [bet, setBet] = useState(10);
  const [error, setError] = useState('');

  const getRandomSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];

  const spin = () => {
    const parsedBet = parseInt(bet);
    if (isNaN(parsedBet) || parsedBet <= 0) return setError('Invalid bet');
    if (parsedBet > balance) return setError('Not enough balance');
    setError('');
    setSpinning(true);
    setMessage('');
    setBalance(balance - parsedBet);

    const tempGrid = Array.from({ length: 3 }, () => Array(3).fill('❔'));
    const finalGrid = Array.from({ length: 3 }, () => Array(3).fill(null));
    const intervals = [];

    for (let col = 0; col < 3; col++) {
      intervals[col] = setInterval(() => {
        for (let row = 0; row < 3; row++) {
          tempGrid[row][col] = getRandomSymbol();
        }
        setGrid([...tempGrid]);
      }, 75);

      setTimeout(() => {
        clearInterval(intervals[col]);
        for (let row = 0; row < 3; row++) {
          finalGrid[row][col] = getRandomSymbol();
        }
        setGrid([...finalGrid]);

        if (col === 2) {
          setTimeout(async () => {
            setSpinning(false);
            const centerRow = finalGrid[1];
            const win = centerRow.every((s) => s === centerRow[0]);
            const newStreak = win ? streak + 1 : 0;
            const payout = win ? parsedBet * 3 : 0;
            const newBalance = balance - parsedBet + payout;

            setStreak(newStreak);
            setBalance(newBalance);
            setMessage(win ? `🎉 You won ${payout} coins!` : '😥 Try again!');

            const userRef = doc(db, 'users', telegramUser.id.toString());
            await updateDoc(userRef, {
              balance: newBalance,
              streak: newStreak
            });

            await addDoc(collection(db, 'spins'), {
              userId: telegramUser.id,
              grid: finalGrid,
              win,
              bet: parsedBet,
              payout,
              streak: newStreak,
              createdAt: serverTimestamp()
            });
          }, 300);
        }
      }, 1000 + col * 300);
    }
  };

  return (
    <div className="container">
      <h1>🎰 Spinfinity</h1>
      <div className="balance">Balance: 🪙 {balance}</div>
      <div className="bet-row">
        <input type="number" value={bet} min="1" onChange={(e) => setBet(e.target.value)} disabled={spinning} />
        <button onClick={spin} disabled={spinning}>
          {spinning ? 'Spinning...' : 'Spin'}
        </button>
      </div>
      <p>🎁 Invite a friend to earn 50 bonus coins!</p>
      <div className="invite-row">
        <button
          onClick={() =>
            navigator.clipboard.writeText(`https://t.me/Spinfinity_bot?start=${telegramUser?.id}`)
              .then(() => alert('Referral link copied!'))
          }
        >🔗 Copy Invite Link</button>
        <Link to="/referrals" className="btn">📈 Track Referrals</Link>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="grid-box">
        {grid.map((row, i) => (
          <div className="row" key={i}>
            {row.map((symbol, j) => (
              <div key={j} className="slot">{symbol}</div>
            ))}
          </div>
        ))}
      </div>
      <p>{message}</p>
      {streak > 1 && <p>🔥 {streak}-win streak!</p>}
    </div>
  );
}

function Referrals() {
  return (
    <div className="container">
      <h1>📈 Referral Activity</h1>
      <p>This page will show who joined using your link and bonus status.</p>
    </div>
  );
}

function Battles() {
  return (
    <div className="container">
      <h1>⚔️ Spin Battle</h1>
      <p>Tag a friend. If they spin within 5 minutes, you both earn 50 coins!</p>
      <p>(Coming soon: invite tracking and real-time battles!)</p>
    </div>
  );
}

function AdminPanel() {
  return (
    <div className="container">
      <h1>👑 Admin Console</h1>
      <p>All admin tools coming back here soon.</p>
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
        user = {
          id: 'dev123',
          first_name: 'Dev Tester',
          username: 'devmode'
        };
      }

      setTelegramUser(user);
      const userRef = doc(db, 'users', user.id.toString());
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setBalance(userSnap.data().balance || 100);
        setStreak(userSnap.data().streak || 0);
      } else {
        await setDoc(userRef, {
          balance: 100,
          streak: 0,
          createdAt: serverTimestamp()
        });
        setBalance(100);
        setStreak(0);
      }
    };
    setup();
  }, []);

  return (
    <Router>
      {telegramUser && <TopNav isAdmin={telegramUser?.username === 'GenesisGoblin'} />}
      <Routes>
        <Route path="/" element={<Home telegramUser={telegramUser} balance={balance} setBalance={setBalance} grid={grid} setGrid={setGrid} streak={streak} setStreak={setStreak} />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/battles" element={<Battles />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/leaderboard" element={<div className="container"><h1>🏆 Leaderboard</h1></div>} />
      </Routes>
    </Router>
  );
}
