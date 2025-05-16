import { useState } from 'react';
import './App.css';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '7️⃣'];

export default function App() {
  const [grid, setGrid] = useState(
    Array.from({ length: 3 }, () => Array(3).fill(null))
  );
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('');
  const [streak, setStreak] = useState(0);

  const getRandomSymbol = () =>
    symbols[Math.floor(Math.random() * symbols.length)];

  const spin = () => {
    setSpinning(true);
    setMessage('');
    const newGrid = Array.from({ length: 3 }, () => Array(3).fill(null));
    setGrid(newGrid);

    let spinIntervals = [];

    // Stagger each column's stop
    for (let col = 0; col < 3; col++) {
      setTimeout(() => {
        for (let row = 0; row < 3; row++) {
          newGrid[row][col] = getRandomSymbol();
        }
        setGrid([...newGrid]);

        // When last column is set, stop spinning
        if (col === 2) {
          setSpinning(false);

          const centerRow = newGrid[1]; // middle row
          const win =
            centerRow[0] === centerRow[1] && centerRow[1] === centerRow[2];
          const newStreak = win ? streak + 1 : 0;

          const resultData = {
            grid: newGrid,
            win,
            streak: newStreak,
            createdAt: serverTimestamp(),
          };

          addDoc(collection(db, 'spins'), resultData)
            .then(() => console.log('✅ Spin saved'))
            .catch((err) => console.error('❌ Save failed:', err));

          if (win) {
            setMessage('🎉 Jackpot on the middle row!');
            setStreak(newStreak);
          } else {
            setMessage('😢 Try again!');
            setStreak(0);
          }
        }
      }, 500 * col); // Staggered stop per column
    }
  };

  return (
    <div className="container">
      <h1>🎰 Spinfinity</h1>
      <div className="grid-box">
        {grid.map((row, rowIndex) => (
          <div className="row" key={rowIndex}>
            {row.map((symbol, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`slot ${spinning && symbol === null ? 'blur' : ''}`}
              >
                {symbol || '❔'}
              </div>
            ))}
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
