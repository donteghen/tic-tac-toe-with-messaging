var express = require('express'),
    path = require('path'),
    app = express(),
    http = require('http'),
    socketIO = require('socket.io'),
    server, io;
    port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, 'public')))

server = http.Server(app);
server.listen(port);

io = socketIO(server);

var players = {},
    unmatched;

function joinGame (socket) {

    // Add the player to our object of players
    players[socket.id] = {

        // The opponent will either be the socket that is
        // currently unmatched, or it will be null if no
        // players are unmatched
        opponent: unmatched,

        // The symbol will become 'O' if the player is unmatched
        symbol: 'X',

        // The socket that is associated with this player
        socket: socket
    };

    // Every other player is marked as 'unmatched', which means
    // there is not another player to pair them with yet. As soon
    // as the next socket joins, the unmatched player is paired with
    // the new socket and the unmatched variable is set back to null
    if (unmatched) {
        players[socket.id].symbol = 'O';
        players[unmatched].opponent = socket.id;
        unmatched = null;
    } else {
        unmatched = socket.id;
    }
}

// Returns the opponent socket
function getOpponent (socket) {
    if (!players[socket.id].opponent) {
        return;
    }
    return players[
        players[socket.id].opponent
    ].socket;
}

io.on('connection', function (socket) {
    
    joinGame(socket);

    // Once the socket has an opponent, we can begin the game
    if (getOpponent(socket)) {
        socket.emit('game.begin', {
            symbol: players[socket.id].symbol
        });
        socket.emit('join.message', `Welcome player ${players[socket.id].symbol}`)
        getOpponent(socket).emit('game.begin', {
            symbol: players[getOpponent(socket).id].symbol
        });
        getOpponent(socket).emit('join.message', `player ${players[socket.id].symbol} joined`)
    }

    // Listens for a move to be made and emits an event to both
    // players after the move is completed
    socket.on('make.move', function (data) {
        if (!getOpponent(socket)) {
            return;
        }
        socket.emit('move.made', data);
        getOpponent(socket).emit('move.made', data);
    });

    // Emit message between players 
    socket.on('new.message', ({mysymbol, message})=> {
        socket.emit('new.message', {mysymbol, message});
        getOpponent(socket).emit('new.message', {mysymbol, message});
    })
    // Emit an event to the opponent when the player leaves
    socket.on('disconnect', function () {
        if (getOpponent(socket)) {
            getOpponent(socket).emit('opponent.left');
        }
    });
});
