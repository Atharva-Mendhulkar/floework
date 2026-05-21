import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath, getSmoothStepPath } from '@xyflow/react';

const ExecutionCustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Extract simulated edge signals
  const isBlocked = data?.isBlocked;
  const isUnstable = data?.isUnstable;

  let edgeStroke = '#94a3b8'; // slate-400
  let edgeWidth = 2;
  let strokeDasharray = '';
  let animationClass = '';

  if (isBlocked) {
    edgeStroke = '#ef4444'; // red-500
    edgeWidth = 3;
    strokeDasharray = '5 5';
    animationClass = 'animate-pulse';
  } else if (isUnstable) {
    edgeStroke = '#f59e0b'; // amber-500
    strokeDasharray = '5 5';
    animationClass = 'animate-[dash_1s_linear_infinite]'; // Requires custom tailwind keyframe
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: edgeWidth,
          stroke: edgeStroke,
          strokeDasharray,
        }}
        className={animationClass}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-1 bg-white border border-slate-200 text-xs font-semibold text-slate-500 rounded-lg shadow-sm"
          >
            {data.label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default ExecutionCustomEdge;
