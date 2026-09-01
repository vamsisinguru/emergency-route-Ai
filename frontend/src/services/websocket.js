class WebSocketService {
    constructor() {
        this.ws = null;
        this.listeners = [];
        this.reconnectAttempts = 0;
        this.url = import.meta.env.VITE_WS_URL || (window.location.protocol === 'https:' ? `wss://${window.location.host}/ws` : `ws://${window.location.host}/ws`);
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log("Connecting to WS:", this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('WebSocket Connected');
            this.reconnectAttempts = 0;
            this.notify('connection_status', { status: 'LIVE' });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.notify(data.type, data.data);
            } catch (e) {
                console.error("WS parse error", e);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket Disconnected');
            this.notify('connection_status', { status: 'RECONNECTING' });
            this.reconnect();
        };

        this.ws.onerror = (err) => {
            console.error('WebSocket Error', err);
            this.ws.close();
        };
    }

    reconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * (2 ** this.reconnectAttempts), 10000);
        setTimeout(() => this.connect(), delay);
    }

    subscribe(type, callback) {
        this.listeners.push({ type, callback });
        return () => {
            this.listeners = this.listeners.filter(l => l.callback !== callback);
        };
    }

    notify(type, data) {
        this.listeners.forEach(l => {
            if (l.type === type || l.type === 'all') {
                l.callback(data);
            }
        });
    }

    send(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data }));
        }
    }
}

export const wsService = new WebSocketService();
