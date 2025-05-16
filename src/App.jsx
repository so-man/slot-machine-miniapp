import { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase';
import {
  doc, setDoc, updateDoc, getDoc, collection, addDoc, serverTimestamp
} from 'firebase/firestore';
import { init } from '@telegram-apps/sdk';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Leaderboard from './Leaderboard';

const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '7️⃣'];

export default function App() {
  const [telegramUser, setTelegramUser] = useState(null);
  const [grid, setGrid] = useState(Array.from({ length: 3 }, () => Array(3).fill('❔')));
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bet, setBet] = useState(10);
  const [error, setError] = useState('');

  useEffect(() => {
    const setup = async () => {
      let user = null;
      const urlParams = new URLSearchParams(window.location.search);
      const referredBy = urlParams.get('start');

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
          username: 'devmode',
        };
      }

      setTelegramUser(user);

      const userRef = doc(db, 'users', user.id.toString());
      const userSnap = await getDoc(userRef);

      const now = new Date();
      let newBalance = 100;
      setBalance(newBalance);
    };

    setup();
  }, []);

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
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div className="container">
              <h1>🎰 Spinfinity</h1>
              {telegramUser && (
                <div className="balance">Balance: 🪙 {balance}</div>
              )}
              <div className="bet-row">
                <input type="number" value={bet} min="1" onChange={(e) => setBet(e.target.value)} disabled={spinning} />
                <button onClick={spin} disabled={spinning}>
                  {spinning ? 'Spinning...' : 'Spin'}
                </button>
              </div>
              <p>🎁 Invite a friend to earn 50 bonus coins!</p>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    `https://t.me/Spinfinity_bot?start=${telegramUser?.id}`
                  ).then(() => alert('Referral link copied!'))
                }
              >
                🔗 Copy Invite Link
              </button>
              <button onClick={() => alert('Referral tracking coming soon!')}>
                📈 Track Referrals
              </button>
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
              <Link to="/leaderboard">🏆 View Leaderboard</Link>
              {telegramUser?.username === 'GenesisGoblin' && (
                <>
                  <Link to="/admin">👑 Admin Console</Link>
                  <button onClick={async () => {
                    const userRef = doc(db, 'users', telegramUser.id.toString());
                    await updateDoc(userRef, { balance: balance + 10000 });
                    setBalance(balance + 10000);
                    alert('10,000 coins added!');
                  }}>
                    👑 Admin: Add 10,000 Coins
                  </button>
                </>
              )}
            </div>
          }
        />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin" element={
          telegramUser?.username === 'GenesisGoblin' ? (
            <div className="container admin-console">
              <h1>👑 Admin Console</h1>
              <button onClick={async () => {
                const userRef = doc(db, 'users', telegramUser.id.toString());
                await updateDoc(userRef, { balance: balance + 10000 });
                setBalance(balance + 10000);
                await addDoc(collection(db, 'transactions'), {
                  userId: telegramUser.id,
                  type: 'admin_bonus',
                  amount: 10000,
                  createdAt: serverTimestamp()
                });
                alert('10,000 coins added via admin.');
              }}>+10,000 Coins</button>
              <button onClick={async () => {
                const newBalance = parseInt(prompt('Enter new balance:')); 
                if (!isNaN(newBalance)) {
                  const userRef = doc(db, 'users', telegramUser.id.toString());
                  await updateDoc(userRef, { balance: newBalance });
                  setBalance(newBalance);
                  await addDoc(collection(db, 'transactions'), {
                    userId: telegramUser.id,
                    type: 'admin_set_balance',
                    amount: newBalance,
                    createdAt: serverTimestamp()
                  });
                }
              }}>Set Balance</button>
              <button onClick={async () => {
                const userRef = doc(db, 'users', telegramUser.id.toString());
                await updateDoc(userRef, { streak: 0 });
                setStreak(0);
                await addDoc(collection(db, 'transactions'), {
                  userId: telegramUser.id,
                  type: 'admin_reset_streak',
                  createdAt: serverTimestamp()
                });
              }}>Reset Streak</button>
              <button onClick={async () => {
                const bannedId = prompt('Enter user ID to ban:');
                if (bannedId) {
                  const bannedRef = doc(db, 'users', bannedId);
                  await updateDoc(bannedRef, { banned: true });
                  await addDoc(collection(db, 'transactions'), {
                    admin: telegramUser.id,
                    type: 'admin_ban_user',
                    target: bannedId,
                    createdAt: serverTimestamp()
                  });
                  alert(`User ${bannedId} banned.`);
                }
              }}>🚫 Ban User</button>
            </div>
          ) : <div className="container"><h1>Access Denied</h1></div>
        } />
      </Routes>
    </Router>
  );
}
