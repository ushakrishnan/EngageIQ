#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

async function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf8')
    const lines = text.split(/\r?\n/)
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m) {
        let val = m[2].trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        process.env[m[1]] = val
      }
    }
  }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

async function main() {
  await loadEnv()
  const { CosmosClient } = await import('@azure/cosmos')

  const endpoint = process.env.VITE_COSMOS_ENDPOINT
  const key = process.env.VITE_COSMOS_KEY
  const dbName = process.env.VITE_COSMOS_DATABASE_NAME || 'EngageIQ'
  const fallbackName = process.env.VITE_COSMOS_CONTAINER_NAME || 'data'

  if (!endpoint || !key) {
    console.error('Cosmos DB config missing in environment')
    process.exit(1)
  }

  const client = new CosmosClient({ endpoint, key, userAgentSuffix: 'EngageIQ-FreshSeed' })
  const { database } = await client.databases.createIfNotExists({ id: dbName })

  const typeToContainer = {
    user: 'users',
    post: 'posts',
    'daily-progress': 'daily-progress',
    group: 'groups',
    comment: 'comments',
    report: 'reports',
    achievement: 'achievements',
    karma: 'karma',
    audit: 'audit',
    error: 'errors'
  }

  // Delete existing containers (only the known ones, and fallback)
  const toDelete = Object.values(typeToContainer).concat([fallbackName])
  for (const name of toDelete) {
    try {
      const cont = database.container(name)
      await cont.delete()
      console.log(chalk.gray('Deleted container:'), name)
    } catch (e) {
      console.log(chalk.gray('No existing container to delete or failed:'), name)
    }
  }

  // Re-create per-type containers
  for (const name of Object.values(typeToContainer)) {
    await database.containers.createIfNotExists({ id: name, partitionKey: '/id' })
    console.log(chalk.green('Created container:'), name)
  }

  // Create fallback container
  await database.containers.createIfNotExists({ id: fallbackName, partitionKey: '/partitionKey' })
  console.log(chalk.green('Created fallback container:'), fallbackName)

  // Create additional containers for tags and config
  await database.containers.createIfNotExists({ id: 'tags', partitionKey: '/id' })
  console.log(chalk.green('Created container: tags'))
  await database.containers.createIfNotExists({ id: 'config', partitionKey: '/id' })
  console.log(chalk.green('Created container: config'))

  // Seed demo data into per-type containers
  // Expanded demo users for richer seeded data
  const demoUsers = [
    {
      id: 'demo-user-admin',
      name: 'EngageIQ Admin',
      email: 'engageiq_admin@demo.com',
      avatar: '',
      bio: 'Platform administrator account',
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 90,
      following: ['demo-user-1', 'demo-user-3', 'demo-user-4'],
      followers: ['demo-user-4', 'demo-user-6'],
      title: 'Platform Admin',
      company: 'EngageIQ',
      location: 'Remote',
      experience: [],
      skills: ['Product', 'Platform', 'Diagnostics'],
      roles: ['engageiq_admin'],
      karma: 9999,
      status: 'online',
      statusMessage: 'Overseeing the platform',
      interestedTopics: ['Technology', 'Product', 'Platform', 'DevOps'],
      onboardingCompleted: true
    },
    {
      id: 'demo-user-1',
      name: 'Alice Johnson',
      email: 'alice@demo.com',
      avatar: '',
      bio: 'Senior Software Engineer passionate about AI and machine learning.',
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
      following: ['demo-user-2', 'demo-user-5', 'demo-user-4'],
      followers: ['demo-user-admin', 'demo-user-6'],
      title: 'Senior Software Engineer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      skills: ['React', 'TypeScript', 'Python', 'Machine Learning', 'AWS'],
      roles: [],
      karma: 1250,
      status: 'online',
      statusMessage: 'Building the future 🚀',
      interestedTopics: ['Technology', 'AI & Machine Learning', 'Programming', 'Innovation'],
      onboardingCompleted: true
    },
    {
      id: 'demo-user-2',
      name: 'Bob Smith',
      email: 'bob@demo.com',
      avatar: '',
      bio: 'Creative Director with a passion for visual storytelling and brand experiences.',
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
      following: ['demo-user-7', 'demo-user-1'],
      followers: ['demo-user-3', 'demo-user-5'],
      title: 'Creative Director',
      company: 'Design Studio Pro',
      location: 'New York, NY',
      skills: ['Adobe Creative Suite', 'Branding', 'UI/UX', 'Photography'],
      roles: [],
      karma: 890,
      status: 'away',
      statusMessage: 'In a creative flow ✨',
      interestedTopics: ['Design', 'UI/UX', 'Art & Illustration', 'Photography'],
      onboardingCompleted: true
    },
    {
      id: 'demo-user-3',
      name: 'Carol Davis',
      email: 'carol@demo.com',
      avatar: '',
      bio: 'Product Manager turning ideas into reality.',
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 21,
      following: ['demo-user-1', 'demo-user-4'],
      followers: ['demo-user-2'],
      title: 'Senior Product Manager',
      company: 'InnovateNow',
      location: 'Austin, TX',
      skills: ['Product Strategy', 'User Research', 'Data Analysis'],
      roles: [],
      karma: 650,
      status: 'busy',
      statusMessage: 'Deep in product planning 📊',
      interestedTopics: ['Business', 'Product Design', 'Leadership', 'Marketing'],
      onboardingCompleted: true
    },
    {
      id: 'demo-user-4',
      name: 'David Lee',
      email: 'david@demo.com',
      avatar: '',
      bio: 'Fullstack engineer and open source contributor.',
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
      following: ['demo-user-1', 'demo-user-6'],
      followers: ['demo-user-1', 'demo-user-admin'],
      title: 'Fullstack Engineer',
      company: 'WebWorks',
      location: 'Seattle, WA',
      skills: ['JavaScript', 'Node.js', 'React', 'Open Source'],
      roles: [],
      karma: 720,
      status: 'online',
      statusMessage: 'Shipping features',
      interestedTopics: ['Programming', 'Web Development', 'Open Source'],
      onboardingCompleted: true
    },
    {
      id: 'demo-user-5',
      name: 'Emma Wong',
      email: 'emma@demo.com',
      avatar: '',
      bio: 'Data scientist who enjoys turning messy data into clear stories.',
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
      following: ['demo-user-1', 'demo-user-4'],
      followers: ['demo-user-2'],
      title: 'Data Scientist',
      company: 'DataSight',
      location: 'Boston, MA',
      skills: ['Python', 'Pandas', 'Data Visualization', 'Machine Learning'],
      roles: [],
      karma: 540,
      status: 'online',
      statusMessage: 'Analyzing datasets',
      interestedTopics: ['Data Science', 'AI & Machine Learning', 'Data Visualization'],
      onboardingCompleted: true
    },
    {
      id: 'demo-user-6',
      name: 'Frank Harris',
      email: 'frank@demo.com',
      avatar: '',
      bio: 'DevOps engineer focused on reliability and observability.',
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
      following: ['demo-user-4', 'demo-user-admin'],
      followers: ['demo-user-1'],
      title: 'DevOps Engineer',
      company: 'InfraWorks',
      location: 'Denver, CO',
      skills: ['Kubernetes', 'Terraform', 'CI/CD', 'Cloud'],
      roles: [],
      karma: 430,
      status: 'online',
      statusMessage: 'Keeping services healthy',
      interestedTopics: ['DevOps', 'Cloud', 'Infrastructure'],
      onboardingCompleted: true
    },
    {
      id: 'demo-user-7',
      name: 'Grace Kim',
      email: 'grace@demo.com',
      avatar: '',
      bio: 'Illustrator & brand designer sharing process sketches.',
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
      following: ['demo-user-2'],
      followers: ['demo-user-2'],
      title: 'Illustrator',
      company: 'Freelance',
      location: 'Los Angeles, CA',
      skills: ['Illustration', 'Branding', 'Procreate'],
      roles: [],
      karma: 300,
      status: 'online',
      statusMessage: 'Sketching ideas',
      interestedTopics: ['Design', 'Branding', 'Illustration', 'Photography'],
      onboardingCompleted: true
    },
    {
      id: 'demo-user-8',
      name: 'Hannah Patel',
      email: 'hannah@demo.com',
      avatar: '',
      bio: 'Bridging ML and UX — I love prototyping data-driven interfaces.',
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
      following: ['demo-user-1', 'demo-user-2'],
      followers: ['demo-user-5'],
      title: 'ML UX Engineer',
      company: 'AdaptiveUI',
      location: 'Chicago, IL',
      skills: ['Machine Learning', 'UX', 'Data Visualization'],
      roles: [],
      karma: 410,
      status: 'online',
      statusMessage: 'Designing ML interfaces',
      interestedTopics: ['AI & Machine Learning', 'Design', 'Data Visualization']
    },
    {
      id: 'demo-user-9',
      name: 'Ivan Garcia',
      email: 'ivan@demo.com',
      avatar: '',
      bio: 'Platform engineer with a passion for data pipelines and cloud infrastructure.',
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
      following: ['demo-user-5', 'demo-user-6'],
      followers: ['demo-user-4'],
      title: 'Platform Engineer',
      company: 'Cloudline',
      location: 'Toronto, Canada',
      skills: ['Kubernetes', 'Data Engineering', 'Python'],
      roles: [],
      karma: 375,
      status: 'online',
      statusMessage: 'Tinkering with ETL jobs',
      interestedTopics: ['Cloud', 'Data Science', 'DevOps']
    },
    {
      id: 'demo-user-10',
      name: 'Jasmine Lee',
      email: 'jasmine@demo.com',
      avatar: '',
      bio: 'Product designer who loves collaborating with PMs and engineers to ship delightful experiences.',
      joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
      following: ['demo-user-2', 'demo-user-3'],
      followers: ['demo-user-7'],
      title: 'Product Designer',
      company: 'BrightIdeas',
      location: 'Toronto, Canada',
      skills: ['Figma', 'Interaction Design', 'Prototyping'],
      roles: [],
      karma: 290,
      status: 'online',
      statusMessage: 'Sketching flows',
      interestedTopics: ['Product Design', 'UX', 'Business']
    }
  ]

  // Multiple demo groups
  const demoGroups = [
    {
      id: 'group-demo-1',
      name: 'Tech Innovators',
      description: 'Discuss the latest in technology and innovation',
      members: demoUsers.map(u => ({ userId: u.id, role: u.id === 'demo-user-admin' ? 'owner' : 'member', joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 30 })),
      postCount: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
      createdBy: 'demo-user-admin',
      privacy: 'public',
      topics: ['Technology', 'AI & Machine Learning', 'Programming']
    },
    {
      id: 'group-demo-2',
      name: 'Creative Professionals',
      description: 'Connect with designers and creatives',
      members: demoUsers.filter(u => (u.interestedTopics || []).includes('Design')).map(u => ({ userId: u.id, role: u.id === 'demo-user-2' ? 'owner' : 'member', joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 14 })),
      postCount: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
      createdBy: 'demo-user-2',
      privacy: 'public',
      topics: ['Design', 'UI/UX', 'Photography']
    }
  ]

  // Multiple demo posts across groups and timeline
  const demoPosts = [
    {
      id: 'demo-post-1',
      userId: 'demo-user-1',
      userName: 'Alice Johnson',
      content: 'Just released a small experiment in explainable ML. Excited to share results and get feedback! #AI #MachineLearning',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10,
      likes: ['demo-user-4', 'demo-user-5'],
      // upvotes removed
      downvotes: [],
      comments: [],
      groupId: 'group-demo-1',
      type: 'professional',
      tags: ['AI', 'MachineLearning']
    },
    {
      id: 'demo-post-2',
      userId: 'demo-user-2',
      userName: 'Bob Smith',
      content: 'Design systems are evolving — sharing a case study from a recent project. #DesignSystems #Accessibility',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 9,
      likes: ['demo-user-3', 'demo-user-7'],
      // upvotes removed
      downvotes: [],
      comments: [],
      type: 'discussion',
      tags: ['Product', 'Strategy']
    },
    {
      id: 'demo-post-3',
      userId: 'demo-user-3',
      userName: 'Carol Davis',
      content: 'How do you prioritize feature requests vs technical debt? Share your frameworks. #ProductStrategy',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 8,
      likes: ['demo-user-1'],
      // upvotes removed
      comments: [],
      type: 'discussion',
      tags: ['Product', 'Strategy']
    },
    {
      id: 'demo-post-4',
      userId: 'demo-user-4',
      userName: 'David Lee',
      content: 'Open sourcing a small CLI utility today. Happy to pair if anyone wants to help add features. #OpenSource',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 7,
      likes: ['demo-user-1', 'demo-user-6'],
      comments: [],
      type: 'social',
      tags: ['OpenSource', 'CLI'],
      groupId: 'group-demo-1'
    },
    {
      id: 'demo-post-5',
      userId: 'demo-user-5',
      userName: 'Emma Wong',
      content: 'Exploring a new visualization pattern for time series. Notebook coming soon. #DataViz',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 6,
      likes: ['demo-user-1'],
      comments: [],
      type: 'professional',
      tags: ['DataViz', 'Python'],
      groupId: 'group-demo-1'
    },
    {
      id: 'demo-post-6',
      userId: 'demo-user-6',
      userName: 'Frank Harris',
      content: 'Automating canaries with Terraform + GitHub Actions — looking for tips. #DevOps',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5,
      likes: ['demo-user-4'],
      comments: [],
      type: 'professional',
      tags: ['DevOps', 'CI_CD']
    },
    {
      id: 'demo-post-7',
      userId: 'demo-user-7',
      userName: 'Grace Kim',
      content: 'Posted a new illustration exploring color systems — open to feedback! #Illustration',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 4,
      likes: ['demo-user-2'],
      comments: [],
      type: 'social',
      tags: ['Illustration', 'Design'],
      groupId: 'group-demo-2'
    },
    {
      id: 'demo-post-8',
      userId: 'demo-user-admin',
      userName: 'EngageIQ Admin',
      content: 'Welcome to the freshly seeded EngageIQ sample data! Explore groups, follow users, and try features.',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3,
      likes: [],
      comments: [],
      type: 'professional',
      tags: ['welcome']
    },
    {
      id: 'demo-post-9',
      userId: 'demo-user-1',
      userName: 'Alice Johnson',
      content: 'A quick tip on optimizing model inference latency in Python using numba and batching. #ML',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
      likes: ['demo-user-5'],
      comments: [],
      type: 'professional',
      tags: ['ML', 'Python'],
      groupId: 'group-demo-1'
    },
    {
      id: 'demo-post-10',
      userId: 'demo-user-2',
      userName: 'Bob Smith',
      content: 'Thoughts on color contrast testing tools — share favorites. #Accessibility',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 1,
      likes: ['demo-user-7'],
      comments: [],
      type: 'discussion',
      tags: ['Accessibility', 'Design'],
      groupId: 'group-demo-2'
    },
    {
      id: 'demo-post-11',
      userId: 'demo-user-8',
      userName: 'Hannah Patel',
      userAvatar: '',
      content: 'Exploring how to present model uncertainty in UI. Any suggestions for simple UX patterns? #AI #Design',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 1.5,
      likes: ['demo-user-1'],
      // upvotes removed
      downvotes: [],
      comments: [],
      groupId: 'group-demo-1',
      type: 'discussion',
      tags: ['AI', 'Design', 'Uncertainty'],
      metadata: { views: 120, language: 'en', visibility: 'public' }
    },
    {
      id: 'demo-post-12',
      userId: 'demo-user-9',
      userName: 'Ivan Garcia',
      userAvatar: '',
      content: 'Sharing a lightweight pipeline pattern for hourly ETL jobs to S3. Curious about reliability tips. #DataEngineering',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
      likes: ['demo-user-6'],
      // upvotes removed
      downvotes: [],
      comments: [],
      type: 'professional',
      tags: ['DataEngineering', 'Cloud'],
      groupId: 'group-demo-1',
      metadata: { views: 300, language: 'en', visibility: 'public' }
    },
    {
      id: 'demo-post-13',
      userId: 'demo-user-10',
      userName: 'Jasmine Lee',
      userAvatar: '',
      content: 'Rapid prototyping tip: test low-fidelity sketches first to validate flows before high-fidelity work. #Design #Product',
      timestamp: Date.now() - 1000 * 60 * 60 * 6,
      likes: ['demo-user-2', 'demo-user-7'],
      // upvotes removed
      downvotes: [],
      comments: [],
      type: 'professional',
      tags: ['ProductDesign', 'UX'],
      groupId: 'group-demo-2',
      metadata: { views: 85, language: 'en', visibility: 'public' }
    }
  ]

  // Upsert users
  for (const u of demoUsers) {
    const container = database.container(typeToContainer.user)
    const doc = { id: u.id, type: 'user', data: u, createdAt: u.joinedAt || Date.now(), updatedAt: Date.now() }
    await container.items.upsert(doc)
    console.log(chalk.green('Seeded user:'), u.email || u.id)
  }

  // Upsert groups
  for (const g of demoGroups) {
    const groupsContainer = database.container(typeToContainer.group)
    await groupsContainer.items.upsert({ id: g.id, type: 'group', data: g, createdAt: g.createdAt || Date.now(), updatedAt: Date.now() })
    console.log(chalk.green('Seeded group:'), g.name)
  }

  // Upsert posts
  for (const p of demoPosts) {
    const postsContainer = database.container(typeToContainer.post)
    await postsContainer.items.upsert({ id: p.id, type: 'post', data: p, createdAt: p.timestamp || Date.now(), updatedAt: Date.now() })
    console.log(chalk.green('Seeded post:'), p.id)
  }

  // Seed comments
  if (typeof SAMPLE_COMMENTS === 'undefined') {
    // Minimal fallback comments for the demo (if full list not present)
    var SAMPLE_COMMENTS = [
      { id: 'demo-comment-1', postId: 'demo-post-1', userId: 'demo-user-2', content: 'Nice work — curious about the dataset size.' },
      { id: 'demo-comment-2', postId: 'demo-post-2', userId: 'demo-user-3', content: 'Great case study — what was the accessibility testing like?' },
      { id: 'demo-comment-3', postId: 'demo-post-6', userId: 'demo-user-4', content: 'I recently used a blue/green pattern; happy to share details.' }
    ]
  }

  const commentsContainer = database.container('comments')
  for (const comment of SAMPLE_COMMENTS) {
    await commentsContainer.items.create({
      ...comment,
      timestamp: new Date().toISOString(),
      replies: []
    })
  }
  console.log(chalk.green(`    ✅ Seeded ${SAMPLE_COMMENTS.length} comments`))

  // Seed demo daily-progress entries so DailyEngagementWidget has sample data
  const dailyProgressContainer = database.container(typeToContainer['daily-progress'])
  const today = new Date().toDateString()
  const seededProgress = []
  for (const u of demoUsers) {
    const id = `daily-progress-${u.id}-${today}`
    const data = {
      userId: u.id,
      date: today,
      posts: Math.floor(Math.random() * 2),
      comments: Math.floor(Math.random() * 4),
      likes: Math.floor(Math.random() * 6),
      // upvotes removed
      karmaEarned: Math.floor(Math.random() * 10)
    }
    await dailyProgressContainer.items.upsert({ id, type: 'daily-progress', data, createdAt: Date.now(), updatedAt: Date.now() })
    seededProgress.push(id)
  }
  console.log(chalk.green(`    ✅ Seeded ${seededProgress.length} daily-progress entries`))

  // Seed a small set of recent audit logs (5 entries) for LogViewer and admin pages
  try {
    const auditContainer = database.container(typeToContainer.audit)
    const nowIso = new Date().toISOString()
    const sampleAuditActions = ['seed.start','seed.complete','user.login','post.create','comment.create']
    for (let i = 0; i < Math.min(5, sampleAuditActions.length); i++) {
      const entry = {
        id: `audit-${Date.now()}-${i}`,
        type: 'audit',
        data: {
          action: sampleAuditActions[i],
          userId: demoUsers[i % demoUsers.length].id,
          details: `Sample audit event: ${sampleAuditActions[i]}`,
          ts: nowIso
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      await auditContainer.items.upsert(entry)
    }
    console.log(chalk.green('    ✅ Seeded 5 audit entries'))
  } catch (e) {
    console.log(chalk.yellow('    ⚠ Failed to seed audit entries:'), e.message || e)
  }

  // Seed a small set of example error documents (5 entries)
  try {
    const errorsContainer = database.container(typeToContainer.error)
    const nowIsoErr = new Date().toISOString()
    for (let i = 0; i < 5; i++) {
      const errDoc = {
        id: `error-${Date.now()}-${i}`,
        type: 'error',
        data: {
          source: 'seeder',
          message: `Sample error ${i + 1}`,
          stack: `Error: Sample error ${i + 1}\n    at seeder (fresh-seed-all.mjs)`,
          context: { seed: true }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      await errorsContainer.items.upsert(errDoc)
    }
    console.log(chalk.green('    ✅ Seeded 5 error entries'))
  } catch (e) {
    console.log(chalk.yellow('    ⚠ Failed to seed error entries:'), e.message || e)
  }

  // Seed a small tag vocabulary (for autotag fallbacks and embeddings)
  try {
    const tagsContainer = database.container('tags')
    const tagList = [
      { id: 'tag-ai', tag: 'ai', synonyms: ['artificial-intelligence', 'ai-ml'] },
      { id: 'tag-machine-learning', tag: 'machine-learning', synonyms: ['ml'] },
      { id: 'tag-data-engineering', tag: 'data-engineering', synonyms: ['data-pipelines'] },
      { id: 'tag-database', tag: 'database', synonyms: ['databases', 'db'] },
      { id: 'tag-sql', tag: 'sql', synonyms: [] },
      { id: 'tag-caching', tag: 'caching', synonyms: ['cache'] },
      { id: 'tag-performance', tag: 'performance', synonyms: ['latency', 'throughput'] },
      { id: 'tag-cosmos-db', tag: 'cosmos-db', synonyms: ['azure-cosmos', 'cosmosdb'] },
      { id: 'tag-azure', tag: 'azure', synonyms: [] },
      { id: 'tag-devops', tag: 'devops', synonyms: [] }
    ]
    for (const t of tagList) {
      await tagsContainer.items.upsert({ id: t.id, type: 'tag', data: { tag: t.tag, synonyms: t.synonyms }, createdAt: Date.now(), updatedAt: Date.now() })
    }
    console.log(chalk.green(`    ✅ Seeded ${tagList.length} tag vocabulary entries`))
  } catch (e) {
    console.log(chalk.yellow('    ⚠ Failed to seed tag vocabulary:'), e.message || e)
  }

  console.log(chalk.bold.green('\n✔ Fresh seed complete. All documents created in per-type containers.'))
}

main().catch(err => {
  console.error('Fresh seed failed:', err)
  process.exit(1)
})
