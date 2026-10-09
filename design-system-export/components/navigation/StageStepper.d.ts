import * as React from 'react';

/**
 * Horizontal progress rail for the 10-stage funil comercial.
 * @startingPoint section="Navigation" subtitle="Etapas do funil comercial, da lead ao pós-venda" viewport="700x120"
 */
export interface StageStepperProps extends React.HTMLAttributes<HTMLOListElement> {
  /** Stage labels in order. */
  stages: React.ReactNode[];
  /** Index of the current stage (0-based). Earlier stages render as concluded. */
  current?: number;
  onSelect?: (index: number) => void;
  /** Bars only + "etapa N de 10" caption — required in columns narrower than ~700px. */
  compact?: boolean;
}
export function StageStepper(props: StageStepperProps): JSX.Element;
