// Pixel Office API Integration - Connect to Database
// API Server: http://69.62.83.21:8787

const API_BASE = 'http://69.62.83.21:8787/api';

// Company ID for this installation
const COMPANY_ID = 1;

// ============================================
// API FUNCTIONS
// ============================================

export async function fetchEmployees() {
  try {
    const res = await fetch(`${API_BASE}/employees?company_id=${COMPANY_ID}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    return data.map(emp => ({
      id: `db_${emp.id}`,
      name: emp.name,
      role: emp.role,
      dept: emp.department,
      status: emp.status === 'working' ? 'Working' : emp.status,
      zone: `workspace`,
      hireDate: emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : new Date().toLocaleDateString(),
      salary: parseFloat(emp.salary) || 0,
      currency: emp.currency || 'USD',
      energy: emp.energy || 100,
      floor: emp.floor || 1,
      performance: 75,
      level: 1,
      tasksCompleted: 0,
    }));
  } catch (err) {
    console.error('Error fetching employees:', err);
    return [];
  }
}

export async function hireEmployee(name, role, dept, salary, currency) {
  try {
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: COMPANY_ID,
        name,
        role,
        department: dept,
        salary,
        currency,
      })
    });
    
    if (!res.ok) throw new Error('Failed to hire');
    const data = await res.json();
    
    // Also create activity log
    await fetch(`${API_BASE}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: COMPANY_ID,
        action: 'hired',
        details: `${name} joined as ${role}`,
      })
    });
    
    return {
      id: `db_${data.id}`,
      name: data.name,
      role: data.role,
      dept: data.department,
      status: 'Working',
      zone: 'workspace',
      hireDate: new Date(data.hire_date).toLocaleDateString(),
      salary: parseFloat(data.salary) || 0,
      currency: data.currency || 'USD',
      energy: 100,
      floor: 1,
      performance: 75,
      level: 1,
      tasksCompleted: 0,
    };
  } catch (err) {
    console.error('Error hiring employee:', err);
    throw err;
  }
}

export async function updateEmployeeStatus(employeeId, status) {
  try {
    const dbId = employeeId.replace('db_', '');
    await fetch(`${API_BASE}/employees/${dbId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  } catch (err) {
    console.error('Error updating status:', err);
  }
}

export async function deleteEmployee(employeeId) {
  try {
    const dbId = employeeId.replace('db_', '');
    await fetch(`${API_BASE}/employees/${dbId}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.error('Error deleting employee:', err);
  }
}

// ============================================
// TASKS
// ============================================

export async function fetchTasks() {
  try {
    const res = await fetch(`${API_BASE}/tasks?company_id=${COMPANY_ID}`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return await res.json();
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return [];
  }
}

export async function createTask(title, description, employeeId, priority, category) {
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: COMPANY_ID,
        employee_id: employeeId ? parseInt(employeeId.replace('db_', '')) : null,
        title,
        description,
        priority,
        category,
      })
    });
    
    if (!res.ok) throw new Error('Failed to create task');
    const data = await res.json();
    
    // Activity log
    await fetch(`${API_BASE}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: COMPANY_ID,
        action: 'task_created',
        details: `New task: ${title}`,
      })
    });
    
    return data;
  } catch (err) {
    console.error('Error creating task:', err);
    throw err;
  }
}

export async function updateTaskStatus(taskId, status, result = null) {
  try {
    const updates = { status };
    if (result) updates.result = result;
    
    await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  } catch (err) {
    console.error('Error updating task:', err);
  }
}

// ============================================
// STATS
// ============================================

export async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/stats?company_id=${COMPANY_ID}`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return await res.json();
  } catch (err) {
    console.error('Error fetching stats:', err);
    return { total_employees: 0, total_tasks: 0, completed_tasks: 0, pending_tasks: 0 };
  }
}

export async function fetchActivity() {
  try {
    const res = await fetch(`${API_BASE}/activity?company_id=${COMPANY_ID}`);
    if (!res.ok) throw new Error('Failed to fetch activity');
    return await res.json();
  } catch (err) {
    console.error('Error fetching activity:', err);
    return [];
  }
}

// ============================================
// CUSTOM ROLES
// ============================================

export async function fetchCustomRoles() {
  try {
    const res = await fetch(`${API_BASE}/custom-roles?company_id=${COMPANY_ID}`);
    if (!res.ok) throw new Error('Failed to fetch custom roles');
    return await res.json();
  } catch (err) {
    console.error('Error fetching custom roles:', err);
    return [];
  }
}

export async function createCustomRole(roleName, skills) {
  try {
    const res = await fetch(`${API_BASE}/custom-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: COMPANY_ID,
        role_name: roleName,
        skills,
      })
    });
    
    if (!res.ok) throw new Error('Failed to create custom role');
    return await res.json();
  } catch (err) {
    console.error('Error creating custom role:', err);
    throw err;
  }
}

export default {
  fetchEmployees,
  hireEmployee,
  updateEmployeeStatus,
  deleteEmployee,
  fetchTasks,
  createTask,
  updateTaskStatus,
  fetchStats,
  fetchActivity,
  fetchCustomRoles,
  createCustomRole,
  API_BASE,
  COMPANY_ID,
};
