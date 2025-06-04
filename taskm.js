class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.selectedTasks = new Set();
        this.editingTaskId = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadTasks();
        this.updateStats();
        this.updateProgress();
    }

    initializeElements() {
        // Cache DOM elements for better performance
        const elements = {
            taskInput: 'taskInput',
            prioritySelect: 'prioritySelect',
            categorySelect: 'categorySelect',
            dueDateInput: 'dueDateInput',
            addTaskBtn: 'addTaskBtn',
            searchInput: 'searchInput',
            filterButtons: '.filter-btn',
            sortSelect: 'sortSelect',
            tasksContainer: 'tasksContainer',
            emptyState: 'emptyState',
            totalTasks: 'totalTasks',
            completedTasks: 'completedTasks',
            pendingTasks: 'pendingTasks',
            editModal: 'editModal',
            editTaskInput: 'editTaskInput',
            editPrioritySelect: 'editPrioritySelect',
            editCategorySelect: 'editCategorySelect',
            editDueDateInput: 'editDueDateInput',
            closeEditModal: 'closeEditModal',
            cancelEditBtn: 'cancelEditBtn',
            saveEditBtn: 'saveEditBtn',
            bulkActions: 'bulkActions',
            selectedCount: 'selectedCount',
            bulkCompleteBtn: 'bulkCompleteBtn',
            bulkDeleteBtn: 'bulkDeleteBtn',
            clearSelectionBtn: 'clearSelectionBtn',
            progressRing: 'progressRing',
            progressCircle: 'progressCircle',
            progressText: 'progressText'
        };

        // Use Object.entries for cleaner initialization
        Object.entries(elements).forEach(([key, id]) => {
            this[key] = document.getElementById(id);
            if (!this[key]) {
                console.warn(`Element with id '${id}' not found`);
            }
        });
    }

    bindEvents() {
        // Use arrow functions to maintain 'this' context
        const addTaskHandler = () => this.addTask();
        const keyPressHandler = (e) => {
            if (e.key === 'Enter') this.addTask();
        };

        this.addTaskBtn?.addEventListener('click', addTaskHandler);
        this.taskInput?.addEventListener('keypress', keyPressHandler);

        this.searchInput?.addEventListener('input', () => this.renderTasks());
        this.filterButtons?.forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });
        this.sortSelect?.addEventListener('change', () => {
            this.currentSort = this.sortSelect.value;
            this.renderTasks();
        });

        this.closeEditModal?.addEventListener('click', () => this.closeModal());
        this.cancelEditBtn?.addEventListener('click', () => this.closeModal());
        this.saveEditBtn?.addEventListener('click', () => this.saveEdit());
        this.editModal?.addEventListener('click', (e) => {
            if (e.target === this.editModal) this.closeModal();
        });

        this.bulkCompleteBtn?.addEventListener('click', () => this.bulkComplete());
        this.bulkDeleteBtn?.addEventListener('click', () => this.bulkDelete());
        this.clearSelectionBtn?.addEventListener('click', () => this.clearSelection());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                this.selectAllTasks();
            }
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    addTask() {
        const text = this.taskInput?.value.trim();
        if (!text) {
            this.showError('Please enter a task');
            return;
        }

        const task = {
            id: this.generateId(),
            text: text,
            completed: false,
            priority: this.prioritySelect?.value || 'medium',
            category: this.categorySelect?.value || 'personal',
            dueDate: this.dueDateInput?.value || null,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.updateProgress();
        this.clearInputs();

        this.addTaskBtn.innerHTML = '<i class="fas fa-check"></i> Added!';
        this.addTaskBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        setTimeout(() => {
            this.addTaskBtn.innerHTML = '<i class="fas fa-plus"></i> Add Task';
            this.addTaskBtn.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
        }, 1500);
    }

    showError(message) {
        if (!this.taskInput) return;
        
        this.taskInput.focus();
        this.taskInput.style.borderColor = '#ef4444';
        setTimeout(() => {
            this.taskInput.style.borderColor = '#e2e8f0';
        }, 2000);
        
        // Optional: Add error message display
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        this.taskInput.parentNode.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 2000);
    }

    clearInputs() {
        if (this.taskInput) this.taskInput.value = '';
        if (this.prioritySelect) this.prioritySelect.value = 'medium';
        if (this.categorySelect) this.categorySelect.value = 'personal';
        if (this.dueDateInput) this.dueDateInput.value = '';
    }

    deleteTask(id) {
        if (!id || !confirm('Delete this task?')) return;
        
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.selectedTasks.delete(id);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.updateProgress();
        this.updateBulkActions();
    }

    toggleTask(id) {
        if (!id) return;
        
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateProgress();
        }
    }

    editTask(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            this.editingTaskId = id;
            this.editTaskInput.value = task.text;
            this.editPrioritySelect.value = task.priority;
            this.editCategorySelect.value = task.category;
            this.editDueDateInput.value = task.dueDate || '';
            this.editModal.style.display = 'flex';
            this.editTaskInput.focus();
        }
    }

    saveEdit() {
        const text = this.editTaskInput.value.trim();
        if (!text) {
            this.editTaskInput.focus();
            return;
        }

        const task = this.tasks.find(task => task.id === this.editingTaskId);
        if (task) {
            task.text = text;
            task.priority = this.editPrioritySelect.value;
            task.category = this.editCategorySelect.value;
            task.dueDate = this.editDueDateInput.value || null;
            
            this.saveTasks();
            this.renderTasks();
            this.closeModal();
        }
    }

    closeModal() {
        this.editModal.style.display = 'none';
        this.editingTaskId = null;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderTasks();
    }

    getFilteredTasks() {
        let filtered = [...this.tasks];
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (searchTerm) {
            filtered = filtered.filter(task => 
                task.text.toLowerCase().includes(searchTerm) ||
                task.category.toLowerCase().includes(searchTerm) ||
                task.priority.toLowerCase().includes(searchTerm)
            );
        }

        switch (this.currentFilter) {
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
            case 'pending':
                filtered = filtered.filter(task => !task.completed);
                break;
            case 'overdue':
                filtered = filtered.filter(task => {
                    if (!task.dueDate || task.completed) return false;
                    const dueDate = new Date(task.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate < today;
                });
                break;
        }

        switch (this.currentSort) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'priority':
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                filtered.sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed - b.completed;
                    }
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                });
                break;
            case 'dueDate':
                filtered.sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
                break;
            case 'alphabetical':
                filtered.sort((a, b) => a.text.localeCompare(b.text));
                break;
        }

        return filtered;
    }

    renderTasks() {
        if (!this.tasksContainer) return;
        
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            this.tasksContainer.innerHTML = '<div class="empty-state">No tasks found</div>';
            return;
        }
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        const template = document.createElement('template');
        
        template.innerHTML = filteredTasks.map(task => {
            const isOverdue = this.isTaskOverdue(task);
            const isSelected = this.selectedTasks.has(task.id);
            
            return `
                <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" 
                     data-task-id="${task.id}">
                    <input type="checkbox" class="bulk-checkbox" 
                           ${isSelected ? 'checked' : ''} 
                           onchange="taskManager.toggleSelection('${task.id}')">
                    <input type="checkbox" class="task-checkbox" 
                           ${task.completed ? 'checked' : ''} 
                           onchange="taskManager.toggleTask('${task.id}')">
                    <div class="task-content">
                        <div class="task-text">${this.escapeHtml(task.text)}</div>
                        <div class="task-meta">
                            <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                            <span class="category-badge">${task.category}</span>
                            ${task.dueDate ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">
                                <i class="fas fa-calendar"></i> ${this.formatDate(task.dueDate)}
                            </span>` : ''}
                            <span class="task-date">
                                <i class="fas fa-clock"></i> ${this.formatRelativeTime(task.createdAt)}
                            </span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="action-btn edit-btn" onclick="taskManager.editTask('${task.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="taskManager.deleteTask('${task.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        fragment.appendChild(template.content);
        this.tasksContainer.innerHTML = '';
        this.tasksContainer.appendChild(fragment);
    }

    isTaskOverdue(task) {
        if (!task.dueDate || task.completed) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    toggleSelection(taskId) {
        if (this.selectedTasks.has(taskId)) {
            this.selectedTasks.delete(taskId);
        } else {
            this.selectedTasks.add(taskId);
        }
        this.updateBulkActions();
    }

    selectAllTasks() {
        const visibleTasks = this.getFilteredTasks();
        if (this.selectedTasks.size === visibleTasks.length) {
            this.selectedTasks.clear();
        } else {
            visibleTasks.forEach(task => this.selectedTasks.add(task.id));
        }
        this.renderTasks();
        this.updateBulkActions();
    }

    clearSelection() {
        this.selectedTasks.clear();
        this.renderTasks();
        this.updateBulkActions();
    }

    updateBulkActions() {
        if (this.selectedTasks.size > 0) {
            this.bulkActions.style.display = 'flex';
            this.selectedCount.textContent = this.selectedTasks.size;
        } else {
            this.bulkActions.style.display = 'none';
        }
    }

    bulkComplete() {
        this.selectedTasks.forEach(taskId => {
            const task = this.tasks.find(t => t.id === taskId);
            if (task && !task.completed) {
                task.completed = true;
                task.completedAt = new Date().toISOString();
            }
        });
        
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.updateProgress();
        this.clearSelection();
    }

    bulkDelete() {
        if (confirm(`Are you sure you want to delete ${this.selectedTasks.size} tasks?`)) {
            this.tasks = this.tasks.filter(task => !this.selectedTasks.has(task.id));
            this.selectedTasks.clear();
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateProgress();
            this.updateBulkActions();
        }
    }

    updateStats() {
        if (!this.totalTasks || !this.completedTasks || !this.pendingTasks) return;
        
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;

        this.totalTasks.textContent = total;
        this.completedTasks.textContent = completed;
        this.pendingTasks.textContent = pending;
    }

    updateProgress() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        const circumference = 2 * Math.PI * 25;
        const offset = circumference - (percentage / 100) * circumference;
        
        this.progressCircle.style.strokeDashoffset = offset;
        this.progressText.textContent = `${percentage}%`;
        
        if (total > 0) {
            this.progressRing.style.display = 'flex';
        } else {
            this.progressRing.style.display = 'none';
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
            console.log('Tasks saved to localStorage:', this.tasks.length);
        } catch (error) {
            console.error('Error saving tasks:', error);
            this.showError('Failed to save tasks');
        }
    }

    loadTasks() {
        try {
            const savedTasks = localStorage.getItem('tasks');
            this.tasks = savedTasks ? JSON.parse(savedTasks) : [];
            this.renderTasks();
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = [];
            this.showError('Failed to load tasks');
        }
    }

    exportTasks() {
        const data = {
            tasks: this.tasks,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasks-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importTasks(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.tasks && Array.isArray(data.tasks)) {
                    this.tasks = data.tasks;
                    this.saveTasks();
                    this.renderTasks();
                    this.updateStats();
                    this.updateProgress();
                    alert('Tasks imported successfully!');
                } else {
                    alert('Invalid file format!');
                }
            } catch (error) {
                alert('Error importing tasks: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    clearAllTasks() {
        if (confirm('Are you sure you want to delete all tasks? This action cannot be undone.')) {
            this.tasks = [];
            this.selectedTasks.clear();
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateProgress();
            this.updateBulkActions();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
    
    console.log('TaskFlow - Keyboard Shortcuts:');
    console.log('• Enter: Add new task');
    console.log('• Escape: Close modal');
    console.log('• Ctrl+A: Select all visible tasks');
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dueDateInput').value = today;
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
