'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { socket } from '@/lib/socket';

export default function PlayerSetup() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [cards, setCards] = useState(1);
  const [showDialog, setShowDialog] = useState(false);

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
  };

  const confirm = () => {
    socket.emit('set-nickname', nickname);
    router.push(`/game/player?nickname=${nickname}&cards=${cards}`);
  };

  return (
    <main className="p-6 text-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setShowDialog(true);
        }}
        className="space-y-4"
      >
        <p className="text-2xl mb-4">
          How many cards do you want to play with?
        </p>

        <Input
          type="text"
          placeholder="Enter your preferred nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
          className="max-w-md mx-auto"
        />

        <select
          value={cards}
          onChange={(e) => setCards(Number(e.target.value))}
          className="border px-3 py-2 rounded mr-2"
        >
          {[...Array(20)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>

        <Button type="submit" className="mt-4">
          Confirm
        </Button>
      </form>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogTitle className="sr-only">Confirm Card Selection</DialogTitle>
          <p>Are you sure you want {cards} card(s)?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setShowDialog(false)}>No</Button>
            <Button onClick={confirm}>Yes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
