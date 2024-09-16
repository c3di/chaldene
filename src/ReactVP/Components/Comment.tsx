import { Handle, Position } from '@xyflow/react';

export default function Comment(pros: any): JSX.Element {
  return (
    <>
      <div style={{ padding: '10px 20px' }}>{'cccc'}</div>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </>
  );
}
