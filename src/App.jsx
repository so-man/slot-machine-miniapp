import { useState } from 'react';
import './App.css';

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '7️⃣'];

export default function App() {
  const [slots, setSlots] = useState([null, null, null]);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('');
  const [streak, setStreak] = useState(0);

  const getRandomSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];

  const spin = () => {
    setSpinning(true);
    setMessage('');
    setSlots([null, null, null]);

    const newSlots = [null, null, null];

    setTimeout(() => {
      newSlots[0] = getRandomSymbol();
      setSlots([newSlots[0], null, null]);
    }, 500);

    setTimeout(() => {
      newSlots[1] = getRandomSymbol();
      setSlots([newSlots[0], newSlots[1], null]);
    }, 1000);

    setTimeout(() => {
      newSlots[2] = getRandomSymbol();
      setSlots([newSlots[0], newSlots[1], newSlots[2]]);
      setSpinning(false);

      const win = newSlots[0] === newSlots[1] && newSlots[1] === newSlots[2];
      const newStreak = win ? streak + 1 : 0;

      // Save to Firebase
      const resultData = {
        slots: newSlots,
        win: win,
        streak: newStreak,
        createdAt: serverTimestamp(),
      };

      addDoc(collection(db, 'spins'), resultData)
        .then(() => console.log("✅ Spin saved to Firestore"))
        .catch(err => console.error("❌ Error saving spin:", err));

      // UI update
      if (win) {
        setMessage('🎉 Jackpot! You win!');
        setStreak(newStreak);
      } else {
        setMessage('😢 Try again!');
        setStreak(0);
      }
    }, 1500);
  };

  return (
    <div className="container">
      <h1>🎰 Spinfinity</h1>
      <div className="slot-box">
        {slots.map((symbol, i) => (
          <div
            key={i}
            className={`slot ${spinning && symbol === null ? 'blur' : ''}`}
          >
            {symbol || '❔'}
          </div>
        ))}
      </div>
      <button onClick={spin} disabled={spinning}>
        {spinning ? 'Spinning...' : 'Spin'}
      </button>
      <p>{message}</p>
      {streak > 1 && <p>🔥 You're on a {streak}-win streak!</p>}
    </div>
  );
}
