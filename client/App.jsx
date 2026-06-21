import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import PreGameSetup from './components/PreGameSetup';
import GameScreen from './screens/GameScreen';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/setup/:gameId" element={<PreGameSetup />} />
      <Route path="/game/:matchID" element={<GameScreen />} />
    </Routes>
  );
}
