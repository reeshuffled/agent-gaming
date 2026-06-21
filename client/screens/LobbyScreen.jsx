import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { GAMES } from '../games/registry';

export default function LobbyScreen() {
  const { matchID } = useParams();
  const { state: locationState } = useLocation();
  const navigate = useNavigate();

  // My identity in this lobby
  const [myPlayer, setMyPlayer] = useState(locationState?.myPlayer ?? null);
  const [myCredentials, setMyCredentials] = useState(locationState?.myCredentials ?? null);
  const [gameId, setGameId] = useState(locationState?.gameId ?? null);

  const [players, setPlayers] = useState({});
  const [joining, setJoining] = useState(false);
  const pollRef = useRef(null);

  const gameUrl = `${window.location.origin}/lobby/${matchID}`;

  const fetchLobby = async () => {
    if (!gameId) return;
    try {
      const res = await fetch(`/games/${gameId}/${matchID}`);
      if (!res.ok) return;
      const data = await res.json();
      setPlayers(data.players ?? {});
    } catch (_) {}
  };

  // On mount: if no identity in state, check DB for saved identity
  useEffect(() => {
    const init = async () => {
      if (myPlayer !== null) {
        // Already have identity from location state
        return;
      }
      // Check DB — maybe we joined before and refreshed
      try {
        const res = await fetch(`/api/games/${matchID}`);
        if (!res.ok) { navigate('/'); return; }
        const data = await res.json();
        setGameId(data.game.game_id);
        // Credentials are in DB — but we don't know which player this browser is
        // Without session tracking we can't determine, so show join-as-p2 UI
      } catch (_) { navigate('/'); }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll bgio for player list
  useEffect(() => {
    if (!gameId) return;
    fetchLobby();
    pollRef.current = setInterval(fetchLobby, 2000);
    return () => clearInterval(pollRef.current);
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  const joinAsPlayer2 = async () => {
    if (joining) return;
    setJoining(true);
    try {
      const res = await fetch(`/games/${gameId}/${matchID}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerID: '1', playerName: 'Player 2' }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { playerCredentials } = await res.json();
      // Store in DB
      await fetch(`/api/games/${matchID}/players`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player1Credentials: playerCredentials }),
      });
      setMyPlayer('1');
      setMyCredentials(playerCredentials);
      await fetchLobby();
    } catch (err) {
      alert(`Join failed: ${err.message}`);
    } finally {
      setJoining(false);
    }
  };

  const goToGame = () => {
    navigate(`/game/${matchID}`, {
      state: { gameId, mode: 'hvh', myPlayer, myCredentials },
    });
  };

  const bothJoined = players['0']?.name && players['1']?.name;
  const iAmPlayer1 = myPlayer === '0';

  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <button
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#777', padding: '0 0 1.5rem', fontSize: '0.875rem' }}
      >
        ← Back
      </button>

      <h1 style={{ marginBottom: '0.5rem' }}>Lobby</h1>
      <p style={{ color: '#555', marginBottom: '2rem', fontSize: '0.9rem' }}>
        {gameId ? GAMES[gameId]?.name ?? gameId : '…'}
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555' }}>Players</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {['0', '1'].map((pid) => {
            const p = players[pid];
            const isMe = pid === myPlayer;
            return (
              <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', background: '#f9f9f9', borderRadius: 4, border: '1px solid #eee' }}>
                <span style={{ fontWeight: 600 }}>{pid === '0' ? 'X' : 'O'}</span>
                <span style={{ flex: 1, color: p?.name ? '#222' : '#aaa' }}>
                  {p?.name ?? 'Waiting…'}
                </span>
                {isMe && <span style={{ fontSize: '0.75rem', color: '#777' }}>you</span>}
              </div>
            );
          })}
        </div>
      </section>

      {myPlayer === null && (
        <section style={{ marginBottom: '2rem' }}>
          {players['1']?.name ? (
            <p style={{ color: '#888' }}>Player 2 slot already taken.</p>
          ) : (
            <button
              onClick={joinAsPlayer2}
              disabled={joining}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', cursor: joining ? 'not-allowed' : 'pointer', background: '#333', color: '#fff', border: 'none', borderRadius: 4 }}
            >
              {joining ? 'Joining…' : 'Join as Player 2 (O)'}
            </button>
          )}
        </section>
      )}

      {myPlayer !== null && (
        <section style={{ marginBottom: '2rem' }}>
          {iAmPlayer1 ? (
            <>
              <p style={{ marginBottom: '1rem', color: '#555', fontSize: '0.9rem' }}>
                Share this link with Player 2:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  readOnly
                  value={gameUrl}
                  style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem', border: '1px solid #ddd', borderRadius: 4 }}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(gameUrl)}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer', background: '#555', color: '#fff', border: 'none', borderRadius: 4 }}
                >
                  Copy
                </button>
              </div>
              <button
                onClick={goToGame}
                disabled={!bothJoined}
                style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', cursor: bothJoined ? 'pointer' : 'not-allowed', background: bothJoined ? '#333' : '#999', color: '#fff', border: 'none', borderRadius: 4 }}
              >
                {bothJoined ? 'Start Game' : 'Waiting for Player 2…'}
              </button>
            </>
          ) : (
            <>
              {bothJoined ? (
                <button
                  onClick={goToGame}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', cursor: 'pointer', background: '#333', color: '#fff', border: 'none', borderRadius: 4 }}
                >
                  Join Game
                </button>
              ) : (
                <p style={{ color: '#777', fontSize: '0.9rem' }}>Waiting for Player 1 to start…</p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
