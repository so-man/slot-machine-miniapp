// Home.jsx
import { useState } from 'react';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '7️⃣'];

export default function Home({ telegramUser, balance, setBalance, grid, setGrid, streak, setStreak }) {
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('');
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
            navigator.clipboard.writeText(
              `https://t.me/Spinfinity_bot?start=${telegramUser?.id}`
            ).then(() => alert('Referral link copied!'))
          }
        >
          🔗 Copy Invite Link
        </button>
        <button onClick={() => window.location.href = "/referrals"}>
          📈 Track Referrals
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
    </div>
  );
}
