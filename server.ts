import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { createServer } from "http";
import { db } from "./src/firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, getDocs, query, orderBy, addDoc, limit, deleteDoc } from "firebase/firestore";
import webpush from "web-push";

interface SendMessageData {
  from: string;
  to: string;
  message: {
    id: string;
    text?: string;
    imageUrl?: string;
    type: string;
    senderId: string;
    timestamp: number;
    status: string;
    reactions: Record<string, string[]>;
    comments: any[];
    replyTo?: { id: string; text: string; senderId: string };
  };
}

interface UpdateMessageData {
  from: string;
  to: string;
  messageId: string;
  updates: Record<string, unknown>;
}

interface BondData {
  targetCode: string;
  user: { id: string; name: string; seedCode: string };
}

interface MoodData {
  to: string;
  mood: string;
}

interface UserUpdateData {
  to: string;
  user: Record<string, unknown>;
}

interface LeafData {
  to: string;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  type?: string;
  soundMode?: string;
  soundId?: string;
  url?: string;
}

interface NotificationPreferences {
  messages: boolean;
  mood: boolean;
  leaf: boolean;
  pet: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  soundMode: string;
  soundId: string;
}

interface JoinBondUser {
  id: string;
  seedCode: string;
  mood: string;
  [key: string]: unknown;
}

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidContactEmail = process.env.VAPID_CONTACT_EMAIL;

if (!vapidPublicKey || !vapidPrivateKey || !vapidContactEmail) {
  throw new Error('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_CONTACT_EMAIL environment variables must be set.');
}

webpush.setVapidDetails(
  vapidContactEmail,
  vapidPublicKey,
  vapidPrivateKey
);

function getPairId(code1: string, code2: string) {
  return [code1, code2].sort().join('_');
}

// ─── Quiet Hours Check ──────────────────────────────────────────────

function isInQuietHours(prefs: NotificationPreferences, timezoneOffset?: number): boolean {
  if (!prefs.quietHoursEnabled) return false;

  const now = new Date();

  // Adjust for user's timezone if offset provided
  // timezoneOffset is in minutes (e.g., -420 for UTC+7)
  if (timezoneOffset !== undefined) {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const userTime = new Date(utcMs - timezoneOffset * 60000);
    return isTimeBetween(
      `${String(userTime.getHours()).padStart(2, '0')}:${String(userTime.getMinutes()).padStart(2, '0')}`,
      prefs.quietHoursStart,
      prefs.quietHoursEnd
    );
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return isTimeBetween(currentTime, prefs.quietHoursStart, prefs.quietHoursEnd);
}

function isTimeBetween(current: string, start: string, end: string): boolean {
  // Handle overnight ranges (e.g., 22:00 to 07:00)
  if (start <= end) {
    return current >= start && current <= end;
  } else {
    return current >= start || current <= end;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = process.env.PORT || 8080;
  const httpServer = createServer(app);
  
  app.get("/api/vapidPublicKey", (req, res) => {
    res.send(vapidPublicKey);
  });
  
  app.post("/api/subscribe", async (req, res) => {
    const { subscription, userId } = req.body;
    try {
      await setDoc(doc(db, "push_subscriptions", userId), { subscription });
      res.status(201).json({});
    } catch (e) {
      console.error("Error saving subscription:", e);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  // ─── Notification Preferences API ────────────────────────────
  app.post("/api/notification-preferences", async (req, res) => {
    const { userId, preferences, timezoneOffset } = req.body;
    if (!userId || !preferences) {
      return res.status(400).json({ error: "userId and preferences required" });
    }
    try {
      await setDoc(doc(db, "notification_preferences", userId), {
        ...preferences,
        timezoneOffset: timezoneOffset ?? 0,
        updatedAt: Date.now(),
      });
      res.status(200).json({ success: true });
    } catch (e) {
      console.error("Error saving notification preferences:", e);
      res.status(500).json({ error: "Failed to save preferences" });
    }
  });

  app.get("/api/notification-preferences/:userId", async (req, res) => {
    try {
      const docSnap = await getDoc(doc(db, "notification_preferences", req.params.userId));
      if (docSnap.exists()) {
        res.json(docSnap.data());
      } else {
        res.json(null);
      }
    } catch (e) {
      console.error("Error fetching notification preferences:", e);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // ─── Enhanced Push Notification Sender ────────────────────────

  const sendPushNotification = async (
    userId: string,
    payload: PushPayload,
    notificationType: string = 'general'
  ) => {
    try {
      // Check user's notification preferences
      const prefsSnap = await getDoc(doc(db, "notification_preferences", userId));
      if (prefsSnap.exists()) {
        const prefs = prefsSnap.data() as NotificationPreferences & { timezoneOffset?: number };

        // Check per-type toggle
        const typeKey = notificationType as keyof Pick<NotificationPreferences, 'messages' | 'mood' | 'leaf' | 'pet'>;
        if (typeKey in prefs && prefs[typeKey] === false) {
          console.log(`Notification skipped: ${notificationType} disabled for user ${userId}`);
          return;
        }

        // Check quiet hours
        if (isInQuietHours(prefs, prefs.timezoneOffset)) {
          console.log(`Notification skipped: quiet hours active for user ${userId}`);
          return;
        }

        // Attach sound preferences to payload
        payload.soundMode = prefs.soundMode || 'default';
        payload.soundId = prefs.soundId || 'gentle_bloom';
      }

      // Add notification type to payload
      const enrichedPayload = {
        ...payload,
        type: notificationType,
      };

      const subSnap = await getDoc(doc(db, "push_subscriptions", userId));
      if (subSnap.exists()) {
        const data = subSnap.data();
        if (data && data.subscription) {
          await webpush.sendNotification(data.subscription, JSON.stringify(enrichedPayload));
        }
      }
    } catch (e: any) {
      // Handle stale subscriptions (410 Gone or 404 Not Found)
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        console.log(`Removing stale push subscription for user ${userId}`);
        try {
          await deleteDoc(doc(db, "push_subscriptions", userId));
        } catch (delErr) {
          console.error("Error deleting stale subscription:", delErr);
        }
      } else {
        console.error("Error sending push to", userId, e);
      }
    }
  };

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.APP_URL || 'http://localhost:5173',
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e7
  });

  // Basic in-memory store
  const connectedUsers = new Map<string, JoinBondUser>(); // socketId -> userData
  const partnerCodes = new Map<string, string>(); // userCode -> partnerCode
  const latestMoods = new Map<string, string>(); // userCode -> mood

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_bond', async (data: { user: JoinBondUser, partnerCode?: string }) => {
      const { user, partnerCode } = data;
      connectedUsers.set(socket.id, user);
      latestMoods.set(user.seedCode, user.mood);
      
      const seedCode = user.seedCode;
      socket.join(seedCode);
      
      if (partnerCode) {
        socket.join(partnerCode);
        partnerCodes.set(seedCode, partnerCode);
        
        // Fetch existing chat history from Firestore
        const pairId = getPairId(seedCode, partnerCode);
        try {
          const messagesRef = collection(db, "chats", pairId, "messages");
          const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
          const querySnapshot = await getDocs(q);
          const history = querySnapshot.docs.map(docSnap => docSnap.data());
          socket.emit('chat_history', history);
        } catch (e) {
          console.error("Error fetching chat history", e);
          socket.emit('chat_history', []);
        }

        // Send partner's latest mood if available
        if (latestMoods.has(partnerCode)) {
          socket.emit('partner_mood_changed', latestMoods.get(partnerCode));
        }
      }

      // Let others in the rooms know we joined
      socket.to(seedCode).emit('user_joined', user);
      if (partnerCode) {
        socket.to(partnerCode).emit('user_joined', user);
      }
    });

    socket.on('bond_request', (data: BondData) => {
        socket.to(data.targetCode).emit('bond_requested', data.user);
    });
    
    socket.on('bond_accept', (data: BondData) => {
        socket.to(data.targetCode).emit('bond_accepted', data.user);
    });

    socket.on('update_message', async (data: UpdateMessageData) => {
      const pairId = getPairId(data.from, data.to);
      try {
        const messageRef = doc(db, "chats", pairId, "messages", data.messageId);
        await updateDoc(messageRef, data.updates);
      } catch (e) {
        console.error("Error updating message", e);
      }
      
      // Notify both parties of the update
      io.to(data.from).to(data.to).emit('message_updated', { messageId: data.messageId, updates: data.updates });
    });

    socket.on('send_message', async (data: SendMessageData) => {
      const pairId = getPairId(data.from, data.to);
      
      try {
        const messagesRef = collection(db, "chats", pairId, "messages");
        await setDoc(doc(messagesRef, data.message.id), data.message);
      } catch (e) {
        console.error("Error saving message", e);
      }

      // Send to partner's room
      socket.to(data.to).emit('new_message', data.message);
      
      sendPushNotification(data.to, {
        title: "New Message",
        body: data.message.type === 'text' ? (data.message.text || '') : "Sent you a photo",
        icon: "/icons/icon-192.png"
      }, 'messages');
    });

    socket.on('trigger_leaf', (to: string) => {
      socket.to(to).emit('leaf_fall');
      sendPushNotification(to, {
        title: "Thinking of you",
        body: "A leaf fell in your sanctuary 🍃",
        icon: "/icons/icon-192.png"
      }, 'leaf');
    });

    socket.on('update_mood', (data: { from: string, to: string, mood: string }) => {
      latestMoods.set(data.from, data.mood);
      socket.to(data.to).emit('partner_mood_changed', data.mood);
      sendPushNotification(data.to, {
        title: "Mood Updated",
        body: `Partner is feeling ${data.mood}`,
        icon: "/icons/icon-192.png"
      }, 'mood');
    });

    socket.on('update_user', (data: UserUpdateData) => {
      // Sync user updates like anniversary date, avatar, name
      socket.to(data.to).emit('partner_updated', data.user);
    });

    // ─── Pet Events ─────────────────────────────────────────────

    interface PetProposeData {
      from: string;
      to: string;
      pet: Record<string, unknown>;
      proposerName: string;
    }

    interface PetAcceptData {
      from: string;
      to: string;
      pet: Record<string, unknown>;
      status: Record<string, unknown>;
    }

    interface PetActionData {
      from: string;
      to: string;
      petId: string;
      action: Record<string, unknown>;
    }

    socket.on('pet_propose', async (data: PetProposeData) => {
      const pairId = getPairId(data.from, data.to);
      try {
        await setDoc(doc(db, 'pets', pairId), { pet: data.pet, status: null, createdAt: Date.now() });
      } catch (e) {
        console.error('Error saving pet proposal', e);
      }
      socket.to(data.to).emit('pet_proposed', { pet: data.pet, proposerName: data.proposerName });
      sendPushNotification(data.to, {
        title: "🐾 Pet Proposal!",
        body: `${data.proposerName} wants to adopt a pet together!`,
        icon: "/icons/icon-192.png"
      }, 'pet');
    });

    socket.on('pet_accept', async (data: PetAcceptData) => {
      const pairId = getPairId(data.from, data.to);
      try {
        await updateDoc(doc(db, 'pets', pairId), { pet: data.pet, status: data.status });
      } catch (e) {
        console.error('Error confirming pet', e);
      }
      io.to(data.from).to(data.to).emit('pet_accepted', { pet: data.pet, status: data.status });
    });

    socket.on('pet_action', async (data: PetActionData) => {
      const pairId = getPairId(data.from, data.to);
      try {
        const actionsRef = collection(db, 'pets', pairId, 'actions');
        const actionId = (data.action as { id?: string }).id ?? `action_${Date.now()}`;
        await setDoc(doc(actionsRef, actionId), data.action);

        // Retrieve current status, apply action, and broadcast
        const petDoc = await getDoc(doc(db, 'pets', pairId));
        if (petDoc.exists()) {
          const petData = petDoc.data();
          const currentStatus = (petData.status ?? {}) as Record<string, unknown>;
          const actionType = (data.action as { type?: string }).type;

          const hunger = typeof currentStatus.hunger === 'number' ? currentStatus.hunger : 100;
          const love = typeof currentStatus.love === 'number' ? currentStatus.love : 100;
          const energy = typeof currentStatus.energy === 'number' ? currentStatus.energy : 100;

          let newHunger = hunger;
          let newLove = love;
          let newEnergy = energy;

          if (actionType === 'feed') {
            newHunger = Math.min(100, hunger + 25);
          } else if (actionType === 'love') {
            newLove = Math.min(100, love + 20);
          } else if (actionType === 'play') {
            newEnergy = Math.max(0, energy - 15);
            newLove = Math.min(100, love + 15);
          }

          const newHealth = Math.round((newHunger + newLove) / 2);

          const feedingsToday = Array.isArray(currentStatus.feedingsToday) ? currentStatus.feedingsToday : [];
          if (actionType === 'feed') {
            feedingsToday.push(data.action);
          }

          const newStatus = {
            ...currentStatus,
            hunger: newHunger,
            love: newLove,
            health: newHealth,
            energy: newEnergy,
            feedingsToday,
            lastFedBy: actionType === 'feed' ? (data.action as { userId?: string }).userId : currentStatus.lastFedBy,
            lastFedAt: actionType === 'feed' ? Date.now() : currentStatus.lastFedAt,
            lastLovedBy: actionType === 'love' ? (data.action as { userId?: string }).userId : currentStatus.lastLovedBy,
            lastLovedAt: actionType === 'love' ? Date.now() : currentStatus.lastLovedAt,
          };

          await updateDoc(doc(db, 'pets', pairId), { status: newStatus });
          io.to(data.from).to(data.to).emit('pet_action_done', { action: data.action, newStatus });

          // Notify partner about pet action
          const actionLabel = actionType === 'feed' ? 'fed' : actionType === 'love' ? 'loved' : 'played with';
          const actorName = (data.action as { userName?: string }).userName || 'Partner';
          sendPushNotification(data.to, {
            title: "🐾 Pet Update",
            body: `${actorName} ${actionLabel} your pet!`,
            icon: "/icons/icon-192.png"
          }, 'pet');
        }
      } catch (e) {
        console.error('Error processing pet action', e);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      const user = connectedUsers.get(socket.id);
      if (user) {
        socket.to(user.seedCode).emit('user_left', user.id);
        partnerCodes.delete(user.seedCode);
        connectedUsers.delete(socket.id);
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
