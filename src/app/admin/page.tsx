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
  const [isPaused, setIsPaused] = useState(false);
  const [winnerDetails, setWinnerDetails] = useState<
    { nickname: string; cards: number[][][] }[]
  >([]);

  const startGame = () => {
    socket.emit('start-game');
    setStarted(true);
  };

  const stopGame = () => {
    socket.emit('end-game');
    setStarted(false);
  };

  const pauseGame = () => {
    socket.emit('pause-game');
    setIsPaused(true);
  };

  const resumeGame = () => {
    socket.emit('resume-game');
    setIsPaused(false);
  };

  useEffect(() => {
    socket.emit('register-admin');

    socket.on('admin-exists', ({ exists }) => {
      if (exists) {
        alert('An admin is already connected.');
        router.push('/');
      }
    });

    socket.on('game-status', ({ started, calledNumbers, winners }) => {
      setStarted(started);
      setCalledNumbers(calledNumbers || []);
      setWinners(winners || []);
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

    socket.on('winner', (data: { nickname: string; cards: number[][][] }) => {
      setWinners((prev) => {
        if (!prev.includes(data.nickname)) {
          return [...prev, data.nickname];
        }
        return prev;
      });

      setWinnerDetails((prev) => {
        const exists = prev.find((w) => w.nickname === data.nickname);
        if (!exists) {
          return [...prev, { nickname: data.nickname, cards: data.cards }];
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

  useEffect(() => {
    if (!started || isGameEnded) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePopState = () => {
      alert('You cannot leave the game while it is in progress.');
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [started, isGameEnded]);

  const handleBack = () => {
    socket.emit('reset-game');

    // Reset the local state
    setPlayers([]);
    setCalledNumbers([]);
    setWinners([]);
    setIsGameEnded(false);
    setStarted(false);

    // Navigate back to home
    router.push('/');
  };

  return (
    <main className="p-6 flex items-center justify-center flex-col min-h-screen">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>
      {!started && !isGameEnded && (
        <Button
          className="mt-4"
          onClick={startGame}
          disabled={players.length === 0}
        >
          Start Game
        </Button>
      )}

      {started && (
        <>
          <p className="mt-4">
            {isPaused
              ? 'Game is paused...'
              : 'Game in progress... live view soon'}
          </p>

          {isPaused ? (
            <Button
              className="mt-2 bg-yellow-500 hover:bg-yellow-600"
              onClick={resumeGame}
            >
              Resume Game
            </Button>
          ) : (
            <Button
              className="mt-2 bg-yellow-500 hover:bg-yellow-600"
              onClick={pauseGame}
            >
              Pause Game
            </Button>
          )}

          <Button
            className="mt-2 bg-red-600 hover:bg-red-700"
            onClick={stopGame}
          >
            Stop Game
          </Button>
        </>
      )}
      {winnerDetails.length > 0 && (
        <>
          <h2 className="text-2xl font-bold text-green-800 mt-8 mb-4">
            🏆 Top Blackout Winners
          </h2>

          {winnerDetails.map((winner, i) => (
            <div
              key={i}
              className="mt-6 bg-white border border-green-400 rounded p-4 shadow-lg"
            >
              <p className="font-semibold text-green-700">
                #{i + 1}: {winner.nickname}
              </p>
              <div className="mt-2 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {winner.cards.map((card, idx) => (
                  <BingoCard key={idx} numbers={card} called={calledNumbers} />
                ))}
              </div>
            </div>
          ))}
        </>
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

      {calledNumbers.length > 0 && (
        <div className="mt-6 w-full max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Called Numbers
          </h2>
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 75 }, (_, i) => i + 1).map((num) => {
              const isCalled = calledNumbers.includes(num);
              return (
                <span
                  key={num}
                  className={`px-3 py-2 text-sm font-medium text-center rounded ${
                    isCalled
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {num}
                </span>
              );
            })}
          </div>
        </div>
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
