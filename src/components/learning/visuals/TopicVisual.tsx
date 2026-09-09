import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
interface TopicVisualProps {
  topicName: string;
  total?: number;
  taken?: number;
  animated?: boolean;
  size?: number;
}

type VisualType = 'fraction-pizza' | 'fraction-bar' | 'number-line' | 'groups' | 'shapes' | 'cartesian' | 'generic';

function detectVisualType(topicName: string): VisualType {
  const name = topicName.toLowerCase();
  if (/fraction|partager|moitié|tiers|quart/.test(name)) return 'fraction-pizza';
  if (/addition|somme|plus|ajouter/.test(name)) return 'number-line';
  if (/soustraction|moins|enlever|différence/.test(name)) return 'number-line';
  if (/multiplication|fois|produit|groupe/.test(name)) return 'groups';
  if (/division|diviser|partage/.test(name)) return 'fraction-bar';
  if (/géométrie|forme|périmètre|aire|cercle|carré|triangle|rectangle|angle/.test(name)) return 'shapes';
  if (/fonction|équation|algèbre|variable|graphe|courbe|droite|coordonnée|repère/.test(name)) return 'cartesian';
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
  const ui = useInterfaceTranslation();
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
      <svg width={size} height={size} viewBox="0 0 100 100" aria-label={ui("pizzaDescription", { total, taken })}>
        <circle cx={cx} cy={cy} r={r} fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
        {slices}
      </svg>
    </>
  );
}

function BarVisual({ total = 4, taken = 1, size = 110 }: { total: number; taken: number; size: number }) {
  const ui = useInterfaceTranslation();
  const segW = Math.floor(260 / total);
  const colors = ['#12C6A0', '#34D399', '#059669', '#047857'];
  return (
    <svg width={size * 2.4} height={size * 0.44} viewBox="0 0 260 48" aria-label={ui("barDescription", { total, taken })}>
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

function GroupsVisual({ total = 12, taken = 3, size = 110 }: { total: number; taken: number; size: number }) {
  const ui = useInterfaceTranslation();
  const cols = Math.max(2, Math.round(total / Math.max(taken, 1)));
  const rows = Math.ceil(total / cols);
  const dotR = size <= 85 ? 6 : 8;
  const gap = size <= 85 ? 18 : 22;
  const startX = 10;
  const startY = 10;
  const svgW = startX * 2 + (cols - 1) * gap + dotR * 2;
  const svgH = startY * 2 + (rows - 1) * gap + dotR * 2;

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} aria-label={ui("gridDescription", { rows, cols, total })}>
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => {
          const idx = row * cols + col;
          if (idx >= total) return null;
          const isHighlighted = row < taken;
          return (
            <circle
              key={`${row}-${col}`}
              cx={startX + col * gap + dotR}
              cy={startY + row * gap + dotR}
              r={dotR}
              fill={isHighlighted ? '#12C6A0' : '#EAECEF'}
              style={{ transition: `fill .3s ease ${idx * 0.04}s`, opacity: isHighlighted ? 1 : 0.5 }}
            />
          );
        })
      )}
      <text
        x={svgW - 6}
        y={startY + ((Math.max(taken, 1) - 1) * gap) / 2 + dotR + 4}
        fontSize="10"
        fontFamily="Poppins,sans-serif"
        fontWeight="700"
        fill="#085041"
        textAnchor="end"
      >
        {`×${cols}`}
      </text>
    </svg>
  );
}

function ShapesVisual({ size = 110 }: { size: number }) {
  const ui = useInterfaceTranslation();
  return (
    <svg width={size * 2.6} height={size * 0.78} viewBox="0 0 286 86" aria-label={ui("Formes géométriques: triangle, carré et cercle")}>
      <polygon points="44,4 84,62 4,62" fill="#F2FBF8" stroke="#12C6A0" strokeWidth="2" />
      <text x="44" y="78" fontSize="10" textAnchor="middle" fill="#085041" fontFamily="Poppins,sans-serif" fontWeight="700">triangle</text>
      <rect x="106" y="6" width="56" height="56" rx="4" fill="#FFF3DC" stroke="#F97316" strokeWidth="2" />
      <text x="134" y="78" fontSize="10" textAnchor="middle" fill="#633806" fontFamily="Poppins,sans-serif" fontWeight="700">{ui("carré")}</text>
      <circle cx="244" cy="34" r="28" fill="#FCEBEB" stroke="#F7C1C1" strokeWidth="2" />
      <text x="244" y="78" fontSize="10" textAnchor="middle" fill="#791F1F" fontFamily="Poppins,sans-serif" fontWeight="700">{ui("cercle")}</text>
    </svg>
  );
}

function CartesianVisual({ size = 110 }: { size: number }) {
  const ui = useInterfaceTranslation();
  const points = [
    { x: 40, y: 50 },
    { x: 80, y: 38 },
    { x: 120, y: 26 },
    { x: 160, y: 14 },
  ];

  return (
    <svg width={size * 1.9} height={size * 0.7} viewBox="0 0 210 80" aria-label={ui("Plan cartésien avec une droite y = 2x + 1")}>
      {[20, 60, 100, 140, 180].map((x) => (
        <line key={x} x1={x} y1="5" x2={x} y2="65" stroke="#EAECEF" strokeWidth="0.5" />
      ))}
      {[15, 35, 55].map((y) => (
        <line key={y} x1="15" y1={y} x2="195" y2={y} stroke="#EAECEF" strokeWidth="0.5" />
      ))}
      <line x1="15" y1="65" x2="195" y2="65" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="5" x2="20" y2="70" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      <text x="197" y="68" fontSize="9" fill="#9CA3AF" fontFamily="Poppins,sans-serif">x</text>
      <text x="22" y="9" fontSize="9" fill="#9CA3AF" fontFamily="Poppins,sans-serif">y</text>
      <line x1={points[0].x} y1={points[0].y} x2={points[3].x} y2={points[3].y} stroke="#12C6A0" strokeWidth="2" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#12C6A0" />
      ))}
      <rect x="120" y="28" width="72" height="16" rx="4" fill="white" opacity="0.9" />
      <text x="156" y="40" fontSize="10" textAnchor="middle" fill="#085041" fontFamily="Poppins,sans-serif" fontWeight="700">y = 2x + 1</text>
    </svg>
  );
}

function NumberLineVisual({ total = 10, taken = 3, size = 110 }: { total: number; taken: number; size: number }) {
  const ui = useInterfaceTranslation();
  const w = 260;
  const step = w / total;
  return (
    <svg width={size * 2.4} height={size * 0.4} viewBox={`0 0 ${w} 48`} aria-label={ui("numberLineDescription", { total, taken })}>
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
  if (type === 'fraction-bar')   return <BarVisual total={total} taken={taken} size={size} />;
  if (type === 'number-line')    return <NumberLineVisual total={Math.min(total, 12)} taken={taken} size={size} />;
  if (type === 'groups')         return <GroupsVisual total={total} taken={taken} size={size} />;
  if (type === 'shapes')         return <ShapesVisual size={size} />;
  if (type === 'cartesian')      return <CartesianVisual size={size} />;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: size * 2 }}>
      {Array.from({ length: Math.min(total, 12) }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: i < taken ? '#12C6A0' : '#EAECEF',
            transition: `background .3s ease ${i * 0.06}s`,
          }}
        />
      ))}
    </div>
  );
}
