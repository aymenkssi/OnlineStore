import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';
import { useSiteTexts } from '../hooks/useSiteTexts';

const LoadingScreen = ({ message = "Chargement en cours..." }) => {
  const [stars, setStars] = useState([]);
  const siteConfig = useSiteTexts();
  const siteName = (siteConfig.siteName || 'BEST SHOP').toUpperCase();

  useEffect(() => {
    // Generate random stars
    const generatedStars = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      angle: (360 / 30) * i + Math.random() * 12,
      delay: Math.random() * 0.5,
      size: Math.random() * 8 + 4,
      duration: 1 + Math.random() * 0.5,
    }));
    setStars(generatedStars);
  }, []);

  return (
    <div className="loading-screen">
      {/* Stars burst animation */}
      <div className="stars-container">
        {stars.map((star) => (
          <div
            key={star.id}
            className="star-burst"
            style={{
              '--angle': `${star.angle}deg`,
              '--delay': `${star.delay}s`,
              '--size': `${star.size}px`,
              '--duration': `${star.duration}s`,
            }}
          >
            <div className="star-particle" />
          </div>
        ))}
      </div>

      {/* Center content */}
      <div className="center-content">
        {/* 3D Rotating Logo */}
        <div className="perspective-container">
          <div className="rotating-logo">
            <h1 className="logo-text">
              {siteName}
            </h1>
          </div>
        </div>

        {/* Pulsing loading text */}
        <div className="loading-dots-container">
          <div className="dots-wrapper">
            <div className="dot dot-1" />
            <div className="dot dot-2" />
            <div className="dot dot-3" />
          </div>
          <span className="loading-message">{message}</span>
        </div>

        {/* Sparkle effect around logo */}
        <div className="sparkles-container">
          <div className="sparkle sparkle-1" />
          <div className="sparkle sparkle-2" />
          <div className="sparkle sparkle-3" />
          <div className="sparkle sparkle-4" />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
