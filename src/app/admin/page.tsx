'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import BingoCard from '@/components/BingoCard';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Player {
  nickname: string;
  cards: number[][][];
}

export default function AdminPage() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [winners, setWinners] = useState<string[]>([]);
  const [isGameEnded, setIsGameEnded] = useState(false);

  const startGame = () => {
    socket.emit('start-game');
    setStarted(true);
  };

  const stopGame = () => {
    socket.emit('end-game');
    setStarted(false);
  };

  useEffect(() => {
    socket.emit('register-admin');

    socket.on('admin-exists', ({ exists }) => {
      if (exists) {
        alert('An admin is already connected.');
        router.push('/');
      }
    });

    socket.on('game-status', ({ started, calledNumbers }) => {
      setStarted(started);
      if (started && calledNumbers?.length) {
        setCalledNumbers(calledNumbers);
      }
    });

    socket.on('number-called', (number: number) => {
      setCalledNumbers((prev) => [...prev, number]);
    });

    socket.on('players-updated', (playersData: Player[]) => {
      setPlayers(playersData);
    });

    socket.on('game-ended', () => {
      setShowDialog(true);
      setStarted(false);
      setIsGameEnded(true);
    });

    socket.on('winner', (nickname: string) => {
      setWinners((prev) => {
        if (!prev.includes(nickname)) {
          return [...prev, nickname];
        }
        return prev;
      });
    });

    socket.emit('get-game-status');
    socket.emit('get-players');

    return () => {
      socket.emit('leave-admin');
      socket.off('game-status');
      socket.off('number-called');
      socket.off('players-updated');
      socket.off('game-ended');
      socket.off('winner');
    };
  }, []);

  const handleBack = () => {
    socket.emit('reset-game');

    // Reset the local state
    setPlayers([]);
    setCalledNumbers([]);
    setWinners([]);
    setIsGameEnded(false);

    // Navigate back to home
    router.push('/');
  };

  return (
    <main className="p-6 flex items-center justify-center flex-col min-h-screen">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>
      {!started ? (
        <Button className="mt-4" onClick={startGame} disabled={players.length === 0}>
          Start Game
        </Button>
      ) : (
        <>
          <p className="mt-4">Game in progress... live view soon</p>
          <Button
            className="mt-2 bg-red-600 hover:bg-red-700"
            onClick={stopGame}
          >
            Stop Game
          </Button>
        </>
      )}

      {winners.length > 0 && (
        <div className="mt-6 w-full max-w-md mx-auto bg-green-100 p-4 rounded shadow">
          <h2 className="text-xl font-bold text-green-800 mb-2">
            Top Blackout Winners
          </h2>
          <ul className="list-disc list-inside text-green-700">
            {winners.map((winner, i) => (
              <li key={i}>
                #{i + 1}: {winner}
              </li>
            ))}
          </ul>
          {players.length > 2 && winners.length < 3 && (
            <p className="text-sm text-gray-600 mt-2">
              Waiting for {3 - winners.length} more{' '}
              {3 - winners.length === 1 ? 'winner' : 'winners'}...
            </p>
          )}
        </div>
      )}

      {isGameEnded && (
        <div className="mt-6 w-full max-w-md mx-auto text-center bg-gray-200 p-4 rounded shadow">
          <h2 className="text-xl font-bold text-red-600">Game Over</h2>
          <p>The game has ended.</p>
          <Button className="mt-4" onClick={handleBack}>
            Back to Home
          </Button>
        </div>
      )}

      {started && (
        <>
          <div className="mt-6 w-full max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Called Numbers</h2>
            <div className="flex flex-wrap gap-2">
              {calledNumbers.map((n, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-blue-500 text-white rounded"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {players.some((p) => p.cards && p.cards.length > 0) && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Players' Cards</h2>
          <div className="space-y-8">
            {players
              .filter((player) => player.cards && player.cards.length > 0)
              .map((player, idx) => (
                <div key={idx} className="border p-4 rounded shadow">
                  <h3 className="text-lg font-semibold mb-2">
                    {player.nickname}
                  </h3>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {player.cards.map((card, i) => (
                      <BingoCard
                        key={i}
                        numbers={card}
                        called={calledNumbers}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogTitle>Game Over</DialogTitle>
          <DialogDescription>The game has ended.</DialogDescription>
        </DialogContent>
      </Dialog>
    </main>
  );
}
