import { type HandleType } from '@xyflow/react';

export type HandleUsageType = HandleType;

export interface Handle {
  id: string;
  name: string;
  type?: string;
  displayLabel?: string;
  description?: string;
  widget?: { type: string; [key: string]: any };
  defaultValue?: any;
}

export interface HandleIdentifier {
  nodeID: string;
  id: string;
  type: HandleUsageType | string;
}

export function isUsedAsInput(
  identifier: HandleIdentifier | { type: string }
): boolean {
  // 'source' for output, 'target' for input
  return identifier.type === 'target';
}

export function uniqueHandleName(
  editorID: string,
  nodeID: string,
  handleID: string
): string {
  return `${editorID}_${nodeID}_${handleID}`;
}

export function isInputViaConnection(handle: Handle): boolean {
  return !handle.widget;
}
