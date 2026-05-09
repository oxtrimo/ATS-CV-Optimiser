import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function MatchScoreGauge({ score, title = "ATS Match Score" }) {
  const normalizedScore = Math.min(Math.max(score, 0), 100);
  const data = [
    { name: 'Score', value: normalizedScore },
    { name: 'Remaining', value: 100 - normalizedScore }
  ];

  let color = '#ef4444'; // red for < 50
  if (normalizedScore >= 80) color = '#10b981'; // green for >= 80
  else if (normalizedScore >= 50) color = '#f59e0b'; // yellow for 50-79

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={55}
              outerRadius={70}
              stroke="none"
              dataKey="value"
            >
              <Cell fill={color} className="drop-shadow-[0_0_10px_rgba(var(--color),0.5)]" />
              <Cell fill="rgba(255,255,255,0.05)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{normalizedScore}%</span>
        </div>
      </div>
      <h3 className="text-sm font-medium text-slate-300 mt-2">{title}</h3>
    </div>
  );
}
