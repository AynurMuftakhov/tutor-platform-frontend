# SpeakShire Platform Frontend Guidelines

## Project Overview
SpeakShire is an English learning platform that connects tutors and students.
This frontend application delivers the primary user interface for the platform, ensuring a clean, engaging, and scalable experience.

## Tech Stack
- **Framework**: React 18 with TypeScript
- **UI Library**: Material UI (MUI) v6
- **State Management**: React Query
- **Routing**: React Router v7
- **HTTP Clients**: Axios and Ky
- **Authentication**: Keycloak(OIDC)
- **Animations**: Framer Motion

## Project Structure
```
tutoria-platform-frontend/
├── docs/                  # Documentation files
├── public/                # Static assets
├── src/                   # Source code
│   ├── components/        # Reusable UI components
│   ├── constants/         # Application constants
│   ├── context/           # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── layout/            # Layout components
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx            # Main application component
│   └── index.tsx          # Application entry point
├── Dockerfile             # Docker configuration
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Getting Started

### Installation
```bash
# Install dependencies
npm install
```

### Running the Application
```bash
# Start development server
npm start
```
The application will be available at http://localhost:3000.

### Building for Production
```bash
# Create production build
npm run build
```

### Running Tests
```bash
# Run tests in watch mode
npm test
```

## Development Guidelines

### Code Organization
- Create reusable components in the `components/` directory
- Place page components in the `pages/` directory
- Use custom hooks for shared logic in the `hooks/` directory
- Define API services in the `services/` directory
- Keep TypeScript interfaces and types in the `types/` directory

### Design System
The project follows a comprehensive design system documented in `docs/design-system.md`. Key points:
•	Follow the predefined color palette and typography settings.
•	Stick to the 8px spacing grid for margins, paddings, and layouts.
•	Maintain consistent styling using MUI themes.
•	Implement responsive design with MUI’s breakpoints.
•	Ensure light mode is prioritized, with clean accents (blue: #2573ff, mint: #00d7c2).

### Best Practices
•	Strictly use TypeScript for type safety.
•	Embrace component-driven architecture (small, focused components).
•	Implement responsive UX across mobile, tablet, and desktop.
•	Use React Query for fetching, caching, and data synchronization.
•	Leverage MUI theming for styling consistency.
•	Integrate Framer Motion for lightweight and meaningful animations.
•	Prioritize accessibility (a11y) wherever possible.

### Docker
The application can be run in a Docker container:
```bash
# Build Docker image
docker build -t tutoria-frontend .

# Run Docker container
docker run -p 3000:3000 tutoria-frontend
```

## Backend Integration
The frontend connects to the backend service running on port 8081. The proxy is configured in package.json.

## Final Notes

Keep the user experience simple, clean, and joyful.
Focus on scalability, accessibility, and polish — our mission is to deliver an outstanding platform for learners and tutors alike.