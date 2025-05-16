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

  // ✅ Initialize Telegram + check daily bonus
  useEffect(() => {
    init().then(async (tg) => {
      const user = tg.initDataUnsafe?.user;
      if (!user) {
        alert("Please open this in Telegram.");
        return;
      }

      setTelegramUser(user);
      const userRef = doc(db, 'users', user.id.toString());
      const userSnap = await getDoc(userRef);

      const now = new Date();
      let newBalance = 100;

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const lastClaimed = userData.lastClaimedAt?.toDate?.() ?? new Date(2000);
        const claimedToday = lastClaimed.toDateString() === now.toDateString();

        newBalance = userData.balance;

        if (!claimedToday) {
          newBalance += 10;
          await updateDoc(userRef, {
            balance: newBalance,
            lastClaimedAt: serverTimestamp()
          });
        }
      } else {
        await setDoc(userRef, {
          name: user.username || user.first_name,
          balance: 110,
          streak: 0,
          lastClaimedAt: serverTimestamp()
        });
        newBalance = 110;
      }

      setBalance(newBalance);
    });
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
            setMessage(win ? `🎉 You won ${payout} coins!` : '😢 Try again!');

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
                <div className="balance">Hi {telegramUser.first_name}, Balance: {balance} 🪙</div>
              )}
              <div className="bet-row">
                <input type="number" value={bet} min="1" onChange={(e) => setBet(e.target.value)} disabled={spinning} />
                <button onClick={spin} disabled={spinning}>
                  {spinning ? 'Spinning...' : 'Spin'}
                </button>
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
              <Link to="/leaderboard">🏆 View Leaderboard</Link>
            </div>
          }
        />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </Router>
  );
}
