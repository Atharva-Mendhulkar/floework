import React, { useMemo, useCallback, useState, useEffect } from 'react';
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

  // Generate initial edges (dummy for now)
  const initialEdges: Edge[] = useMemo(() => {
    return [];
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync incoming tasks to React Flow nodes, preserving positions of existing nodes
  useEffect(() => {
    setNodes((currentNodes) => {
      const phaseCounters: Record<string, number> = {
        'allocation': 0,
        'focus': 0,
        'resolution': 0,
        'outcome': 0,
      };

      const existingNodesMap = new Map(currentNodes.map(n => [n.id, n]));

      return tasks.map((task) => {
        const phase = task.phase || 'allocation';
        const existingNode = existingNodesMap.get(task.id);
        
        let x, y;
        if (existingNode) {
          x = existingNode.position.x;
          y = existingNode.position.y;
        } else {
          x = phaseXMap[phase] || 100;
          y = (phaseCounters[phase] || 0) * 180 + 100;
        }
        
        // Only increment counters for new nodes so they layout correctly
        if (!existingNode) {
           phaseCounters[phase] = (phaseCounters[phase] || 0) + 1;
        }

        return {
          id: task.id,
          type: 'task',
          position: { x, y },
          data: { 
            task, 
            onTaskClick,
            graphMode,
          },
        };
      });
    });
  }, [tasks, onTaskClick, graphMode, setNodes]);

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

  return (
    <div className="w-full h-[600px] relative border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
      <GraphModes currentMode={graphMode} onModeChange={setGraphMode} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
