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
import { useGetTaskDependenciesQuery } from '@/store/api';
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
  const projectId = tasks[0]?.projectId || '';

  const { data: depsData } = useGetTaskDependenciesQuery(projectId, { skip: !projectId });

  // Map API edges to React Flow Edges
  const graphEdges: Edge[] = useMemo(() => {
    let rawEdges = depsData?.data || [];
    
    // Mock edges if none exist (for demo purposes)
    if (rawEdges.length === 0 && tasks.length >= 3) {
      rawEdges = [
        { source_task_id: tasks[0].id, target_task_id: tasks[1].id, relationship_type: 'blocks' },
        { source_task_id: tasks[1].id, target_task_id: tasks[2].id, relationship_type: 'depends_on' },
      ];
      if (tasks.length >= 4) {
        rawEdges.push({ source_task_id: tasks[0].id, target_task_id: tasks[3].id, relationship_type: 'relates_to' });
      }
    }

    return rawEdges.map((dep: any) => ({
      id: `${dep.source_task_id}-${dep.target_task_id}`,
      source: dep.source_task_id,
      target: dep.target_task_id,
      type: 'execution',
      animated: true,
      data: { relationshipType: dep.relationship_type },
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#94a3b8',
      },
    }));
  }, [depsData, tasks]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Sync edges
  useEffect(() => {
    setEdges(graphEdges);
  }, [graphEdges, setEdges]);

  // Compute intelligence and Sync Nodes
  useEffect(() => {
    // 1. Pre-compute graph degrees for 'density' mode
    const inDegree: Record<string, number> = {};
    const outDegree: Record<string, number> = {};
    graphEdges.forEach(e => {
      outDegree[e.source] = (outDegree[e.source] || 0) + 1;
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    });

    // 2. Compute Longest Path for 'critical_path'
    const longestPathLengths: Record<string, number> = {};
    const taskStatus = new Map(tasks.map(t => [t.id, t.status]));
    
    // Simple topological distance for pending/in-progress tasks
    // (Assuming no cycles for this demo logic)
    const computePath = (nodeId: string): number => {
      if (taskStatus.get(nodeId) === 'done') return 0;
      if (longestPathLengths[nodeId] !== undefined) return longestPathLengths[nodeId];
      
      const outgoing = graphEdges.filter(e => e.source === nodeId);
      if (outgoing.length === 0) return 1;
      
      const maxChild = Math.max(...outgoing.map(e => computePath(e.target)));
      longestPathLengths[nodeId] = maxChild + 1;
      return longestPathLengths[nodeId];
    };
    tasks.forEach(t => computePath(t.id));
    const maxPathLen = Math.max(0, ...Object.values(longestPathLengths));
    const criticalNodes = new Set(Object.keys(longestPathLengths).filter(id => longestPathLengths[id] === maxPathLen && maxPathLen > 0));

    // 3. Compute Blocker Cascade
    const blockedNodes = new Set<string>();
    const isBlocked = (nodeId: string): boolean => {
      const incoming = graphEdges.filter(e => e.target === nodeId && e.data?.relationshipType === 'blocks');
      if (incoming.length === 0) return false;
      return incoming.some(e => taskStatus.get(e.source) !== 'done');
    };
    tasks.forEach(t => { if (isBlocked(t.id)) blockedNodes.add(t.id); });

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

        // Intelligence properties
        const degreeTotal = (inDegree[task.id] || 0) + (outDegree[task.id] || 0);
        const isCritical = criticalNodes.has(task.id);
        const nodeBlocked = blockedNodes.has(task.id);
        const heatmapScore = Math.min((task.focusCount || 0) / 10, 1); // 0 to 1

        return {
          id: task.id,
          type: 'task',
          position: { x, y },
          data: { 
            task, 
            onTaskClick,
            graphMode,
            intelligence: {
              degreeTotal,
              isCritical,
              nodeBlocked,
              heatmapScore
            }
          },
        };
      });
    });
  }, [tasks, onTaskClick, graphMode, setNodes, graphEdges]);

  // Update edge styles based on mode
  useEffect(() => {
    setEdges((eds) => eds.map(e => {
      let stroke = '#94a3b8';
      let width = 2;
      let dash = '';
      let animated = false;

      if (graphMode === 'critical_path') {
        const sourceCritical = nodes.find(n => n.id === e.source)?.data.intelligence?.isCritical;
        const targetCritical = nodes.find(n => n.id === e.target)?.data.intelligence?.isCritical;
        if (sourceCritical && targetCritical) {
          stroke = '#f43f5e'; // rose-500
          width = 3;
          animated = true;
        } else {
          stroke = '#e2e8f0'; // very light
        }
      } else if (graphMode === 'blocker') {
        if (e.data?.relationshipType === 'blocks') {
          stroke = '#ef4444'; // red
          dash = '5 5';
          animated = true;
        }
      }

      return {
        ...e,
        animated,
        style: { stroke, strokeWidth: width, strokeDasharray: dash },
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke }
      };
    }));
  }, [graphMode, nodes, setEdges]);

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
