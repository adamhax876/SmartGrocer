const jwt = require('jsonwebtoken');

// Store clients by userId. Format: { userId: [res1, res2, ...] }
const clients = new Map();

function setupSSE(app) {
    app.get('/api/sse', (req, res) => {
        const token = req.query.token;
        if (!token) {
            return res.status(401).send('Unauthorized');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            res.write(`data: {"type": "connected"}\n\n`);

            if (!clients.has(userId)) {
                clients.set(userId, []);
            }
            clients.get(userId).push(res);

            req.on('close', () => {
                const userClients = clients.get(userId);
                if (userClients) {
                    const newClients = userClients.filter(client => client !== res);
                    if (newClients.length === 0) {
                        clients.delete(userId);
                    } else {
                        clients.set(userId, newClients);
                    }
                }
            });

        } catch (err) {
            return res.status(401).send('Invalid token');
        }
    });
}

function sendRealtimeNotification(receiverId, messageData) {
    if (!receiverId) {
        // Broadcast to all
        clients.forEach((userClients) => {
            userClients.forEach(res => {
                res.write(`data: ${JSON.stringify(messageData)}\n\n`);
            });
        });
    } else {
        // Send to specific user
        const targetUserId = receiverId.toString();
        const userClients = clients.get(targetUserId);
        if (userClients) {
            userClients.forEach(res => {
                res.write(`data: ${JSON.stringify(messageData)}\n\n`);
            });
        }
    }
}

module.exports = { setupSSE, sendRealtimeNotification };
