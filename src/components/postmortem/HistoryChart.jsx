import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Dot,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/15 bg-dark-700 px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-white">{d.profile} — {label}</p>
      <p className="text-white/60 mt-0.5">Score: <span className="text-indigo-400 font-bold">{d.score}</span></p>
    </div>
  );
}

function CustomDot(props) {
  const { cx, cy, payload } = props;
  return (
    <Dot
      cx={cx} cy={cy} r={5}
      fill="#818cf8"
      stroke="#1a1a24"
      strokeWidth={2}
    />
  );
}

export default function HistoryChart({ history }) {
  if (!history?.length) return null;

  const avg = Math.round(history.reduce((s, h) => s + h.score, 0) / history.length);

  return (
    <div className="rounded-2xl border border-white/8 bg-dark-700/50 p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-white/30">Your Progress</p>
        <div className="flex items-center gap-3 text-xs text-white/35">
          <span>{history.length} session{history.length !== 1 ? 's' : ''}</span>
          <span>avg <span className="text-indigo-400 font-semibold">{avg}</span></span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#ffffff25"
            tick={{ fontSize: 10, fill: '#ffffff40' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#ffffff25"
            tick={{ fontSize: 10, fill: '#ffffff40' }}
            tickLine={false}
            axisLine={false}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff15', strokeWidth: 1 }} />
          {/* Target zone */}
          <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.3}
            label={{ value: 'Good', position: 'right', fontSize: 9, fill: '#22c55e80' }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#818cf8"
            strokeWidth={2.5}
            dot={<CustomDot />}
            activeDot={{ r: 7, fill: '#818cf8', stroke: '#1a1a24', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
