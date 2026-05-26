import React, { useState } from 'react';
import { Video, Copy, Share2 } from 'lucide-react';
import { MD_CONFIG } from '../utils/apiConfig';
import { openWhatsApp } from '../utils/smartUtils';

export default function MeetingRoom() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);

  const generateRoom = () => {
    const id = `mdautomobile-${Math.random().toString(36).substring(2, 10)}`;
    setRoomId(id);
  };

  const meetingUrl = roomId ? `https://meet.jit.si/${roomId}` : '';

  if (joined && roomId) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <iframe
          src={`${meetingUrl}#config.startWithVideoMuted=false&config.startWithAudioMuted=false`}
          allow="camera; microphone; display-capture; fullscreen"
          className="w-full h-full"
        />
        <button onClick={() => setJoined(false)} className="absolute top-4 right-4 bg-red-600 px-4 py-2 rounded">Leave</button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto fade-in">
      <h1 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2"><Video /> Meeting Room</h1>

      <div className="card">
        <h3 className="font-semibold mb-3">Start or Join a Meeting</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Room ID</label>
            <div className="flex gap-2">
              <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Enter or generate room ID" />
              <button onClick={generateRoom} className="btn btn-ghost whitespace-nowrap">Generate</button>
            </div>
          </div>

          {roomId && (
            <div className="card bg-slate-800">
              <div className="text-xs text-slate-400 mb-1">Meeting URL:</div>
              <div className="text-sm break-all text-green-400">{meetingUrl}</div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => { navigator.clipboard.writeText(meetingUrl); alert('Copied!'); }} className="btn btn-ghost text-xs flex items-center gap-1">
                  <Copy size={12} /> Copy
                </button>
                <button onClick={() => openWhatsApp('', `Join ${MD_CONFIG.brandName} meeting: ${meetingUrl}`)} className="btn btn-ghost text-xs flex items-center gap-1">
                  <Share2 size={12} /> Share
                </button>
              </div>
            </div>
          )}

          <button onClick={() => roomId && setJoined(true)} disabled={!roomId} className="btn btn-primary w-full flex items-center justify-center gap-2">
            <Video size={18} /> Join Meeting
          </button>
        </div>

        <div className="text-xs text-slate-500 mt-4">Powered by Jitsi Meet (free, open-source)</div>
      </div>
    </div>
  );
}
