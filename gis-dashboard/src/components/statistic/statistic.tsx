import React from 'react';
import './statistic.css';

export default function Statistic() {
  return (
    <div className="statistic-grid">
      {/* Header */}
      <div className="stat-header">
        <h3 className="stat-title">Intensitas Kejadian Bencana Perbulan</h3>
        <h4 className="stat-subtitle">Jumlah Kejadian Bencana Perbulan</h4>
      </div>

      {/* Kotak besar*/}
      <div className="stat-big">
        <h1>47</h1>
        <h2>Kejadian</h2>
        <h2>Bencana</h2>
      </div>

      {/* Row 2 */}
      <div className="stat-small">
        <div className="month">MEI.</div>
        <div className="number">-</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">JUN.</div>
        <div className="number">-</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>

      {/* Row 3 */}
      <div className="stat-small">
        <div className="month">JUL.</div>
        <div className="number">-</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">AGST.</div>
        <div className="number">13</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>

      {/* Row 4 */}
      <div className="stat-small">
        <div className="month">JAN.</div>
        <div className="number">-</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">FEB.</div>
        <div className="number">-</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">MAR.</div>
        <div className="number">-</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">APR.</div>
        <div className="number">-</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>

      {/* Row 5 */}
      <div className="stat-small">
        <div className="month">SEP.</div>
        <div className="number">-</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">OKT.</div>
        <div className="number">-</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">NOV.</div>
        <div className="number">-</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">DES.</div>
        <div className="number">-</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
    </div>
  );
}
