import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Paperclip, Search, Reply, Star, Trash2, Edit2, X,
  Image as ImageIcon, Video, FileText, Mic, MapPin, User,
  Play, Pause, Download, Phone, MoreVertical, Users, UserPlus, UserMinus, Crown
} from 'lucide-react';
import { api, ls } from '../utils/apiConfig';
import { compressImage, formatDate } from '../utils/smartUtils';
import AdminPasswordModal from '../components/AdminPasswordModal';

const DEFAULT_ROOMS = [
  { id: 'general', label: '📢 General' },
  { id: 'sales', label: '💼 Sales' },
  { id: 'service', label: '🔧 Service' },
  { id: 'accounts', label: '💰 Accounts' },
  { id: 'manager', label: '👔 Manager' }
];

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '⚡'];

export default function TeamChat() {
  const user = ls.get('md_user') || { _id: 'me', name: 'Me' };
  const isAdminUser = ['admin', 'owner'].includes(user?.role);
  const [room, setRoom] = useState('general');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [recordTime, setRecordTime] = useState(0);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showStarred, setShowStarred] = useState(false);  // 🆕 Starred filter
  const [notifPermission, setNotifPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  // 🆕 Group/member management state
  const [groups, setGroups] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [allStaff, setAllStaff] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ groupId: '', label: '', icon: '💬', description: '' });
  const lastSeenIdRef = useRef(null);  // Track last seen message for notification trigger
  const bottomRef = useRef();
  const fileImageRef = useRef();
  const fileVideoRef = useRef();
  const fileDocRef = useRef();

  // ========== Push Notification Setup ==========
  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      alert('यह browser notifications support नहीं करता');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        new Notification('🛵 MD Automobile Chat', {
          body: 'Notifications enabled! अब नए messages का alert मिलेगा।',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'md-welcome'
        });
      }
    } catch (err) {
      console.warn('Notification setup failed:', err);
    }
  };

  // Show notification for new message (only if doc hidden + not sent by self)
  const notifyNewMessage = (msg) => {
    if (notifPermission !== 'granted') return;
    if (msg.senderId === user._id) return;  // Don't notify own messages
    if (!document.hidden) return;  // Only when tab/app not active
    try {
      const body = msg.type === 'image' ? '📷 Photo' :
                   msg.type === 'video' ? '🎥 Video' :
                   msg.type === 'voice' ? '🎤 Voice note' :
                   msg.type === 'document' ? `📄 ${msg.fileName || 'Document'}` :
                   msg.type === 'location' ? '📍 Location' :
                   (msg.text || '').slice(0, 100);

      // Try service worker first (for background), fallback to browser
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(`💬 ${msg.senderName || 'Team'}`, {
            body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
            tag: `msg-${msg._id}`, vibrate: [100, 50, 100],
            data: { url: '/team-chat', messageId: msg._id }
          });
        });
      } else {
        new Notification(`💬 ${msg.senderName || 'Team'}`, {
          body, icon: '/icons/icon-192.png', tag: `msg-${msg._id}`
        });
      }
    } catch (err) { console.warn('Notify failed:', err); }
  };

  // ========== Load & subscribe to messages ==========
  const loadMessages = async () => {
    setLoading(true);
    try {
      const raw = await api.get(`/api/messages/${room}`);
      const data = Array.isArray(raw) ? raw : (raw?.messages || []);

      // ── Check for NEW messages since last poll → fire notification ──
      const lastId = lastSeenIdRef.current;
      if (lastId && data.length > 0) {
        const newMessages = [];
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i]._id === lastId) break;
          newMessages.unshift(data[i]);
        }
        // Notify for each new message (except own)
        newMessages.forEach(m => {
          if (m.senderId !== user._id) notifyNewMessage(m);
        });
      }
      // Update last seen
      if (data.length > 0) {
        lastSeenIdRef.current = data[data.length - 1]._id;
      }

      setMessages(data);
      // Mark all as read
      data.forEach(m => {
        if (m.senderId !== user._id && !m.readBy?.find(r => r.userId === user._id)) {
          api.patch(`/api/messages/${room}/${m._id}/read`, { userId: user._id }).catch(() => {});
        }
      });
    } finally { setLoading(false); }
  };

  const loadUnreadCounts = async () => {
    try { setUnreadCounts(await api.get(`/api/messages/unread/${user._id}`)); }
    catch {}
  };

  // ========== Group / Members Management ==========
  const loadGroups = async () => {
    try {
      const data = await api.get('/api/chat-groups');
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Groups load failed:', err.message);
    }
  };

  const loadAllStaff = async () => {
    try {
      const data = await api.get('/api/staff');
      const list = Array.isArray(data) ? data : (data?.staff || []);
      setAllStaff(list);
    } catch {
      setAllStaff([]);
    }
  };

  const addMemberToRoom = async (staff) => {
    try {
      await api.post(`/api/chat-groups/${room}/members`, {
        userId: staff._id,
        userName: staff.name || staff.userName,
        role: staff.role || 'staff'
      });
      await loadGroups();
    } catch (err) {
      alert('❌ ' + (err.message || 'Failed to add'));
    }
  };

  const removeMemberFromRoom = async (memberId, memberName) => {
    if (!confirm(`${memberName} को इस group से हटाएं?`)) return;
    try {
      await api.delete(`/api/chat-groups/${room}/members/${memberId}`);
      await loadGroups();
    } catch (err) {
      alert('❌ ' + (err.message || 'Failed to remove'));
    }
  };

  const toggleGroupAdmin = async (memberId, currentlyAdmin) => {
    try {
      await api.patch(`/api/chat-groups/${room}/admins/${memberId}`, { isAdmin: !currentlyAdmin });
      await loadGroups();
    } catch (err) {
      alert('❌ ' + (err.message || 'Failed'));
    }
  };

  const createNewGroup = async () => {
    if (!newGroupForm.groupId || !newGroupForm.label) { alert('Group ID और Name ज़रूरी है'); return; }
    if (!/^[a-z0-9-]+$/.test(newGroupForm.groupId)) { alert('Group ID सिर्फ lowercase letters, numbers, dash use करे'); return; }
    try {
      await api.post('/api/chat-groups', { ...newGroupForm, createdBy: user._id });
      await loadGroups();
      setShowNewGroup(false);
      setNewGroupForm({ groupId: '', label: '', icon: '💬', description: '' });
      setRoom(newGroupForm.groupId);
    } catch (err) {
      alert('❌ ' + (err.message || 'Failed to create'));
    }
  };

  const deleteGroup = async (groupId, groupLabel) => {
    const defaultIds = ['general', 'sales', 'service', 'accounts', 'manager'];
    if (defaultIds.includes(groupId)) { alert('Default groups को delete नहीं कर सकते'); return; }
    if (!confirm(`Group "${groupLabel}" delete करें? Messages भी delete हो जाएंगे।`)) return;
    try {
      await api.delete(`/api/chat-groups/${groupId}`);
      await loadGroups();
      setRoom('general');
    } catch (err) {
      alert('❌ ' + (err.message || 'Failed'));
    }
  };

  // Build activeRooms list — DEFAULT_ROOMS + any custom groups from server
  const activeRooms = groups.length > 0
    ? groups.map(g => ({ id: g.groupId, label: `${g.icon || '💬'} ${g.label}`, isCustom: !['general','sales','service','accounts','manager'].includes(g.groupId) }))
    : DEFAULT_ROOMS;

  // Current room's group details
  const currentGroup = groups.find(g => g.groupId === room) || { members: [], admins: [] };
  const currentMembers = Array.isArray(currentGroup.members) ? currentGroup.members : [];
  const memberIds = new Set(currentMembers.map(m => m.userId));
  const filteredStaff = allStaff.filter(s => {
    if (memberIds.has(s._id)) return false; // already a member
    if (!staffSearch) return true;
    const q = staffSearch.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) || (s.role || '').toLowerCase().includes(q);
  });

  useEffect(() => {
    loadMessages();
    loadUnreadCounts();
    const i = setInterval(() => { loadMessages(); loadUnreadCounts(); }, 5000);
    return () => clearInterval(i);
  }, [room]);

  // Load groups on mount + when room changes
  useEffect(() => {
    loadGroups();
    loadAllStaff();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ========== Send actions ==========
  const sendMessage = async (overrides = {}) => {
    if (editing) {
      await api.patch(`/api/messages/${room}/${editing._id}/edit`, { text });
      setEditing(null);
      setText('');
      loadMessages();
      return;
    }

    const body = {
      senderId: user._id, senderName: user.name,
      type: 'text', text,
      replyTo: replyTo ? { messageId: replyTo._id, senderName: replyTo.senderName, text: replyTo.text, type: replyTo.type } : null,
      ...overrides
    };

    if (body.type === 'text' && !body.text?.trim()) return;

    await api.post(`/api/messages/${room}`, body);
    setText('');
    setReplyTo(null);
    loadMessages();
  };

  // ========== Image upload (with compression) ==========
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setShowAttachMenu(false);

    try {
      // Step 1: Read File to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // Step 2: Compress the base64 (compressImage expects a base64 data URL)
      const compressedBase64 = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const maxWidth = 1200;
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          } catch (e) {
            reject(new Error('Compression failed: ' + e.message));
          }
        };
        img.onerror = () => reject(new Error('Image format invalid or corrupt'));
        img.src = base64;
      });

      // Step 3: Send compressed image directly
      await sendMessage({
        type: 'image',
        text: '📷 Photo',
        mediaUrl: compressedBase64,
        mediaType: 'image/jpeg',
        mediaSize: compressedBase64.length,
        fileName: file.name
      });
    } catch (err) {
      const msg = err?.message || (typeof err === 'string' ? err : 'Unknown error');
      alert('Image upload failed: ' + msg);
      console.error('Image upload error:', err);
    }
    e.target.value = '';
  };

  // ========== Video upload ==========
  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setShowAttachMenu(false);

    if (file.size > 25 * 1024 * 1024) {
      alert('Video size 25MB से ज़्यादा है, छोटा video भेजें');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      await sendMessage({
        type: 'video',
        text: '🎥 Video',
        mediaUrl: ev.target.result,
        mediaType: file.type,
        mediaSize: file.size,
        fileName: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ========== Document upload ==========
  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setShowAttachMenu(false);

    if (file.size > 10 * 1024 * 1024) {
      alert('Document size 10MB से ज़्यादा है');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      await sendMessage({
        type: 'document',
        text: `📄 ${file.name}`,
        mediaUrl: ev.target.result,
        mediaType: file.type,
        mediaSize: file.size,
        fileName: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ========== Location sharing ==========
  const shareLocation = () => {
    setShowAttachMenu(false);
    if (!navigator.geolocation) return alert('Location not supported');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await sendMessage({
        type: 'location',
        text: '📍 Location',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        locationName: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
      });
    }, (err) => alert('Location error: ' + err.message));
  };

  // ========== Contact share ==========
  const shareContact = async () => {
    setShowAttachMenu(false);
    const name = prompt('Contact name:');
    if (!name) return;
    const phone = prompt('Contact phone:');
    if (!phone) return;
    await sendMessage({
      type: 'contact',
      text: `👤 ${name}: ${phone}`
    });
  };

  // ========== Voice recording ==========
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());

        const reader = new FileReader();
        reader.onload = async (ev) => {
          await sendMessage({
            type: 'voice',
            text: `🎤 Voice (${recordTime}s)`,
            mediaUrl: ev.target.result,
            mediaType: 'audio/webm',
            mediaSize: blob.size,
            duration: recordTime
          });
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      setRecorder(mr);
      setRecording(true);
      setRecordTime(0);

      const timer = setInterval(() => setRecordTime(t => t + 1), 1000);
      mr._timer = timer;
    } catch (err) {
      alert('Microphone access नहीं मिला: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (recorder) {
      clearInterval(recorder._timer);
      recorder.stop();
      setRecording(false);
      setRecorder(null);
    }
  };

  const cancelRecording = () => {
    if (recorder) {
      clearInterval(recorder._timer);
      recorder.stream.getTracks().forEach(t => t.stop());
      recorder.stop = () => {}; // prevent send
      setRecording(false);
      setRecorder(null);
      setRecordTime(0);
    }
  };

  // ========== Message actions ==========
  const toggleStar = async (msg) => {
    const isStarred = msg.starredBy?.includes(user._id);
    await api.patch(`/api/messages/${room}/${msg._id}/star`, { userId: user._id, starred: !isStarred });
    loadMessages();
  };

  const reactToMessage = async (msg, emoji) => {
    const existing = msg.reactions?.find(r => r.userId === user._id);
    const newEmoji = existing?.emoji === emoji ? null : emoji;
    await api.patch(`/api/messages/${room}/${msg._id}/react`, { userId: user._id, emoji: newEmoji });
    loadMessages();
  };

  const doDelete = async () => {
    await api.delete(`/api/messages/${room}/${confirmDelete._id}`);
    setConfirmDelete(null);
    loadMessages();
  };

  const forwardMessage = async (msg) => {
    const targetRoom = prompt(`Forward to room (${activeRooms.map(r => r.id).join(', ')}):`, 'sales');
    if (!targetRoom || !activeRooms.find(r => r.id === targetRoom)) return;
    await api.post(`/api/messages/${targetRoom}`, {
      senderId: user._id, senderName: user.name,
      type: msg.type, text: msg.text, mediaUrl: msg.mediaUrl, mediaType: msg.mediaType,
      forwardedFrom: msg.senderName
    });
    alert('✅ Forwarded to ' + targetRoom);
  };

  // ── Compute filtered messages ──
  let filtered = messages;
  if (showStarred) {
    filtered = filtered.filter(m => Array.isArray(m.starredBy) && m.starredBy.includes(user._id));
  }
  if (search) {
    filtered = filtered.filter(m =>
      (m.text || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.senderName || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.fileName || '').toLowerCase().includes(search.toLowerCase())
    );
  }

  const starredCount = messages.filter(m => Array.isArray(m.starredBy) && m.starredBy.includes(user._id)).length;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Room selector */}
      <div className="flex gap-1 px-4 py-2 overflow-x-auto bg-slate-900 items-center">
        {activeRooms.map(r => (
          <button key={r.id} onClick={() => setRoom(r.id)}
            className={`px-3 py-1 rounded text-sm whitespace-nowrap relative ${room === r.id ? 'bg-green-700' : 'bg-slate-800'}`}>
            {r.label}
            {unreadCounts[r.id] > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCounts[r.id]}</span>
            )}
          </button>
        ))}
        {/* Members button */}
        <button
          onClick={() => setShowMembers(true)}
          className="px-2 py-1 rounded text-sm whitespace-nowrap bg-blue-700 flex items-center gap-1 ml-1"
          title="Group Members"
        >
          <Users size={14} /> <span className="text-xs">{currentMembers.length}</span>
        </button>
        {/* New Group button (admin only) */}
        {isAdminUser && (
          <button
            onClick={() => setShowNewGroup(true)}
            className="px-2 py-1 rounded text-sm whitespace-nowrap bg-purple-700 flex items-center gap-1"
            title="नया Group बनाएं"
          >
            +
          </button>
        )}
      </div>

      {/* Search bar + Starred filter + Notification toggle */}
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Search size={16} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages, sender, file..." className="text-sm flex-1 bg-transparent outline-none text-white" />
        </div>
        {/* Starred filter toggle */}
        <button
          onClick={() => setShowStarred(!showStarred)}
          className={`p-1.5 rounded relative ${showStarred ? 'bg-yellow-600' : 'bg-slate-800'}`}
          title={showStarred ? 'सब messages दिखाएं' : `⭐ Starred (${starredCount})`}
        >
          <Star size={16} fill={showStarred ? 'currentColor' : 'none'} />
          {starredCount > 0 && !showStarred && (
            <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{starredCount}</span>
          )}
        </button>
        {/* Notification permission toggle */}
        {notifPermission !== 'granted' && (
          <button
            onClick={enableNotifications}
            className="p-1.5 rounded bg-blue-700"
            title="Notifications enable करें"
          >
            🔔
          </button>
        )}
        {notifPermission === 'granted' && (
          <div className="p-1.5 rounded bg-green-700" title="Notifications ON">
            🔔
          </div>
        )}
      </div>

      {/* Starred banner */}
      {showStarred && (
        <div className="px-4 py-1.5 bg-yellow-900/40 text-yellow-200 text-xs flex justify-between items-center">
          <span>⭐ Starred Messages ({filtered.length})</span>
          <button onClick={() => setShowStarred(false)} className="underline">सब देखें</button>
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-950">
        {loading && messages.length === 0 ? <div className="text-center text-slate-400">Loading...</div> :
         filtered.length === 0 ? <div className="text-center text-slate-500 py-8">कोई messages नहीं। Hi बोलो!</div> :
         filtered.map(m => {
           const mine = m.senderId === user._id;
           return (
             <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
               <div className={`max-w-[75%] rounded-lg p-2 ${mine ? 'bg-green-700' : 'bg-slate-800'}`}>
                 {!mine && <div className="text-xs text-green-300 font-semibold">{m.senderName}</div>}
                 {m.forwardedFrom && <div className="text-xs italic opacity-70">⤴ Forwarded from {m.forwardedFrom}</div>}

                 {m.replyTo && (
                   <div className="text-xs bg-black/30 p-1 rounded mb-1 border-l-2 border-green-500">
                     <div className="font-semibold">{m.replyTo.senderName}</div>
                     <div className="opacity-75 truncate">{m.replyTo.text}</div>
                   </div>
                 )}

                 {/* Render based on type */}
                 {m.type === 'image' && m.mediaUrl && (
                   <img src={m.mediaUrl} alt="" onClick={() => setPreviewMedia(m)} className="max-w-full rounded cursor-pointer mb-1" style={{ maxHeight: 200 }} />
                 )}
                 {m.type === 'video' && m.mediaUrl && (
                   <video src={m.mediaUrl} controls className="max-w-full rounded mb-1" style={{ maxHeight: 200 }} />
                 )}
                 {m.type === 'voice' && m.mediaUrl && (
                   <audio src={m.mediaUrl} controls className="max-w-full mb-1" />
                 )}
                 {m.type === 'document' && m.mediaUrl && (
                   <a href={m.mediaUrl} download={m.fileName} className="flex items-center gap-2 p-2 bg-black/30 rounded mb-1 hover:bg-black/40">
                     <FileText size={20} /> <span className="text-sm">{m.fileName}</span> <Download size={14} className="ml-auto" />
                   </a>
                 )}
                 {m.type === 'location' && m.latitude && (
                   <a href={`https://maps.google.com/?q=${m.latitude},${m.longitude}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-black/30 rounded mb-1 hover:bg-black/40">
                     <MapPin size={20} /> <span className="text-sm">{m.locationName}</span>
                   </a>
                 )}

                 <div className="text-sm whitespace-pre-wrap">{m.type !== 'text' ? '' : m.text}</div>
                 {m.edited && <div className="text-[10px] opacity-60 italic">edited</div>}

                 {m.reactions?.length > 0 && (
                   <div className="flex gap-1 mt-1 flex-wrap">
                     {m.reactions.map((r, i) => <span key={i} className="text-xs bg-black/30 rounded px-1">{r.emoji}</span>)}
                   </div>
                 )}

                 <div className="text-[10px] opacity-60 mt-1 flex items-center gap-1">
                   {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   {mine && <span>{m.readBy?.length > 0 ? '✓✓' : '✓'}</span>}
                 </div>

                 <div className="opacity-0 group-hover:opacity-100 transition flex gap-1 mt-1 text-xs flex-wrap">
                   <button onClick={() => setReplyTo(m)} title="Reply"><Reply size={12} /></button>
                   <button onClick={() => forwardMessage(m)} title="Forward">⤴</button>
                   <button onClick={() => toggleStar(m)} title="Star">
                     <Star size={12} className={m.starredBy?.includes(user._id) ? 'text-yellow-400 fill-yellow-400' : ''} />
                   </button>
                   {mine && m.type === 'text' && <button onClick={() => { setEditing(m); setText(m.text); }}><Edit2 size={12} /></button>}
                   {mine && <button onClick={() => setConfirmDelete(m)}><Trash2 size={12} /></button>}
                   {EMOJIS.slice(0, 4).map(e => <button key={e} onClick={() => reactToMessage(m, e)}>{e}</button>)}
                 </div>
               </div>
             </div>
           );
         })}
        <div ref={bottomRef} />
      </div>

      {/* Reply / Edit preview */}
      {(replyTo || editing) && (
        <div className="px-4 py-2 bg-slate-800 flex items-center justify-between">
          <div className="text-xs">
            {editing ? '✏️ Editing message' : `↩️ Reply to ${replyTo.senderName}: ${replyTo.text?.slice(0, 60)}`}
          </div>
          <button onClick={() => { setReplyTo(null); setEditing(null); setText(''); }}><X size={14} /></button>
        </div>
      )}

      {/* Attach menu */}
      {showAttachMenu && (
        <div className="px-4 py-3 bg-slate-800 border-t border-slate-700">
          <div className="grid grid-cols-5 gap-2">
            <button onClick={() => fileImageRef.current?.click()} className="flex flex-col items-center p-2 rounded bg-purple-700 hover:bg-purple-600">
              <ImageIcon size={20} /> <span className="text-[10px] mt-1">Photo</span>
            </button>
            <button onClick={() => fileVideoRef.current?.click()} className="flex flex-col items-center p-2 rounded bg-red-700 hover:bg-red-600">
              <Video size={20} /> <span className="text-[10px] mt-1">Video</span>
            </button>
            <button onClick={() => fileDocRef.current?.click()} className="flex flex-col items-center p-2 rounded bg-blue-700 hover:bg-blue-600">
              <FileText size={20} /> <span className="text-[10px] mt-1">Doc</span>
            </button>
            <button onClick={shareLocation} className="flex flex-col items-center p-2 rounded bg-green-700 hover:bg-green-600">
              <MapPin size={20} /> <span className="text-[10px] mt-1">Location</span>
            </button>
            <button onClick={shareContact} className="flex flex-col items-center p-2 rounded bg-yellow-700 hover:bg-yellow-600">
              <User size={20} /> <span className="text-[10px] mt-1">Contact</span>
            </button>
          </div>
          <input type="file" ref={fileImageRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
          <input type="file" ref={fileVideoRef} accept="video/*" onChange={handleVideoUpload} className="hidden" />
          <input type="file" ref={fileDocRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleDocUpload} className="hidden" />
        </div>
      )}

      {/* Input area */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        {recording ? (
          <div className="flex items-center justify-between gap-2 p-2 bg-red-900/30 rounded">
            <div className="flex items-center gap-2 text-red-400">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm">Recording... {recordTime}s</span>
            </div>
            <div className="flex gap-2">
              <button onClick={cancelRecording} className="btn btn-ghost text-xs">Cancel</button>
              <button onClick={stopRecording} className="btn btn-primary text-xs">Send</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <button onClick={() => setShowAttachMenu(!showAttachMenu)} className="btn btn-ghost p-2"><Paperclip size={18} /></button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Message..."
              rows="1"
              className="flex-1 resize-none"
            />
            {text.trim() ? (
              <button onClick={() => sendMessage()} className="btn btn-primary p-2"><Send size={18} /></button>
            ) : (
              <button onClick={startRecording} className="btn btn-primary p-2"><Mic size={18} /></button>
            )}
          </div>
        )}
      </div>

      {/* Image preview modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewMedia(null)}>
          <button onClick={() => setPreviewMedia(null)} className="absolute top-4 right-4 text-white"><X size={24} /></button>
          <img src={previewMedia.mediaUrl} alt="" className="max-w-full max-h-full" />
        </div>
      )}

      {/* Delete confirmation (admin gated) */}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete message"
          itemName={`${confirmDelete.senderName}: ${(confirmDelete.text || '').slice(0, 40)}`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* === Group Members Modal === */}
      {showMembers && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowMembers(false)}>
          <div className="bg-slate-900 rounded-xl p-4 w-full max-w-md mt-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-green-400 font-bold flex items-center gap-2">
                <Users size={18} /> Members — {activeRooms.find(r => r.id === room)?.label || room}
              </h3>
              <button onClick={() => setShowMembers(false)} className="text-white"><X size={20} /></button>
            </div>

            {/* Delete group (custom only, admin only) */}
            {isAdminUser && currentGroup.groupId && !['general','sales','service','accounts','manager'].includes(room) && (
              <button
                onClick={() => { deleteGroup(room, currentGroup.label); setShowMembers(false); }}
                className="w-full mb-3 bg-red-700 text-white py-2 rounded text-sm"
              >
                🗑️ Delete this Group
              </button>
            )}

            {/* Current Members */}
            <div className="mb-4">
              <div className="text-xs text-slate-400 mb-2">👥 Current Members ({currentMembers.length})</div>
              {currentMembers.length === 0 ? (
                <div className="text-slate-500 text-sm italic py-2">अभी कोई member नहीं है</div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {currentMembers.map(m => {
                    const isGroupAdmin = currentGroup.admins?.includes(m.userId);
                    return (
                      <div key={m.userId} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                        <div className="flex-1">
                          <div className="text-sm text-white flex items-center gap-1">
                            {m.userName}
                            {isGroupAdmin && <Crown size={12} className="text-yellow-400" />}
                          </div>
                          <div className="text-xs text-slate-400">{m.role || 'staff'}</div>
                        </div>
                        {isAdminUser && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => toggleGroupAdmin(m.userId, isGroupAdmin)}
                              className={`p-1 rounded ${isGroupAdmin ? 'bg-yellow-700' : 'bg-slate-700'}`}
                              title={isGroupAdmin ? 'Remove admin' : 'Make admin'}
                            >
                              <Crown size={12} />
                            </button>
                            <button
                              onClick={() => removeMemberFromRoom(m.userId, m.userName)}
                              className="p-1 rounded bg-red-700"
                              title="Remove from group"
                            >
                              <UserMinus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Members (admin only) */}
            {isAdminUser && (
              <div>
                <div className="text-xs text-slate-400 mb-2">➕ Add Members</div>
                <input
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="🔍 Staff search..."
                  className="w-full px-3 py-2 bg-slate-800 text-white text-sm rounded mb-2 outline-none"
                />
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {filteredStaff.length === 0 ? (
                    <div className="text-slate-500 text-sm italic py-2 text-center">कोई staff उपलब्ध नहीं</div>
                  ) : (
                    filteredStaff.map(s => (
                      <div key={s._id} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                        <div className="flex-1">
                          <div className="text-sm text-white">{s.name}</div>
                          <div className="text-xs text-slate-400">{s.role || 'staff'}</div>
                        </div>
                        <button
                          onClick={() => addMemberToRoom(s)}
                          className="px-3 py-1 bg-green-700 text-white text-xs rounded flex items-center gap-1"
                        >
                          <UserPlus size={12} /> Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {!isAdminUser && (
              <div className="text-xs text-slate-500 italic text-center mt-4">
                सिर्फ Admin members add/remove कर सकते हैं
              </div>
            )}
          </div>
        </div>
      )}

      {/* === New Group Modal (admin only) === */}
      {showNewGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowNewGroup(false)}>
          <div className="bg-slate-900 rounded-xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-green-400 font-bold">➕ नया Group बनाएं</h3>
              <button onClick={() => setShowNewGroup(false)} className="text-white"><X size={20} /></button>
            </div>
            <label className="block text-xs text-slate-400 mt-2 mb-1">Group ID (lowercase, no spaces)</label>
            <input
              value={newGroupForm.groupId}
              onChange={(e) => setNewGroupForm({ ...newGroupForm, groupId: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="e.g. delivery-team"
              className="w-full px-3 py-2 bg-slate-800 text-white text-sm rounded outline-none"
            />
            <label className="block text-xs text-slate-400 mt-2 mb-1">Group Name</label>
            <input
              value={newGroupForm.label}
              onChange={(e) => setNewGroupForm({ ...newGroupForm, label: e.target.value })}
              placeholder="e.g. Delivery Team"
              className="w-full px-3 py-2 bg-slate-800 text-white text-sm rounded outline-none"
            />
            <label className="block text-xs text-slate-400 mt-2 mb-1">Icon (emoji)</label>
            <input
              value={newGroupForm.icon}
              onChange={(e) => setNewGroupForm({ ...newGroupForm, icon: e.target.value })}
              placeholder="📦"
              maxLength={4}
              className="w-full px-3 py-2 bg-slate-800 text-white text-sm rounded outline-none"
            />
            <label className="block text-xs text-slate-400 mt-2 mb-1">Description (optional)</label>
            <input
              value={newGroupForm.description}
              onChange={(e) => setNewGroupForm({ ...newGroupForm, description: e.target.value })}
              placeholder="क्या काम के लिए..."
              className="w-full px-3 py-2 bg-slate-800 text-white text-sm rounded outline-none"
            />
            <button
              onClick={createNewGroup}
              className="w-full mt-4 bg-green-700 text-white py-2 rounded font-bold"
            >
              💾 Create Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
