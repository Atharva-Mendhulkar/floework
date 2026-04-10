import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAppDispatch } from '../store/hooks' // Adjusted path to use your store setup realistically

export function useTasksRealtime(projectId: string) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const channel = supabase
      .channel(`tasks:${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'tasks',
        filter: `project_id=eq.${projectId}`
      }, ({ new: task }) => {
         // You should dispatch your slice's create action here
         // dispatch(taskCreated(task))
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'tasks',
        filter: `project_id=eq.${projectId}`
      }, ({ new: task }) => {
         // dispatch(taskUpdated(task))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'tasks',
        filter: `project_id=eq.${projectId}`
      }, ({ old: task }) => {
         // dispatch(taskDeleted(task.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, dispatch])
}
