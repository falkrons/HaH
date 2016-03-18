HaH Messaging Protocol
======================

## error(msg)

*Triggered by*: Something unexpected happening.

*Actions*:

1. Output error message to console or log file.
2. Consider this client disconnected. Should attempt to reinitialize if possible.


## resetGame

## playerJoinRequest(id, displayName, position)

*Triggered by*: An unregistered client attempting to join the game.

*Actions (server)*:

1. Mirror message to all players.

*Actions (client)*:

1. Display vote dialog to players.
2. If one player accepts, emit `playerJoin` event.
3. If one player declines, or 30 seconds pass, hide dialog.


## playerJoin(id, displayName, position)

*Triggered by*: A current player accepting someone's request to play.

*Actions (server)*:

1. Insert player into turn order, based on position.
2. Deal new player 10 new cards.
3. Mirror message to all players.

*Actions (client)*:

1. Update table positions based on new player list.


