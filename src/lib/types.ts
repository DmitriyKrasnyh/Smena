export type Role = 'owner' | 'manager' | 'worker'
export type TaskStatus = 'new' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskCategory = 'kitchen' | 'hall' | 'bar' | 'admin' | 'cleaning' | 'other'

export interface Restaurant {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  restaurant_id: string | null
  avatar_url: string | null
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  category: TaskCategory | null
  assigned_to: string | null
  created_by: string | null
  restaurant_id: string
  deadline: string | null
  completion_note: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
  assignee?: Profile
  creator?: Profile
}

export interface TaskTemplate {
  id: string
  title: string
  description: string | null
  priority: TaskPriority
  category: TaskCategory | null
  assigned_to: string | null
  random_assignees: string[] | null
  restaurant_id: string
  created_by: string | null
  recurrence_type: 'daily' | 'weekly'
  recurrence_days: number[] | null
  active: boolean
  created_at: string
  assignee?: Pick<Profile, 'id' | 'full_name'>
}

export interface Invite {
  id: string
  token: string
  restaurant_id: string
  role: 'manager' | 'worker'
  created_by: string
  email: string | null
  used: boolean
  expires_at: string
  created_at: string
}

export interface Announcement {
  id: string
  restaurant_id: string
  content: string
  created_by: string
  created_at: string
  author?: Pick<Profile, 'id' | 'full_name'>
}

export interface Notification {
  id: string
  user_id: string
  restaurant_id: string
  type: 'task_assigned' | 'task_status' | 'task_comment' | 'announcement'
  title: string
  body: string | null
  task_id: string | null
  read: boolean
  created_at: string
}

export interface TaskActivity {
  id: string
  task_id: string
  user_id: string | null
  full_name: string | null
  action: 'created' | 'status_changed' | 'completed' | 'edited' | 'comment_added'
  details: Record<string, unknown> | null
  created_at: string
}
