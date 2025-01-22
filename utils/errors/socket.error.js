export class SocketError extends Error {
    constructor(message, code = 'SOCKET_ERROR') {
        super(message);
        this.name = 'SocketError';
        this.code = code;
    }
}