import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { DailyStats } from '../types';

interface StatsChartProps {
  data: DailyStats[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ data }) => {
  // Show last 7 days
  const chartData = data.slice(-7);

  return (
    <div className="w-full h-80 font-tech">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => {
               if (!value) return '';
               const parts = value.split('-');
               if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
               return value;
            }}
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          
          {/* Left Axis: Counts (Pomos, Tasks, Breaks) */}
          <YAxis 
            yAxisId="left"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          
          {/* Right Axis: Minutes */}
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#BC13FE"
            tick={{ fill: '#BC13FE', fontSize: 12 }}
            unit="m"
          />

          <Tooltip 
            contentStyle={{ backgroundColor: '#1A1C2A', borderColor: '#BC13FE', color: '#fff' }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: '#00F0FF', marginBottom: '5px' }}
            labelFormatter={(value) => {
               const parts = value.split('-');
               return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }}
          />
          
          <Legend wrapperStyle={{ paddingTop: '10px' }} />

          {/* Lines */}
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="breaksTaken" 
            name="Pausas" 
            stroke="#F59E0B" // Amber/Orange
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="tasksCompleted" 
            name="Tarefas Concluídas" 
            stroke="#2D5BFF" // Neon Blue
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="pomodorosCompleted" 
            name="Pomodoros" 
            stroke="#00F0FF" // Neon Cyan
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
           <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="minutesFocused" 
            name="Minutos Focados" 
            stroke="#BC13FE" // Neon Purple
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};