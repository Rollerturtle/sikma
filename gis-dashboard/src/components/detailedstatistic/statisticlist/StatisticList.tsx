import React from 'react';
import './StatisticList.css';

interface StatisticListProps {
  image: string;
  number: number | string;
  metric: string;
  description: string;
  imageSize?: string | number;
}

export default function StatisticList({
  image,
  number,
  metric,
  description,
  imageSize = 40,
}: StatisticListProps) {
  const size = typeof imageSize === 'number' ? `${imageSize}px` : imageSize;

const lines = description.split(/\r?\n|\/n|<br\s*\/?>/i).map(l => l.trim());

  return (
    <div className="stat-list-container">
      <div
        className="stat-list-image"
        style={{ width: size, height: size }}
      >
        <img src={image} alt={metric} />
      </div>

      <div className="stat-list-top">
        <span className="stat-number">{number}</span>
        <span className="stat-metric">{metric}</span>
      </div>

      <div className="stat-list-desc">

        {lines.map((line, idx) => (

          <div key={idx}>{line}</div>

        ))}

      </div>
    </div>
  );
}
