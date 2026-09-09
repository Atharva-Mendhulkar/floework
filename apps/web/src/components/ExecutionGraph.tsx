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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGetTaskDependenciesQuery, useAddDependencyMutation, useDeleteDependencyMutation } from '@/store/api';
import { toast } from 'sonner';
import { Plus, Info, Zap } from 'lucide-react';
import type { TaskNode } from '@/data/mockData';
import TaskCustomNode from './TaskCustomNode';
import ExecutionCustomEdge from './ExecutionCustomEdge';
import GraphModes, { GraphMode } from './GraphModes';

interface ExecutionGraphProps {
  tasks: TaskNode[];
  projectId?: string;
  onTaskClick?: (task: TaskNode | null) => void;
  onNewTaskClick?: () => void;
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

export const ExecutionGraph = ({ tasks, projectId, onTaskClick, onNewTaskClick }: ExecutionGraphProps) => {
  const [graphMode, setGraphMode] = useState<GraphMode>('default');
  const resolvedProjectId = projectId || tasks[0]?.projectId || 'proj-default-1';

  const { data: depsData } = useGetTaskDependenciesQuery(resolvedProjectId, { skip: !resolvedProjectId });
  const [addDependency] = useAddDependencyMutation();
  const [deleteDependency] = useDeleteDependencyMutation();

  // Map real API edges to React Flow Edges (NO hardcoded mock edges)
  const graphEdges: Edge[] = useMemo(() => {
    const rawEdges = depsData?.data || [];
    const taskIds = new Set(tasks.map((t) => t.id));

    // Only render edges where both endpoints exist in the active tasks set
    return rawEdges
      .filter((dep: any) => {
        const sourceId = dep.source_task_id || dep.sourceTaskId || dep.source;
        const targetId = dep.target_task_id || dep.targetTaskId || dep.target;
        return sourceId && targetId && taskIds.has(sourceId) && taskIds.has(targetId);
      })
      .map((dep: any) => {
        const sourceId = dep.source_task_id || dep.sourceTaskId || dep.source;
        const targetId = dep.target_task_id || dep.targetTaskId || dep.target;
        const relationship = dep.relationship_type || dep.dependency_type || dep.type || 'BLOCKS';

        return {
          id: dep.id || `${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          type: 'execution',
          animated: true,
          data: {
            id: dep.id,
            relationshipType: relationship.toLowerCase(),
            rawType: relationship,
          },
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#94a3b8',
          },
        };
      });
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
    graphEdges.forEach((e) => {
      outDegree[e.source] = (outDegree[e.source] || 0) + 1;
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    });

    // 2. Compute Longest Path for 'critical_path' (with cycle protection)
    const longestPathLengths: Record<string, number> = {};
    const taskStatus = new Map(tasks.map((t) => [t.id, t.status]));
    const visitedInCurrentPath = new Set<string>();

    const computePath = (nodeId: string): number => {
      if (taskStatus.get(nodeId) === 'done') return 0;
      if (longestPathLengths[nodeId] !== undefined) return longestPathLengths[nodeId];
      if (visitedInCurrentPath.has(nodeId)) return 0; // Prevent cycle recursion

      visitedInCurrentPath.add(nodeId);
      const outgoing = graphEdges.filter((e) => e.source === nodeId);
      if (outgoing.length === 0) {
        visitedInCurrentPath.delete(nodeId);
        longestPathLengths[nodeId] = 1;
        return 1;
      }

      const childLengths = outgoing.map((e) => computePath(e.target));
      const maxChild = childLengths.length > 0 ? Math.max(0, ...childLengths) : 0;
      visitedInCurrentPath.delete(nodeId);
      longestPathLengths[nodeId] = maxChild + 1;
      return longestPathLengths[nodeId];
    };
    tasks.forEach((t) => computePath(t.id));
    const maxPathLen = Math.max(0, ...Object.values(longestPathLengths));
    const criticalNodes = new Set(
      Object.keys(longestPathLengths).filter((id) => longestPathLengths[id] === maxPathLen && maxPathLen > 0)
    );

    // 3. Compute Blocker Cascade
    const blockedNodes = new Set<string>();
    const isBlocked = (nodeId: string): boolean => {
      const incoming = graphEdges.filter(
        (e) => e.target === nodeId && (e.data?.relationshipType === 'blocks' || e.data?.relationshipType === 'depends_on')
      );
      if (incoming.length === 0) return false;
      return incoming.some((e) => taskStatus.get(e.source) !== 'done');
    };
    tasks.forEach((t) => {
      if (isBlocked(t.id)) blockedNodes.add(t.id);
    });

    setNodes((currentNodes) => {
      const phaseCounters: Record<string, number> = {
        allocation: 0,
        focus: 0,
        resolution: 0,
        outcome: 0,
      };

      const existingNodesMap = new Map(currentNodes.map((n) => [n.id, n]));

      return tasks.map((task) => {
        const phase = task.phase || 'allocation';
        const existingNode = existingNodesMap.get(task.id);

        let x: number;
        let y: number;
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
              heatmapScore,
            },
          },
        };
      });
    });
  }, [tasks, onTaskClick, graphMode, setNodes, graphEdges]);

  // Update edge styles based on mode
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => {
        let stroke = '#94a3b8';
        let width = 2;
        let dash = '';
        let animated = false;

        if (graphMode === 'critical_path') {
          const sourceCritical = nodes.find((n) => n.id === e.source)?.data?.intelligence?.isCritical;
          const targetCritical = nodes.find((n) => n.id === e.target)?.data?.intelligence?.isCritical;
          if (sourceCritical && targetCritical) {
            stroke = '#f43f5e'; // rose-500
            width = 3;
            animated = true;
          } else {
            stroke = '#e2e8f0'; // very light
          }
        } else if (graphMode === 'blocker') {
          if (e.data?.relationshipType === 'blocks' || e.data?.relationshipType === 'depends_on') {
            stroke = '#ef4444'; // red
            dash = '5 5';
            animated = true;
          }
        }

        return {
          ...e,
          animated,
          style: { stroke, strokeWidth: width, strokeDasharray: dash },
          markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
        };
      })
    );
  }, [graphMode, nodes, setEdges]);

  // Connect new dependency edge
  const onConnect = useCallback(
    async (params: Connection | Edge) => {
      if (params.source && params.target) {
        if (params.source === params.target) {
          toast.error('A task cannot depend on itself');
          return;
        }

        try {
          await addDependency({
            sourceId: params.source,
            targetId: params.target,
            type: 'BLOCKS',
            projectId: resolvedProjectId,
          }).unwrap();
          toast.success('Dependency linked in execution graph');
        } catch (err: any) {
          toast.error(err?.data || err?.message || 'Failed to link dependency (cycle prevented)');
          return;
        }
      }
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'execution',
            animated: true,
            style: { stroke: '#007dff', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#007dff',
            },
          },
          eds
        )
      );
    },
    [setEdges, addDependency, resolvedProjectId]
  );

  // Delete dependency edge when removed by user
  const onEdgesDelete = useCallback(
    async (deletedEdges: Edge[]) => {
      for (const edge of deletedEdges) {
        try {
          await deleteDependency({
            id: edge.data?.id,
            sourceId: edge.source,
            targetId: edge.target,
            projectId: resolvedProjectId,
          }).unwrap();
          toast.success('Dependency removed');
        } catch (err: any) {
          toast.error(err?.data || 'Failed to remove dependency');
        }
      }
    },
    [deleteDependency, resolvedProjectId]
  );

  return (
    <div className="w-full h-[620px] relative border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
      {/* Collapsible Mode Menu */}
      <GraphModes currentMode={graphMode} onModeChange={setGraphMode} />

      {/* Top right helper & action toolbar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {tasks.length > 0 && graphEdges.length === 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur border border-slate-200 rounded-xl text-[11px] font-medium text-slate-500 shadow-sm">
            <Info size={13} className="text-[#007dff]" />
            <span>Connect task handles to link dependencies</span>
          </div>
        )}
        {onNewTaskClick && (
          <button
            onClick={onNewTaskClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007dff] hover:bg-[#0070e8] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#007dff]/20 transition-all active:scale-95"
          >
            <Plus size={13} />
            <span>New Task</span>
          </button>
        )}
      </div>

      {/* Empty State Overlay */}
      {tasks.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-50/80 backdrop-blur-sm">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-3">
            <Zap size={24} className="text-slate-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">Execution Graph is Empty</h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Create tasks to visualize topological dependencies, execution bottlenecks, and critical delivery paths.
          </p>
          {onNewTaskClick && (
            <button
              onClick={onNewTaskClick}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#007dff] hover:bg-[#0070e8] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#007dff]/20 transition-all"
            >
              <Plus size={14} />
              <span>Create First Task</span>
            </button>
          )}
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
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
      )}
    </div>
  );
};

export default ExecutionGraph;
