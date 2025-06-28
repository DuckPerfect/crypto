// TrendBot - Advanced Cryptocurrency Dashboard
class TrendBot {
  constructor() {
    this.apiManager = new APIManager();
    this.predictionEngine = new PredictionEngine();
    this.performanceOptimizer = new PerformanceOptimizer();
    
    this.currentView = 'grid';
    this.currentTab = 'analysis';
    this.currentGLTab = 'gainers';
    this.isLoading = false;
    this.lastUpdateTime = null;
    this.chart = null;
    this.currentCoinData = null;
    
    this.init();
  }

  async init() {
    try {
      this.setupEventListeners();
      this.setupPerformanceOptimization();
      
      // Load initial data
      await this.loadInitialData();
      
      // Setup auto-refresh
      this.setupAutoRefresh();
      
      console.log('TrendBot initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TrendBot:', error);
      this.showError('Failed to initialize application');
    }
  }

  async loadInitialData() {
    try {
      // Load all initial data in parallel
      await Promise.all([
        this.loadMarketOverview(),
        this.loadTrendingCryptos(),
        this.loadFearGreedIndex(),
        this.loadGainersLosers(),
        this.analyzeTrends()
      ]);
      
      this.updateLastUpdatedTime();
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.showError('Failed to load market data');
    }
  }

  async loadMarketOverview() {
    try {
      const response = await this.apiManager.makeRequest({
        url: '/api/global',
        cacheKey: 'global_data',
        cacheTTL: 5 * 60 * 1000 // 5 minutes
      });

      if (response.success && response.data) {
        this.updateMarketOverview(response.data);
      }
    } catch (error) {
      console.error('Error loading market overview:', error);
    }
  }

  updateMarketOverview(data) {
    // Update header stats
    const totalMarketCap = document.getElementById('totalMarketCap');
    const totalVolume = document.getElementById('totalVolume');
    const btcDominance = document.getElementById('btcDominance');

    if (totalMarketCap && data.total_market_cap) {
      totalMarketCap.textContent = this.formatCurrency(data.total_market_cap);
    }

    if (totalVolume && data.total_volume) {
      totalVolume.textContent = this.formatCurrency(data.total_volume);
    }

    if (btcDominance && data.market_cap_percentage && data.market_cap_percentage.btc) {
      btcDominance.textContent = `${data.market_cap_percentage.btc.toFixed(1)}%`;
    }

    // Update overview cards
    const totalCoins = document.getElementById('totalCoins');
    const activeExchanges = document.getElementById('activeExchanges');
    const gainersCount = document.getElementById('gainersCount');

    if (totalCoins && data.active_cryptocurrencies) {
      totalCoins.textContent = this.formatNumber(data.active_cryptocurrencies);
    }

    if (activeExchanges && data.markets) {
      activeExchanges.textContent = this.formatNumber(data.markets);
    }

    if (gainersCount && data.market_cap_change_percentage_24h_usd) {
      const changePercent = data.market_cap_change_percentage_24h_usd;
      gainersCount.textContent = `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
      gainersCount.className = `overview-value ${changePercent >= 0 ? 'positive' : 'negative'}`;
    }
  }

  async loadTrendingCryptos() {
    try {
      const response = await this.apiManager.makeRequest({
        url: '/api/trending',
        cacheKey: 'trending_cryptos',
        cacheTTL: 10 * 60 * 1000 // 10 minutes
      });

      if (response.success && response.data) {
        this.displayTrendingCryptos(response.data);
      }
    } catch (error) {
      console.error('Error loading trending cryptos:', error);
    }
  }

  displayTrendingCryptos(trendingData) {
    const container = document.getElementById('trendingCryptos');
    if (!container) return;

    if (!trendingData || trendingData.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <i class="fas fa-fire" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
          <p>No trending data available</p>
        </div>
      `;
      return;
    }

    container.innerHTML = trendingData.map(coin => `
      <div class="trending-coin" data-coin-id="${coin.id}">
        <img src="${coin.thumb}" alt="${coin.name}" class="trending-thumb" loading="lazy">
        <div class="trending-info">
          <div class="trending-name">${coin.name}</div>
          <div class="trending-symbol">${coin.symbol}</div>
        </div>
        <div class="trending-rank">#${coin.market_cap_rank || 'N/A'}</div>
      </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.trending-coin').forEach(coin => {
      coin.addEventListener('click', () => {
        const coinId = coin.dataset.coinId;
        this.showCoinDetails(coinId);
      });
    });
  }

  async loadFearGreedIndex() {
    try {
      const response = await this.apiManager.makeRequest({
        url: '/api/fear-greed',
        cacheKey: 'fear_greed_index',
        cacheTTL: 60 * 60 * 1000 // 1 hour
      });

      if (response.success && response.data) {
        this.updateFearGreedIndex(response.data);
      }
    } catch (error) {
      console.error('Error loading Fear & Greed Index:', error);
    }
  }

  updateFearGreedIndex(data) {
    const valueElement = document.getElementById('fearGreedValue');
    const labelElement = document.getElementById('fearGreedLabel');
    const overviewElement = document.getElementById('fearGreedIndex');

    if (valueElement && data.value) {
      valueElement.textContent = data.value;
    }

    if (labelElement && data.value_classification) {
      labelElement.textContent = data.value_classification;
    }

    if (overviewElement && data.value) {
      overviewElement.textContent = data.value;
    }

    // Update sentiment status
    const sentimentContainer = document.querySelector('.sentiment-details');
    if (sentimentContainer && data.value) {
      const value = parseInt(data.value);
      let statusClass = 'neutral';
      let statusText = 'Neutral';

      if (value <= 25) {
        statusClass = 'extreme-fear';
        statusText = 'Extreme Fear';
      } else if (value <= 45) {
        statusClass = 'fear';
        statusText = 'Fear';
      } else if (value <= 55) {
        statusClass = 'neutral';
        statusText = 'Neutral';
      } else if (value <= 75) {
        statusClass = 'greed';
        statusText = 'Greed';
      } else {
        statusClass = 'extreme-greed';
        statusText = 'Extreme Greed';
      }

      const existingStatus = sentimentContainer.querySelector('.sentiment-status');
      if (existingStatus) {
        existingStatus.className = `sentiment-status ${statusClass}`;
        existingStatus.textContent = statusText;
      } else {
        sentimentContainer.innerHTML = `
          <div class="sentiment-status ${statusClass}">${statusText}</div>
          <div class="sentiment-description">
            Market sentiment based on volatility, volume, social media, and surveys.
          </div>
        `;
      }
    }
  }

  async loadGainersLosers() {
    try {
      const response = await this.apiManager.makeRequest({
        url: '/api/gainers-losers',
        cacheKey: 'gainers_losers',
        cacheTTL: 5 * 60 * 1000 // 5 minutes
      });

      if (response.success && response.data) {
        this.displayGainersLosers(response.data);
      }
    } catch (error) {
      console.error('Error loading gainers/losers:', error);
    }
  }

  displayGainersLosers(data) {
    const container = document.getElementById('gainersLosersList');
    if (!container) return;

    const currentData = this.currentGLTab === 'gainers' ? data.gainers : data.losers;
    
    if (!currentData || currentData.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
          <p>No ${this.currentGLTab} data available</p>
        </div>
      `;
      return;
    }

    container.innerHTML = currentData.map(coin => `
      <div class="gl-item" data-coin-id="${coin.id}">
        <div class="gl-info">
          <img src="${coin.image}" alt="${coin.name}" class="gl-icon" loading="lazy">
          <div class="gl-details">
            <h4>${coin.name}</h4>
            <p>${coin.symbol}</p>
          </div>
        </div>
        <div class="gl-change ${coin.change_24h >= 0 ? 'positive' : 'negative'}">
          <i class="fas fa-${coin.change_24h >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
          ${coin.change_24h >= 0 ? '+' : ''}${coin.change_24h.toFixed(2)}%
        </div>
      </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.gl-item').forEach(item => {
      item.addEventListener('click', () => {
        const coinId = item.dataset.coinId;
        this.showCoinDetails(coinId);
      });
    });
  }

  setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Gainers/Losers tabs
    document.querySelectorAll('.gl-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchGLTab(e.target.dataset.type);
      });
    });

    // View toggle
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchView(e.target.dataset.view);
      });
    });

    // Search functionality
    this.setupSearch();

    // Control handlers
    this.setupControls();

    // Modal handlers
    this.setupModals();

    // Retry button
    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.analyzeTrends();
      });
    }
  }

  setupSearch() {
    const searchInput = document.getElementById('cryptoSearch');
    const searchBtn = document.getElementById('searchCrypto');
    const suggestionsContainer = document.getElementById('searchSuggestions');

    if (!searchInput || !searchBtn || !suggestionsContainer) return;

    const debouncedSearch = this.performanceOptimizer.debounce(
      (query) => this.performSearch(query),
      300,
      'search'
    );

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        debouncedSearch(query);
      } else {
        this.hideSuggestions();
      }
    });

    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        this.performSearch(query);
      }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.hideSuggestions();
      }
    });
  }

  async performSearch(query) {
    try {
      const response = await this.apiManager.makeRequest({
        url: `/api/search?q=${encodeURIComponent(query)}`,
        cacheKey: `search_${query}`,
        cacheTTL: 10 * 60 * 1000 // 10 minutes
      });

      if (response.success && response.data) {
        this.displaySearchSuggestions(response.data);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  displaySearchSuggestions(suggestions) {
    const container = document.getElementById('searchSuggestions');
    if (!container) return;

    if (suggestions.length === 0) {
      container.innerHTML = '<div class="suggestion-item">No results found</div>';
    } else {
      container.innerHTML = suggestions.map(coin => `
        <div class="suggestion-item" data-coin-id="${coin.id}">
          <img src="${coin.thumb}" alt="${coin.name}" loading="lazy">
          <span>${coin.name} (${coin.symbol})</span>
        </div>
      `).join('');

      // Add click handlers
      container.querySelectorAll('.suggestion-item[data-coin-id]').forEach(item => {
        item.addEventListener('click', () => {
          const coinId = item.dataset.coinId;
          this.showCoinDetails(coinId);
          this.hideSuggestions();
          document.getElementById('cryptoSearch').value = '';
        });
      });
    }

    this.showSuggestions();
  }

  showSuggestions() {
    const container = document.getElementById('searchSuggestions');
    if (container) {
      container.classList.add('show');
    }
  }

  hideSuggestions() {
    const container = document.getElementById('searchSuggestions');
    if (container) {
      container.classList.remove('show');
    }
  }

  setupControls() {
    // Limit range slider
    const limitRange = document.getElementById('limitRange');
    const limitValue = document.getElementById('limitValue');

    if (limitRange && limitValue) {
      limitRange.addEventListener('input', (e) => {
        limitValue.textContent = e.target.value;
      });
    }

    // Analyze trends button
    const analyzeBtn = document.getElementById('analyzeTrends');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => {
        this.analyzeTrends();
      });
    }

    // Show graphs button
    const graphsBtn = document.getElementById('showGraphsBtn');
    if (graphsBtn) {
      graphsBtn.addEventListener('click', () => {
        this.showGraphsOverview();
      });
    }

    // Generate predictions button
    const predictionsBtn = document.getElementById('generatePredictions');
    if (predictionsBtn) {
      predictionsBtn.addEventListener('click', () => {
        this.generatePredictions();
      });
    }

    // Chart timeframe change handler
    const graphTimeframe = document.getElementById('graphTimeframe');
    if (graphTimeframe) {
      graphTimeframe.addEventListener('change', () => {
        if (this.currentCoinData) {
          this.showChart(this.currentCoinData.coinId);
        }
      });
    }
  }

  setupModals() {
    // Chart modal
    const modal = document.getElementById('graphModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const backdrop = modal?.querySelector('.modal-backdrop');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideModal('graphModal');
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        this.hideModal('graphModal');
      });
    }

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideModal('graphModal');
      }
    });
  }

  switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Show corresponding content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');

    this.currentTab = tabName;
  }

  switchGLTab(type) {
    // Update active tab
    document.querySelectorAll('.gl-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');

    this.currentGLTab = type;
    this.loadGainersLosers(); // Reload data for new tab
  }

  switchView(view) {
    // Update active view toggle
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    // Update grid class
    const trendsGrid = document.getElementById('trendsGrid');
    if (trendsGrid) {
      trendsGrid.className = view === 'list' ? 'trends-grid list-view' : 'trends-grid';
    }

    this.currentView = view;
  }

  async analyzeTrends() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoading();

    try {
      const timeframe = document.getElementById('timeframe')?.value || '24h';
      const market = document.getElementById('market')?.value || 'all';
      const limit = document.getElementById('limitRange')?.value || 10;
      const sortBy = document.getElementById('sortBy')?.value || 'market_cap';

      const response = await this.apiManager.makeRequest({
        url: `/api/trends?timeframe=${timeframe}&market=${market}&limit=${limit}&sort=${sortBy}`,
        cacheKey: `trends_${timeframe}_${market}_${limit}_${sortBy}`,
        cacheTTL: 2 * 60 * 1000 // 2 minutes
      });

      if (response.success && response.data) {
        this.displayTrends(response.data);
        this.updateLastUpdatedTime();
      } else {
        throw new Error(response.error || 'Failed to fetch trends');
      }
    } catch (error) {
      console.error('Error analyzing trends:', error);
      this.showError(error.message);
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  displayTrends(trends) {
    const container = document.getElementById('trendsGrid');
    if (!container) return;

    if (!trends || trends.length === 0) {
      container.innerHTML = `
        <div class="error-container">
          <div class="error-icon">
            <i class="fas fa-chart-line"></i>
          </div>
          <h3 class="error-title">No Trends Found</h3>
          <p class="error-message">No cryptocurrency trends match your current filters.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = trends.map(coin => this.createTrendCard(coin)).join('');

    // Add event listeners to action buttons
    this.setupTrendCardActions();
  }

  createTrendCard(coin) {
    const changeClass = coin.change_24h >= 0 ? 'positive' : 'negative';
    const changeIcon = coin.change_24h >= 0 ? 'arrow-up' : 'arrow-down';

    return `
      <div class="trend-card fade-in-up" data-coin-id="${coin.id}">
        <div class="trend-card-header">
          <img src="${coin.image}" alt="${coin.name}" class="trend-image" loading="lazy">
          <div class="trend-info">
            <h3>${coin.name}</h3>
            <div class="trend-symbol">${coin.symbol}</div>
            <div class="trend-rank">Rank #${coin.market_cap_rank || 'N/A'}</div>
          </div>
        </div>
        
        <div class="trend-details">
          <div class="trend-price">$${this.formatPrice(coin.price)}</div>
          
          <div class="trend-changes">
            <div class="change-item">
              <div class="change-label">24h Change</div>
              <div class="change-value ${changeClass}">
                <i class="fas fa-${changeIcon}"></i>
                ${coin.change_24h >= 0 ? '+' : ''}${coin.change_24h.toFixed(2)}%
              </div>
            </div>
            <div class="change-item">
              <div class="change-label">Volume</div>
              <div class="change-value">$${this.formatCurrency(coin.volume_24h)}</div>
            </div>
          </div>
          
          <div class="trend-stats">
            <div class="stat-item">
              <div class="stat-label">Market Cap</div>
              <div class="stat-value">$${this.formatCurrency(coin.market_cap)}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Supply</div>
              <div class="stat-value">${this.formatNumber(coin.circulating_supply)}</div>
            </div>
          </div>
          
          <div class="trend-actions">
            <button class="action-btn" data-action="details" data-coin-id="${coin.id}">
              <i class="fas fa-info-circle"></i>
              <span>Details</span>
            </button>
            <button class="action-btn" data-action="chart" data-coin-id="${coin.id}">
              <i class="fas fa-chart-line"></i>
              <span>Chart</span>
            </button>
            <button class="action-btn" data-action="predict" data-coin-id="${coin.id}">
              <i class="fas fa-brain"></i>
              <span>Predict</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  setupTrendCardActions() {
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const coinId = btn.dataset.coinId;

        switch (action) {
          case 'details':
            this.showCoinDetails(coinId);
            break;
          case 'chart':
            this.showChart(coinId);
            break;
          case 'predict':
            this.generateCoinPrediction(coinId);
            break;
        }
      });
    });
  }

  async showCoinDetails(coinId) {
    try {
      const response = await this.apiManager.makeRequest({
        url: `/api/coin/${coinId}`,
        cacheKey: `coin_${coinId}`,
        cacheTTL: 5 * 60 * 1000 // 5 minutes
      });

      if (response.success && response.data) {
        this.displayCoinDetailsModal(response.data);
      }
    } catch (error) {
      console.error('Error fetching coin details:', error);
      this.showNotification('Failed to load coin details', 'error');
    }
  }

  displayCoinDetailsModal(coin) {
    const modalHTML = `
      <div id="coinDetailsModal" class="modal show">
        <div class="modal-backdrop"></div>
        <div class="modal-content coin-details-modal">
          <div class="modal-header">
            <h3 class="modal-title">Coin Details</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="coin-header">
              <img src="${coin.image}" alt="${coin.name}" class="coin-image">
              <div class="coin-info">
                <h2>${coin.name} (${coin.symbol})</h2>
                <div class="coin-price">$${this.formatPrice(coin.current_price)}</div>
                <div class="coin-change ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">
                  <i class="fas fa-${coin.price_change_percentage_24h >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                  ${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%
                </div>
              </div>
            </div>
            
            <div class="coin-stats-grid">
              <div class="stat-card">
                <div class="stat-label">Market Cap</div>
                <div class="stat-value">$${this.formatCurrency(coin.market_cap)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Volume 24h</div>
                <div class="stat-value">$${this.formatCurrency(coin.volume_24h)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Rank</div>
                <div class="stat-value">#${coin.market_cap_rank || 'N/A'}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">All Time High</div>
                <div class="stat-value">$${this.formatPrice(coin.ath)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Circulating Supply</div>
                <div class="stat-value">${this.formatNumber(coin.circulating_supply)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Max Supply</div>
                <div class="stat-value">${coin.max_supply ? this.formatNumber(coin.max_supply) : 'N/A'}</div>
              </div>
            </div>
            
            <div class="coin-description">
              <h3>About ${coin.name}</h3>
              <p>${coin.description || 'No description available.'}</p>
            </div>
            
            <div class="modal-actions">
              <button class="btn btn-primary" onclick="window.trendBot.showChart('${coin.id}')">
                <i class="fas fa-chart-line"></i>
                <span>View Chart</span>
              </button>
              <button class="btn btn-secondary" onclick="window.trendBot.generateCoinPrediction('${coin.id}')">
                <i class="fas fa-brain"></i>
                <span>AI Prediction</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal
    const existingModal = document.getElementById('coinDetailsModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  async showChart(coinId) {
    try {
      const modal = document.getElementById('graphModal');
      const title = document.getElementById('graphModalTitle');
      
      // Store current coin data for timeframe changes
      this.currentCoinData = { coinId };
      
      if (title) {
        title.textContent = `Price Chart - ${coinId.toUpperCase()}`;
      }

      this.showModal('graphModal');

      const days = document.getElementById('graphTimeframe')?.value || '7';
      const response = await this.apiManager.makeRequest({
        url: `/api/chart/${coinId}?days=${days}`,
        cacheKey: `chart_${coinId}_${days}`,
        cacheTTL: 5 * 60 * 1000 // 5 minutes
      });

      if (response.success && response.data) {
        this.renderChart(response.data, coinId);
      }
    } catch (error) {
      console.error('Error loading chart:', error);
      this.showNotification('Failed to load chart data', 'error');
    }
  }

  renderChart(chartData, coinId) {
    const canvas = document.getElementById('priceChartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }

    const prices = chartData.prices || [];
    const labels = prices.map(p => new Date(p.timestamp));
    const data = prices.map(p => p.price);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${coinId.toUpperCase()} Price (USD)`,
          data: data,
          borderColor: 'rgb(74, 158, 255)',
          backgroundColor: 'rgba(74, 158, 255, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: 'rgb(74, 158, 255)',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: 'rgba(255, 255, 255, 0.8)',
              font: {
                size: 12,
                weight: 'bold'
              }
            }
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgb(74, 158, 255)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            padding: 12,
            callbacks: {
              title: function(context) {
                const date = new Date(context[0].parsed.x);
                return date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              },
              label: function(context) {
                const price = context.parsed.y;
                return `Price: $${price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: price >= 1 ? 2 : 8
                })}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                hour: 'MMM dd, HH:mm',
                day: 'MMM dd',
                week: 'MMM dd',
                month: 'MMM yyyy'
              }
            },
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              font: {
                size: 11
              },
              maxTicksLimit: 8
            }
          },
          y: {
            display: true,
            position: 'right',
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              font: {
                size: 11
              },
              callback: function(value) {
                return '$' + value.toLocaleString('en-US', {
                  minimumFractionDigits: value >= 1 ? 2 : 4,
                  maximumFractionDigits: value >= 1 ? 2 : 8
                });
              }
            }
          }
        },
        elements: {
          point: {
            radius: 0,
            hoverRadius: 6
          },
          line: {
            borderJoinStyle: 'round'
          }
        },
        hover: {
          animationDuration: 200
        },
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    });
  }

  async generateCoinPrediction(coinId) {
    try {
      this.showNotification('Generating AI prediction...', 'info');

      // Get chart data for prediction
      const chartResponse = await this.apiManager.makeRequest({
        url: `/api/chart/${coinId}?days=30`,
        cacheKey: `chart_${coinId}_30`,
        cacheTTL: 5 * 60 * 1000
      });

      if (chartResponse.success && chartResponse.data) {
        const prices = chartResponse.data.prices.map(p => p.price);
        const timeframe = document.getElementById('predictionTimeframe')?.value || '7d';
        
        const prediction = await this.predictionEngine.generatePrediction(coinId, prices, timeframe);
        this.displayPredictionModal(coinId, prediction);
      }
    } catch (error) {
      console.error('Error generating prediction:', error);
      this.showNotification('Failed to generate prediction', 'error');
    }
  }

  displayPredictionModal(coinId, prediction) {
    const modalHTML = `
      <div id="predictionModal" class="modal show">
        <div class="modal-backdrop"></div>
        <div class="modal-content prediction-modal">
          <div class="modal-header">
            <h3 class="modal-title">AI Prediction - ${coinId.toUpperCase()}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="prediction-overview">
              <div class="prediction-header">
                <div class="prediction-coin">
                  <h2>${coinId.toUpperCase()}</h2>
                  <div class="current-price">Current: $${this.formatPrice(prediction.currentPrice)}</div>
                </div>
                <div class="prediction-direction ${prediction.direction}">
                  <i class="fas fa-${prediction.direction === 'bullish' ? 'arrow-up' : 'arrow-down'}"></i>
                  ${prediction.direction.toUpperCase()}
                </div>
                <div class="confidence-meter">
                  <div class="confidence-label">Confidence</div>
                  <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${prediction.confidence * 100}%"></div>
                  </div>
                  <div class="confidence-value">${(prediction.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>

            <div class="price-targets-section">
              <h3><i class="fas fa-bullseye"></i>Price Targets</h3>
              <div class="targets-grid">
                <div class="target-card conservative">
                  <div class="target-label">Conservative</div>
                  <div class="target-value">$${this.formatPrice(prediction.targets.conservative)}</div>
                  <div class="target-change">
                    ${((prediction.targets.conservative - prediction.currentPrice) / prediction.currentPrice * 100).toFixed(1)}%
                  </div>
                </div>
                <div class="target-card moderate">
                  <div class="target-label">Moderate</div>
                  <div class="target-value">$${this.formatPrice(prediction.targets.moderate)}</div>
                  <div class="target-change">
                    ${((prediction.targets.moderate - prediction.currentPrice) / prediction.currentPrice * 100).toFixed(1)}%
                  </div>
                </div>
                <div class="target-card aggressive">
                  <div class="target-label">Aggressive</div>
                  <div class="target-value">$${this.formatPrice(prediction.targets.aggressive)}</div>
                  <div class="target-change">
                    ${((prediction.targets.aggressive - prediction.currentPrice) / prediction.currentPrice * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div class="support-resistance">
                <div class="sr-item">
                  <span class="sr-label">Support</span>
                  <span class="sr-value support">$${this.formatPrice(prediction.targets.support)}</span>
                </div>
                <div class="sr-item">
                  <span class="sr-label">Resistance</span>
                  <span class="sr-value resistance">$${this.formatPrice(prediction.targets.resistance)}</span>
                </div>
                <div class="sr-item">
                  <span class="sr-label">Stop Loss</span>
                  <span class="sr-value stop-loss">$${this.formatPrice(prediction.targets.stopLoss)}</span>
                </div>
              </div>
            </div>

            <div class="trading-signals-section">
              <h3><i class="fas fa-signal"></i>Trading Signals</h3>
              <div class="signals-list">
                ${prediction.signals.map(signal => `
                  <div class="signal-item ${signal.type}">
                    <div class="signal-type">
                      <i class="fas fa-${signal.type === 'buy' ? 'arrow-up' : 'arrow-down'}"></i>
                      ${signal.type.toUpperCase()}
                    </div>
                    <div class="signal-reason">${signal.reason}</div>
                    <div class="signal-strength ${signal.strength}">${signal.strength}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="risk-assessment-section">
              <h3><i class="fas fa-shield-alt"></i>Risk Assessment</h3>
              <div class="risk-info">
                <div class="risk-level ${prediction.riskLevel}">
                  <span class="risk-label">Risk Level</span>
                  <span class="risk-value">${prediction.riskLevel.toUpperCase()}</span>
                </div>
                <div class="accuracy-estimate">
                  <span class="accuracy-label">Accuracy Estimate</span>
                  <span class="accuracy-value">${(prediction.accuracy * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <div class="prediction-disclaimer">
              <p>
                <i class="fas fa-exclamation-triangle"></i>
                This prediction is generated by AI analysis and should not be considered as financial advice. 
                Cryptocurrency investments are highly volatile and risky. Always do your own research and 
                consult with financial advisors before making investment decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal
    const existingModal = document.getElementById('predictionModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  async generatePredictions() {
    this.showNotification('Generating market predictions...', 'info');
    
    const container = document.getElementById('predictionsOverview');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <div class="loading-spinner"></div>
          <p style="color: var(--text-secondary); margin-top: 1rem;">
            Analyzing market data and generating predictions...
          </p>
        </div>
      `;
    }

    // Simulate prediction generation
    setTimeout(() => {
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            <i class="fas fa-brain" style="font-size: 3rem; margin-bottom: 1rem; color: var(--accent-primary);"></i>
            <h3 style="color: var(--text-primary); margin-bottom: 1rem;">Market Predictions Generated</h3>
            <p>Use the "Predict" button on individual cryptocurrency cards for detailed AI analysis and price predictions.</p>
          </div>
        `;
      }
      this.showNotification('Market predictions ready!', 'success');
    }, 2000);
  }

  showGraphsOverview() {
    const modalHTML = `
      <div id="graphsOverviewModal" class="modal show">
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Charts Overview</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="graphs-overview">
              <h3>Interactive Price Charts</h3>
              <p>View detailed price charts for any cryptocurrency by clicking the "Chart" button on individual coin cards.</p>
              <div class="chart-buttons">
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                  <i class="fas fa-chart-line"></i>
                  <span>View Coin Charts</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  showLoading() {
    const loadingState = document.getElementById('loadingState');
    const trendsDisplay = document.getElementById('trendsDisplay');
    const errorState = document.getElementById('errorState');

    if (loadingState) loadingState.style.display = 'flex';
    if (trendsDisplay) trendsDisplay.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
  }

  hideLoading() {
    const loadingState = document.getElementById('loadingState');
    const trendsDisplay = document.getElementById('trendsDisplay');

    if (loadingState) loadingState.style.display = 'none';
    if (trendsDisplay) trendsDisplay.style.display = 'block';
  }

  showError(message) {
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const loadingState = document.getElementById('loadingState');
    const trendsDisplay = document.getElementById('trendsDisplay');

    if (errorMessage) errorMessage.textContent = message;
    if (errorState) errorState.style.display = 'flex';
    if (loadingState) loadingState.style.display = 'none';
    if (trendsDisplay) trendsDisplay.style.display = 'none';
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Hide notification
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  updateLastUpdatedTime() {
    const element = document.getElementById('lastUpdatedTime');
    if (element) {
      element.textContent = 'Just now';
      this.lastUpdateTime = Date.now();
    }
  }

  setupAutoRefresh() {
    // Refresh data every 5 minutes
    setInterval(() => {
      if (!this.isLoading) {
        this.loadInitialData();
      }
    }, 5 * 60 * 1000);

    // Update "last updated" time every minute
    setInterval(() => {
      if (this.lastUpdateTime) {
        const element = document.getElementById('lastUpdatedTime');
        if (element) {
          const minutes = Math.floor((Date.now() - this.lastUpdateTime) / 60000);
          element.textContent = minutes === 0 ? 'Just now' : `${minutes} min ago`;
        }
      }
    }, 60000);
  }

  setupPerformanceOptimization() {
    // Optimize images
    document.querySelectorAll('img').forEach(img => {
      if (!img.loading) {
        img.loading = 'lazy';
      }
    });

    // Setup intersection observer for animations
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-up');
          }
        });
      });

      document.querySelectorAll('.trend-card').forEach(card => {
        observer.observe(card);
      });
    }
  }

  // Utility methods
  formatPrice(price) {
    if (price >= 1) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 8
      });
    }
  }

  formatCurrency(amount) {
    if (amount >= 1e12) {
      return (amount / 1e12).toFixed(2) + 'T';
    } else if (amount >= 1e9) {
      return (amount / 1e9).toFixed(2) + 'B';
    } else if (amount >= 1e6) {
      return (amount / 1e6).toFixed(2) + 'M';
    } else if (amount >= 1e3) {
      return (amount / 1e3).toFixed(2) + 'K';
    } else {
      return amount.toFixed(2);
    }
  }

  formatNumber(num) {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(1) + 'B';
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(1) + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(1) + 'K';
    } else {
      return num.toLocaleString();
    }
  }
}

// Initialize TrendBot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.trendBot = new TrendBot();
});

// Export for global access
window.TrendBot = TrendBot;