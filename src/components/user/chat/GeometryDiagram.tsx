import React from 'react';
import { GroupedRetryPractice } from '@/types/chat';

type GeometryDiagramSpec = NonNullable<GroupedRetryPractice['diagram']>;

interface GeometryDiagramProps {
  diagram?: GeometryDiagramSpec;
}

const textClass = 'fill-slate-700 text-[11px] font-medium';

const shapePaintProps = {
  fill: 'white',
  stroke: '#334155',
  strokeWidth: 2,
  vectorEffect: 'non-scaling-stroke',
} as const;

const guidePaintProps = {
  fill: 'none',
  stroke: '#94a3b8',
  strokeWidth: 1.5,
  vectorEffect: 'non-scaling-stroke',
} as const;

const getLabels = (diagram: GeometryDiagramSpec, fallback: string[]) => {
  const labels = diagram.labels?.filter(Boolean) || [];
  return fallback.map((label, index) => labels[index] || label);
};

const dim = (diagram: GeometryDiagramSpec, ...keys: string[]) => {
  for (const key of keys) {
    const value = diagram.dimensions?.[key];
    if (value) return value;
  }
  return undefined;
};

const DimensionLabel = ({ x, y, children }: { x: number; y: number; children?: string }) => {
  if (!children) return null;
  return (
    <text x={x} y={y} textAnchor="middle" className={textClass}>
      {children}
    </text>
  );
};

const PointLabel = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <text x={x} y={y} textAnchor="middle" className={textClass}>
    {children}
  </text>
);

const RectangleDiagram = ({ diagram, square = false }: { diagram: GeometryDiagramSpec; square?: boolean }) => {
  const labels = getLabels(diagram, ['A', 'B', 'C', 'D']);
  const x = square ? 82 : 54;
  const y = square ? 34 : 46;
  const width = square ? 116 : 172;
  const height = square ? 116 : 88;

  return (
    <>
      <rect x={x} y={y} width={width} height={height} rx="2" {...shapePaintProps} />
      <PointLabel x={x - 12} y={y + height + 20}>{labels[0]}</PointLabel>
      <PointLabel x={x + width + 12} y={y + height + 20}>{labels[1]}</PointLabel>
      <PointLabel x={x + width + 12} y={y - 8}>{labels[2]}</PointLabel>
      <PointLabel x={x - 12} y={y - 8}>{labels[3]}</PointLabel>
      <DimensionLabel x={x + width / 2} y={y + height + 28}>
        {dim(diagram, 'bottom', 'base', 'width', 'AB', 'EF')}
      </DimensionLabel>
      <DimensionLabel x={x + width / 2} y={y - 14}>
        {dim(diagram, 'top', 'DC', 'HG')}
      </DimensionLabel>
      <DimensionLabel x={x - 30} y={y + height / 2 + 4}>
        {dim(diagram, 'left', 'height', 'AD', 'EH')}
      </DimensionLabel>
      <DimensionLabel x={x + width + 30} y={y + height / 2 + 4}>
        {dim(diagram, 'right', 'BC', 'FG')}
      </DimensionLabel>
    </>
  );
};

const TriangleDiagram = ({ diagram }: { diagram: GeometryDiagramSpec }) => {
  const labels = getLabels(diagram, ['A', 'B', 'C']);
  const points = '55,145 225,145 140,35';

  return (
    <>
      <polygon points={points} {...shapePaintProps} />
      <line x1="140" y1="35" x2="140" y2="145" {...guidePaintProps} strokeDasharray="4 4" />
      <PointLabel x={44} y={164}>{labels[0]}</PointLabel>
      <PointLabel x={236} y={164}>{labels[1]}</PointLabel>
      <PointLabel x={140} y={25}>{labels[2]}</PointLabel>
      <DimensionLabel x={140} y={165}>{dim(diagram, 'bottom', 'base', 'AB')}</DimensionLabel>
      <DimensionLabel x={156} y={94}>{dim(diagram, 'height')}</DimensionLabel>
      <DimensionLabel x={94} y={92}>{dim(diagram, 'left', 'AC')}</DimensionLabel>
      <DimensionLabel x={186} y={92}>{dim(diagram, 'right', 'BC')}</DimensionLabel>
    </>
  );
};

const CircleDiagram = ({ diagram }: { diagram: GeometryDiagramSpec }) => {
  const labels = getLabels(diagram, ['O']);
  return (
    <>
      <circle cx="140" cy="92" r="58" {...shapePaintProps} />
      <circle cx="140" cy="92" r="2.5" fill="#334155" />
      <line x1="140" y1="92" x2="198" y2="92" {...guidePaintProps} />
      <PointLabel x={140} y={84}>{labels[0]}</PointLabel>
      <DimensionLabel x={170} y={84}>{dim(diagram, 'radius', 'rayon', 'r')}</DimensionLabel>
      <DimensionLabel x={140} y={168}>{dim(diagram, 'diameter', 'diametre', 'd')}</DimensionLabel>
    </>
  );
};

export const GeometryDiagram = ({ diagram }: GeometryDiagramProps) => {
  if (!diagram) return null;

  return (
    <figure className="rounded-lg border border-blue-100 bg-white p-3">
      <svg viewBox="0 0 280 190" role="img" aria-label={diagram.caption || diagram.type} className="h-44 w-full">
        {diagram.type === 'rectangle' && <RectangleDiagram diagram={diagram} />}
        {diagram.type === 'square' && <RectangleDiagram diagram={diagram} square />}
        {diagram.type === 'triangle' && <TriangleDiagram diagram={diagram} />}
        {diagram.type === 'circle' && <CircleDiagram diagram={diagram} />}
      </svg>
      {diagram.caption && (
        <figcaption className="mt-2 text-center text-xs text-slate-600">
          {diagram.caption}
        </figcaption>
      )}
    </figure>
  );
};

export default GeometryDiagram;
