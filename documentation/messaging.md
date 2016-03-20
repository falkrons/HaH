HaH Messaging Protocol
======================

### error(msg)

*Triggered by*: Something unexpected happening.

*Actions (client/server)*:

1. Output error message to console or log file.
2. Consider this client disconnected. Should attempt to reinitialize if possible.


Player Management
-----------------

### playerJoinRequest(id, displayName, position)

*Triggered by*: An unregistered client attempting to join the game.

*Actions (server)*:

1. If player count less than minimum (4), exec `playerJoin` handler.
2. If player count at maximum (12), emit `playerJoinRejected` event.
3. Else mirror message to all clients.

*Actions (client)*:

1. Display vote dialog to players.
2. If one player accepts, emit `playerJoin` event and hide dialog.
3. If one player declines, or 30 seconds pass, hide dialog.


### playerJoin(id, displayName, position)

*Triggered by*: A current player accepting someone's request to play.

*Actions (server)*:

1. Insert player into turn order, based on position.
2. Deal new player 10 new cards.
3. Mirror message to all clients.

*Actions (client)*:

1. Update table positions based on new player list.


### playerJoinRejected(id, displayName)

*Triggered by*: A `playerJoinRequest` denied by the server.

*Actions (server)*:

None

*Actions (client)*:

1. Display message to all players and the denied client, indicating join failure.


### playerLeave(id, displayName, message)

*Triggered by*: Player clicking the "Leave Game" UI element, or player kicked.

*Actions (server)*:

1. Remove given player from turn order.
2. Do NOT add player cards back to the deck. Effectively added to discard pile.
3. Mirror event to all clients.

*Actions (client)*:

1. Update table positions based on new player list.
2. Display message to players, leaving client.


### playerKickRequest(playerId, displayName, requesterName)

*Triggered by*: A player clicking on another player's "Kick" button.

*Actions (server)*:

1. Mirror event to all clients.

*Actions (client)*:

1. Display vote dialog to players.
2. If at least 50% of players accept, emit `playerLeave` event and hide dialog.
3. If fewer than 50% of players accept, or 30 seconds pass, hide dialog.