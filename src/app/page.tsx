'use client';
import { Button } from '@/components/ui/button';
import { socket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [gameStarted, setGameStarted] = useState(false);
  const [adminExists, setAdminExists] = useState(false);

  useEffect(() => {
    socket.emit('get-game-status');
    socket.emit('check-admin');

    socket.on('game-status', (status) => {
      setGameStarted(status.started);
    });

    socket.on('admin-status', ({ exists }) => {
      console.log('Admin exists:', exists);
      setAdminExists(exists);
    });

    return () => {
      socket.emit('leave-admin');
      socket.off('game-status');
      socket.off('admin-status');
    };
  }, []);

  return (
    <main className="h-screen flex flex-col justify-center items-center space-y-4">
      <h1 className="text-4xl font-bold">Bingo Game</h1>
      {gameStarted ? (
        <div className="text-red-500">
          <h2 className="text-3xl font-semibold mb-2">
            🚨 Game Already In Progress
          </h2>
          <p className="text-lg">
            The Bingo game has already started. Please wait for the next round.
          </p>
          <p className="text-sm mt-1">
            Reload the page or return later to join a new game.
          </p>
        </div>
      ) : (
        <>
          <Button
            onClick={() => router.push('/admin')}
            disabled={adminExists}
            variant={adminExists ? 'secondary' : 'default'}
          >
            {adminExists ? 'Admin Already Joined' : 'Run as Admin'}
          </Button>
          <Button onClick={() => router.push('/player')}>Join as Player</Button>
        </>
      )}
    </main>
  );
}
