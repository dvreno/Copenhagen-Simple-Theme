// Dashboard Functionality Script
(function() {
  'use strict';

  // Configuration
  const API_BASE = '/api/v2';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cache management
  const cache = new Map();

  function getCached(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  function setCache(key, data) {
    cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // API Helper Functions
  async function fetchAPI(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}.json`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error);
      return null;
    }
  }

  // Initialize My Work Section
  async function loadMyTickets() {
    const container = document.getElementById('my-tickets');
    if (!container) return;

    // Check cache first
    const cached = getCached('my-tickets');
    if (cached) {
      renderTickets(container, cached);
      return;
    }

    // Fetch user's requests
    const data = await fetchAPI('/requests', {
      params: {
        status: 'open,pending,hold,new'
      }
    });

    if (data && data.requests) {
      setCache('my-tickets', data.requests);
      renderTickets(container, data.requests.slice(0, 5));
    } else {
      container.innerHTML = '<p class="no-data">No active tickets</p>';
    }
  }

  async function loadCountyTickets() {
    const container = document.getElementById('county-tickets');
    if (!container) return;

    // For organization tickets, we need to fetch with organization parameter
    const data = await fetchAPI('/requests', {
      params: {
        status: 'open,pending,hold,new',
        organization_id: 'current' // This would need the actual org ID
      }
    });

    if (data && data.requests) {
      renderTickets(container, data.requests.slice(0, 5));
    } else {
      container.innerHTML = '<p class="no-data">No county tickets</p>';
    }
  }

  function renderTickets(container, tickets) {
    if (!tickets || tickets.length === 0) {
      container.innerHTML = '<p class="no-data">No tickets to display</p>';
      return;
    }

    const html = tickets.map(ticket => `
      <div class="ticket-item">
        <div class="ticket-header">
          <span class="ticket-number">#${ticket.id}</span>
          <span class="ticket-status status-${ticket.status}">${ticket.status}</span>
        </div>
        <a href="${ticket.url}" class="ticket-title">${escapeHtml(ticket.subject)}</a>
        <div class="ticket-meta">
          Updated ${formatRelativeTime(ticket.updated_at)}
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  // Load Recent Articles
  async function loadRecentArticles() {
    const container = document.getElementById('recent-articles');
    if (!container) return;

    const data = await fetchAPI('/help_center/articles', {
      params: {
        sort_by: 'updated_at',
        sort_order: 'desc',
        per_page: 6
      }
    });

    if (data && data.articles) {
      const html = data.articles.map(article => `
        <article class="kb-card">
          <div class="kb-card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <h4><a href="${article.html_url}">${escapeHtml(article.title)}</a></h4>
          <p class="kb-meta">Updated ${formatRelativeTime(article.updated_at)}</p>
        </article>
      `).join('');

      container.innerHTML = `<div class="article-grid">${html}</div>`;
    }
  }

  // Load Community Activity
  async function loadCommunityActivity() {
    const questionsContainer = document.getElementById('community-questions');
    if (!questionsContainer) return;

    // This would integrate with Zendesk Community/Gather API
    const data = await fetchAPI('/community/posts', {
      params: {
        sort_by: 'created_at',
        sort_order: 'desc',
        per_page: 5
      }
    });

    if (data && data.posts) {
      const html = data.posts.map(post => `
        <div class="community-item">
          <a href="${post.html_url}" class="community-link">
            ${escapeHtml(post.title)}
          </a>
          <div class="community-meta">
            by ${post.author.name} • ${post.comment_count} replies
          </div>
        </div>
      `).join('');

      questionsContainer.innerHTML = html;
    }
  }

  // Calendar Integration
  function initializeCalendar() {
    const calendarWidget = document.getElementById('calendar-widget');
    const agendaList = document.getElementById('agenda-list');
    
    if (!calendarWidget || !agendaList) return;

    // For now, create a simple calendar view
    // In production, integrate with actual calendar service
    const currentDate = new Date();
    renderMiniCalendar(calendarWidget, currentDate);
    loadAgendaItems(agendaList);
  }

  function renderMiniCalendar(container, date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    let html = `
      <div class="calendar-header">
        <h4>${monthNames[month]} ${year}</h4>
      </div>
      <div class="calendar-grid">
        <div class="calendar-weekdays">
          <span>S</span><span>M</span><span>T</span><span>W</span>
          <span>T</span><span>F</span><span>S</span>
        </div>
        <div class="calendar-days">
    `;
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      html += '<span class="calendar-day empty"></span>';
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === date.getDate();
      html += `<span class="calendar-day ${isToday ? 'today' : ''}">${day}</span>`;
    }
    
    html += '</div></div>';
    container.innerHTML = html;
  }

  function loadAgendaItems(container) {
    // Mock agenda items - integrate with actual calendar API
    const items = [
      { date: 'Nov 5', title: 'General Election', type: 'election' },
      { date: 'Nov 15', title: 'Ballot Certification Due', type: 'deadline' },
      { date: 'Nov 20', title: 'System Maintenance', type: 'maintenance' },
      { date: 'Nov 22', title: 'Training: VREMS Updates', type: 'training' }
    ];

    const html = items.map(item => `
      <div class="agenda-item">
        <div class="agenda-date">${item.date}</div>
        <div class="agenda-title">${item.title}</div>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  // Updates Feed
  async function loadUpdatesFeed() {
    const container = document.getElementById('updates-feed');
    if (!container) return;

    // Fetch from a specific updates section or category
    const data = await fetchAPI('/help_center/sections/360000000123/articles', {
      params: {
        sort_by: 'created_at',
        sort_order: 'desc',
        per_page: 10
      }
    });

    if (data && data.articles) {
      renderUpdates(container, data.articles);
    }
  }

  function renderUpdates(container, updates) {
    const html = updates.map(update => {
      const category = detectUpdateCategory(update);
      return `
        <div class="update-item" data-category="${category}">
          <div class="update-icon">
            ${getUpdateIcon(category)}
          </div>
          <div class="update-content">
            <div class="update-category">${category}</div>
            <h4 class="update-title">
              <a href="${update.html_url}">${escapeHtml(update.title)}</a>
            </h4>
            <p class="update-excerpt">${truncate(update.body, 150)}</p>
            <div class="update-meta">
              ${formatRelativeTime(update.created_at)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  function detectUpdateCategory(article) {
    const title = article.title.toLowerCase();
    const labels = article.label_names || [];
    
    if (labels.includes('release-notes') || title.includes('release')) {
      return 'Release Notes';
    } else if (labels.includes('policy') || title.includes('policy')) {
      return 'Policy';
    } else if (labels.includes('training') || title.includes('training')) {
      return 'Training';
    } else if (labels.includes('community')) {
      return 'Community';
    }
    return 'Update';
  }

  function getUpdateIcon(category) {
    const icons = {
      'Release Notes': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      'Policy': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
      'Training': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>',
      'Community': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>'
    };
    return icons[category] || icons['Update'];
  }

  // Sidebar Widgets
  async function loadPopularArticles() {
    const container = document.getElementById('popular-articles');
    if (!container) return;

    // Fetch popular articles
    const data = await fetchAPI('/help_center/articles', {
      params: {
        sort_by: 'promoted',
        per_page: 5
      }
    });

    if (data && data.articles) {
      const html = data.articles.map((article, index) => `
        <div class="popular-item">
          <span class="popular-number">${index + 1}</span>
          <div class="popular-title">
            <a href="${article.html_url}">${escapeHtml(article.title)}</a>
          </div>
        </div>
      `).join('');

      container.innerHTML = html;
    }
  }

  function loadDueThisWeek() {
    const container = document.getElementById('due-this-week');
    if (!container) return;

    // Mock data - integrate with actual calendar
    const items = [
      { label: 'Due Today', title: 'Submit Q3 Report' },
      { label: 'Due Tomorrow', title: 'Voter Registration Deadline' },
      { label: 'Due Friday', title: 'System Update Window' }
    ];

    const html = items.map(item => `
      <div class="due-item">
        <div class="due-label">${item.label}</div>
        <div class="due-title">${item.title}</div>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  // Tab Navigation
  function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Update active states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.remove('active'));
        
        button.classList.add('active');
        const targetPanel = document.getElementById(`${targetTab}-panel`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });
  }

  // Filter Controls
  function initializeFilters() {
    // Work filters
    const workFilters = document.querySelectorAll('.filter-btn');
    workFilters.forEach(button => {
      button.addEventListener('click', () => {
        workFilters.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const filter = button.dataset.filter;
        // Reload tickets with new filter
        loadMyTickets(filter);
        loadCountyTickets(filter);
      });
    });

    // Update filters
    const updateFilters = document.querySelectorAll('.chip-filter');
    updateFilters.forEach(button => {
      button.addEventListener('click', () => {
        updateFilters.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const category = button.dataset.category;
        filterUpdates(category);
      });
    });
  }

  function filterUpdates(category) {
    const updateItems = document.querySelectorAll('.update-item');
    updateItems.forEach(item => {
      if (category === 'all' || item.dataset.category.toLowerCase().includes(category)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  // Search Suggestions
  function initializeSearch() {
    const searchInput = document.querySelector('.hero-search-form input[type="search"]');
    const suggestionsContainer = document.getElementById('search-suggestions');
    
    if (!searchInput || !suggestionsContainer) return;

    let debounceTimer;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        suggestionsContainer.classList.remove('active');
        return;
      }
      
      debounceTimer = setTimeout(() => {
        loadSearchSuggestions(query, suggestionsContainer);
      }, 300);
    });

    // Hide suggestions on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.hero-search')) {
        suggestionsContainer.classList.remove('active');
      }
    });
  }

  async function loadSearchSuggestions(query, container) {
    const data = await fetchAPI('/help_center/articles/search', {
      params: {
        query: query,
        per_page: 5
      }
    });

    if (data && data.results && data.results.length > 0) {
      const html = data.results.map(result => `
        <a href="${result.html_url}" class="suggestion-item">
          <div class="suggestion-title">${highlightMatch(result.title, query)}</div>
          <div class="suggestion-section">${result.section.name}</div>
        </a>
      `).join('');

      container.innerHTML = html;
      container.classList.add('active');
    } else {
      container.classList.remove('active');
    }
  }

  // Utility Functions
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function truncate(text, length) {
    const stripped = text.replace(/<[^>]*>/g, '');
    if (stripped.length <= length) return stripped;
    return stripped.substr(0, length) + '...';
  }

  function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    
    return date.toLocaleDateString();
  }

  function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // System Status Check
  async function checkSystemStatus() {
    // This would integrate with your status page API
    // For now, using mock data
    const statusSnapshot = document.getElementById('status-snapshot');
    if (!statusSnapshot) return;

    // Update status indicators based on actual status
    const systems = [
      { name: 'VREMS Core', status: 'operational' },
      { name: 'Reporting', status: 'operational' },
      { name: 'Training Portal', status: 'maintenance' },
      { name: 'API Services', status: 'operational' }
    ];

    const html = systems.map(system => `
      <div class="status-item">
        <span class="status-indicator status-${system.status}"></span>
        <span class="status-label">${system.name}</span>
      </div>
    `).join('');

    statusSnapshot.innerHTML = html;
  }

  // Initialize Everything
  function initialize() {
    // Check if we're on the homepage
    if (!document.querySelector('.dashboard-container')) {
      return;
    }

    // Load all dashboard components
    loadMyTickets();
    loadCountyTickets();
    loadRecentArticles();
    loadCommunityActivity();
    loadUpdatesFeed();
    loadPopularArticles();
    loadDueThisWeek();
    checkSystemStatus();
    
    // Initialize interactive features
    initializeCalendar();
    initializeTabs();
    initializeFilters();
    initializeSearch();

    // Set up auto-refresh for dynamic content
    setInterval(() => {
      loadMyTickets();
      loadCountyTickets();
      checkSystemStatus();
    }, 60000); // Refresh every minute
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();