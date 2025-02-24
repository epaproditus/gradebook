'use client';

import { useState, useEffect } from 'react';
import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Predefined set of seeds to create consistent but varied avatars
const AVATAR_SEEDS = [
  'Felix', 'Luna', 'Nova', 'Atlas', 'Sage',
  'Echo', 'Milo', 'Cleo', 'Zeus', 'Iris',
  'Leo', 'Maya', 'Finn', 'Zara', 'Kai',
  'Aria', 'Rex', 'Nora', 'Axel', 'Vera'
];

interface AvatarPickerProps {
  currentAvatar: string;
  onSave: (avatar: string) => void;
}

export function AvatarPicker({ currentAvatar, onSave }: AvatarPickerProps) {
  const [selected, setSelected] = useState(currentAvatar || AVATAR_SEEDS[0]);
  const [avatarUri, setAvatarUri] = useState<string>('');
  const [selectedAvatarUris, setSelectedAvatarUris] = useState<Record<string, string>>({});

  // Generate avatar URI when selected changes
  useEffect(() => {
    const generateAvatar = async () => {
      const uri = await createAvatar(adventurer, { seed: selected }).toDataUri();
      setAvatarUri(uri);
    };
    generateAvatar();
  }, [selected]);

  // Generate URIs for all avatar options
  useEffect(() => {
    const generateAvatars = async () => {
      const uris: Record<string, string> = {};
      for (const seed of AVATAR_SEEDS) {
        uris[seed] = await createAvatar(adventurer, { seed }).toDataUri();
      }
      setSelectedAvatarUris(uris);
    };
    generateAvatars();
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-32 h-32 p-0 rounded-full hover:bg-zinc-800 overflow-hidden"
        >
          {avatarUri && (
            <img
              src={avatarUri}
              alt="Avatar"
              className="w-full h-full object-contain"
            />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose Your Avatar</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-4 p-4">
          {AVATAR_SEEDS.map((seed) => (
            <Button
              key={seed}
              variant="ghost"
              className={`w-16 h-16 p-0 rounded-full hover:bg-zinc-800 overflow-hidden ${
                selected === seed ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
              onClick={() => {
                setSelected(seed);
                onSave(seed);
              }}
            >
              {selectedAvatarUris[seed] && (
                <img
                  src={selectedAvatarUris[seed]}
                  alt={`Avatar ${seed}`}
                  className="w-full h-full object-contain"
                />
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
