/**
 * Task Management Web App - Google Apps Script Backend
 * Database: Google Sheets
 */

// Configuration
const SHEET_NAME = 'Tasks';
const CATEGORIES_SHEET = 'Categories';
const COLUMNS = [
  'ID', 'Title', 'Description', 'Status', 'Priority',
  'Category', 'DueDate', 'CompletedAt', 'CreatedAt', 'UpdatedAt'
];

const SUBTASKS_SHEET = 'Subtasks';
const SUBTASK_COLUMNS = ['ID', 'TaskID', 'Title', 'Completed', 'CreatedAt', 'UpdatedAt'];

const TEMPLATES_SHEET = 'Templates';
const TEMPLATE_COLUMNS = ['ID', 'Name', 'Title', 'Description', 'Priority', 'Category'];

const REMINDER_TRIGGER_HANDLER = 'sendDueReminders';

// Initialize
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Task Manager')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Helper: Safely format Date or date string to 'yyyy-MM-dd' string
 * Note: Never return raw Date objects over google.script.run as it causes serialization failure!
 */
function formatDateToString(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd');
  }
  const str = String(val).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd');
  }
  return str;
}

/**
 * Helper: Safely format timestamp to ISO string
 */
function formatTimestampToString(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toISOString();
  }
  return String(val).trim();
}

// Get all tasks (Guaranteed to return primitive fields only)
function getTasks(filter = {}) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return [];
    }
    
    const data = sheet.getRange(1, 1, lastRow, COLUMNS.length).getValues();
    const headers = data.shift();
    
    const tasks = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      // Skip completely empty rows
      const hasContent = row.some(cell => cell !== '' && cell !== null && cell !== undefined);
      if (!hasContent) continue;
      
      // Auto-assign UUID if row was entered directly in Google Sheet without ID
      let taskId = row[0] ? String(row[0]).trim() : '';
      if (!taskId) {
        taskId = Utilities.getUuid();
        sheet.getRange(i + 2, 1).setValue(taskId);
        row[0] = taskId;
      }
      
      const dueDateStr = formatDateToString(row[6]);
      const completedAtStr = formatTimestampToString(row[7]);
      const createdAtStr = formatTimestampToString(row[8]);
      const updatedAtStr = formatTimestampToString(row[9]);
      
      const task = {
        id: taskId,
        title: row[1] ? String(row[1]) : '',
        description: row[2] ? String(row[2]) : '',
        status: row[3] ? String(row[3]) : 'Not Started',
        priority: row[4] ? String(row[4]) : 'Normal',
        category: row[5] ? String(row[5]) : 'Personal',
        dueDate: dueDateStr,
        completedAt: completedAtStr,
        createdAt: createdAtStr,
        updatedAt: updatedAtStr
      };
      
      // Apply filters
      if (filter.status && task.status !== filter.status) continue;
      if (filter.priority && task.priority !== filter.priority) continue;
      if (filter.category && task.category !== filter.category) continue;
      if (filter.dueDate && task.dueDate !== formatDateToString(filter.dueDate)) continue;
      
      tasks.push(task);
    }
    
    return tasks;
  } catch (error) {
    Logger.log('Error in getTasks: ' + error.toString());
    throw new Error('Không thể tải danh sách công việc: ' + error.message);
  }
}

// Get tasks by date
function getTasksByDate(dateStr) {
  const formattedDate = formatDateToString(dateStr);
  const tasks = getTasks({ dueDate: formattedDate });
  return tasks.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

// Get overdue tasks
function getOverdueTasks() {
  const tasks = getTasks();
  const todayStr = formatDateToString(new Date());
  
  return tasks.filter(task => {
    if (task.status === 'Completed' || task.status === 'Cancel') return false;
    if (!task.dueDate) return false;
    return task.dueDate < todayStr;
  });
}

// Add new task
function addTask(task) {
  try {
    const sheet = getSheet();
    const id = Utilities.getUuid();
    const now = new Date();
    const nowIso = now.toISOString();
    
    // Handle dueDate - save as clean yyyy-MM-dd string
    let dueDateStr = '';
    if (task.dueDate && String(task.dueDate).trim() !== '') {
      dueDateStr = formatDateToString(task.dueDate);
    }
    
    const taskStatus = task.status || 'Not Started';
    const newRow = [
      id,
      task.title ? String(task.title).trim() : '',
      task.description ? String(task.description).trim() : '',
      taskStatus,
      task.priority || 'Normal',
      task.category || 'Personal',
      dueDateStr,
      taskStatus === 'Completed' ? nowIso : '',
      nowIso,
      nowIso
    ];
    
    sheet.appendRow(newRow);
    
    Logger.log('Task added successfully with ID: ' + id);
    return getTaskById(id);
  } catch (error) {
    Logger.log('Error adding task: ' + error.toString());
    throw new Error('Lỗi khi thêm công việc: ' + error.message);
  }
}

// Update task
function updateTask(id, updates) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      throw new Error('Danh sách công việc trống');
    }
    
    const data = sheet.getRange(1, 1, lastRow, COLUMNS.length).getValues();
    const headers = data.shift();
    const now = new Date();
    const nowIso = now.toISOString();
    
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        const row = data[i];
        
        // Update fields safely
        if (updates.title !== undefined) row[1] = String(updates.title).trim();
        if (updates.description !== undefined) row[2] = String(updates.description).trim();
        if (updates.status !== undefined) {
          row[3] = updates.status;
          // Auto-set completedAt when moving to Completed
          if (updates.status === 'Completed') {
            if (!row[7]) row[7] = nowIso;
          }
        }
        if (updates.priority !== undefined) row[4] = updates.priority;
        if (updates.category !== undefined) row[5] = updates.category;
        if (updates.dueDate !== undefined) {
          row[6] = updates.dueDate ? formatDateToString(updates.dueDate) : '';
        }
        
        row[9] = nowIso;
        
        // Update sheet row
        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
        Logger.log('Task updated successfully: ' + id);
        return getTaskById(id);
      }
    }
    
    throw new Error('Không tìm thấy công việc với ID: ' + id);
  } catch (error) {
    Logger.log('Error updating task: ' + error.toString());
    throw new Error('Lỗi khi cập nhật công việc: ' + error.message);
  }
}

// Delete task
function deleteTask(id) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      throw new Error('Không tìm thấy công việc để xóa');
    }
    
    const data = sheet.getRange(1, 1, lastRow, 1).getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        deleteSubtasksForTask(id);
        Logger.log('Task deleted successfully: ' + id);
        return true;
      }
    }
    
    throw new Error('Không tìm thấy công việc với ID: ' + id);
  } catch (error) {
    Logger.log('Error deleting task: ' + error.toString());
    throw new Error('Lỗi khi xóa công việc: ' + error.message);
  }
}

// Get single task
function getTaskById(id) {
  const tasks = getTasks();
  const task = tasks.find(t => String(t.id) === String(id));
  if (!task) {
    throw new Error('Không tìm thấy công việc với ID: ' + id);
  }
  return task;
}

// Get unique categories
function getCategories() {
  const tasks = getTasks();
  const categories = new Set(tasks.map(t => t.category).filter(Boolean));
  return Array.from(categories).sort();
}

// Get unique priorities
function getPriorities() {
  return ['Urgent', 'High', 'Normal', 'Low'];
}

// Get unique statuses
function getStatuses() {
  return ['Not Started', 'In Progress', 'Completed', 'Cancel'];
}

// Get unique priorities with labels
function getPriorityOptions() {
  return [
    { value: 'Urgent', label: 'Khẩn cấp', color: '#e74c3c' },
    { value: 'High', label: 'Cao', color: '#e67e22' },
    { value: 'Normal', label: 'Thường', color: '#3498db' },
    { value: 'Low', label: 'Thấp', color: '#2ecc71' }
  ];
}

// Get unique categories with labels
function getCategoryOptions() {
  return [
    { value: 'Work', label: 'Công việc', color: '#3498db' },
    { value: 'Personal', label: 'Cá nhân', color: '#9b59b6' },
    { value: 'Family', label: 'Gia đình', color: '#e91e63' },
    { value: 'Project', label: 'Dự án riêng', color: '#f39c12' }
  ];
}

// Get sheet
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Không thể kết nối với Google Sheet. Vui lòng mở Google Sheet và chọn Extensions > Apps Script.');
  }
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 300);
    sheet.setColumnWidth(4, 120);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(7, 120);
    sheet.setColumnWidth(8, 150);
    sheet.setColumnWidth(9, 150);
    sheet.setColumnWidth(10, 150);
  }
  
  return sheet;
}

// Get today's date string (yyyy-MM-dd)
function getTodayString() {
  return formatDateToString(new Date());
}

// Get date range for calendar
function getDateRange(days = 30) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7);
  
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + days);
  
  return {
    startDate: formatDateToString(startDate),
    endDate: formatDateToString(endDate)
  };
}

// Get categories sheet
function getCategoriesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Không thể kết nối với Google Sheet.');
  }
  let sheet = ss.getSheetByName(CATEGORIES_SHEET);
  
  if (!sheet) {
    sheet = ss.insertSheet(CATEGORIES_SHEET);
    sheet.appendRow(['Category', 'Color']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 100);
    
    // Add default categories
    const defaultCategories = [
      ['Work', '#3498db'],
      ['Personal', '#9b59b6'],
      ['Family', '#e91e63'],
      ['Project', '#f39c12']
    ];
    sheet.getRange(2, 1, defaultCategories.length, 2).setValues(defaultCategories);
  }
  
  return sheet;
}

// Get categories from sheet
function getCategoriesFromSheet() {
  try {
    const sheet = getCategoriesSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return [
        { value: 'Work', label: 'Work', color: '#3498db' },
        { value: 'Personal', label: 'Personal', color: '#9b59b6' },
        { value: 'Family', label: 'Family', color: '#e91e63' },
        { value: 'Project', label: 'Project', color: '#f39c12' }
      ];
    }
    const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    
    const categories = [];
    for (let i = 0; i < data.length; i++) {
      const name = data[i][0] ? String(data[i][0]).trim() : '';
      if (!name) continue;
      categories.push({
        value: name,
        label: name,
        color: data[i][1] ? String(data[i][1]).trim() : '#3498db'
      });
    }
    
    return categories.sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    Logger.log('Error getting categories: ' + error.toString());
    return [
      { value: 'Work', label: 'Work', color: '#3498db' },
      { value: 'Personal', label: 'Personal', color: '#9b59b6' },
      { value: 'Family', label: 'Family', color: '#e91e63' },
      { value: 'Project', label: 'Project', color: '#f39c12' }
    ];
  }
}

// Add new category
function addCategory(category) {
  try {
    if (!category || !category.name || !category.name.trim()) {
      throw new Error('Tên loại không được để trống');
    }
    const categoryName = category.name.trim();
    const categoryColor = category.color || '#3498db';
    
    const sheet = getCategoriesSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === categoryName.toLowerCase()) {
          throw new Error('Loại công việc "' + categoryName + '" đã tồn tại!');
        }
      }
    }
    
    sheet.appendRow([categoryName, categoryColor]);
    return getCategoriesFromSheet();
  } catch (error) {
    Logger.log('Error adding category: ' + error.toString());
    throw error;
  }
}

// Get statistics
function getStatistics(startDate, endDate) {
  try {
    const tasks = getTasks();
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const filteredTasks = tasks.filter(task => {
      if (!task.createdAt) return true;
      const created = new Date(task.createdAt);
      if (isNaN(created.getTime())) return true;
      return created >= start && created <= end;
    });
    
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'Completed').length;
    const inProgress = filteredTasks.filter(t => t.status === 'In Progress').length;
    const notStarted = filteredTasks.filter(t => t.status === 'Not Started').length;
    const cancelled = filteredTasks.filter(t => t.status === 'Cancel').length;
    
    const byPriority = {
      Urgent: filteredTasks.filter(t => t.priority === 'Urgent').length,
      High: filteredTasks.filter(t => t.priority === 'High').length,
      Normal: filteredTasks.filter(t => t.priority === 'Normal').length,
      Low: filteredTasks.filter(t => t.priority === 'Low').length
    };
    
    const byCategory = {};
    filteredTasks.forEach(task => {
      const cat = task.category || 'Khác';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    const todayStr = getTodayString();
    const overdue = filteredTasks.filter(t =>
      t.status !== 'Completed' && t.status !== 'Cancel' && t.dueDate && t.dueDate < todayStr
    ).length;

    // Weekly completion trend: bucket completed tasks by the week (Sunday) their completedAt falls in
    const byWeek = {};
    filteredTasks.forEach(task => {
      if (task.status !== 'Completed' || !task.completedAt) return;
      const d = new Date(task.completedAt);
      if (isNaN(d.getTime())) return;
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const label = formatDateToString(weekStart);
      byWeek[label] = (byWeek[label] || 0) + 1;
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      notStarted,
      cancelled,
      overdue,
      byPriority,
      byCategory,
      byWeek,
      completionRate
    };
  } catch (error) {
    Logger.log('Error in getStatistics: ' + error.toString());
    throw new Error('Lỗi khi tính toán thống kê: ' + error.message);
  }
}

// Export to Excel
function exportToExcel(startDate, endDate) {
  try {
    const tasks = getTasks();
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const filteredTasks = tasks.filter(task => {
      if (!task.createdAt) return true;
      const created = new Date(task.createdAt);
      if (isNaN(created.getTime())) return true;
      return created >= start && created <= end;
    });
    
    // Create new spreadsheet for export
    const exportName = 'Task Statistics Export - ' + formatDateToString(new Date());
    const ss = SpreadsheetApp.create(exportName);
    const sheet = ss.getActiveSheet();
    
    // Add headers
    const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Category', 'Due Date', 'Completed At', 'Created At', 'Updated At'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    
    // Add data
    filteredTasks.forEach(task => {
      sheet.appendRow([
        task.id,
        task.title,
        task.description || '',
        task.status,
        task.priority,
        task.category,
        task.dueDate || '',
        task.completedAt || '',
        task.createdAt || '',
        task.updatedAt || ''
      ]);
    });
    
    // Auto-size columns
    const range = sheet.getDataRange();
    range.autoResizeColumns(1, range.getNumColumns());
    
    return ss.getUrl();
  } catch (error) {
    Logger.log('Error exporting: ' + error.toString());
    throw new Error('Lỗi khi xuất file Excel: ' + error.message);
  }
}

// ============================================================
// SUBTASKS
// ============================================================

function getSubtasksSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Không thể kết nối với Google Sheet.');
  }
  let sheet = ss.getSheetByName(SUBTASKS_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(SUBTASKS_SHEET);
    sheet.appendRow(SUBTASK_COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, SUBTASK_COLUMNS.length).setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 80);
    sheet.setColumnWidth(3, 250);
  }

  return sheet;
}

// Get all subtasks (bulk load, used for progress badges on task cards)
function getAllSubtasks() {
  try {
    const sheet = getSubtasksSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const data = sheet.getRange(2, 1, lastRow - 1, SUBTASK_COLUMNS.length).getValues();
    const result = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const id = row[0] ? String(row[0]).trim() : '';
      if (!id) continue;

      result.push({
        id: id,
        taskId: String(row[1] || ''),
        title: String(row[2] || ''),
        completed: row[3] === true || String(row[3]).toLowerCase() === 'true',
        createdAt: formatTimestampToString(row[4]),
        updatedAt: formatTimestampToString(row[5])
      });
    }

    return result;
  } catch (error) {
    Logger.log('Error in getAllSubtasks: ' + error.toString());
    throw new Error('Không thể tải danh sách công việc con: ' + error.message);
  }
}

// Get subtasks belonging to one task
function getSubtasksByTask(taskId) {
  return getAllSubtasks().filter(s => s.taskId === String(taskId));
}

// Add a subtask
function addSubtask(taskId, title) {
  try {
    if (!title || !String(title).trim()) {
      throw new Error('Tiêu đề công việc con không được để trống');
    }
    const sheet = getSubtasksSheet();
    const id = Utilities.getUuid();
    const now = new Date().toISOString();
    sheet.appendRow([id, String(taskId), String(title).trim(), false, now, now]);
    return getSubtasksByTask(taskId);
  } catch (error) {
    Logger.log('Error adding subtask: ' + error.toString());
    throw new Error('Lỗi khi thêm công việc con: ' + error.message);
  }
}

// Update a subtask (title and/or completed)
function updateSubtask(id, updates) {
  try {
    const sheet = getSubtasksSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      throw new Error('Không tìm thấy công việc con');
    }

    const data = sheet.getRange(2, 1, lastRow - 1, SUBTASK_COLUMNS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        const row = data[i];
        if (updates.title !== undefined) row[2] = String(updates.title).trim();
        if (updates.completed !== undefined) row[3] = !!updates.completed;
        row[5] = new Date().toISOString();

        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
        return getSubtasksByTask(row[1]);
      }
    }

    throw new Error('Không tìm thấy công việc con với ID: ' + id);
  } catch (error) {
    Logger.log('Error updating subtask: ' + error.toString());
    throw new Error('Lỗi khi cập nhật công việc con: ' + error.message);
  }
}

// Delete a subtask
function deleteSubtask(id) {
  try {
    const sheet = getSubtasksSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      throw new Error('Không tìm thấy công việc con để xóa');
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 2);
        return true;
      }
    }

    throw new Error('Không tìm thấy công việc con với ID: ' + id);
  } catch (error) {
    Logger.log('Error deleting subtask: ' + error.toString());
    throw new Error('Lỗi khi xóa công việc con: ' + error.message);
  }
}

// Delete all subtasks belonging to a task (cleanup when the parent task is deleted)
function deleteSubtasksForTask(taskId) {
  try {
    const sheet = getSubtasksSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;

    const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = data.length - 1; i >= 0; i--) {
      if (String(data[i][1]) === String(taskId)) {
        sheet.deleteRow(i + 2);
      }
    }
  } catch (error) {
    Logger.log('Error deleting subtasks for task: ' + error.toString());
  }
}

// ============================================================
// TASK TEMPLATES
// ============================================================

function getTemplatesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Không thể kết nối với Google Sheet.');
  }
  let sheet = ss.getSheetByName(TEMPLATES_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(TEMPLATES_SHEET);
    sheet.appendRow(TEMPLATE_COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, TEMPLATE_COLUMNS.length).setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 180);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 280);
  }

  return sheet;
}

// Get all templates
function getTemplates() {
  try {
    const sheet = getTemplatesSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const data = sheet.getRange(2, 1, lastRow - 1, TEMPLATE_COLUMNS.length).getValues();
    const result = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const id = row[0] ? String(row[0]).trim() : '';
      if (!id) continue;

      result.push({
        id: id,
        name: String(row[1] || ''),
        title: String(row[2] || ''),
        description: String(row[3] || ''),
        priority: String(row[4] || 'Normal'),
        category: String(row[5] || '')
      });
    }

    return result;
  } catch (error) {
    Logger.log('Error in getTemplates: ' + error.toString());
    throw new Error('Không thể tải danh sách mẫu công việc: ' + error.message);
  }
}

// Add a new template
function addTemplate(tpl) {
  try {
    if (!tpl || !tpl.name || !String(tpl.name).trim()) {
      throw new Error('Tên mẫu không được để trống');
    }
    const sheet = getTemplatesSheet();
    const id = Utilities.getUuid();
    sheet.appendRow([
      id,
      String(tpl.name).trim(),
      tpl.title ? String(tpl.title).trim() : '',
      tpl.description ? String(tpl.description).trim() : '',
      tpl.priority || 'Normal',
      tpl.category || ''
    ]);
    return getTemplates();
  } catch (error) {
    Logger.log('Error adding template: ' + error.toString());
    throw error;
  }
}

// Delete a template
function deleteTemplate(id) {
  try {
    const sheet = getTemplatesSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      throw new Error('Không tìm thấy mẫu để xóa');
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 2);
        return getTemplates();
      }
    }

    throw new Error('Không tìm thấy mẫu với ID: ' + id);
  } catch (error) {
    Logger.log('Error deleting template: ' + error.toString());
    throw error;
  }
}

// ============================================================
// REMINDER NOTIFICATIONS
// ============================================================

// Read current reminder settings from Script Properties
function getReminderSettings() {
  const props = PropertiesService.getScriptProperties();
  const enabled = props.getProperty('REMINDER_ENABLED') === 'true';
  const leadDays = parseInt(props.getProperty('REMINDER_LEAD_DAYS'), 10) || 1;
  return { enabled: enabled, leadDays: leadDays };
}

// Enable/disable the daily email reminder trigger and save the lead time (days before due date)
function setReminderSettings(enabled, leadDays) {
  try {
    const props = PropertiesService.getScriptProperties();
    const days = Math.max(0, parseInt(leadDays, 10) || 1);
    props.setProperty('REMINDER_LEAD_DAYS', String(days));
    props.setProperty('REMINDER_ENABLED', enabled ? 'true' : 'false');

    // Remove any existing reminder triggers first to avoid duplicates
    ScriptApp.getProjectTriggers().forEach(function(trigger) {
      if (trigger.getHandlerFunction() === REMINDER_TRIGGER_HANDLER) {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    if (enabled) {
      ScriptApp.newTrigger(REMINDER_TRIGGER_HANDLER)
        .timeBased()
        .everyDays(1)
        .atHour(8)
        .create();
    }

    return getReminderSettings();
  } catch (error) {
    Logger.log('Error setting reminder settings: ' + error.toString());
    throw new Error('Lỗi khi cập nhật cài đặt nhắc nhở: ' + error.message);
  }
}

// Triggered daily (when enabled): emails a summary of tasks due soon or overdue
function sendDueReminders() {
  try {
    const settings = getReminderSettings();
    if (!settings.enabled) return;

    const tasks = getTasks();
    const todayStr = getTodayString();
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + settings.leadDays);
    const limitStr = formatDateToString(limitDate);

    const dueSoon = tasks.filter(function(t) {
      if (t.status === 'Completed' || t.status === 'Cancel') return false;
      if (!t.dueDate) return false;
      return t.dueDate <= limitStr;
    });

    if (dueSoon.length === 0) return;

    const email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    if (!email) return;

    const overdue = dueSoon.filter(function(t) { return t.dueDate < todayStr; });
    const upcoming = dueSoon.filter(function(t) { return t.dueDate >= todayStr; });

    let body = 'Bạn có ' + dueSoon.length + ' công việc cần chú ý:\n\n';
    if (overdue.length > 0) {
      body += '⚠️ QUÁ HẠN (' + overdue.length + '):\n';
      overdue.forEach(function(t) { body += '- ' + t.title + ' (hạn: ' + t.dueDate + ')\n'; });
      body += '\n';
    }
    if (upcoming.length > 0) {
      body += '📅 SẮP ĐẾN HẠN (' + upcoming.length + '):\n';
      upcoming.forEach(function(t) { body += '- ' + t.title + ' (hạn: ' + t.dueDate + ')\n'; });
    }

    MailApp.sendEmail(email, 'Task Manager - Nhắc nhở công việc', body);
  } catch (error) {
    Logger.log('Error sending reminders: ' + error.toString());
  }
}
