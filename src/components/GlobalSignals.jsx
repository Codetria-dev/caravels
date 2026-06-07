import { useState, useEffect } from 'react';

const initialSignals = [
  { id: 'usd', label: 'USD', value: '1.0842', change: 0.23, isUp: true },
  { id: 'eur', label: 'EUR', value: '0.9223', change: -0.15, isUp: false },
  { id: 'btc', label: 'BTC', value: '68,420', change: 2.47, isUp: true },
  { id: 'oil', label: 'Oil', value: '82.15', change: -0.89, isUp: false },
];

// Simulate price fluctuations
const jitter = (base, range) => {
  const delta = (Math.random() - 0.5) * range;
  const isUp = delta >= 0;
  const newVal = parseFloat(base.replace(',', '')) + delta;
  const formatted = newVal >= 1000
    ? Math.round(newVal).toLocaleString('en-US')
    : newVal.toFixed(4);
  const changePct = (delta / parseFloat(base.replace(',', ''))) * 100;
  return { value: formatted, change: Math.abs(changePct), isUp };
};

function GlobalSignals() {
  const [signals, setSignals] = useState(initialSignals);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSignals((prev) =>
        prev.map((s) => {
          const updated = jitter(s.value, s.id === 'btc' ? 200 : s.id === 'oil' ? 1.5 : 0.02);
          return { ...s, ...updated };
        })
      );
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="px-16 py-5 border-t border-slate-700/30 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-12">
        {signals.map((signal) => (
          <div
            key={signal.id}
            className="flex items-center gap-3 transition-all duration-300 hover:scale-105 cursor-default group"
          >
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium group-hover:text-slate-400 transition-colors">
              {signal.label}
            </span>
            <span className="text-sm font-light text-slate-300 tabular-nums group-hover:text-slate-200 transition-colors">
              {signal.value}
            </span>
            <span
              className={`flex items-center gap-1 text-xs font-light tabular-nums transition-all duration-300 ${
                signal.isUp
                  ? 'text-emerald-400/80 group-hover:text-emerald-400'
                  : 'text-rose-400/80 group-hover:text-rose-400'
              }`}
            >
              <span className="text-[10px]">{signal.isUp ? '\u2191' : '\u2193'}</span>
              <span>{Math.abs(signal.change).toFixed(2)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GlobalSignals;
