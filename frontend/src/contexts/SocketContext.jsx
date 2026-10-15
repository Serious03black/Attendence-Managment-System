import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Toast dispatcher
  const addToast = (title, message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    
    // Auto-remove after 5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('✅ Real-time Socket connected');
    });

    // Listen for new notifications
    newSocket.on('notification:new', (notification) => {
      addToast(notification.title, notification.message, notification.type || 'info');
      // Fire custom event to refresh notifications lists if any are mounted
      window.dispatchEvent(new CustomEvent('notification-refresh'));
    });

    // Listen for live attendance requests (for Faculty batch room)
    newSocket.on('attendance:new-pending', (data) => {
      addToast('New Attendance marked', 'A student has marked attendance and is pending your review.', 'warning');
      window.dispatchEvent(new CustomEvent('attendance-pending-refresh', { detail: data }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const subscribeToBatch = (batchId) => {
    if (socket) socket.emit('subscribe:batch', batchId);
  };

  const unsubscribeFromBatch = (batchId) => {
    if (socket) socket.emit('unsubscribe:batch', batchId);
  };

  const value = {
    socket,
    subscribeToBatch,
    unsubscribeFromBatch,
    addToast,
    toasts,
    removeToast,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
      
      {/* Premium Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className="flex flex-col p-4 rounded-xl border glass-panel shadow-2xl cursor-pointer hover:scale-102 transition-transform duration-200 animate-fade-in"
            style={{
              borderColor:
                toast.type === 'success'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : toast.type === 'warning'
                  ? 'rgba(245, 158, 11, 0.3)'
                  : toast.type === 'error'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(59, 130, 246, 0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    toast.type === 'success'
                      ? '#10b981'
                      : toast.type === 'warning'
                      ? '#f59e0b'
                      : toast.type === 'error'
                      ? '#ef4444'
                      : '#3b82f6',
                }}
              />
              <h4 className="font-semibold text-sm text-white">{toast.title}</h4>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">{toast.message}</p>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
