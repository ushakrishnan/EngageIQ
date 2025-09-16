/*
 * Database Seeding Module (Cosmos DB only)
 *
 * This module handles seeding sample data into the database.
 */

import chalk from 'chalk'

// Sample data templates
const SAMPLE_USERS = [
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
    skills: ['Product', 'Platform', 'Diagnostics'],
    roles: ['engageiq_admin'],
    karma: 9999,
    status: 'online',
    statusMessage: 'Overseeing the platform',
    interestedTopics: ['Technology', 'Product', 'Platform', 'DevOps'],
    achievements: [],
    karmaHistory: []
  },
  {
    id: 'demo-user-1',
    name: 'Alice Johnson',
    email: 'alice@demo.com',
    avatar: '',
    bio: 'Senior Software Engineer passionate about AI and machine learning.',
    title: 'Senior Software Engineer',
    company: 'TechCorp Inc.',
    location: 'San Francisco, CA',
    skills: ['React', 'TypeScript', 'Python', 'Machine Learning', 'AWS'],
    interestedTopics: ['Technology', 'AI & Machine Learning', 'Programming', 'Innovation'],
    karma: 1250,
    status: 'online',
    statusMessage: 'Building the future 🚀',
    following: ['demo-user-2','demo-user-5','demo-user-4'],
    followers: ['demo-user-admin','demo-user-6']
  },
  {
    id: 'demo-user-2',
    name: 'Bob Smith',
    email: 'bob@demo.com',
    avatar: '',
    bio: 'Creative Director with a passion for visual storytelling and brand experiences.',
    title: 'Creative Director',
    company: 'Design Studio Pro',
    location: 'New York, NY',
    skills: ['Adobe Creative Suite', 'Branding', 'UI/UX', 'Photography'],
    interestedTopics: ['Design', 'UI/UX', 'Art & Illustration', 'Photography'],
    karma: 890,
    status: 'away',
    statusMessage: 'In a creative flow ✨',
    following: ['demo-user-7','demo-user-1'],
    followers: ['demo-user-3','demo-user-5']
  },
  {
    id: 'demo-user-3',
    name: 'Carol Davis',
    email: 'carol@demo.com',
    avatar: '',
    bio: 'Product Manager turning ideas into reality. Love connecting with other innovators.',
    title: 'Senior Product Manager',
    company: 'InnovateNow',
    location: 'Austin, TX',
    skills: ['Product Strategy', 'User Research', 'Data Analysis'],
    interestedTopics: ['Business', 'Product Design', 'Leadership', 'Marketing'],
    karma: 650,
    status: 'busy',
    statusMessage: 'Deep in product planning 📊',
    following: ['demo-user-1','demo-user-4'],
    followers: ['demo-user-2']
  },
  {
    id: 'demo-user-4',
    name: 'David Lee',
    email: 'david@demo.com',
    avatar: '',
    bio: 'Fullstack engineer and open source contributor. Likes building developer tools.',
    title: 'Fullstack Engineer',
    company: 'WebWorks',
    location: 'Seattle, WA',
    skills: ['JavaScript', 'Node.js', 'React', 'Open Source'],
    interestedTopics: ['Programming', 'Web Development', 'Open Source'],
    karma: 720,
    status: 'online',
    statusMessage: 'Shipping features',
    following: ['demo-user-1','demo-user-6'],
    followers: ['demo-user-1','demo-user-admin']
  },
  {
    id: 'demo-user-5',
    name: 'Emma Wong',
    email: 'emma@demo.com',
    avatar: '',
    bio: 'Data scientist who enjoys turning messy data into clear stories.',
    title: 'Data Scientist',
    company: 'DataSight',
    location: 'Boston, MA',
    skills: ['Python', 'Pandas', 'Data Visualization', 'Machine Learning'],
    interestedTopics: ['Data Science', 'AI & Machine Learning', 'Data Visualization'],
    karma: 540,
    status: 'online',
    statusMessage: 'Analyzing datasets',
    following: ['demo-user-1','demo-user-4'],
    followers: ['demo-user-2']
  },
  {
    id: 'demo-user-6',
    name: 'Frank Harris',
    email: 'frank@demo.com',
    avatar: '',
    bio: 'DevOps engineer focused on reliability, observability and CI/CD.',
    title: 'DevOps Engineer',
    company: 'InfraWorks',
    location: 'Denver, CO',
    skills: ['Kubernetes', 'Terraform', 'CI/CD', 'Cloud'],
    interestedTopics: ['DevOps', 'Cloud', 'Infrastructure'],
    karma: 430,
    status: 'online',
    statusMessage: 'Keeping services healthy',
    following: ['demo-user-4', 'demo-user-admin'],
    followers: ['demo-user-1']
  },
  {
    id: 'demo-user-7',
    name: 'Grace Kim',
    email: 'grace@demo.com',
    avatar: '',
    bio: 'Illustrator & brand designer. I love sharing process sketches and visual experiments.',
    title: 'Illustrator',
    company: 'Freelance',
    location: 'Los Angeles, CA',
    skills: ['Illustration', 'Branding', 'Procreate', 'Photography'],
    interestedTopics: ['Design', 'Branding', 'Illustration', 'Photography'],
    karma: 300,
    status: 'online',
    statusMessage: 'Sketching ideas',
    following: ['demo-user-2'],
    followers: ['demo-user-2']
  },
  {
    id: 'demo-user-8',
    name: 'Hannah Patel',
    email: 'hannah@demo.com',
    avatar: '',
    bio: 'Bridging ML and UX — I love prototyping data-driven interfaces.',
    title: 'ML UX Engineer',
    company: 'AdaptiveUI',
    location: 'Chicago, IL',
    skills: ['Machine Learning', 'UX', 'Data Visualization'],
    interestedTopics: ['AI & Machine Learning', 'Design', 'Data Visualization'],
    karma: 410,
    status: 'online',
    statusMessage: 'Designing ML interfaces',
    following: ['demo-user-1','demo-user-2'],
    followers: ['demo-user-5']
  },
  {
    id: 'demo-user-9',
    name: 'Ivan Garcia',
    email: 'ivan@demo.com',
    avatar: '',
    bio: 'Platform engineer with a passion for data pipelines and cloud infrastructure.',
    title: 'Platform Engineer',
    company: 'Cloudline',
    location: 'Toronto, Canada',
    skills: ['Kubernetes', 'Data Engineering', 'Python'],
    interestedTopics: ['Cloud', 'Data Science', 'DevOps'],
    karma: 375,
    status: 'online',
    statusMessage: 'Tinkering with ETL jobs',
    following: ['demo-user-5','demo-user-6'],
    followers: ['demo-user-4']
  },
  {
    id: 'demo-user-10',
    name: 'Jasmine Lee',
    email: 'jasmine@demo.com',
    avatar: '',
    bio: 'Product designer who loves collaborating with PMs and engineers to ship delightful experiences.',
    title: 'Product Designer',
    company: 'BrightIdeas',
    location: 'Toronto, Canada',
    skills: ['Figma', 'Interaction Design', 'Prototyping'],
    interestedTopics: ['Product Design', 'UX', 'Business'],
    karma: 290,
    status: 'online',
    statusMessage: 'Sketching flows',
    following: ['demo-user-2','demo-user-3'],
    followers: ['demo-user-7']
  }
]

const SAMPLE_GROUPS = [
  {
    id: 'group-demo-1',
    name: 'Tech Innovators',
    description: 'A community for discussing the latest in technology, programming, and innovation. Share insights, ask questions, and connect with fellow tech professionals.',
    category: 'technical',
    topics: ['Technology', 'Programming', 'AI & Machine Learning', 'Web Development', 'Innovation'],
    privacy: 'public',
    rules: [
      'Be respectful and professional',
      'No spam or self-promotion without context',
      'Share resources and help others learn'
    ],
    postCount: 28,
    createdBy: 'demo-user-1'
  },
  {
    id: 'group-demo-2',
    name: 'Creative Professionals',
    description: 'Connect with designers, artists, and creative professionals. Share your work, get feedback, and collaborate on projects.',
    category: 'creative',
    topics: ['Design', 'UI/UX', 'Graphic Design', 'Art & Illustration', 'Photography'],
    privacy: 'public',
    rules: [
      'Original work only',
      'Constructive feedback welcome',
      'Credit other artists when sharing inspiration'
    ],
    postCount: 20,
    createdBy: 'demo-user-2'
  }
]

const SAMPLE_POSTS = [
  {
    id: 'demo-post-1',
    userId: 'demo-user-1',
    userName: 'Alice Johnson',
    userAvatar: '',
    content: 'Just released a small experiment in explainable ML. Excited to share results and get feedback! #AI #MachineLearning',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10,
    type: 'professional',
    category: 'Technology',
    tags: ['AI', 'MachineLearning', 'Explainability'],
    groupId: 'group-demo-1',
    likes: ['demo-user-4','demo-user-5'],
    // likes are canonical
    downvotes: [],
    score: 5
  },
  {
    id: 'demo-post-2',
    userId: 'demo-user-2',
    userName: 'Bob Smith',
    userAvatar: '',
    content: 'Design systems are evolving. Sharing a case study from a recent project. #DesignSystems #Accessibility',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 9,
    type: 'professional',
    category: 'Design',
    tags: ['DesignSystems', 'Accessibility'],
    groupId: 'group-demo-2',
    likes: ['demo-user-3','demo-user-7'],
    // likes are canonical
    downvotes: [],
    score: 4,
    isPinned: true
  },
  {
    id: 'demo-post-3',
    userId: 'demo-user-3',
    userName: 'Carol Davis',
    userAvatar: '',
    content: 'How do you prioritize feature requests vs. technical debt? Curious about different approaches. #ProductStrategy',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 8,
    type: 'discussion',
    category: 'Business',
    tags: ['Product', 'Strategy'],
    likes: ['demo-user-1'],
    // likes are canonical
    downvotes: [],
    score: 3
  },
  {
    id: 'demo-post-4',
    userId: 'demo-user-4',
    userName: 'David Lee',
    userAvatar: '',
    content: 'Open sourcing a small CLI utility today. Happy to pair if anyone wants to help add features. #OpenSource #DeveloperTools',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 7,
    type: 'social',
    tags: ['OpenSource', 'CLI', 'DeveloperTools'],
    groupId: 'group-demo-1',
    likes: ['demo-user-1','demo-user-6'],
    score: 2
  },
  {
    id: 'demo-post-5',
    userId: 'demo-user-5',
    userName: 'Emma Wong',
    userAvatar: '',
    content: 'Exploring a new visualization pattern for time series data. Sharing the notebook soon. #DataViz #Python',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 6,
    type: 'professional',
    tags: ['DataViz','Python'],
    likes: ['demo-user-1'],
    groupId: 'group-demo-1',
    score: 2
  },
  {
    id: 'demo-post-6',
    userId: 'demo-user-6',
    userName: 'Frank Harris',
    userAvatar: '',
    content: 'Automating a canary deployment workflow with Terraform + GitHub Actions. Any tips? #DevOps #CI_CD',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5,
    type: 'professional',
    tags: ['DevOps','CI_CD','Terraform'],
    likes: ['demo-user-4'],
    score: 2
  },
  {
    id: 'demo-post-7',
    userId: 'demo-user-7',
    userName: 'Grace Kim',
    userAvatar: '',
    content: 'Posted a new illustration exploring color systems — open to feedback! #Illustration #Design',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 4,
    type: 'social',
    tags: ['Illustration','Design'],
    groupId: 'group-demo-2',
    likes: ['demo-user-2'],
    score: 1
  },
  {
    id: 'demo-post-8',
    userId: 'demo-user-admin',
    userName: 'EngageIQ Admin',
    userAvatar: '',
    content: 'Welcome to the freshly seeded EngageIQ sample data! Explore groups, follow users, and try out the features.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3,
    type: 'professional',
    tags: ['welcome'],
    groupId: undefined,
    likes: [],
    score: 1
  },
  {
    id: 'demo-post-9',
    userId: 'demo-user-1',
    userName: 'Alice Johnson',
    userAvatar: '',
    content: 'A quick tip on optimizing model inference latency in Python using numba and batch processing. #ML #Python',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
    type: 'professional',
    tags: ['ML','Python','Performance'],
    groupId: 'group-demo-1',
    likes: ['demo-user-5'],
    score: 2
  },
  {
    id: 'demo-post-10',
    userId: 'demo-user-2',
    userName: 'Bob Smith',
    userAvatar: '',
    content: 'A small rant about color accessibility and contrast — what are your favorite tools for checking color contrast? #Design #Accessibility',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 1,
    type: 'discussion',
    tags: ['Accessibility','Design'],
    groupId: 'group-demo-2',
    likes: ['demo-user-7'],
    score: 1
  },
  {
    id: 'demo-post-11',
    userId: 'demo-user-8',
    userName: 'Hannah Patel',
    content: 'Exploring how to present model uncertainty in UI. Any suggestions for simple UX patterns? #AI #Design',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 1.5,
    type: 'discussion',
    tags: ['AI','Design','Uncertainty'],
    groupId: 'group-demo-1',
    likes: ['demo-user-1'],
    // likes are canonical
    downvotes: [],
    score: 2,
    metadata: { views: 120, language: 'en', visibility: 'public' }
  },
  {
    id: 'demo-post-12',
    userId: 'demo-user-9',
    userName: 'Ivan Garcia',
    content: 'Sharing a lightweight pipeline pattern for hourly ETL jobs to S3. Curious about reliability tips. #DataEngineering',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
    type: 'professional',
    tags: ['DataEngineering','Cloud'],
    groupId: 'group-demo-1',
    likes: ['demo-user-6'],
    // likes are canonical
    score: 1,
    metadata: { views: 300, language: 'en', visibility: 'public' }
  },
  {
    id: 'demo-post-13',
    userId: 'demo-user-10',
    userName: 'Jasmine Lee',
    content: 'Rapid prototyping tip: test low-fidelity sketches first to validate flows before high-fidelity work. #Design #Product',
    timestamp: Date.now() - 1000 * 60 * 60 * 6,
    type: 'professional',
    tags: ['ProductDesign','UX'],
    groupId: 'group-demo-2',
    likes: ['demo-user-2','demo-user-7'],
    score: 2,
    metadata: { views: 85, language: 'en', visibility: 'public' }
  }
]

const SAMPLE_COMMENTS = [
  { id: 'demo-comment-1', postId: 'demo-post-1', userId: 'demo-user-2', content: 'Nice work Alice — curious about the dataset size.' },
  { id: 'demo-comment-2', postId: 'demo-post-2', userId: 'demo-user-3', content: 'Great case study, Bob — what was the accessibility testing like?' },
  { id: 'demo-comment-3', postId: 'demo-post-6', userId: 'demo-user-4', content: 'I recently used a blue/green pattern; happy to share details.' },
  { id: 'demo-comment-4', postId: 'demo-post-5', userId: 'demo-user-1', content: 'Would love to see the notebook!' },
  { id: 'demo-comment-5', postId: 'demo-post-7', userId: 'demo-user-2', content: 'Love the pallet, Grace.' },
  { id: 'demo-comment-6', postId: 'demo-post-3', userId: 'demo-user-1', content: 'Prioritization framework: impact vs effort — quantify when possible.' }
]

export async function seedSampleData(provider, seedLevel = 'full') {
  console.log(chalk.blue(`  Seeding ${seedLevel} sample data...`))
  if (provider !== 'cosmos') {
    throw new Error(`Unsupported database provider: ${provider}. This seeder only supports 'cosmos'.`)
  }
  await seedCosmosDB(seedLevel)
}

async function seedCosmosDB(seedLevel) {
  const { CosmosClient } = await import('@azure/cosmos')
  
  // Get credentials from environment
  const endpoint = process.env.VITE_COSMOS_ENDPOINT
  const key = process.env.VITE_COSMOS_KEY
  const databaseName = process.env.VITE_COSMOS_DATABASE_NAME || 'EngageIQ'
  
  if (!endpoint || !key) {
    throw new Error('Missing Cosmos DB credentials')
  }
  
  const client = new CosmosClient({ endpoint, key })
  const database = client.database(databaseName)
  
  try {
    // Check if data already exists
    const usersContainer = database.container('users')
    const { resources: existingUsers } = await usersContainer.items.query('SELECT TOP 1 c.id FROM c').fetchAll()
    
    if (existingUsers.length > 0) {
      console.log(chalk.yellow('  Sample data already exists, skipping...'))
      return
    }
    
    // Seed users
    const usersToSeed = seedLevel === 'basic' ? SAMPLE_USERS.slice(0, 2) : SAMPLE_USERS
    for (const user of usersToSeed) {
      await usersContainer.items.create({
        ...user,
        joinedAt: new Date().toISOString(),
        achievements: [],
        karmaHistory: []
      })
    }
    console.log(chalk.green(`    ✅ Seeded ${usersToSeed.length} users`))
    
    if (seedLevel !== 'none') {
      // Seed groups
      const groupsContainer = database.container('groups')
      const groupsToSeed = seedLevel === 'basic' ? SAMPLE_GROUPS.slice(0, 1) : SAMPLE_GROUPS
      for (const group of groupsToSeed) {
        await groupsContainer.items.create({
          ...group,
          createdAt: new Date().toISOString(),
          channels: [
            { id: 'general', name: 'general', type: 'text', description: 'General discussions' }
          ]
        })
      }
      console.log(chalk.green(`    ✅ Seeded ${groupsToSeed.length} groups`))
      
      // Seed group memberships
      const membershipsContainer = database.container('group_memberships')
      for (const group of groupsToSeed) {
        for (const user of usersToSeed) {
          await membershipsContainer.items.create({
            id: `${group.id}-${user.id}`,
            groupId: group.id,
            userId: user.id,
            role: user.id === group.createdBy ? 'owner' : 'member',
            joinedAt: new Date().toISOString()
          })
        }
      }
      
      if (seedLevel === 'full') {
        // Seed posts
        const postsContainer = database.container('posts')
        for (const post of SAMPLE_POSTS) {
          await postsContainer.items.create({
            ...post,
            timestamp: new Date().toISOString(),
            comments: []
          })
        }
        console.log(chalk.green(`    ✅ Seeded ${SAMPLE_POSTS.length} posts`))
        
        // Seed comments
        const commentsContainer = database.container('comments')
        for (const comment of SAMPLE_COMMENTS) {
          await commentsContainer.items.create({
            ...comment,
            timestamp: new Date().toISOString(),
            replies: []
          })
        }
        console.log(chalk.green(`    ✅ Seeded ${SAMPLE_COMMENTS.length} comments`))
      }
    }
    
  } catch (error) {
    throw new Error(`Failed to seed Cosmos DB: ${error.message}`)
  }
}
