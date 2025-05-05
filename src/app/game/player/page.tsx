'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { socket } from '@/lib/socket';
import BingoCard from '@/components/BingoCard';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function generateCard(): number[][] {
  const getColumn = (start: number) =>
    Array.from({ length: 15 }, (_, i) => i + start)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  const cols = [
    getColumn(1),
    getColumn(16),
    getColumn(31),
    getColumn(46),
    getColumn(61),
  ];
  cols[2][2] = 0;
  return cols[0].map((_, i) => cols.map((col) => col[i]));
}

export default function PlayerGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const count = parseInt(searchParams.get('cards') || '1');
  const [cards, setCards] = useState<number[][][]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [nickname, setNickname] = useState('');
  const [winners, setWinners] = useState<string[]>([]);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [players, setPlayers] = useState<string[]>([]);

  useEffect(() => {
    socket.on('player-joined', (playerNickname: string) => {
      setPlayers((prevPlayers) => {
        if (!prevPlayers.includes(playerNickname)) {
          return [...prevPlayers, playerNickname];
        }
        return prevPlayers;
      });
    });

    return () => {
      socket.off('player-joined');
    };
  }, []);

  useEffect(() => {
    const name = searchParams.get('nickname') || 'Player';
    setNickname(name);
  }, [searchParams]);

  useEffect(() => {
    const generated = Array.from({ length: count }, generateCard);
    setCards(generated);

    const name = searchParams.get('nickname') || 'Player';

    socket.emit('player-joined', {
      nickname: name,
      cards: generated,
    });
  }, [count]);

  useEffect(() => {
    if (cards.length > 0) {
      checkBlackout(calledNumbers);
    }
  }, [cards]);

  useEffect(() => {
    socket.on('game-started', () => {
      setGameStarted(true);
      checkBlackout(calledNumbers);
    });

    socket.on('number-called', (num) => {
      setCalledNumbers((prev) => {
        const updated = [...prev, num];
        setTimeout(() => checkBlackout(updated), 0);
        return updated;
      });
    });

    socket.on('winner', (nickname: string) => {
      setWinners((prev) => {
        if (!prev.includes(nickname)) {
          return [...prev, nickname];
        }
        return prev;
      });
    });

    socket.on('game-ended', () => {
      setShowDialog(true);
      setIsGameEnded(true);
    });

    return () => {
      socket.off('game-started');
      socket.off('number-called');
      socket.off('winner');
      socket.off('game-ended');
    };
  }, [calledNumbers]);

  useEffect(() => {
    socket.emit('get-game-status');

    socket.on('game-status', ({ started, calledNumbers, winners }) => {
      setGameStarted(started);
      setCalledNumbers(calledNumbers || []);
      setWinners(winners || []);
    });

    return () => {
      socket.off('game-status');
    };
  }, []);

  useEffect(() => {
    if (!gameStarted || isGameEnded) return;

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
  }, [gameStarted, isGameEnded]);

  const checkBlackout = (calledNumbers: number[]) => {
    cards.forEach((card, i) => {
      const flat = card.flat();
      const unmarked = flat.filter(
        (n) => n !== 0 && !calledNumbers.includes(n)
      );
      if (unmarked.length === 0) {
        socket.emit('check-blackout', {
          id: i,
          card,
          called: calledNumbers,
        });
      }
    });
  };

  return (
    <main className="p-4 w-full max-w-5xl mx-auto space-y-4">
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
        <div className="mt-6 w-full max-w-md text-center mx-auto bg-gray-200 p-4 rounded shadow">
          <h2 className="text-xl font-bold text-red-600">Game Over</h2>
          <p>The game has ended.</p>
          <Button className="mt-4" onClick={() => router.push('/')}>
            Back to Home
          </Button>
        </div>
      )}

      {nickname && (
        <h1 className="text-3xl font-bold text-center text-indigo-700">
          Player: {nickname}
        </h1>
      )}
      <div className="text-center mb-4">
        <p className="text-xl font-semibold text-gray-700">
          {isGameEnded
            ? 'Game has ended.'
            : gameStarted
            ? 'Game in progress...'
            : 'Waiting for game to start...'}
        </p>
      </div>
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
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <BingoCard key={i} numbers={card} called={calledNumbers} />
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogTitle>Game Over</DialogTitle>
          <DialogDescription>The game has ended.</DialogDescription>
        </DialogContent>
      </Dialog>
    </main>
  );
}
