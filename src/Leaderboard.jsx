import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const sorted = users.sort((a, b) => b.balance - a.balance);
      setPlayers(sorted.slice(0, 10));
    };
    fetchData();
  }, []);

  return (
    <div className="container">
      <h2>🏆 Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th><th>Name</th><th>Balance</th><th>Streak</th>
          </tr>
        </thead>
        <tbody>
          {players.map((user, i) => (
            <tr key={user.id}>
              <td>{i + 1}</td>
              <td>{user.name}</td>
              <td>{user.balance}</td>
              <td>{user.streak}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link to="/">🎰 Back to Game</Link>
    </div>
  );
}
