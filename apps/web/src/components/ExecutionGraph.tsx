import React, { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { TaskNode } from '@/data/mockData';
import TaskCustomNode from './TaskCustomNode';
import ExecutionCustomEdge from './ExecutionCustomEdge';
import GraphModes, { GraphMode } from './GraphModes';

interface ExecutionGraphProps {
  tasks: TaskNode[];
  onTaskClick?: (task: TaskNode | null) => void;
}

const nodeTypes = {
  task: TaskCustomNode,
};

const edgeTypes = {
  execution: ExecutionCustomEdge,
};

const phaseXMap: Record<string, number> = {
  'allocation': 100,
  'focus': 500,
  'resolution': 900,
  'outcome': 1300,
};

export const ExecutionGraph = ({ tasks, onTaskClick }: ExecutionGraphProps) => {
  const [graphMode, setGraphMode] = useState<GraphMode>('default');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Generate initial nodes from tasks
  const initialNodes: Node[] = useMemo(() => {
    const phaseCounters: Record<string, number> = {
      'allocation': 0,
      'focus': 0,
      'resolution': 0,
      'outcome': 0,
    };

    return tasks.map((task) => {
      const phase = task.phase || 'allocation';
      const x = phaseXMap[phase] || 100;
      const y = (phaseCounters[phase] || 0) * 180 + 100;
      phaseCounters[phase] = (phaseCounters[phase] || 0) + 1;

      return {
        id: task.id,
        type: 'task',
        position: { x, y },
        data: { 
          task, 
          onTaskClick,
          graphMode,
          isHovered: hoveredNodeId === task.id,
          // We can compute upstream/downstream highlights here based on edges if needed
        },
      };
    });
  }, [tasks, onTaskClick, graphMode, hoveredNodeId]);

  // Generate initial dummy edges for demonstration if no real dependencies exist yet.
  // In a real implementation, we would fetch task_dependencies from the API.
  const initialEdges: Edge[] = useMemo(() => {
    return [];
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ 
      ...params, 
      type: 'execution',
      animated: true,
      style: { stroke: '#007dff', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#007dff',
      },
    }, eds)),
    [setEdges],
  );

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  return (
    <div className="w-full h-[600px] relative border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
      <GraphModes currentMode={graphMode} onModeChange={setGraphMode} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="execution-flow-graph"
      >
        <Controls />
        <MiniMap 
          nodeColor={(n) => {
            const task = n.data?.task as TaskNode;
            if (task?.status === 'done') return '#10b981';
            if (task?.status === 'in-progress') return '#007dff';
            return '#cbd5e1';
          }}
          maskColor="rgba(240, 248, 255, 0.4)"
        />
        <Background color="#e2e8f0" gap={16} />
      </ReactFlow>
    </div>
  );
};
