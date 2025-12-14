# 📁 Elysia AI - Project Structure

## Root Directory (User-Facing)

```
elysia-ai/
├── README.md              # Main documentation
├── LICENSE                # MIT License
├── CHANGELOG.md           # Version history
├── package.json           # Dependencies and scripts
├── start-server.ts        # Production server entry point
│
├── src/                   # Main application source code
├── public/                # Static web assets
├── tests/                 # Test suites
├── scripts/               # Automation scripts
├── docs/                  # User documentation
│
├── prisma/                # Database schema
├── data/                  # Application data
├── logs/                  # Application logs
├── uploads/               # User uploaded files
└── backups/               # Database backups
```

## Hidden/Internal Directories

### 🔐 config/ - Configuration Files (Hidden from casual view)

```
config/
├── internal/              # Build and development configs
│   ├── tsconfig.json      # TypeScript configuration
│   ├── webpack.config.js  # Build configuration
│   ├── biome.json         # Linter/formatter config
│   ├── playwright.config.ts # E2E test config
│   └── prisma.config.ts   # Prisma configuration
│
├── docker/                # Docker configurations
│   ├── Dockerfile         # Development Dockerfile
│   ├── Dockerfile.production # Production optimized
│   ├── docker-compose.yml # Service orchestration
│   ├── compose.yaml       # Alternative compose
│   ├── compose.debug.yaml # Debug compose
│   └── .dockerignore      # Docker ignore rules
│
├── deployment/            # Deployment guides
│   ├── DEPLOYMENT.md      # General deployment
│   ├── PRODUCTION_DEPLOY_CHECKLIST.md
│   ├── ENTERPRISE_CHECKLIST.md
│   └── DOCKER_SETUP_GUIDE.md
│
└── .env.example           # Environment variables template
```

### 🔧 dev/ - Development Tools (Hidden from production)

```
dev/
├── chat.ts               # Interactive chat CLI
├── chat.bat              # Windows chat launcher
├── bare.ts               # Minimal test server
├── bun-serve.ts          # Bun-only test server
├── minimal.ts            # Minimal example
├── simple-test.ts        # Simple functionality test
└── test-server.ts        # Test server instance
```

### 📚 docs/internal/ - Internal Documentation

```
docs/internal/
├── INTEGRATION_COMPLETE.md  # Phase completion report
├── SECURITY_IMPLEMENTATION.md # Security architecture
└── REORGANIZATION_PLAN.md   # Refactoring history
```

### 🌐 Multi-Platform Support

```
desktop/                  # Electron desktop app
mobile/                   # React Native mobile app
swift/                    # iOS Swift client
cuda/                     # GPU acceleration module
native/                   # Native Node.js bindings
python/                   # FastAPI RAG service
```

### ☁️ Cloud Deployment

```
cloud/
├── aws/                  # AWS CloudFormation
│   ├── cloudformation.yaml
│   └── deploy.sh
└── gcp/                  # Google Cloud Platform
    ├── app.yaml
    ├── cloudbuild.yaml
    └── deploy.sh
```

## Why This Structure?

### ✅ Benefits

1. **Clean Root**: Only essential files visible at first glance
2. **Security**: Sensitive configs hidden in subdirectories
3. **Organization**: Related files grouped logically
4. **Scalability**: Easy to add new features without clutter
5. **Professional**: Industry-standard structure for enterprise projects

### 🎯 Key Principles

- **User-facing files** stay in root or obvious directories (`src/`, `public/`, `docs/`)
- **Build/config files** moved to `config/internal/`
- **Docker files** grouped in `config/docker/`
- **Deployment guides** in `config/deployment/`
- **Dev tools** isolated in `dev/`
- **Internal docs** separated in `docs/internal/`

### 📝 Migration Notes

All file references have been updated:

- `package.json` scripts point to new locations
- Docker builds reference `config/docker/`
- Tests updated for new paths
- Webpack/TypeScript configs in `config/internal/`

### 🚀 Quick Access

**Development:**

```bash
bun run dev              # Start development server
bun run dev/chat.ts      # Interactive chat CLI
```

**Configuration:**

```bash
config/internal/         # Build configs
config/docker/           # Docker files
config/deployment/       # Deploy guides
```

**Documentation:**

```bash
README.md               # Main docs
docs/                   # API, guides
docs/internal/          # Internal reports
```

---

**Last Updated**: 2025-12-04  
**Version**: 1.0.51
