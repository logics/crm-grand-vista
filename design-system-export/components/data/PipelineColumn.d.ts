import * as React from 'react';

export interface PipelineColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stage name, e.g. "Due diligence". */
  stage: React.ReactNode;
  /** 1–10 — picks the --stage-N accent rule from the funil palette. */
  index?: number;
  /** Number of opportunities in the stage. */
  count?: number;
  /** Aggregated value string, e.g. "R$ 42,1 mi". */
  total?: React.ReactNode;
  /** DealCard children. */
  children?: React.ReactNode;
}
export function PipelineColumn(props: PipelineColumnProps): JSX.Element;
