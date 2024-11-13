import { type HandleType } from '@xyflow/react';

export type HandleUsageType = HandleType;

export interface IHandle {
  id: string;
  name: string;
  type?: string | string[];
  displayLabel?: string;
  description?: string;
  widget?: { type: string; [key: string]: any };
  defaultValue?: any;
  connections?: number;
}

export interface IHandleIdentifier {
  nodeID: string;
  id: string;
  type: HandleUsageType | string;
}

export function isUsedAsInput(
  identifier: IHandleIdentifier | { type: string }
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

export function isInputViaConnection(handle: IHandle): boolean {
  return !handle.widget;
}
