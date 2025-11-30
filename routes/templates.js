const express = require('express');
const router = express.Router();

// Tender template categories with pre-built structures
const TEMPLATES = {
    'it-consulting': {
        title: 'IT Consulting & Services',
        description: 'Proven template for IT consulting tenders',
        sections: [
            {
                name: 'Executive Summary',
                prompt: 'Create a compelling 2-paragraph executive summary highlighting our IT consulting expertise, focusing on digital transformation, cloud migration, and cybersecurity. Emphasize our track record of delivering projects on time and under budget.'
            },
            {
                name: 'Understanding of Requirements',
                prompt: 'Demonstrate deep understanding of the client\'s IT challenges. Reference their current infrastructure, pain points mentioned in the RFP, and how our approach addresses each requirement. Show we\'ve done our homework.'
            },
            {
                name: 'Technical Approach',
                prompt: 'Detail our methodology: Discovery phase → Requirements analysis → Solution design → Implementation → Testing → Handover. Include specific frameworks (ITIL, Agile, DevOps) and tools (Terraform, Kubernetes, etc.)'
            },
            {
                name: 'Team & Experience',
                prompt: 'Highlight key personnel: Project Manager (PMP certified, 10+ years), Solution Architect (AWS/Azure certified), and developers. Include 3-5 relevant case studies with metrics (e.g., "Reduced downtime by 60%")'
            },
            {
                name: 'Project Plan',
                prompt: 'Create realistic timeline with milestones. Typical: Month 1-2 (Discovery), Month 3-4 (Design), Month 5-8 (Implementation), Month 9 (Testing), Month 10 (Go-live). Include risk mitigation strategies.'
            },
            {
                name: 'Quality Assurance',
                prompt: 'Detail QA process: Code reviews, automated testing (unit, integration, E2E), security audits, performance testing. Mention ISO 27001 compliance if applicable.'
            },
            {
                name: 'Pricing',
                prompt: 'Structure: Fixed price for discovery, time & materials for implementation with monthly caps. Typical range: €50K-€500K depending on scope. Include payment milestones tied to deliverables.'
            }
        ]
    },
    'cloud-migration': {
        title: 'Cloud Migration Services',
        description: 'Structured template for cloud infrastructure projects',
        sections: [
            {
                name: 'Executive Summary',
                prompt: 'Position as cloud migration specialists with focus on AWS/Azure/GCP. Highlight cost savings (typically 30-40%) and improved scalability achieved for previous clients.'
            },
            {
                name: 'Migration Strategy',
                prompt: 'Outline 6R strategy: Rehost, Replatform, Refactor, Repurchase, Retire, Retain. Explain assessment process to determine best approach for each workload.'
            },
            {
                name: 'Technical Architecture',
                prompt: 'Describe target architecture: VPC design, security groups, IAM policies, disaster recovery, backup strategy. Include architecture diagrams and compliance measures.'
            },
            {
                name: 'Migration Phases',
                prompt: 'Phase 1: Assessment & Planning (4 weeks), Phase 2: Pilot Migration (4 weeks), Phase 3: Full Migration (12 weeks), Phase 4: Optimization (ongoing). Include rollback plans.'
            }
        ]
    },
    'construction': {
        title: 'Construction Services',
        description: 'Template for construction and infrastructure tenders',
        sections: [
            {
                name: 'Executive Summary',
                prompt: 'Highlight construction experience, safety record (zero incidents target), and on-time delivery rate. Emphasize local presence and understanding of regulations.'
            },
            {
                name: 'Project Understanding',
                prompt: 'Demonstrate understanding of site conditions, local building codes, environmental considerations, and stakeholder requirements from the tender documentation.'
            },
            {
                name: 'Methodology',
                prompt: 'Detail construction methodology: Site preparation → Foundation → Structural work → MEP installation → Finishing → Testing. Include safety protocols and quality control measures.'
            },
            {
                name: 'Resources & Equipment',
                prompt: 'List key personnel (Site Manager, Quantity Surveyor, H&S Officer), subcontractors, and equipment. Include certifications and insurance coverage.'
            }
        ]
    },
    'healthcare': {
        title: 'Healthcare Services',
        description: 'Template for healthcare and medical services tenders',
        sections: [
            {
                name: 'Executive Summary',
                prompt: 'Emphasize healthcare expertise, patient outcomes, regulatory compliance (HIPAA, GDPR), and quality certifications (ISO 9001, CQC rating).'
            },
            {
                name: 'Service Delivery Model',
                prompt: 'Describe service delivery: Staff qualifications, patient care protocols, clinical governance, safeguarding procedures, and 24/7 support arrangements.'
            },
            {
                name: 'Quality & Compliance',
                prompt: 'Detail quality assurance framework, audit processes, incident reporting, continuous improvement mechanisms, and how you meet CQC fundamental standards.'
            }
        ]
    }
};

// Get all templates
router.get('/', async (req, res) => {
    try {
        const templateList = Object.keys(TEMPLATES).map(key => ({
            id: key,
            title: TEMPLATES[key].title,
            description: TEMPLATES[key].description,
            sectionCount: TEMPLATES[key].sections.length
        }));

        res.json({
            success: true,
            templates: templateList
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// Get specific template
router.get('/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const template = TEMPLATES[templateId];

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({
            success: true,
            template: {
                id: templateId,
                ...template
            }
        });
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

// Generate proposal from template
router.post('/:templateId/generate', async (req, res) => {
    try {
        const { templateId } = req.params;
        const { companyProfile, tenderContext } = req.body;

        const template = TEMPLATES[templateId];
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Generate each section using the template prompts
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        let fullProposal = `# ${template.title}\n\n`;

        for (const section of template.sections) {
            const prompt = `
${section.prompt}

COMPANY PROFILE:
"""
${companyProfile}
"""

TENDER CONTEXT:
"""
${tenderContext}
"""

Write this section for the proposal. Be specific, professional, and compelling.
`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                temperature: 0.5,
                messages: [{ role: 'user', content: prompt }],
            });

            const sectionContent = completion.choices?.[0]?.message?.content || '';
            fullProposal += `## ${section.name}\n\n${sectionContent}\n\n`;
        }

        res.json({
            success: true,
            proposal: fullProposal,
            sectionsGenerated: template.sections.length
        });

    } catch (error) {
        console.error('Error generating from template:', error);
        res.status(500).json({ error: 'Failed to generate proposal from template' });
    }
});

module.exports = router;
