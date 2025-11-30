// Internal Linking Engine - Automatically creates contextual links between pages

class InternalLinkingEngine {
    constructor(allPages) {
        this.pages = allPages; // Array of all pSEO pages
    }

    // Find related pages based on content similarity
    findRelatedPages(currentPage, count = 6) {
        const related = [];

        // 1. Same industry, different locations
        const sameIndustry = this.pages.filter(p =>
            p.industry === currentPage.industry &&
            p.location !== currentPage.location &&
            p.type === currentPage.type
        ).slice(0, 2);
        related.push(...sameIndustry);

        // 2. Same location, different industries
        const sameLocation = this.pages.filter(p =>
            p.location === currentPage.location &&
            p.industry !== currentPage.industry &&
            p.type === currentPage.type
        ).slice(0, 2);
        related.push(...sameLocation);

        // 3. Same industry + location, different tender type
        const sameBoth = this.pages.filter(p =>
            p.industry === currentPage.industry &&
            p.location === currentPage.location &&
            p.type !== currentPage.type
        ).slice(0, 2);
        related.push(...sameBoth);

        return related.slice(0, count);
    }

    // Generate breadcrumb trail
    generateBreadcrumbs(page) {
        return [
            { name: 'Home', url: '/' },
            { name: 'AI Tender Writing', url: '/ai-tender-writing' },
            { name: this.formatName(page.type), url: `/ai-tender-writing/${page.type}` },
            { name: this.formatName(page.industry), url: `/ai-tender-writing/${page.type}/${page.industry}` },
            { name: page.location.toUpperCase(), url: page.url }
        ];
    }

    // Generate contextual internal links for content
    generateContextualLinks(pageContent, currentPage) {
        const links = [];

        // Find pages mentioned in content
        this.pages.forEach(page => {
            if (page.url === currentPage.url) return;

            // Check if industry is mentioned
            if (pageContent.toLowerCase().includes(page.industry.replace(/-/g, ' '))) {
                links.push({
                    anchorText: `${this.formatName(page.industry)} tenders in ${page.location.toUpperCase()}`,
                    url: page.url,
                    relevance: 'high'
                });
            }

            // Check if location is mentioned
            if (pageContent.toLowerCase().includes(page.location)) {
                links.push({
                    anchorText: `Government tenders in ${page.location.toUpperCase()}`,
                    url: page.url,
                    relevance: 'medium'
                });
            }
        });

        // Deduplicate and limit
        const uniqueLinks = Array.from(new Map(links.map(l => [l.url, l])).values());
        return uniqueLinks.slice(0, 10);
    }

    // Generate sidebar/footer related links
    generateRelatedLinksSection(currentPage) {
        const related = this.findRelatedPages(currentPage, 6);

        return {
            title: 'Related Tender Opportunities',
            links: related.map(page => ({
                title: `${this.formatName(page.industry)} - ${page.location.toUpperCase()}`,
                url: page.url,
                description: `AI-powered ${this.formatName(page.type)} for ${this.formatName(page.industry)}`
            }))
        };
    }

    // Helper: Format slug to readable name
    formatName(slug) {
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Generate complete page link structure
    getPageLinkData(currentPage) {
        return {
            breadcrumbs: this.generateBreadcrumbs(currentPage),
            relatedPages: this.findRelatedPages(currentPage),
            relatedLinksSection: this.generateRelatedLinksSection(currentPage)
        };
    }
}

module.exports = InternalLinkingEngine;
