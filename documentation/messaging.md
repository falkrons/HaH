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

1. Add player name and id to cache.
2. Insert player into turn order, based on position.
3. Mirror message to all clients.

*Actions (client)*:

1. Update table positions based on new player list.


### playerJoinRejected(id, displayName)

*Triggered by*: A `playerJoinRequest` denied by the server.

*Actions (server)*: None

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

1. Mirror event to all players but the targeted player.
2. Set a timer for 30 seconds. Emit `kickVoteAborted` if not passed in that time.

*Actions (client)*:

1. Display vote dialog to client.


### playerKickResponse(playerId, displayName, requesterName)

*Triggered by*: A player voting to kick a player.

*Actions (server)*:

1. Tally the "Yes" and "No" votes.
2. If at least 50% of players accept, exec `playerLeave` handler.
3. Else if at least 50% of players reject, emit `kickVoteAborted`.

*Actions (client)*: None


### kickVoteAborted(playerId, displayName)

*Triggered by*: A failed vote to kick a player.

*Actions (server)*: None

*Actions (client)*:

1. Hide vote dialog if visible.
2. Display message that the vote to kick player failed.



Game Play
--------------------------

### dealCards(newWhiteCards, newBlackCard, czarId)

*Triggered by:* A player clicking the card box after completion of the previous round.

*Actions (server)*: None

*Actions (client)*:

1. Add the contents of the `newWhiteCards` array to the player's hand.
2. Save black card for later use.
3. If clientId equals czarId, hide hand, display black card instead, and wait for confirmation.


### roundStart()

*Triggered by*: Czar verifies black card by clicking on it.

*Actions (server)*:

1. Mirror to all clients.
2. Start listening for card selection events.

*Actions (client)*:

1. Display black card.
2. Enable card selection from hand.


### cardSelection(cardsArray)

*Triggered by*: A player selecting a card (or group of cards) for play.

*Actions (server)*: 

1. Add play to list of round responses.
2. If round responses is equal to number of players at the start of the round minus one,
	emit `cardSelectionComplete` with list of responses to all clients.

*Actions (client)*: None


### cardSelectionComplete(cardsArrays)

*Triggered by*: All players submitting their plays for the round.

*Actions (server)*: None

*Actions (client)*:

1. If player is czar, present cards for winner selection.
2. Else save cards for later presentation.


### winnerSelection(winningIndex, winnerName)

*Triggered by*: Czar choosing winning hand.

*Actions (server)*:

1. Reward winning player (TBD).
2. Mirror message to all clients.

*Actions (client)*:

1. Display winning hand alongside black card.
2. Enable "deal" UI element.
