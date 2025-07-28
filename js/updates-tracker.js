// Uses NewsAPI to track presidential accomplishments and updates
const NEWS_SOURCES = [
    'rappler.com',
    'philstar.com',
    'inquirer.net',
    'pna.gov.ph'
];

class UpdatesTracker {
    constructor() {
        this.newsApiKey = '86f128566a894abaac004b739797df21';
        this.cacheDuration = 3600000; // 1 hour cache
        this.cache = {
            lastUpdate: 0,
            data: null
        };
    }

    async getUpdates() {
        if (this.cache.data && (Date.now() - this.cache.lastUpdate) < this.cacheDuration) {
            return this.cache.data;
        }

        try {
            // Fetch from multiple sources
            const updates = await Promise.all([
                this.fetchNewsUpdates(),
                this.fetchPNAUpdates(),
                this.fetchOfficialUpdates()
            ]);

            // Combine and sort updates
            const combinedUpdates = this.processUpdates(updates.flat());

            // Update cache
            this.cache.data = combinedUpdates;
            this.cache.lastUpdate = Date.now();

            return combinedUpdates;
        } catch (error) {
            console.error('Error fetching updates:', error);
            return [];
        }
    }

    async fetchNewsUpdates() {
        // Check if we're in production (not localhost)
        const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

        if (isProduction) {
            // Return static updates in production
            return this.getStaticUpdates();
        }

        const query = 'President Marcos accomplishments OR achievements OR progress';
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&domains=${NEWS_SOURCES.join(',')}&language=en&sortBy=publishedAt`;

        try {
            const response = await fetch(url, {
                headers: {
                    'X-Api-Key': this.newsApiKey
                }
            });
            const data = await response.json();
            return this.formatNewsData(data.articles);
        } catch (error) {
            console.error('Error fetching news:', error);
            // Fallback to static updates if API fails
            return this.getStaticUpdates();
        }
    }

    getStaticUpdates() {
        // Static updates based on SONA data
        const sonaData = {
            "updates": [
                {
                    "title": "Infrastructure Progress: MRT-7 Now 80% Complete",
                    "description": "The MRT-7 project connecting Quezon City to Bulacan shows significant progress with 80% completion rate, promising improved transportation for commuters.",
                    "source": "Infrastructure Update",
                    "url": "#infrastructure",
                    "date": new Date(2025, 6, 24),
                    "type": "official"
                },
                {
                    "title": "Economic Milestone: Inflation Rate Drops to 1.4%",
                    "description": "The Philippines records a significant economic achievement with inflation rate dropping to 1.4%, marking a substantial improvement from previous years.",
                    "source": "Economic Report",
                    "url": "#economy",
                    "date": new Date(2025, 6, 24),
                    "type": "official"
                },
                {
                    "title": "Agricultural Initiative: P20/Kilo Rice Program Progress",
                    "description": "The administration's flagship P20/kilo rice program shows progress in implementation, aiming to make rice more affordable for Filipino families.",
                    "source": "Agriculture Update",
                    "url": "#agriculture",
                    "date": new Date(2025, 6, 24),
                    "type": "official"
                },
                {
                    "title": "Philippines Secures $21B in US Investment Pledges",
                    "description": "Major economic breakthrough as US investors commit $21 billion in various sectors, boosting economic outlook.",
                    "source": "Investment News",
                    "url": "#economy",
                    "date": new Date(2025, 6, 24),
                    "type": "news"
                },
                {
                    "title": "Climate Leadership: PH Joins Loss and Damage Fund Board",
                    "description": "The Philippines strengthens its position in global climate action by securing a seat on the Loss and Damage Fund Board.",
                    "source": "Governance Update",
                    "url": "#governance",
                    "date": new Date(2025, 6, 24),
                    "type": "news"
                }
            ]
        };
        return sonaData.updates;
    }

    async fetchPNAUpdates() {
        // Philippine News Agency RSS feed
        const pnaUrl = 'https://www.pna.gov.ph/articles/rss';
        try {
            const response = await fetch(pnaUrl);
            const text = await response.text();
            // Parse RSS feed
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            return this.formatPNAData(xml);
        } catch (error) {
            console.error('Error fetching PNA updates:', error);
            return [];
        }
    }

    async fetchOfficialUpdates() {
        // Presidential Communications Office updates
        const pcoUrl = 'https://pcoo.gov.ph/feed/';
        try {
            const response = await fetch(pcoUrl);
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            return this.formatPCOData(xml);
        } catch (error) {
            console.error('Error fetching PCO updates:', error);
            return [];
        }
    }

    formatNewsData(articles) {
        return articles.map(article => ({
            title: article.title,
            description: article.description,
            source: article.source.name,
            url: article.url,
            date: new Date(article.publishedAt),
            type: 'news',
            category: this.categorizeUpdate(article.title + ' ' + article.description)
        }));
    }

    formatPNAData(xml) {
        const items = xml.querySelectorAll('item');
        return Array.from(items).map(item => ({
            title: item.querySelector('title').textContent,
            description: item.querySelector('description').textContent,
            source: 'Philippine News Agency',
            url: item.querySelector('link').textContent,
            date: new Date(item.querySelector('pubDate').textContent),
            type: 'government',
            category: this.categorizeUpdate(item.querySelector('title').textContent + ' ' + item.querySelector('description').textContent)
        }));
    }

    formatPCOData(xml) {
        const items = xml.querySelectorAll('item');
        return Array.from(items).map(item => ({
            title: item.querySelector('title').textContent,
            description: item.querySelector('description').textContent,
            source: 'Presidential Communications Office',
            url: item.querySelector('link').textContent,
            date: new Date(item.querySelector('pubDate').textContent),
            type: 'official',
            category: this.categorizeUpdate(item.querySelector('title').textContent + ' ' + item.querySelector('description').textContent)
        }));
    }

    categorizeUpdate(text) {
        const categories = {
            economy: ['economy', 'gdp', 'inflation', 'investment', 'trade', 'business'],
            infrastructure: ['infrastructure', 'build', 'construction', 'railway', 'road', 'bridge'],
            agriculture: ['agriculture', 'farming', 'rice', 'food security'],
            governance: ['governance', 'corruption', 'reform', 'policy'],
            foreign_relations: ['foreign', 'diplomatic', 'international', 'bilateral'],
            social: ['education', 'health', 'welfare', 'poverty', 'housing']
        };

        text = text.toLowerCase();
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }
        return 'other';
    }

    processUpdates(updates) {
        // Remove duplicates and sort by date
        const uniqueUpdates = this.removeDuplicates(updates);
        return uniqueUpdates.sort((a, b) => b.date - a.date);
    }

    removeDuplicates(updates) {
        const seen = new Set();
        return updates.filter(update => {
            const key = update.title.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}

// Export for use in other files
window.UpdatesTracker = UpdatesTracker;
