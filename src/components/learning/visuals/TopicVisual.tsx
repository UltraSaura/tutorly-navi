interface TopicVisualProps {
  topicName: string;
  total?: number;
  taken?: number;
  animated?: boolean;
  size?: number;
}

type VisualType = 'fraction-pizza' | 'fraction-bar' | 'number-line' | 'groups' | 'shapes' | 'generic';

function detectVisualType(topicName: string): VisualType {
  const name = topicName.toLowerCase();
  if (/fraction|diviser|partager|moitié|tiers|quart/.test(name)) return 'fraction-pizza';
  if (/addition|somme|plus|ajouter/.test(name)) return 'number-line';
  if (/multiplication|fois|produit|groupe/.test(name)) return 'groups';
  if (/géométrie|forme|cercle|carré|triangle|rectangle/.test(name)) return 'shapes';
  if (/soustraction|moins|enlever|différence/.test(name)) return 'number-line';
  if (/division|partage|égal/.test(name)) return 'fraction-bar';
  return 'generic';
}

function PizzaVisual({
  total = 4,
  taken = 1,
  size = 110,
  animated = true,
}: {
  total: number;
  taken: number;
  size: number;
  animated: boolean;
}) {
  const sliceColors = ['#12C6A0', '#FDE68A', '#F97316', '#A78BFA', '#F472B6', '#60A5FA', '#34D399', '#FBBF24'];
  const r = 44;
  const cx = 50;
  const cy = 50;
  const slices = [];

  for (let i = 0; i < total; i += 1) {
    const startAngle = (i / total) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((i + 1) / total) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = (1 / total) > 0.5 ? 1 : 0;
    const fill = i < taken ? sliceColors[i % sliceColors.length] : '#F3F6FA';
    slices.push(
      <path
        key={i}
        d={`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={fill}
        style={animated ? { opacity: 0, animation: `fadeSlice .4s ease ${0.1 + i * 0.12}s both` } : {}}
      />
    );
    slices.push(
      <line
        key={`l${i}`}
        x1={cx}
        y1={cy}
        x2={x1}
        y2={y1}
        stroke="white"
        strokeWidth="2.5"
        style={{ pointerEvents: 'none' }}
      />
    );
  }

  return (
    <>
      <style>{'@keyframes fadeSlice{from{opacity:0;transform-origin:50px 50px;transform:scale(.85)}to{opacity:1;transform-origin:50px 50px;transform:scale(1)}}'}</style>
      <svg width={size} height={size} viewBox="0 0 100 100" aria-label={`Pizza divisée en ${total} parts, ${taken} sélectionnée${taken > 1 ? 's' : ''}`}>
        <circle cx={cx} cy={cy} r={r} fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
        {slices}
      </svg>
    </>
  );
}

function BarVisual({ total = 4, taken = 1, size = 110 }: { total: number; taken: number; size: number }) {
  const segW = Math.floor(260 / total);
  const colors = ['#12C6A0', '#34D399', '#059669', '#047857'];
  return (
    <svg width={size * 2.4} height={size * 0.44} viewBox="0 0 260 48" aria-label={`Barre divisée en ${total} parts, ${taken} sélectionnée${taken > 1 ? 's' : ''}`}>
      {Array.from({ length: total }).map((_, i) => (
        <rect
          key={i}
          x={2 + i * segW}
          y={4}
          width={segW - 2}
          height={40}
          rx="6"
          fill={i < taken ? colors[i % colors.length] : '#EAECEF'}
          style={{ transition: `fill .3s ease ${i * 0.08}s` }}
        />
      ))}
    </svg>
  );
}

function NumberLineVisual({ total = 10, taken = 3, size = 110 }: { total: number; taken: number; size: number }) {
  const w = 260;
  const step = w / total;
  return (
    <svg width={size * 2.4} height={size * 0.4} viewBox={`0 0 ${w} 48`} aria-label={`Droite numérique 0 à ${total}, position ${taken} marquée`}>
      <line x1="10" y1="24" x2={w - 10} y2="24" stroke="#EAECEF" strokeWidth="3" strokeLinecap="round" />
      <line x1="10" y1="24" x2={10 + taken * step} y2="24" stroke="#12C6A0" strokeWidth="3" strokeLinecap="round" style={{ transition: 'x2 .5s ease' }} />
      {Array.from({ length: total + 1 }).map((_, i) => (
        <g key={i}>
          <circle cx={10 + i * step} cy="24" r={i === taken ? 7 : 4} fill={i === taken ? '#12C6A0' : '#EAECEF'} />
          <text x={10 + i * step} y="42" textAnchor="middle" fontSize="10" fill={i === taken ? '#085041' : '#9CA3AF'} fontFamily="Poppins,sans-serif" fontWeight={i === taken ? '700' : '400'}>
            {i}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function TopicVisual({ topicName, total = 4, taken = 1, animated = true, size = 110 }: TopicVisualProps) {
  const type = detectVisualType(topicName);
  if (type === 'fraction-pizza') return <PizzaVisual total={total} taken={taken} size={size} animated={animated} />;
  if (type === 'fraction-bar') return <BarVisual total={total} taken={taken} size={size} />;
  if (type === 'number-line') return <NumberLineVisual total={Math.min(total, 12)} taken={taken} size={size} />;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: size * 2 }}>
      {Array.from({ length: Math.min(total, 12) }).map((_, i) => (
        <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', background: i < taken ? '#12C6A0' : '#EAECEF', transition: `background .3s ease ${i * 0.06}s` }} />
      ))}
    </div>
  );
}
