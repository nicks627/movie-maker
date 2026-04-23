import React from 'react';
import { ImpactNumber } from './ImpactNumber';
import { StatsCard } from './StatsCard';
import { IconGrid } from './IconGrid';
import { TwoColumnComparison } from './TwoColumnComparison';
import { BarChart } from './BarChart';
import { FlowDiagram } from './FlowDiagram';
import { BulletList } from './BulletList';
import { PosterCard } from './PosterCard';
import { DirectSalesComparison } from './DirectSalesComparison';
import { DirectSalesMapZoom } from './DirectSalesMapZoom';
import { StockLineChart } from './StockLineChart';
import { CandlestickChart } from './CandlestickChart';
import { AllocationDonutChart } from './AllocationDonutChart';
import { GeoPoliticalMap } from './GeoPoliticalMap';
import { OrbitalMapZoom } from './OrbitalMapZoom';

export type InfographicProps = {
  frame: number;
  durationInFrames: number;
  [key: string]: unknown;
};

type InfographicComponent = React.FC<Record<string, unknown>>;

export const infographicRegistry: Record<string, InfographicComponent> = {
  ImpactNumber: ImpactNumber as unknown as InfographicComponent,
  StatsCard: StatsCard as unknown as InfographicComponent,
  IconGrid: IconGrid as unknown as InfographicComponent,
  TwoColumnComparison: TwoColumnComparison as unknown as InfographicComponent,
  BarChart: BarChart as unknown as InfographicComponent,
  FlowDiagram: FlowDiagram as unknown as InfographicComponent,
  BulletList: BulletList as unknown as InfographicComponent,
  PosterCard: PosterCard as unknown as InfographicComponent,
  DirectSalesComparison: DirectSalesComparison as unknown as InfographicComponent,
  DirectSalesMapZoom: DirectSalesMapZoom as unknown as InfographicComponent,
  StockLineChart: StockLineChart as unknown as InfographicComponent,
  CandlestickChart: CandlestickChart as unknown as InfographicComponent,
  AllocationDonutChart: AllocationDonutChart as unknown as InfographicComponent,
  GeoPoliticalMap: GeoPoliticalMap as unknown as InfographicComponent,
  OrbitalMapZoom: OrbitalMapZoom as unknown as InfographicComponent,
};
