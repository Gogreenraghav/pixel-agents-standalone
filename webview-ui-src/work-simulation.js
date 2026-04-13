// Work Simulation System
// Employees work only when they have tasks, otherwise stay idle at desk

const DB_API = 'http://69.62.83.21:8787/api';
const COMPANY_ID = 1;

// Employee work state (in-memory)
const workStates = new Map();

// ============================================
// FETCH TASKS FOR EMPLOYEE
// ============================================

export async function fetchEmployeeTasks(employeeId) {
  try {
    const dbId = employeeId.replace('db_', '');
    const res = await fetch(`${DB_API}/tasks?company_id=${COMPANY_ID}&employee_id=${dbId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return [];
  }
}

// ============================================
// GET WORK STATE
// ============================================

export function getWorkState(employeeId) {
  return workStates.get(employeeId) || {
    hasTask: false,
    isWorking: false,
    deskPosition: null,
    lastCheck: 0,
  };
}

// ============================================
// UPDATE WORK STATE
// ============================================

export function updateWorkState(employeeId, updates) {
  const current = getWorkState(employeeId);
  const newState = { ...current, ...updates, lastCheck: Date.now() };
  workStates.set(employeeId, newState);
  return newState;
}

// ============================================
// CHECK IF EMPLOYEE SHOULD WORK
// ============================================

export async function checkEmployeeWorkStatus(employeeId) {
  try {
    const tasks = await fetchEmployeeTasks(employeeId);
    
    // Check if any task is pending or in progress
    const activeTask = tasks.find(t => 
      t.status === 'pending' || t.status === 'in_progress'
    );
    
    const hasTask = !!activeTask;
    const currentState = getWorkState(employeeId);
    
    // Update state
    const newState = updateWorkState(employeeId, {
      hasTask,
      isWorking: hasTask,
      activeTask: activeTask || null,
    });
    
    return newState;
  } catch (err) {
    console.error('Error checking work status:', err);
    return getWorkState(employeeId);
  }
}

// ============================================
// GET EMPLOYEE STATUS FOR RENDERING
// ============================================

export function getEmployeeDisplayStatus(workState) {
  if (workState.isWorking) {
    return {
      status: 'Working',
      emoji: '💻',
      color: '#00ff88',
      shouldMove: false,
      message: 'Working on task...'
    };
  } else if (workState.hasTask === false) {
    return {
      status: 'Idle',
      emoji: '🪑',
      color: '#888888',
      shouldMove: true, // Can move occasionally when truly idle
      message: 'No tasks assigned'
    };
  }
  
  return {
    status: 'Idle',
    emoji: '🪑',
    color: '#888888',
    shouldMove: true,
    message: ''
  };
}

// ============================================
// SET DESK POSITION
// ============================================

export function setDeskPosition(employeeId, position) {
  updateWorkState(employeeId, { deskPosition: position });
}

// ============================================
// SHOULD EMPLOYEE MOVE?
// ============================================

let movementTimers = new Map();

export function shouldEmployeeMove(employeeId, workState, deltaTime) {
  // If working, never move
  if (workState.isWorking) {
    return false;
  }
  
  // If has a desk position and truly idle, stay at desk
  if (workState.deskPosition && !workState.hasTask) {
    return false;
  }
  
  // For random NPCs or employees without tasks, allow occasional movement
  // This is controlled by the game's existing logic
  
  return true; // Let the game handle movement
}

// ============================================
// AUTO CHECK WORK STATUS (every 30 seconds)
// ============================================

let autoCheckInterval = null;

export function startWorkSimulation() {
  if (autoCheckInterval) return;
  
  console.log('🚀 Work Simulation Started!');
  
  autoCheckInterval = setInterval(async () => {
    try {
      // Get all employees from database
      const res = await fetch(`${DB_API}/employees?company_id=${COMPANY_ID}`);
      const employees = await res.json();
      
      for (const emp of employees) {
        await checkEmployeeWorkStatus(`db_${emp.id}`);
      }
      
      console.log(`📊 Work check complete: ${employees.length} employees`);
    } catch (err) {
      console.error('Work simulation error:', err);
    }
  }, 30000); // Every 30 seconds
  
  // Initial check
  setTimeout(async () => {
    try {
      const res = await fetch(`${DB_API}/employees?company_id=${COMPANY_ID}`);
      const employees = await res.json();
      
      for (const emp of employees) {
        await checkEmployeeWorkStatus(`db_${emp.id}`);
      }
    } catch (err) {
      console.error('Initial work check error:', err);
    }
  }, 2000);
}

export function stopWorkSimulation() {
  if (autoCheckInterval) {
    clearInterval(autoCheckInterval);
    autoCheckInterval = null;
    console.log('⏹️ Work Simulation Stopped');
  }
}

// ============================================
// MANUAL WORK START
// ============================================

export async function startWorking(employeeId, taskId) {
  updateWorkState(employeeId, {
    hasTask: true,
    isWorking: true,
    currentTaskId: taskId,
  });
  
  // Update task status in database
  try {
    await fetch(`${DB_API}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    });
  } catch (err) {
    console.error('Error updating task:', err);
  }
}

// ============================================
// MANUAL WORK COMPLETE
// ============================================

export async function completeWork(employeeId, taskId, result) {
  updateWorkState(employeeId, {
    hasTask: false,
    isWorking: false,
    currentTaskId: null,
  });
  
  // Update task status in database
  try {
    await fetch(`${DB_API}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: result
      })
    });
  } catch (err) {
    console.error('Error completing task:', err);
  }
}

// ============================================
// EXPORT FOR DEBUGGING
// ============================================

export function getAllWorkStates() {
  return Object.fromEntries(workStates);
}

export function debugWorkSimulation() {
  console.log('=== WORK SIMULATION DEBUG ===');
  console.log('Active states:', workStates.size);
  for (const [id, state] of workStates) {
    console.log(`${id}: ${state.isWorking ? '💻 Working' : '🪑 Idle'}`);
  }
  console.log('===========================');
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  fetchEmployeeTasks,
  getWorkState,
  updateWorkState,
  checkEmployeeWorkStatus,
  getEmployeeDisplayStatus,
  setDeskPosition,
  shouldEmployeeMove,
  startWorkSimulation,
  stopWorkSimulation,
  startWorking,
  completeWork,
  getAllWorkStates,
  debugWorkSimulation,
};
